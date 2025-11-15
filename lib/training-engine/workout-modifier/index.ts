/**
 * Workout Modification System - Main Entry Point
 *
 * Adaptive training intelligence that modifies workouts daily
 * based on athlete readiness.
 *
 * Usage:
 * ```typescript
 * const modification = modifyWorkout({
 *   readinessScore: 6.5,
 *   workoutIntensity: 'THRESHOLD',
 *   methodology: 'POLARIZED',
 *   redFlags: ['HRV_CRITICAL'],
 *   // ... other params
 * })
 * ```
 *
 * @module workout-modifier
 */

import type {
  WorkoutModification,
  WorkoutIntensity,
  ModificationDecision,
  RedFlagType,
} from './types'
import { MethodologyType } from '../methodologies/types'
import {
  determineModification,
  getReadinessLevel,
  getModificationRationale,
  getModificationRecommendations,
} from './decision-engine'
import {
  applyModificationRules,
  getModificationSummary,
  calculateAdjustedPace,
  calculateAdjustedPower,
} from './modification-rules'
import {
  detectRedFlags,
  canTrainWithRedFlags,
  estimateRecoveryTime,
  shouldSeekMedicalAttention,
  type ReadinessComponents,
} from './red-flags'

// Re-export types for convenient importing
export * from './types'
export { detectRedFlags, canTrainWithRedFlags } from './red-flags'

/**
 * Input parameters for workout modification
 */
export interface ModifyWorkoutInput {
  // Readiness
  readinessScore: number // 0-10 from Phase 3 readiness composite
  readinessComponents?: ReadinessComponents // For red flag detection

  // Workout details
  workoutIntensity: WorkoutIntensity
  workoutDurationMinutes?: number
  workoutDistanceKm?: number
  workoutZones?: number[]
  workoutType?: string

  // Context
  methodology: MethodologyType
  athleteId?: string

  // Optional overrides
  redFlags?: RedFlagType[] // Pre-detected flags
  coachOverride?: {
    decision: ModificationDecision
    rationale: string
  }
}

/**
 * Main function: Modify workout based on readiness
 *
 * Returns complete modification with decision, rationale, and instructions
 */
export function modifyWorkout(input: ModifyWorkoutInput): WorkoutModification {
  // Detect red flags if components provided
  let redFlags = input.redFlags || []
  if (input.readinessComponents && !input.redFlags) {
    const detection = detectRedFlags(input.readinessComponents)
    redFlags = detection.flags

    // If critical flags force a decision, use that
    if (detection.forcedDecision) {
      return createForcedModification(input, detection.forcedDecision, redFlags)
    }
  }

  // Check for coach override
  if (input.coachOverride) {
    return createCoachOverrideModification(input, redFlags)
  }

  // Determine modification decision
  const decision = determineModification(
    input.readinessScore,
    input.workoutIntensity,
    input.methodology,
    redFlags
  )

  const readinessLevel = getReadinessLevel(input.readinessScore)

  // Apply modification rules
  const applied = applyModificationRules(decision, {
    intensity: input.workoutIntensity,
    durationMinutes: input.workoutDurationMinutes,
    distanceKm: input.workoutDistanceKm,
    zones: input.workoutZones,
  })

  // Generate rationale and recommendations
  const rationale = getModificationRationale(
    decision,
    input.readinessScore,
    readinessLevel,
    input.workoutIntensity,
    input.methodology,
    redFlags
  )

  const recommendations = getModificationRecommendations(
    decision,
    readinessLevel,
    redFlags
  )

  // Build factor explanations
  const factors: WorkoutModification['factors'] = {}
  if (input.readinessComponents) {
    if (input.readinessComponents.hrv) {
      factors.hrv = {
        status: `${input.readinessComponents.hrv.percentOfBaseline.toFixed(0)}% of baseline`,
        impact: input.readinessComponents.hrv.percentOfBaseline < 85 ? 'Negative' : 'Positive',
      }
    }
    if (input.readinessComponents.rhr) {
      factors.rhr = {
        status: `${input.readinessComponents.rhr.deviationBpm >= 0 ? '+' : ''}${input.readinessComponents.rhr.deviationBpm.toFixed(0)} bpm`,
        impact: Math.abs(input.readinessComponents.rhr.deviationBpm) > 5 ? 'Negative' : 'Neutral',
      }
    }
    if (input.readinessComponents.wellness) {
      factors.wellness = {
        status: `Fatigue: ${input.readinessComponents.wellness.fatigue}/10`,
        impact: input.readinessComponents.wellness.fatigue < 5 ? 'Negative' : 'Positive',
      }
    }
    if (input.readinessComponents.sleep) {
      factors.sleep = {
        status: `${input.readinessComponents.sleep.duration.toFixed(1)} hours`,
        impact: input.readinessComponents.sleep.duration < 6 ? 'Negative' : 'Positive',
      }
    }
  }

  // Build modification result
  const modification: WorkoutModification = {
    decision,
    readinessScore: input.readinessScore,
    readinessLevel,

    originalWorkout: {
      type: input.workoutType || 'Unknown',
      intensity: input.workoutIntensity,
      durationMinutes: input.workoutDurationMinutes,
      distanceKm: input.workoutDistanceKm,
      zones: input.workoutZones,
    },

    modifiedWorkout: decision !== 'PROCEED' ? {
      type: applied.newIntensity ? `${applied.newIntensity} workout` : 'Modified',
      intensity: applied.newIntensity || input.workoutIntensity,
      durationMinutes: applied.newDurationMinutes,
      distanceKm: applied.newDistanceKm,
      zones: applied.newZones,
      intensityReduction: applied.intensityReduction,
      volumeReduction: applied.volumeReduction,
    } : undefined,

    rationale,
    factors,
    redFlags,
    recommendations: [...applied.specificInstructions, ...recommendations],

    methodology: input.methodology,
    wasCoachOverridden: false,
    timestamp: new Date(),
  }

  return modification
}

/**
 * Create forced modification from red flags
 */
function createForcedModification(
  input: ModifyWorkoutInput,
  forcedDecision: ModificationDecision,
  redFlags: RedFlagType[]
): WorkoutModification {
  const readinessLevel = getReadinessLevel(input.readinessScore)

  const applied = applyModificationRules(forcedDecision, {
    intensity: input.workoutIntensity,
    durationMinutes: input.workoutDurationMinutes,
    distanceKm: input.workoutDistanceKm,
    zones: input.workoutZones,
  })

  const rationale = getModificationRationale(
    forcedDecision,
    input.readinessScore,
    readinessLevel,
    input.workoutIntensity,
    input.methodology,
    redFlags
  )

  const recommendations = getModificationRecommendations(
    forcedDecision,
    readinessLevel,
    redFlags
  )

  return {
    decision: forcedDecision,
    readinessScore: input.readinessScore,
    readinessLevel,

    originalWorkout: {
      type: input.workoutType || 'Unknown',
      intensity: input.workoutIntensity,
      durationMinutes: input.workoutDurationMinutes,
      distanceKm: input.workoutDistanceKm,
      zones: input.workoutZones,
    },

    modifiedWorkout: {
      type: 'Cancelled due to red flags',
      intensity: 'RECOVERY',
      intensityReduction: 100,
      volumeReduction: 100,
    },

    rationale,
    factors: {},
    redFlags,
    recommendations: [...applied.specificInstructions, ...recommendations],

    methodology: input.methodology,
    wasCoachOverridden: false,
    timestamp: new Date(),
  }
}

/**
 * Create coach override modification
 */
function createCoachOverrideModification(
  input: ModifyWorkoutInput,
  redFlags: RedFlagType[]
): WorkoutModification {
  if (!input.coachOverride) {
    throw new Error('Coach override data missing')
  }

  const readinessLevel = getReadinessLevel(input.readinessScore)

  const applied = applyModificationRules(input.coachOverride.decision, {
    intensity: input.workoutIntensity,
    durationMinutes: input.workoutDurationMinutes,
    distanceKm: input.workoutDistanceKm,
    zones: input.workoutZones,
  })

  return {
    decision: input.coachOverride.decision,
    readinessScore: input.readinessScore,
    readinessLevel,

    originalWorkout: {
      type: input.workoutType || 'Unknown',
      intensity: input.workoutIntensity,
      durationMinutes: input.workoutDurationMinutes,
      distanceKm: input.workoutDistanceKm,
      zones: input.workoutZones,
    },

    modifiedWorkout: input.coachOverride.decision !== 'PROCEED' ? {
      type: applied.newIntensity ? `${applied.newIntensity} workout` : 'Modified by coach',
      intensity: applied.newIntensity || input.workoutIntensity,
      durationMinutes: applied.newDurationMinutes,
      distanceKm: applied.newDistanceKm,
      zones: applied.newZones,
      intensityReduction: applied.intensityReduction,
      volumeReduction: applied.volumeReduction,
    } : undefined,

    rationale: `Coach override: ${input.coachOverride.rationale}`,
    factors: {},
    redFlags,
    recommendations: applied.specificInstructions,

    methodology: input.methodology,
    wasCoachOverridden: true,
    timestamp: new Date(),
  }
}

/**
 * Quick check: Should athlete train today?
 *
 * Simple yes/no based on readiness and red flags
 */
export function shouldTrainToday(
  readinessScore: number,
  redFlags?: RedFlagType[]
): {
  shouldTrain: boolean
  maxIntensity: WorkoutIntensity
  reason: string
} {
  // Check red flags first
  if (redFlags && redFlags.length > 0) {
    const canTrain = canTrainWithRedFlags(redFlags)
    if (!canTrain.canTrain) {
      return {
        shouldTrain: false,
        maxIntensity: 'RECOVERY',
        reason: canTrain.explanation,
      }
    }
  }

  const readinessLevel = getReadinessLevel(readinessScore)

  if (readinessLevel === 'VERY_POOR') {
    return {
      shouldTrain: false,
      maxIntensity: 'RECOVERY',
      reason: 'Very poor readiness - rest required',
    }
  }

  if (readinessLevel === 'POOR') {
    return {
      shouldTrain: true,
      maxIntensity: 'RECOVERY',
      reason: 'Poor readiness - recovery pace only',
    }
  }

  if (readinessLevel === 'FAIR') {
    return {
      shouldTrain: true,
      maxIntensity: 'EASY',
      reason: 'Fair readiness - easy training only',
    }
  }

  if (readinessLevel === 'MODERATE') {
    return {
      shouldTrain: true,
      maxIntensity: 'MODERATE',
      reason: 'Moderate readiness - avoid high intensity',
    }
  }

  if (readinessLevel === 'GOOD') {
    return {
      shouldTrain: true,
      maxIntensity: 'HARD',
      reason: 'Good readiness - quality training possible',
    }
  }

  return {
    shouldTrain: true,
    maxIntensity: 'VERY_HARD',
    reason: 'Excellent readiness - full training load',
  }
}

/**
 * Batch modify multiple workouts (for weekly planning)
 */
export function modifyWeek(
  workouts: ModifyWorkoutInput[]
): WorkoutModification[] {
  return workouts.map(workout => modifyWorkout(workout))
}
