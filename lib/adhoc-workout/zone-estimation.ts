import { SportType, WorkoutIntensity } from '@prisma/client'
import type { TrainingZone } from '@/types'
import {
  estimateZoneFromAvgHR,
  type ZoneDistribution,
} from '@/lib/calculations/hr-zone-distribution'
import { SPORT_INTENSITY_DEFAULTS } from '@/lib/training/intensity-targets'
import type { ParsedWorkout, ParsedCardioSegment } from './types'

type ZoneSecondsKey =
  | 'zone1Seconds'
  | 'zone2Seconds'
  | 'zone3Seconds'
  | 'zone4Seconds'
  | 'zone5Seconds'

const INTENSITY_ZONE_DISTRIBUTIONS: Record<WorkoutIntensity, [number, number, number, number, number]> = {
  RECOVERY: [0.75, 0.25, 0, 0, 0],
  EASY: [0.3, 0.6, 0.1, 0, 0],
  MODERATE: [0.1, 0.25, 0.55, 0.1, 0],
  THRESHOLD: [0.05, 0.1, 0.2, 0.55, 0.1],
  INTERVAL: [0.05, 0.1, 0.15, 0.35, 0.35],
  MAX: [0.05, 0.05, 0.1, 0.25, 0.55],
}

function getFallbackSport(sport?: SportType | null): SportType {
  return sport ?? SportType.RUNNING
}

function createEmptyDistribution(totalTrackedSeconds: number): ZoneDistribution {
  return {
    zone1Seconds: 0,
    zone2Seconds: 0,
    zone3Seconds: 0,
    zone4Seconds: 0,
    zone5Seconds: 0,
    totalTrackedSeconds,
    source: 'ESTIMATED',
  }
}

function normalizeDistribution(
  totalTrackedSeconds: number,
  weights: [number, number, number, number, number]
): ZoneDistribution {
  const distribution = createEmptyDistribution(totalTrackedSeconds)
  const zones: ZoneSecondsKey[] = [
    'zone1Seconds',
    'zone2Seconds',
    'zone3Seconds',
    'zone4Seconds',
    'zone5Seconds',
  ]

  let assigned = 0
  zones.forEach((zoneKey, index) => {
    const seconds = Math.round(totalTrackedSeconds * weights[index])
    distribution[zoneKey] = seconds
    assigned += seconds
  })

  const remainder = totalTrackedSeconds - assigned
  if (remainder !== 0) {
    const maxIndex = weights.indexOf(Math.max(...weights))
    distribution[zones[maxIndex]] += remainder
  }

  return distribution
}

function estimateSegmentZone(segment: ParsedCardioSegment, workoutIntensity?: WorkoutIntensity): number | null {
  if (segment.zone && segment.zone >= 1 && segment.zone <= 5) {
    return segment.zone
  }

  switch (segment.type) {
    case 'WARMUP':
      return 2
    case 'COOLDOWN':
    case 'RECOVERY':
      return 1
    case 'STEADY':
    case 'DRILLS':
      return workoutIntensity === 'MODERATE' ? 3 : 2
    case 'INTERVAL':
    case 'HILL':
      return workoutIntensity === 'MAX' || workoutIntensity === 'INTERVAL' ? 5 : 4
    default:
      return null
  }
}

function buildDistributionFromSegments(
  segments: ParsedCardioSegment[] | undefined,
  totalTrackedSeconds: number,
  workoutIntensity: WorkoutIntensity | undefined,
  sport: SportType
): ZoneDistribution | null {
  if (!segments?.length) {
    return null
  }

  const distribution = createEmptyDistribution(totalTrackedSeconds)
  let assignedSeconds = 0

  for (const segment of segments) {
    if (!segment.duration || segment.duration <= 0) {
      continue
    }

    const zone = estimateSegmentZone(segment, workoutIntensity)
    if (!zone) {
      continue
    }

    const zoneKey = `zone${zone}Seconds` as ZoneSecondsKey
    distribution[zoneKey] += segment.duration
    assignedSeconds += segment.duration
  }

  if (assignedSeconds === 0) {
    return null
  }

  distribution.totalTrackedSeconds = Math.max(totalTrackedSeconds, assignedSeconds)

  if (assignedSeconds < totalTrackedSeconds) {
    const fallback = getDistributionFromIntensity(workoutIntensity, sport, totalTrackedSeconds - assignedSeconds)
    distribution.zone1Seconds += fallback.zone1Seconds
    distribution.zone2Seconds += fallback.zone2Seconds
    distribution.zone3Seconds += fallback.zone3Seconds
    distribution.zone4Seconds += fallback.zone4Seconds
    distribution.zone5Seconds += fallback.zone5Seconds
  }

  return distribution
}

function getDistributionFromIntensity(
  intensity: WorkoutIntensity | undefined,
  sport: SportType,
  totalTrackedSeconds: number
): ZoneDistribution {
  if (intensity) {
    return normalizeDistribution(totalTrackedSeconds, INTENSITY_ZONE_DISTRIBUTIONS[intensity])
  }

  const targets = SPORT_INTENSITY_DEFAULTS[sport] ?? SPORT_INTENSITY_DEFAULTS.RUNNING
  const easy = targets.easyPercent / 100
  const moderate = targets.moderatePercent / 100
  const hard = targets.hardPercent / 100

  return normalizeDistribution(totalTrackedSeconds, [
    easy * 0.35,
    easy * 0.65,
    moderate,
    hard * 0.7,
    hard * 0.3,
  ])
}

export function estimateAdHocZoneDistribution(
  parsed: ParsedWorkout | null | undefined,
  options?: {
    fallbackSport?: SportType | null
    athleteZones?: TrainingZone[]
  }
): ZoneDistribution | null {
  if (!parsed?.duration || parsed.duration <= 0) {
    return null
  }

  const totalTrackedSeconds = Math.round(parsed.duration * 60)
  const sport = getFallbackSport(parsed.sport ?? options?.fallbackSport)

  if (parsed.avgHeartRate && options?.athleteZones?.length) {
    return estimateZoneFromAvgHR(parsed.avgHeartRate, totalTrackedSeconds, options.athleteZones)
  }

  const segmentDistribution = buildDistributionFromSegments(
    parsed.cardioSegments,
    totalTrackedSeconds,
    parsed.intensity,
    sport
  )
  if (segmentDistribution) {
    return segmentDistribution
  }

  return getDistributionFromIntensity(parsed.intensity, sport, totalTrackedSeconds)
}
