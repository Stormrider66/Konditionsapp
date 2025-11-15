/**
 * VDOT Calculator - Jack Daniels' Running Formula
 *
 * VDOT represents a runner's current running ability, combining VO2max
 * with running economy. It's the cornerstone of Jack Daniels' training system.
 *
 * This module provides:
 * 1. VDOT calculation from race performances
 * 2. Equivalent race time predictions across distances
 * 3. Training pace prescriptions (Easy, Marathon, Threshold, Interval, Repetition)
 * 4. Table-based lookups for precision
 *
 * Reference:
 * - Daniels, J. (2013). Daniels' Running Formula (3rd ed.). Human Kinetics.
 *
 * Note: The formula-based approach in race-predictions.ts is used for calculation.
 * This module provides the table-based interface and training zone prescriptions.
 */

import {
  calculateVDOT as formulaCalculateVDOT,
  predictTimeFromVDOT,
  RACE_DISTANCES,
  formatTime,
  formatPace,
  calculateTrainingPaces,
  TrainingPaces
} from './race-predictions'

/**
 * VDOT table entry
 */
export interface VDOTEntry {
  vdot: number
  '1500m': string
  'Mile': string
  '3K': string
  '5K': string
  '10K': string
  'Half Marathon': string
  'Marathon': string
  easyPace: string
  marathonPace: string
  thresholdPace: string
  intervalPace: string
  repetitionPace: string
}

/**
 * Calculate VDOT from any race performance
 *
 * Wrapper around formula-based calculation that rounds to nearest 0.5
 * to match Jack Daniels' table precision.
 *
 * @param distanceMeters - Race distance in meters
 * @param timeSeconds - Finish time in seconds
 * @returns VDOT value rounded to nearest 0.5
 */
export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  const rawVDOT = formulaCalculateVDOT(distanceMeters, timeSeconds)
  return Math.round(rawVDOT * 2) / 2 // Round to nearest 0.5
}

/**
 * Get equivalent race times for a given VDOT
 *
 * @param vdot - VDOT value
 * @returns Object with race times for standard distances
 */
export function getEquivalentRaceTimes(vdot: number): Record<string, string> {
  const times: Record<string, string> = {}

  Object.entries(RACE_DISTANCES).forEach(([name, distance]) => {
    const timeSeconds = predictTimeFromVDOT(vdot, distance)
    times[name] = formatTime(timeSeconds)
  })

  return times
}

/**
 * Get training paces for a given VDOT
 *
 * Returns Jack Daniels' five training intensities:
 * - Easy (E): Recovery runs, long runs
 * - Marathon (M): Marathon pace runs
 * - Threshold (T): Tempo runs, cruise intervals
 * - Interval (I): VO2max intervals
 * - Repetition (R): Speed work, fast intervals
 *
 * @param vdot - VDOT value
 * @returns Training paces formatted as pace per km
 */
export function getTrainingPaces(vdot: number): TrainingPaces {
  return calculateTrainingPaces(vdot)
}

/**
 * Generate complete VDOT table entry
 *
 * @param vdot - VDOT value
 * @returns Complete VDOT entry with race times and training paces
 */
export function generateVDOTEntry(vdot: number): VDOTEntry {
  const raceTimes = getEquivalentRaceTimes(vdot)
  const paces = getTrainingPaces(vdot)

  return {
    vdot,
    '1500m': raceTimes['1500m'] || 'N/A',
    'Mile': raceTimes['Mile'] || 'N/A',
    '3K': raceTimes['3K'] || 'N/A',
    '5K': raceTimes['5K'] || 'N/A',
    '10K': raceTimes['10K'] || 'N/A',
    'Half Marathon': raceTimes['Half Marathon'] || 'N/A',
    'Marathon': raceTimes['Marathon'] || 'N/A',
    easyPace: paces.easy.formatted,
    marathonPace: paces.marathon.formatted,
    thresholdPace: paces.threshold.formatted,
    intervalPace: paces.interval.formatted,
    repetitionPace: paces.repetition.formatted
  }
}

/**
 * Find VDOT from race performance with fuzzy matching
 *
 * Useful when you have a race time and want to find the closest VDOT
 * from Jack Daniels' tables.
 *
 * @param distanceKey - Standard distance name (e.g., "5K", "Marathon")
 * @param timeSeconds - Finish time in seconds
 * @returns Closest VDOT value
 */
export function findVDOTFromRaceTime(
  distanceKey: keyof typeof RACE_DISTANCES,
  timeSeconds: number
): number {
  const distance = RACE_DISTANCES[distanceKey]
  return calculateVDOT(distance, timeSeconds)
}

/**
 * VDOT categories for runners
 */
export type VDOTCategory =
  | 'BEGINNER'          // VDOT < 35
  | 'NOVICE'            // VDOT 35-44
  | 'INTERMEDIATE'      // VDOT 45-54
  | 'ADVANCED'          // VDOT 55-64
  | 'ELITE'             // VDOT 65-74
  | 'WORLD_CLASS'       // VDOT >= 75

export interface VDOTCategoryInfo {
  category: VDOTCategory
  description: string
  typical5K: string
  typicalMarathon: string
}

/**
 * Categorize runner by VDOT
 *
 * @param vdot - VDOT value
 * @returns Category information
 */
export function categorizeVDOT(vdot: number): VDOTCategoryInfo {
  if (vdot < 35) {
    return {
      category: 'BEGINNER',
      description: 'New to running or building base fitness',
      typical5K: '> 30:00',
      typicalMarathon: '> 5:00:00'
    }
  }

  if (vdot < 45) {
    return {
      category: 'NOVICE',
      description: 'Recreational runner with regular training',
      typical5K: '24:00 - 30:00',
      typicalMarathon: '4:00:00 - 5:00:00'
    }
  }

  if (vdot < 55) {
    return {
      category: 'INTERMEDIATE',
      description: 'Experienced runner with consistent training',
      typical5K: '20:00 - 24:00',
      typicalMarathon: '3:15:00 - 4:00:00'
    }
  }

  if (vdot < 65) {
    return {
      category: 'ADVANCED',
      description: 'Competitive runner with structured training',
      typical5K: '17:00 - 20:00',
      typicalMarathon: '2:45:00 - 3:15:00'
    }
  }

  if (vdot < 75) {
    return {
      category: 'ELITE',
      description: 'High-level competitive runner',
      typical5K: '15:00 - 17:00',
      typicalMarathon: '2:20:00 - 2:45:00'
    }
  }

  return {
    category: 'WORLD_CLASS',
    description: 'World-class or professional runner',
    typical5K: '< 15:00',
    typicalMarathon: '< 2:20:00'
  }
}

/**
 * Calculate VDOT improvement potential
 *
 * Estimates realistic VDOT improvement over a training cycle
 * based on current level and training phase.
 *
 * @param currentVDOT - Current VDOT value
 * @param trainingWeeks - Length of training cycle in weeks
 * @param experienceLevel - Runner's experience (affects adaptation rate)
 * @returns Estimated VDOT after training cycle
 */
export function estimateVDOTImprovement(
  currentVDOT: number,
  trainingWeeks: number,
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' = 'INTERMEDIATE'
): { estimatedVDOT: number; improvement: number; improvementPercent: number } {
  // Improvement rates per week (percentage of current VDOT)
  const weeklyImprovementRates = {
    BEGINNER: 0.008,      // ~0.8% per week (faster initial gains)
    INTERMEDIATE: 0.005,  // ~0.5% per week
    ADVANCED: 0.003,      // ~0.3% per week (diminishing returns)
    ELITE: 0.001          // ~0.1% per week (minimal gains)
  }

  const weeklyRate = weeklyImprovementRates[experienceLevel]

  // Apply diminishing returns curve
  // Early weeks see more improvement, later weeks see less
  let totalImprovement = 0
  for (let week = 1; week <= trainingWeeks; week++) {
    const weeklyGain = currentVDOT * weeklyRate * Math.exp(-week / 52) // 52-week half-life
    totalImprovement += weeklyGain
  }

  const estimatedVDOT = currentVDOT + totalImprovement
  const improvementPercent = (totalImprovement / currentVDOT) * 100

  return {
    estimatedVDOT: Math.round(estimatedVDOT * 10) / 10,
    improvement: Math.round(totalImprovement * 10) / 10,
    improvementPercent: Math.round(improvementPercent * 10) / 10
  }
}

/**
 * Compare two VDOT values
 *
 * Useful for tracking progress or comparing athletes
 *
 * @param vdot1 - First VDOT value
 * @param vdot2 - Second VDOT value
 * @returns Comparison with percentage difference
 */
export function compareVDOT(
  vdot1: number,
  vdot2: number
): {
  difference: number
  percentDifference: number
  improved: boolean
  equivalent5KDifference: number // seconds
} {
  const difference = vdot2 - vdot1
  const percentDifference = (difference / vdot1) * 100

  // Calculate equivalent 5K time difference
  const time1 = predictTimeFromVDOT(vdot1, RACE_DISTANCES['5K'])
  const time2 = predictTimeFromVDOT(vdot2, RACE_DISTANCES['5K'])
  const equivalent5KDifference = time1 - time2 // Positive means improvement

  return {
    difference: Math.round(difference * 10) / 10,
    percentDifference: Math.round(percentDifference * 10) / 10,
    improved: difference > 0,
    equivalent5KDifference: Math.round(equivalent5KDifference)
  }
}

/**
 * Validate if a race performance is reasonable given athlete's VDOT
 *
 * Helps detect data entry errors or unusual performances
 *
 * @param vdot - Athlete's established VDOT
 * @param distanceMeters - Race distance in meters
 * @param timeSeconds - Reported race time
 * @returns Validation result with warnings if applicable
 */
export function validateRacePerformance(
  vdot: number,
  distanceMeters: number,
  timeSeconds: number
): {
  valid: boolean
  expectedTime: number
  actualVDOT: number
  deviation: number
  warning?: string
} {
  const expectedTime = predictTimeFromVDOT(vdot, distanceMeters)
  const actualVDOT = calculateVDOT(distanceMeters, timeSeconds)
  const deviation = ((timeSeconds - expectedTime) / expectedTime) * 100

  let warning: string | undefined

  if (Math.abs(deviation) > 15) {
    warning = `Performance deviates ${Math.abs(deviation).toFixed(1)}% from expected. Check data entry.`
  } else if (deviation > 10) {
    warning = 'Performance significantly slower than expected. Possible adverse conditions or fitness decline.'
  } else if (deviation < -10) {
    warning = 'Performance significantly faster than expected. Major fitness gain or possibly favorable conditions.'
  }

  return {
    valid: Math.abs(deviation) <= 15,
    expectedTime,
    actualVDOT,
    deviation: Math.round(deviation * 10) / 10,
    warning
  }
}
