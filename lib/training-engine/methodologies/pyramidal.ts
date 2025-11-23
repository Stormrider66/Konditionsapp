/**
 * Pyramidal Distribution Model
 *
 * Traditional balanced training intensity distribution with gradual progression
 * from easy to hard zones.
 *
 * Key Principles:
 * - Balanced distribution across all intensities
 * - Largest volume at easy pace, progressively less at higher intensities
 * - More moderate-intensity work than Polarized
 * - Gradual intensity progression (pyramid shape)
 *
 * Zone Distribution (3-zone model):
 * - Zone 1 (< LT1): 70-75%
 * - Zone 2 (LT1-LT2): 15-20%
 * - Zone 3 (> LT2): 10-12%
 *
 * Zone Distribution (5-zone model):
 * - Zone 1: 40%
 * - Zone 2: 30%
 * - Zone 3: 15%
 * - Zone 4: 10%
 * - Zone 5: 5%
 *
 * Best For:
 * - Recreational to advanced athletes
 * - Athletes transitioning from casual running to structured training
 * - Those who prefer more moderate-intensity work
 * - Time-crunched athletes (tempo runs are time-efficient)
 *
 * References:
 * - Esteve-Lanao, J., et al. (2007). Impact of training intensity distribution.
 * - Traditional coaching methods used by many club-level programs
 *
 * @module methodologies/pyramidal
 */

import type { MethodologyConfig, WeeklyStructure, ZoneDistribution3, ZoneDistribution5 } from './types'

/**
 * Get Pyramidal methodology configuration
 *
 * Suitable for: RECREATIONAL to ADVANCED athletes
 * Prerequisites: None (accessible to most athletes)
 *
 * @param weeklySessionCount - Number of sessions per week (4-8)
 * @returns Complete Pyramidal methodology configuration
 */
export function getPyramidalConfig(weeklySessionCount: number = 5): MethodologyConfig {
  const sessions = Math.max(4, Math.min(8, weeklySessionCount))

  // Pyramidal typically has 1-2 quality sessions + 1 tempo run
  const qualitySessions = sessions <= 5 ? 1 : 2
  const tempoRuns = 1 // Characteristic of pyramidal
  const easyRuns = sessions - qualitySessions - tempoRuns - 1 // -1 for long run
  const restDays = 7 - sessions

  const weeklyStructure: WeeklyStructure = {
    totalSessions: sessions,
    easyRuns: Math.max(0, easyRuns),
    qualitySessions: qualitySessions + tempoRuns,
    longRun: true,
    restDays,
  }

  const zoneDistribution3: ZoneDistribution3 = {
    zone1Percent: 72,  // Easy aerobic
    zone2Percent: 18,  // Tempo/threshold (more than Polarized)
    zone3Percent: 10,  // High-intensity intervals
  }

  const zoneDistribution5: ZoneDistribution5 = {
    zone1Percent: 40,  // Recovery/very easy
    zone2Percent: 30,  // Easy aerobic
    zone3Percent: 15,  // Tempo
    zone4Percent: 10,  // Threshold
    zone5Percent: 5,   // VO2max/race pace
  }

  return {
    type: 'PYRAMIDAL',
    name: 'Pyramidal Distribution',
    description: 'Balanced training with gradual intensity progression. More moderate-intensity work than Polarized. Good for recreational athletes.',
    zoneDistribution3,
    zoneDistribution5,
    weeklyStructure,
    minWeeklySessions: 4,
    maxWeeklySessions: 8,
    requiresLactateTest: false,
    targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON', 'GENERAL_FITNESS'],
    minAthleteLevel: 'RECREATIONAL', // More accessible than Norwegian/Canova
    deloadFrequencyWeeks: 3, // Standard 3:1 pattern
    volumeReductionPercent: 20, // Moderate reduction
    strengths: [
      'Balanced distribution feels natural to many athletes',
      'Tempo runs are time-efficient (good for busy schedules)',
      'Moderate-intensity work builds mental toughness',
      'Gradual progression reduces shock to system',
      'Works well for recreational to advanced athletes',
      'Familiar structure (similar to many commercial training plans)',
    ],
    limitations: [
      'May not optimize adaptations as well as Polarized',
      'More time in "grey zone" (Zone 2) - potential for overtraining',
      'Can be harder to recover from due to moderate-intensity work',
      'Not as proven for elite performance as Polarized or Norwegian',
      'Tempo runs can accumulate fatigue if not managed carefully',
    ],
  }
}

/**
 * Calculate weekly volume distribution for Pyramidal training
 *
 * @param totalWeeklyMinutes - Total training time for the week
 * @returns Time allocation by 5-zone model
 */
export function calculatePyramidalVolume(totalWeeklyMinutes: number): {
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
  zone4Minutes: number
  zone5Minutes: number
} {
  return {
    zone1Minutes: Math.round(totalWeeklyMinutes * 0.40),
    zone2Minutes: Math.round(totalWeeklyMinutes * 0.30),
    zone3Minutes: Math.round(totalWeeklyMinutes * 0.15),
    zone4Minutes: Math.round(totalWeeklyMinutes * 0.10),
    zone5Minutes: Math.round(totalWeeklyMinutes * 0.05),
  }
}

/**
 * Calculate weekly volume distribution using 3-zone model
 *
 * @param totalWeeklyMinutes - Total training time for the week
 * @returns Time allocation by 3-zone model
 */
export function calculatePyramidalVolume3Zone(totalWeeklyMinutes: number): {
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
} {
  return {
    zone1Minutes: Math.round(totalWeeklyMinutes * 0.72),
    zone2Minutes: Math.round(totalWeeklyMinutes * 0.18),
    zone3Minutes: Math.round(totalWeeklyMinutes * 0.10),
  }
}

/**
 * Validate if an athlete's training distribution follows Pyramidal principles
 *
 * @param actualDistribution - Actual training distribution from logs
 * @returns Validation result with feedback
 */
export function validatePyramidalDistribution(actualDistribution: ZoneDistribution5): {
  compliant: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check Zone 1 (should be 35-45%)
  if (actualDistribution.zone1Percent < 35) {
    issues.push(`Zone 1 too low: ${actualDistribution.zone1Percent}% (target 40%)`)
    recommendations.push('Increase recovery/very easy running volume')
  } else if (actualDistribution.zone1Percent > 45) {
    issues.push(`Zone 1 too high: ${actualDistribution.zone1Percent}% (target 40%)`)
    recommendations.push('May be too conservative - consider more quality work')
  }

  // Check Zone 2 (should be 25-35%)
  if (actualDistribution.zone2Percent < 25) {
    issues.push(`Zone 2 too low: ${actualDistribution.zone2Percent}% (target 30%)`)
    recommendations.push('Increase easy aerobic running volume')
  } else if (actualDistribution.zone2Percent > 35) {
    issues.push(`Zone 2 too high: ${actualDistribution.zone2Percent}% (target 30%)`)
    recommendations.push('Too much easy running - add more quality sessions')
  }

  // Check Zone 3 (should be 12-18%)
  if (actualDistribution.zone3Percent < 12) {
    issues.push(`Zone 3 too low: ${actualDistribution.zone3Percent}% (target 15%)`)
    recommendations.push('Add more tempo running - key component of Pyramidal training')
  } else if (actualDistribution.zone3Percent > 18) {
    issues.push(`Zone 3 too high: ${actualDistribution.zone3Percent}% (target 15%)`)
    recommendations.push('Too much tempo work - risk of overtraining')
  }

  // Check Zone 4 (should be 8-12%)
  if (actualDistribution.zone4Percent < 8) {
    issues.push(`Zone 4 too low: ${actualDistribution.zone4Percent}% (target 10%)`)
    recommendations.push('Add more threshold work')
  } else if (actualDistribution.zone4Percent > 12) {
    issues.push(`Zone 4 too high: ${actualDistribution.zone4Percent}% (target 10%)`)
    recommendations.push('Too much threshold running - ensure adequate recovery')
  }

  // Check Zone 5 (should be 3-7%)
  if (actualDistribution.zone5Percent > 7) {
    issues.push(`Zone 5 too high: ${actualDistribution.zone5Percent}% (target 5%)`)
    recommendations.push('Too much high-intensity work - risk of overtraining and injury')
  }

  // Check total moderate-intensity (Zones 3+4) - should not exceed 30%
  const moderateTotal = actualDistribution.zone3Percent + actualDistribution.zone4Percent
  if (moderateTotal > 30) {
    issues.push(`Moderate intensity too high: ${moderateTotal}% (Zones 3+4 target <30%)`)
    recommendations.push('Risk of accumulating fatigue - reduce tempo/threshold volume or increase easy running')
  }

  const compliant = issues.length === 0

  if (compliant) {
    recommendations.push('Training distribution follows Pyramidal principles well!')
  }

  return {
    compliant,
    issues,
    recommendations,
  }
}

/**
 * Generate weekly session structure for Pyramidal training
 *
 * Typical week includes:
 * - 1 tempo run (Zone 3)
 * - 1 interval session (Zone 4-5)
 * - 1 long run
 * - Remaining sessions easy
 *
 * @param weeklySessionCount - Number of sessions per week
 * @param phase - Training phase
 * @returns Array of session types
 */
export function generatePyramidalWeek(
  weeklySessionCount: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
): string[] {
  const sessions: string[] = []

  // Core structure: tempo + intervals + long run
  if (phase === 'BASE') {
    sessions.push('TEMPO_RUN') // Zone 3
    sessions.push('THRESHOLD_INTERVALS') // Zone 4
    sessions.push('LONG_RUN')
  } else if (phase === 'BUILD') {
    sessions.push('TEMPO_RUN')
    sessions.push('VO2MAX_INTERVALS') // Zone 5
    sessions.push('LONG_RUN_WITH_TEMPO')
  } else if (phase === 'PEAK') {
    sessions.push('TEMPO_RUN')
    sessions.push('RACE_PACE_INTERVALS')
    sessions.push('LONG_RUN_WITH_TEMPO')
  } else {
    // TAPER
    sessions.push('SHORT_TEMPO')
    sessions.push('SHORT_INTERVALS')
    sessions.push('MODERATE_LONG_RUN')
  }

  // Fill remaining with easy runs
  const remainingSessions = weeklySessionCount - sessions.length
  for (let i = 0; i < remainingSessions; i++) {
    sessions.push('EASY_RUN')
  }

  return sessions
}

/**
 * Get Pyramidal training intensity guidelines
 *
 * @returns Intensity descriptions for each zone (5-zone model)
 */
export function getPyramidalIntensityGuidelines(): {
  zone1: string
  zone2: string
  zone3: string
  zone4: string
  zone5: string
} {
  return {
    zone1: 'Recovery pace - Very easy, conversational. Used for recovery runs and warm-up/cool-down. RPE 1-3/10.',
    zone2: 'Easy aerobic - Conversational, sustainable for hours. Primary training pace. RPE 3-5/10.',
    zone3: 'Tempo pace - Comfortably hard. Can speak in short phrases. Classic tempo run pace. RPE 6-7/10. KEY ZONE for Pyramidal training.',
    zone4: 'Threshold - Hard effort, limited speech. Lactate threshold pace. RPE 7-8/10. Used for threshold intervals.',
    zone5: 'VO2max/Race pace - Very hard, race effort. Minimal speech. RPE 8-9/10. Used sparingly for intervals.',
  }
}

/**
 * Compare Pyramidal to Polarized distribution
 *
 * Helps athletes understand the key differences
 *
 * @returns Comparison of the two methodologies
 */
export function comparePyramidalToPolarized(): {
  pyramidal: { easy: number; moderate: number; hard: number }
  polarized: { easy: number; moderate: number; hard: number }
  keyDifferences: string[]
} {
  return {
    pyramidal: {
      easy: 70,     // Zones 1-2 in 5-zone model
      moderate: 18, // Zone 3 in 3-zone model (tempo)
      hard: 12,     // Zones 4-5 in 5-zone model
    },
    polarized: {
      easy: 80,
      moderate: 5,
      hard: 15,
    },
    keyDifferences: [
      'Pyramidal includes ~18% tempo work vs 5% in Polarized',
      'Pyramidal has less pure easy volume (70% vs 80%)',
      'Pyramidal feels more balanced and familiar to recreational athletes',
      'Polarized has clearer separation between easy and hard',
      'Pyramidal tempo runs are time-efficient for busy athletes',
      'Polarized may optimize adaptations better for elite athletes',
    ],
  }
}

// ============================================================================
// ADVANCED PYRAMIDAL PROTOCOLS - Daniels, Pfitzinger, Lydiard Integration
// ============================================================================

/**
 * Training Phase for Pyramidal periodization
 * Based on Lydiard and Pfitzinger periodization models
 */
export type PyramidalPhase =
  | 'BASE'          // Lydiard Phase 1: Aerobic base building
  | 'STRENGTH'      // Lydiard Phase 2: Hills + threshold introduction
  | 'SHARPENING'    // Lydiard Phase 3: VO2max intervals
  | 'COORDINATION'  // Lydiard Phase 4: Race-specific work + taper
  | 'MARATHON_SPECIFIC' // Pfitzinger: Marathon-specific threshold

/**
 * Event type determines the pyramid shape
 */
export type PyramidalEventType = '5K' | '10K' | 'HALF_MARATHON' | 'MARATHON'

/**
 * Cruise Interval Types (Jack Daniels methodology)
 * The cornerstone of Pyramidal threshold training
 */
export type CruiseIntervalType =
  | 'CI_MILE'       // 1-mile repeats @ T-Pace
  | 'CI_1200'       // 1200m (3/4 mile) repeats
  | 'CI_1K'         // 1000m repeats
  | 'CI_2K'         // 2000m repeats (advanced)
  | 'CI_5MIN'       // 5-minute time-based repeats

/**
 * Cruise Interval Session Structure
 * Jack Daniels: "Threshold intervals with minimal rest"
 */
export interface CruiseIntervalSession {
  type: CruiseIntervalType
  reps: number
  workDistance: number // km
  restDuration: number // seconds (typically 60s)
  targetPace: 'T_PACE' // Threshold pace
  totalTimeAtThreshold: number // minutes
  description: string
  danielsRule: string // The 10% rule
}

/**
 * Get Cruise Interval session details
 * Based on Jack Daniels' Running Formula
 * @param type - Interval type
 * @param weeklyMileage - For applying the 10% rule
 * @returns Complete cruise interval structure
 */
export function getCruiseIntervalSession(
  type: CruiseIntervalType,
  weeklyMileage: number
): CruiseIntervalSession {
  // Daniels Rule: Total T-Pace volume should not exceed 10% of weekly mileage
  const maxTPaceVolume = weeklyMileage * 0.10

  switch (type) {
    case 'CI_MILE':
      return {
        type: 'CI_MILE',
        reps: Math.min(6, Math.floor(maxTPaceVolume / 1.6)), // Cap at 10% rule
        workDistance: 1.6, // 1 mile = 1.6 km
        restDuration: 60,
        targetPace: 'T_PACE',
        totalTimeAtThreshold: Math.min(6, Math.floor(maxTPaceVolume / 1.6)) * 7, // ~7 min per mile
        description: 'Daniels Cruise Intervals: 1-mile repeats with 1 min rest',
        danielsRule: `Max reps limited by 10% rule (${maxTPaceVolume.toFixed(1)}km T-Pace allowed)`
      }

    case 'CI_1200':
      return {
        type: 'CI_1200',
        reps: Math.min(8, Math.floor(maxTPaceVolume / 1.2)),
        workDistance: 1.2,
        restDuration: 60,
        targetPace: 'T_PACE',
        totalTimeAtThreshold: Math.min(8, Math.floor(maxTPaceVolume / 1.2)) * 5,
        description: 'Cruise Intervals: 1200m repeats with 1 min rest',
        danielsRule: `Max reps limited by 10% rule (${maxTPaceVolume.toFixed(1)}km T-Pace allowed)`
      }

    case 'CI_1K':
      return {
        type: 'CI_1K',
        reps: Math.min(10, Math.floor(maxTPaceVolume)),
        workDistance: 1.0,
        restDuration: 60,
        targetPace: 'T_PACE',
        totalTimeAtThreshold: Math.min(10, Math.floor(maxTPaceVolume)) * 4.5,
        description: 'Cruise Intervals: 1000m repeats with 1 min rest',
        danielsRule: `Max reps limited by 10% rule (${maxTPaceVolume.toFixed(1)}km T-Pace allowed)`
      }

    case 'CI_2K':
      return {
        type: 'CI_2K',
        reps: Math.min(4, Math.floor(maxTPaceVolume / 2)),
        workDistance: 2.0,
        restDuration: 90, // Longer rest for longer reps
        targetPace: 'T_PACE',
        totalTimeAtThreshold: Math.min(4, Math.floor(maxTPaceVolume / 2)) * 9,
        description: 'Advanced Cruise Intervals: 2000m repeats with 90s rest',
        danielsRule: `Max reps limited by 10% rule (${maxTPaceVolume.toFixed(1)}km T-Pace allowed)`
      }

    case 'CI_5MIN':
      return {
        type: 'CI_5MIN',
        reps: Math.min(8, Math.floor(maxTPaceVolume / 1.3)), // ~1.3km per 5 min
        workDistance: 1.3, // Approximate distance in 5 min at T-Pace
        restDuration: 60,
        targetPace: 'T_PACE',
        totalTimeAtThreshold: Math.min(8, Math.floor(maxTPaceVolume / 1.3)) * 5,
        description: 'Time-based Cruise: 5-minute repeats with 1 min rest',
        danielsRule: `Max reps limited by 10% rule (${maxTPaceVolume.toFixed(1)}km T-Pace allowed)`
      }
  }
}

/**
 * Continuous Tempo Types (Pfitzinger methodology)
 * Single-block threshold runs
 */
export type ContinuousTempoType =
  | 'CT_20MIN'      // 20 minutes continuous
  | 'CT_30MIN'      // 30 minutes (standard)
  | 'CT_40MIN'      // 40 minutes (advanced)
  | 'CT_PROGRESSIVE' // Start MP, finish T-Pace

/**
 * Continuous Tempo Session Structure
 */
export interface ContinuousTempoSession {
  type: ContinuousTempoType
  duration: number // minutes
  targetPace: 'T_PACE' | 'MP' | 'PROGRESSIVE'
  description: string
  pfitzingerNote: string
}

/**
 * Get Continuous Tempo session (Pfitzinger style)
 * @param type - Tempo type
 * @returns Continuous tempo structure
 */
export function getContinuousTempoSession(type: ContinuousTempoType): ContinuousTempoSession {
  switch (type) {
    case 'CT_20MIN':
      return {
        type: 'CT_20MIN',
        duration: 20,
        targetPace: 'T_PACE',
        description: 'Pfitzinger Tempo: 20 minutes continuous at Threshold',
        pfitzingerNote: '15K to Half-Marathon race pace'
      }

    case 'CT_30MIN':
      return {
        type: 'CT_30MIN',
        duration: 30,
        targetPace: 'T_PACE',
        description: 'Pfitzinger Tempo: 30 minutes continuous at Threshold',
        pfitzingerNote: 'Classic LT run - mental toughness and thermal adaptation'
      }

    case 'CT_40MIN':
      return {
        type: 'CT_40MIN',
        duration: 40,
        targetPace: 'T_PACE',
        description: 'Pfitzinger Advanced Tempo: 40 minutes continuous',
        pfitzingerNote: 'Maximum single-block duration - split if exceeding 40 mins'
      }

    case 'CT_PROGRESSIVE':
      return {
        type: 'CT_PROGRESSIVE',
        duration: 30,
        targetPace: 'PROGRESSIVE',
        description: 'Progressive Tempo: Start Marathon Pace, finish Threshold',
        pfitzingerNote: 'Teaches pacing and finishing strength'
      }
  }
}

/**
 * Advanced Threshold Workouts
 * Sophisticated lactate manipulation
 */
export type AdvancedThresholdType =
  | 'ALTERNATING_TEMPO'  // 10K pace / MP alternating
  | 'BROKEN_TEMPO'       // 2 x 15 min @ T-Pace
  | 'FATIGUED_THRESHOLD' // Easy miles + tempo (marathon-specific)
  | 'HILLY_BROKEN_TEMPO' // Tempo + hills + tempo

/**
 * Advanced Threshold Session Structure
 */
export interface AdvancedThresholdSession {
  type: AdvancedThresholdType
  structure: string
  mechanism: string // Physiological explanation
  description: string
}

/**
 * Get Advanced Threshold workout
 * @param type - Advanced workout type
 * @returns Advanced threshold structure
 */
export function getAdvancedThresholdSession(type: AdvancedThresholdType): AdvancedThresholdSession {
  switch (type) {
    case 'ALTERNATING_TEMPO':
      return {
        type: 'ALTERNATING_TEMPO',
        structure: '3 sets × (5 min @ 10K Pace / 5 min @ Marathon Pace) - continuous',
        mechanism: 'Fast segment floods lactate, float segment forces active lactate consumption',
        description: 'The ultimate "Lactate Shuttle" workout - teaches fuel utilization'
      }

    case 'BROKEN_TEMPO':
      return {
        type: 'BROKEN_TEMPO',
        structure: '2 × 15 min @ T-Pace (3 min recovery)',
        mechanism: 'Break allows brief lactate clearance without full recovery',
        description: 'Alternative to 30 min continuous - accumulate more volume'
      }

    case 'FATIGUED_THRESHOLD':
      return {
        type: 'FATIGUED_THRESHOLD',
        structure: '10 miles easy + 4 miles @ T-Pace',
        mechanism: 'Simulates marathon fatigue state - teaches threshold running on tired legs',
        description: 'Marathon-specific: Threshold work in glycogen-depleted state'
      }

    case 'HILLY_BROKEN_TEMPO':
      return {
        type: 'HILLY_BROKEN_TEMPO',
        structure: '3 miles Tempo + 3 min jog + 4 × 30s Hill Sprints + 3 min jog + 3 miles Tempo',
        mechanism: 'Recruits fast-twitch fibers under fatigue',
        description: 'Combines neuromuscular recruitment (hills) with threshold endurance'
      }
  }
}

/**
 * Calculate volume-adjusted Pyramidal distribution
 * Low-volume athletes need steeper pyramid (more Z2)
 * High-volume athletes need broader base (more Z1)
 * @param weeklyHours - Total training hours per week
 * @returns Adjusted zone distribution
 */
export function calculateVolumeAdjustedPyramid(weeklyHours: number): ZoneDistribution3 {
  if (weeklyHours < 5) {
    // LOW VOLUME: Steep Pyramid (Threshold-Heavy)
    return {
      zone1Percent: 60,  // Reduced base
      zone2Percent: 30,  // Increased threshold (higher ROI)
      zone3Percent: 10   // Minimal VO2max
    }
  } else if (weeklyHours > 10) {
    // HIGH VOLUME: Broad Pyramid
    return {
      zone1Percent: 85,  // Massive base
      zone2Percent: 12,  // Reduced threshold (absolute volume still high)
      zone3Percent: 3    // Capped VO2max (can't scale linearly)
    }
  } else {
    // STANDARD VOLUME: Classic Pyramid
    return {
      zone1Percent: 72,
      zone2Percent: 18,
      zone3Percent: 10
    }
  }
}

/**
 * Calculate event-specific Pyramidal distribution
 * Marathon: Suppress Z3, boost Z2 (glycogen sparing)
 * 5K: Allow more Z3 (VLamax tolerance)
 * @param eventType - Target race distance
 * @param phase - Current training phase
 * @param weeksToRace - Weeks until race
 * @returns Event-optimized distribution
 */
export function calculateEventSpecificPyramid(
  eventType: PyramidalEventType,
  phase: PyramidalPhase,
  weeksToRace: number
): ZoneDistribution3 {
  if (eventType === 'MARATHON') {
    // Marathon: Glycogen sparing strategy
    if (weeksToRace <= 8) {
      // MARATHON Z3 LOCK: Remove Zone 3 work
      return {
        zone1Percent: 70,
        zone2Percent: 30,  // All quality is threshold
        zone3Percent: 0    // ZERO VO2max (prevents carb wastage)
      }
    } else {
      return {
        zone1Percent: 75,
        zone2Percent: 20,
        zone3Percent: 5
      }
    }
  } else if (eventType === '5K' && weeksToRace <= 4) {
    // 5K POLARIZED SWITCH: Pyramid → Polarized in final 4-6 weeks
    return {
      zone1Percent: 80,   // Increase base (freshness)
      zone2Percent: 0,    // DROP all threshold work
      zone3Percent: 20    // MAX VO2max (sharpening)
    }
  } else if (eventType === '5K' || eventType === '10K') {
    // 5K/10K: Allow higher Z3
    return {
      zone1Percent: 70,
      zone2Percent: 18,
      zone3Percent: 12  // Higher than marathon
    }
  } else {
    // HALF_MARATHON: Balanced
    return {
      zone1Percent: 72,
      zone2Percent: 18,
      zone3Percent: 10
    }
  }
}

/**
 * Select appropriate Cruise Interval based on phase and volume
 * @param phase - Current training phase
 * @param weeklyMileage - For 10% rule enforcement
 * @param weekInPhase - For progression logic
 * @returns Cruise interval type
 */
export function selectCruiseInterval(
  phase: PyramidalPhase,
  weeklyMileage: number,
  weekInPhase: number
): CruiseIntervalType {
  // Progression: Increase volume (reps) before reducing rest or increasing pace
  if (phase === 'STRENGTH') {
    // Introduction to threshold work
    if (weekInPhase <= 2) return 'CI_1K'    // Start short
    if (weekInPhase <= 4) return 'CI_1200'  // Build volume
    return 'CI_MILE'                        // Standard cruise intervals
  } else if (phase === 'SHARPENING' || phase === 'MARATHON_SPECIFIC') {
    // Advanced threshold work
    if (weeklyMileage > 80) return 'CI_2K'  // High-volume athletes
    return 'CI_MILE'                         // Standard
  } else {
    return 'CI_1K' // Default
  }
}

/**
 * Select Continuous Tempo type based on phase and event
 * @param phase - Current training phase
 * @param eventType - Target race
 * @param weekInPhase - For progression
 * @returns Tempo type
 */
export function selectContinuousTempo(
  phase: PyramidalPhase,
  eventType: PyramidalEventType,
  weekInPhase: number
): ContinuousTempoType {
  if (eventType === 'MARATHON' && phase === 'MARATHON_SPECIFIC') {
    // Marathon-specific: Longer continuous blocks
    if (weekInPhase <= 2) return 'CT_20MIN'
    if (weekInPhase <= 4) return 'CT_30MIN'
    return 'CT_40MIN' // Peak marathon tempo
  } else {
    // Standard progression
    if (weekInPhase <= 2) return 'CT_20MIN'
    if (weekInPhase <= 4) return 'CT_30MIN'
    return 'CT_PROGRESSIVE' // Add variety
  }
}
