// lib/calculations/hr-zone-distribution.ts

/**
 * HR Zone Distribution Calculator
 *
 * Calculates time spent in each of 5 HR zones from:
 * - Second-by-second HR stream data (Strava/Garmin)
 * - Pre-calculated zone data (Garmin)
 * - Estimation from average HR (fallback)
 *
 * Used for:
 * - Per-activity zone breakdown
 * - Weekly/monthly/yearly zone aggregation
 * - Polarization tracking (80/20 rule)
 */

import { TrainingZone } from '@/types'

/**
 * Zone distribution result
 */
export interface ZoneDistribution {
  zone1Seconds: number
  zone2Seconds: number
  zone3Seconds: number
  zone4Seconds: number
  zone5Seconds: number
  totalTrackedSeconds: number
  source: 'STRAVA_STREAM' | 'GARMIN_ZONES' | 'GARMIN_REMAPPED' | 'ESTIMATED'
}

/**
 * Zone configuration snapshot for storage
 */
export interface ZoneConfigSnapshot {
  zone1: { hrMin: number; hrMax: number }
  zone2: { hrMin: number; hrMax: number }
  zone3: { hrMin: number; hrMax: number }
  zone4: { hrMin: number; hrMax: number }
  zone5: { hrMin: number; hrMax: number }
  maxHR: number
  calculatedAt: string
}

/**
 * Garmin zone seconds input format
 */
export interface GarminZoneSeconds {
  zone1?: number
  zone2?: number
  zone3?: number
  zone4?: number
  zone5?: number
}

/**
 * Determine which zone a heart rate value falls into
 *
 * @param hr - Heart rate in bpm
 * @param zones - Array of 5 training zones with hrMin/hrMax
 * @returns Zone number (1-5), or 0 if below zone 1, or 6 if above zone 5
 */
export function getZoneForHR(hr: number, zones: TrainingZone[]): number {
  // Handle edge cases
  if (!hr || hr <= 0 || zones.length === 0) {
    return 0
  }

  // Sort zones by zone number to ensure correct order
  const sortedZones = [...zones].sort((a, b) => a.zone - b.zone)

  // Check each zone
  for (const zone of sortedZones) {
    if (hr >= zone.hrMin && hr <= zone.hrMax) {
      return zone.zone
    }
  }

  // Below zone 1
  if (hr < sortedZones[0].hrMin) {
    return 1 // Count as zone 1 (recovery is still training)
  }

  // Above zone 5
  if (hr > sortedZones[sortedZones.length - 1].hrMax) {
    return 5 // Count as zone 5 (maximal)
  }

  // Fallback: find closest zone
  let closestZone = 1
  let minDistance = Infinity

  for (const zone of sortedZones) {
    const midpoint = (zone.hrMin + zone.hrMax) / 2
    const distance = Math.abs(hr - midpoint)
    if (distance < minDistance) {
      minDistance = distance
      closestZone = zone.zone
    }
  }

  return closestZone
}

/**
 * Calculate zone distribution from second-by-second HR stream data
 *
 * This is the most accurate method using raw HR stream from Strava/Garmin.
 * Each sample represents ~1 second of activity.
 *
 * @param hrSamples - Array of heart rate values (one per second)
 * @param zones - Athlete's 5 training zones
 * @returns Zone distribution in seconds
 */
export function calculateHRZoneDistribution(
  hrSamples: number[],
  zones: TrainingZone[]
): ZoneDistribution {
  const result: ZoneDistribution = {
    zone1Seconds: 0,
    zone2Seconds: 0,
    zone3Seconds: 0,
    zone4Seconds: 0,
    zone5Seconds: 0,
    totalTrackedSeconds: 0,
    source: 'STRAVA_STREAM',
  }

  if (!hrSamples || hrSamples.length === 0 || zones.length === 0) {
    return result
  }

  // Filter out invalid HR values (0, null, etc.)
  const validSamples = hrSamples.filter(hr => hr && hr > 30 && hr < 250)

  for (const hr of validSamples) {
    const zone = getZoneForHR(hr, zones)
    result.totalTrackedSeconds++

    switch (zone) {
      case 1:
        result.zone1Seconds++
        break
      case 2:
        result.zone2Seconds++
        break
      case 3:
        result.zone3Seconds++
        break
      case 4:
        result.zone4Seconds++
        break
      case 5:
        result.zone5Seconds++
        break
    }
  }

  return result
}

/**
 * Calculate zone distribution from Garmin pre-calculated zone data
 *
 * Garmin devices sometimes provide zone breakdown directly.
 * This is more accurate than estimation but less than raw stream.
 *
 * @param garminZones - Object with zone1-5 seconds from Garmin
 * @returns Zone distribution
 */
export function calculateFromGarminZones(
  garminZones: GarminZoneSeconds
): ZoneDistribution {
  const result: ZoneDistribution = {
    zone1Seconds: garminZones.zone1 ?? 0,
    zone2Seconds: garminZones.zone2 ?? 0,
    zone3Seconds: garminZones.zone3 ?? 0,
    zone4Seconds: garminZones.zone4 ?? 0,
    zone5Seconds: garminZones.zone5 ?? 0,
    totalTrackedSeconds: 0,
    source: 'GARMIN_ZONES',
  }

  result.totalTrackedSeconds =
    result.zone1Seconds +
    result.zone2Seconds +
    result.zone3Seconds +
    result.zone4Seconds +
    result.zone5Seconds

  return result
}

/**
 * Garmin's default zone boundaries as percentage of max HR
 */
const GARMIN_ZONE_PERCENTAGES = [
  { zone: 1, min: 0.50, max: 0.60 },
  { zone: 2, min: 0.60, max: 0.70 },
  { zone: 3, min: 0.70, max: 0.80 },
  { zone: 4, min: 0.80, max: 0.90 },
  { zone: 5, min: 0.90, max: 1.00 },
]

/**
 * Remap Garmin zone seconds to athlete's training zones
 *
 * Garmin defines zones as fixed percentages of max HR. Given the activity's
 * max HR from Garmin, we can derive the HR boundaries of each Garmin zone,
 * then redistribute the time into the athlete's own zones (from lactate testing)
 * based on how the HR ranges overlap.
 *
 * Assumes uniform HR distribution within each Garmin zone.
 *
 * @param garminZones - Seconds per Garmin zone
 * @param garminMaxHR - Max HR from the Garmin activity
 * @param athleteZones - Athlete's 5 training zones (from lactate test)
 * @returns Zone distribution remapped to athlete's zones
 */
export function remapGarminZonesToAthleteZones(
  garminZones: GarminZoneSeconds,
  garminMaxHR: number,
  athleteZones: TrainingZone[]
): ZoneDistribution {
  const result: ZoneDistribution = {
    zone1Seconds: 0,
    zone2Seconds: 0,
    zone3Seconds: 0,
    zone4Seconds: 0,
    zone5Seconds: 0,
    totalTrackedSeconds: 0,
    source: 'GARMIN_REMAPPED',
  }

  const sortedAthleteZones = [...athleteZones].sort((a, b) => a.zone - b.zone)

  for (const gZone of GARMIN_ZONE_PERCENTAGES) {
    const garminZoneKey = `zone${gZone.zone}` as keyof GarminZoneSeconds
    const secondsInGarminZone = garminZones[garminZoneKey] ?? 0

    if (secondsInGarminZone <= 0) continue

    const garminLow = garminMaxHR * gZone.min
    const garminHigh = garminMaxHR * gZone.max
    const garminWidth = garminHigh - garminLow

    if (garminWidth <= 0) continue

    // Calculate overlap between this Garmin zone and each athlete zone
    let totalOverlap = 0
    const overlaps: { zone: number; overlap: number }[] = []

    for (const aZone of sortedAthleteZones) {
      const overlapLow = Math.max(garminLow, aZone.hrMin)
      const overlapHigh = Math.min(garminHigh, aZone.hrMax)
      const overlap = Math.max(0, overlapHigh - overlapLow)

      if (overlap > 0) {
        overlaps.push({ zone: aZone.zone, overlap })
        totalOverlap += overlap
      }
    }

    // No overlap: Garmin zone falls entirely outside athlete zone boundaries
    // Assign all time to the closest athlete zone (mirrors getZoneForHR behavior)
    if (totalOverlap === 0) {
      const garminMid = (garminLow + garminHigh) / 2
      const closestZone = getZoneForHR(garminMid, athleteZones)
      addSecondsToZone(result, closestZone, secondsInGarminZone)
      continue
    }

    // Distribute time proportionally based on HR range overlap
    let distributed = 0
    for (let i = 0; i < overlaps.length; i++) {
      const { zone, overlap } = overlaps[i]
      // Last overlap gets the remainder to avoid rounding drift
      const seconds =
        i === overlaps.length - 1
          ? secondsInGarminZone - distributed
          : Math.round(secondsInGarminZone * (overlap / totalOverlap))
      addSecondsToZone(result, zone, seconds)
      distributed += seconds
    }
  }

  result.totalTrackedSeconds =
    result.zone1Seconds +
    result.zone2Seconds +
    result.zone3Seconds +
    result.zone4Seconds +
    result.zone5Seconds

  return result
}

/** Helper to add seconds to the correct zone bucket */
function addSecondsToZone(result: ZoneDistribution, zone: number, seconds: number): void {
  switch (zone) {
    case 1: result.zone1Seconds += seconds; break
    case 2: result.zone2Seconds += seconds; break
    case 3: result.zone3Seconds += seconds; break
    case 4: result.zone4Seconds += seconds; break
    case 5: result.zone5Seconds += seconds; break
  }
}

/**
 * Estimate zone distribution from average HR and duration
 *
 * Fallback method when no stream data is available.
 * Uses a bell curve distribution centered on the zone containing avgHR.
 *
 * This is the least accurate method but provides reasonable estimates
 * for historical activities without stream data.
 *
 * @param avgHR - Average heart rate for the activity
 * @param durationSeconds - Total activity duration in seconds
 * @param zones - Athlete's 5 training zones
 * @returns Estimated zone distribution
 */
export function estimateZoneFromAvgHR(
  avgHR: number,
  durationSeconds: number,
  zones: TrainingZone[]
): ZoneDistribution {
  const result: ZoneDistribution = {
    zone1Seconds: 0,
    zone2Seconds: 0,
    zone3Seconds: 0,
    zone4Seconds: 0,
    zone5Seconds: 0,
    totalTrackedSeconds: durationSeconds,
    source: 'ESTIMATED',
  }

  if (!avgHR || avgHR <= 0 || durationSeconds <= 0 || zones.length === 0) {
    return result
  }

  // Find the primary zone based on average HR
  const primaryZone = getZoneForHR(avgHR, zones)

  // Distribution patterns based on primary zone
  // These percentages are based on typical HR variability during endurance activities
  const distributions: Record<number, number[]> = {
    1: [0.70, 0.25, 0.05, 0.00, 0.00], // Recovery: mostly Z1
    2: [0.20, 0.60, 0.15, 0.05, 0.00], // Easy: mainly Z2
    3: [0.10, 0.25, 0.50, 0.12, 0.03], // Tempo: centered on Z3
    4: [0.05, 0.15, 0.25, 0.45, 0.10], // Threshold: mainly Z4
    5: [0.05, 0.10, 0.20, 0.30, 0.35], // VO2max: high intensity spread
  }

  const distribution = distributions[primaryZone] ?? distributions[3]

  result.zone1Seconds = Math.round(durationSeconds * distribution[0])
  result.zone2Seconds = Math.round(durationSeconds * distribution[1])
  result.zone3Seconds = Math.round(durationSeconds * distribution[2])
  result.zone4Seconds = Math.round(durationSeconds * distribution[3])
  result.zone5Seconds = Math.round(durationSeconds * distribution[4])

  // Adjust for rounding errors
  const total =
    result.zone1Seconds +
    result.zone2Seconds +
    result.zone3Seconds +
    result.zone4Seconds +
    result.zone5Seconds

  const diff = durationSeconds - total
  if (diff !== 0) {
    // Add/subtract difference to primary zone
    switch (primaryZone) {
      case 1:
        result.zone1Seconds += diff
        break
      case 2:
        result.zone2Seconds += diff
        break
      case 3:
        result.zone3Seconds += diff
        break
      case 4:
        result.zone4Seconds += diff
        break
      case 5:
        result.zone5Seconds += diff
        break
    }
  }

  return result
}

/**
 * Create a zone configuration snapshot for storage
 *
 * This captures the zone thresholds used at calculation time,
 * allowing for accurate historical comparisons even if zones change.
 *
 * @param zones - Current training zones
 * @param maxHR - Athlete's max heart rate
 * @returns Snapshot object for JSON storage
 */
export function createZoneConfigSnapshot(
  zones: TrainingZone[],
  maxHR: number
): ZoneConfigSnapshot {
  const sortedZones = [...zones].sort((a, b) => a.zone - b.zone)

  // Ensure we have 5 zones, filling in defaults if needed
  const getZone = (num: number) => {
    const zone = sortedZones.find(z => z.zone === num)
    if (zone) {
      return { hrMin: zone.hrMin, hrMax: zone.hrMax }
    }
    // Default fallback based on %HRmax
    const defaults: Record<number, { min: number; max: number }> = {
      1: { min: 0.50, max: 0.60 },
      2: { min: 0.60, max: 0.70 },
      3: { min: 0.70, max: 0.80 },
      4: { min: 0.80, max: 0.90 },
      5: { min: 0.90, max: 1.00 },
    }
    const def = defaults[num] ?? defaults[3]
    return {
      hrMin: Math.round(maxHR * def.min),
      hrMax: Math.round(maxHR * def.max),
    }
  }

  return {
    zone1: getZone(1),
    zone2: getZone(2),
    zone3: getZone(3),
    zone4: getZone(4),
    zone5: getZone(5),
    maxHR,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Calculate polarization ratio from zone distribution
 *
 * Polarization = percentage of time in Zone 1-2 vs Zone 3-5
 * Elite endurance athletes often follow 80/20 rule (80% easy, 20% hard)
 *
 * @param distribution - Zone distribution in seconds
 * @returns Polarization percentage (0-100), where higher = more polarized
 */
export function calculatePolarizationRatio(distribution: ZoneDistribution): number {
  if (distribution.totalTrackedSeconds === 0) {
    return 0
  }

  const easySeconds = distribution.zone1Seconds + distribution.zone2Seconds
  const ratio = (easySeconds / distribution.totalTrackedSeconds) * 100

  return Math.round(ratio * 10) / 10 // One decimal place
}

/**
 * Aggregate multiple zone distributions into a single total
 *
 * Used for weekly/monthly/yearly summaries
 *
 * @param distributions - Array of zone distributions to aggregate
 * @returns Combined zone distribution
 */
export function aggregateZoneDistributions(
  distributions: ZoneDistribution[]
): Omit<ZoneDistribution, 'source'> & { source: 'AGGREGATED' } {
  const result = {
    zone1Seconds: 0,
    zone2Seconds: 0,
    zone3Seconds: 0,
    zone4Seconds: 0,
    zone5Seconds: 0,
    totalTrackedSeconds: 0,
    source: 'AGGREGATED' as const,
  }

  for (const dist of distributions) {
    result.zone1Seconds += dist.zone1Seconds
    result.zone2Seconds += dist.zone2Seconds
    result.zone3Seconds += dist.zone3Seconds
    result.zone4Seconds += dist.zone4Seconds
    result.zone5Seconds += dist.zone5Seconds
    result.totalTrackedSeconds += dist.totalTrackedSeconds
  }

  return result
}

/**
 * Convert zone seconds to minutes (for storage/display)
 */
export function zoneSecondsToMinutes(distribution: ZoneDistribution): {
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
  zone4Minutes: number
  zone5Minutes: number
  totalTrackedMinutes: number
} {
  return {
    zone1Minutes: Math.round(distribution.zone1Seconds / 60),
    zone2Minutes: Math.round(distribution.zone2Seconds / 60),
    zone3Minutes: Math.round(distribution.zone3Seconds / 60),
    zone4Minutes: Math.round(distribution.zone4Seconds / 60),
    zone5Minutes: Math.round(distribution.zone5Seconds / 60),
    totalTrackedMinutes: Math.round(distribution.totalTrackedSeconds / 60),
  }
}

/**
 * Format zone distribution for display
 */
export function formatZoneDistribution(distribution: ZoneDistribution): {
  zone1: string
  zone2: string
  zone3: string
  zone4: string
  zone5: string
  total: string
  percentages: {
    zone1: number
    zone2: number
    zone3: number
    zone4: number
    zone5: number
  }
} {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const calcPercent = (seconds: number): number => {
    if (distribution.totalTrackedSeconds === 0) return 0
    return Math.round((seconds / distribution.totalTrackedSeconds) * 1000) / 10
  }

  return {
    zone1: formatTime(distribution.zone1Seconds),
    zone2: formatTime(distribution.zone2Seconds),
    zone3: formatTime(distribution.zone3Seconds),
    zone4: formatTime(distribution.zone4Seconds),
    zone5: formatTime(distribution.zone5Seconds),
    total: formatTime(distribution.totalTrackedSeconds),
    percentages: {
      zone1: calcPercent(distribution.zone1Seconds),
      zone2: calcPercent(distribution.zone2Seconds),
      zone3: calcPercent(distribution.zone3Seconds),
      zone4: calcPercent(distribution.zone4Seconds),
      zone5: calcPercent(distribution.zone5Seconds),
    },
  }
}

/**
 * Validate zone distribution data integrity
 */
export function validateZoneDistribution(distribution: ZoneDistribution): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for negative values
  if (distribution.zone1Seconds < 0) errors.push('Zone 1 seconds cannot be negative')
  if (distribution.zone2Seconds < 0) errors.push('Zone 2 seconds cannot be negative')
  if (distribution.zone3Seconds < 0) errors.push('Zone 3 seconds cannot be negative')
  if (distribution.zone4Seconds < 0) errors.push('Zone 4 seconds cannot be negative')
  if (distribution.zone5Seconds < 0) errors.push('Zone 5 seconds cannot be negative')
  if (distribution.totalTrackedSeconds < 0) errors.push('Total seconds cannot be negative')

  // Check sum matches total
  const sum =
    distribution.zone1Seconds +
    distribution.zone2Seconds +
    distribution.zone3Seconds +
    distribution.zone4Seconds +
    distribution.zone5Seconds

  if (Math.abs(sum - distribution.totalTrackedSeconds) > 1) {
    errors.push(`Zone sum (${sum}) does not match total (${distribution.totalTrackedSeconds})`)
  }

  // Check for unreasonable values (> 24 hours)
  if (distribution.totalTrackedSeconds > 86400) {
    errors.push('Total duration exceeds 24 hours - likely an error')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
