import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { StrengthSessionCard } from '@/components/athlete/workout/StrengthSessionCard'

interface PageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function BusinessAthleteWorkoutPage({ params }: PageProps) {
  const { businessSlug, id: sessionId } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(businessSlug, user.id)
  if (!membership) notFound()

  // Find the athlete's most recent assignment for this strength session
  const assignment = await prisma.strengthSessionAssignment.findFirst({
    where: {
      athleteId: clientId,
      sessionId,
      status: { not: 'SKIPPED' },
    },
    orderBy: { assignedDate: 'desc' },
    include: {
      session: {
        select: {
          id: true,
          name: true,
          description: true,
          phase: true,
          estimatedDuration: true,
          totalExercises: true,
          totalSets: true,
          warmupData: true,
          coreData: true,
          cooldownData: true,
        },
      },
      setLogs: {
        orderBy: { completedAt: 'desc' },
      },
    },
  })

  if (!assignment) notFound()

  // Calculate progress
  const completedSets = assignment.setLogs.length
  const lastActivity = assignment.setLogs[0]?.completedAt?.toISOString() ?? null

  const cardData = {
    id: assignment.id,
    assignedDate: assignment.assignedDate.toISOString(),
    status: assignment.status as 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED',
    completedAt: assignment.completedAt?.toISOString() ?? null,
    rpe: assignment.rpe ?? null,
    duration: assignment.duration ?? null,
    notes: assignment.notes ?? null,
    session: {
      id: assignment.session.id,
      name: assignment.session.name,
      description: assignment.session.description ?? null,
      phase: assignment.session.phase,
      estimatedDuration: assignment.session.estimatedDuration ?? null,
      totalExercises: assignment.session.totalExercises,
      totalSets: assignment.session.totalSets,
      hasWarmup: assignment.session.warmupData !== null,
      hasCore: assignment.session.coreData !== null,
      hasCooldown: assignment.session.cooldownData !== null,
    },
    progress: {
      completedSets,
      lastActivity,
    },
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <StrengthSessionCard assignment={cardData} />
    </div>
  )
}
