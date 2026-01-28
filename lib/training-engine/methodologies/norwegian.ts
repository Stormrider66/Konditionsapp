/**
 * Norwegian Methodology (Double Threshold Model)
 *
 * Based on training methods used by Norwegian elite middle and long-distance runners.
 *
 * Key Principles:
 * - Very high volume of low-intensity training (LIT) below LT1
 * - Twice-weekly threshold sessions at LT2 (4.0 mmol/L)
 * - Lactate-controlled intensity (requires testing)
 * - Minimal moderate-intensity work
 * - High training frequency (often 10-12 sessions/week with doubles)
 *
 * Zone Distribution (3-zone model):
 * - Zone 1 (< LT1): 85-90%
 * - Zone 2 (LT1-LT2): 0-3%
 * - Zone 3 (> LT2): 10-12%
 *
 * CRITICAL Requirements:
 * - ADVANCED or ELITE athlete level
 * - Regular lactate testing (every 4-6 weeks minimum)
 * - High training volume capacity (60+ min/day)
 * - Excellent aerobic base (LT2 > 80% VO2max)
 *
 * References:
 * - Tønnessen, E., et al. (2014). The road to gold: Training and peaking characteristics.
 * - Ingham, S. A., et al. (2008). Physiological and performance effects.
 *
 * @module methodologies/norwegian
 */

import type { MethodologyConfig, WeeklyStructure, ZoneDistribution3 } from './types'
import { logger } from '@/lib/logger'

/**
 * Get Norwegian methodology configuration
 *
 * STRICT PREREQUISITES:
 * - Athlete level: ADVANCED or ELITE
 * - Lactate testing available
 * - LT2 > 80% of VO2max
 * - High training volume tolerance
 *
 * @param weeklySessionCount - Number of sessions per week (8-12 recommended)
 * @returns Complete Norwegian methodology configuration
 */
export function getNorwegianConfig(weeklySessionCount: number = 10): MethodologyConfig {
  // Norwegian method requires high frequency
  const sessions = Math.max(8, Math.min(14, weeklySessionCount))

  // Double threshold sessions (2x per week)
  const doubleThresholdDays = 2
  const qualitySessions = doubleThresholdDays // May add 1 VO2max session occasionally

  // Remaining sessions are easy
  const easyRuns = sessions - qualitySessions - 1 // -1 for long run
  const restDays = Math.max(0, 7 - Math.ceil(sessions / 1.5)) // Account for double days

  const weeklyStructure: WeeklyStructure = {
    totalSessions: sessions,
    easyRuns,
    qualitySessions,
    longRun: true,
    doubleThresholdDays,
    restDays,
  }

  const zoneDistribution3: ZoneDistribution3 = {
    zone1Percent: 87.5, // Very high easy volume
    zone2Percent: 1,    // Almost zero moderate work
    zone3Percent: 11.5, // Threshold-focused
  }

  return {
    type: 'NORWEGIAN',
    name: 'Norwegian Method (Double Threshold)',
    description: 'Elite-level training with very high easy volume and lactate-controlled threshold sessions. Requires advanced fitness and testing.',
    zoneDistribution3,
    weeklyStructure,
    minWeeklySessions: 8,
    maxWeeklySessions: 14,
    requiresLactateTest: true, // MANDATORY
    targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON'],
    minAthleteLevel: 'ADVANCED', // STRICT requirement
    deloadFrequencyWeeks: 4, // Norwegian method uses 3:1 or 4:1 patterns
    volumeReductionPercent: 30, // Significant reduction on deload
    strengths: [
      'Proven effective for elite Norwegian runners',
      'Maximizes aerobic development with high LIT volume',
      'Lactate-controlled threshold work ensures precision',
      'Double threshold sessions build exceptional endurance',
      'Minimal injury risk from avoiding grey zone',
      'High training frequency promotes adaptation',
    ],
    limitations: [
      'REQUIRES lactate testing - not optional',
      'Only suitable for ADVANCED/ELITE athletes',
      'Very high time commitment (10-12+ hours/week)',
      'Requires excellent aerobic base (LT2 > 80% VO2max)',
      'Double days require flexible schedule',
      'Readiness must be HIGH for threshold sessions',
      'Not beginner-friendly - high injury risk if prerequisites not met',
    ],
  }
}

/**
 * Get Norwegian Single methodology configuration
 *
 * More accessible variant without double days (AM/PM sessions)
 * Still requires 2x weekly threshold sessions but as single daily workouts
 *
 * PREREQUISITES:
 * - Athlete level: ADVANCED or ELITE
 * - Lactate testing available
 * - LT2 > 75% of VO2max (slightly lower than doubles)
 * - Moderate-high training volume tolerance
 *
 * @param weeklySessionCount - Number of sessions per week (6-8 recommended)
 * @returns Complete Norwegian Single methodology configuration
 */
export function getNorwegianSingleConfig(weeklySessionCount: number = 6): MethodologyConfig {
  // Norwegian Single requires fewer sessions than doubles
  const sessions = Math.max(5, Math.min(8, weeklySessionCount))

  // Still 2x threshold sessions per week (the core principle)
  const qualitySessions = 2

  // Remaining sessions are easy
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
    zone1Percent: 87.5, // Very high easy volume (same as doubles)
    zone2Percent: 1,    // Almost zero moderate work
    zone3Percent: 11.5, // Threshold-focused
  }

  return {
    type: 'NORWEGIAN_SINGLE',
    name: 'Norwegian Method (Single Sessions)',
    description: 'Accessible Norwegian training with 2x weekly threshold sessions without AM/PM doubles. Requires lactate testing.',
    zoneDistribution3,
    weeklyStructure,
    minWeeklySessions: 5,
    maxWeeklySessions: 8,
    requiresLactateTest: true, // Still MANDATORY
    targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON'],
    minAthleteLevel: 'ADVANCED',
    deloadFrequencyWeeks: 4,
    volumeReductionPercent: 30,
    strengths: [
      'Core Norwegian principle (2x weekly threshold) without doubles',
      'More accessible schedule - no AM/PM sessions required',
      'Maximizes aerobic development with high LIT volume',
      'Lactate-controlled threshold work ensures precision',
      'Proven effective for elite runners',
      'Lower time commitment than doubles (6-8 hours/week)',
      'Still maintains Norwegian zone distribution',
    ],
    limitations: [
      'REQUIRES lactate testing - not optional',
      'Only suitable for ADVANCED/ELITE athletes',
      'Requires excellent aerobic base (LT2 > 75% VO2max)',
      'Readiness must be HIGH for threshold sessions',
      'Not beginner-friendly',
      'Less total volume than Norwegian doubles',
    ],
  }
}

/**
 * Validate if athlete meets Norwegian method prerequisites
 *
 * @param athleteData - Athlete's physiological and training data
 * @returns Validation result with specific issues
 */
export function validateNorwegianPrerequisites(athleteData: {
  level: 'BEGINNER' | 'RECREATIONAL' | 'ADVANCED' | 'ELITE'
  lt2PercentOfVO2max: number
  hasLactateTesting: boolean
  weeklyTrainingMinutes: number
  trainingExperienceYears: number
}): {
  eligible: boolean
  met: string[]
  missing: string[]
  warnings: string[]
} {
  const met: string[] = []
  const missing: string[] = []
  const warnings: string[] = []

  // Check 1: Athlete level
  if (athleteData.level === 'ADVANCED' || athleteData.level === 'ELITE') {
    met.push(`Athlete level: ${athleteData.level}`)
  } else {
    missing.push(`REQUIRED: ADVANCED or ELITE level (current: ${athleteData.level})`)
    missing.push('Norwegian method is NOT suitable for beginners or recreational athletes')
  }

  // Check 2: Lactate testing
  if (athleteData.hasLactateTesting) {
    met.push('Lactate testing available')
  } else {
    missing.push('REQUIRED: Regular lactate testing (every 4-6 weeks minimum)')
    missing.push('Norwegian method requires precise LT2 determination at 4.0 mmol/L')
  }

  // Check 3: LT2 as % of VO2max
  if (athleteData.lt2PercentOfVO2max >= 80) {
    met.push(`LT2 at ${athleteData.lt2PercentOfVO2max.toFixed(1)}% of VO2max (excellent aerobic base)`)
  } else {
    missing.push(`REQUIRED: LT2 > 80% of VO2max (current: ${athleteData.lt2PercentOfVO2max.toFixed(1)}%)`)
    missing.push('Build aerobic base with Polarized training before attempting Norwegian method')
  }

  // Check 4: Training volume capacity
  if (athleteData.weeklyTrainingMinutes >= 420) {
    // 7+ hours/week
    met.push(`Sufficient training volume capacity (${Math.round(athleteData.weeklyTrainingMinutes / 60)} hours/week)`)
  } else {
    missing.push(`REQUIRED: Ability to train 7+ hours/week (current: ${Math.round(athleteData.weeklyTrainingMinutes / 60)} hours)`)
    warnings.push('Norwegian method requires high training volume - build up gradually')
  }

  // Check 5: Training experience
  if (athleteData.trainingExperienceYears >= 3) {
    met.push(`Sufficient training experience (${athleteData.trainingExperienceYears} years)`)
  } else {
    warnings.push(`Limited training experience (${athleteData.trainingExperienceYears} years) - consider 5+ years before Norwegian method`)
    warnings.push('Build solid aerobic base and technique before high-volume training')
  }

  const eligible = missing.length === 0

  if (!eligible) {
    warnings.push('🚨 STRONG RECOMMENDATION: Use Polarized training to build prerequisites first')
    warnings.push('Norwegian method has high injury risk if prerequisites not met')
  }

  return {
    eligible,
    met,
    missing,
    warnings,
  }
}

/**
 * Calculate lactate-controlled threshold session intensity
 *
 * Norwegian method uses 4.0 mmol/L as target lactate for threshold sessions
 *
 * @param lt2Intensity - Speed/power at LT2 (4.0 mmol/L)
 * @param sessionType - Type of threshold session
 * @returns Target intensity range
 */
export function calculateThresholdIntensity(
  lt2Intensity: number,
  sessionType: 'CONTINUOUS' | 'INTERVALS'
): {
  min: number
  max: number
  lactateTarget: number
  duration: number // minutes
} {
  if (sessionType === 'CONTINUOUS') {
    // Continuous threshold: 20-40 min at LT2
    return {
      min: lt2Intensity * 0.98,
      max: lt2Intensity * 1.02,
      lactateTarget: 4.0,
      duration: 30, // Typical: 30 min
    }
  } else {
    // Threshold intervals: 5-8 x 5-8 min at LT2
    return {
      min: lt2Intensity * 0.98,
      max: lt2Intensity * 1.05,
      lactateTarget: 4.0,
      duration: 6, // Per interval
    }
  }
}

/**
 * Norwegian Double Threshold Session Types (DOUBLES - Elite)
 *
 * AM Sessions (Long Intervals - Low Zone 2: 2.0-3.0 mmol/L):
 * - Focus on sustained time-under-tension
 * - Longer work intervals (2km, 3km, 5-6 min)
 * - Fixed 60-second rest
 * - Total work time: 25-35 minutes
 * - Acts as metabolic primer for PM session
 *
 * PM Sessions (Short Intervals - High Zone 2: 3.0-4.0 mmol/L):
 * - Focus on speed density and high-end aerobic power
 * - Shorter work intervals (400m, 1km, 90s)
 * - Very short rest (15-60 seconds)
 * - Total work time: 20-30 minutes
 * - Benefits from AM priming
 */
export type NorwegianDoublesSessionType =
  // AM Sessions (Low Zone 2: 2.0-3.0 mmol/L)
  | 'AM_5x2K'      // 5 × 2km, 60s rest (classic AM session)
  | 'AM_4x3K'      // 4 × 3km, 60s rest
  | 'AM_5x6MIN'    // 5 × 6 min, 60s rest
  | 'AM_6x5MIN'    // 6 × 5 min, 60s rest
  // PM Sessions (High Zone 2: 3.0-4.0 mmol/L)
  | 'PM_10x1K'     // 10 × 1km, 60s rest
  | 'PM_25x400'    // 25 × 400m, 30s rest (high density)
  | 'PM_16x90S'    // 16 × 90 seconds, 30s rest (micro-intervals)
  | 'PM_20x60S'    // 20 × 60 seconds, 15s rest (very high density)

/**
 * Norwegian Singles Sub-Threshold Session Types (SINGLES - Recreational)
 *
 * Distance-based intervals used in Norwegian Singles training:
 * - 6-8 x 1000m: Short intervals at 10K-15K pace
 * - 4-5 x 2000m: Medium intervals at half marathon pace
 * - 3 x 3000m: Long intervals at 25K-30K pace
 * - 10-12 x 3min: Time-based short intervals
 * - 6-8 x 5-6min: Time-based medium intervals
 * - 3-4 x 10-12min: Time-based long intervals
 *
 * All at SUB-threshold (2.3-3.0 mmol/L lactate, NOT 4.0!)
 * Rest: 60-90 seconds between intervals (shorter than doubles)
 */
export type NorwegianSinglesSessionType =
  | '6x1K'      // 6-8 x 1000m at 10K-15K pace, 60s rest
  | '8x1K'      // 8-10 x 1000m progression
  | '4x2K'      // 4-5 x 2000m at HM pace, 75-90s rest
  | '5x2K'      // 5-6 x 2000m progression
  | '3x3K'      // 3 x 3000m at 25K-30K pace, 90-120s rest
  | '10x3MIN'   // 10-12 x 3 minutes at 15K pace, 60s rest
  | '6x5MIN'    // 6-8 x 5-6 minutes at 10-mile pace, 60s rest
  | '3x10MIN'   // 3-4 x 10-12 minutes at HM-30K pace, 90-120s rest

/**
 * Calculate Norwegian Doubles training intensity from actual lactate test data
 *
 * Norwegian Doubles trains in two distinct zones:
 * - AM: 2.0-3.0 mmol/L (Low Zone 2 - metabolic primer)
 * - PM: 3.0-4.0 mmol/L (High Zone 2 - speed density, up to LT2)
 *
 * @param testStages - Test stages with lactate measurements
 * @param anaerobicThreshold - The athlete's measured anaerobic threshold (LT2)
 * @returns Intensity targets for AM and PM sessions
 */
export function calculateNorwegianDoublesIntensity(
  testStages: any[],
  anaerobicThreshold: { lactate: number; value: number; heartRate: number; unit: string }
): {
  am: {
    targetLactateLow: number
    targetLactateHigh: number
    paceLow: number
    paceHigh: number
    hrLow: number
    hrHigh: number
  }
  pm: {
    targetLactateLow: number
    targetLactateHigh: number
    paceLow: number
    paceHigh: number
    hrLow: number
    hrHigh: number
  }
  unit: string
} {
  // AM target: 2.0-3.0 mmol/L (Low Zone 2)
  const amTargetLow = 2.0
  const amTargetHigh = 3.0

  // PM target: 3.0-4.0 mmol/L (High Zone 2, up to LT2)
  const pmTargetLow = 3.0
  const pmTargetHigh = Math.min(4.0, anaerobicThreshold.lactate) // Don't exceed LT2

  logger.debug('Norwegian Doubles intensity targets', {
    lt2Lactate: anaerobicThreshold.lactate,
    amTarget: { low: amTargetLow, high: amTargetHigh, zone: 'Low Zone 2' },
    pmTarget: { low: pmTargetLow, high: pmTargetHigh, zone: 'High Zone 2' }
  })

  // Find stages around target lactate values for interpolation
  const sortedStages = [...testStages].sort((a, b) => a.lactate - b.lactate)

  // Helper function to interpolate between stages
  function interpolateLactate(targetLactate: number) {
    let belowStage = sortedStages[0]
    let aboveStage = sortedStages[sortedStages.length - 1]

    for (let i = 0; i < sortedStages.length - 1; i++) {
      if (sortedStages[i].lactate <= targetLactate && sortedStages[i + 1].lactate >= targetLactate) {
        belowStage = sortedStages[i]
        aboveStage = sortedStages[i + 1]
        break
      }
    }

    const lactateDiff = aboveStage.lactate - belowStage.lactate
    if (lactateDiff === 0) {
      return {
        pace: belowStage.speed || belowStage.power || belowStage.pace,
        hr: belowStage.heartRate
      }
    }

    const factor = (targetLactate - belowStage.lactate) / lactateDiff

    const pace = (belowStage.speed || belowStage.power || belowStage.pace) +
                 factor * ((aboveStage.speed || aboveStage.power || aboveStage.pace) -
                          (belowStage.speed || belowStage.power || belowStage.pace))
    const hr = belowStage.heartRate + factor * (aboveStage.heartRate - belowStage.heartRate)

    return { pace, hr }
  }

  // Calculate AM intensities
  const amLow = interpolateLactate(amTargetLow)
  const amHigh = interpolateLactate(amTargetHigh)

  // Calculate PM intensities
  const pmLow = interpolateLactate(pmTargetLow)
  const pmHigh = interpolateLactate(pmTargetHigh)

  logger.debug('Norwegian Doubles calculated intensities', {
    am: { paceLow: amLow.pace, paceHigh: amHigh.pace, hrLow: Math.round(amLow.hr), hrHigh: Math.round(amHigh.hr) },
    pm: { paceLow: pmLow.pace, paceHigh: pmHigh.pace, hrLow: Math.round(pmLow.hr), hrHigh: Math.round(pmHigh.hr) },
    unit: anaerobicThreshold.unit
  })

  return {
    am: {
      targetLactateLow: amTargetLow,
      targetLactateHigh: amTargetHigh,
      paceLow: amLow.pace,
      paceHigh: amHigh.pace,
      hrLow: Math.round(amLow.hr),
      hrHigh: Math.round(amHigh.hr),
    },
    pm: {
      targetLactateLow: pmTargetLow,
      targetLactateHigh: pmTargetHigh,
      paceLow: pmLow.pace,
      paceHigh: pmHigh.pace,
      hrLow: Math.round(pmLow.hr),
      hrHigh: Math.round(pmHigh.hr),
    },
    unit: anaerobicThreshold.unit
  }
}

/**
 * Calculate Norwegian Singles training intensity from actual lactate test data
 *
 * Norwegian Singles trains at 0.7-1.7 mmol/L BELOW the athlete's measured LT2
 * For example: If LT2 is at 4.0 mmol/L, train at 2.3-3.3 mmol/L
 *
 * @param testStages - Test stages with lactate measurements
 * @param anaerobicThreshold - The athlete's measured anaerobic threshold (LT2)
 * @returns Target lactate range and corresponding pace/HR for Norwegian Singles
 */
export function calculateNorwegianSinglesIntensity(
  testStages: any[],
  anaerobicThreshold: { lactate: number; value: number; heartRate: number; unit: string }
): {
  targetLactateLow: number  // Lower bound (LT2 - 1.7)
  targetLactateHigh: number // Upper bound (LT2 - 0.7)
  paceLow: number          // Pace/power at lower lactate
  paceHigh: number         // Pace/power at upper lactate
  hrLow: number            // HR at lower lactate
  hrHigh: number           // HR at upper lactate
  unit: string
} {
  // Calculate target lactate range: LT2 - 0.7 to LT2 - 1.7 mmol/L
  const targetLactateHigh = anaerobicThreshold.lactate - 0.7  // Upper bound (closer to threshold)
  const targetLactateLow = anaerobicThreshold.lactate - 1.7   // Lower bound (further from threshold)

  logger.debug('Norwegian Singles intensity targets', {
    lt2Lactate: anaerobicThreshold.lactate,
    targetLactate: { low: targetLactateLow, high: targetLactateHigh }
  })

  // Find stages around target lactate values for interpolation
  const sortedStages = [...testStages].sort((a, b) => a.lactate - b.lactate)

  // Helper function to interpolate between stages
  function interpolateLactate(targetLactate: number) {
    // Find stages immediately below and above target lactate
    let belowStage = sortedStages[0]
    let aboveStage = sortedStages[sortedStages.length - 1]

    for (let i = 0; i < sortedStages.length - 1; i++) {
      if (sortedStages[i].lactate <= targetLactate && sortedStages[i + 1].lactate >= targetLactate) {
        belowStage = sortedStages[i]
        aboveStage = sortedStages[i + 1]
        break
      }
    }

    // Linear interpolation
    const lactateDiff = aboveStage.lactate - belowStage.lactate
    if (lactateDiff === 0) {
      return {
        pace: belowStage.speed || belowStage.power || belowStage.pace,
        hr: belowStage.heartRate
      }
    }

    const factor = (targetLactate - belowStage.lactate) / lactateDiff

    const pace = (belowStage.speed || belowStage.power || belowStage.pace) +
                 factor * ((aboveStage.speed || aboveStage.power || aboveStage.pace) -
                          (belowStage.speed || belowStage.power || belowStage.pace))
    const hr = belowStage.heartRate + factor * (aboveStage.heartRate - belowStage.heartRate)

    return { pace, hr }
  }

  const lowIntensity = interpolateLactate(targetLactateLow)
  const highIntensity = interpolateLactate(targetLactateHigh)

  logger.debug('Norwegian Singles calculated intensities', {
    paceLow: lowIntensity.pace,
    paceHigh: highIntensity.pace,
    hrLow: Math.round(lowIntensity.hr),
    hrHigh: Math.round(highIntensity.hr),
    unit: anaerobicThreshold.unit
  })

  return {
    targetLactateLow,
    targetLactateHigh,
    paceLow: lowIntensity.pace,
    paceHigh: highIntensity.pace,
    hrLow: Math.round(lowIntensity.hr),
    hrHigh: Math.round(highIntensity.hr),
    unit: anaerobicThreshold.unit
  }
}

/**
 * Get Norwegian Singles sub-threshold session details
 * These sessions run at 2.3-3.0 mmol/L (SUB-threshold) with distance-based intervals
 */
export function getNorwegianSinglesSession(
  type: NorwegianSinglesSessionType
): {
  reps: number
  work: number // For distance: km, for time: minutes
  rest: number // seconds
  workType: 'distance' | 'time'
  description: string
  targetPace: string
} {
  switch (type) {
    case '6x1K':
      return {
        reps: 6,
        work: 1.0, // km
        rest: 60, // seconds
        workType: 'distance',
        description: '6 × 1000m på 10K-15K-tempo (85-88% av 5K-tempo)',
        targetPace: '10K-15K pace (sub-threshold 2.3-3.0 mmol/L)',
      }
    case '8x1K':
      return {
        reps: 8,
        work: 1.0,
        rest: 60,
        workType: 'distance',
        description: '8 × 1000m på 10K-15K-tempo',
        targetPace: '10K-15K pace (sub-threshold 2.3-3.0 mmol/L)',
      }
    case '4x2K':
      return {
        reps: 4,
        work: 2.0,
        rest: 75,
        workType: 'distance',
        description: '4 × 2000m på halvmaratons-tempo (83-86% av 5K-tempo)',
        targetPace: 'Half marathon pace (sub-threshold 2.3-3.0 mmol/L)',
      }
    case '5x2K':
      return {
        reps: 5,
        work: 2.0,
        rest: 75,
        workType: 'distance',
        description: '5 × 2000m på halvmaratons-tempo',
        targetPace: 'Half marathon pace (sub-threshold 2.3-3.0 mmol/L)',
      }
    case '3x3K':
      return {
        reps: 3,
        work: 3.0,
        rest: 90,
        workType: 'distance',
        description: '3 × 3000m på 25K-30K-tempo (80-83% av 5K-tempo)',
        targetPace: '25K-30K pace (sub-threshold 2.3-3.0 mmol/L)',
      }
    case '10x3MIN':
      return {
        reps: 10,
        work: 3, // minutes
        rest: 60,
        workType: 'time',
        description: '10 × 3 min på 15K-tempo',
        targetPace: '15K pace (sub-threshold 2.3-3.0 mmol/L)',
      }
    case '6x5MIN':
      return {
        reps: 6,
        work: 5,
        rest: 60,
        workType: 'time',
        description: '6 × 5 min på 10-mils-tempo',
        targetPace: '10-mile pace (sub-threshold 2.3-3.0 mmol/L)',
      }
    case '3x10MIN':
      return {
        reps: 3,
        work: 10,
        rest: 90,
        workType: 'time',
        description: '3 × 10 min på halvmaratons-30K-tempo',
        targetPace: 'Half marathon to 30K pace (sub-threshold 2.3-3.0 mmol/L)',
      }
  }
}

/**
 * Select appropriate Norwegian Singles session type based on phase and week
 * Norwegian Singles uses 2-3 quality sessions per week with distance-based intervals
 */
export function selectNorwegianSinglesSessionType(
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  sessionNumber: 1 | 2 | 3 // Singles can have up to 3 sessions per week
): NorwegianSinglesSessionType {
  if (phase === 'BASE') {
    // Base phase: Build volume with standard rotation
    if (sessionNumber === 1) {
      return '6x1K' // Tuesday: Short intervals
    } else if (sessionNumber === 2) {
      return '4x2K' // Thursday: Medium intervals
    } else {
      return weekInPhase % 2 === 0 ? '3x3K' : '10x3MIN' // Saturday: Long or time-based
    }
  } else if (phase === 'BUILD') {
    // Build phase: Increase volume/reps
    if (sessionNumber === 1) {
      return weekInPhase < 3 ? '6x1K' : '8x1K' // Progress to more reps
    } else if (sessionNumber === 2) {
      return weekInPhase < 3 ? '4x2K' : '5x2K'
    } else {
      return '3x10MIN' // Longer time-based intervals
    }
  } else if (phase === 'PEAK') {
    // Peak phase: High quality with specific pace work
    if (sessionNumber === 1) {
      return '8x1K' // Fast turnover
    } else if (sessionNumber === 2) {
      return '5x2K' // Race-specific
    } else {
      return '6x5MIN' // Sustained effort
    }
  } else {
    // Taper: Reduced volume but maintain intensity
    if (sessionNumber === 1) {
      return '6x1K'
    } else {
      return '4x2K'
    }
    // Only 2 sessions in taper
  }
}

/**
 * Get Norwegian Doubles session details
 * Returns proper AM or PM session structure for elite double-threshold training
 */
export function getNorwegianDoublesSession(
  type: NorwegianDoublesSessionType
): {
  reps: number
  work: number // For distance: km, for time: minutes
  rest: number // seconds (not minutes!)
  workType: 'distance' | 'time'
  sessionTime: 'AM' | 'PM'
  targetLactate: string
  totalWorkTime: number // minutes
  description: string
} {
  switch (type) {
    // AM Sessions (Low Zone 2: 2.0-3.0 mmol/L)
    case 'AM_5x2K':
      return {
        reps: 5,
        work: 2.0,
        rest: 60,
        workType: 'distance',
        sessionTime: 'AM',
        targetLactate: '2.0-3.0 mmol/L',
        totalWorkTime: 30,
        description: 'Morgon: 5 × 2km på låg tröskel (2.0-3.0 mmol/L), 60s vila',
      }
    case 'AM_4x3K':
      return {
        reps: 4,
        work: 3.0,
        rest: 60,
        workType: 'distance',
        sessionTime: 'AM',
        targetLactate: '2.0-3.0 mmol/L',
        totalWorkTime: 32,
        description: 'Morgon: 4 × 3km på låg tröskel (2.0-3.0 mmol/L), 60s vila',
      }
    case 'AM_5x6MIN':
      return {
        reps: 5,
        work: 6,
        rest: 60,
        workType: 'time',
        sessionTime: 'AM',
        targetLactate: '2.0-3.0 mmol/L',
        totalWorkTime: 30,
        description: 'Morgon: 5 × 6 min på låg tröskel (2.0-3.0 mmol/L), 60s vila',
      }
    case 'AM_6x5MIN':
      return {
        reps: 6,
        work: 5,
        rest: 60,
        workType: 'time',
        sessionTime: 'AM',
        targetLactate: '2.0-3.0 mmol/L',
        totalWorkTime: 30,
        description: 'Morgon: 6 × 5 min på låg tröskel (2.0-3.0 mmol/L), 60s vila',
      }

    // PM Sessions (High Zone 2: 3.0-4.0 mmol/L)
    case 'PM_10x1K':
      return {
        reps: 10,
        work: 1.0,
        rest: 60,
        workType: 'distance',
        sessionTime: 'PM',
        targetLactate: '3.0-4.0 mmol/L',
        totalWorkTime: 30,
        description: 'Kväll: 10 × 1km på hög tröskel (3.0-4.0 mmol/L), 60s vila',
      }
    case 'PM_25x400':
      return {
        reps: 25,
        work: 0.4,
        rest: 30,
        workType: 'distance',
        sessionTime: 'PM',
        targetLactate: '3.0-4.0 mmol/L',
        totalWorkTime: 30,
        description: 'Kväll: 25 × 400m på hög tröskel (3.0-4.0 mmol/L), 30s vila (hög densitet)',
      }
    case 'PM_16x90S':
      return {
        reps: 16,
        work: 1.5, // 90 seconds = 1.5 minutes
        rest: 30,
        workType: 'time',
        sessionTime: 'PM',
        targetLactate: '3.0-4.0 mmol/L',
        totalWorkTime: 24,
        description: 'Kväll: 16 × 90s på hög tröskel (3.0-4.0 mmol/L), 30s vila (mikrointervaller)',
      }
    case 'PM_20x60S':
      return {
        reps: 20,
        work: 1.0, // 60 seconds = 1 minute
        rest: 15,
        workType: 'time',
        sessionTime: 'PM',
        targetLactate: '3.0-4.0 mmol/L',
        totalWorkTime: 20,
        description: 'Kväll: 20 × 60s på hög tröskel (3.0-4.0 mmol/L), 15s vila (mycket hög densitet)',
      }
  }
}

/**
 * Select appropriate Norwegian Doubles session for AM or PM
 * Returns properly structured double-threshold sessions
 */
export function selectNorwegianDoublesSession(
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER',
  weekInPhase: number,
  sessionTime: 'AM' | 'PM'
): NorwegianDoublesSessionType {
  if (sessionTime === 'AM') {
    // AM sessions: Long intervals at low Zone 2 (2.0-3.0 mmol/L)
    if (phase === 'BASE') {
      return weekInPhase % 2 === 0 ? 'AM_5x2K' : 'AM_5x6MIN'
    } else if (phase === 'BUILD') {
      return weekInPhase < 3 ? 'AM_5x2K' : 'AM_4x3K' // Progress to longer
    } else if (phase === 'PEAK') {
      return 'AM_6x5MIN' // High volume time-based
    } else {
      // Taper: Maintain but reduce
      return 'AM_5x6MIN'
    }
  } else {
    // PM sessions: Short intervals at high Zone 2 (3.0-4.0 mmol/L)
    if (phase === 'BASE') {
      return 'PM_10x1K' // Classic PM session
    } else if (phase === 'BUILD') {
      return weekInPhase < 3 ? 'PM_10x1K' : 'PM_16x90S' // Add micro-intervals
    } else if (phase === 'PEAK') {
      return weekInPhase % 2 === 0 ? 'PM_25x400' : 'PM_16x90S' // High density
    } else {
      // Taper: Shorter but maintain quality
      return 'PM_16x90S'
    }
  }
}

/**
 * Generate weekly session structure for Norwegian method
 *
 * Typical week:
 * - Monday: Easy AM + Threshold PM
 * - Tuesday: Easy
 * - Wednesday: Easy AM + Threshold PM
 * - Thursday: Easy
 * - Friday: Easy
 * - Saturday: Easy
 * - Sunday: Long Run
 *
 * @param weeklySessionCount - Total sessions per week
 * @returns Array of session types with timing
 */
export function generateNorwegianWeek(weeklySessionCount: number): Array<{
  day: string
  session: string
  timing: 'AM' | 'PM' | 'SINGLE'
}> {
  const week: Array<{ day: string; session: string; timing: 'AM' | 'PM' | 'SINGLE' }> = []

  // Core structure: 2 threshold days (Monday, Wednesday)
  week.push({ day: 'Monday', session: 'EASY_RUN', timing: 'AM' })
  week.push({ day: 'Monday', session: 'THRESHOLD_SESSION', timing: 'PM' })
  week.push({ day: 'Tuesday', session: 'EASY_RUN', timing: 'SINGLE' })
  week.push({ day: 'Wednesday', session: 'EASY_RUN', timing: 'AM' })
  week.push({ day: 'Wednesday', session: 'THRESHOLD_SESSION', timing: 'PM' })
  week.push({ day: 'Thursday', session: 'EASY_RUN', timing: 'SINGLE' })
  week.push({ day: 'Friday', session: 'EASY_RUN', timing: 'SINGLE' })
  week.push({ day: 'Saturday', session: 'EASY_RUN', timing: 'SINGLE' })
  week.push({ day: 'Sunday', session: 'LONG_RUN', timing: 'SINGLE' })

  // Add extra sessions if needed (high-frequency variant)
  if (weeklySessionCount > 9) {
    week.push({ day: 'Tuesday', session: 'EASY_RUN', timing: 'PM' })
  }
  if (weeklySessionCount > 10) {
    week.push({ day: 'Thursday', session: 'EASY_RUN', timing: 'PM' })
  }
  if (weeklySessionCount > 11) {
    week.push({ day: 'Saturday', session: 'EASY_RUN', timing: 'PM' })
  }

  return week.slice(0, weeklySessionCount)
}

/**
 * Generate Norwegian Single training week
 *
 * Single daily sessions (no AM/PM doubles)
 * Core structure: 2 threshold sessions per week
 * - Tuesday: Threshold session
 * - Thursday: Threshold session
 * - Sunday: Long Run
 * - Remaining days: Easy runs
 *
 * @param weeklySessionCount - Total sessions per week (5-8)
 * @returns Array of session types (all SINGLE timing)
 */
export function generateNorwegianSingleWeek(weeklySessionCount: number): Array<{
  day: string
  session: string
  timing: 'SINGLE'
}> {
  const week: Array<{ day: string; session: string; timing: 'SINGLE' }> = []

  // Core structure: 2 threshold days (Tuesday, Thursday)
  // Spaced 48 hours apart for recovery
  week.push({ day: 'Tuesday', session: 'THRESHOLD_SESSION', timing: 'SINGLE' })
  week.push({ day: 'Thursday', session: 'THRESHOLD_SESSION', timing: 'SINGLE' })
  week.push({ day: 'Sunday', session: 'LONG_RUN', timing: 'SINGLE' })

  // Fill remaining sessions with easy runs
  if (weeklySessionCount >= 4) {
    week.push({ day: 'Monday', session: 'EASY_RUN', timing: 'SINGLE' })
  }
  if (weeklySessionCount >= 5) {
    week.push({ day: 'Wednesday', session: 'EASY_RUN', timing: 'SINGLE' })
  }
  if (weeklySessionCount >= 6) {
    week.push({ day: 'Friday', session: 'EASY_RUN', timing: 'SINGLE' })
  }
  if (weeklySessionCount >= 7) {
    week.push({ day: 'Saturday', session: 'EASY_RUN', timing: 'SINGLE' })
  }
  if (weeklySessionCount >= 8) {
    // Add another easy day if needed
    week.push({ day: 'Wednesday', session: 'EASY_RUN', timing: 'SINGLE' })
  }

  // Sort by day of week
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  week.sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day))

  return week.slice(0, weeklySessionCount)
}

/**
 * Get Norwegian training intensity guidelines
 *
 * Emphasizes strict adherence to LT1 and LT2 boundaries
 *
 * @returns Intensity descriptions for each zone
 */
export function getNorwegianIntensityGuidelines(): {
  zone1: string
  zone2: string
  zone3: string
  readinessRequirements: string
} {
  return {
    zone1: 'LOW INTENSITY TRAINING (LIT) - Heart rate well below LT1 (<2.0 mmol/L lactate). Conversational. RPE 2-3/10. This is the foundation of Norwegian training - volume is key.',
    zone2: 'AVOID THIS ZONE - Norwegian method minimizes moderate intensity. If using Zone 2, it should be brief and controlled (e.g., warm-up progression).',
    zone3: 'THRESHOLD SESSIONS - Precisely at LT2 (4.0 mmol/L lactate). 2x per week. Requires HIGH readiness. If readiness is suboptimal, replace with LIT.',
    readinessRequirements: 'CRITICAL: Norwegian threshold sessions require HIGH readiness (HRV >90% baseline, wellness >8/10). When readiness is low, substitute threshold session with additional LIT.',
  }
}

/**
 * Check if readiness is sufficient for Norwegian threshold session
 *
 * @param readinessScore - Composite readiness score (0-10)
 * @param hrvStatus - HRV assessment status
 * @returns Decision on whether to proceed with threshold session
 */
export function shouldProceedWithThreshold(
  readinessScore: number,
  hrvStatus?: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'FAIR' | 'POOR' | 'VERY_POOR'
): {
  proceed: boolean
  recommendation: string
  alternativeSession: string
} {
  // Norwegian method requires high readiness for quality work
  const thresholdReadiness = 7.0

  if (readinessScore >= thresholdReadiness && (!hrvStatus || hrvStatus === 'EXCELLENT' || hrvStatus === 'GOOD')) {
    return {
      proceed: true,
      recommendation: 'Readiness is sufficient - proceed with threshold session',
      alternativeSession: '',
    }
  }

  if (readinessScore >= 6.0 && readinessScore < thresholdReadiness) {
    return {
      proceed: false,
      recommendation: 'Readiness is moderate - replace threshold with easy aerobic work',
      alternativeSession: 'EASY_RUN (60-90 min at LIT pace)',
    }
  }

  return {
    proceed: false,
    recommendation: 'Readiness is low - rest day or very easy recovery',
    alternativeSession: 'REST or RECOVERY_RUN (30-45 min very easy)',
  }
}
