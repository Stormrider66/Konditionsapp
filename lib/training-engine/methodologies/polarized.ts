/**
 * Polarized Training Methodology (80/20 Rule)
 *
 * Based on Dr. Stephen Seiler's research on elite endurance athletes.
 *
 * Key Principles:
 * - 80% of training time at low intensity (below LT1)
 * - 20% at high intensity (above LT2)
 * - Minimal time in "moderate" zone between LT1-LT2
 *
 * Zone Distribution (3-zone model):
 * - Zone 1 (< LT1): 80%
 * - Zone 2 (LT1-LT2): 5%
 * - Zone 3 (> LT2): 15%
 *
 * References:
 * - Seiler, S., & Kjerland, G. Ø. (2006). Quantifying training intensity distribution.
 * - Stöggl, T., & Sperlich, B. (2014). Polarized training has greater impact.
 *
 * @module methodologies/polarized
 */

import type { MethodologyConfig, WeeklyStructure, ZoneDistribution3 } from './types'

/**
 * Get Polarized methodology configuration
 *
 * Suitable for: All athlete levels, all distances
 * Prerequisites: None (safest default option)
 *
 * @param weeklySessionCount - Number of sessions per week (4-10)
 * @returns Complete Polarized methodology configuration
 */
export function getPolarizedConfig(weeklySessionCount: number = 6): MethodologyConfig {
  // Validate session count
  const sessions = Math.max(4, Math.min(10, weeklySessionCount))

  // Calculate quality sessions (15-20% of total should be high intensity)
  // For 6 sessions/week: 1-2 quality sessions
  const qualitySessions = sessions <= 5 ? 1 : sessions <= 7 ? 2 : 3
  const easyRuns = sessions - qualitySessions - 1 // -1 for long run
  const restDays = 7 - sessions

  const weeklyStructure: WeeklyStructure = {
    totalSessions: sessions,
    easyRuns: Math.max(0, easyRuns),
    qualitySessions,
    longRun: true,
    restDays,
  }

  const zoneDistribution3: ZoneDistribution3 = {
    zone1Percent: 80, // Easy aerobic
    zone2Percent: 5,  // Minimal tempo work
    zone3Percent: 15, // High-intensity intervals
  }

  return {
    type: 'POLARIZED',
    name: 'Polarized Training (80/20)',
    description: 'Evidence-based approach with 80% easy, 20% hard training. Suitable for all levels.',
    zoneDistribution3,
    weeklyStructure,
    minWeeklySessions: 4,
    maxWeeklySessions: 10,
    requiresLactateTest: false, // Works with HR-based zones too
    targetDistances: ['5K', '10K', 'HALF_MARATHON', 'MARATHON', 'ULTRAMARATHON', 'GENERAL_FITNESS'],
    minAthleteLevel: 'BEGINNER',
    deloadFrequencyWeeks: 3, // 3:1 hard:easy pattern
    volumeReductionPercent: 25, // 25% reduction on deload weeks
    strengths: [
      'Proven effective across all athlete levels',
      'Minimizes injury risk with high volume of easy running',
      'Clear intensity prescription (easy or hard, no grey zone)',
      'Sustainable long-term',
      'Does not require lactate testing',
      'Promotes better recovery between quality sessions',
    ],
    limitations: [
      'May feel "too easy" for athletes used to moderate-intensity training',
      'Requires discipline to keep easy runs truly easy',
      'Limited tempo/threshold work (some athletes prefer more)',
      'Quality sessions must be high quality (no junk miles in Zone 2)',
    ],
  }
}

/**
 * Calculate weekly volume distribution for Polarized training
 *
 * @param totalWeeklyMinutes - Total training time for the week
 * @returns Time allocation by zone
 */
export function calculatePolarizedVolume(totalWeeklyMinutes: number): {
  zone1Minutes: number
  zone2Minutes: number
  zone3Minutes: number
} {
  return {
    zone1Minutes: Math.round(totalWeeklyMinutes * 0.80),
    zone2Minutes: Math.round(totalWeeklyMinutes * 0.05),
    zone3Minutes: Math.round(totalWeeklyMinutes * 0.15),
  }
}

/**
 * Validate if an athlete's training distribution follows Polarized principles
 *
 * @param actualDistribution - Actual training distribution from logs
 * @returns Validation result with feedback
 */
export function validatePolarizedDistribution(actualDistribution: ZoneDistribution3): {
  compliant: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check Zone 1 (should be 75-85%)
  if (actualDistribution.zone1Percent < 75) {
    issues.push(`Zone 1 too low: ${actualDistribution.zone1Percent}% (target 80%)`)
    recommendations.push('Increase easy running volume - keep more sessions truly easy')
  } else if (actualDistribution.zone1Percent > 85) {
    issues.push(`Zone 1 too high: ${actualDistribution.zone1Percent}% (target 80%)`)
    recommendations.push('Add more high-intensity work - quality sessions should be challenging')
  }

  // Check Zone 2 (should be minimal, <10%)
  if (actualDistribution.zone2Percent > 10) {
    issues.push(`Too much Zone 2: ${actualDistribution.zone2Percent}% (target <5%)`)
    recommendations.push('Reduce moderate-intensity work - polarized training avoids the "grey zone"')
    recommendations.push('Make easy runs easier and hard sessions harder')
  }

  // Check Zone 3 (should be 15-20%)
  if (actualDistribution.zone3Percent < 10) {
    issues.push(`Zone 3 too low: ${actualDistribution.zone3Percent}% (target 15%)`)
    recommendations.push('Increase high-intensity volume - add more interval work')
  } else if (actualDistribution.zone3Percent > 25) {
    issues.push(`Zone 3 too high: ${actualDistribution.zone3Percent}% (target 15%)`)
    recommendations.push('Reduce high-intensity volume - risk of overtraining')
    recommendations.push('Ensure adequate easy running for recovery')
  }

  const compliant = issues.length === 0

  if (compliant) {
    recommendations.push('Training distribution follows Polarized principles well!')
  }

  return {
    compliant,
    issues,
    recommendations,
  }
}

/**
 * Generate weekly session structure for Polarized training
 *
 * @param weeklySessionCount - Number of sessions per week
 * @param phase - Training phase
 * @returns Array of session types
 */
export function generatePolarizedWeek(
  weeklySessionCount: number,
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'TAPER'
): string[] {
  const sessions: string[] = []
  const config = getPolarizedConfig(weeklySessionCount)

  // Add quality sessions
  for (let i = 0; i < config.weeklyStructure.qualitySessions; i++) {
    if (phase === 'BASE') {
      sessions.push('THRESHOLD_INTERVALS')
    } else if (phase === 'BUILD') {
      sessions.push(i === 0 ? 'VO2MAX_INTERVALS' : 'THRESHOLD_INTERVALS')
    } else if (phase === 'PEAK') {
      sessions.push(i === 0 ? 'RACE_PACE_INTERVALS' : 'VO2MAX_INTERVALS')
    } else {
      // TAPER
      sessions.push('SHORT_INTERVALS')
    }
  }

  // Add long run
  sessions.push('LONG_RUN')

  // Fill remaining with easy runs
  const remainingSessions = weeklySessionCount - sessions.length
  for (let i = 0; i < remainingSessions; i++) {
    sessions.push('EASY_RUN')
  }

  return sessions
}

/**
 * Get Polarized training intensity guidelines
 *
 * @returns Intensity descriptions for each zone
 */
export function getPolarizedIntensityGuidelines(): {
  zone1: string
  zone2: string
  zone3: string
} {
  return {
    zone1: 'Conversational pace - should be able to speak in full sentences. Heart rate below LT1. RPE 2-4/10. This is "truly easy" running.',
    zone2: 'Comfortably hard - can speak in short phrases. Heart rate between LT1 and LT2. RPE 5-6/10. MINIMIZE time here in Polarized training.',
    zone3: 'Hard to very hard - limited speech. Heart rate above LT2. RPE 7-9/10. Intervals, tempo runs, race pace. These sessions should feel challenging.',
  }
}
