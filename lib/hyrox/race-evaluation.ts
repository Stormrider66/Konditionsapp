import type {
  NormalizedSensorSample,
  SegmentEvaluation,
  WorkoutFatigueSummary,
  WorkoutZoneSummary,
} from '@/lib/workout-evaluation/types'

export type HyroxRaceType = 'RACE' | 'SIMULATION'
export type HyroxTimingMode = 'WITHOUT_ROXZONE' | 'WITH_ROXZONE'
export type HyroxSegmentKind = 'RUN' | 'ROXZONE' | 'STATION' | 'EXTRA'

export interface HyroxStationDefinition {
  key: string
  performanceKey: string
  label: string
  distanceMeters?: number
}

export interface HyroxSegmentDefinition {
  sequence: number
  kind: HyroxSegmentKind
  label: string
  runIndex?: number
  stationIndex?: number
  stationKey?: string
  performanceKey?: string
  distanceMeters?: number
}

export interface GarminLapLike {
  [key: string]: unknown
}

export interface GarminHyroxActivityLike {
  id: string
  garminActivityId?: bigint | number | string | null
  name?: string | null
  type?: string | null
  startDate: Date
  duration?: number | null
  elapsedTime?: number | null
  distance?: number | null
  calories?: number | null
  averageHeartrate?: number | null
  maxHeartrate?: number | null
  laps?: unknown
  hrStream?: unknown
  hrStreamOffsets?: unknown
  hrZoneSeconds?: unknown
}

export interface HyroxEvaluationBuildInput {
  activity: GarminHyroxActivityLike
  roxzoneEnabled: boolean
  raceType: HyroxRaceType
  division?: string | null
  maxHr: number
  zones: { zone: number; hrMin: number; hrMax: number }[]
}

export interface HyroxPerformancePayload {
  hyroxStations: Record<string, number>
  hyroxRunSplits: number[]
  hyroxTotalTime: number
  roxzoneTime: number
  stationTime: number
  runningTime: number
}

export const HYROX_STATION_ORDER: HyroxStationDefinition[] = [
  { key: 'SKIERG_1K', performanceKey: 'skiErg', label: 'SkiErg', distanceMeters: 1000 },
  { key: 'SLED_PUSH', performanceKey: 'sledPush', label: 'Sled Push', distanceMeters: 50 },
  { key: 'SLED_PULL', performanceKey: 'sledPull', label: 'Sled Pull', distanceMeters: 50 },
  { key: 'BURPEE_BROAD_JUMP', performanceKey: 'burpeeBroadJump', label: 'Burpee Broad Jump', distanceMeters: 80 },
  { key: 'ROW_1K', performanceKey: 'rowing', label: 'Row', distanceMeters: 1000 },
  { key: 'FARMERS_CARRY', performanceKey: 'farmersCarry', label: "Farmer's Carry", distanceMeters: 200 },
  { key: 'SANDBAG_LUNGE', performanceKey: 'sandbagLunge', label: 'Sandbag Lunge', distanceMeters: 100 },
  { key: 'WALL_BALLS', performanceKey: 'wallBalls', label: 'Wall Balls' },
]

const MAX_TIMELINE_POINTS = 900
const EMPTY_ZONE_SECONDS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : []
}

function round(value: number | undefined, digits = 0): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function avg(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return undefined
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function max(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return valid.length > 0 ? Math.max(...valid) : undefined
}

function getHrZone(heartRate: number | undefined, zones: { zone: number; hrMin: number; hrMax: number }[]): number | undefined {
  if (heartRate === undefined) return undefined
  return zones.find((zone) => heartRate >= zone.hrMin && heartRate <= zone.hrMax)?.zone
}

function withHrDerivedFields(
  sample: NormalizedSensorSample,
  maxHr: number,
  zones: { zone: number; hrMin: number; hrMax: number }[]
): NormalizedSensorSample {
  if (sample.heartRate === undefined) return sample
  return {
    ...sample,
    hrPercentMax: round((sample.heartRate / maxHr) * 100, 1),
    hrZone: getHrZone(sample.heartRate, zones),
  }
}

function zoneSecondsFromSamples(samples: NormalizedSensorSample[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const zoneSeconds = { ...EMPTY_ZONE_SECONDS }
  for (const sample of samples) {
    const zone = sample.hrZone
    if (zone === 1 || zone === 2 || zone === 3 || zone === 4 || zone === 5) {
      zoneSeconds[zone] += 1
    }
  }
  return zoneSeconds
}

function segmentActualFromSamples(samples: NormalizedSensorSample[], durationSec?: number): SegmentEvaluation['actual'] {
  const zoneSeconds = zoneSecondsFromSamples(samples)
  return {
    durationSec,
    avgHr: round(avg(samples.map((sample) => sample.heartRate))),
    maxHr: round(max(samples.map((sample) => sample.heartRate))),
    avgHrPercentMax: round(avg(samples.map((sample) => sample.hrPercentMax)), 1),
    maxHrPercentMax: round(max(samples.map((sample) => sample.hrPercentMax)), 1),
    zoneSeconds,
    calories: round(max(samples.map((sample) => sample.calories))),
  }
}

function lapMetric(lap: GarminLapLike, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = asNumber(lap[key])
    if (value !== undefined) return value
  }
  return undefined
}

function segmentActualFromLap(lap: GarminLapLike, durationSec?: number): SegmentEvaluation['actual'] {
  return {
    durationSec,
    avgHr: lapMetric(lap, ['averageHeartRate', 'averageHeartrate', 'avgHeartRate', 'avgHr', 'averageHR']),
    maxHr: lapMetric(lap, ['maxHeartRate', 'maxHeartrate', 'maxHr', 'maxHR']),
    zoneSeconds: { ...EMPTY_ZONE_SECONDS },
    calories: lapMetric(lap, ['calories', 'calorie']),
  }
}

function sliceSamples(samples: NormalizedSensorSample[], startSec: number, endSec: number): NormalizedSensorSample[] {
  return samples.filter((sample) => sample.timeSec >= startSec && sample.timeSec <= endSec)
}

function normalizeOffsets(value: unknown, length: number): number[] {
  if (!Array.isArray(value)) return Array.from({ length }, (_, index) => index)
  return Array.from({ length }, (_, index) => asNumber(value[index]) ?? index)
}

function lapDuration(lap: GarminLapLike): number | undefined {
  return lapMetric(lap, [
    'durationInSeconds',
    'elapsedDurationInSeconds',
    'movingDurationInSeconds',
    'totalElapsedTimeInSeconds',
    'totalTimerTimeInSeconds',
    'duration',
    'elapsedTime',
  ])
}

function lapStartSec(lap: GarminLapLike, activityStart: Date, fallbackStartSec: number): number {
  const epochSeconds = lapMetric(lap, ['startTimeInSeconds', 'startTime'])
  if (epochSeconds !== undefined && epochSeconds > 1_000_000) {
    return Math.max(0, Math.round(epochSeconds - activityStart.getTime() / 1000))
  }

  return lapMetric(lap, ['startSec', 'elapsedStartSec', 'startOffsetInSeconds']) ?? fallbackStartSec
}

function averagePaceSecPerKm(distanceMeters: number | undefined, durationSec: number | undefined): number | undefined {
  if (!distanceMeters || !durationSec || distanceMeters <= 0) return undefined
  return round(durationSec / (distanceMeters / 1000))
}

function plannedForDefinition(definition: HyroxSegmentDefinition): SegmentEvaluation['planned'] {
  if (definition.kind === 'RUN') return { distanceMeters: 1000 }
  if (definition.kind === 'STATION') return { distanceMeters: definition.distanceMeters }
  return {}
}

function actualWithLapFallback(
  lap: GarminLapLike,
  samples: NormalizedSensorSample[],
  durationSec: number | undefined
): SegmentEvaluation['actual'] {
  const fromSamples = segmentActualFromSamples(samples, durationSec)
  const fromLap = segmentActualFromLap(lap, durationSec)
  return {
    ...fromSamples,
    avgHr: fromSamples.avgHr ?? fromLap.avgHr,
    maxHr: fromSamples.maxHr ?? fromLap.maxHr,
    calories: fromSamples.calories ?? fromLap.calories,
    avgPaceSecPerKm: averagePaceSecPerKm(lapMetric(lap, ['distanceInMeters', 'distanceMeters', 'distance']), durationSec),
  }
}

export function hyroxTimingMode(roxzoneEnabled: boolean): HyroxTimingMode {
  return roxzoneEnabled ? 'WITH_ROXZONE' : 'WITHOUT_ROXZONE'
}

export function buildHyroxSegmentDefinitions(roxzoneEnabled: boolean): HyroxSegmentDefinition[] {
  const definitions: HyroxSegmentDefinition[] = []
  for (let index = 0; index < HYROX_STATION_ORDER.length; index += 1) {
    const station = HYROX_STATION_ORDER[index]
    const stationIndex = index + 1
    definitions.push({
      sequence: definitions.length + 1,
      kind: 'RUN',
      label: `Run ${stationIndex}`,
      runIndex: stationIndex,
      distanceMeters: 1000,
    })

    if (roxzoneEnabled) {
      definitions.push({
        sequence: definitions.length + 1,
        kind: 'ROXZONE',
        label: `Roxzone ${stationIndex}`,
        stationIndex,
      })
    }

    definitions.push({
      sequence: definitions.length + 1,
      kind: 'STATION',
      label: station.label,
      stationIndex,
      stationKey: station.key,
      performanceKey: station.performanceKey,
      distanceMeters: station.distanceMeters,
    })
  }
  return definitions
}

export function expectedHyroxLapCount(roxzoneEnabled: boolean): number {
  return buildHyroxSegmentDefinitions(roxzoneEnabled).length
}

export function buildGarminHyroxTimeline(
  activity: Pick<GarminHyroxActivityLike, 'hrStream' | 'hrStreamOffsets'>,
  maxHr: number,
  zones: { zone: number; hrMin: number; hrMax: number }[]
): NormalizedSensorSample[] {
  const hrStream = asNumberArray(activity.hrStream)
  if (hrStream.length === 0) return []
  const offsets = normalizeOffsets(activity.hrStreamOffsets, hrStream.length)
  return hrStream.map((heartRate, index) => withHrDerivedFields({
    timeSec: Math.max(0, Math.round(offsets[index] ?? index)),
    heartRate,
  }, maxHr, zones))
}

export function buildHyroxSegmentsFromGarminLaps(input: {
  laps: unknown
  activityStart: Date
  timeline: NormalizedSensorSample[]
  roxzoneEnabled: boolean
}): SegmentEvaluation[] {
  const definitions = buildHyroxSegmentDefinitions(input.roxzoneEnabled)
  let fallbackStartSec = 0

  return asArray(input.laps).map((item, index) => {
    const lap = (item ?? {}) as GarminLapLike
    const definition = definitions[index] ?? {
      sequence: index + 1,
      kind: 'EXTRA' as const,
      label: `Extra lap ${index + 1 - definitions.length}`,
    }
    const startSec = lapStartSec(lap, input.activityStart, fallbackStartSec)
    const durationSec = lapDuration(lap) ?? 0
    const endSec = startSec + durationSec
    fallbackStartSec = endSec
    const samples = sliceSamples(input.timeline, startSec, endSec)

    const evaluation: SegmentEvaluation = {
      segmentIndex: index + 1,
      label: definition.label,
      planned: {
        ...plannedForDefinition(definition),
        captureMethod: definition.kind,
        equipmentKey: definition.stationKey,
      },
      actual: actualWithLapFallback(lap, samples, durationSec),
      compliance: {
        intensityHit: null,
        targetHit: null,
        score: index < definitions.length ? 100 : 0,
      },
    }

    return evaluation
  })
}

export function downsampleHyroxTimeline(samples: NormalizedSensorSample[]): NormalizedSensorSample[] {
  if (samples.length <= MAX_TIMELINE_POINTS) return samples
  const bucketSize = Math.ceil(samples.length / MAX_TIMELINE_POINTS)
  const result: NormalizedSensorSample[] = []

  for (let index = 0; index < samples.length; index += bucketSize) {
    const bucket = samples.slice(index, index + bucketSize)
    result.push({
      timeSec: bucket[0]?.timeSec ?? index,
      heartRate: round(avg(bucket.map((sample) => sample.heartRate))),
      hrPercentMax: round(avg(bucket.map((sample) => sample.hrPercentMax)), 1),
      hrZone: round(avg(bucket.map((sample) => sample.hrZone))),
      calories: round(max(bucket.map((sample) => sample.calories))),
    })
  }

  return result
}

export function zoneSummaryFromHyroxTimeline(samples: NormalizedSensorSample[]): WorkoutZoneSummary {
  const zoneSeconds = zoneSecondsFromSamples(samples)
  const totalTrackedSeconds = Object.values(zoneSeconds).reduce((sum, value) => sum + value, 0)
  return {
    zone1Seconds: zoneSeconds[1],
    zone2Seconds: zoneSeconds[2],
    zone3Seconds: zoneSeconds[3],
    zone4Seconds: zoneSeconds[4],
    zone5Seconds: zoneSeconds[5],
    totalTrackedSeconds,
    highIntensitySeconds: zoneSeconds[4] + zoneSeconds[5],
  }
}

function zoneSummaryFromGarminZones(value: unknown): WorkoutZoneSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const zone1Seconds = asNumber(record.zone1) ?? asNumber(record.zone1Seconds) ?? asNumber(record['1']) ?? 0
  const zone2Seconds = asNumber(record.zone2) ?? asNumber(record.zone2Seconds) ?? asNumber(record['2']) ?? 0
  const zone3Seconds = asNumber(record.zone3) ?? asNumber(record.zone3Seconds) ?? asNumber(record['3']) ?? 0
  const zone4Seconds = asNumber(record.zone4) ?? asNumber(record.zone4Seconds) ?? asNumber(record['4']) ?? 0
  const zone5Seconds = asNumber(record.zone5) ?? asNumber(record.zone5Seconds) ?? asNumber(record['5']) ?? 0
  const totalTrackedSeconds = zone1Seconds + zone2Seconds + zone3Seconds + zone4Seconds + zone5Seconds
  if (totalTrackedSeconds <= 0) return null

  return {
    zone1Seconds,
    zone2Seconds,
    zone3Seconds,
    zone4Seconds,
    zone5Seconds,
    totalTrackedSeconds,
    highIntensitySeconds: zone4Seconds + zone5Seconds,
  }
}

export function summarizeHyroxPerformance(segments: SegmentEvaluation[]): HyroxPerformancePayload {
  const definitions = buildHyroxSegmentDefinitions(true)
  const byIndex = new Map(definitions.map((definition) => [definition.sequence, definition]))
  const hyroxStations: Record<string, number> = {}
  const hyroxRunSplits: number[] = []
  let roxzoneTime = 0
  let stationTime = 0
  let runningTime = 0

  for (const segment of segments) {
    const definition = byIndex.get(segment.segmentIndex)
    const kind = asString(segment.planned.captureMethod) as HyroxSegmentKind | undefined
    const performanceKey = definitions.find((item) =>
      item.stationKey && item.stationKey === segment.planned.equipmentKey
    )?.performanceKey
    const duration = segment.actual.durationSec ?? segment.planned.durationSec ?? 0

    if ((kind ?? definition?.kind) === 'RUN') {
      hyroxRunSplits.push(duration)
      runningTime += duration
      continue
    }

    if ((kind ?? definition?.kind) === 'ROXZONE') {
      roxzoneTime += duration
      continue
    }

    if ((kind ?? definition?.kind) === 'STATION') {
      const key = performanceKey ?? HYROX_STATION_ORDER.find((station) => station.label === segment.label)?.performanceKey
      if (key) hyroxStations[key] = (hyroxStations[key] ?? 0) + duration
      stationTime += duration
    }
  }

  const hyroxTotalTime = runningTime + stationTime + roxzoneTime
  return {
    hyroxStations,
    hyroxRunSplits,
    hyroxTotalTime,
    roxzoneTime,
    stationTime,
    runningTime,
  }
}

export function buildHyroxFatigueSummary(
  segments: SegmentEvaluation[],
  zoneSummary: WorkoutZoneSummary
): WorkoutFatigueSummary {
  const runs = segments.filter((segment) => segment.planned.captureMethod === 'RUN')
  const firstRun = runs[0]?.actual.durationSec
  const lastRun = runs.at(-1)?.actual.durationSec
  const paceDropPct = firstRun && lastRun && firstRun > 0
    ? round(((lastRun - firstRun) / firstRun) * 100, 1)
    : undefined

  const highIntensityMinutes = zoneSummary.highIntensitySeconds / 60
  const score = Math.min(100, Math.max(0, Math.round(highIntensityMinutes * 2 + Math.max(0, paceDropPct ?? 0))))
  const level = score >= 75 ? 'VERY_HIGH' : score >= 50 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'LOW'
  const notes: string[] = []

  if (paceDropPct !== undefined && paceDropPct > 8) {
    notes.push(`Run split fade ${paceDropPct}% from first to final run.`)
  }
  if (zoneSummary.highIntensitySeconds > 0) {
    notes.push(`${Math.round(highIntensityMinutes)} min in HR zone 4-5.`)
  }

  return {
    level,
    score,
    paceDropPct,
    highIntensitySeconds: zoneSummary.highIntensitySeconds,
    notes,
  }
}

export function buildHyroxEvaluationPayload(input: HyroxEvaluationBuildInput) {
  const timeline = buildGarminHyroxTimeline(input.activity, input.maxHr, input.zones)
  const segments = buildHyroxSegmentsFromGarminLaps({
    laps: input.activity.laps,
    activityStart: input.activity.startDate,
    timeline,
    roxzoneEnabled: input.roxzoneEnabled,
  })
  const zoneSummary = timeline.length > 0
    ? zoneSummaryFromHyroxTimeline(timeline)
    : zoneSummaryFromGarminZones(input.activity.hrZoneSeconds) ?? zoneSummaryFromHyroxTimeline(timeline)
  const performance = summarizeHyroxPerformance(segments)
  const fatigueSummary = buildHyroxFatigueSummary(segments, zoneSummary)
  const expectedLapCount = expectedHyroxLapCount(input.roxzoneEnabled)
  const lapCount = asArray(input.activity.laps).length
  const completedAt = new Date(input.activity.startDate.getTime() + (input.activity.elapsedTime ?? input.activity.duration ?? performance.hyroxTotalTime) * 1000)
  const summary = {
    name: input.activity.name || `HYROX ${input.raceType === 'RACE' ? 'Race' : 'Simulation'}`,
    type: 'HYROX',
    durationSec: input.activity.elapsedTime ?? input.activity.duration ?? performance.hyroxTotalTime,
    distanceMeters: input.activity.distance ?? undefined,
    calories: input.activity.calories ?? undefined,
    avgHr: input.activity.averageHeartrate ? round(input.activity.averageHeartrate) : round(avg(timeline.map((sample) => sample.heartRate))),
    maxHr: input.activity.maxHeartrate ? round(input.activity.maxHeartrate) : round(max(timeline.map((sample) => sample.heartRate))),
    plannedStructure: 'GARMIN_LAPS',
    sourceBadges: ['GARMIN'],
    hyrox: {
      status: 'DRAFT',
      mode: hyroxTimingMode(input.roxzoneEnabled),
      segmentOrder: buildHyroxSegmentDefinitions(input.roxzoneEnabled),
      expectedLapCount,
      actualLapCount: lapCount,
      roxzoneEnabled: input.roxzoneEnabled,
      division: input.division ?? null,
      raceType: input.raceType,
      sourceGarminActivityId: input.activity.id,
      sourceGarminActivityExternalId: input.activity.garminActivityId?.toString() ?? null,
      lapCountStatus: lapCount === expectedLapCount ? 'MATCH' : lapCount < expectedLapCount ? 'MISSING_LAPS' : 'EXTRA_LAPS',
      performance,
    },
  }

  return {
    startedAt: input.activity.startDate,
    completedAt,
    summary,
    timelinePreview: downsampleHyroxTimeline(timeline),
    segmentEvaluations: segments,
    zoneSummary,
    fatigueSummary,
    performance,
  }
}

export function normalizeHyroxSegmentsForReview(segments: SegmentEvaluation[]): SegmentEvaluation[] {
  return segments.map((segment, index) => ({
    ...segment,
    segmentIndex: index + 1,
    label: segment.label || `Segment ${index + 1}`,
    planned: segment.planned ?? {},
    actual: {
      ...segment.actual,
      durationSec: segment.actual?.durationSec ?? segment.planned?.durationSec ?? 0,
      zoneSeconds: segment.actual?.zoneSeconds ?? { ...EMPTY_ZONE_SECONDS },
    },
    compliance: segment.compliance ?? { intensityHit: null, targetHit: null, score: 100 },
  }))
}
