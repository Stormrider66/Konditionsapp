import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { CalendarConnectionsClient } from './CalendarConnectionsClient'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Kalenderanslutningar | Trainomics',
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
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto py-12 px-4 max-w-4xl relative z-10">
        <div className="flex items-center justify-between mb-12">
          <Link href="/athlete/calendar">
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 group">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              TILLBAKA TILL KALENDERN
            </Button>
          </Link>
        </div>

        <div className="flex items-start gap-4 mb-12">
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5">
            <CalendarIcon className="h-8 w-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-1">
              Kalender<span className="text-orange-400">anslutningar</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-2xl">
              Anslut dina externa kalendrar för att se arbete, privata händelser och andra blockerare
              tillsammans med ditt träningsschema.
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="animate-pulse text-slate-500 font-black uppercase tracking-widest text-center py-20">Laddar anslutningar...</div>}>
          <CalendarConnectionsClient
            clientId={data.clientId}
            connections={data.connections}
            googleConfigured={data.googleConfigured}
            outlookConfigured={data.outlookConfigured}
          />
        </Suspense>
      </div>
    </div>
  )
}
