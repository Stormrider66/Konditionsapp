// lib/program-generator/zone-calculator.ts
// Calculate training paces and powers from test results

import { TrainingZone, Test, TestType } from '@/types'

export interface ZonePaces {
  zone1: string // e.g., "6:30/km"
  zone2: string
  zone3: string
  zone4: string
  zone5: string
}

export interface ZonePowers {
  zone1: number // watts
  zone2: number
  zone3: number
  zone4: number
  zone5: number
}

/**
 * Convert speed (km/h) to pace (min/km)
 */
export function speedToPace(speedKmh: number): string {
  const minutesPerKm = 60 / speedKmh
  const minutes = Math.floor(minutesPerKm)
  const seconds = Math.round((minutesPerKm - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`
}

/**
 * Convert pace (min/km) to speed (km/h)
 */
export function paceToSpeed(pace: string): number {
  const match = pace.match(/(\d+):(\d+)/)
  if (!match) return 0
  const minutes = parseInt(match[1])
  const seconds = parseInt(match[2])
  const totalMinutes = minutes + seconds / 60
  return 60 / totalMinutes
}

/**
 * Calculate training paces for running from training zones
 */
export function calculateZonePaces(trainingZones: TrainingZone[]): ZonePaces {
  const zone1 = trainingZones.find((z) => z.zone === 1)
  const zone2 = trainingZones.find((z) => z.zone === 2)
  const zone3 = trainingZones.find((z) => z.zone === 3)
  const zone4 = trainingZones.find((z) => z.zone === 4)
  const zone5 = trainingZones.find((z) => z.zone === 5)

  // Use average speed for each zone and convert to pace
  return {
    zone1: speedToPace((zone1?.speedMin || 0 + zone1?.speedMax || 0) / 2),
    zone2: speedToPace((zone2?.speedMin || 0 + zone2?.speedMax || 0) / 2),
    zone3: speedToPace((zone3?.speedMin || 0 + zone3?.speedMax || 0) / 2),
    zone4: speedToPace((zone4?.speedMin || 0 + zone4?.speedMax || 0) / 2),
    zone5: speedToPace((zone5?.speedMin || 0 + zone5?.speedMax || 0) / 2),
  }
}

/**
 * Calculate training powers for cycling from training zones
 */
export function calculateZonePowers(trainingZones: TrainingZone[]): ZonePowers {
  const zone1 = trainingZones.find((z) => z.zone === 1)
  const zone2 = trainingZones.find((z) => z.zone === 2)
  const zone3 = trainingZones.find((z) => z.zone === 3)
  const zone4 = trainingZones.find((z) => z.zone === 4)
  const zone5 = trainingZones.find((z) => z.zone === 5)

  // Use average power for each zone
  return {
    zone1: Math.round(((zone1?.powerMin || 0) + (zone1?.powerMax || 0)) / 2),
    zone2: Math.round(((zone2?.powerMin || 0) + (zone2?.powerMax || 0)) / 2),
    zone3: Math.round(((zone3?.powerMin || 0) + (zone3?.powerMax || 0)) / 2),
    zone4: Math.round(((zone4?.powerMin || 0) + (zone4?.powerMax || 0)) / 2),
    zone5: Math.round(((zone5?.powerMin || 0) + (zone5?.powerMax || 0)) / 2),
  }
}

/**
 * Get zone pace/power by zone number
 */
export function getZonePace(zones: ZonePaces, zoneNumber: number): string {
  switch (zoneNumber) {
    case 1:
      return zones.zone1
    case 2:
      return zones.zone2
    case 3:
      return zones.zone3
    case 4:
      return zones.zone4
    case 5:
      return zones.zone5
    default:
      return zones.zone2 // Default to easy pace
  }
}

export function getZonePower(zones: ZonePowers, zoneNumber: number): number {
  switch (zoneNumber) {
    case 1:
      return zones.zone1
    case 2:
      return zones.zone2
    case 3:
      return zones.zone3
    case 4:
      return zones.zone4
    case 5:
      return zones.zone5
    default:
      return zones.zone2 // Default to easy power
  }
}

/**
 * Get HR range for a zone
 */
export function getZoneHR(trainingZones: TrainingZone[], zoneNumber: number): string {
  const zone = trainingZones.find((z) => z.zone === zoneNumber)
  if (!zone) return ''
  return `${zone.hrMin}-${zone.hrMax} slag/min`
}

/**
 * Calculate marathon race pace from test results
 * Typically around Zone 3-4 boundary (lactate threshold)
 */
export function calculateMarathonPace(test: Test): string {
  if (!test.anaerobicThreshold || !test.trainingZones) {
    return '5:00/km' // Fallback
  }

  // Marathon pace is typically 85-90% of threshold pace
  const thresholdSpeed = test.anaerobicThreshold.value // km/h
  const marathonSpeed = thresholdSpeed * 0.87 // 87% of threshold

  return speedToPace(marathonSpeed)
}

/**
 * Calculate half marathon race pace
 * Typically at threshold pace
 */
export function calculateHalfMarathonPace(test: Test): string {
  if (!test.anaerobicThreshold) {
    return '4:45/km' // Fallback
  }

  const thresholdSpeed = test.anaerobicThreshold.value
  return speedToPace(thresholdSpeed)
}

/**
 * Calculate 10K race pace
 * Typically slightly faster than threshold
 */
export function calculate10KPace(test: Test): string {
  if (!test.anaerobicThreshold) {
    return '4:30/km' // Fallback
  }

  const thresholdSpeed = test.anaerobicThreshold.value
  const race10kSpeed = thresholdSpeed * 1.03 // 3% faster
  return speedToPace(race10kSpeed)
}

/**
 * Calculate 5K race pace
 * Typically at Zone 5 (VO2max pace)
 */
export function calculate5KPace(test: Test): string {
  if (!test.anaerobicThreshold) {
    return '4:15/km' // Fallback
  }

  const thresholdSpeed = test.anaerobicThreshold.value
  const race5kSpeed = thresholdSpeed * 1.08 // 8% faster
  return speedToPace(race5kSpeed)
}

/**
 * Get goal pace based on race type
 */
export function getGoalPace(test: Test, goalType: string): string {
  switch (goalType.toLowerCase()) {
    case 'marathon':
      return calculateMarathonPace(test)
    case 'half-marathon':
    case 'halfmarathon':
      return calculateHalfMarathonPace(test)
    case '10k':
      return calculate10KPace(test)
    case '5k':
      return calculate5KPace(test)
    default:
      return calculateMarathonPace(test)
  }
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

/**
 * Calculate distance from duration and pace
 */
export function calculateDistance(durationMinutes: number, pace: string): number {
  const speed = paceToSpeed(pace)
  return (speed * durationMinutes) / 60 // km
}
