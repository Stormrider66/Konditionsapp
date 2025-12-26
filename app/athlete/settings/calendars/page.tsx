/**
 * Calendar Connections Settings Page
 *
 * Allows athletes to connect external calendars (Google, iCal URL, etc.)
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { CalendarConnectionsClient } from './CalendarConnectionsClient'

export const metadata = {
  title: 'Kalenderanslutningar | Star by Thomson',
  description: 'Anslut externa kalendrar för att se alla händelser på ett ställe',
}

async function getClientData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/athlete/settings/calendars')
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: {
      athleteAccount: {
        include: {
          client: true,
        },
      },
    },
  })

  if (!dbUser) {
    redirect('/login')
  }

  // Get the athlete's client ID
  const athleteAccount = dbUser.athleteAccount
  if (!athleteAccount) {
    redirect('/athlete/onboarding')
  }

  // Get existing connections
  const connections = await prisma.externalCalendarConnection.findMany({
    where: { clientId: athleteAccount.clientId },
    orderBy: { createdAt: 'desc' },
  })

  // Get event counts for each connection
  const connectionsWithCounts = await Promise.all(
    connections.map(async (conn) => {
      const eventCount = await prisma.calendarEvent.count({
        where: {
          clientId: athleteAccount.clientId,
          externalCalendarType: conn.provider,
          externalCalendarName: conn.calendarName,
        },
      })

      return {
        ...conn,
        eventCount,
        // Don't send sensitive tokens to client
        accessToken: conn.accessToken ? '***' : null,
        refreshToken: conn.refreshToken ? '***' : null,
      }
    })
  )

  return {
    clientId: athleteAccount.clientId,
    clientName: athleteAccount.client.name,
    connections: connectionsWithCounts,
    googleConfigured: !!process.env.GOOGLE_CLIENT_ID,
    outlookConfigured: !!process.env.OUTLOOK_CLIENT_ID,
  }
}

export default async function CalendarConnectionsPage() {
  const data = await getClientData()

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Kalenderanslutningar</h1>
        <p className="text-muted-foreground">
          Anslut dina externa kalendrar för att se arbete, privata händelser och andra blockerare
          tillsammans med ditt träningsschema.
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse">Laddar...</div>}>
        <CalendarConnectionsClient
          clientId={data.clientId}
          connections={data.connections}
          googleConfigured={data.googleConfigured}
          outlookConfigured={data.outlookConfigured}
        />
      </Suspense>
    </div>
  )
}
