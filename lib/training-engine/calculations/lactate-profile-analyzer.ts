// lib/training-engine/calculations/lactate-profile-analyzer.ts
// Intelligent Lactate Threshold Detection Using Individual Metabolic Profiles
// Based on Metabolic_Equilibrium_Lactate_Analysis.md

import { calculateDmax, type DmaxResult } from './dmax'

export interface LactateTestStage {
  sequence: number
  speed?: number // km/h
  incline?: number // degrees or %
  power?: number // watts (for cycling)
  lactate: number // mmol/L
  heartRate: number // bpm
  vo2?: number // ml/kg/min
}

export interface LactateThreshold {
  lactate: number // mmol/L
  lactatePercent: number // % of max lactate
  speed: number // km/h (or power for cycling)
  heartRate: number // bpm
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  method: 'DMAX' | 'RATIO' | 'MANUAL' | 'FIXED_2MMOL' | 'FIXED_4MMOL'
}

export type MetabolicType =
  | 'SLOW_TWITCH' // Low VLamax, compressed profile (elite marathoner)
  | 'FAST_TWITCH_ENDURANCE' // High VLamax, compressed (fast twitch marathoner)
  | 'FAST_TWITCH_POWER' // High VLamax, expanded (800m specialist)
  | 'MIXED' // Sub-elite profile

export type AthleteLevel = 'ELITE' | 'SUB_ELITE' | 'RECREATIONAL'

export interface LactateProfile {
  // Detected thresholds
  lt1: LactateThreshold
  lt2: LactateThreshold

  // Metabolic characteristics
  maxLactate: number // mmol/L
  lt1Ratio: number // LT1 / maxLactate (%)
  lt2Ratio: number // LT2 / maxLactate (%)

  metabolicType: MetabolicType
  athleteLevel: AthleteLevel

  // Curve characteristics
  curvePattern: 'ASCENDING' | 'PLATEAU' | 'IRREGULAR'
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  rSquared?: number // From D-max fit (if applicable)

  // Warnings and errors
  warnings: string[]
  errors: string[]
}

/**
 * Main function: Analyze lactate profile using hierarchical method selection
 *
 * Priority:
 * 1. D-max (if R² >= 0.90) → VERY_HIGH confidence
 * 2. Individual ratio method → HIGH confidence
 * 3. Manual selection (if provided) → HIGH confidence
 * 4. Fixed crossing (2/4 mmol) → LOW confidence (with warnings)
 */
export function analyzeLactateProfile(
  testStages: LactateTestStage[],
  maxHR: number,
  manualLT1Stage?: number,
  manualLT2Stage?: number
): LactateProfile {
  const warnings: string[] = []
  const errors: string[] = []

  // Validate input
  if (testStages.length < 4) {
    errors.push('CRITICAL: Insufficient test stages (<4). Need at least 4 stages for reliable analysis.')
    return createFallbackProfile(testStages, maxHR, errors)
  }

  // Sort stages by sequence
  const sortedStages = [...testStages].sort((a, b) => a.sequence - b.sequence)

  // Get max lactate
  const maxLactate = Math.max(...sortedStages.map(s => s.lactate))

  // Detect curve pattern
  const curvePattern = detectCurvePattern(sortedStages)

  // === METHOD 1: Manual Selection (Highest Priority if provided) ===
  if (manualLT1Stage !== undefined && manualLT2Stage !== undefined) {
    const lt1Stage = sortedStages.find(s => s.sequence === manualLT1Stage)
    const lt2Stage = sortedStages.find(s => s.sequence === manualLT2Stage)

    if (lt1Stage && lt2Stage) {
      const profile = createProfileFromManualSelection(
        lt1Stage,
        lt2Stage,
        maxLactate,
        sortedStages,
        curvePattern
      )
      profile.warnings = ['Coach manually selected thresholds']
      return profile
    } else {
      warnings.push('Manual threshold stages not found - falling back to automatic detection')
    }
  }

  // === METHOD 2: D-max (Best Automatic Method) ===
  try {
    const dmaxResult = calculateDmax(sortedStages)

    if (dmaxResult.rSquared >= 0.90) {
      // D-max successful with high confidence
      const profile = createProfileFromDmax(dmaxResult, maxLactate, sortedStages, curvePattern)
      return profile
    } else if (dmaxResult.rSquared >= 0.85) {
      // D-max marginal - use with warning
      const profile = createProfileFromDmax(dmaxResult, maxLactate, sortedStages, curvePattern)
      profile.warnings.push(`D-max curve fit marginal (R²=${dmaxResult.rSquared.toFixed(3)}). Consider manual threshold selection.`)
      profile.lt2.confidence = 'MEDIUM'
      return profile
    } else {
      // D-max failed
      warnings.push(`D-max failed (R²=${dmaxResult.rSquared.toFixed(3)} < 0.85). Using individual ratio method.`)
    }
  } catch (error) {
    warnings.push('D-max calculation failed. Using individual ratio method.')
  }

  // === METHOD 3: Individual Ratio Method ===
  const ratioProfile = createProfileFromRatioMethod(maxLactate, sortedStages, curvePattern, maxHR)

  // Add warnings about max lactate and metabolic type
  if (maxLactate > 15) {
    warnings.push(`High max lactate (${maxLactate.toFixed(1)} mmol/L) indicates FAST TWITCH profile.`)
    warnings.push('Recommend EXTENSIVE intervals (longer reps, moderate pace) to suppress VLamax.')
  } else if (maxLactate < 10) {
    warnings.push(`Low max lactate (${maxLactate.toFixed(1)} mmol/L) indicates SLOW TWITCH profile.`)
    warnings.push('Can handle INTENSIVE intervals (shorter reps, faster pace) and high volume.')
  }

  // Warn about curve pattern
  if (curvePattern === 'ASCENDING') {
    warnings.push('Lactate still ascending at test end - athlete likely has higher capacity. LT2 may be underestimated.')
  } else if (curvePattern === 'IRREGULAR') {
    warnings.push('Irregular lactate curve - values not consistently ascending. Test reliability questionable.')
  }

  ratioProfile.warnings = warnings
  ratioProfile.errors = errors

  return ratioProfile
}

/**
 * Create profile from D-max results
 */
function createProfileFromDmax(
  dmaxResult: DmaxResult,
  maxLactate: number,
  stages: LactateTestStage[],
  curvePattern: 'ASCENDING' | 'PLATEAU' | 'IRREGULAR'
): LactateProfile {
  // LT2 = D-max point
  const lt2 = {
    lactate: dmaxResult.dmaxLactate,
    lactatePercent: (dmaxResult.dmaxLactate / maxLactate) * 100,
    speed: dmaxResult.dmaxSpeed,
    heartRate: dmaxResult.dmaxHR,
    confidence: 'VERY_HIGH' as const,
    method: 'DMAX' as const
  }

  // LT1 = Estimate as ~40-50% of LT2 lactate
  const lt1LactateTarget = dmaxResult.dmaxLactate * 0.45
  const lt1Stage = findStageNearLactate(stages, lt1LactateTarget)

  const lt1 = {
    lactate: lt1Stage.lactate,
    lactatePercent: (lt1Stage.lactate / maxLactate) * 100,
    speed: lt1Stage.speed || 10,
    heartRate: lt1Stage.heartRate,
    confidence: 'HIGH' as const,
    method: 'DMAX' as const
  }

  const metabolicType = detectMetabolicType(maxLactate, lt2.lactatePercent / 100)
  const athleteLevel = detectAthleteLevel(maxLactate, lt2.lactatePercent / 100, curvePattern)

  return {
    lt1,
    lt2,
    maxLactate,
    lt1Ratio: lt1.lactatePercent / 100,
    lt2Ratio: lt2.lactatePercent / 100,
    metabolicType,
    athleteLevel,
    curvePattern,
    confidence: 'VERY_HIGH',
    rSquared: dmaxResult.rSquared,
    warnings: [],
    errors: []
  }
}

/**
 * Create profile using individual ratio method
 * LT2 as % of max lactate (NOT fixed 4 mmol!)
 */
function createProfileFromRatioMethod(
  maxLactate: number,
  stages: LactateTestStage[],
  curvePattern: 'ASCENDING' | 'PLATEAU' | 'IRREGULAR',
  maxHR: number
): LactateProfile {
  // Estimate LT2 ratio based on max lactate and curve pattern
  const lt2RatioEstimate = estimateLT2Ratio(maxLactate, curvePattern)
  const lt2LactateTarget = maxLactate * lt2RatioEstimate

  // Find stage closest to target
  const lt2Stage = findStageNearLactate(stages, lt2LactateTarget)

  const lt2 = {
    lactate: lt2Stage.lactate,
    lactatePercent: (lt2Stage.lactate / maxLactate) * 100,
    speed: lt2Stage.speed || 12,
    heartRate: lt2Stage.heartRate,
    confidence: 'HIGH' as const,
    method: 'RATIO' as const
  }

  // LT1 = ~40-50% of LT2 lactate
  const lt1LactateTarget = lt2Stage.lactate * 0.45
  const lt1Stage = findStageNearLactate(stages, lt1LactateTarget)

  const lt1 = {
    lactate: lt1Stage.lactate,
    lactatePercent: (lt1Stage.lactate / maxLactate) * 100,
    speed: lt1Stage.speed || 10,
    heartRate: lt1Stage.heartRate,
    confidence: 'MEDIUM' as const,
    method: 'RATIO' as const
  }

  const metabolicType = detectMetabolicType(maxLactate, lt2.lactatePercent / 100)
  const athleteLevel = detectAthleteLevel(maxLactate, lt2.lactatePercent / 100, curvePattern)

  return {
    lt1,
    lt2,
    maxLactate,
    lt1Ratio: lt1.lactatePercent / 100,
    lt2Ratio: lt2.lactatePercent / 100,
    metabolicType,
    athleteLevel,
    curvePattern,
    confidence: 'HIGH',
    warnings: [],
    errors: []
  }
}

/**
 * Create profile from manual coach selection
 */
function createProfileFromManualSelection(
  lt1Stage: LactateTestStage,
  lt2Stage: LactateTestStage,
  maxLactate: number,
  stages: LactateTestStage[],
  curvePattern: 'ASCENDING' | 'PLATEAU' | 'IRREGULAR'
): LactateProfile {
  const lt1 = {
    lactate: lt1Stage.lactate,
    lactatePercent: (lt1Stage.lactate / maxLactate) * 100,
    speed: lt1Stage.speed || 10,
    heartRate: lt1Stage.heartRate,
    confidence: 'HIGH' as const,
    method: 'MANUAL' as const
  }

  const lt2 = {
    lactate: lt2Stage.lactate,
    lactatePercent: (lt2Stage.lactate / maxLactate) * 100,
    speed: lt2Stage.speed || 12,
    heartRate: lt2Stage.heartRate,
    confidence: 'HIGH' as const,
    method: 'MANUAL' as const
  }

  const metabolicType = detectMetabolicType(maxLactate, lt2.lactatePercent / 100)
  const athleteLevel = detectAthleteLevel(maxLactate, lt2.lactatePercent / 100, curvePattern)

  return {
    lt1,
    lt2,
    maxLactate,
    lt1Ratio: lt1.lactatePercent / 100,
    lt2Ratio: lt2.lactatePercent / 100,
    metabolicType,
    athleteLevel,
    curvePattern,
    confidence: 'HIGH',
    warnings: [],
    errors: []
  }
}

/**
 * Estimate LT2 as % of max lactate based on max value and curve pattern
 *
 * From Metabolic_Equilibrium_Lactate_Analysis.md:
 * - Elite marathoner: max 6-9, ratio 35-50%
 * - Elite 800m: max 18-25, ratio 18-25%
 * - Fast twitch marathoner: max 15-20, ratio 45-55%
 * - Sub-elite: max 11-14, ratio 30-35%
 * - Recreational: max 8-12, ratio 33-50% (but often "false peak")
 */
function estimateLT2Ratio(
  maxLactate: number,
  curvePattern: 'ASCENDING' | 'PLATEAU' | 'IRREGULAR'
): number {
  // Adjust for curve pattern
  if (curvePattern === 'ASCENDING') {
    // Still ascending - likely elite, use higher ratio
    if (maxLactate > 18) return 0.22 // Elite 800m
    if (maxLactate >= 15) return 0.50 // Fast twitch marathoner
    if (maxLactate >= 10) return 0.45 // Elite marathoner
    return 0.40 // Conservative
  }

  // Elite marathoner profile: max < 10, ratio 40-50%
  if (maxLactate < 10) {
    return 0.45 // 45% of max
  }

  // Elite 800m/middle-distance: max > 18, ratio 20-25%
  if (maxLactate > 18) {
    return 0.22 // 22% of max
  }

  // Fast twitch marathoner: max 15-20, ratio 45-55%
  if (maxLactate >= 15 && maxLactate <= 20) {
    return 0.50 // 50% of max (like user's athlete)
  }

  // Sub-elite: max 11-14, ratio 30-35%
  if (maxLactate >= 11 && maxLactate <= 14) {
    return 0.33 // 33% of max
  }

  // Recreational: max 8-12, ratio 33-50%
  // Use conservative estimate (likely "false peak")
  return 0.44 // 44% of max
}

/**
 * Detect metabolic type from lactate profile
 */
function detectMetabolicType(maxLactate: number, lt2Ratio: number): MetabolicType {
  // High glycolytic capacity (max > 15)
  if (maxLactate > 15) {
    if (lt2Ratio > 0.40) {
      // Compressed profile despite high max
      return 'FAST_TWITCH_ENDURANCE' // Like user's 1:28 HM athlete
    } else {
      // Expanded profile, huge anaerobic reserve
      return 'FAST_TWITCH_POWER' // 800m specialist
    }
  }

  // Low glycolytic capacity (max < 10)
  if (maxLactate < 10) {
    return 'SLOW_TWITCH' // Elite marathoner, suppressed VLamax
  }

  // Middle range (max 10-15)
  return 'MIXED' // Sub-elite, incomplete specialization
}

/**
 * Detect athlete level from lactate characteristics
 */
function detectAthleteLevel(
  maxLactate: number,
  lt2Ratio: number,
  curvePattern: 'ASCENDING' | 'PLATEAU' | 'IRREGULAR'
): AthleteLevel {
  // Elite indicators:
  // - Either very low max (<10) with compressed ratio (marathoner)
  // - Or very high max (>18) with expanded ratio (800m)
  // - Or high max (15-20) with compressed ratio (fast twitch marathoner)

  if (maxLactate < 10 && lt2Ratio > 0.35) {
    return 'ELITE' // Elite marathoner
  }

  if (maxLactate > 18 && lt2Ratio < 0.30) {
    return 'ELITE' // Elite middle-distance
  }

  if (maxLactate >= 15 && maxLactate <= 20 && lt2Ratio > 0.45) {
    return 'ELITE' // Fast twitch marathoner
  }

  // Sub-elite indicators:
  // - Max 11-14, ratio 30-35%
  // - Proper curve pattern

  if (maxLactate >= 11 && maxLactate <= 14 && curvePattern !== 'IRREGULAR') {
    return 'SUB_ELITE'
  }

  // Default: recreational
  return 'RECREATIONAL'
}

/**
 * Detect curve pattern
 */
function detectCurvePattern(
  stages: LactateTestStage[]
): 'ASCENDING' | 'PLATEAU' | 'IRREGULAR' {
  // Check if lactate is still rising at end
  const lastThree = stages.slice(-3)
  const isAscending = lastThree.every((stage, i) => {
    if (i === 0) return true
    return stage.lactate > lastThree[i - 1].lactate
  })

  const lastStage = stages[stages.length - 1]
  const secondLastStage = stages[stages.length - 2]

  if (isAscending && (lastStage.lactate - secondLastStage.lactate) > 1.0) {
    return 'ASCENDING' // Still rising significantly
  }

  // Check for plateau (last 2-3 stages within 0.5 mmol)
  const isPlateaued = Math.abs(lastStage.lactate - secondLastStage.lactate) < 0.5

  if (isPlateaued) {
    return 'PLATEAU'
  }

  // Check for irregularity (lactate decreasing at any point)
  for (let i = 1; i < stages.length; i++) {
    if (stages[i].lactate < stages[i - 1].lactate) {
      return 'IRREGULAR'
    }
  }

  return 'ASCENDING'
}

/**
 * Find stage closest to target lactate value
 */
function findStageNearLactate(
  stages: LactateTestStage[],
  targetLactate: number
): LactateTestStage {
  // Linear interpolation would be better, but for now find closest
  let closest = stages[0]
  let minDiff = Math.abs(stages[0].lactate - targetLactate)

  for (const stage of stages) {
    const diff = Math.abs(stage.lactate - targetLactate)
    if (diff < minDiff) {
      minDiff = diff
      closest = stage
    }
  }

  return closest
}

/**
 * Create fallback profile when data is insufficient
 */
function createFallbackProfile(
  stages: LactateTestStage[],
  maxHR: number,
  errors: string[]
): LactateProfile {
  // Use whatever we have, but mark as low confidence

  const maxLactate = stages.length > 0 ? Math.max(...stages.map(s => s.lactate)) : 4.0
  const lastStage = stages[stages.length - 1] || {
    lactate: 4.0,
    speed: 12,
    heartRate: maxHR * 0.85,
    sequence: 1
  }

  return {
    lt1: {
      lactate: 2.0,
      lactatePercent: (2.0 / maxLactate) * 100,
      speed: lastStage.speed ? lastStage.speed * 0.85 : 10,
      heartRate: Math.round(maxHR * 0.75),
      confidence: 'LOW',
      method: 'FIXED_2MMOL'
    },
    lt2: {
      lactate: 4.0,
      lactatePercent: (4.0 / maxLactate) * 100,
      speed: lastStage.speed || 12,
      heartRate: Math.round(maxHR * 0.85),
      confidence: 'LOW',
      method: 'FIXED_4MMOL'
    },
    maxLactate,
    lt1Ratio: 2.0 / maxLactate,
    lt2Ratio: 4.0 / maxLactate,
    metabolicType: 'MIXED',
    athleteLevel: 'RECREATIONAL',
    curvePattern: 'IRREGULAR',
    confidence: 'LOW',
    warnings: ['Insufficient data - using conservative defaults'],
    errors
  }
}

/**
 * Get training recommendations based on metabolic type
 */
export function getTrainingRecommendations(metabolicType: MetabolicType): {
  intervalType: 'EXTENSIVE' | 'INTENSIVE' | 'MIXED'
  recoveryDays: number
  taperLength: number
  volumeTolerance: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
} {
  switch (metabolicType) {
    case 'FAST_TWITCH_ENDURANCE':
      return {
        intervalType: 'EXTENSIVE',
        recoveryDays: 4,
        taperLength: 3,
        volumeTolerance: 'MEDIUM',
        description:
          'High glycolytic capacity detected. Focus on EXTENSIVE intervals (longer reps, moderate pace) to suppress VLamax. Needs 3-4 days recovery between hard sessions. Requires longer taper (2-3 weeks).'
      }

    case 'FAST_TWITCH_POWER':
      return {
        intervalType: 'INTENSIVE',
        recoveryDays: 3,
        taperLength: 2,
        volumeTolerance: 'MEDIUM',
        description:
          'Massive anaerobic reserve. Can handle INTENSIVE intervals (short reps, very fast). Good for 800m-1500m. Moderate recovery needs.'
      }

    case 'SLOW_TWITCH':
      return {
        intervalType: 'INTENSIVE',
        recoveryDays: 2,
        taperLength: 2,
        volumeTolerance: 'HIGH',
        description:
          'Low glycolytic capacity (diesel engine). Can handle INTENSIVE intervals and very high volume. Recovers quickly (2-3 days). Shorter taper (1-2 weeks) to avoid staleness.'
      }

    case 'MIXED':
      return {
        intervalType: 'MIXED',
        recoveryDays: 3,
        taperLength: 2,
        volumeTolerance: 'MEDIUM',
        description:
          'Mixed metabolic profile. Use varied interval types. Standard recovery (3 days between hard sessions).'
      }
  }
}
