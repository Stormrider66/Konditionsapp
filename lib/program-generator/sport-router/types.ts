import type { Test } from '@/types'
import type { SportType } from '@prisma/client'
import type { FitnessGoal, FitnessLevel } from '../templates/general-fitness'

/**
 * Athlete level classification based on vLT2 speed
 * Used to select appropriate race pace coefficients
 */
export type AthleteLevelFromVLT2 = 'ELITE' | 'ADVANCED' | 'INTERMEDIATE' | 'RECREATIONAL'

/**
 * Race pace coefficients from vLT2 - based on research Table 2
 * These represent the % of vLT2 sustainable for each race distance
 */
export interface RacePaceCoefficients {
  level: AthleteLevelFromVLT2
  v5k: { min: number; max: number }      // Above threshold (anaerobic contribution)
  v10k: { min: number; max: number }     // At or near threshold
  vHalfMarathon: { min: number; max: number }  // Below threshold
  vMarathon: { min: number; max: number }      // Well below threshold
}

/**
 * Methodology-specific training paces
 * PRIMARY ANCHOR: vLT2 (velocity at Lactate Threshold 2)
 */
export interface MethodologyPaces {
  methodology: 'DANIELS' | 'NORWEGIAN' | 'CANOVA'

  // ===== PRIMARY ANCHOR: vLT2 =====
  vLT2Kmh: number                // Velocity at LT2 from D-max (PRIMARY!)
  athleteLevel: AthleteLevelFromVLT2  // Classification based on vLT2

  // Common reference paces (km/h) - all derived from vLT2
  marathonPaceKmh: number        // From vLT2 × coefficient
  easyPaceKmh: number
  thresholdPaceKmh: number       // = vLT2

  // Norwegian-specific (sub-threshold)
  subThresholdPaceKmh?: number      // 2.3-3.0 mmol/L (just below LT2)
  norwegianAmPaceKmh?: number       // AM session: 2.0-3.0 mmol/L (LT2 + 20s/km)
  norwegianPmPaceKmh?: number       // PM session: 3.0-4.0 mmol/L (LT2 + 10s/km)

  // Canova-specific (MP-based zones)
  canovaRegenerationKmh?: number    // 60-70% MP (very slow recovery)
  canovaFundamentalKmh?: number     // 80% MP
  canovaGeneralEnduranceKmh?: number // 85-90% MP (active recovery in intervals!)
  canovaSpecialEnduranceKmh?: number // 90-95% MP
  canovaSpecificKmh?: number         // 95-105% MP (race zone)
  canovaSpecialSpeedKmh?: number     // 105-110% MP

  // Daniels-specific (VDOT-based) - for interval pacing
  intervalPaceKmh?: number     // From vVO2max
  repetitionPaceKmh?: number   // ~105% of vVO2max
  vVO2maxKmh?: number          // Velocity at VO2max (VO2max ÷ Economy)

  // Race pace predictions from vLT2
  predicted5kPaceKmh?: number
  predicted10kPaceKmh?: number
  predictedHalfMarathonPaceKmh?: number
  predictedMarathonPaceKmh?: number

  // Source data and quality flags
  vdot?: number | null
  vo2max?: number | null        // Actual VO2max from lab test
  runningEconomy?: number | null // C_r in ml/kg/km
  lt2SpeedKmh?: number | null   // Alias for vLT2Kmh
  hasLabTestData: boolean       // True if we have VO2max + economy
  hasLactateTestData: boolean   // True if we have D-max vLT2
  dataSource: 'VLT2_DMAX' | 'VVO2MAX' | 'RACE_TIME' | 'ESTIMATION'
}

/**
 * Extract actual VO2max from lab test data
 * This is the most accurate source - direct measurement, not estimation
 *
 * Priority hierarchy for pace calculation:
 * 1. Actual VO2max from lab test (this function)
 * 2. LT2 from lactate test (extractLT2FromTest)
 * 3. Race time VDOT estimation
 * 4. Experience-based estimation

/**
 * Experience level type - 4 tiers aligned with vLT2-based classification
 */
export type ExperienceLevel = 'recreational' | 'intermediate' | 'advanced' | 'elite'

export type DataSourceType = 'TEST' | 'PROFILE' | 'MANUAL'

export interface SportProgramParams {
  // Common fields
  clientId: string
  coachId: string
  sport: SportType
  goal: string
  dataSource: DataSourceType
  durationWeeks: number
  sessionsPerWeek: number
  notes?: string
  targetRaceDate?: Date

  // Test-based
  testId?: string

  // Manual values
  manualFtp?: number
  manualCss?: string
  manualVdot?: number

  // Sport-specific
  methodology?: string
  weeklyHours?: number
  bikeType?: string
  technique?: string
  poolLength?: string

  // Strength integration
  includeStrength?: boolean
  strengthSessionsPerWeek?: number

  // ===== NEW FIELDS FROM WIZARD =====

  // Athlete Profile (Running/HYROX/Triathlon)
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  yearsRunning?: number
  currentWeeklyVolume?: number
  longestLongRun?: number

  // Race Results for VDOT (pure running races only)
  recentRaceDistance?: 'NONE' | '5K' | '10K' | 'HALF' | 'MARATHON'
  recentRaceTime?: string // HH:MM:SS or MM:SS format

  // Target Race Goal Time (for progressive pace calculation)
  targetTime?: string // HH:MM:SS format - the goal time for the target race

  // Core & Alternative Training
  coreSessionsPerWeek?: number
  alternativeTrainingSessionsPerWeek?: number
  scheduleStrengthAfterRunning?: boolean
  scheduleCoreAfterRunning?: boolean

  // Equipment & Monitoring
  hasLactateMeter?: boolean
  hasHRVMonitor?: boolean
  hasPowerMeter?: boolean // Cycling/Triathlon only

  // ===== HYROX Station Times (seconds) =====
  hyroxStationTimes?: {
    skierg?: number | null
    sledPush?: number | null
    sledPull?: number | null
    burpeeBroadJump?: number | null
    rowing?: number | null
    farmersCarry?: number | null
    sandbagLunge?: number | null
    wallBalls?: number | null
    averageRunPace?: number | null
  }

  // HYROX Division
  hyroxDivision?: 'open' | 'pro' | 'doubles'
  hyroxGender?: 'male' | 'female'
  hyroxBodyweight?: number

  // ===== Strength PRs (kg) =====
  strengthPRs?: {
    deadlift?: number
    backSquat?: number
    benchPress?: number
    overheadPress?: number
    barbellRow?: number
    pullUps?: number // max reps
  }

  // General Fitness specific
  fitnessGoal?: FitnessGoal
  fitnessLevel?: FitnessLevel
  hasGymAccess?: boolean
  preferredActivities?: string[]

  // Team, court and racket sports profile settings
  hockeySettings?: Record<string, unknown> | null
  footballSettings?: Record<string, unknown> | null
  basketballSettings?: Record<string, unknown> | null
  handballSettings?: Record<string, unknown> | null
  floorballSettings?: Record<string, unknown> | null
  volleyballSettings?: Record<string, unknown> | null
  tennisSettings?: Record<string, unknown> | null
  padelSettings?: Record<string, unknown> | null

  // Calendar constraints - blocked dates won't have workouts scheduled
  calendarConstraints?: {
    blockedDates: string[] // ISO date strings (YYYY-MM-DD)
    reducedDates: string[] // dates with reduced training capacity
    altitudePeriods: { start: string; end: string; altitude: number }[]
  }
}

/**
 * Format date to YYYY-MM-DD string in local timezone
 * (avoids UTC conversion issues with toISOString)

/**
 * Pace progression configuration for progressive training
 */
export interface PaceProgression {
  currentPaceKmh: number  // Starting pace (from current fitness/PB)
  targetPaceKmh: number   // Goal pace (from target time)
  totalWeeks: number      // Total program duration
}

/**
 * Calculate progressive pace for a given week within a phase

 * - NORWEGIAN_DOUBLES: 35% BASE, 40% BUILD, 15% PEAK, 10% TAPER (elite)
 * - CANOVA: 25% BASE, 27% BUILD, 40% PEAK, 8% TAPER (inverted - long peak!)
 * - PYRAMIDAL: 45% BASE, 30% BUILD, 15% PEAK, 10% TAPER (longer aerobic base)
 */
export interface SupplementaryTraining {
  strengthSessionsPerWeek?: number
  coreSessionsPerWeek?: number
  scheduleStrengthAfterRunning?: boolean
  scheduleCoreAfterRunning?: boolean
}

export interface MethodologyContext {
  test?: Test
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  currentWeeklyVolume?: number
  recentRaceDistance?: string
  recentRaceTime?: string
}

/**
 * Training paces result with all Daniels zones
 */
export interface TrainingPacesResult {
  marathonPaceKmh: number
  easyPaceKmh: { min: number; max: number }
  thresholdPaceKmh: number
  intervalPaceKmh: number
  repetitionPaceKmh: number
  vdot: number | null
}

/**
 * Estimate training paces from athlete profile using Jack Daniels' VDOT system
 * Returns all training paces calculated as proper percentages of VDOT velocity
 */
