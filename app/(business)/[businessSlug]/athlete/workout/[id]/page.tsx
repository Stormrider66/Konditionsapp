import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { StrengthWorkoutPageClient } from '@/components/workouts/StrengthWorkoutPageClient'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function BusinessAthleteWorkoutPage({ params }: PageProps) {
  const { businessSlug, id: sessionId } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  // Business membership is already validated by the parent layout

  const assignment = await prisma.strengthSessionAssignment.findFirst({
    where: {
      athleteId: clientId,
      sessionId,
      status: { not: 'SKIPPED' },
    },
    orderBy: { assignedDate: 'desc' },
    select: { id: true },
  })

  if (!assignment) notFound()

  return (
    <StrengthWorkoutPageClient
      assignmentId={assignment.id}
      fallbackRoute={`/${businessSlug}/athlete/dashboard`}
    />
  )
}
