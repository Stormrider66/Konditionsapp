/**
 * Server-side normalizer for the unified activity detail view.
 *
 * Given a source + row id (and the viewing athlete's ids), this loads the row,
 * verifies ownership, parses the stored time-series / splits / zone JSON, and
 * builds a `ActivityDetailData` including a cross-session comparison trend.
 *
 * Server-only: imports prisma. Do not import from client components.
 */

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getProgressionHistory } from '@/lib/training-engine/progression'
import type {
  ActivityDetailData,
  ActivityDetailSource,
  ActivityExerciseProgression,
  ActivitySplit,
  ActivityStreamPoint,
  ActivityStrengthExercise,
  ActivityTrend,
  ActivityTrendPoint,
  ActivityZoneSeconds,
  TrendMetricKey,
} from '@/lib/activity-detail/types'

interface BuildActivityDetailParams {
  source: ActivityDetailSource
  id: string
  /** Client.id of the athlete being viewed. */
  clientId: string
  /** User.id of the athlete (for WorkoutLog.athleteId); null if unknown. */
  athleteUserId: string | null
}

type ActivityMode = 'run' | 'ride' | 'row' | 'other'

const TREND_WINDOW_DAYS = 120
const TREND_LIMIT = 12

function classifyMode(type?: string | null): ActivityMode {
  const t = (type || '').toLowerCase()
  if (t.includes('run')) return 'run'
  if (t.includes('cycl') || t.includes('ride') || t.includes('bike')) return 'ride'
  if (t.includes('row') || t.includes('ski')) return 'row'
  return 'other'
}

function metricKeyForMode(mode: ActivityMode): TrendMetricKey | null {
  if (mode === 'run') return 'paceSecPerKm'
  if (mode === 'ride') return 'speedKmh'
  if (mode === 'row') return 'pace500m'
  return null
}

function asNumberArray(value: Prisma.JsonValue | null | undefined): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

function asObjectArray(value: Prisma.JsonValue | null | undefined): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  const out: Record<string, unknown>[] = []
  for (const item of value) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      out.push(item as Record<string, unknown>)
    }
  }
  return out
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function paceSecPerKmFromMps(mps?: number | null): number | undefined {
  if (!mps || mps <= 0) return undefined
  return Math.round(1000 / mps)
}

function speedKmhFromMps(mps?: number | null): number | undefined {
  if (!mps || mps <= 0) return undefined
  return Math.round(mps * 3.6 * 10) / 10
}

/** Parse "5:15/km" or "5:15" into seconds per km. */
function parsePaceStringToSec(value?: string | null): number | undefined {
  if (!value) return undefined
  const match = value.match(/(\d+):(\d{1,2})/)
  if (!match) return undefined
  const min = Number(match[1])
  const sec = Number(match[2])
  if (!Number.isFinite(min) || !Number.isFinite(sec)) return undefined
  return min * 60 + sec
}

function zonesFromDistribution(
  dist: {
    zone1Seconds: number
    zone2Seconds: number
    zone3Seconds: number
    zone4Seconds: number
    zone5Seconds: number
    zoneSource: string
  } | null | undefined
): ActivityZoneSeconds | null {
  if (!dist) return null
  const total =
    dist.zone1Seconds + dist.zone2Seconds + dist.zone3Seconds + dist.zone4Seconds + dist.zone5Seconds
  if (total <= 0) return null
  return {
    zone1: dist.zone1Seconds,
    zone2: dist.zone2Seconds,
    zone3: dist.zone3Seconds,
    zone4: dist.zone4Seconds,
    zone5: dist.zone5Seconds,
    source: dist.zoneSource,
  }
}

function zonesFromGarminSeconds(value: Prisma.JsonValue | null | undefined): ActivityZoneSeconds | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const z = (k: string) => num(record[k]) ?? 0
  const zones = {
    zone1: z('zone1'),
    zone2: z('zone2'),
    zone3: z('zone3'),
    zone4: z('zone4'),
    zone5: z('zone5'),
    source: 'GARMIN_ZONES',
  }
  const total = zones.zone1 + zones.zone2 + zones.zone3 + zones.zone4 + zones.zone5
  return total > 0 ? zones : null
}

/** Downsample a stream to at most `max` points to keep the chart light. */
function downsample<T>(points: T[], max = 600): T[] {
  if (points.length <= max) return points
  const step = Math.ceil(points.length / max)
  return points.filter((_, i) => i % step === 0)
}

/** Build the comparison summary of the current activity vs the other points. */
function buildComparison(
  points: ActivityTrendPoint[],
  lowerIsBetter: boolean
): ActivityTrend['comparison'] {
  const current = points.find((p) => p.isCurrent)
  const others = points.filter((p) => !p.isCurrent)
  if (!current || others.length === 0) return null

  const avg = (vals: Array<number | undefined>) => {
    const nums = vals.filter((v): v is number => typeof v === 'number')
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined
  }

  const otherValueAvg = avg(others.map((p) => p.value))
  const otherHRAvg = avg(others.map((p) => p.avgHR))
  const otherDistAvg = avg(others.map((p) => p.distanceKm))

  let metricDeltaPct: number | undefined
  if (current.value !== undefined && otherValueAvg && otherValueAvg > 0) {
    const raw = ((current.value - otherValueAvg) / otherValueAvg) * 100
    // For lower-is-better (pace) flip sign so positive = improvement.
    metricDeltaPct = Math.round((lowerIsBetter ? -raw : raw) * 10) / 10
  }

  return {
    vsCount: others.length,
    metricDeltaPct,
    avgHRDelta:
      current.avgHR !== undefined && otherHRAvg !== undefined
        ? Math.round(current.avgHR - otherHRAvg)
        : undefined,
    distanceKmDelta:
      current.distanceKm !== undefined && otherDistAvg !== undefined
        ? Math.round((current.distanceKm - otherDistAvg) * 100) / 100
        : undefined,
  }
}

function finalizeTrend(
  rawPoints: ActivityTrendPoint[],
  metricKey: TrendMetricKey | null,
  lowerIsBetter: boolean
): ActivityTrend {
  // Chronological ascending; cap to TREND_LIMIT most-recent.
  const points = rawPoints
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-TREND_LIMIT)
  return {
    metricKey,
    lowerIsBetter,
    points,
    comparison: buildComparison(points, lowerIsBetter),
  }
}

function trendStartDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() - TREND_WINDOW_DAYS)
  return d
}

export async function buildActivityDetail(
  params: BuildActivityDetailParams
): Promise<ActivityDetailData | null> {
  const { source, id, clientId, athleteUserId } = params

  switch (source) {
    case 'garmin':
      return buildGarmin(id, clientId)
    case 'strava':
      return buildStrava(id, clientId)
    case 'concept2':
      return buildConcept2(id, clientId)
    case 'phonerun':
      return buildPhoneRun(id, clientId)
    case 'manual':
      return buildManual(id, clientId, athleteUserId)
    case 'ai':
      return buildAi(id, clientId)
    default:
      return null
  }
}

async function buildGarmin(id: string, clientId: string): Promise<ActivityDetailData | null> {
  const activity = await prisma.garminActivity.findUnique({
    where: { id },
    include: { zoneDistribution: true },
  })
  if (!activity || activity.clientId !== clientId) return null

  const displayType = activity.mappedType || activity.type || 'OTHER'
  const mode = classifyMode(displayType)

  // Stream: zip hrStream with hrStreamOffsets (offsets give true elapsed secs).
  const hr = asNumberArray(activity.hrStream)
  const offsets = asNumberArray(activity.hrStreamOffsets)
  const streams: ActivityStreamPoint[] = downsample(
    hr.map((value, i) => ({
      elapsedSec: offsets.length === hr.length ? offsets[i] : i,
      hr: value,
    }))
  )

  const zones =
    zonesFromDistribution(activity.zoneDistribution) ?? zonesFromGarminSeconds(activity.hrZoneSeconds)

  const splits = parseGarminLaps(activity.laps)

  const trend = await buildGarminTrend(activity, clientId, mode)

  return {
    id: activity.id,
    source: 'garmin',
    name: activity.name || displayType,
    type: displayType,
    date: activity.startDate.toISOString(),
    deviceModel: activity.deviceName || undefined,
    indoor: activity.indoor,
    durationSec: activity.duration || undefined,
    distanceMeters: activity.distance || undefined,
    avgHR: activity.averageHeartrate ? Math.round(activity.averageHeartrate) : undefined,
    maxHR: activity.maxHeartrate ? Math.round(activity.maxHeartrate) : undefined,
    calories: activity.calories ? Math.round(activity.calories) : undefined,
    tss: activity.tss || undefined,
    trimp: activity.trimp || undefined,
    paceSecPerKm: mode === 'run' ? paceSecPerKmFromMps(activity.averageSpeed) : undefined,
    speedKmh: mode === 'ride' ? speedKmhFromMps(activity.averageSpeed) : undefined,
    elevationGainM: activity.elevationGain || undefined,
    avgPower: activity.averageWatts ? Math.round(activity.averageWatts) : undefined,
    normalizedPower: activity.normalizedPower ? Math.round(activity.normalizedPower) : undefined,
    maxPower: activity.maxWatts ? Math.round(activity.maxWatts) : undefined,
    cadence: activity.averageCadence ? Math.round(activity.averageCadence) : undefined,
    trainingEffect: activity.trainingEffect || undefined,
    anaerobicEffect: activity.anaerobicEffect || undefined,
    streams,
    zones,
    splits,
    trend,
    isStrength: false,
    strengthExercises: [],
    strengthProgression: [],
  }
}

function parseGarminLaps(value: Prisma.JsonValue | null | undefined): ActivitySplit[] {
  const laps = asObjectArray(value)
  return laps
    .map((lap, i): ActivitySplit => {
      const distanceMeters = num(lap.distance) ?? num(lap.distanceInMeters)
      const durationSec = num(lap.duration) ?? num(lap.elapsedDuration) ?? num(lap.movingDuration)
      const avgSpeed = num(lap.averageSpeed) ?? num(lap.avgSpeed)
      return {
        label: `${i + 1}`,
        distanceMeters,
        durationSec,
        paceSecPerKm:
          paceSecPerKmFromMps(avgSpeed) ??
          (distanceMeters && durationSec && distanceMeters > 0
            ? Math.round((durationSec / distanceMeters) * 1000)
            : undefined),
        avgHR: num(lap.averageHR) ?? num(lap.averageHeartRate),
      }
    })
    .filter((s) => s.distanceMeters || s.durationSec)
}

async function buildGarminTrend(
  current: { id: string; mappedType: string | null; type: string; startDate: Date },
  clientId: string,
  mode: ActivityMode
): Promise<ActivityTrend> {
  const rows = await prisma.garminActivity.findMany({
    where: {
      clientId,
      startDate: { gte: trendStartDate() },
      ...(current.mappedType ? { mappedType: current.mappedType } : { type: current.type }),
    },
    orderBy: { startDate: 'desc' },
    take: 30,
    select: {
      id: true,
      startDate: true,
      distance: true,
      averageHeartrate: true,
      tss: true,
      averageSpeed: true,
    },
  })

  const metricKey = metricKeyForMode(mode)
  const points: ActivityTrendPoint[] = rows.map((r) => ({
    id: r.id,
    date: r.startDate.toISOString(),
    value:
      mode === 'run'
        ? paceSecPerKmFromMps(r.averageSpeed)
        : mode === 'ride'
          ? speedKmhFromMps(r.averageSpeed)
          : undefined,
    avgHR: r.averageHeartrate ? Math.round(r.averageHeartrate) : undefined,
    tss: r.tss || undefined,
    distanceKm: r.distance ? Math.round((r.distance / 1000) * 100) / 100 : undefined,
    isCurrent: r.id === current.id,
  }))

  return finalizeTrend(points, metricKey, mode !== 'ride')
}

async function buildStrava(id: string, clientId: string): Promise<ActivityDetailData | null> {
  const activity = await prisma.stravaActivity.findUnique({
    where: { id },
    include: { zoneDistribution: true },
  })
  if (!activity || activity.clientId !== clientId) return null

  const displayType = activity.mappedType || activity.type || 'OTHER'
  const mode = classifyMode(activity.type || activity.mappedType)

  // Strava HR stream is interpolated to 1 Hz, so index === elapsed seconds.
  const hr = asNumberArray(activity.hrStream)
  const streams: ActivityStreamPoint[] = downsample(hr.map((value, i) => ({ elapsedSec: i, hr: value })))

  const zones = zonesFromDistribution(activity.zoneDistribution)
  const splits = parseStravaSplits(activity.splitsMetric)
  const trend = await buildStravaTrend(activity, clientId, mode)

  return {
    id: activity.id,
    source: 'strava',
    name: activity.name,
    type: displayType,
    date: activity.startDate.toISOString(),
    durationSec: activity.movingTime || undefined,
    distanceMeters: activity.distance || undefined,
    avgHR: activity.averageHeartrate ? Math.round(activity.averageHeartrate) : undefined,
    maxHR: activity.maxHeartrate ? Math.round(activity.maxHeartrate) : undefined,
    calories: activity.calories ? Math.round(activity.calories) : undefined,
    tss: activity.tss || undefined,
    trimp: activity.trimp || undefined,
    paceSecPerKm: mode === 'run' ? paceSecPerKmFromMps(activity.averageSpeed) : undefined,
    speedKmh: mode === 'ride' ? speedKmhFromMps(activity.averageSpeed) : undefined,
    elevationGainM: activity.elevationGain || undefined,
    avgPower: activity.averageWatts ? Math.round(activity.averageWatts) : undefined,
    normalizedPower: activity.weightedAverageWatts ? Math.round(activity.weightedAverageWatts) : undefined,
    cadence: activity.averageCadence ? Math.round(activity.averageCadence) : undefined,
    streams,
    zones,
    splits,
    trend,
    isStrength: false,
    strengthExercises: [],
    strengthProgression: [],
  }
}

function parseStravaSplits(value: Prisma.JsonValue | null | undefined): ActivitySplit[] {
  const splits = asObjectArray(value)
  return splits.map((split, i): ActivitySplit => {
    const distanceMeters = num(split.distance)
    const durationSec = num(split.moving_time) ?? num(split.elapsed_time)
    const avgSpeed = num(split.average_speed)
    return {
      label: `${i + 1}`,
      distanceMeters,
      durationSec,
      paceSecPerKm:
        paceSecPerKmFromMps(avgSpeed) ??
        (distanceMeters && durationSec && distanceMeters > 0
          ? Math.round((durationSec / distanceMeters) * 1000)
          : undefined),
      avgHR: num(split.average_heartrate),
    }
  })
}

async function buildStravaTrend(
  current: { id: string; type: string; mappedType: string | null; startDate: Date },
  clientId: string,
  mode: ActivityMode
): Promise<ActivityTrend> {
  const rows = await prisma.stravaActivity.findMany({
    where: {
      clientId,
      startDate: { gte: trendStartDate() },
      ...(current.mappedType ? { mappedType: current.mappedType } : { type: current.type }),
    },
    orderBy: { startDate: 'desc' },
    take: 30,
    select: {
      id: true,
      startDate: true,
      distance: true,
      averageHeartrate: true,
      tss: true,
      averageSpeed: true,
    },
  })

  const points: ActivityTrendPoint[] = rows.map((r) => ({
    id: r.id,
    date: r.startDate.toISOString(),
    value:
      mode === 'run'
        ? paceSecPerKmFromMps(r.averageSpeed)
        : mode === 'ride'
          ? speedKmhFromMps(r.averageSpeed)
          : undefined,
    avgHR: r.averageHeartrate ? Math.round(r.averageHeartrate) : undefined,
    tss: r.tss || undefined,
    distanceKm: r.distance ? Math.round((r.distance / 1000) * 100) / 100 : undefined,
    isCurrent: r.id === current.id,
  }))

  return finalizeTrend(points, metricKeyForMode(mode), mode !== 'ride')
}

async function buildConcept2(id: string, clientId: string): Promise<ActivityDetailData | null> {
  const result = await prisma.concept2Result.findUnique({ where: { id } })
  if (!result || result.clientId !== clientId) return null

  const mode = classifyMode(result.mappedType || result.type)
  const equipmentNames: Record<string, string> = {
    rower: 'RowErg',
    skierg: 'SkiErg',
    bike: 'BikeErg',
    dynamic: 'Dynamic',
    slides: 'Slides',
    multierg: 'MultiErg',
  }
  const equipmentName = equipmentNames[result.type] || result.type
  const splits = parseConcept2Splits(result.splits ?? result.intervals)
  const trend = await buildConcept2Trend(result, clientId, mode)

  return {
    id: result.id,
    source: 'concept2',
    name: result.workoutType ? `${equipmentName} · ${result.workoutType}` : equipmentName,
    type: result.mappedType || 'ROWING',
    date: result.date.toISOString(),
    durationSec: result.time ? Math.round(result.time / 10) : undefined,
    distanceMeters: result.distance || undefined,
    avgHR: result.avgHeartRate ? Math.round(result.avgHeartRate) : undefined,
    maxHR: result.maxHeartRate ? Math.round(result.maxHeartRate) : undefined,
    calories: result.calories || undefined,
    tss: result.tss || undefined,
    trimp: result.trimp || undefined,
    pace500m: result.pace || undefined,
    strokeRate: result.strokeRate ? Math.round(result.strokeRate) : undefined,
    streams: [],
    zones: null,
    splits,
    trend,
    isStrength: false,
    strengthExercises: [],
    strengthProgression: [],
    notes: result.comments || undefined,
  }
}

function parseConcept2Splits(value: Prisma.JsonValue | null | undefined): ActivitySplit[] {
  // Concept2 stores the raw `workout` object; splits live either at the top
  // level (array) or under a `splits` / `intervals` key.
  let arr = asObjectArray(value)
  if (arr.length === 0 && value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    arr = asObjectArray((record.splits ?? record.intervals) as Prisma.JsonValue)
  }
  return arr.map((split, i): ActivitySplit => {
    const distanceMeters = num(split.distance)
    const durationSec = num(split.time) !== undefined ? num(split.time)! / 10 : undefined
    const hr = split.heart_rate as Record<string, unknown> | undefined
    return {
      label: `${i + 1}`,
      distanceMeters,
      durationSec,
      pace500m:
        durationSec && distanceMeters && distanceMeters > 0
          ? Math.round((durationSec / distanceMeters) * 500 * 10) / 10
          : undefined,
      avgHR: hr ? num(hr.average) : undefined,
      strokeRate: num(split.stroke_rate),
    }
  })
}

async function buildConcept2Trend(
  current: { id: string; type: string; mappedType: string | null; date: Date },
  clientId: string,
  mode: ActivityMode
): Promise<ActivityTrend> {
  const rows = await prisma.concept2Result.findMany({
    where: {
      clientId,
      date: { gte: trendStartDate() },
      ...(current.mappedType ? { mappedType: current.mappedType } : { type: current.type }),
    },
    orderBy: { date: 'desc' },
    take: 30,
    select: {
      id: true,
      date: true,
      distance: true,
      avgHeartRate: true,
      tss: true,
      pace: true,
    },
  })

  const points: ActivityTrendPoint[] = rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    value: mode === 'row' ? r.pace || undefined : undefined,
    avgHR: r.avgHeartRate ? Math.round(r.avgHeartRate) : undefined,
    tss: r.tss || undefined,
    distanceKm: r.distance ? Math.round((r.distance / 1000) * 100) / 100 : undefined,
    isCurrent: r.id === current.id,
  }))

  return finalizeTrend(points, metricKeyForMode(mode), true)
}

async function buildPhoneRun(id: string, clientId: string): Promise<ActivityDetailData | null> {
  const session = await prisma.phoneRunSession.findUnique({ where: { id } })
  if (!session || session.clientId !== clientId) return null

  const samples = asObjectArray(session.samples)
  const streams: ActivityStreamPoint[] = downsample(
    samples
      .map((s): ActivityStreamPoint | null => {
        const elapsedSec = num(s.elapsedSec)
        if (elapsedSec === undefined) return null
        return {
          elapsedSec,
          hr: num(s.heartRate),
          speedKmh: speedKmhFromMps(num(s.speed)),
        }
      })
      .filter((p): p is ActivityStreamPoint => p !== null)
  )

  const splits = parsePhoneRunSplits(session.splits)
  const trend = await buildPhoneRunTrend(session, clientId)

  return {
    id: session.id,
    source: 'phonerun',
    name: 'Phone run',
    type: 'RUNNING',
    date: session.startedAt.toISOString(),
    deviceModel: session.deviceName || undefined,
    durationSec: session.durationSec,
    distanceMeters: session.distanceMeters,
    avgHR: session.avgHeartRate || undefined,
    maxHR: session.maxHeartRate || undefined,
    paceSecPerKm: session.avgPaceSecPerKm || undefined,
    speedKmh: speedKmhFromMps(session.avgSpeedMps),
    elevationGainM: session.elevationGainMeters || undefined,
    perceivedEffort: session.rpe || undefined,
    streams,
    zones: null,
    splits,
    trend,
    isStrength: false,
    strengthExercises: [],
    strengthProgression: [],
    notes: session.notes || undefined,
  }
}

function parsePhoneRunSplits(value: Prisma.JsonValue | null | undefined): ActivitySplit[] {
  const splits = asObjectArray(value)
  return splits.map((split, i): ActivitySplit => {
    const splitSec = num(split.splitSec)
    return {
      label: `${num(split.kilometer) ?? i + 1}`,
      distanceMeters: 1000,
      durationSec: splitSec,
      paceSecPerKm: splitSec,
      avgHR: num(split.avgHeartRate),
    }
  })
}

async function buildPhoneRunTrend(
  current: { id: string; startedAt: Date },
  clientId: string
): Promise<ActivityTrend> {
  const rows = await prisma.phoneRunSession.findMany({
    where: { clientId, startedAt: { gte: trendStartDate() } },
    orderBy: { startedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      startedAt: true,
      distanceMeters: true,
      avgHeartRate: true,
      avgPaceSecPerKm: true,
    },
  })

  const points: ActivityTrendPoint[] = rows.map((r) => ({
    id: r.id,
    date: r.startedAt.toISOString(),
    value: r.avgPaceSecPerKm || undefined,
    avgHR: r.avgHeartRate || undefined,
    distanceKm: Math.round((r.distanceMeters / 1000) * 100) / 100,
    isCurrent: r.id === current.id,
  }))

  return finalizeTrend(points, 'paceSecPerKm', true)
}

async function buildManual(
  id: string,
  clientId: string,
  athleteUserId: string | null
): Promise<ActivityDetailData | null> {
  if (!athleteUserId) return null
  const log = await prisma.workoutLog.findUnique({
    where: { id },
    include: {
      workout: { select: { name: true, type: true } },
      setLogs: {
        include: { exercise: { select: { name: true } } },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
      },
    },
  })
  if (!log || log.athleteId !== athleteUserId) return null

  const displayType = log.workout?.type || 'OTHER'
  const mode = classifyMode(displayType)
  const strengthExercises = groupSetLogs(log.setLogs)
  const isStrength = strengthExercises.length > 0 || displayType.toUpperCase() === 'STRENGTH'
  const strengthProgression = await buildExerciseProgression(clientId, strengthExercises)
  const trend = await buildManualTrend(log, athleteUserId, mode, isStrength)

  return {
    id: log.id,
    source: 'manual',
    name: log.workout?.name || 'Workout',
    type: displayType,
    date: (log.completedAt || log.createdAt).toISOString(),
    durationSec: log.duration ? log.duration * 60 : undefined,
    distanceMeters: log.distance ? Math.round(log.distance * 1000) : undefined,
    avgHR: log.avgHR || undefined,
    maxHR: log.maxHR || undefined,
    tss: log.tss || undefined,
    paceSecPerKm: parsePaceStringToSec(log.avgPace),
    elevationGainM: log.elevation || undefined,
    avgPower: log.avgPower || undefined,
    normalizedPower: log.normalizedPower || undefined,
    maxPower: log.maxPower || undefined,
    cadence: log.avgCadence || undefined,
    perceivedEffort: log.perceivedEffort || undefined,
    streams: [],
    zones: null,
    splits: [],
    trend,
    isStrength,
    strengthExercises,
    strengthProgression,
    notes: log.notes || undefined,
  }
}

/**
 * Fetch per-exercise estimated-1RM history (from the nightly-rolled-up
 * ProgressionTracking table, keyed by Client.id) for the given exercises.
 * Only exercises with at least two history points are returned. Exported so
 * other strength surfaces (e.g. the ad-hoc detail page) can reuse it.
 */
export async function buildExerciseProgression(
  clientId: string,
  exercises: Array<{ exerciseId: string; name: string }>
): Promise<ActivityExerciseProgression[]> {
  if (exercises.length === 0) return []

  const histories = await Promise.all(
    exercises.map(async (exercise) => {
      const { history, trend, progressionRate } = await getProgressionHistory(
        clientId,
        exercise.exerciseId,
        12
      )
      const points = history
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((h) => ({
          date: new Date(h.date).toISOString(),
          estimated1RM: Math.round(h.estimated1RM * 10) / 10,
          weight: h.weight,
          reps: h.reps,
        }))
      return { exercise, points, trend, progressionRate }
    })
  )

  return histories
    .filter((h) => h.points.length >= 2)
    .map((h): ActivityExerciseProgression => ({
      exerciseId: h.exercise.exerciseId,
      name: h.exercise.name,
      trend: h.trend,
      progressionRate: Math.round(h.progressionRate * 100) / 100,
      points: h.points,
    }))
}

async function buildAi(id: string, clientId: string): Promise<ActivityDetailData | null> {
  const wod = await prisma.aIGeneratedWOD.findUnique({ where: { id } })
  if (!wod || wod.clientId !== clientId) return null

  const trend = await buildAiTrend(wod, clientId)

  return {
    id: wod.id,
    source: 'ai',
    name: wod.title,
    type: wod.primarySport || 'STRENGTH',
    date: (wod.completedAt || wod.createdAt).toISOString(),
    durationSec: (wod.actualDuration || wod.requestedDuration) ? (wod.actualDuration || wod.requestedDuration) * 60 : undefined,
    perceivedEffort: wod.sessionRPE || undefined,
    streams: [],
    zones: null,
    splits: [],
    trend,
    isStrength: false,
    strengthExercises: [],
    strengthProgression: [],
    notes: wod.subtitle || undefined,
  }
}

async function buildAiTrend(
  current: { id: string; primarySport: string | null; completedAt: Date | null; createdAt: Date },
  clientId: string
): Promise<ActivityTrend> {
  const rows = await prisma.aIGeneratedWOD.findMany({
    where: {
      clientId,
      status: 'COMPLETED',
      completedAt: { gte: trendStartDate() },
      ...(current.primarySport ? { primarySport: current.primarySport } : {}),
    },
    orderBy: { completedAt: 'desc' },
    take: 30,
    select: { id: true, completedAt: true, createdAt: true, actualDuration: true, sessionRPE: true },
  })

  const points: ActivityTrendPoint[] = rows.map((r) => ({
    id: r.id,
    date: (r.completedAt || r.createdAt).toISOString(),
    avgHR: undefined,
    tss: r.sessionRPE || undefined,
    distanceKm: undefined,
    isCurrent: r.id === current.id,
  }))

  return finalizeTrend(points, null, false)
}

function groupSetLogs(
  setLogs: Array<{
    exerciseId: string
    setNumber: number
    weight: number
    repsCompleted: number
    rpe: number | null
    estimated1RM: number | null
    exercise: { name: string }
  }>
): ActivityStrengthExercise[] {
  const byExercise = new Map<string, ActivityStrengthExercise>()
  for (const set of setLogs) {
    let entry = byExercise.get(set.exerciseId)
    if (!entry) {
      entry = {
        exerciseId: set.exerciseId,
        name: set.exercise.name,
        sets: [],
        totalVolume: 0,
        topSetWeight: undefined,
        bestEstimated1RM: undefined,
      }
      byExercise.set(set.exerciseId, entry)
    }
    entry.sets.push({
      setNumber: set.setNumber,
      weight: set.weight,
      repsCompleted: set.repsCompleted,
      rpe: set.rpe ?? undefined,
      estimated1RM: set.estimated1RM ?? undefined,
    })
    entry.totalVolume += set.weight * set.repsCompleted
    entry.topSetWeight = Math.max(entry.topSetWeight ?? 0, set.weight)
    if (set.estimated1RM) {
      entry.bestEstimated1RM = Math.max(entry.bestEstimated1RM ?? 0, set.estimated1RM)
    }
  }
  return Array.from(byExercise.values()).map((e) => ({
    ...e,
    totalVolume: Math.round(e.totalVolume),
  }))
}

async function buildManualTrend(
  current: { id: string; workoutId: string; completedAt: Date | null; createdAt: Date },
  athleteUserId: string,
  mode: ActivityMode,
  isStrength: boolean
): Promise<ActivityTrend> {
  // For strength, cross-session trends come from the dedicated progression
  // component; here we surface a cardio HR/load trend for endurance logs.
  const workoutType = (await prisma.workout.findUnique({
    where: { id: current.workoutId },
    select: { type: true },
  }))?.type

  const rows = await prisma.workoutLog.findMany({
    where: {
      athleteId: athleteUserId,
      completedAt: { gte: trendStartDate() },
      ...(workoutType ? { workout: { type: workoutType } } : {}),
    },
    orderBy: { completedAt: 'desc' },
    take: 30,
    select: {
      id: true,
      completedAt: true,
      createdAt: true,
      distance: true,
      avgHR: true,
      tss: true,
      avgPace: true,
    },
  })

  const points: ActivityTrendPoint[] = rows.map((r) => ({
    id: r.id,
    date: (r.completedAt || r.createdAt).toISOString(),
    value: mode === 'run' ? parsePaceStringToSec(r.avgPace) : undefined,
    avgHR: r.avgHR || undefined,
    tss: r.tss || undefined,
    distanceKm: r.distance ? Math.round(r.distance * 100) / 100 : undefined,
    isCurrent: r.id === current.id,
  }))

  return finalizeTrend(points, isStrength ? null : metricKeyForMode(mode), mode !== 'ride')
}
