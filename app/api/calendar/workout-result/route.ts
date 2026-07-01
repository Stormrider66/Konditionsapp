import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { buildCardioFocusModeSegments, type FocusModeSegment } from '@/lib/cardio/focus-mode-segments'
import {
  recordedCardioSegmentDurationSeconds,
  resolveCardioForTimeResultSeconds,
  resolveRecordedCardioDurationSeconds,
} from '@/lib/cardio/recorded-duration'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

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

function formatSecondsToClock(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
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

function buildCardioDetails(segmentLogs: Array<{
  segmentIndex: number
  segmentType: string
  plannedDuration: number | null
  plannedDistance: number | null
  plannedPace: number | null
  plannedZone: number | null
  plannedPower: number | null
  actualDuration: number | null
  actualDistance: number | null
  actualPace: number | null
  actualAvgHR: number | null
  actualMaxHR: number | null
  actualAvgPower: number | null
  actualMaxPower: number | null
  completed: boolean
  skipped: boolean
  notes: string | null
}> | null | undefined, planned: FocusModeSegment[], openerWatts: number | null, locale: AppLocale = 'en'): DetailSection[] {
  if (!segmentLogs?.length) return []
  const plannedByIndex = new Map(planned.map((p) => [p.index, p]))
  const rows = compactRows(segmentLogs.map((segment) => {
    const p = plannedByIndex.get(segment.segmentIndex)
    // Resolve the planned power target: absolute watts, or % of the logged opener.
    const targetWatts = segment.plannedPower
      ?? (p?.powerRelPercent && p.powerRelTo === 'OPENER' && openerWatts
        ? Math.round((openerWatts * p.powerRelPercent) / 100)
        : null)
    const targetLabel = targetWatts != null
      ? `${targetWatts} W${p?.powerRelPercent ? ` (${p.powerRelPercent}%)` : ''}`
      : null
    const name = `${segment.segmentIndex + 1}. ${formatSegmentType(segment.segmentType, locale)}${p?.isBenchmark ? ` (${t(locale, 'opener', 'prolog')})` : ''}`
    return row(name, [
      metric(t(locale, 'Status', 'Status'), segment.skipped ? t(locale, 'Skipped', 'Hoppad över') : segment.completed ? t(locale, 'Done', 'Klar') : t(locale, 'Not done', 'Ej klar')),
      metric(t(locale, 'Time', 'Tid'), formatSecondsToMinutes(segment.actualDuration ?? segment.plannedDuration)),
      metric(t(locale, 'Distance', 'Distans'), formatDistanceKm(segment.actualDistance ?? segment.plannedDistance)),
      metric(t(locale, 'Pace', 'Tempo'), formatPace(segment.actualPace ?? segment.plannedPace)),
      metric(t(locale, 'Zone', 'Zon'), segment.plannedZone ? `${t(locale, 'Zone', 'Zon')} ${segment.plannedZone}` : null),
      metric(t(locale, 'Target W', 'Mål W'), targetLabel),
      metric(t(locale, 'Avg W', 'Snitt W'), segment.actualAvgPower ? `${segment.actualAvgPower} W` : null),
      metric(t(locale, 'Max W', 'Max W'), segment.actualMaxPower ? `${segment.actualMaxPower} W` : null),
      metric(t(locale, 'Avg HR', 'Snittpuls'), segment.actualAvgHR),
      metric(t(locale, 'Max HR', 'Maxpuls'), segment.actualMaxHR),
      metric(t(locale, 'Note', 'Notering'), segment.notes),
    ])
  }))
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
  exercise: { name: string; nameSv: string | null; nameEn: string | null }
}>, locale: AppLocale = 'en'): DetailSection[] {
  if (setLogs.length === 0) return []
  const rows = compactRows(setLogs.map((setLog) => row(
    `${locale === 'sv' ? setLog.exercise.nameSv || setLog.exercise.nameEn || setLog.exercise.name : setLog.exercise.nameEn || setLog.exercise.name || setLog.exercise.nameSv} · ${t(locale, 'set', 'set')} ${setLog.setNumber}`,
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
  return rows.length > 0 ? [{ title: t(locale, 'Sets', 'Set'), rows }] : []
}

async function assertAssignmentAccess(userId: string, athleteId: string, locale: AppLocale) {
  const allowed = await canAccessClient(userId, athleteId)
  if (!allowed) {
    return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
  }
  return null
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
  }
  locale = resolveRequestLocale(request, user.language)

  const parsed = querySchema.safeParse({
    kind: request.nextUrl.searchParams.get('kind'),
    assignmentId: request.nextUrl.searchParams.get('assignmentId'),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: t(locale, 'Invalid workout result request', 'Ogiltig förfrågan om träningsresultat') }, { status: 400 })
  }

  const { kind, assignmentId } = parsed.data

  if (kind === 'cardio') {
    const assignment = await prisma.cardioSessionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        session: { select: { id: true, name: true, segments: true } },
        athlete: { select: { id: true, name: true } },
      },
    })
    if (!assignment) return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })

    const accessError = await assertAssignmentAccess(user.id, assignment.athleteId, locale)
    if (accessError) return accessError

    const log = await prisma.cardioSessionLog.findFirst({
      where: { assignmentId },
      include: { segmentLogs: { orderBy: { segmentIndex: 'asc' } } },
      orderBy: { startedAt: 'desc' },
    })

    // Index-aligned planned segments tell us the opener (benchmark) and the
    // relative %-of-opener targets, so we can resolve them against logged watts.
    const plannedSegments = buildCardioFocusModeSegments({ segments: assignment.session.segments, locale })
    const segmentLogs = log?.segmentLogs.map((segmentLog) => ({
      ...segmentLog,
      actualDuration:
        recordedCardioSegmentDurationSeconds(segmentLog) ?? segmentLog.actualDuration,
    }))
    const resultSegments = buildCardioFocusModeSegments({
      segments: assignment.session.segments,
      segmentLogs: segmentLogs ?? [],
      locale,
    })
    const benchmarkIndex = plannedSegments.find((p) => p.isBenchmark)?.index
    const openerWatts = benchmarkIndex != null
      ? (segmentLogs?.find((s) => s.segmentIndex === benchmarkIndex)?.actualAvgPower ?? null)
      : null
    const actualDuration = log
      ? resolveRecordedCardioDurationSeconds({
          segmentLogs: log.segmentLogs,
          expectedSegmentCount: plannedSegments.length,
          fallbackDuration: log.actualDuration ?? assignment.actualDuration,
        })
      : assignment.actualDuration

    const completedAt = log?.completedAt ?? assignment.completedAt
    const metrics = compactMetrics([
      metric(t(locale, 'Time', 'Tid'), formatSecondsToClock(actualDuration)),
      metric(
        t(locale, 'Interval time', 'Intervalltid'),
        formatSecondsToClock(resolveCardioForTimeResultSeconds(resultSegments)),
      ),
      metric(t(locale, 'Distance', 'Distans'), formatDistanceKm(log?.actualDistance) ?? formatDistanceMeters(assignment.actualDistance)),
      metric(t(locale, 'Avg HR', 'Snittpuls'), log?.avgHeartRate ?? assignment.avgHeartRate),
      metric(t(locale, 'Max HR', 'Maxpuls'), log?.maxHeartRate),
      metric(t(locale, 'Opener', 'Prolog'), openerWatts ? `${openerWatts} W` : null),
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
      details: buildCardioDetails(segmentLogs, plannedSegments, openerWatts, locale),
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
          include: { exercise: { select: { id: true, name: true, nameSv: true, nameEn: true } } },
        },
      },
    })
    if (!assignment) return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })

    const accessError = await assertAssignmentAccess(user.id, assignment.athleteId, locale)
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
    if (!assignment) return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })

    const accessError = await assertAssignmentAccess(user.id, assignment.athleteId, locale)
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
  if (!assignment) return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })

  const accessError = await assertAssignmentAccess(user.id, assignment.athleteId, locale)
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

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
