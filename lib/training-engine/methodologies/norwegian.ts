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
