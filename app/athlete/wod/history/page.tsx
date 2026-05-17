import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { WODHistoryClient } from './WODHistoryClient'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.wodHistory')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function WODHistoryPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  // Fetch WOD history
  const wods = await prisma.aIGeneratedWOD.findMany({
    where: { clientId: clientId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      subtitle: true,
      mode: true,
      workoutType: true,
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
