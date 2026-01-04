/**
 * Concept2 Pace/Power Conversion
 *
 * Converts between power (Watts) and pace (seconds per 500m) for Concept2 ergometers.
 * Formula: Watts = 2.80 / (pace/500)³
 *
 * This relationship is cubic - meaning:
 * - A 10% increase in pace requires ~33% more power (1.10³ ≈ 1.33)
 * - Small pace improvements require significant power increases
 *
 * Reference: Concept2 PM5 calculations
 */

import { CONCEPT2_PACE_CONSTANT, VALIDATION_THRESHOLDS } from '../constants'
import type { PacePowerConversion } from '../types'

/**
 * Convert pace (seconds per 500m) to power (Watts)
 *
 * Formula: Watts = 2.80 / (pace/500)³
 *
 * @param paceSeconds - Pace in seconds per 500m (e.g., 105 for 1:45/500m)
 * @returns Power in Watts
 *
 * @example
 * paceToWatts(90)   // 1:30/500m → ~385 watts
 * paceToWatts(105)  // 1:45/500m → ~242 watts
 * paceToWatts(120)  // 2:00/500m → ~162 watts
 */
export function paceToWatts(paceSeconds: number): number {
  if (paceSeconds <= 0) {
    throw new Error('Pace must be positive')
  }

  if (paceSeconds < VALIDATION_THRESHOLDS.minPace) {
    console.warn(`Pace ${paceSeconds}s/500m is unusually fast (< ${VALIDATION_THRESHOLDS.minPace}s)`)
  }

  if (paceSeconds > VALIDATION_THRESHOLDS.maxPace) {
    console.warn(`Pace ${paceSeconds}s/500m is unusually slow (> ${VALIDATION_THRESHOLDS.maxPace}s)`)
  }

  // Convert pace to pace per meter, then apply formula
  const pacePerMeter = paceSeconds / 500
  const watts = CONCEPT2_PACE_CONSTANT / Math.pow(pacePerMeter, 3)

  return Math.round(watts * 10) / 10 // Round to 1 decimal
}

/**
 * Convert power (Watts) to pace (seconds per 500m)
 *
 * Formula: pace = 500 × (2.80 / watts)^(1/3)
 *
 * @param watts - Power in Watts
 * @returns Pace in seconds per 500m
 *
 * @example
 * wattsToPace(385)  // ~90s (1:30/500m)
 * wattsToPace(242)  // ~105s (1:45/500m)
 * wattsToPace(162)  // ~120s (2:00/500m)
 */
export function wattsToPace(watts: number): number {
  if (watts <= 0) {
    throw new Error('Power must be positive')
  }

  if (watts < VALIDATION_THRESHOLDS.minPower) {
    console.warn(`Power ${watts}W is unusually low (< ${VALIDATION_THRESHOLDS.minPower}W)`)
  }

  if (watts > VALIDATION_THRESHOLDS.maxPower) {
    console.warn(`Power ${watts}W is unusually high (> ${VALIDATION_THRESHOLDS.maxPower}W)`)
  }

  // Rearranged formula: pace/500 = (2.80 / watts)^(1/3)
  const pacePerMeter = Math.pow(CONCEPT2_PACE_CONSTANT / watts, 1 / 3)
  const paceSeconds = pacePerMeter * 500

  return Math.round(paceSeconds * 10) / 10 // Round to 1 decimal
}

/**
 * Format pace in seconds to MM:SS.s format
 *
 * @param paceSeconds - Pace in seconds per 500m
 * @returns Formatted pace string (e.g., "1:45.5")
 *
 * @example
 * formatPace(105.5)  // "1:45.5"
 * formatPace(90)     // "1:30.0"
 * formatPace(120.3)  // "2:00.3"
 */
export function formatPace(paceSeconds: number): string {
  if (paceSeconds < 0) {
    throw new Error('Pace cannot be negative')
  }

  const minutes = Math.floor(paceSeconds / 60)
  const seconds = paceSeconds % 60

  // Format seconds with one decimal place
  const secondsFormatted = seconds.toFixed(1).padStart(4, '0')

  return `${minutes}:${secondsFormatted}`
}

/**
 * Parse pace from MM:SS.s format to seconds
 *
 * @param paceString - Pace string (e.g., "1:45.5", "1:45", "2:00")
 * @returns Pace in seconds per 500m
 *
 * @example
 * parsePace("1:45.5")  // 105.5
 * parsePace("1:45")    // 105
 * parsePace("2:00")    // 120
 */
export function parsePace(paceString: string): number {
  const parts = paceString.split(':')

  if (parts.length !== 2) {
    throw new Error(`Invalid pace format: ${paceString}. Expected MM:SS or MM:SS.s`)
  }

  const minutes = parseInt(parts[0], 10)
  const seconds = parseFloat(parts[1])

  if (isNaN(minutes) || isNaN(seconds)) {
    throw new Error(`Invalid pace format: ${paceString}`)
  }

  if (minutes < 0 || seconds < 0 || seconds >= 60) {
    throw new Error(`Invalid pace values: ${paceString}`)
  }

  return minutes * 60 + seconds
}

/**
 * Get full conversion result with both watts and pace
 *
 * @param input - Either watts (number) or pace string ("1:45.5")
 * @returns Complete conversion result
 */
export function convertPacePower(input: number | string): PacePowerConversion {
  if (typeof input === 'string') {
    // Input is pace string
    const paceSeconds = parsePace(input)
    const watts = paceToWatts(paceSeconds)
    return {
      watts,
      paceSeconds,
      paceFormatted: formatPace(paceSeconds),
    }
  } else {
    // Input is watts
    const paceSeconds = wattsToPace(input)
    return {
      watts: input,
      paceSeconds,
      paceFormatted: formatPace(paceSeconds),
    }
  }
}

/**
 * Calculate power required for a target pace improvement
 *
 * @param currentPaceSeconds - Current pace in sec/500m
 * @param targetPaceSeconds - Target pace in sec/500m
 * @returns Object with current/target watts and percent increase required
 *
 * @example
 * calculatePowerForPaceImprovement(120, 115)
 * // { currentWatts: 162, targetWatts: 183, percentIncrease: 13% }
 */
export function calculatePowerForPaceImprovement(
  currentPaceSeconds: number,
  targetPaceSeconds: number
): {
  currentWatts: number
  targetWatts: number
  percentIncrease: number
  paceImprovement: number
} {
  const currentWatts = paceToWatts(currentPaceSeconds)
  const targetWatts = paceToWatts(targetPaceSeconds)
  const percentIncrease = ((targetWatts - currentWatts) / currentWatts) * 100
  const paceImprovement = currentPaceSeconds - targetPaceSeconds

  return {
    currentWatts: Math.round(currentWatts),
    targetWatts: Math.round(targetWatts),
    percentIncrease: Math.round(percentIncrease * 10) / 10,
    paceImprovement: Math.round(paceImprovement * 10) / 10,
  }
}

/**
 * Calculate split times for a distance at given power
 *
 * @param distanceMeters - Total distance in meters
 * @param avgWatts - Average power in watts
 * @param splitDistanceMeters - Distance per split (default 500m)
 * @returns Array of split times and total time
 */
export function calculateSplits(
  distanceMeters: number,
  avgWatts: number,
  splitDistanceMeters: number = 500
): {
  splitPace: number
  splitPaceFormatted: string
  totalTimeSeconds: number
  totalTimeFormatted: string
  splits: number
} {
  const pacePerSplit = wattsToPace(avgWatts)
  const splits = distanceMeters / splitDistanceMeters
  const totalTimeSeconds = pacePerSplit * splits

  // Format total time as MM:SS.s or HH:MM:SS
  let totalTimeFormatted: string
  if (totalTimeSeconds >= 3600) {
    const hours = Math.floor(totalTimeSeconds / 3600)
    const minutes = Math.floor((totalTimeSeconds % 3600) / 60)
    const seconds = totalTimeSeconds % 60
    totalTimeFormatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(1).padStart(4, '0')}`
  } else {
    const minutes = Math.floor(totalTimeSeconds / 60)
    const seconds = totalTimeSeconds % 60
    totalTimeFormatted = `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`
  }

  return {
    splitPace: pacePerSplit,
    splitPaceFormatted: formatPace(pacePerSplit),
    totalTimeSeconds,
    totalTimeFormatted,
    splits,
  }
}

/**
 * Calculate average watts from distance and time
 *
 * @param distanceMeters - Distance covered in meters
 * @param timeSeconds - Time taken in seconds
 * @returns Average power in watts
 */
export function calculateAvgWattsFromDistanceTime(
  distanceMeters: number,
  timeSeconds: number
): number {
  // Calculate pace per 500m
  const paceSeconds = (timeSeconds / distanceMeters) * 500
  return paceToWatts(paceSeconds)
}

/**
 * Estimate distance from power and time
 *
 * @param avgWatts - Average power in watts
 * @param timeSeconds - Time in seconds
 * @returns Estimated distance in meters
 */
export function estimateDistanceFromPowerTime(
  avgWatts: number,
  timeSeconds: number
): number {
  const pacePer500m = wattsToPace(avgWatts)
  const distancePer500m = 500
  const distance = (timeSeconds / pacePer500m) * distancePer500m
  return Math.round(distance)
}

/**
 * Calculate calorie burn estimate for rowing
 * Based on Concept2 formula (approximation)
 *
 * @param avgWatts - Average power in watts
 * @param durationSeconds - Duration in seconds
 * @returns Estimated calories burned
 */
export function estimateCalories(avgWatts: number, durationSeconds: number): number {
  // Concept2 calorie formula: cal/hr = (4 × watts) + 350 (approx for ~75kg person)
  // This is a simplification - actual formula considers weight
  const caloriesPerHour = 4 * avgWatts + 350
  const hours = durationSeconds / 3600
  return Math.round(caloriesPerHour * hours)
}

/**
 * Convert watts to calories per hour (for display)
 */
export function wattsToCalsPerHour(watts: number): number {
  return Math.round(4 * watts + 350)
}

// ==================== ZONE PACE HELPERS ====================

/**
 * Calculate pace range for a power zone
 *
 * @param powerMin - Zone minimum power (watts)
 * @param powerMax - Zone maximum power (watts)
 * @returns Pace range (note: min pace is faster = higher power)
 */
export function getPaceRangeForPowerZone(
  powerMin: number,
  powerMax: number
): {
  paceMin: number        // Faster (corresponds to powerMax)
  paceMax: number        // Slower (corresponds to powerMin)
  paceMinFormatted: string
  paceMaxFormatted: string
} {
  // Note: Higher power = faster (lower) pace
  const paceMin = wattsToPace(powerMax)  // Faster pace from higher power
  const paceMax = wattsToPace(powerMin)  // Slower pace from lower power

  return {
    paceMin,
    paceMax,
    paceMinFormatted: formatPace(paceMin),
    paceMaxFormatted: formatPace(paceMax),
  }
}
