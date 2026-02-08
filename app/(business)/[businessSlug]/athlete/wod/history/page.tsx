// app/(business)/[businessSlug]/athlete/wod/history/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { WODHistoryClient } from '@/app/athlete/wod/history/WODHistoryClient'

export const metadata = {
  title: 'WOD Historik | Konditionstest',
  description: 'Se dina tidigare AI-genererade träningspass',
}

interface BusinessWODHistoryPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessWODHistoryPage({ params }: BusinessWODHistoryPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

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
      basePath={basePath}
    />
  )
}
