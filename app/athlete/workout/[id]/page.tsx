import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { StrengthWorkoutPageClient } from '@/components/workouts/StrengthWorkoutPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteWorkoutPage({ params }: PageProps) {
  const { id: sessionId } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

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
      fallbackRoute="/athlete/dashboard"
    />
  )
}
