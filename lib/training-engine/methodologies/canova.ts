/**
 * Canova Percentage System
 *
 * Based on Renato Canova's coaching methodology for elite middle and long-distance runners.
 *
 * Key Principles:
 * - Training organized around percentages of goal race pace
 * - Specific intensity prescription based on race distance
 * - Progressive increase in volume at race-specific intensities
 * - Frequent quality sessions with clear purpose
 * - Minimal "junk miles" - every session has specific intent
 *
 * Intensity Categories (% of race pace):
 * - Easy/Recovery: 65-75% of race pace
 * - Fundamental: 75-85% of race pace (marathon pace)
 * - Specific: 90-100% of race pace (race-specific work)
 * - Special: 100-105% of race pace (faster than race pace)
 * - Fast: >105% of race pace (speed development)
 *
 * Zone Distribution (3-zone model):
 * - Zone 1 (Easy/Recovery): 70%
 * - Zone 2 (Fundamental/Specific): 20%
 * - Zone 3 (Special/Fast): 10%
 *
 * Best For:
 * - ADVANCED/ELITE athletes with specific race goals
 * - Athletes who respond well to race-pace training
 * - Marathon and half-marathon preparation
 *
 * References:
 * - Canova, R. (Various coaching articles and presentations)
 * - Analysis of elite Ethiopian and Kenyan training programs
 *
 * @module methodologies/canova
 */

import type { MethodologyConfig, WeeklyStructure, ZoneDistribution3, GoalDistance } from './types'

/**
 * Get Canova methodology configuration
 *
 * Prerequisites:
 * - ADVANCED or ELITE athlete level
 * - Clear race goal with target time
 * - High training volume tolerance
 * - Experience with quality training
 *
 * @param weeklySessionCount - Number of sessions per week (6-10)
 * @param goalDistance - Target race distance
 * @returns Complete Canova methodology configuration
 */
export function getCanovaConfig(
  weeklySessionCount: number = 7,
  goalDistance: GoalDistance = 'MARATHON'
): MethodologyConfig {
  const sessions = Math.max(6, Math.min(10, weeklySessionCount))

  // Canova method uses 2-3 quality sessions per week
  const qualitySessions = sessions <= 6 ? 2 : 3
  const easyRuns = sessions - qualitySessions - 1 // -1 for long run
  const restDays = 7 - sessions

  const weeklyStructure: WeeklyStructure = {
    totalSessions: sessions,
    easyRuns,
    qualitySessions,
    longRun: true,
    restDays,
  }

  const zoneDistribution3: ZoneDistribution3 = {
    zone1Percent: 70,  // Easy/Recovery
    zone2Percent: 20,  // Fundamental/Specific (more than Polarized)
    zone3Percent: 10,  // Special/Fast
  }

  return {
    type: 'CANOVA',
    name: 'Canova Percentage System',
    description: 'Race-pace specific training with progressive volume at goal pace. Best for advanced athletes with clear race goals.',
    zoneDistribution3,
    weeklyStructure,
    minWeeklySessions: 6,
    maxWeeklySessions: 10,
    requiresLactateTest: false, // Works from race pace predictions
    targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON'],
    minAthleteLevel: 'ADVANCED', // Requires experience with quality training
    deloadFrequencyWeeks: 3, // 2-3:1 pattern depending on athlete
    volumeReductionPercent: 25,
    strengths: [
      'Highly specific to race goals - builds confidence at race pace',
      'Progressive race-pace volume prepares body for goal distance',
      'Clear intensity prescription based on goal pace percentages',
      'Proven effective for elite marathon and half-marathon runners',
      'Flexible - can adjust pace targets as fitness improves',
      'Encourages quality over quantity',
    ],
    limitations: [
      'Requires accurate race pace prediction (can be challenging)',
      'Not suitable for general fitness goals - needs specific race target',
      'Higher injury risk if race pace estimate is too aggressive',
      'Requires ADVANCED level - not beginner-friendly',
      'May be mentally demanding (frequent quality sessions)',
      'Less emphasis on pure aerobic base than Polarized',
    ],
  }
}

/**
 * Calculate training paces from goal race pace
 *
 * Canova system uses percentages of race pace to prescribe training intensities
 *
 * @param goalRacePace - Target race pace in seconds per km
 * @param raceDistance - Target race distance
 * @returns Training paces for each category
 */
export function calculateCanovaPaces(
  goalRacePace: number,
  raceDistance: GoalDistance
): {
  easy: { min: number; max: number; description: string }
  fundamental: { pace: number; description: string }
  specific: { pace: number; description: string }
  special: { min: number; max: number; description: string }
  fast: { min: number; max: number; description: string }
} {
  // Adjust percentages based on race distance
  // Marathon runners train slower for "easy" than 5K runners
  const distanceMultipliers = {
    '5K': { easy: 0.75, fund: 0.85, spec: 0.95, special: 1.02 },
    '10K': { easy: 0.70, fund: 0.82, spec: 0.93, special: 1.03 },
    'HALF_MARATHON': { easy: 0.68, fund: 0.80, spec: 0.92, special: 1.05 },
    'MARATHON': { easy: 0.65, fund: 0.75, spec: 0.90, special: 1.05 },
    'ULTRAMARATHON': { easy: 0.63, fund: 0.72, spec: 0.88, special: 1.07 },
    'GENERAL_FITNESS': { easy: 0.70, fund: 0.80, spec: 0.95, special: 1.05 },
  }

  const multipliers = distanceMultipliers[raceDistance]

  return {
    easy: {
      min: goalRacePace / multipliers.easy, // Slower than race pace
      max: goalRacePace / (multipliers.easy - 0.05),
      description: 'Recovery and aerobic base building. Conversational pace.',
    },
    fundamental: {
      pace: goalRacePace / multipliers.fund,
      description: 'Marathon pace efforts. Builds aerobic strength at sustained pace.',
    },
    specific: {
      pace: goalRacePace / multipliers.spec,
      description: 'Race-specific pace. Builds confidence and economy at goal pace.',
    },
    special: {
      min: goalRacePace / multipliers.special,
      max: goalRacePace / 1.08,
      description: 'Slightly faster than race pace. Develops speed reserve.',
    },
    fast: {
      min: goalRacePace / 1.10,
      max: goalRacePace / 1.15,
      description: 'Speed development. Short intervals and strides.',
    },
  }
}

/**
 * Generate weekly session structure for Canova method
 *
 * Typical progression through training block:
 * - Early weeks: Volume at fundamental pace
 * - Mid weeks: Specific race pace work
 * - Late weeks: Special (faster than race pace) + taper
 *
 * @param weekNumber - Week number in training block (1-12+)
 * @param weeklySessionCount - Total sessions per week
 * @param phase - Training phase
 * @returns Array of session types
 */
export function generateCanovaWeek(
  weekNumber: number,
  weeklySessionCount: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
): string[] {
  const sessions: string[] = []

  if (phase === 'BASE') {
    // Base phase: 2 quality sessions
    // Focus on fundamental pace (marathon pace) and easy aerobic
    sessions.push('FUNDAMENTAL_RUN') // Marathon pace effort
    sessions.push('PROGRESSIVE_RUN') // Easy to specific pace
    sessions.push('LONG_RUN')
  } else if (phase === 'BUILD') {
    // Build phase: 2-3 quality sessions
    // Introduce race-specific work
    sessions.push('SPECIFIC_INTERVALS') // Race pace intervals
    sessions.push('FUNDAMENTAL_RUN') // Marathon pace
    sessions.push('LONG_RUN_WITH_SPECIFIC') // Long run with race pace finish
  } else if (phase === 'PEAK') {
    // Peak phase: Mix specific and special work
    sessions.push('SPECIFIC_TEMPO') // Race pace tempo
    sessions.push('SPECIAL_INTERVALS') // Faster than race pace
    sessions.push('LONG_RUN_WITH_SPECIFIC')
  } else {
    // Taper: Reduce volume, maintain intensity
    sessions.push('SHORT_SPECIFIC') // Short race pace
    sessions.push('STRIDES') // Fast running
    sessions.push('MODERATE_LONG_RUN')
  }

  // Fill remaining sessions with easy runs
  const remainingSessions = weeklySessionCount - sessions.length
  for (let i = 0; i < remainingSessions; i++) {
    sessions.push('EASY_RUN')
  }

  return sessions
}

/**
 * Calculate weekly progression of race-specific volume
 *
 * Canova method progressively increases volume at race-specific paces
 *
 * @param weekNumber - Current week in block
 * @param totalWeeks - Total weeks in training block
 * @param peakVolume - Peak volume of race-specific work (minutes)
 * @returns Race-specific volume for this week
 */
export function calculateSpecificVolume(
  weekNumber: number,
  totalWeeks: number,
  peakVolume: number
): {
  fundamentalMinutes: number
  specificMinutes: number
  specialMinutes: number
} {
  // Progressive build: start at 20%, build to 100%, then taper
  const progressionPercent = Math.min((weekNumber / (totalWeeks * 0.75)) * 100, 100)

  // Reduce in final weeks (taper)
  const taperWeeks = totalWeeks - weekNumber
  const taperFactor = taperWeeks <= 2 ? 0.5 - (taperWeeks * 0.15) : 1.0

  const adjustedPercent = (progressionPercent / 100) * taperFactor

  return {
    fundamentalMinutes: Math.round(peakVolume * 0.4 * adjustedPercent),
    specificMinutes: Math.round(peakVolume * 0.5 * adjustedPercent),
    specialMinutes: Math.round(peakVolume * 0.1 * adjustedPercent),
  }
}

/**
 * Validate race pace estimate
 *
 * Checks if goal pace is realistic given current fitness
 *
 * @param goalPace - Target race pace (sec/km)
 * @param currentThresholdPace - Current LT2 pace (sec/km)
 * @param raceDistance - Target distance
 * @returns Validation result
 */
export function validateGoalPace(
  goalPace: number,
  currentThresholdPace: number,
  raceDistance: GoalDistance
): {
  realistic: boolean
  recommendation: string
  adjustedPace?: number
} {
  // Expected race pace relative to threshold pace
  const expectedRatios = {
    '5K': 0.95, // 5K ≈ 95% of LT2 pace (slightly faster)
    '10K': 1.00, // 10K ≈ LT2 pace
    'HALF_MARATHON': 1.05, // Half ≈ 5% slower than LT2
    'MARATHON': 1.10, // Marathon ≈ 10% slower than LT2
    'ULTRAMARATHON': 1.20,
    'GENERAL_FITNESS': 1.05,
  }

  const expectedRacePace = currentThresholdPace * expectedRatios[raceDistance]
  const paceDeviation = ((goalPace - expectedRacePace) / expectedRacePace) * 100

  if (Math.abs(paceDeviation) <= 5) {
    return {
      realistic: true,
      recommendation: 'Goal pace is realistic based on current fitness',
    }
  } else if (paceDeviation < -5) {
    // Goal is too aggressive
    return {
      realistic: false,
      recommendation: `Goal pace is ${Math.abs(paceDeviation).toFixed(1)}% too aggressive for current fitness. Consider adjusting goal or building fitness first.`,
      adjustedPace: expectedRacePace,
    }
  } else {
    // Goal is conservative
    return {
      realistic: true,
      recommendation: `Goal pace is conservative (${paceDeviation.toFixed(1)}% slower than current fitness suggests). Consider more ambitious target.`,
      adjustedPace: expectedRacePace,
    }
  }
}

/**
 * Get Canova training intensity guidelines
 *
 * @returns Intensity descriptions for each category
 */
export function getCanovaIntensityGuidelines(): {
  easy: string
  fundamental: string
  specific: string
  special: string
  fast: string
} {
  return {
    easy: 'Easy/Recovery pace - 65-75% of goal race pace. Conversational. Used for recovery and aerobic base.',
    fundamental: 'Marathon pace efforts - 75-85% of goal race pace. Builds aerobic strength. Can be sustained for extended periods.',
    specific: 'Race-specific pace - 90-100% of goal race pace. THE KEY PACE. Progressive volume at this pace builds race readiness.',
    special: 'Faster than race pace - 100-105% of goal pace. Develops speed reserve. Makes race pace feel easier.',
    fast: 'Speed development - >105% of race pace. Short intervals and strides. Neuromuscular development.',
  }
}
