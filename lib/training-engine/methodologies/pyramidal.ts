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
