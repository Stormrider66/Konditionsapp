// app/athlete/settings/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { AthleteSettingsClient } from './AthleteSettingsClient'

export const metadata = {
  title: 'Inställningar | Atlet',
  description: 'Hantera dina inställningar',
}

export default async function AthleteSettingsPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  // Get client with sport profile
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sportProfile: true,
    },
  })

  if (!client) {
    notFound()
  }

  return (
    <AthleteSettingsClient
      clientId={clientId}
      clientName={client.name}
      sportProfile={client.sportProfile}
    />
  )
}
