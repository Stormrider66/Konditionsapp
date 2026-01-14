/**
 * Swimming Test Calculations
 *
 * Formulas for Critical Swim Speed (CSS), SWOLF, and swim zone calculations.
 */

export interface SwimZone {
  zone: number
  name: string
  nameSwedish: string
  paceMin: number // seconds per 100m
  paceMax: number // seconds per 100m
  description: string
}

export interface CSSResult {
  css: number // m/s
  cssPer100m: number // seconds per 100m
  cssFormatted: string // mm:ss per 100m
  zones: SwimZone[]
}

/**
 * Calculate Critical Swim Speed from 400m and 200m time trials
 *
 * CSS = (D2 - D1) / (T2 - T1)
 *
 * @param time400m - 400m time trial time in seconds
 * @param time200m - 200m time trial time in seconds
 * @returns CSSResult with speed, pace, and training zones
 */
export function calculateCSS(
  time400m: number,
  time200m: number
): CSSResult {
  if (time400m <= time200m || time400m <= 0 || time200m <= 0) {
    return {
      css: 0,
      cssPer100m: 0,
      cssFormatted: '0:00',
      zones: [],
    }
  }

  // CSS = (400 - 200) / (T400 - T200)
  const css = 200 / (time400m - time200m) // m/s

  // Convert to pace per 100m
  const cssPer100m = 100 / css // seconds per 100m

  // Format as mm:ss
  const minutes = Math.floor(cssPer100m / 60)
  const seconds = Math.round(cssPer100m % 60)
  const cssFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Generate training zones based on CSS
  const zones = generateSwimZones(cssPer100m)

  return {
    css: Math.round(css * 1000) / 1000,
    cssPer100m: Math.round(cssPer100m * 10) / 10,
    cssFormatted,
    zones,
  }
}

/**
 * Generate swimming training zones based on CSS pace
 *
 * @param cssPer100m - CSS pace in seconds per 100m
 * @returns Array of swim training zones
 */
export function generateSwimZones(cssPer100m: number): SwimZone[] {
  // Zone percentages relative to CSS pace
  // Faster pace = lower percentage of CSS time
  const zones: SwimZone[] = [
    {
      zone: 1,
      name: 'Recovery',
      nameSwedish: 'Återhämtning',
      paceMin: Math.round(cssPer100m * 1.15),
      paceMax: Math.round(cssPer100m * 1.30),
      description: 'Very easy swimming, technique focus',
    },
    {
      zone: 2,
      name: 'Endurance',
      nameSwedish: 'Uthållighet',
      paceMin: Math.round(cssPer100m * 1.05),
      paceMax: Math.round(cssPer100m * 1.15),
      description: 'Aerobic base, conversational pace',
    },
    {
      zone: 3,
      name: 'Threshold',
      nameSwedish: 'Tröskel',
      paceMin: Math.round(cssPer100m * 0.98),
      paceMax: Math.round(cssPer100m * 1.05),
      description: 'CSS pace, sustainable hard effort',
    },
    {
      zone: 4,
      name: 'VO2max',
      nameSwedish: 'VO2max',
      paceMin: Math.round(cssPer100m * 0.90),
      paceMax: Math.round(cssPer100m * 0.98),
      description: 'Hard interval pace, 3-8 min efforts',
    },
    {
      zone: 5,
      name: 'Sprint',
      nameSwedish: 'Sprint',
      paceMin: Math.round(cssPer100m * 0.80),
      paceMax: Math.round(cssPer100m * 0.90),
      description: 'Max effort, short bursts',
    },
  ]

  return zones
}

/**
 * Calculate SWOLF score (Swim Golf)
 *
 * SWOLF = Time (seconds) + Stroke Count per length
 * Lower is better (more efficient)
 *
 * @param time - Time for the distance in seconds
 * @param strokes - Total stroke count
 * @param poolLength - Pool length in meters (25 or 50)
 * @param distance - Total distance in meters
 * @returns SWOLF score per length
 */
export function calculateSWOLF(
  time: number,
  strokes: number,
  poolLength: 25 | 50,
  distance: number
): number {
  if (distance <= 0 || time <= 0) return 0

  const lengths = distance / poolLength
  const timePerLength = time / lengths
  const strokesPerLength = strokes / lengths

  const swolf = timePerLength + strokesPerLength
  return Math.round(swolf * 10) / 10
}

/**
 * Classify SWOLF performance
 *
 * @param swolf - SWOLF score
 * @param poolLength - Pool length (25 or 50)
 * @returns Performance tier
 */
export function classifySWOLF(
  swolf: number,
  poolLength: 25 | 50
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // Benchmarks for 25m pool (50m pool values are ~doubled)
  const benchmarks =
    poolLength === 25
      ? { elite: 30, advanced: 40, intermediate: 50 }
      : { elite: 65, advanced: 85, intermediate: 105 }

  if (swolf <= benchmarks.elite) return 'ELITE'
  if (swolf <= benchmarks.advanced) return 'ADVANCED'
  if (swolf <= benchmarks.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}

/**
 * Format swim pace as mm:ss per 100m
 *
 * @param secondsPer100m - Pace in seconds per 100m
 * @returns Formatted pace string
 */
export function formatSwimPace(secondsPer100m: number): string {
  if (secondsPer100m <= 0) return '0:00'

  const minutes = Math.floor(secondsPer100m / 60)
  const seconds = Math.round(secondsPer100m % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Convert swim time to pace per 100m
 *
 * @param time - Time in seconds
 * @param distance - Distance in meters
 * @returns Pace in seconds per 100m
 */
export function calculateSwimPace(time: number, distance: number): number {
  if (distance <= 0 || time <= 0) return 0
  return Math.round((time / distance) * 100 * 10) / 10
}

/**
 * Estimate VO2max from 400m swim time (freestyle)
 *
 * Rough estimation for trained swimmers
 *
 * @param time400m - 400m freestyle time in seconds
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Estimated VO2max in ml/kg/min
 */
export function estimateVO2maxFromSwim(
  time400m: number,
  gender: 'MALE' | 'FEMALE'
): number {
  // Very rough estimation - swimming VO2max correlates differently than running
  // This is a simplified formula for reference only
  const baseVO2 = gender === 'MALE' ? 58 : 52
  const timeFactor = 300 / time400m // Normalized to ~5 min target

  const estimatedVO2 = baseVO2 * Math.pow(timeFactor, 0.5)
  return Math.round(estimatedVO2 * 10) / 10
}

/**
 * Calculate stroke rate from stroke count and time
 *
 * @param strokes - Number of strokes
 * @param time - Time in seconds
 * @returns Strokes per minute
 */
export function calculateStrokeRate(strokes: number, time: number): number {
  if (time <= 0) return 0
  return Math.round((strokes / time) * 60 * 10) / 10
}

/**
 * Classify CSS pace by swimming level
 *
 * @param cssPer100m - CSS pace in seconds per 100m
 * @param gender - 'MALE' or 'FEMALE'
 * @returns Performance tier
 */
export function classifyCSS(
  cssPer100m: number,
  gender: 'MALE' | 'FEMALE'
): 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'BEGINNER' {
  // Benchmarks in seconds per 100m (lower is better)
  const benchmarks =
    gender === 'MALE'
      ? { elite: 70, advanced: 85, intermediate: 100 } // ~1:10, ~1:25, ~1:40
      : { elite: 80, advanced: 95, intermediate: 110 } // ~1:20, ~1:35, ~1:50

  if (cssPer100m <= benchmarks.elite) return 'ELITE'
  if (cssPer100m <= benchmarks.advanced) return 'ADVANCED'
  if (cssPer100m <= benchmarks.intermediate) return 'INTERMEDIATE'
  return 'BEGINNER'
}
