/**
 * Fitness Level Estimation for Zone Width Calculations
 *
 * Athletes without lactate tests get zones from a Bronze fallback that uses fixed percentages.
 * Research shows LT1/LT2 as %HRmax varies significantly by fitness level (the "Accordion Effect"):
 *
 * | Fitness Level | VO2max     | LT1 (% HRmax) | LT2 (% HRmax) | Zone 2 Width |
 * |---------------|------------|---------------|---------------|--------------|
 * | Untrained     | < 35       | 55-60%        | 75-80%        | Narrow       |
 * | Recreational  | 35-50      | 65-70%        | 82-87%        | Moderate     |
 * | Elite         | > 65       | 75-80%        | 90-95%        | Wide         |
 *
 * This module estimates fitness level from available data and calculates
 * fitness-adjusted LT1/LT2 percentages for more accurate zone calculation.
 */

import {
  Gender,
  TrainingZone,
  FitnessLevel,
  FitnessConfidence,
  FitnessSource,
  FitnessEstimate
} from '@/types'
import { estimateMaxHR, calculateTrainingZones } from '@/lib/calculations/zones'

// Re-export types for convenience
export type { FitnessLevel, FitnessConfidence, FitnessSource, FitnessEstimate }

export interface FitnessEstimationInput {
  // Demographic (required for some estimations)
  age?: number
  gender?: Gender
  weight?: number  // kg - needed for FTP/kg calculation

  // HIGH confidence sources (priority 1) - Direct VO2max or VDOT
  currentVDOT?: number
  watchVO2maxEstimate?: number  // From Garmin, Apple Watch, Polar, etc.

  // HIGH confidence sources (priority 2) - Race performance
  recentRaceTime?: {
    distance: RaceDistance
    timeMinutes: number
  }

  // HIGH confidence sources (priority 3) - Sport-specific thresholds
  cyclingFTP?: number  // Functional Threshold Power in watts
  swimmingCSS?: number  // Critical Swim Speed in seconds per 100m

  // MEDIUM confidence sources (priority 4)
  experienceLevel?: ExperienceLevel
  weeklyTrainingHours?: number

  // LOW confidence sources (priority 5) - Heart rate based
  restingHR?: number
  maxHR?: number  // If known from testing
}

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'

export type RaceDistance =
  | '1500M'
  | '1_MILE'
  | '3K'
  | '5K'
  | '10K'
  | 'HALF_MARATHON'
  | 'MARATHON'

// ============================================
// Constants
// ============================================

/**
 * Fitness level thresholds with corresponding LT1/LT2 percentages
 * Based on research from Seiler, Esteve-Lanao, and others
 */
export const FITNESS_LEVEL_THRESHOLDS = {
  UNTRAINED: {
    vo2maxMax: 35,
    lt1Percent: 58,  // Very narrow Zone 2
    lt2Percent: 78
  },
  BEGINNER: {
    vo2maxMin: 35,
    vo2maxMax: 40,
    lt1Percent: 63,
    lt2Percent: 80
  },
  RECREATIONAL: {
    vo2maxMin: 40,
    vo2maxMax: 50,
    lt1Percent: 68,
    lt2Percent: 84
  },
  TRAINED: {
    vo2maxMin: 50,
    vo2maxMax: 55,
    lt1Percent: 72,
    lt2Percent: 87
  },
  WELL_TRAINED: {
    vo2maxMin: 55,
    vo2maxMax: 65,
    lt1Percent: 76,
    lt2Percent: 90
  },
  ELITE: {
    vo2maxMin: 65,
    lt1Percent: 78,  // Wide Zone 2
    lt2Percent: 93
  }
} as const

/**
 * Experience level to estimated VO2max mapping
 * Conservative estimates for planning purposes
 */
const EXPERIENCE_TO_VO2MAX: Record<ExperienceLevel, number> = {
  BEGINNER: 38,      // < 1 year training
  INTERMEDIATE: 45,  // 1-3 years
  ADVANCED: 52,      // 3-5 years
  ELITE: 60,         // 5+ years, competitive
}

/**
 * Reference race times for VDOT estimation
 * Based on Jack Daniels' VDOT tables
 */
const RACE_DISTANCE_METERS: Record<RaceDistance, number> = {
  '1500M': 1500,
  '1_MILE': 1609.34,
  '3K': 3000,
  '5K': 5000,
  '10K': 10000,
  'HALF_MARATHON': 21097.5,
  'MARATHON': 42195
}

/**
 * FTP/kg to VO2max correlation
 * Based on research correlating cycling power output with aerobic capacity
 * Source: Relationship between VO2max and cycling power output
 *
 * Approximate relationship: VO2max ≈ (FTP/kg × 10.8) + 7
 * This assumes ~75% of VO2max is sustainable at FTP
 */
export function estimateVO2maxFromFTP(ftpWatts: number, weightKg: number): number {
  const ftpPerKg = ftpWatts / weightKg
  // FTP typically corresponds to ~75% of VO2max for trained cyclists
  // VO2 at FTP ≈ FTP/kg × 10.8 + 7 (ml/kg/min)
  // VO2max ≈ VO2 at FTP / 0.75
  const vo2AtFTP = ftpPerKg * 10.8 + 7
  return vo2AtFTP / 0.75
}

/**
 * CSS (Critical Swim Speed) to VO2max estimation
 * CSS is typically sustainable at 85-90% of VO2max for trained swimmers
 *
 * Faster CSS (lower seconds per 100m) indicates higher fitness
 * Based on swim-specific VO2max correlations
 */
export function estimateVO2maxFromCSS(cssSecondsPer100m: number): number {
  // CSS pace to velocity (m/min)
  const velocityMPerMin = (100 / cssSecondsPer100m) * 60

  // Swimming VO2 estimation (different from running due to efficiency)
  // Approximate: VO2 ≈ velocity × 0.5 + 10 for front crawl
  const vo2AtCSS = velocityMPerMin * 0.5 + 10

  // CSS is typically 85-88% of VO2max for swimmers
  return vo2AtCSS / 0.86
}

// ============================================
// Main Estimation Function
// ============================================

/**
 * Estimate fitness level from available data sources
 *
 * Priority order (higher = more accurate):
 * 1. VDOT from race results (HIGH confidence)
 * 2. Watch VO2max estimate (HIGH confidence - direct measurement)
 * 3. Calculated VDOT from race times (HIGH confidence)
 * 4. Cycling FTP with weight (HIGH confidence for cyclists)
 * 5. Swimming CSS (HIGH confidence for swimmers)
 * 6. Experience level + weekly volume (MEDIUM confidence)
 * 7. Resting HR + max HR or age (LOW confidence)
 */
export function estimateFitnessLevel(input: FitnessEstimationInput): FitnessEstimate {
  // Priority 1: VDOT from race results (best predictor for runners)
  if (input.currentVDOT && input.currentVDOT > 0) {
    const estimatedVO2max = estimateVO2maxFromVDOT(input.currentVDOT)
    const level = getFitnessLevelFromVO2max(estimatedVO2max)
    const thresholds = getThresholdPercentsForFitness(level)

    return {
      level,
      estimatedVO2max,
      confidence: 'HIGH',
      source: 'VDOT',
      ...thresholds
    }
  }

  // Priority 2: Watch VO2max estimate (Garmin, Apple Watch, Polar, etc.)
  if (input.watchVO2maxEstimate && input.watchVO2maxEstimate > 0) {
    const level = getFitnessLevelFromVO2max(input.watchVO2maxEstimate)
    const thresholds = getThresholdPercentsForFitness(level)

    return {
      level,
      estimatedVO2max: input.watchVO2maxEstimate,
      confidence: 'HIGH',
      source: 'WATCH_ESTIMATE',
      ...thresholds
    }
  }

  // Priority 3: Calculate VDOT from race time
  if (input.recentRaceTime) {
    const vdot = calculateVDOTFromRaceTime(
      input.recentRaceTime.distance,
      input.recentRaceTime.timeMinutes
    )
    const estimatedVO2max = estimateVO2maxFromVDOT(vdot)
    const level = getFitnessLevelFromVO2max(estimatedVO2max)
    const thresholds = getThresholdPercentsForFitness(level)

    return {
      level,
      estimatedVO2max,
      confidence: 'HIGH',
      source: 'RACE_TIME',
      ...thresholds
    }
  }

  // Priority 4: Cycling FTP (requires weight for FTP/kg calculation)
  if (input.cyclingFTP && input.cyclingFTP > 0 && input.weight && input.weight > 0) {
    const estimatedVO2max = estimateVO2maxFromFTP(input.cyclingFTP, input.weight)
    const level = getFitnessLevelFromVO2max(estimatedVO2max)
    const thresholds = getThresholdPercentsForFitness(level)

    return {
      level,
      estimatedVO2max,
      confidence: 'HIGH',
      source: 'FTP',
      ...thresholds
    }
  }

  // Priority 5: Swimming CSS
  if (input.swimmingCSS && input.swimmingCSS > 0) {
    const estimatedVO2max = estimateVO2maxFromCSS(input.swimmingCSS)
    const level = getFitnessLevelFromVO2max(estimatedVO2max)
    const thresholds = getThresholdPercentsForFitness(level)

    return {
      level,
      estimatedVO2max,
      confidence: 'HIGH',
      source: 'CSS',
      ...thresholds
    }
  }

  // Priority 6: Experience level
  if (input.experienceLevel) {
    const baseVO2max = EXPERIENCE_TO_VO2MAX[input.experienceLevel]

    // Adjust based on weekly training hours if available
    let adjustedVO2max = baseVO2max
    if (input.weeklyTrainingHours) {
      // More training hours suggest higher fitness within experience level
      // ~1-2 ml/kg/min per additional 2 hours/week above baseline
      const baseHours = getBaseHoursForExperience(input.experienceLevel)
      const hoursDiff = input.weeklyTrainingHours - baseHours
      adjustedVO2max += Math.min(5, Math.max(-5, hoursDiff * 0.5))
    }

    const level = getFitnessLevelFromVO2max(adjustedVO2max)
    const thresholds = getThresholdPercentsForFitness(level)

    return {
      level,
      estimatedVO2max: adjustedVO2max,
      confidence: 'MEDIUM',
      source: input.weeklyTrainingHours ? 'COMBINED' : 'EXPERIENCE',
      ...thresholds
    }
  }

  // Priority 7: Resting HR estimation (Uth-Sørensen-Overgaard-Pedersen formula)
  if (input.restingHR && input.restingHR > 0) {
    // Use provided maxHR or estimate from age
    const maxHR = input.maxHR || (input.age ? estimateMaxHR(input.age, input.gender || 'MALE') : null)

    if (maxHR) {
      const estimatedVO2max = 15.3 * (maxHR / input.restingHR)
      const level = getFitnessLevelFromVO2max(estimatedVO2max)
      const thresholds = getThresholdPercentsForFitness(level)

      return {
        level,
        estimatedVO2max,
        confidence: input.maxHR ? 'MEDIUM' : 'LOW',  // Higher confidence if maxHR is known
        source: 'RESTING_HR',
        ...thresholds
      }
    }
  }

  // Default: Assume recreational fitness if no data available
  const level: FitnessLevel = 'RECREATIONAL'
  const thresholds = getThresholdPercentsForFitness(level)

  return {
    level,
    estimatedVO2max: null,
    confidence: 'LOW',
    source: 'EXPERIENCE',
    ...thresholds
  }
}

// ============================================
// VO2max Estimation Functions
// ============================================

/**
 * Estimate VO2max from VDOT
 *
 * VDOT correlates strongly with VO2max for trained runners.
 * VDOT ≈ VO2max × running economy factor (typically 0.9-1.0)
 * We use conservative 0.95 factor.
 */
export function estimateVO2maxFromVDOT(vdot: number): number {
  // VDOT is approximately 0.9-1.0 × VO2max depending on running economy
  // Conservative estimate: assume good but not elite economy
  return vdot * 0.95
}

/**
 * Calculate VDOT from race time using Jack Daniels' formula
 *
 * Simplified version of the VDOT calculation:
 * VDOT = velocity (m/min) × time × 0.000104 + 0.182258 × exp(-0.012778 × time) + 0.8
 */
export function calculateVDOTFromRaceTime(distance: RaceDistance, timeMinutes: number): number {
  const meters = RACE_DISTANCE_METERS[distance]
  const velocity = meters / timeMinutes  // m/min

  // Simplified Jack Daniels VDOT approximation
  // Based on curve fitting of VDOT tables
  const percentVO2max = getPercentVO2maxForDuration(timeMinutes)
  const vo2 = velocity * 0.2 + 3.5  // Simplified VO2 from velocity

  return (vo2 / percentVO2max) * 100
}

/**
 * Get approximate %VO2max sustainable for race duration
 * Based on empirical data from Jack Daniels
 */
function getPercentVO2maxForDuration(minutes: number): number {
  if (minutes <= 10) return 98
  if (minutes <= 20) return 95
  if (minutes <= 40) return 90
  if (minutes <= 60) return 85
  if (minutes <= 120) return 80
  if (minutes <= 180) return 75
  return 70
}

/**
 * Estimate VO2max from resting heart rate using Uth-Sørensen-Overgaard-Pedersen formula
 *
 * Formula: VO2max = 15.3 × (HRmax / HRrest)
 *
 * Reference:
 * Uth, N., et al. (2004). Estimation of VO2max from the ratio between HRmax and HRrest.
 * European Journal of Applied Physiology, 91(1), 111-115.
 */
export function estimateVO2maxFromRestingHR(
  restingHR: number,
  age: number,
  gender: Gender
): number {
  const maxHR = estimateMaxHR(age, gender)
  return 15.3 * (maxHR / restingHR)
}

// ============================================
// Fitness Level Classification
// ============================================

/**
 * Determine fitness level from estimated VO2max
 */
export function getFitnessLevelFromVO2max(vo2max: number): FitnessLevel {
  if (vo2max < 35) return 'UNTRAINED'
  if (vo2max < 40) return 'BEGINNER'
  if (vo2max < 50) return 'RECREATIONAL'
  if (vo2max < 55) return 'TRAINED'
  if (vo2max < 65) return 'WELL_TRAINED'
  return 'ELITE'
}

/**
 * Get LT1/LT2 percentages for a fitness level
 */
export function getThresholdPercentsForFitness(level: FitnessLevel): {
  lt1PercentHRmax: number
  lt2PercentHRmax: number
} {
  const thresholds = FITNESS_LEVEL_THRESHOLDS[level]
  return {
    lt1PercentHRmax: thresholds.lt1Percent,
    lt2PercentHRmax: thresholds.lt2Percent
  }
}

/**
 * Get baseline weekly training hours for experience level
 */
function getBaseHoursForExperience(level: ExperienceLevel): number {
  switch (level) {
    case 'BEGINNER': return 3
    case 'INTERMEDIATE': return 5
    case 'ADVANCED': return 8
    case 'ELITE': return 12
  }
}

// ============================================
// Convenience Function for Zone Calculation
// ============================================

export interface EstimatedZonesResult {
  zones: TrainingZone[]
  fitnessEstimate: FitnessEstimate
  warnings: string[]
}

/**
 * Get estimated zones for an athlete without test data
 *
 * This is the main entry point for AI and onboarding flows.
 * It combines fitness estimation with zone calculation to produce
 * fitness-adjusted training zones.
 */
export function getEstimatedZonesForAthlete(params: {
  age: number
  gender: Gender
  weight?: number  // kg - needed for FTP/kg calculation
  maxHR?: number  // If known, otherwise estimated from age

  // Fitness estimation inputs (priority order)
  currentVDOT?: number
  watchVO2maxEstimate?: number  // From Garmin, Apple Watch, Polar, etc.
  recentRaceTime?: { distance: RaceDistance; timeMinutes: number }
  cyclingFTP?: number  // Functional Threshold Power in watts
  swimmingCSS?: number  // Critical Swim Speed in seconds per 100m
  experienceLevel?: ExperienceLevel
  weeklyTrainingHours?: number
  restingHR?: number
}): EstimatedZonesResult {
  // 1. Estimate fitness level
  const fitnessEstimate = estimateFitnessLevel({
    age: params.age,
    gender: params.gender,
    weight: params.weight,
    maxHR: params.maxHR,
    currentVDOT: params.currentVDOT,
    watchVO2maxEstimate: params.watchVO2maxEstimate,
    recentRaceTime: params.recentRaceTime,
    cyclingFTP: params.cyclingFTP,
    swimmingCSS: params.swimmingCSS,
    experienceLevel: params.experienceLevel,
    weeklyTrainingHours: params.weeklyTrainingHours,
    restingHR: params.restingHR
  })

  // 2. Estimate maxHR if not provided
  const maxHR = params.maxHR || estimateMaxHR(params.age, params.gender)

  // 3. Calculate fitness-adjusted zones
  // Create a minimal client object for the zones function
  const mockClient = {
    id: 'fitness-estimate',
    userId: 'fitness-estimate',
    name: 'Fitness Estimate',
    gender: params.gender,
    birthDate: new Date(new Date().getFullYear() - params.age, 0, 1),
    height: 175,
    weight: 70,
    createdAt: new Date(),
    updatedAt: new Date(),
    teamId: null
  }

  const result = calculateTrainingZones(
    mockClient,
    maxHR,
    null,  // No LT1 from test
    null,  // No LT2 from test
    'RUNNING',
    fitnessEstimate  // Pass fitness estimate for adjusted zones
  )

  // 4. Generate warnings for novices
  const warnings: string[] = []

  if (fitnessEstimate.level === 'UNTRAINED') {
    warnings.push(
      'Din zon 2 är mycket smal. För att hålla dig i rätt intensitet, ' +
      'rekommenderas gång/löp-intervaller (t.ex. 2 min löpning, 1 min gång).'
    )
  } else if (fitnessEstimate.level === 'BEGINNER') {
    warnings.push(
      'Zon 2 är relativt smal. Överväg att använda gång/löp-intervaller ' +
      'för att hålla dig i den lätta zonen.'
    )
  }

  if (fitnessEstimate.confidence === 'LOW') {
    warnings.push(
      'Zonerna är uppskattade med låg säkerhet. Överväg att göra ett ' +
      'fälttest eller lakttatest för mer exakta zoner.'
    )
  }

  return {
    zones: result.zones,
    fitnessEstimate,
    warnings
  }
}

// ============================================
// Display Helpers
// ============================================

/**
 * Get Swedish display name for fitness level
 */
export function getFitnessLevelDisplayName(level: FitnessLevel): string {
  const names: Record<FitnessLevel, string> = {
    UNTRAINED: 'Otränad',
    BEGINNER: 'Nybörjare',
    RECREATIONAL: 'Motionär',
    TRAINED: 'Tränad',
    WELL_TRAINED: 'Vältränad',
    ELITE: 'Elit'
  }
  return names[level]
}

/**
 * Get Swedish display name for confidence level
 */
export function getConfidenceDisplayName(confidence: FitnessConfidence): string {
  const names: Record<FitnessConfidence, string> = {
    HIGH: 'Hög',
    MEDIUM: 'Medel',
    LOW: 'Låg'
  }
  return names[confidence]
}
