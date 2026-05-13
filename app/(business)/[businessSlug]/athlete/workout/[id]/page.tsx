import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { StrengthWorkoutPageClient } from '@/components/workouts/StrengthWorkoutPageClient'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function BusinessAthleteWorkoutPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  // Business membership is already validated by the parent layout

  const assignmentById = await prisma.strengthSessionAssignment.findFirst({
    where: {
      id,
      athleteId: clientId,
      status: { not: 'SKIPPED' },
    },
    select: { id: true },
  })

  const assignment = assignmentById ?? await findBestAssignmentForSession(id, clientId)

  if (!assignment) notFound()

  return (
    <StrengthWorkoutPageClient
      assignmentId={assignment.id}
      fallbackRoute={`/${businessSlug}/athlete/dashboard`}
    />
  )
}

async function findBestAssignmentForSession(sessionId: string, clientId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pastOrToday = await prisma.strengthSessionAssignment.findFirst({
    where: {
      athleteId: clientId,
      sessionId,
      status: { not: 'SKIPPED' },
      assignedDate: { lte: today },
    },
    orderBy: { assignedDate: 'desc' },
    select: { id: true },
  })

  if (pastOrToday) return pastOrToday

  return prisma.strengthSessionAssignment.findFirst({
    where: {
      athleteId: clientId,
      sessionId,
      status: { not: 'SKIPPED' },
    },
    orderBy: { assignedDate: 'asc' },
    select: { id: true },
  })
}
