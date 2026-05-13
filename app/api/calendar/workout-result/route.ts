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

type DetailRow = {
  label: string
  values: Metric[]
}

type DetailSection = {
  title: string
  rows: DetailRow[]
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

function formatNumber(value?: number | null, decimals = 1) {
  if (value === undefined || value === null || !Number.isFinite(value)) return null
  return value.toFixed(decimals)
}

function maxNumber(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ))
  return numbers.length > 0 ? Math.max(...numbers) : null
}

function compactMetrics(metrics: Array<Metric | null>) {
  return metrics.filter((item): item is Metric => Boolean(item))
}

function row(label: string, values: Array<Metric | null>): DetailRow | null {
  const compacted = compactMetrics(values)
  if (compacted.length === 0) return null
  return { label, values: compacted }
}

function compactRows(rows: Array<DetailRow | null>) {
  return rows.filter((item): item is DetailRow => Boolean(item))
}

function formatPace(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}/km`
}

function formatSegmentType(type?: string | null) {
  const labels: Record<string, string> = {
    WARMUP: 'Uppvärmning',
    COOLDOWN: 'Nedvarvning',
    INTERVAL: 'Intervall',
    STEADY: 'Jämn fart',
    RECOVERY: 'Återhämtning',
    HILL: 'Backe',
    DRILLS: 'Övningar',
    REST: 'Vila',
  }
  return type ? labels[type] || type : 'Del'
}

function buildCardioDetails(segmentLogs?: Array<{
  segmentIndex: number
  segmentType: string
  plannedDuration: number | null
  plannedDistance: number | null
  plannedPace: number | null
  plannedZone: number | null
  actualDuration: number | null
  actualDistance: number | null
  actualPace: number | null
  actualAvgHR: number | null
  actualMaxHR: number | null
  completed: boolean
  skipped: boolean
  notes: string | null
}> | null): DetailSection[] {
  if (!segmentLogs?.length) return []
  const rows = compactRows(segmentLogs.map((segment) => row(
    `${segment.segmentIndex + 1}. ${formatSegmentType(segment.segmentType)}`,
    [
      metric('Status', segment.skipped ? 'Hoppad över' : segment.completed ? 'Klar' : 'Ej klar'),
      metric('Tid', formatSecondsToMinutes(segment.actualDuration ?? segment.plannedDuration)),
      metric('Distans', formatDistanceKm(segment.actualDistance ?? segment.plannedDistance)),
      metric('Tempo', formatPace(segment.actualPace ?? segment.plannedPace)),
      metric('Zon', segment.plannedZone ? `Zon ${segment.plannedZone}` : null),
      metric('Snittpuls', segment.actualAvgHR),
      metric('Maxpuls', segment.actualMaxHR),
      metric('Notering', segment.notes),
    ]
  )))
  return rows.length > 0 ? [{ title: 'Delar', rows }] : []
}

function buildStrengthDetails(setLogs: Array<{
  setNumber: number
  weight: number
  repsCompleted: number
  repsTarget: number | null
  rpe: number | null
  meanVelocity: number | null
  peakVelocity: number | null
  meanPower: number | null
  peakPower: number | null
  meanTime: number | null
  peakTime: number | null
  estimated1RM: number | null
  velocityZone: string | null
  notes: string | null
  exercise: { name: string; nameSv: string | null }
}>): DetailSection[] {
  if (setLogs.length === 0) return []
  const rows = compactRows(setLogs.map((setLog) => row(
    `${setLog.exercise.nameSv || setLog.exercise.name} · set ${setLog.setNumber}`,
    [
      metric('Vikt', `${setLog.weight} kg`),
      metric('Reps', setLog.repsTarget ? `${setLog.repsCompleted}/${setLog.repsTarget}` : setLog.repsCompleted),
      metric('RPE', setLog.rpe ? `${setLog.rpe}/10` : null),
      metric('e1RM', formatNumber(setLog.estimated1RM, 1) ? `${formatNumber(setLog.estimated1RM, 1)} kg` : null),
      metric('Zon', setLog.velocityZone),
      metric('Medelhastighet', formatNumber(setLog.meanVelocity, 2) ? `${formatNumber(setLog.meanVelocity, 2)} m/s` : null),
      metric('Topphastighet', formatNumber(setLog.peakVelocity, 2) ? `${formatNumber(setLog.peakVelocity, 2)} m/s` : null),
      metric('Medeleffekt', formatNumber(setLog.meanPower, 0) ? `${formatNumber(setLog.meanPower, 0)} W` : null),
      metric('Toppeffekt', formatNumber(setLog.peakPower, 0) ? `${formatNumber(setLog.peakPower, 0)} W` : null),
      metric('Medeltid', formatNumber(setLog.meanTime, 2) ? `${formatNumber(setLog.meanTime, 2)} s` : null),
      metric('Topptid', formatNumber(setLog.peakTime, 2) ? `${formatNumber(setLog.peakTime, 2)} s` : null),
      metric('Notering', setLog.notes),
    ]
  )))
  return rows.length > 0 ? [{ title: 'Set', rows }] : []
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
      details: buildCardioDetails(log?.segmentLogs),
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

    const bestEstimated1RM = maxNumber(assignment.setLogs.map((setLog) => setLog.estimated1RM))
    const bestPeakPower = maxNumber(assignment.setLogs.map((setLog) => setLog.peakPower))
    const bestMeanVelocity = maxNumber(assignment.setLogs.map((setLog) => setLog.meanVelocity))

    const metrics = compactMetrics([
      metric('Tid', assignment.duration ? `${assignment.duration} min` : null),
      metric('RPE', assignment.rpe ? `${assignment.rpe}/10` : null),
      metric('Set loggade', assignment.setLogs.length || null),
      metric('Bästa e1RM', formatNumber(bestEstimated1RM, 1) ? `${formatNumber(bestEstimated1RM, 1)} kg` : null),
      metric('Toppeffekt', formatNumber(bestPeakPower, 0) ? `${formatNumber(bestPeakPower, 0)} W` : null),
      metric('Bästa hastighet', formatNumber(bestMeanVelocity, 2) ? `${formatNumber(bestMeanVelocity, 2)} m/s` : null),
    ])

    return NextResponse.json({
      kind,
      title: assignment.session.name,
      athleteName: assignment.athlete.name,
      status: assignment.status,
      completedAt: assignment.completedAt,
      metrics,
      notes: assignment.notes,
      details: buildStrengthDetails(assignment.setLogs),
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
      details: [],
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
    details: [],
    original: result ?? assignment,
  })
}
