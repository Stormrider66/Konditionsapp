/**
 * Workout Modification Type Definitions
 *
 * Defines all types for the adaptive training intelligence system
 * that modifies workouts based on athlete readiness
 */

import { MethodologyType } from '../methodologies/types'

/**
 * Modification decision outcomes
 */
export type ModificationDecision =
  | 'PROCEED' // Workout as planned
  | 'REDUCE_INTENSITY' // Lower zones/pace
  | 'REDUCE_VOLUME' // Shorter duration/distance
  | 'REDUCE_BOTH' // Both intensity and volume
  | 'EASY_DAY' // Convert to easy aerobic
  | 'REST' // Skip workout entirely
  | 'CROSS_TRAIN' // Substitute with low-impact

/**
 * Readiness levels (0-10 scale)
 */
export type ReadinessLevel =
  | 'EXCELLENT' // 9-10: Fresh and ready
  | 'GOOD' // 7-8.9: Ready for quality
  | 'MODERATE' // 5-6.9: Proceed with caution
  | 'FAIR' // 3-4.9: Reduce training
  | 'POOR' // 1-2.9: Minimal training
  | 'VERY_POOR' // 0-0.9: Rest required

/**
 * Red flag types (automatic overrides)
 */
export type RedFlagType =
  | 'HRV_CRITICAL' // HRV < 75% baseline
  | 'RHR_ELEVATED' // RHR > +10 bpm
  | 'ILLNESS_SUSPECTED' // Wellness red flags
  | 'INJURY_PAIN' // Pain reported
  | 'EXTREME_FATIGUE' // Fatigue score 1-2
  | 'POOR_SLEEP' // < 4 hours sleep
  | 'CONSECUTIVE_DECLINE' // 5+ days declining

/**
 * Workout intensity categorization
 */
export type WorkoutIntensity =
  | 'RECOVERY' // Zone 1, very easy
  | 'EASY' // Zone 1-2, aerobic
  | 'MODERATE' // Zone 2-3, tempo
  | 'THRESHOLD' // Zone 3-4, LT work
  | 'HARD' // Zone 4-5, intervals
  | 'VERY_HARD' // Zone 5, VO2max

/**
 * Complete workout modification result
 */
export interface WorkoutModification {
  decision: ModificationDecision
  readinessScore: number // 0-10
  readinessLevel: ReadinessLevel

  // Original workout details
  originalWorkout: {
    type: string
    intensity: WorkoutIntensity
    durationMinutes?: number
    distanceKm?: number
    zones?: number[]
  }

  // Modified workout details (if modified)
  modifiedWorkout?: {
    type: string
    intensity: WorkoutIntensity
    durationMinutes?: number
    distanceKm?: number
    zones?: number[]
    intensityReduction?: number // Percentage reduction
    volumeReduction?: number // Percentage reduction
  }

  // Explanation
  rationale: string
  factors: {
    hrv?: { status: string; impact: string }
    rhr?: { status: string; impact: string }
    wellness?: { status: string; impact: string }
    acwr?: { status: string; impact: string }
    sleep?: { status: string; impact: string }
  }

  // Red flags that triggered modification
  redFlags: RedFlagType[]

  // Recommendations
  recommendations: string[]

  // Metadata
  methodology: MethodologyType
  wasCoachOverridden: boolean
  timestamp: Date
}

/**
 * Modification rules by readiness level
 */
export interface ModificationRules {
  readinessLevel: ReadinessLevel

  // For different workout types
  recovery: ModificationDecision
  easy: ModificationDecision
  moderate: ModificationDecision
  threshold: ModificationDecision
  hard: ModificationDecision
  veryHard: ModificationDecision

  // Adjustment parameters
  intensityReduction: number // 0-100%
  volumeReduction: number // 0-100%

  // Guidance
  guidance: string
  warnings: string[]
}

/**
 * Methodology-specific modification thresholds
 */
export interface MethodologyModificationRules {
  methodology: MethodologyType

  // Minimum readiness scores for different intensities
  minReadinessForThreshold: number // 0-10
  minReadinessForHard: number
  minReadinessForVeryHard: number

  // Modification strictness
  strictness: 'PERMISSIVE' | 'MODERATE' | 'STRICT' | 'VERY_STRICT'

  // Special rules
  allowThresholdOnModerate: boolean // Allow threshold work at moderate readiness
  requireExcellentForIntervals: boolean // Require excellent readiness for intervals

  // Rationale
  rationale: string
}

/**
 * Red flag detection result
 */
export interface RedFlagDetection {
  hasRedFlags: boolean
  flags: RedFlagType[]
  criticalFlags: RedFlagType[] // Flags that force rest
  forcedDecision?: ModificationDecision
  explanation: string
  recommendations: string[]
}

/**
 * Coach override record
 */
export interface CoachOverride {
  id: string
  workoutId: string
  athleteId: string
  coachId: string

  // System recommendation
  systemDecision: ModificationDecision
  systemReadiness: number
  systemRationale: string

  // Coach decision
  coachDecision: ModificationDecision
  coachRationale: string

  // Outcome tracking
  athleteFeedback?: {
    completed: boolean
    perceivedEffort: number // 1-10
    howFelt: string
    notes?: string
  }

  timestamp: Date
}

/**
 * Modification history entry
 */
export interface ModificationHistoryEntry {
  id: string
  workoutId: string
  athleteId: string
  date: Date

  // Readiness snapshot
  readinessScore: number
  readinessLevel: ReadinessLevel
  readinessFactors: {
    hrv?: number
    rhr?: number
    wellness?: number
    acwr?: number
    sleep?: number
  }

  // Decision
  decision: ModificationDecision
  wasModified: boolean
  wasCoachOverridden: boolean

  // Outcome
  workoutCompleted: boolean
  actualPerceivedEffort?: number
  actualDuration?: number

  // Learning data
  wasModificationCorrect?: boolean // Coach/athlete feedback
  notes?: string
}

/**
 * Pattern learning data
 */
export interface AthletePattern {
  athleteId: string

  // Observed patterns
  avgReadinessScore: number
  readinessVariability: number // Standard deviation

  // Response to training
  respondsBetterToHighVolume: boolean
  respondsBetterToHighIntensity: boolean

  // Recovery characteristics
  avgRecoveryDays: number // Days between hard workouts
  fastRecoverer: boolean // Recovers faster than average
  slowRecoverer: boolean // Needs more recovery

  // Optimal conditions
  optimalReadinessForThreshold: number // Learned from history
  optimalReadinessForIntervals: number

  // Modification effectiveness
  modificationSuccessRate: number // 0-100%
  overrideSuccessRate: number // When coach overrides

  // Data confidence
  dataPoints: number
  confidence: 'LOW' | 'MODERATE' | 'HIGH'

  lastUpdated: Date
}
