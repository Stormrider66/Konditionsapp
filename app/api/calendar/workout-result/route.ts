import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  kind: z.enum(['cardio', 'strength', 'hybrid', 'agility']),
  assignmentId: z.string().uuid(),
})

type Metric = {
  label: string
  value: string
}

function formatSecondsToMinutes(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  return `${Math.round(seconds / 60)} min`
}

function formatDistanceMeters(meters?: number | null) {
  if (!meters || meters <= 0) return null
  return `${(meters / 1000).toFixed(meters >= 10000 ? 1 : 2)} km`
}

function formatDistanceKm(km?: number | null) {
  if (!km || km <= 0) return null
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`
}

function metric(label: string, value?: string | number | null): Metric | null {
  if (value === undefined || value === null || value === '') return null
  return { label, value: String(value) }
}

function compactMetrics(metrics: Array<Metric | null>) {
  return metrics.filter((item): item is Metric => Boolean(item))
}

async function assertAssignmentAccess(userId: string, athleteId: string) {
  const allowed = await canAccessClient(userId, athleteId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = querySchema.safeParse({
    kind: request.nextUrl.searchParams.get('kind'),
    assignmentId: request.nextUrl.searchParams.get('assignmentId'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid workout result request' }, { status: 400 })
  }

  const { kind, assignmentId } = parsed.data

  if (kind === 'cardio') {
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: { select: { id: true, name: true } },
        athlete: { select: { id: true, name: true } },
      },
    })
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    const accessError = await assertAssignmentAccess(user.id, assignment.athleteId)
    if (accessError) return accessError

    const log = await prisma.cardioSessionLog.findFirst({
      where: { assignmentId },
      include: { segmentLogs: { orderBy: { segmentIndex: 'asc' } } },
      orderBy: { startedAt: 'desc' },
    })

    const completedAt = log?.completedAt ?? assignment.completedAt
    const metrics = compactMetrics([
      metric('Tid', formatSecondsToMinutes(log?.actualDuration ?? assignment.actualDuration)),
      metric('Distans', formatDistanceKm(log?.actualDistance) ?? formatDistanceMeters(assignment.actualDistance)),
      metric('Snittpuls', log?.avgHeartRate ?? assignment.avgHeartRate),
      metric('Maxpuls', log?.maxHeartRate),
      metric('RPE', log?.sessionRPE ? `${log.sessionRPE}/10` : null),
    ])

    return NextResponse.json({
      kind,
      title: assignment.session.name,
      athleteName: assignment.athlete.name,
      status: assignment.status,
      completedAt,
      metrics,
      notes: log?.notes ?? null,
      details: log?.segmentLogs ?? assignment.actualSegments ?? null,
      original: log ?? assignment,
    })
  }

  if (kind === 'strength') {
    const assignment = await prisma.strengthSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: { select: { id: true, name: true } },
        athlete: { select: { id: true, name: true } },
        setLogs: {
          orderBy: [{ completedAt: 'asc' }, { setNumber: 'asc' }],
          include: { exercise: { select: { id: true, name: true, nameSv: true } } },
        },
      },
    })
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    const accessError = await assertAssignmentAccess(user.id, assignment.athleteId)
    if (accessError) return accessError

    const metrics = compactMetrics([
      metric('Tid', assignment.duration ? `${assignment.duration} min` : null),
      metric('RPE', assignment.rpe ? `${assignment.rpe}/10` : null),
      metric('Set loggade', assignment.setLogs.length || null),
    ])

    return NextResponse.json({
      kind,
      title: assignment.session.name,
      athleteName: assignment.athlete.name,
      status: assignment.status,
      completedAt: assignment.completedAt,
      metrics,
      notes: assignment.notes,
      details: assignment.setLogs.length > 0 ? assignment.setLogs : assignment.actualExercises,
      original: assignment,
    })
  }

  if (kind === 'hybrid') {
    const assignment = await prisma.hybridWorkoutAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        workout: { select: { id: true, name: true, format: true } },
        athlete: { select: { id: true, name: true } },
      },
    })
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    const accessError = await assertAssignmentAccess(user.id, assignment.athleteId)
    if (accessError) return accessError

    const [log, result] = await Promise.all([
      prisma.hybridWorkoutLog.findFirst({
        where: { assignmentId },
        include: { roundLogs: { orderBy: { roundNumber: 'asc' } } },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.hybridWorkoutResult.findFirst({
        where: { workoutId: assignment.workoutId, athleteId: assignment.athleteId },
        orderBy: { completedAt: 'desc' },
      }),
    ])

    const metrics = compactMetrics([
      metric('Tid', formatSecondsToMinutes(result?.timeScore ?? log?.totalTime)),
      metric('Varv', result?.roundsCompleted ?? log?.totalRounds),
      metric('Reps', result?.repsCompleted ?? log?.extraReps),
      metric('Belastning', result?.loadUsed ? `${result.loadUsed} kg` : null),
      metric('RPE', result?.perceivedEffort ? `${result.perceivedEffort}/10` : log?.sessionRPE ? `${log.sessionRPE}/10` : null),
      metric('Skalning', result?.scalingLevel ?? log?.scalingLevel),
    ])

    return NextResponse.json({
      kind,
      title: assignment.workout.name,
      athleteName: assignment.athlete.name,
      status: assignment.status,
      completedAt: result?.completedAt ?? log?.completedAt ?? assignment.completedAt,
      metrics,
      notes: result?.notes ?? log?.notes ?? assignment.notes,
      details: result?.movementSplits ?? log?.roundLogs ?? null,
      original: result ?? log ?? assignment,
    })
  }

  const assignment = await prisma.agilityWorkoutAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      workout: { select: { id: true, name: true } },
      athlete: { select: { id: true, name: true } },
    },
  })
  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

  const accessError = await assertAssignmentAccess(user.id, assignment.athleteId)
  if (accessError) return accessError

  const result = await prisma.agilityWorkoutResult.findFirst({
    where: { workoutId: assignment.workoutId, athleteId: assignment.athleteId },
    orderBy: { completedAt: 'desc' },
  })

  const metrics = compactMetrics([
    metric('Tid', formatSecondsToMinutes(result?.totalDuration)),
    metric('RPE', result?.perceivedEffort ? `${result.perceivedEffort}/10` : null),
  ])

  return NextResponse.json({
    kind,
    title: assignment.workout.name,
    athleteName: assignment.athlete.name,
    status: assignment.status,
    completedAt: result?.completedAt ?? assignment.completedAt,
    metrics,
    notes: result?.notes ?? assignment.notes,
    details: result?.drillResults ?? null,
    original: result ?? assignment,
  })
}
