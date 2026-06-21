import { Prisma } from '@prisma/client'
import { addDays, subDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getAthleteZones } from '@/lib/integrations/zone-distribution-service'
import type {
  EvaluationConfidence,
  NormalizedSensorSample,
  SegmentEvaluation,
  WorkoutEvaluationSummary,
  WorkoutFatigueSummary,
  WorkoutReadinessContext,
  WorkoutSource,
  WorkoutSourceLink,
  WorkoutZoneSummary,
} from './types'

const MAX_TIMELINE_POINTS = 900
const OVERLAP_THRESHOLD = 0.5
const START_MATCH_WINDOW_MS = 20 * 60 * 1000
const STRONG_START_MATCH_WINDOW_MS = 8 * 60 * 1000
const DEDUPE_BUCKET_MS = 20 * 60 * 1000
const DEFAULT_MAX_HR = 185

const STRUCTURED_TIMING_SOURCES = new Set<WorkoutSource>([
  'CARDIO_FOCUS',
  'HYBRID_FOCUS',
  'CONCEPT2_PM5_BLUETOOTH',
  'WATTBIKE_BLUETOOTH',
  'APP_GPS',
  'NATIVE_CAPTURE',
  'TEAM_CAPTURE',
])

type JsonRecord = Record<string, unknown>

interface SourceCandidate {
  id: string
  source: WorkoutSource
  label: string
  type: string
  startedAt: Date
  completedAt: Date | null
  priority: number
  confidence: EvaluationConfidence
  raw: JsonRecord
}

interface CandidateGroup {
  candidates: SourceCandidate[]
  startedAt: Date
  completedAt: Date | null
}

export interface RecalculateWorkoutEvaluationsInput {
  clientId: string
  startDate: Date
  endDate: Date
  deleteMissing?: boolean
}

export interface RecalculateWorkoutEvaluationsResult {
  rebuilt: number
  deleted: number
  evaluationIds: string[]
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
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

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000)
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function durationSeconds(candidate: Pick<SourceCandidate, 'startedAt' | 'completedAt'>): number {
  if (!candidate.completedAt) return 0
  return Math.max(0, Math.round((candidate.completedAt.getTime() - candidate.startedAt.getTime()) / 1000))
}

function activityEnd(startedAt: Date, durationSec?: number | null, elapsedSec?: number | null): Date | null {
  const seconds = durationSec ?? elapsedSec
  return seconds && seconds > 0 ? addSeconds(startedAt, seconds) : null
}

function overlapRatio(a: CandidateGroup, b: SourceCandidate): number {
  const aEnd = a.completedAt ?? addSeconds(a.startedAt, 60)
  const bEnd = b.completedAt ?? addSeconds(b.startedAt, 60)
  const overlapMs = Math.min(aEnd.getTime(), bEnd.getTime()) - Math.max(a.startedAt.getTime(), b.startedAt.getTime())
  if (overlapMs <= 0) return 0
  const aLength = Math.max(1, aEnd.getTime() - a.startedAt.getTime())
  const bLength = Math.max(1, bEnd.getTime() - b.startedAt.getTime())
  return overlapMs / Math.min(aLength, bLength)
}

function normalizedWorkoutType(type: string): string {
  const upper = type.toUpperCase()
  if (upper.includes('RUN')) return 'RUNNING'
  if (upper.includes('BIKE') || upper.includes('CYCL')) return 'CYCLING'
  if (upper.includes('SKI')) return 'SKIING'
  if (upper.includes('ROW')) return 'ROWING'
  if (upper.includes('HYBRID') || upper.includes('CROSSFIT') || upper.includes('HYROX')) return 'HYBRID'
  if (upper.includes('STRENGTH')) return 'STRENGTH'
  if (upper.includes('CARDIO')) return 'CARDIO'
  return upper
}

function typesCompatible(a: string, b: string): boolean {
  const left = normalizedWorkoutType(a)
  const right = normalizedWorkoutType(b)
  if (left === right) return true
  if (left === 'CARDIO' || right === 'CARDIO') return true
  if (left === 'HYBRID' || right === 'HYBRID') return true
  if ((left === 'ROWING' || left === 'SKIING') && right === 'CARDIO') return true
  if ((right === 'ROWING' || right === 'SKIING') && left === 'CARDIO') return true
  return false
}

function groupHasSameSource(group: CandidateGroup, candidate: SourceCandidate): boolean {
  return group.candidates.some((item) => item.source === candidate.source)
}

function groupHasCompatibleType(group: CandidateGroup, candidate: SourceCandidate): boolean {
  return group.candidates.some((item) => typesCompatible(item.type, candidate.type))
}

function groupHasStructuredTiming(group: CandidateGroup, candidate: SourceCandidate): boolean {
  return STRUCTURED_TIMING_SOURCES.has(candidate.source) ||
    group.candidates.some((item) => STRUCTURED_TIMING_SOURCES.has(item.source))
}

function shouldMerge(group: CandidateGroup, candidate: SourceCandidate): boolean {
  const overlap = overlapRatio(group, candidate)
  const startDiff = Math.abs(group.startedAt.getTime() - candidate.startedAt.getTime())
  const compatibleType = groupHasCompatibleType(group, candidate)

  if (groupHasSameSource(group, candidate) && overlap < OVERLAP_THRESHOLD) {
    return false
  }

  if (overlap >= OVERLAP_THRESHOLD && compatibleType) return true
  if (startDiff > START_MATCH_WINDOW_MS || !compatibleType) return false

  const hasOpenEnd = !group.completedAt || !candidate.completedAt
  if (hasOpenEnd) return true

  if (overlap > 0) return true

  return groupHasStructuredTiming(group, candidate) && startDiff <= STRONG_START_MATCH_WINDOW_MS
}

function buildGroups(candidates: SourceCandidate[]): CandidateGroup[] {
  const groups: CandidateGroup[] = []
  for (const candidate of [...candidates].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())) {
    const group = groups.find((item) => shouldMerge(item, candidate))
    if (!group) {
      groups.push({
        candidates: [candidate],
        startedAt: candidate.startedAt,
        completedAt: candidate.completedAt,
      })
      continue
    }

    group.candidates.push(candidate)
    if (candidate.startedAt < group.startedAt) group.startedAt = candidate.startedAt
    if (candidate.completedAt && (!group.completedAt || candidate.completedAt > group.completedAt)) {
      group.completedAt = candidate.completedAt
    }
  }

  return groups
}

function primaryCandidate(group: CandidateGroup): SourceCandidate {
  return [...group.candidates].sort((a, b) => b.priority - a.priority || a.startedAt.getTime() - b.startedAt.getTime())[0]
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

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : []
}

function normalizeOffsets(value: unknown, length: number): number[] {
  if (!Array.isArray(value)) return Array.from({ length }, (_, index) => index)
  return Array.from({ length }, (_, index) => asNumber(value[index]) ?? index)
}

function sourceSamples(candidate: SourceCandidate, groupStart: Date, maxHr: number, zones: { zone: number; hrMin: number; hrMax: number }[]): NormalizedSensorSample[] {
  const offsetFromGroup = Math.max(0, Math.round((candidate.startedAt.getTime() - groupStart.getTime()) / 1000))

  if (candidate.source === 'GARMIN') {
    const hrStream = asNumberArray(candidate.raw.hrStream)
    if (hrStream.length > 0) {
      const offsets = normalizeOffsets(candidate.raw.hrStreamOffsets, hrStream.length)
      return hrStream.map((heartRate, index) => withHrDerivedFields({
        timeSec: offsetFromGroup + offsets[index],
        heartRate,
      }, maxHr, zones))
    }
  }

  if (candidate.source === 'CONCEPT2_PM5_BLUETOOTH' || candidate.source === 'WATTBIKE_BLUETOOTH') {
    return asArray(candidate.raw.samples).map((item) => {
      const sample = item as JsonRecord
      return withHrDerivedFields({
        timeSec: offsetFromGroup + (asNumber(sample.elapsedSec) ?? asNumber(sample.timeSec) ?? 0),
        heartRate: asNumber(sample.heartRate),
        power: asNumber(sample.power),
        paceSecPer500m: asNumber(sample.pace500m),
        speedMps: asNumber(sample.speed),
        cadence: asNumber(sample.cadence),
        strokeRate: asNumber(sample.strokeRate),
        distanceMeters: asNumber(sample.distanceMeters),
        calories: asNumber(sample.calories),
      }, maxHr, zones)
    })
  }

  if (candidate.source === 'APP_GPS') {
    return asArray(candidate.raw.samples).map((item) => {
      const sample = item as JsonRecord
      return withHrDerivedFields({
        timeSec: offsetFromGroup + (asNumber(sample.elapsedSec) ?? asNumber(sample.timeSec) ?? 0),
        heartRate: asNumber(sample.heartRate),
        speedMps: asNumber(sample.speed) ?? asNumber(sample.segmentSpeedMps),
        distanceMeters: asNumber(sample.distanceMeters),
      }, maxHr, zones)
    })
  }

  if (candidate.source === 'CARDIO_FOCUS') {
    const segmentLogs = asArray(candidate.raw.segmentLogs)
    const samples: NormalizedSensorSample[] = []
    for (const segment of segmentLogs) {
      const item = segment as JsonRecord
      const startedAt = item.startedAt instanceof Date ? item.startedAt : null
      const duration = asNumber(item.actualDuration) ?? asNumber(item.plannedDuration) ?? 0
      const startOffset = startedAt
        ? Math.max(0, Math.round((startedAt.getTime() - groupStart.getTime()) / 1000))
        : offsetFromGroup
      const powerSamples = asNumberArray(item.powerSamples)
      const length = Math.max(duration, powerSamples.length)
      for (let index = 0; index < length; index++) {
        samples.push(withHrDerivedFields({
          timeSec: startOffset + index,
          heartRate: asNumber(item.actualAvgHR),
          power: powerSamples[index],
        }, maxHr, zones))
      }
    }
    return samples
  }

  if (candidate.source === 'NATIVE_CAPTURE' || candidate.source === 'TEAM_CAPTURE' || candidate.source === 'HR_BELT_BLUETOOTH') {
    return asArray(candidate.raw.samples).map((item) => {
      const sample = item as JsonRecord
      return withHrDerivedFields({
        timeSec: offsetFromGroup + (asNumber(sample.timeSec) ?? asNumber(sample.elapsedSec) ?? 0),
        heartRate: asNumber(sample.heartRate),
        power: asNumber(sample.power),
        paceSecPerKm: asNumber(sample.paceSecPerKm),
        paceSecPer500m: asNumber(sample.paceSecPer500m),
        speedMps: asNumber(sample.speedMps) ?? asNumber(sample.speed),
        cadence: asNumber(sample.cadence),
        strokeRate: asNumber(sample.strokeRate),
        distanceMeters: asNumber(sample.distanceMeters),
        calories: asNumber(sample.calories),
      }, maxHr, zones)
    })
  }

  return []
}

function mergeTimeline(group: CandidateGroup, maxHr: number, zones: { zone: number; hrMin: number; hrMax: number }[]): NormalizedSensorSample[] {
  const merged = new Map<number, NormalizedSensorSample>()
  const sources = [...group.candidates].sort((a, b) => b.priority - a.priority)

  for (const candidate of sources) {
    for (const sample of sourceSamples(candidate, group.startedAt, maxHr, zones)) {
      if (!Number.isFinite(sample.timeSec) || sample.timeSec < 0) continue
      const timeSec = Math.round(sample.timeSec)
      const existing = merged.get(timeSec) ?? { timeSec }
      merged.set(timeSec, {
        timeSec,
        heartRate: existing.heartRate ?? sample.heartRate,
        hrPercentMax: existing.hrPercentMax ?? sample.hrPercentMax,
        hrZone: existing.hrZone ?? sample.hrZone,
        power: existing.power ?? sample.power,
        powerZone: existing.powerZone ?? sample.powerZone,
        paceSecPerKm: existing.paceSecPerKm ?? sample.paceSecPerKm,
        paceSecPer500m: existing.paceSecPer500m ?? sample.paceSecPer500m,
        speedMps: existing.speedMps ?? sample.speedMps,
        cadence: existing.cadence ?? sample.cadence,
        strokeRate: existing.strokeRate ?? sample.strokeRate,
        distanceMeters: existing.distanceMeters ?? sample.distanceMeters,
        calories: existing.calories ?? sample.calories,
      })
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.timeSec - b.timeSec)
}

function downsampleTimeline(samples: NormalizedSensorSample[]): NormalizedSensorSample[] {
  if (samples.length <= MAX_TIMELINE_POINTS) return samples
  const bucketSize = Math.ceil(samples.length / MAX_TIMELINE_POINTS)
  const downsampled: NormalizedSensorSample[] = []

  for (let i = 0; i < samples.length; i += bucketSize) {
    const bucket = samples.slice(i, i + bucketSize)
    const first = bucket[0]
    downsampled.push({
      timeSec: first.timeSec,
      heartRate: round(avg(bucket.map((sample) => sample.heartRate))),
      hrPercentMax: round(avg(bucket.map((sample) => sample.hrPercentMax)), 1),
      hrZone: round(avg(bucket.map((sample) => sample.hrZone))),
      power: round(avg(bucket.map((sample) => sample.power))),
      powerZone: round(avg(bucket.map((sample) => sample.powerZone))),
      paceSecPerKm: round(avg(bucket.map((sample) => sample.paceSecPerKm))),
      paceSecPer500m: round(avg(bucket.map((sample) => sample.paceSecPer500m))),
      speedMps: round(avg(bucket.map((sample) => sample.speedMps)), 2),
      cadence: round(avg(bucket.map((sample) => sample.cadence)), 1),
      strokeRate: round(avg(bucket.map((sample) => sample.strokeRate)), 1),
      distanceMeters: round(max(bucket.map((sample) => sample.distanceMeters)), 1),
      calories: round(max(bucket.map((sample) => sample.calories))),
    })
  }

  return downsampled
}

function zoneSummaryFromTimeline(samples: NormalizedSensorSample[], fallback?: WorkoutZoneSummary): WorkoutZoneSummary {
  const summary: WorkoutZoneSummary = fallback ?? {
    zone1Seconds: 0,
    zone2Seconds: 0,
    zone3Seconds: 0,
    zone4Seconds: 0,
    zone5Seconds: 0,
    totalTrackedSeconds: 0,
    highIntensitySeconds: 0,
  }

  if (samples.some((sample) => sample.hrZone)) {
    const next: WorkoutZoneSummary = {
      zone1Seconds: 0,
      zone2Seconds: 0,
      zone3Seconds: 0,
      zone4Seconds: 0,
      zone5Seconds: 0,
      totalTrackedSeconds: 0,
      highIntensitySeconds: 0,
    }
    for (const sample of samples) {
      const zone = sample.hrZone
      if (!zone || zone < 1 || zone > 5) continue
      if (zone === 1) next.zone1Seconds++
      if (zone === 2) next.zone2Seconds++
      if (zone === 3) next.zone3Seconds++
      if (zone === 4) next.zone4Seconds++
      if (zone === 5) next.zone5Seconds++
      next.totalTrackedSeconds++
      if (zone >= 4) next.highIntensitySeconds++
    }
    return next
  }

  summary.highIntensitySeconds = summary.zone4Seconds + summary.zone5Seconds
  summary.totalTrackedSeconds =
    summary.zone1Seconds +
    summary.zone2Seconds +
    summary.zone3Seconds +
    summary.zone4Seconds +
    summary.zone5Seconds
  return summary
}

function garminZoneFallback(group: CandidateGroup): WorkoutZoneSummary | undefined {
  const garmin = group.candidates.find((candidate) => candidate.source === 'GARMIN')
  const distribution = garmin?.raw.zoneDistribution as JsonRecord | undefined
  if (distribution) {
    return {
      zone1Seconds: asNumber(distribution.zone1Seconds) ?? 0,
      zone2Seconds: asNumber(distribution.zone2Seconds) ?? 0,
      zone3Seconds: asNumber(distribution.zone3Seconds) ?? 0,
      zone4Seconds: asNumber(distribution.zone4Seconds) ?? 0,
      zone5Seconds: asNumber(distribution.zone5Seconds) ?? 0,
      totalTrackedSeconds: asNumber(distribution.totalTrackedSeconds) ?? 0,
      highIntensitySeconds: (asNumber(distribution.zone4Seconds) ?? 0) + (asNumber(distribution.zone5Seconds) ?? 0),
    }
  }

  const zones = garmin?.raw.hrZoneSeconds as JsonRecord | undefined
  if (!zones) return undefined
  return {
    zone1Seconds: asNumber(zones.zone1) ?? 0,
    zone2Seconds: asNumber(zones.zone2) ?? 0,
    zone3Seconds: asNumber(zones.zone3) ?? 0,
    zone4Seconds: asNumber(zones.zone4) ?? 0,
    zone5Seconds: asNumber(zones.zone5) ?? 0,
    totalTrackedSeconds: 0,
    highIntensitySeconds: 0,
  }
}

function sliceSamples(samples: NormalizedSensorSample[], startSec: number, endSec: number): NormalizedSensorSample[] {
  return samples.filter((sample) => sample.timeSec >= startSec && sample.timeSec <= endSec)
}

function normalizedPower(powerValues: number[]): number | undefined {
  if (powerValues.length < 30) return undefined
  const rolling: number[] = []
  let sum30 = 0
  for (let index = 0; index < powerValues.length; index++) {
    sum30 += powerValues[index]
    if (index >= 30) sum30 -= powerValues[index - 30]
    if (index >= 29) rolling.push(sum30 / 30)
  }
  const mean4 = avg(rolling.map((value) => value ** 4))
  return mean4 ? Math.round(mean4 ** 0.25) : undefined
}

function segmentActual(samples: NormalizedSensorSample[], durationSec?: number): SegmentEvaluation['actual'] {
  const zoneSummary = zoneSummaryFromTimeline(samples)
  const avgHr = round(avg(samples.map((sample) => sample.heartRate)))
  const maxHr = round(max(samples.map((sample) => sample.heartRate)))
  const powers = samples.map((sample) => sample.power).filter((value): value is number => typeof value === 'number')

  return {
    durationSec: durationSec ?? (samples.length > 0 ? samples[samples.length - 1].timeSec - samples[0].timeSec + 1 : undefined),
    avgHr,
    maxHr,
    avgHrPercentMax: round(avg(samples.map((sample) => sample.hrPercentMax)), 1),
    maxHrPercentMax: round(max(samples.map((sample) => sample.hrPercentMax)), 1),
    zoneSeconds: {
      1: zoneSummary.zone1Seconds,
      2: zoneSummary.zone2Seconds,
      3: zoneSummary.zone3Seconds,
      4: zoneSummary.zone4Seconds,
      5: zoneSummary.zone5Seconds,
    },
    avgPower: round(avg(powers)),
    maxPower: round(max(powers)),
    normalizedPower: normalizedPower(powers),
    avgPaceSecPerKm: round(avg(samples.map((sample) => sample.paceSecPerKm))),
    avgPaceSecPer500m: round(avg(samples.map((sample) => sample.paceSecPer500m))),
    avgSpeedMps: round(avg(samples.map((sample) => sample.speedMps)), 2),
    avgCadence: round(avg(samples.map((sample) => sample.cadence)), 1),
    avgStrokeRate: round(avg(samples.map((sample) => sample.strokeRate)), 1),
    calories: round(max(samples.map((sample) => sample.calories))),
  }
}

function complianceScore(segment: SegmentEvaluation): SegmentEvaluation['compliance'] {
  const plannedZone = segment.planned.hrZone
  const zoneSeconds = segment.actual.zoneSeconds
  const total = Object.values(zoneSeconds).reduce((acc, value) => acc + value, 0)
  const zoneHit = plannedZone && total > 0
    ? ((zoneSeconds[plannedZone as 1 | 2 | 3 | 4 | 5] ?? 0) / total) >= 0.45
    : null

  const powerHit = segment.planned.power && segment.actual.avgPower
    ? Math.abs(segment.actual.avgPower - segment.planned.power) / segment.planned.power <= 0.12
    : null
  const paceHit = segment.planned.paceSecPerKm && segment.actual.avgPaceSecPerKm
    ? Math.abs(segment.actual.avgPaceSecPerKm - segment.planned.paceSecPerKm) / segment.planned.paceSecPerKm <= 0.08
    : null
  const targetValues = [powerHit, paceHit].filter((value): value is boolean => value !== null)
  const targetHit = targetValues.length > 0 ? targetValues.every(Boolean) : null
  const scores = [zoneHit, targetHit].filter((value): value is boolean => value !== null)

  return {
    intensityHit: zoneHit,
    targetHit,
    score: scores.length === 0 ? 100 : Math.round((scores.filter(Boolean).length / scores.length) * 100),
  }
}

function buildCardioSegments(candidate: SourceCandidate, timeline: NormalizedSensorSample[], groupStart: Date): SegmentEvaluation[] {
  return asArray(candidate.raw.segmentLogs).map((item, index) => {
    const segment = item as JsonRecord
    const startedAt = segment.startedAt instanceof Date ? segment.startedAt : null
    const completedAt = segment.completedAt instanceof Date ? segment.completedAt : null
    const duration = asNumber(segment.actualDuration) ?? asNumber(segment.plannedDuration)
    const startSec = startedAt ? Math.max(0, Math.round((startedAt.getTime() - groupStart.getTime()) / 1000)) : index
    const endSec = completedAt
      ? Math.max(startSec, Math.round((completedAt.getTime() - groupStart.getTime()) / 1000))
      : startSec + (duration ?? 0)
    const actual = segmentActual(sliceSamples(timeline, startSec, endSec), duration)
    const evaluation: SegmentEvaluation = {
      segmentIndex: asNumber(segment.segmentIndex) ?? index,
      label: asString(segment.segmentType) ?? `Segment ${index + 1}`,
      startedAt: startedAt?.toISOString(),
      completedAt: completedAt?.toISOString(),
      planned: {
        durationSec: asNumber(segment.plannedDuration),
        distanceMeters: asNumber(segment.plannedDistance) ? asNumber(segment.plannedDistance)! * 1000 : undefined,
        hrZone: asNumber(segment.plannedZone),
        power: asNumber(segment.plannedPower),
        paceSecPerKm: asNumber(segment.plannedPace),
        calories: asNumber(segment.plannedCalories),
      },
      actual,
      compliance: { intensityHit: null, targetHit: null, score: 100 },
    }
    evaluation.compliance = complianceScore(evaluation)
    return evaluation
  })
}

function buildDetectedIntervalSegments(candidate: SourceCandidate, timeline: NormalizedSensorSample[]): SegmentEvaluation[] {
  return asArray(candidate.raw.detectedIntervals).map((item, index) => {
    const interval = item as JsonRecord
    const startSec = asNumber(interval.startSec) ?? 0
    const endSec = asNumber(interval.endSec) ?? startSec + (asNumber(interval.durationSec) ?? 0)
    const actual = segmentActual(sliceSamples(timeline, startSec, endSec), asNumber(interval.durationSec))
    const evaluation: SegmentEvaluation = {
      segmentIndex: asNumber(interval.index) ?? index + 1,
      label: `Interval ${index + 1}`,
      planned: {},
      actual,
      compliance: { intensityHit: null, targetHit: null, score: 100 },
    }
    evaluation.compliance = complianceScore(evaluation)
    return evaluation
  })
}

function buildTeamCaptureSegments(candidate: SourceCandidate, timeline: NormalizedSensorSample[]): SegmentEvaluation[] {
  const summary = candidate.raw.summary as JsonRecord | null | undefined
  return asArray(summary?.segments).map((item, index) => {
    const segment = item as JsonRecord
    const startSec = asNumber(segment.plannedStartSec) ?? asNumber(segment.startSec) ?? 0
    const endSec = asNumber(segment.plannedEndSec) ?? asNumber(segment.endSec) ?? startSec
    const duration = Math.max(0, endSec - startSec)
    const evaluation: SegmentEvaluation = {
      segmentIndex: asNumber(segment.segmentIndex) ?? index,
      label: asString(segment.label) ?? `Segment ${index + 1}`,
      planned: {
        durationSec: duration || undefined,
        calories: asNumber(segment.targetCalories),
        distanceMeters: asNumber(segment.targetDistanceMeters),
        power: asNumber(segment.targetPower),
        equipmentKey: asString(segment.equipmentKey),
        captureMethod: asString(segment.captureMethod),
      },
      actual: segmentActual(sliceSamples(timeline, startSec, endSec), duration || undefined),
      compliance: { intensityHit: null, targetHit: null, score: 100 },
    }
    evaluation.compliance = complianceScore(evaluation)
    return evaluation
  })
}

function buildLapSegments(candidate: SourceCandidate, timeline: NormalizedSensorSample[], groupStart: Date): SegmentEvaluation[] {
  return asArray(candidate.raw.laps).map((item, index) => {
    const lap = item as JsonRecord
    const startSec = asNumber(lap.startTimeInSeconds)
      ? Math.max(0, Math.round(asNumber(lap.startTimeInSeconds)! - groupStart.getTime() / 1000))
      : asNumber(lap.startSec) ?? asNumber(lap.startTime) ?? 0
    const duration = asNumber(lap.durationInSeconds) ?? asNumber(lap.elapsedDurationInSeconds) ?? asNumber(lap.duration)
    const endSec = startSec + (duration ?? 0)
    const actual = segmentActual(sliceSamples(timeline, startSec, endSec), duration)
    const evaluation: SegmentEvaluation = {
      segmentIndex: index + 1,
      label: `Lap ${index + 1}`,
      planned: {},
      actual,
      compliance: { intensityHit: null, targetHit: null, score: 100 },
    }
    evaluation.compliance = complianceScore(evaluation)
    return evaluation
  })
}

function buildWholeWorkoutSegment(group: CandidateGroup, timeline: NormalizedSensorSample[]): SegmentEvaluation {
  const duration = Math.max(0, Math.round(((group.completedAt ?? group.startedAt).getTime() - group.startedAt.getTime()) / 1000))
  const evaluation: SegmentEvaluation = {
    segmentIndex: 0,
    label: 'Whole workout',
    startedAt: group.startedAt.toISOString(),
    completedAt: group.completedAt?.toISOString(),
    planned: { durationSec: duration || undefined },
    actual: segmentActual(timeline, duration || undefined),
    compliance: { intensityHit: null, targetHit: null, score: 100 },
  }
  evaluation.compliance = complianceScore(evaluation)
  return evaluation
}

function buildSegments(group: CandidateGroup, timeline: NormalizedSensorSample[]): { plannedStructure: WorkoutEvaluationSummary['plannedStructure']; segments: SegmentEvaluation[] } {
  const cardio = group.candidates.find((candidate) => candidate.source === 'CARDIO_FOCUS' && asArray(candidate.raw.segmentLogs).length > 0)
  if (cardio) {
    return { plannedStructure: 'FOCUS_SEGMENTS', segments: buildCardioSegments(cardio, timeline, group.startedAt) }
  }

  const hybrid = group.candidates.find((candidate) => candidate.source === 'HYBRID_FOCUS')
  if (hybrid && asArray(hybrid.raw.roundLogs).length > 0) {
    const segments = asArray(hybrid.raw.roundLogs).map((item, index) => {
      const roundLog = item as JsonRecord
      const startedAt = roundLog.startedAt instanceof Date ? roundLog.startedAt : null
      const completedAt = roundLog.completedAt instanceof Date ? roundLog.completedAt : null
      const startSec = startedAt ? Math.max(0, Math.round((startedAt.getTime() - group.startedAt.getTime()) / 1000)) : index
      const endSec = completedAt ? Math.max(startSec, Math.round((completedAt.getTime() - group.startedAt.getTime()) / 1000)) : startSec + (asNumber(roundLog.duration) ?? 0)
      const actual = segmentActual(sliceSamples(timeline, startSec, endSec), asNumber(roundLog.duration))
      const evaluation: SegmentEvaluation = {
        segmentIndex: asNumber(roundLog.roundNumber) ?? index + 1,
        label: `Round ${asNumber(roundLog.roundNumber) ?? index + 1}`,
        startedAt: startedAt?.toISOString(),
        completedAt: completedAt?.toISOString(),
        planned: {},
        actual,
        compliance: { intensityHit: null, targetHit: null, score: 100 },
      }
      evaluation.compliance = complianceScore(evaluation)
      return evaluation
    })
    return { plannedStructure: 'HYBRID_ROUNDS', segments }
  }

  const teamCapture = group.candidates.find((candidate) => candidate.source === 'TEAM_CAPTURE')
  if (teamCapture && asArray((teamCapture.raw.summary as JsonRecord | null | undefined)?.segments).length > 0) {
    return { plannedStructure: 'TEAM_CAPTURE_SEGMENTS', segments: buildTeamCaptureSegments(teamCapture, timeline) }
  }

  const quick = group.candidates.find((candidate) =>
    (candidate.source === 'CONCEPT2_PM5_BLUETOOTH' || candidate.source === 'WATTBIKE_BLUETOOTH') &&
    asArray(candidate.raw.detectedIntervals).length > 0
  )
  if (quick) {
    return { plannedStructure: 'DETECTED_INTERVALS', segments: buildDetectedIntervalSegments(quick, timeline) }
  }

  const garmin = group.candidates.find((candidate) => candidate.source === 'GARMIN' && asArray(candidate.raw.laps).length > 0)
  if (garmin) {
    return { plannedStructure: 'GARMIN_LAPS', segments: buildLapSegments(garmin, timeline, group.startedAt) }
  }

  return { plannedStructure: 'WHOLE_WORKOUT', segments: [buildWholeWorkoutSegment(group, timeline)] }
}

function getSummaryValue(group: CandidateGroup, key: string): number | undefined {
  for (const candidate of [...group.candidates].sort((a, b) => b.priority - a.priority)) {
    const value = asNumber(candidate.raw[key])
    if (value !== undefined) return value
  }
  return undefined
}

function buildSummary(
  group: CandidateGroup,
  timeline: NormalizedSensorSample[],
  plannedStructure: WorkoutEvaluationSummary['plannedStructure'],
  maxHr: number
): WorkoutEvaluationSummary {
  const primary = primaryCandidate(group)
  const durationSec = durationSeconds(group) || getSummaryValue(group, 'durationSec') || getSummaryValue(group, 'duration') || 0
  const avgHr = round(avg(timeline.map((sample) => sample.heartRate))) ?? getSummaryValue(group, 'avgHr')
  const maxHrValue = round(max(timeline.map((sample) => sample.heartRate))) ?? getSummaryValue(group, 'maxHr')

  return {
    name: primary.label,
    type: primary.type,
    durationSec,
    distanceMeters: getSummaryValue(group, 'distanceMeters'),
    calories: getSummaryValue(group, 'calories'),
    avgHr,
    maxHr: maxHrValue,
    avgHrPercentMax: avgHr ? round((avgHr / maxHr) * 100, 1) : undefined,
    maxHrPercentMax: maxHrValue ? round((maxHrValue / maxHr) * 100, 1) : undefined,
    avgPower: round(avg(timeline.map((sample) => sample.power))) ?? getSummaryValue(group, 'avgPower'),
    maxPower: round(max(timeline.map((sample) => sample.power))) ?? getSummaryValue(group, 'maxPower'),
    normalizedPower: round(normalizedPower(timeline.map((sample) => sample.power).filter((value): value is number => typeof value === 'number'))) ?? getSummaryValue(group, 'normalizedPower'),
    avgPaceSecPerKm: round(avg(timeline.map((sample) => sample.paceSecPerKm))) ?? getSummaryValue(group, 'avgPaceSecPerKm'),
    avgPaceSecPer500m: round(avg(timeline.map((sample) => sample.paceSecPer500m))) ?? getSummaryValue(group, 'avgPaceSecPer500m'),
    avgSpeedMps: round(avg(timeline.map((sample) => sample.speedMps)), 2) ?? getSummaryValue(group, 'avgSpeedMps'),
    avgCadence: round(avg(timeline.map((sample) => sample.cadence)), 1) ?? getSummaryValue(group, 'avgCadence'),
    avgStrokeRate: round(avg(timeline.map((sample) => sample.strokeRate)), 1) ?? getSummaryValue(group, 'avgStrokeRate'),
    tss: getSummaryValue(group, 'tss'),
    trimp: getSummaryValue(group, 'trimp'),
    rpe: getSummaryValue(group, 'rpe'),
    plannedStructure,
    sourceBadges: Array.from(new Set(group.candidates.map((candidate) => candidate.source))),
  }
}

function buildFatigueSummary(segments: SegmentEvaluation[], zoneSummary: WorkoutZoneSummary): WorkoutFatigueSummary {
  const workSegments = segments.filter((segment) => (segment.actual.durationSec ?? 0) >= 20)
  const first = workSegments[0]
  const last = workSegments[workSegments.length - 1]
  const powerDropPct = first?.actual.avgPower && last?.actual.avgPower
    ? round(((first.actual.avgPower - last.actual.avgPower) / first.actual.avgPower) * 100, 1)
    : undefined
  const paceDropPct = first?.actual.avgPaceSecPerKm && last?.actual.avgPaceSecPerKm
    ? round(((last.actual.avgPaceSecPerKm - first.actual.avgPaceSecPerKm) / first.actual.avgPaceSecPerKm) * 100, 1)
    : undefined
  const hrDriftPct = first?.actual.avgHr && last?.actual.avgHr
    ? round(((last.actual.avgHr - first.actual.avgHr) / first.actual.avgHr) * 100, 1)
    : undefined

  const recoveryDrops: number[] = []
  for (let index = 0; index < segments.length - 1; index++) {
    const current = segments[index]
    const next = segments[index + 1]
    if (current.actual.maxHr && next.actual.avgHr) recoveryDrops.push(current.actual.maxHr - next.actual.avgHr)
  }

  const avgRecoveryHrDrop = round(avg(recoveryDrops), 1)
  let score = Math.min(100, Math.round((zoneSummary.highIntensitySeconds / 60) * 1.5))
  if (powerDropPct && powerDropPct > 5) score += Math.min(25, Math.round(powerDropPct))
  if (paceDropPct && paceDropPct > 3) score += Math.min(25, Math.round(paceDropPct * 2))
  if (hrDriftPct && hrDriftPct > 5) score += Math.min(20, Math.round(hrDriftPct * 2))
  if (avgRecoveryHrDrop !== undefined && avgRecoveryHrDrop < 15) score += 10
  score = Math.max(0, Math.min(100, score))

  const level: WorkoutFatigueSummary['level'] =
    score >= 75 ? 'VERY_HIGH' : score >= 50 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'LOW'

  const notes: string[] = []
  if (powerDropPct !== undefined && powerDropPct > 5) notes.push(`Power faded ${powerDropPct}% across work segments.`)
  if (paceDropPct !== undefined && paceDropPct > 3) notes.push(`Pace slowed ${paceDropPct}% across work segments.`)
  if (hrDriftPct !== undefined && hrDriftPct > 5) notes.push(`Heart rate drift rose ${hrDriftPct}%.`)
  if (avgRecoveryHrDrop !== undefined && avgRecoveryHrDrop < 15) notes.push('Heart-rate recovery was limited between efforts.')
  if (zoneSummary.highIntensitySeconds >= 20 * 60) notes.push('High-intensity zone time was substantial.')
  if (notes.length === 0) notes.push('No major fatigue marker detected from available data.')

  return {
    level,
    score,
    powerDropPct,
    paceDropPct,
    hrDriftPct,
    avgRecoveryHrDrop,
    highIntensitySeconds: zoneSummary.highIntensitySeconds,
    notes,
  }
}

function buildSourceLinks(group: CandidateGroup): WorkoutSourceLink[] {
  return group.candidates.map((candidate) => ({
    source: candidate.source,
    id: candidate.id,
    label: candidate.label,
    confidence: candidate.confidence,
    startedAt: candidate.startedAt.toISOString(),
    completedAt: candidate.completedAt?.toISOString(),
  }))
}

function groupConfidence(group: CandidateGroup, timeline: NormalizedSensorSample[], segments: SegmentEvaluation[]): EvaluationConfidence {
  const hasFocus = group.candidates.some((candidate) => candidate.source === 'CARDIO_FOCUS' || candidate.source === 'HYBRID_FOCUS' || candidate.source === 'NATIVE_CAPTURE' || candidate.source === 'TEAM_CAPTURE' || candidate.source === 'APP_GPS')
  const hasStream = timeline.length >= 30
  if (hasFocus && hasStream) return 'HIGH'
  if (hasStream || segments.length > 1 || group.candidates.length > 1) return 'MEDIUM'
  return 'LOW'
}

async function readinessContext(clientId: string, startedAt: Date): Promise<WorkoutReadinessContext | null> {
  const metric = await prisma.dailyMetrics.findFirst({
    where: {
      clientId,
      date: {
        gte: subDays(startOfDay(startedAt), 1),
        lte: startOfDay(startedAt),
      },
    },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      readinessScore: true,
      readinessLevel: true,
      sleepHours: true,
      sleepQuality: true,
      hrvRMSSD: true,
      restingHR: true,
      stress: true,
    },
  })

  if (!metric) return null
  return {
    date: metric.date.toISOString().slice(0, 10),
    readinessScore: metric.readinessScore,
    readinessLevel: metric.readinessLevel,
    sleepHours: metric.sleepHours,
    sleepQuality: metric.sleepQuality,
    hrvRMSSD: metric.hrvRMSSD,
    restingHR: metric.restingHR,
    stress: metric.stress,
  }
}

function sourceDedupeKey(clientId: string, group: CandidateGroup): string {
  const twentyMinuteBucket = Math.round(group.startedAt.getTime() / DEDUPE_BUCKET_MS)
  return `${clientId}:workout:${twentyMinuteBucket}`
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function upsertEvaluation(clientId: string, group: CandidateGroup): Promise<string> {
  const athleteZones = await getAthleteZones(clientId)
  const zones = athleteZones?.zones ?? []
  const maxHr = athleteZones?.maxHR ?? DEFAULT_MAX_HR
  const timeline = mergeTimeline(group, maxHr, zones)
  const zoneSummary = zoneSummaryFromTimeline(timeline, garminZoneFallback(group))
  const { plannedStructure, segments } = buildSegments(group, timeline)
  const summary = buildSummary(group, timeline, plannedStructure, maxHr)
  const fatigueSummary = buildFatigueSummary(segments, zoneSummary)
  const confidence = groupConfidence(group, timeline, segments)
  const primary = primaryCandidate(group)
  const readiness = await readinessContext(clientId, group.startedAt)
  const dedupeKey = sourceDedupeKey(clientId, group)

  const evaluation = await prisma.workoutEvaluation.upsert({
    where: { dedupeKey },
    update: {
      startedAt: group.startedAt,
      completedAt: group.completedAt,
      sourceLinks: toJson(buildSourceLinks(group)),
      summary: toJson(summary),
      timelinePreview: toJson(downsampleTimeline(timeline)),
      segmentEvaluations: toJson(segments),
      zoneSummary: toJson(zoneSummary),
      fatigueSummary: toJson(fatigueSummary),
      readinessContext: readiness ? toJson(readiness) : Prisma.DbNull,
      confidence,
      primarySource: primary.source,
      updatedAt: new Date(),
    },
    create: {
      clientId,
      startedAt: group.startedAt,
      completedAt: group.completedAt,
      dedupeKey,
      sourceLinks: toJson(buildSourceLinks(group)),
      summary: toJson(summary),
      timelinePreview: toJson(downsampleTimeline(timeline)),
      segmentEvaluations: toJson(segments),
      zoneSummary: toJson(zoneSummary),
      fatigueSummary: toJson(fatigueSummary),
      readinessContext: readiness ? toJson(readiness) : Prisma.DbNull,
      confidence,
      primarySource: primary.source,
    },
    select: { id: true },
  })

  return evaluation.id
}

function quickErgSource(machineType: string | null | undefined, source: string | null | undefined): WorkoutSource {
  if (source === 'BLUETOOTH_PM5' || machineType?.startsWith('CONCEPT2')) return 'CONCEPT2_PM5_BLUETOOTH'
  if (machineType === 'WATTBIKE') return 'WATTBIKE_BLUETOOTH'
  return 'CONCEPT2_PM5_BLUETOOTH'
}

function sensorCaptureSource(source: string): WorkoutSource {
  if (
    source === 'TEAM_CAPTURE' ||
    source === 'CONCEPT2_PM5_BLUETOOTH' ||
    source === 'WATTBIKE_BLUETOOTH' ||
    source === 'HR_BELT_BLUETOOTH' ||
    source === 'APP_GPS'
  ) {
    return source
  }
  return 'NATIVE_CAPTURE'
}

async function loadCandidates(clientId: string, startDate: Date, endDate: Date): Promise<SourceCandidate[]> {
  const [
    garminActivities,
    cardioLogs,
    hybridLogs,
    quickErgSessions,
    phoneRunSessions,
    concept2Results,
    manualLogs,
    sensorCaptures,
    adHocWorkouts,
  ] = await Promise.all([
    prisma.garminActivity.findMany({
      where: { clientId, startDate: { gte: startDate, lte: endDate } },
      include: { zoneDistribution: true },
    }),
    prisma.cardioSessionLog.findMany({
      where: { athleteId: clientId, status: 'COMPLETED', startedAt: { gte: startDate, lte: endDate } },
      include: {
        session: { select: { name: true, sport: true } },
        segmentLogs: { orderBy: { segmentIndex: 'asc' } },
      },
    }),
    prisma.hybridWorkoutLog.findMany({
      where: { athleteId: clientId, status: 'COMPLETED', startedAt: { gte: startDate, lte: endDate } },
      include: {
        workout: { select: { name: true, format: true } },
        roundLogs: { orderBy: { roundNumber: 'asc' } },
      },
    }),
    prisma.quickErgSession.findMany({
      where: { clientId, startedAt: { gte: startDate, lte: endDate } },
    }),
    prisma.phoneRunSession.findMany({
      where: { clientId, startedAt: { gte: startDate, lte: endDate } },
    }),
    prisma.concept2Result.findMany({
      where: { clientId, date: { gte: startDate, lte: endDate } },
    }),
    prisma.workoutLog.findMany({
      where: {
        completed: true,
        completedAt: { gte: startDate, lte: endDate },
        athlete: { athleteAccount: { clientId } },
      },
      include: { workout: { select: { name: true, type: true } } },
    }),
    prisma.workoutSensorCapture.findMany({
      where: { clientId, startedAt: { gte: startDate, lte: endDate } },
    }),
    prisma.adHocWorkout.findMany({
      where: { athleteId: clientId, status: 'CONFIRMED', workoutDate: { gte: startDate, lte: endDate } },
      include: { garminActivity: true },
    }),
  ])

  const candidates: SourceCandidate[] = []

  for (const activity of garminActivities) {
    const completedAt = activityEnd(activity.startDate, activity.duration, activity.elapsedTime)
    candidates.push({
      id: activity.id,
      source: 'GARMIN',
      label: activity.name ?? activity.type ?? 'Garmin activity',
      type: activity.mappedType ?? activity.type ?? 'OTHER',
      startedAt: activity.startDate,
      completedAt,
      priority: 60,
      confidence: activity.hrStream ? 'MEDIUM' : 'LOW',
      raw: {
        ...activity,
        durationSec: activity.duration ?? activity.elapsedTime ?? undefined,
        distanceMeters: activity.distance ?? undefined,
        avgHr: activity.averageHeartrate ?? undefined,
        maxHr: activity.maxHeartrate ?? undefined,
        avgPower: activity.averageWatts ?? undefined,
        maxPower: activity.maxWatts ?? undefined,
        normalizedPower: activity.normalizedPower ?? undefined,
      },
    })
  }

  for (const log of cardioLogs) {
    candidates.push({
      id: log.id,
      source: 'CARDIO_FOCUS',
      label: log.session.name,
      type: log.session.sport,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      priority: 100,
      confidence: 'HIGH',
      raw: {
        ...log,
        durationSec: log.actualDuration ?? undefined,
        distanceMeters: log.actualDistance ? log.actualDistance * 1000 : undefined,
        avgHr: log.avgHeartRate ?? undefined,
        maxHr: log.maxHeartRate ?? undefined,
        avgPower: log.avgPower ?? undefined,
        maxPower: log.maxPower ?? undefined,
        rpe: log.sessionRPE ?? undefined,
      },
    })
  }

  for (const log of hybridLogs) {
    candidates.push({
      id: log.id,
      source: 'HYBRID_FOCUS',
      label: log.workout.name,
      type: 'HYBRID',
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      priority: 95,
      confidence: 'HIGH',
      raw: {
        ...log,
        durationSec: log.totalTime ?? undefined,
        rpe: log.sessionRPE ?? undefined,
      },
    })
  }

  for (const session of quickErgSessions) {
    const source = quickErgSource(session.machineType, session.source)
    candidates.push({
      id: session.id,
      source,
      label: session.deviceName ?? session.machineType,
      type: session.machineType.includes('BIKE') || session.machineType === 'WATTBIKE' ? 'CYCLING' : session.machineType.includes('SKI') ? 'SKIING' : 'ROWING',
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      priority: source === 'WATTBIKE_BLUETOOTH' ? 88 : 86,
      confidence: 'HIGH',
      raw: {
        ...session,
        durationSec: session.durationSec,
        distanceMeters: session.distanceMeters ?? undefined,
        calories: session.calories ?? undefined,
        avgHr: session.avgHeartRate ?? undefined,
        maxHr: session.maxHeartRate ?? undefined,
        avgPower: session.avgPower ?? undefined,
        maxPower: session.maxPower ?? undefined,
        normalizedPower: session.normalizedPower ?? undefined,
        avgPaceSecPer500m: session.avgPace500m ?? undefined,
        avgCadence: session.avgCadence ?? undefined,
        avgStrokeRate: session.avgStrokeRate ?? undefined,
        rpe: session.rpe ?? undefined,
      },
    })
  }

  for (const session of phoneRunSessions) {
    candidates.push({
      id: session.id,
      source: 'APP_GPS',
      label: 'App GPS run',
      type: 'RUNNING',
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      priority: 84,
      confidence: 'HIGH',
      raw: {
        ...session,
        durationSec: session.durationSec,
        distanceMeters: session.distanceMeters,
        avgHr: session.avgHeartRate ?? undefined,
        maxHr: session.maxHeartRate ?? undefined,
        avgPaceSecPerKm: session.avgPaceSecPerKm ?? undefined,
        avgSpeedMps: session.avgSpeedMps ?? undefined,
        rpe: session.rpe ?? undefined,
      },
    })
  }

  for (const result of concept2Results) {
    const durationSec = result.time ? Math.round(result.time / 10) : undefined
    candidates.push({
      id: result.id,
      source: 'CONCEPT2_LOGBOOK',
      label: result.workoutType ? `Concept2 ${result.workoutType}` : 'Concept2 workout',
      type: result.mappedType ?? 'ROWING',
      startedAt: result.date,
      completedAt: durationSec ? addSeconds(result.date, durationSec) : null,
      priority: 76,
      confidence: 'MEDIUM',
      raw: {
        ...result,
        durationSec,
        distanceMeters: result.distance,
        calories: result.calories ?? undefined,
        avgHr: result.avgHeartRate ?? undefined,
        maxHr: result.maxHeartRate ?? undefined,
        avgPaceSecPer500m: result.pace ?? undefined,
        avgStrokeRate: result.strokeRate ?? undefined,
        tss: result.tss ?? undefined,
        trimp: result.trimp ?? undefined,
      },
    })
  }

  for (const log of manualLogs) {
    if (!log.completedAt) continue
    candidates.push({
      id: log.id,
      source: 'MANUAL',
      label: log.workout.name,
      type: log.workout.type,
      startedAt: log.completedAt,
      completedAt: log.duration ? addSeconds(log.completedAt, log.duration * 60) : null,
      priority: 30,
      confidence: 'LOW',
      raw: {
        ...log,
        durationSec: log.duration ? log.duration * 60 : undefined,
        distanceMeters: log.distance ? log.distance * 1000 : undefined,
        avgHr: log.avgHR ?? undefined,
        maxHr: log.maxHR ?? undefined,
        avgPower: log.avgPower ?? undefined,
        maxPower: log.maxPower ?? undefined,
        normalizedPower: log.normalizedPower ?? undefined,
        tss: log.tss ?? undefined,
        rpe: log.perceivedEffort ?? undefined,
      },
    })
  }

  for (const capture of sensorCaptures) {
    const source = sensorCaptureSource(capture.source)
    const summary = capture.summary as JsonRecord | null | undefined
    candidates.push({
      id: capture.id,
      source,
      label: asString(summary?.name) ?? (source === 'TEAM_CAPTURE' ? 'Team capture session' : 'Native sensor capture'),
      type: asString(summary?.type) ?? 'OTHER',
      startedAt: capture.startedAt,
      completedAt: capture.completedAt,
      priority: 90,
      confidence: 'HIGH',
      raw: {
        ...capture,
        samples: capture.samples,
        durationSec: Math.round((capture.completedAt.getTime() - capture.startedAt.getTime()) / 1000),
        rpe: capture.rpe ?? undefined,
      },
    })
  }

  for (const workout of adHocWorkouts) {
    candidates.push({
      id: workout.id,
      source: 'MANUAL',
      label: workout.workoutName ?? 'Ad-hoc workout',
      type: workout.parsedType ?? 'OTHER',
      startedAt: workout.workoutDate,
      completedAt: null,
      priority: workout.garminActivity ? 42 : 32,
      confidence: workout.garminActivity ? 'MEDIUM' : 'LOW',
      raw: {
        ...workout,
        parsedStructure: workout.parsedStructure,
      },
    })
  }

  return candidates
}

export async function recalculateWorkoutEvaluationsForClient(
  input: RecalculateWorkoutEvaluationsInput
): Promise<RecalculateWorkoutEvaluationsResult> {
  const startDate = startOfDay(input.startDate)
  const endDate = addDays(startOfDay(input.endDate), 1)
  const candidates = await loadCandidates(input.clientId, startDate, endDate)
  const groups = buildGroups(candidates)
  const evaluationIds: string[] = []
  const dedupeKeys: string[] = []

  for (const group of groups) {
    const id = await upsertEvaluation(input.clientId, group)
    evaluationIds.push(id)
    dedupeKeys.push(sourceDedupeKey(input.clientId, group))
  }

  let deleted = 0
  if (input.deleteMissing ?? true) {
    const deleteResult = await prisma.workoutEvaluation.deleteMany({
      where: {
        clientId: input.clientId,
        startedAt: { gte: startDate, lt: endDate },
        dedupeKey: {
          startsWith: `${input.clientId}:workout:`,
          ...(dedupeKeys.length > 0 ? { notIn: dedupeKeys } : {}),
        },
      },
    })
    deleted = deleteResult.count
  }

  return { rebuilt: evaluationIds.length, deleted, evaluationIds }
}

export async function refreshWorkoutEvaluationsAround(clientId: string, date: Date): Promise<void> {
  try {
    await recalculateWorkoutEvaluationsForClient({
      clientId,
      startDate: subDays(date, 1),
      endDate: addDays(date, 1),
      deleteMissing: true,
    })
  } catch (error) {
    logger.warn('Workout evaluation refresh failed', { clientId, date: date.toISOString() }, error)
  }
}

export const workoutEvaluationTestUtils = {
  buildGroups,
  buildFatigueSummary,
  sourceDedupeKey,
  downsampleTimeline,
  zoneSummaryFromTimeline,
}
