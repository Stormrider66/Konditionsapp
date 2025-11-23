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

// ============================================================================
// CANOVA ADVANCED STRUCTURES - Based on Elite Methodology
// ============================================================================

/**
 * Canova Training Phase Types
 * These are the actual phases used in Canova periodization
 */
export type CanovaPhase =
  | 'TRANSITION'    // 4 weeks: Recovery, gym, short sprints
  | 'GENERAL'       // 4 weeks: General resistance, aerobic base
  | 'FUNDAMENTAL'   // 6 weeks: Peak volume, 80-90% MP
  | 'SPECIAL'       // 8 weeks: Polarized speed+endurance, introduce blocks
  | 'SPECIFIC'      // 6-10 weeks: Convergence at 95-105% MP
  | 'TAPER'         // 3 weeks: Volume reduction, intensity maintenance

/**
 * Canova 7-Zone Intensity Model (based on Marathon Pace)
 * All zones calculated as percentages of Goal Marathon Pace (MP = 100%)
 */
export interface CanovaZones {
  regeneration: { min: number; max: number; description: string }      // 60-70% AnT (~50-60% MP)
  fundamental: { min: number; max: number; description: string }       // 80% MP
  generalEndurance: { min: number; max: number; description: string }  // 85-90% MP
  specialEndurance: { min: number; max: number; description: string }  // 90-95% MP
  specificEndurance: { min: number; max: number; description: string } // 95-105% MP (THE RACE ZONE)
  specialSpeed: { min: number; max: number; description: string }      // 105-110% MP
  lacticAlactic: { min: number; max: number; description: string }     // >110% MP
}

/**
 * Calculate Canova 7-zone structure from Marathon Pace
 * @param marathonPaceKmh - Goal marathon pace in km/h
 * @returns Complete zone structure
 */
export function calculateCanovaZones(marathonPaceKmh: number): CanovaZones {
  return {
    regeneration: {
      min: marathonPaceKmh * 0.50,
      max: marathonPaceKmh * 0.60,
      description: 'Lactate flush, recovery, capillary maintenance'
    },
    fundamental: {
      min: marathonPaceKmh * 0.75,
      max: marathonPaceKmh * 0.85,
      description: 'Aerobic support, lipid metabolism, structural tolerance'
    },
    generalEndurance: {
      min: marathonPaceKmh * 0.85,
      max: marathonPaceKmh * 0.90,
      description: 'High-end aerobic base, metabolic efficiency, active recovery'
    },
    specialEndurance: {
      min: marathonPaceKmh * 0.90,
      max: marathonPaceKmh * 0.95,
      description: 'Support for race pace, glycogen sparing, aerobic power'
    },
    specificEndurance: {
      min: marathonPaceKmh * 0.95,
      max: marathonPaceKmh * 1.05,
      description: 'THE RACE ZONE - simulation of metabolic & biomechanical demands'
    },
    specialSpeed: {
      min: marathonPaceKmh * 1.05,
      max: marathonPaceKmh * 1.10,
      description: 'Biomechanical efficiency, lactate clearance, recruitment'
    },
    lacticAlactic: {
      min: marathonPaceKmh * 1.10,
      max: marathonPaceKmh * 1.30,
      description: 'Neuromuscular recruitment, mechanical power'
    }
  }
}

/**
 * Canova Special Block Types
 * The hallmark of Canova training - double workout days
 */
export type CanovaBlockType = 'EXTENSIVE' | 'INTENSIVE' | 'MIXED'

export interface CanovaSpecialBlock {
  type: CanovaBlockType
  amSession: {
    description: string
    totalDistance: number // km
    segments: Array<{
      distance: number // km
      pacePercent: number // % of MP
    }>
  }
  pmSession: {
    description: string
    totalDistance: number // km
    segments: Array<{
      distance: number // km
      pacePercent: number // % of MP
    }>
  }
  totalDailyVolume: number // km
  recoveryDaysAfter: number
  nutritionalStrategy: 'NORMAL' | 'DEPLETED' // Depleted = carb restriction between sessions
}

/**
 * Get Canova Special Block template
 * @param type - Block type (EXTENSIVE for endurance, INTENSIVE for speed, MIXED for race simulation)
 * @param athleteLevel - Adjust volume based on level
 * @returns Complete block structure
 */
export function getCanovaSpecialBlock(
  type: CanovaBlockType,
  athleteLevel: 'ADVANCED' | 'ELITE' = 'ADVANCED'
): CanovaSpecialBlock {
  const volumeMultiplier = athleteLevel === 'ELITE' ? 1.0 : 0.85

  switch (type) {
    case 'EXTENSIVE':
      // Focus: Pure endurance extension (for fast-twitch athletes needing aerobic support)
      return {
        type: 'EXTENSIVE',
        amSession: {
          description: 'AM: Build aerobic house with moderate + specific pace',
          totalDistance: Math.round(30 * volumeMultiplier),
          segments: [
            { distance: 10, pacePercent: 90 },   // 10km @ 90% MP
            { distance: 20, pacePercent: 100 },  // 20km @ 100% MP
          ]
        },
        pmSession: {
          description: 'PM: Continue volume accumulation at MP',
          totalDistance: Math.round(30 * volumeMultiplier),
          segments: [
            { distance: 10, pacePercent: 90 },
            { distance: 20, pacePercent: 100 },
          ]
        },
        totalDailyVolume: Math.round(60 * volumeMultiplier),
        recoveryDaysAfter: 3,
        nutritionalStrategy: 'DEPLETED' // Force fat oxidation in PM
      }

    case 'INTENSIVE':
      // Focus: Lactate clearance and biomechanical efficiency (for endurance athletes needing speed)
      return {
        type: 'INTENSIVE',
        amSession: {
          description: 'AM: Moderate + High intensity intervals',
          totalDistance: Math.round(20 * volumeMultiplier),
          segments: [
            { distance: 10, pacePercent: 90 },
            { distance: 10, pacePercent: 105 },  // 10km @ 105% MP (intervals)
          ]
        },
        pmSession: {
          description: 'PM: Speed intervals on fatigue',
          totalDistance: Math.round(22 * volumeMultiplier),
          segments: [
            { distance: 10, pacePercent: 90 },
            { distance: 12, pacePercent: 110 },  // 10-12 x 1km @ 110% MP
          ]
        },
        totalDailyVolume: Math.round(42 * volumeMultiplier),
        recoveryDaysAfter: 3,
        nutritionalStrategy: 'NORMAL'
      }

    case 'MIXED':
      // Focus: Specific marathon simulation (glycogen depletion AM + speed PM)
      return {
        type: 'MIXED',
        amSession: {
          description: 'AM: Specific Endurance - depletes glycogen',
          totalDistance: Math.round(20 * volumeMultiplier),
          segments: [
            { distance: 20, pacePercent: 98 },  // 20km @ 98% MP
          ]
        },
        pmSession: {
          description: 'PM: Specific Speed - forces fast running on tired legs',
          totalDistance: Math.round(12 * volumeMultiplier),
          segments: [
            { distance: 12, pacePercent: 105 },  // 12 x 1km @ 105% MP
          ]
        },
        totalDailyVolume: Math.round(32 * volumeMultiplier),
        recoveryDaysAfter: 3,
        nutritionalStrategy: 'DEPLETED' // Simulates marathon glycogen state
      }
  }
}

/**
 * Canova Long Fast Run Types
 * These are quality workouts, not slow long runs
 */
export interface CanovaLongFastRun {
  type: 'CONTINUOUS' | 'PROGRESSIVE' | 'ALTERNATING'
  totalDistance: number // km
  description: string
  segments: Array<{
    distance: number // km
    pacePercent: number // % of MP
  }>
}

/**
 * Generate Canova Long Fast Run
 * @param phase - Current training phase
 * @param type - Run type
 * @returns Long fast run structure
 */
export function getCanovaLongFastRun(
  phase: CanovaPhase,
  type: 'CONTINUOUS' | 'PROGRESSIVE' | 'ALTERNATING' = 'CONTINUOUS'
): CanovaLongFastRun {
  switch (phase) {
    case 'GENERAL':
      // Building structural tolerance
      return {
        type: 'CONTINUOUS',
        totalDistance: 32,
        description: 'Long run at fundamental pace to build aerobic base',
        segments: [{ distance: 32, pacePercent: 80 }]
      }

    case 'FUNDAMENTAL':
      // Peak distance, maximize aerobic capacity
      if (type === 'PROGRESSIVE') {
        return {
          type: 'PROGRESSIVE',
          totalDistance: 35,
          description: 'Progressive long run: start slow, finish fast',
          segments: [
            { distance: 15, pacePercent: 85 },  // Start easy
            { distance: 12, pacePercent: 95 },  // Build to MP
            { distance: 8, pacePercent: 102 },  // Finish faster
          ]
        }
      }
      return {
        type: 'CONTINUOUS',
        totalDistance: 36,
        description: 'Peak volume long run at 85% MP',
        segments: [{ distance: 36, pacePercent: 85 }]
      }

    case 'SPECIAL':
      // Introduce race-specific stress with variations
      if (type === 'ALTERNATING') {
        return {
          type: 'ALTERNATING',
          totalDistance: 30,
          description: 'Alternating pace: 1km fast/1km moderate (trains lactate shuttle)',
          segments: [
            // Represented as average - actual execution alternates each km
            { distance: 30, pacePercent: 96 }  // Average of 103% + 90%
          ]
        }
      }
      return {
        type: 'CONTINUOUS',
        totalDistance: 30,
        description: 'Long run at 90-92% MP with race-specific stress',
        segments: [{ distance: 30, pacePercent: 91 }]
      }

    case 'SPECIFIC':
      // Specific Long Run - race simulation
      if (type === 'ALTERNATING') {
        return {
          type: 'ALTERNATING',
          totalDistance: 32,
          description: 'Specific alternating: 1km @ 103% MP / 1km @ 90% MP',
          segments: [
            { distance: 32, pacePercent: 96.5 }  // Average
          ]
        }
      }
      return {
        type: 'CONTINUOUS',
        totalDistance: 35,
        description: 'Specific Long Run: 35km at 95-98% MP (race predictor)',
        segments: [{ distance: 35, pacePercent: 97 }]
      }

    default:
      return {
        type: 'CONTINUOUS',
        totalDistance: 25,
        description: 'Moderate long run',
        segments: [{ distance: 25, pacePercent: 85 }]
      }
  }
}

/**
 * Canova Interval Session Structure
 * Emphasizes extension (more volume at same pace) over speed increase
 */
export interface CanovaIntervalSession {
  type: 'SPECIFIC_EXTENSIVE' | 'SPECIFIC_INTENSIVE'
  reps: number
  workDistance: number // km per rep
  workPacePercent: number // % of MP
  recoveryDistance: number // km (ACTIVE recovery, not rest!)
  recoveryPacePercent: number // % of MP
  totalWorkVolume: number // km
  description: string
}

/**
 * Generate Canova interval session
 * @param type - Extensive (long reps) or Intensive (short reps)
 * @param weekInPhase - For progression tracking
 * @returns Complete interval session
 */
export function getCanovaIntervals(
  type: 'SPECIFIC_EXTENSIVE' | 'SPECIFIC_INTENSIVE',
  weekInPhase: number
): CanovaIntervalSession {
  if (type === 'SPECIFIC_EXTENSIVE') {
    // Long reps, Extension Principle: 4x5k → 5x5k → 4x6k
    const progressionOptions = [
      { reps: 4, work: 5, pace: 100 },  // Week 1-2
      { reps: 5, work: 5, pace: 100 },  // Week 3-4
      { reps: 4, work: 6, pace: 100 },  // Week 5-6
      { reps: 5, work: 6, pace: 100 },  // Week 7+
    ]
    const option = progressionOptions[Math.min(Math.floor(weekInPhase / 2), 3)]

    return {
      type: 'SPECIFIC_EXTENSIVE',
      reps: option.reps,
      workDistance: option.work,
      workPacePercent: option.pace,
      recoveryDistance: 1.0,  // ACTIVE recovery!
      recoveryPacePercent: 85,  // 85% MP, not easy jog
      totalWorkVolume: option.reps * option.work,
      description: `${option.reps} × ${option.work}km @ MP with 1km active recovery @ 85% MP`
    }
  } else {
    // Short reps, higher intensity
    const progressionOptions = [
      { reps: 8, work: 1, pace: 103 },   // Week 1-2
      { reps: 10, work: 1, pace: 103 },  // Week 3-4
      { reps: 12, work: 1, pace: 105 },  // Week 5+
    ]
    const option = progressionOptions[Math.min(Math.floor(weekInPhase / 2), 2)]

    return {
      type: 'SPECIFIC_INTENSIVE',
      reps: option.reps,
      workDistance: option.work,
      workPacePercent: option.pace,
      recoveryDistance: 0.4,  // 400m active
      recoveryPacePercent: 90,
      totalWorkVolume: option.reps * option.work,
      description: `${option.reps} × ${option.work}km @ ${option.pace}% MP with 400m recovery @ 90% MP`
    }
  }
}

/**
 * Select appropriate Canova workout for the week
 * @param phase - Current phase
 * @param weekInPhase - Week number within phase
 * @param dayType - Type of training day
 * @returns Workout type
 */
export function selectCanovaWorkout(
  phase: CanovaPhase,
  weekInPhase: number,
  dayType: 'QUALITY_1' | 'QUALITY_2' | 'LONG' | 'EASY' | 'REGENERATION'
): string {
  // Quality 1: Primary quality session
  if (dayType === 'QUALITY_1') {
    switch (phase) {
      case 'GENERAL':
        return 'FUNDAMENTAL_CONTINUOUS'  // 20km @ 80% MP
      case 'FUNDAMENTAL':
        return 'GENERAL_ENDURANCE_INTERVALS'  // Aerobic threshold work
      case 'SPECIAL':
        return weekInPhase % 4 === 0 ? 'SPECIAL_BLOCK' : 'SPECIFIC_EXTENSIVE'
      case 'SPECIFIC':
        return weekInPhase % 3 === 0 ? 'SPECIAL_BLOCK' : 'SPECIFIC_EXTENSIVE'
      default:
        return 'EASY'
    }
  }

  // Quality 2: Secondary quality session
  if (dayType === 'QUALITY_2') {
    switch (phase) {
      case 'GENERAL':
        return 'HILL_SPRINTS'  // 10-15s max effort, alactic
      case 'FUNDAMENTAL':
        return 'UPHILL_CIRCUITS'  // Mixed running, bounding, drills
      case 'SPECIAL':
        return 'SPECIFIC_INTENSIVE'  // Short intervals @ 105-110% MP
      case 'SPECIFIC':
        return 'SPECIFIC_INTENSIVE'
      default:
        return 'EASY'
    }
  }

  // Long run
  if (dayType === 'LONG') {
    switch (phase) {
      case 'GENERAL':
        return 'LONG_FUNDAMENTAL'  // 32km @ 80% MP
      case 'FUNDAMENTAL':
        return 'LONG_PROGRESSIVE'  // 35km progressive
      case 'SPECIAL':
        return 'LONG_ALTERNATING'  // 30km alternating pace
      case 'SPECIFIC':
        return 'SPECIFIC_LONG_RUN'  // 35km @ 95-98% MP
      default:
        return 'LONG_EASY'
    }
  }

  // Regeneration days after blocks
  if (dayType === 'REGENERATION') {
    return 'REGENERATION'  // Very slow, 60-70% AnT
  }

  return 'EASY'  // Default
}
