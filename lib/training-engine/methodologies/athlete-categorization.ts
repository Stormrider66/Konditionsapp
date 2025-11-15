/**
 * Athlete Categorization Module
 *
 * Classifies athletes from Beginner to Elite based on:
 * - VO2max values (gender-specific)
 * - LT2 as percentage of VO2max
 * - Lactate curve characteristics
 *
 * Categories:
 * - BEGINNER: New to structured training, limited aerobic base
 * - RECREATIONAL: Regular runner, developing fitness
 * - ADVANCED: Competitive athlete, strong aerobic base
 * - ELITE: High-level competitive, exceptional physiology
 *
 * @module methodologies/athlete-categorization
 */

import type { AthleteLevel, AthleteCategory } from './types'

export interface AthleteCategorization {
  gender: 'MALE' | 'FEMALE'
  vo2max: number // ml/kg/min
  lt2: {
    vo2: number // ml/kg/min at LT2
    percentOfVO2max: number // LT2 VO2 as % of max
    intensity: number // Speed or power at LT2
  }
  lactateData?: {
    baselineLactate: number // Resting lactate
    lt1Lactate: number // Lactate at LT1
    lt2Lactate: number // Lactate at LT2
  }
}

/**
 * Categorize athlete based on VO2max and LT2 characteristics
 *
 * Criteria:
 * - Beginner: VO2max < 31.5 (M) / 22.8 (F), LT2 < 75% VO2max
 * - Recreational: VO2max 31.5-49.4 (M) / 22.8-40.0 (F), LT2 75-85% VO2max
 * - Advanced: VO2max > 49.4 (M) / 40.0 (F), LT2 83-88% VO2max
 * - Elite: VO2max > 70 (M) / 60 (F), LT2 > 85% VO2max
 *
 * @param data - Athlete's physiological data
 * @returns Categorization with reasoning
 */
export function categorizeAthlete(data: AthleteCategorization): AthleteCategory {
  const { gender, vo2max, lt2 } = data
  const reasoning: string[] = []

  // Gender-specific VO2max thresholds
  const thresholds =
    gender === 'MALE'
      ? {
          beginnerMax: 31.5,
          recreationalMax: 49.4,
          eliteMin: 70,
        }
      : {
          beginnerMax: 22.8,
          recreationalMax: 40.0,
          eliteMin: 60,
        }

  let level: AthleteLevel
  let lactateProfile: 'POOR' | 'AVERAGE' | 'GOOD' | 'EXCELLENT'

  // Primary categorization by VO2max
  if (vo2max < thresholds.beginnerMax) {
    level = 'BEGINNER'
    reasoning.push(
      `VO2max ${vo2max.toFixed(1)} ml/kg/min is below recreational threshold (${thresholds.beginnerMax})`
    )
  } else if (vo2max < thresholds.recreationalMax) {
    level = 'RECREATIONAL'
    reasoning.push(
      `VO2max ${vo2max.toFixed(1)} ml/kg/min is in recreational range (${thresholds.beginnerMax}-${thresholds.recreationalMax})`
    )
  } else if (vo2max < thresholds.eliteMin) {
    level = 'ADVANCED'
    reasoning.push(
      `VO2max ${vo2max.toFixed(1)} ml/kg/min is in advanced range (${thresholds.recreationalMax}-${thresholds.eliteMin})`
    )
  } else {
    level = 'ELITE'
    reasoning.push(
      `VO2max ${vo2max.toFixed(1)} ml/kg/min is in elite range (>${thresholds.eliteMin})`
    )
  }

  // Secondary validation by LT2 as % of VO2max
  const lt2Percent = lt2.percentOfVO2max

  if (lt2Percent < 75) {
    reasoning.push(
      `LT2 at ${lt2Percent.toFixed(1)}% of VO2max indicates limited aerobic development`
    )
    if (level !== 'BEGINNER') {
      reasoning.push(
        '⚠️ Warning: High VO2max but low LT2 suggests untrained endurance'
      )
      level = 'RECREATIONAL' // Downgrade if LT2 is too low
    }
    lactateProfile = 'POOR'
  } else if (lt2Percent < 80) {
    reasoning.push(
      `LT2 at ${lt2Percent.toFixed(1)}% of VO2max is developing`
    )
    lactateProfile = 'AVERAGE'
  } else if (lt2Percent < 85) {
    reasoning.push(
      `LT2 at ${lt2Percent.toFixed(1)}% of VO2max shows good aerobic base`
    )
    lactateProfile = 'GOOD'
  } else {
    reasoning.push(
      `LT2 at ${lt2Percent.toFixed(1)}% of VO2max indicates excellent aerobic development`
    )
    lactateProfile = 'EXCELLENT'
  }

  // Tertiary validation by lactate curve characteristics
  if (data.lactateData) {
    const { baselineLactate, lt1Lactate, lt2Lactate } = data.lactateData

    if (baselineLactate < 1.5 && lt1Lactate < 2.0) {
      reasoning.push('Low baseline lactate indicates good aerobic efficiency')
    }

    if (lt2Lactate > 6.0) {
      reasoning.push(
        '⚠️ High lactate at LT2 suggests glycolytic reliance - focus on aerobic base'
      )
    }

    // Right-shifted curve (hallmark of elite endurance)
    const baselineToLT1Range = lt1Lactate - baselineLactate
    if (baselineToLT1Range < 0.5 && lt2Percent > 83) {
      reasoning.push(
        'Flat baseline lactate curve - characteristic of elite aerobic development'
      )
      lactateProfile = 'EXCELLENT'
    }
  }

  // Final check: Advanced requires both high VO2 and high LT2%
  if (level === 'ADVANCED' && lt2Percent < 80) {
    reasoning.push(
      'Downgrading to RECREATIONAL due to LT2 < 80% of VO2max'
    )
    level = 'RECREATIONAL'
  }

  // Elite requires exceptional values
  if (level === 'ELITE' && lt2Percent < 82) {
    reasoning.push(
      'Downgrading to ADVANCED - Elite requires LT2 > 82% of VO2max'
    )
    level = 'ADVANCED'
  }

  return {
    level,
    vo2max,
    lt2PercentOfVO2max: lt2Percent,
    lactateProfile,
    reasoning,
  }
}

/**
 * Get recommended training volume ranges by athlete level
 *
 * @param level - Athlete categorization level
 * @returns Weekly training volume recommendations
 */
export function getVolumeRecommendations(level: AthleteLevel): {
  minWeeklyMinutes: number
  maxWeeklyMinutes: number
  minWeeklySessions: number
  maxWeeklySessions: number
  description: string
} {
  const recommendations = {
    BEGINNER: {
      minWeeklyMinutes: 90,
      maxWeeklyMinutes: 240,
      minWeeklySessions: 3,
      maxWeeklySessions: 4,
      description:
        'Focus on building base fitness. 3-4 sessions/week, total 1.5-4 hours.',
    },
    RECREATIONAL: {
      minWeeklyMinutes: 180,
      maxWeeklyMinutes: 420,
      minWeeklySessions: 4,
      maxWeeklySessions: 6,
      description:
        'Developing fitness with consistent training. 4-6 sessions/week, total 3-7 hours.',
    },
    ADVANCED: {
      minWeeklyMinutes: 360,
      maxWeeklyMinutes: 720,
      minWeeklySessions: 6,
      maxWeeklySessions: 10,
      description:
        'Competitive training with high volume. 6-10 sessions/week, total 6-12 hours.',
    },
    ELITE: {
      minWeeklyMinutes: 540,
      maxWeeklyMinutes: 1080,
      minWeeklySessions: 8,
      maxWeeklySessions: 14,
      description:
        'Professional/elite training with very high volume. 8-14 sessions/week, total 9-18 hours.',
    },
  }

  return recommendations[level]
}

/**
 * Assess athlete's training history
 *
 * @param trainingYears - Years of structured training
 * @param weeklyVolume - Current weekly volume (minutes)
 * @param injuryHistory - Number of training-related injuries in past 2 years
 * @returns Training history assessment
 */
export function assessTrainingHistory(
  trainingYears: number,
  weeklyVolume: number,
  injuryHistory: number
): {
  experience: 'NOVICE' | 'DEVELOPING' | 'EXPERIENCED' | 'VETERAN'
  volumeTolerance: 'LOW' | 'MODERATE' | 'HIGH'
  injuryRisk: 'LOW' | 'MODERATE' | 'HIGH'
  recommendations: string[]
} {
  const recommendations: string[] = []

  // Assess experience
  let experience: 'NOVICE' | 'DEVELOPING' | 'EXPERIENCED' | 'VETERAN'
  if (trainingYears < 1) {
    experience = 'NOVICE'
    recommendations.push(
      'Build training volume gradually - increase by max 10% per week'
    )
  } else if (trainingYears < 3) {
    experience = 'DEVELOPING'
    recommendations.push(
      'Continue building aerobic base - focus on consistency over intensity'
    )
  } else if (trainingYears < 7) {
    experience = 'EXPERIENCED'
  } else {
    experience = 'VETERAN'
  }

  // Assess volume tolerance
  let volumeTolerance: 'LOW' | 'MODERATE' | 'HIGH'
  if (weeklyVolume < 180) {
    volumeTolerance = 'LOW'
    recommendations.push('Build volume before adding intensity')
  } else if (weeklyVolume < 420) {
    volumeTolerance = 'MODERATE'
  } else {
    volumeTolerance = 'HIGH'
  }

  // Assess injury risk
  let injuryRisk: 'LOW' | 'MODERATE' | 'HIGH'
  if (injuryHistory === 0) {
    injuryRisk = 'LOW'
  } else if (injuryHistory <= 2) {
    injuryRisk = 'MODERATE'
    recommendations.push(
      'Monitor injury patterns - consider strength training and mobility work'
    )
  } else {
    injuryRisk = 'HIGH'
    recommendations.push(
      'HIGH injury risk - prioritize injury prevention: strength training, form analysis, gradual progression'
    )
    recommendations.push(
      'Consider working with physical therapist to address underlying issues'
    )
  }

  return {
    experience,
    volumeTolerance,
    injuryRisk,
    recommendations,
  }
}
