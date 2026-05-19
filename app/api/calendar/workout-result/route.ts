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
type AppLocale = 'en' | 'sv'

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

function formatSegmentType(type: string | null | undefined, locale: AppLocale) {
  const labels: Record<AppLocale, Record<string, string>> = {
    en: {
      WARMUP: 'Warm-up',
      COOLDOWN: 'Cool-down',
      INTERVAL: 'Interval',
      STEADY: 'Steady',
      RECOVERY: 'Recovery',
      HILL: 'Hill',
      DRILLS: 'Drills',
      REST: 'Rest',
    },
    sv: {
      WARMUP: 'Uppvärmning',
      COOLDOWN: 'Nedvarvning',
      INTERVAL: 'Intervall',
      STEADY: 'Jämn fart',
      RECOVERY: 'Återhämtning',
      HILL: 'Backe',
      DRILLS: 'Övningar',
      REST: 'Vila',
    },
  }
  return type ? labels[locale][type] || type : t(locale, 'Part', 'Del')
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
}> | null, locale: AppLocale = 'en'): DetailSection[] {
  if (!segmentLogs?.length) return []
  const rows = compactRows(segmentLogs.map((segment) => row(
    `${segment.segmentIndex + 1}. ${formatSegmentType(segment.segmentType, locale)}`,
    [
      metric('Status', segment.skipped ? t(locale, 'Skipped', 'Hoppad över') : segment.completed ? t(locale, 'Done', 'Klar') : t(locale, 'Not done', 'Ej klar')),
      metric(t(locale, 'Time', 'Tid'), formatSecondsToMinutes(segment.actualDuration ?? segment.plannedDuration)),
      metric(t(locale, 'Distance', 'Distans'), formatDistanceKm(segment.actualDistance ?? segment.plannedDistance)),
      metric(t(locale, 'Pace', 'Tempo'), formatPace(segment.actualPace ?? segment.plannedPace)),
      metric(t(locale, 'Zone', 'Zon'), segment.plannedZone ? `${t(locale, 'Zone', 'Zon')} ${segment.plannedZone}` : null),
      metric(t(locale, 'Avg HR', 'Snittpuls'), segment.actualAvgHR),
      metric(t(locale, 'Max HR', 'Maxpuls'), segment.actualMaxHR),
      metric(t(locale, 'Note', 'Notering'), segment.notes),
    ]
  )))
  return rows.length > 0 ? [{ title: t(locale, 'Parts', 'Delar'), rows }] : []
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
}>, locale: AppLocale = 'en'): DetailSection[] {
  if (setLogs.length === 0) return []
  const rows = compactRows(setLogs.map((setLog) => row(
    `${locale === 'sv' ? setLog.exercise.nameSv || setLog.exercise.name : setLog.exercise.name} · set ${setLog.setNumber}`,
    [
      metric(t(locale, 'Load', 'Vikt'), `${setLog.weight} kg`),
      metric('Reps', setLog.repsTarget ? `${setLog.repsCompleted}/${setLog.repsTarget}` : setLog.repsCompleted),
      metric('RPE', setLog.rpe ? `${setLog.rpe}/10` : null),
      metric('e1RM', formatNumber(setLog.estimated1RM, 1) ? `${formatNumber(setLog.estimated1RM, 1)} kg` : null),
      metric(t(locale, 'Zone', 'Zon'), setLog.velocityZone),
      metric(t(locale, 'Mean velocity', 'Medelhastighet'), formatNumber(setLog.meanVelocity, 2) ? `${formatNumber(setLog.meanVelocity, 2)} m/s` : null),
      metric(t(locale, 'Peak velocity', 'Topphastighet'), formatNumber(setLog.peakVelocity, 2) ? `${formatNumber(setLog.peakVelocity, 2)} m/s` : null),
      metric(t(locale, 'Mean power', 'Medeleffekt'), formatNumber(setLog.meanPower, 0) ? `${formatNumber(setLog.meanPower, 0)} W` : null),
      metric(t(locale, 'Peak power', 'Toppeffekt'), formatNumber(setLog.peakPower, 0) ? `${formatNumber(setLog.peakPower, 0)} W` : null),
      metric(t(locale, 'Mean time', 'Medeltid'), formatNumber(setLog.meanTime, 2) ? `${formatNumber(setLog.meanTime, 2)} s` : null),
      metric(t(locale, 'Peak time', 'Topptid'), formatNumber(setLog.peakTime, 2) ? `${formatNumber(setLog.peakTime, 2)} s` : null),
      metric(t(locale, 'Note', 'Notering'), setLog.notes),
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
  const locale = getUserLocale(user.language)

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
      metric(t(locale, 'Time', 'Tid'), formatSecondsToMinutes(log?.actualDuration ?? assignment.actualDuration)),
      metric(t(locale, 'Distance', 'Distans'), formatDistanceKm(log?.actualDistance) ?? formatDistanceMeters(assignment.actualDistance)),
      metric(t(locale, 'Avg HR', 'Snittpuls'), log?.avgHeartRate ?? assignment.avgHeartRate),
      metric(t(locale, 'Max HR', 'Maxpuls'), log?.maxHeartRate),
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
      details: buildCardioDetails(log?.segmentLogs, locale),
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
      metric(t(locale, 'Time', 'Tid'), assignment.duration ? `${assignment.duration} min` : null),
      metric('RPE', assignment.rpe ? `${assignment.rpe}/10` : null),
      metric(t(locale, 'Sets logged', 'Set loggade'), assignment.setLogs.length || null),
      metric(t(locale, 'Best e1RM', 'Bästa e1RM'), formatNumber(bestEstimated1RM, 1) ? `${formatNumber(bestEstimated1RM, 1)} kg` : null),
      metric(t(locale, 'Peak power', 'Toppeffekt'), formatNumber(bestPeakPower, 0) ? `${formatNumber(bestPeakPower, 0)} W` : null),
      metric(t(locale, 'Best velocity', 'Bästa hastighet'), formatNumber(bestMeanVelocity, 2) ? `${formatNumber(bestMeanVelocity, 2)} m/s` : null),
    ])

    return NextResponse.json({
      kind,
      title: assignment.session.name,
      athleteName: assignment.athlete.name,
      status: assignment.status,
      completedAt: assignment.completedAt,
      metrics,
      notes: assignment.notes,
      details: buildStrengthDetails(assignment.setLogs, locale),
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
      metric(t(locale, 'Time', 'Tid'), formatSecondsToMinutes(result?.timeScore ?? log?.totalTime)),
      metric(t(locale, 'Rounds', 'Varv'), result?.roundsCompleted ?? log?.totalRounds),
      metric('Reps', result?.repsCompleted ?? log?.extraReps),
      metric(t(locale, 'Load', 'Belastning'), result?.loadUsed ? `${result.loadUsed} kg` : null),
      metric('RPE', result?.perceivedEffort ? `${result.perceivedEffort}/10` : log?.sessionRPE ? `${log.sessionRPE}/10` : null),
      metric(t(locale, 'Scaling', 'Skalning'), result?.scalingLevel ?? log?.scalingLevel),
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
    metric(t(locale, 'Time', 'Tid'), formatSecondsToMinutes(result?.totalDuration)),
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

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
