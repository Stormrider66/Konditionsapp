// types/core.ts
// Base enums/unions, sport types and intensity-distribution targets.

// Bas-typer
export type Gender = 'MALE' | 'FEMALE'
export type TestType = 'RUNNING' | 'CYCLING' | 'SKIING'
export type TestStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED'
export type InclineUnit = 'PERCENT' | 'DEGREES'
export type UserRole = 'ADMIN' | 'COACH' | 'ATHLETE' | 'PHYSIO'
export type WorkoutType = 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'RECOVERY' | 'CYCLING' | 'SKIING' | 'SWIMMING' | 'HYROX' | 'TRIATHLON' | 'ALTERNATIVE' | 'OTHER'
export type WorkoutIntensity = 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'
export type PeriodPhase = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION'
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL'

// ==================== FITNESS LEVEL ESTIMATION ====================

/**
 * Fitness level classification based on estimated VO2max
 * Used for the "Accordion Effect" - zone width varies by fitness level
 */
export type FitnessLevel =
  | 'UNTRAINED'      // VO2max < 35
  | 'BEGINNER'       // VO2max 35-40
  | 'RECREATIONAL'   // VO2max 40-50
  | 'TRAINED'        // VO2max 50-55
  | 'WELL_TRAINED'   // VO2max 55-65
  | 'ELITE'          // VO2max > 65

/**
 * Confidence level for fitness estimation
 */
export type FitnessConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * Data source used for fitness estimation
 */
export type FitnessSource =
  | 'VDOT'           // From race results VDOT
  | 'WATCH_ESTIMATE' // From Garmin, Apple Watch, Polar, etc.
  | 'RACE_TIME'      // Calculated from race time
  | 'FTP'            // From cycling FTP/kg
  | 'CSS'            // From swimming Critical Swim Speed
  | 'EXPERIENCE'     // From experience level input
  | 'RESTING_HR'     // From resting heart rate
  | 'COMBINED'       // Multiple sources combined

/**
 * Fitness level estimate with LT1/LT2 percentages
 *
 * Research shows LT1/LT2 as %HRmax varies significantly by fitness level:
 * - Untrained: LT1 ≈ 58%, LT2 ≈ 78% (narrow Zone 2)
 * - Beginner: LT1 ≈ 63%, LT2 ≈ 80%
 * - Recreational: LT1 ≈ 68%, LT2 ≈ 84%
 * - Trained: LT1 ≈ 72%, LT2 ≈ 87%
 * - Well-trained: LT1 ≈ 76%, LT2 ≈ 90%
 * - Elite: LT1 ≈ 78%, LT2 ≈ 93% (wide Zone 2)
 */
export interface FitnessEstimate {
  /** Classified fitness level */
  level: FitnessLevel
  /** Estimated VO2max in ml/kg/min, null if unknown */
  estimatedVO2max: number | null
  /** Confidence in the estimate */
  confidence: FitnessConfidence
  /** Data source used for estimation */
  source: FitnessSource
  /** Estimated LT1 (aerobic threshold) as % of HRmax */
  lt1PercentHRmax: number
  /** Estimated LT2 (anaerobic threshold) as % of HRmax */
  lt2PercentHRmax: number
}

// Multi-sport types (including team sports and racket sports)
export type SportType =
  | 'RUNNING'
  | 'CYCLING'
  | 'SKIING'
  | 'SWIMMING'
  | 'TRIATHLON'
  | 'HYROX'
  | 'GENERAL_FITNESS'
  | 'FUNCTIONAL_FITNESS'
  | 'STRENGTH'
  // Team Sports
  | 'TEAM_FOOTBALL'
  | 'TEAM_ICE_HOCKEY'
  | 'TEAM_HANDBALL'
  | 'TEAM_FLOORBALL'
  | 'TEAM_BASKETBALL'
  | 'TEAM_VOLLEYBALL'
  // Racket Sports
  | 'TENNIS'
  | 'PADEL'
  // Non-sport focus areas
  | 'NUTRITION'

export const TEAM_SPORT_TYPES = [
  'TEAM_FOOTBALL',
  'TEAM_ICE_HOCKEY',
  'TEAM_HANDBALL',
  'TEAM_FLOORBALL',
  'TEAM_BASKETBALL',
  'TEAM_VOLLEYBALL',
] as const

export const RACKET_SPORT_TYPES = [
  'TENNIS',
  'PADEL',
] as const

export function isRacketSport(sport: SportType): boolean {
  return RACKET_SPORT_TYPES.includes(sport as typeof RACKET_SPORT_TYPES[number])
}

export function isTeamSport(sport: SportType): boolean {
  return sport.startsWith('TEAM_')
}

// ==================== INTENSITY DISTRIBUTION TARGETS ====================

/**
 * Training methodology defining the overall intensity distribution philosophy
 */
export type IntensityMethodology =
  | 'POLARIZED'           // 80/20 - High volume of easy work, limited hard efforts
  | 'THRESHOLD_FOCUSED'   // More tempo/threshold work for HYROX, functional fitness
  | 'PYRAMIDAL'           // Traditional pyramid - moderate amount of all intensities
  | 'BALANCED'            // Equal-ish distribution for general fitness
  | 'HIGH_INTENSITY'      // For very low volume (<3h) - maximize stimulus density
  | 'CUSTOM'              // User-defined targets

/**
 * Volume category for determining appropriate intensity distribution
 * Based on research from Muñoz et al. (2014) and Seiler
 */
export type VolumeCategory = 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'

/**
 * Frequency category for the "Rule of 6" logic gates
 */
export type FrequencyCategory = 'LOW' | 'MODERATE' | 'HIGH'

/**
 * Intensity distribution targets for training planning
 * Percentages must sum to 100
 */
export interface IntensityTargets {
  /** Zone 1-2 percentage (below LT1, easy/recovery) */
  easyPercent: number
  /** Zone 3 percentage (between LT1 and LT2, tempo/threshold) */
  moderatePercent: number
  /** Zone 4-5 percentage (above LT2, hard/VO2max/anaerobic) */
  hardPercent: number
  /** Training methodology this distribution follows */
  methodology?: IntensityMethodology
  /** Display label for the UI (e.g., "80/20", "HYROX Hybrid") */
  label?: string
}
