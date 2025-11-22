// lib/training-engine/calculations/athlete-classifier.ts
// Comprehensive Athlete Classification System
// Determines level, compression factors, and training recommendations

import { type LactateProfile, type MetabolicType } from './lactate-profile-analyzer'
import { type VDOTResult } from './vdot'

export type AthleteLevel = 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'RECREATIONAL'

export interface AthleteProfile {
  // Training history
  weeklyKm: number
  yearsRunning: number

  // Physiological data
  maxHR: number
  restingHR?: number
  vo2max?: number

  // Demographics
  age: number
  gender: 'MALE' | 'FEMALE'

  // Performance data (optional)
  vdotResult?: VDOTResult
  lactateProfile?: LactateProfile
}

export interface AthleteClassification {
  level: AthleteLevel
  vdot?: number

  // Compression factor: MP as % of LT2 pace
  compressionFactor: number

  // Expected LT2 intensity
  lt2PercentVO2max: number

  // Metabolic characteristics
  metabolicType: MetabolicType
  trainingRecommendations: TrainingRecommendations

  // Confidence in classification
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'

  // Data quality assessment
  dataQuality: {
    hasRecentRace: boolean
    hasLactateTest: boolean
    hasVO2max: boolean
    completeness: number // 0-100%
  }

  // Adjustments applied
  adjustments: {
    genderAdjustment: number // % adjustment applied
    ageAdjustment: number // % adjustment applied
    originalCompressionFactor?: number // Before adjustments
  }

  // Warnings
  warnings: string[]
}

export interface TrainingRecommendations {
  intervalType: 'EXTENSIVE' | 'INTENSIVE' | 'MIXED'
  recoveryDays: number // Days between hard sessions
  taperLength: number // Weeks
  volumeTolerance: 'HIGH' | 'MEDIUM' | 'LOW'
  weeklyKmRecommendation: { min: number; max: number }
  description: string
}

/**
 * Main classification function
 * Uses hierarchical data sources to determine athlete level and characteristics
 */
export function classifyAthlete(profile: AthleteProfile): AthleteClassification {
  let level: AthleteLevel = 'RECREATIONAL'
  let compressionFactor = 0.75
  let lt2PercentVO2max = 70
  let vdot: number | undefined
  let confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'

  const warnings: string[] = []

  // === PRIORITY 1: VDOT-based classification (most reliable) ===
  if (profile.vdotResult) {
    vdot = profile.vdotResult.vdot
    const classification = classifyFromVDOT(vdot)

    level = classification.level
    compressionFactor = classification.compressionFactor
    lt2PercentVO2max = classification.lt2PercentVO2max
    confidence = profile.vdotResult.confidence

    if (profile.vdotResult.ageInDays > 180) {
      warnings.push(`Race data is ${profile.vdotResult.ageInDays} days old. Consider a recent race for better accuracy.`)
    }
  }
  // === PRIORITY 2: Lactate profile classification ===
  else if (profile.lactateProfile) {
    const classification = classifyFromLactateProfile(
      profile.lactateProfile,
      profile.weeklyKm,
      profile.yearsRunning
    )

    level = classification.level
    compressionFactor = classification.compressionFactor
    lt2PercentVO2max = classification.lt2PercentVO2max
    confidence = 'HIGH'

    warnings.push('No recent race data - classification based on lactate test.')
  }
  // === PRIORITY 3: Profile-based estimation ===
  else {
    const classification = classifyFromProfile(
      profile.weeklyKm,
      profile.yearsRunning,
      profile.maxHR,
      profile.vo2max
    )

    level = classification.level
    compressionFactor = classification.compressionFactor
    lt2PercentVO2max = classification.lt2PercentVO2max
    confidence = 'LOW'

    warnings.push('No race or lactate test data - using profile estimation.')
    warnings.push('CRITICAL: Verify training paces in first 2 weeks and adjust if needed.')
  }

  // Store original compression factor before adjustments
  const originalCompressionFactor = compressionFactor

  // === APPLY GENDER ADJUSTMENTS ===
  const genderAdjustment = applyGenderAdjustment(
    profile.gender,
    compressionFactor,
    level
  )
  compressionFactor = genderAdjustment.adjustedFactor

  if (genderAdjustment.percentChange > 0) {
    warnings.push(
      `Female athlete: Compression factor adjusted +${genderAdjustment.percentChange.toFixed(1)}% due to superior running economy.`
    )
  }

  // === APPLY AGE ADJUSTMENTS ===
  const ageAdjustment = applyAgeAdjustment(
    profile.age,
    compressionFactor,
    lt2PercentVO2max
  )
  compressionFactor = ageAdjustment.adjustedCompressionFactor
  lt2PercentVO2max = ageAdjustment.adjustedLT2Percent

  if (ageAdjustment.percentChange > 0) {
    warnings.push(
      `Masters athlete (${profile.age} years): Compression factor adjusted +${ageAdjustment.percentChange.toFixed(1)}% due to age-related fiber type changes.`
    )
  }

  // === DETERMINE METABOLIC TYPE ===
  let metabolicType: MetabolicType = 'MIXED'

  if (profile.lactateProfile) {
    metabolicType = profile.lactateProfile.metabolicType
  } else {
    // Estimate from level
    metabolicType = estimateMetabolicType(level, compressionFactor)
  }

  // === TRAINING RECOMMENDATIONS ===
  const trainingRecommendations = getTrainingRecommendations(
    level,
    metabolicType,
    profile.weeklyKm,
    profile.age
  )

  // === DATA QUALITY ASSESSMENT ===
  const dataQuality = assessDataQuality(profile)

  return {
    level,
    vdot,
    compressionFactor,
    lt2PercentVO2max,
    metabolicType,
    trainingRecommendations,
    confidence,
    dataQuality,
    adjustments: {
      genderAdjustment: genderAdjustment.percentChange,
      ageAdjustment: ageAdjustment.percentChange,
      originalCompressionFactor:
        genderAdjustment.percentChange > 0 || ageAdjustment.percentChange > 0
          ? originalCompressionFactor
          : undefined
    },
    warnings
  }
}

/**
 * Classify from VDOT (most reliable method)
 */
function classifyFromVDOT(vdot: number): {
  level: AthleteLevel
  compressionFactor: number
  lt2PercentVO2max: number
} {
  if (vdot >= 65) {
    return {
      level: 'ELITE',
      compressionFactor: 0.96, // MP is 96-98% of LT2
      lt2PercentVO2max: 88 // LT2 at 88-92% VO2max
    }
  } else if (vdot >= 55) {
    return {
      level: 'ADVANCED',
      compressionFactor: 0.88, // MP is 88-92% of LT2
      lt2PercentVO2max: 85 // LT2 at 82-85% VO2max
    }
  } else if (vdot >= 45) {
    return {
      level: 'INTERMEDIATE',
      compressionFactor: 0.85, // MP is 82-88% of LT2
      lt2PercentVO2max: 80 // LT2 at 78-82% VO2max
    }
  } else {
    return {
      level: 'RECREATIONAL',
      compressionFactor: 0.78, // MP is 75-82% of LT2
      lt2PercentVO2max: 72 // LT2 at 68-75% VO2max
    }
  }
}

/**
 * Classify from lactate profile
 */
function classifyFromLactateProfile(
  lactateProfile: LactateProfile,
  weeklyKm: number,
  yearsRunning: number
): {
  level: AthleteLevel
  compressionFactor: number
  lt2PercentVO2max: number
} {
  // Use lactate profile's athlete level as starting point
  let level = lactateProfile.athleteLevel

  // Adjust based on training volume and experience
  const volumeScore = Math.min(weeklyKm / 100, 1.0) * 30
  const experienceScore = Math.min(yearsRunning / 5, 1.0) * 20

  const totalScore = volumeScore + experienceScore

  // Upgrade level if high score
  if (totalScore >= 40 && level === 'RECREATIONAL') {
    level = 'SUB_ELITE'
  } else if (totalScore >= 45 && level === 'SUB_ELITE') {
    level = 'ELITE'
  }

  // Determine compression factor from lactate characteristics
  const { maxLactate, lt2Ratio } = lactateProfile

  let compressionFactor: number

  if (lt2Ratio > 0.45) {
    // Highly compressed profile
    compressionFactor = level === 'ELITE' ? 0.96 : 0.90
  } else if (lt2Ratio > 0.35) {
    // Moderately compressed
    compressionFactor = level === 'ELITE' ? 0.92 : 0.86
  } else {
    // Expanded profile (middle distance)
    compressionFactor = 0.82
  }

  // Estimate LT2 % VO2max from HR data
  const lt2HR = lactateProfile.lt2.heartRate
  // This is a rough estimate - would need max HR for accuracy
  const lt2PercentVO2max = 82 // Conservative default

  return {
    level,
    compressionFactor,
    lt2PercentVO2max
  }
}

/**
 * Classify from training profile (lowest confidence)
 */
function classifyFromProfile(
  weeklyKm: number,
  yearsRunning: number,
  maxHR: number,
  vo2max?: number
): {
  level: AthleteLevel
  compressionFactor: number
  lt2PercentVO2max: number
} {
  let score = 0

  // Weekly volume scoring
  if (weeklyKm > 100) score += 30
  else if (weeklyKm > 70) score += 20
  else if (weeklyKm > 40) score += 10

  // Training age scoring
  if (yearsRunning >= 5) score += 20
  else if (yearsRunning >= 3) score += 10

  // VO2max scoring (if available)
  if (vo2max) {
    if (vo2max > 65) score += 25
    else if (vo2max > 55) score += 15
    else if (vo2max > 45) score += 5
  }

  // Convert score to level
  let level: AthleteLevel
  let compressionFactor: number
  let lt2PercentVO2max: number

  if (score >= 70) {
    level = 'ELITE'
    compressionFactor = 0.96
    lt2PercentVO2max = 88
  } else if (score >= 45) {
    level = 'ADVANCED'
    compressionFactor = 0.88
    lt2PercentVO2max = 85
  } else if (score >= 25) {
    level = 'INTERMEDIATE'
    compressionFactor = 0.85
    lt2PercentVO2max = 80
  } else {
    level = 'RECREATIONAL'
    compressionFactor = 0.78
    lt2PercentVO2max = 72
  }

  return { level, compressionFactor, lt2PercentVO2max }
}

/**
 * Apply gender-specific adjustments
 * Females have 2-3% better running economy at same VO2max
 * This translates to slightly higher compression factor
 */
function applyGenderAdjustment(
  gender: 'MALE' | 'FEMALE',
  compressionFactor: number,
  level: AthleteLevel
): {
  adjustedFactor: number
  percentChange: number
} {
  if (gender === 'MALE') {
    return { adjustedFactor: compressionFactor, percentChange: 0 }
  }

  // Female adjustment varies by level
  let adjustmentPercent: number

  switch (level) {
    case 'ELITE':
      adjustmentPercent = 2.0 // Elite females have slight advantage
      break
    case 'ADVANCED':
      adjustmentPercent = 2.5 // Advantage increases at sub-elite
      break
    case 'INTERMEDIATE':
      adjustmentPercent = 3.0 // Max advantage at intermediate level
      break
    case 'RECREATIONAL':
      adjustmentPercent = 2.5
      break
  }

  const adjustedFactor = compressionFactor * (1 + adjustmentPercent / 100)

  return {
    adjustedFactor: Math.round(adjustedFactor * 1000) / 1000, // Round to 3 decimals
    percentChange: adjustmentPercent
  }
}

/**
 * Apply age-specific adjustments (Masters athletes)
 * Age >35: Fiber type conversion toward Type I (slow twitch)
 * This naturally compresses the profile
 */
function applyAgeAdjustment(
  age: number,
  compressionFactor: number,
  lt2PercentVO2max: number
): {
  adjustedCompressionFactor: number
  adjustedLT2Percent: number
  percentChange: number
} {
  if (age <= 35) {
    return {
      adjustedCompressionFactor: compressionFactor,
      adjustedLT2Percent: lt2PercentVO2max,
      percentChange: 0
    }
  }

  const yearsOver35 = age - 35

  // Age adjustments (based on sarcopenia of Type II fibers)
  let adjustmentPercent: number

  if (age >= 50) {
    adjustmentPercent = 4.0 // +4% compression for 50+
  } else if (age >= 40) {
    adjustmentPercent = 2.5 // +2.5% compression for 40-49
  } else {
    adjustmentPercent = 1.0 // +1% compression for 35-39
  }

  const adjustedCompressionFactor = compressionFactor * (1 + adjustmentPercent / 100)

  // LT2 % VO2max typically stays stable or increases slightly with age
  // (fractional utilization improves even as absolute VO2max declines)
  const adjustedLT2Percent = lt2PercentVO2max + (adjustmentPercent / 2)

  return {
    adjustedCompressionFactor: Math.round(adjustedCompressionFactor * 1000) / 1000,
    adjustedLT2Percent: Math.round(adjustedLT2Percent),
    percentChange: adjustmentPercent
  }
}

/**
 * Estimate metabolic type when lactate data unavailable
 */
function estimateMetabolicType(
  level: AthleteLevel,
  compressionFactor: number
): MetabolicType {
  if (compressionFactor >= 0.94) {
    // Highly compressed - likely slow twitch or well-adapted fast twitch
    return level === 'ELITE' ? 'SLOW_TWITCH' : 'FAST_TWITCH_ENDURANCE'
  } else if (compressionFactor <= 0.84) {
    // Expanded profile - more anaerobic capacity
    return 'FAST_TWITCH_POWER'
  } else {
    return 'MIXED'
  }
}

/**
 * Get comprehensive training recommendations
 */
function getTrainingRecommendations(
  level: AthleteLevel,
  metabolicType: MetabolicType,
  currentWeeklyKm: number,
  age: number
): TrainingRecommendations {
  // Base recommendations on metabolic type
  let intervalType: 'EXTENSIVE' | 'INTENSIVE' | 'MIXED'
  let recoveryDays: number
  let taperLength: number
  let volumeTolerance: 'HIGH' | 'MEDIUM' | 'LOW'

  switch (metabolicType) {
    case 'FAST_TWITCH_ENDURANCE':
      intervalType = 'EXTENSIVE'
      recoveryDays = 4
      taperLength = 3
      volumeTolerance = 'MEDIUM'
      break

    case 'FAST_TWITCH_POWER':
      intervalType = 'INTENSIVE'
      recoveryDays = 3
      taperLength = 2
      volumeTolerance = 'MEDIUM'
      break

    case 'SLOW_TWITCH':
      intervalType = 'INTENSIVE'
      recoveryDays = 2
      taperLength = 2
      volumeTolerance = 'HIGH'
      break

    case 'MIXED':
      intervalType = 'MIXED'
      recoveryDays = 3
      taperLength = 2
      volumeTolerance = 'MEDIUM'
      break
  }

  // Adjust for age (masters need more recovery)
  if (age >= 50) {
    recoveryDays += 1
    taperLength += 1
  } else if (age >= 40) {
    recoveryDays += 0.5
  }

  // Weekly km recommendations based on level
  let weeklyKmRecommendation: { min: number; max: number }

  switch (level) {
    case 'ELITE':
      weeklyKmRecommendation = { min: 100, max: 150 }
      break
    case 'ADVANCED':
      weeklyKmRecommendation = { min: 70, max: 110 }
      break
    case 'INTERMEDIATE':
      weeklyKmRecommendation = { min: 50, max: 80 }
      break
    case 'RECREATIONAL':
      weeklyKmRecommendation = { min: 30, max: 60 }
      break
  }

  // Adjust for masters athletes
  if (age >= 50) {
    weeklyKmRecommendation.max *= 0.85
  } else if (age >= 40) {
    weeklyKmRecommendation.max *= 0.90
  }

  // Generate description
  const description = generateRecommendationDescription(
    level,
    metabolicType,
    intervalType,
    recoveryDays,
    taperLength,
    volumeTolerance,
    currentWeeklyKm,
    weeklyKmRecommendation
  )

  return {
    intervalType,
    recoveryDays: Math.round(recoveryDays),
    taperLength,
    volumeTolerance,
    weeklyKmRecommendation: {
      min: Math.round(weeklyKmRecommendation.min),
      max: Math.round(weeklyKmRecommendation.max)
    },
    description
  }
}

/**
 * Generate detailed recommendation description
 */
function generateRecommendationDescription(
  level: AthleteLevel,
  metabolicType: MetabolicType,
  intervalType: 'EXTENSIVE' | 'INTENSIVE' | 'MIXED',
  recoveryDays: number,
  taperLength: number,
  volumeTolerance: 'HIGH' | 'MEDIUM' | 'LOW',
  currentWeeklyKm: number,
  recommendedWeeklyKm: { min: number; max: number }
): string {
  const parts: string[] = []

  // Level description
  parts.push(`${level} level athlete.`)

  // Metabolic type
  const metabolicDesc = {
    FAST_TWITCH_ENDURANCE: 'Fast twitch endurance profile (high glycolytic capacity)',
    FAST_TWITCH_POWER: 'Fast twitch power profile (anaerobic specialist)',
    SLOW_TWITCH: 'Slow twitch profile (aerobic specialist)',
    MIXED: 'Mixed fiber type profile'
  }
  parts.push(metabolicDesc[metabolicType])

  // Interval recommendations
  if (intervalType === 'EXTENSIVE') {
    parts.push('Use EXTENSIVE intervals (longer reps at moderate pace, e.g., 4×5km @ MP).')
  } else if (intervalType === 'INTENSIVE') {
    parts.push('Can use INTENSIVE intervals (shorter reps at faster pace, e.g., 10×1km @ 105% MP).')
  } else {
    parts.push('Use MIXED interval types for variety.')
  }

  // Recovery
  parts.push(`Allow ${Math.round(recoveryDays)} days between hard sessions.`)

  // Taper
  parts.push(`Recommended taper: ${taperLength} weeks.`)

  // Volume
  if (currentWeeklyKm < recommendedWeeklyKm.min) {
    parts.push(
      `Current volume (${currentWeeklyKm}km/week) is below recommended range (${recommendedWeeklyKm.min}-${recommendedWeeklyKm.max}km). Consider gradual increase.`
    )
  } else if (currentWeeklyKm > recommendedWeeklyKm.max) {
    parts.push(
      `Current volume (${currentWeeklyKm}km/week) is high for this level. Ensure adequate recovery.`
    )
  } else {
    parts.push(`Current volume (${currentWeeklyKm}km/week) is appropriate.`)
  }

  return parts.join(' ')
}

/**
 * Assess data quality for classification
 */
function assessDataQuality(profile: AthleteProfile): {
  hasRecentRace: boolean
  hasLactateTest: boolean
  hasVO2max: boolean
  completeness: number
} {
  const hasRecentRace = !!profile.vdotResult
  const hasLactateTest = !!profile.lactateProfile
  const hasVO2max = !!profile.vo2max

  let completeness = 0

  if (hasRecentRace) completeness += 40 // Race data is most valuable
  if (hasLactateTest) completeness += 30 // Lactate test is second most valuable
  if (hasVO2max) completeness += 10 // VO2max is helpful but less critical
  if (profile.restingHR) completeness += 5 // RHR is nice to have
  if (profile.weeklyKm > 0) completeness += 10 // Training volume is important
  if (profile.yearsRunning > 0) completeness += 5 // Training age is helpful

  return {
    hasRecentRace,
    hasLactateTest,
    hasVO2max,
    completeness: Math.min(completeness, 100)
  }
}
