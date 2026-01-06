import { redirect } from 'next/navigation'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { WODHistoryClient } from './WODHistoryClient'

export const metadata = {
  title: 'WOD Historik | Konditionstest',
  description: 'Se dina tidigare AI-genererade träningspass',
}

export default async function WODHistoryPage() {
  const user = await requireAthlete()

  // Get athlete's client ID
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    select: { clientId: true },
  })

  if (!athleteAccount) {
    redirect('/athlete/dashboard')
  }

  // Fetch WOD history
  const wods = await prisma.aIGeneratedWOD.findMany({
    where: { clientId: athleteAccount.clientId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      subtitle: true,
      mode: true,
      status: true,
      requestedDuration: true,
      primarySport: true,
      readinessAtGeneration: true,
      intensityAdjusted: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      actualDuration: true,
      sessionRPE: true,
      workoutJson: true,
    },
  })

  // Calculate stats
  const totalWods = wods.length
  const completedWods = wods.filter(w => w.status === 'COMPLETED').length
  const totalMinutes = wods
    .filter(w => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.actualDuration || w.requestedDuration || 0), 0)

  return (
    <WODHistoryClient
      wods={wods}
      stats={{
        total: totalWods,
        completed: completedWods,
        totalMinutes,
      }}
    />
  )
}
