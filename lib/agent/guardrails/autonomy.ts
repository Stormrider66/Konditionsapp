/**
 * Autonomy Guardrail - Controls what actions can be taken at each autonomy level
 */

import type { AgentAutonomyLevel, AgentActionType } from '@prisma/client'
import type { ProposedAction, AgentPreferencesData } from '../types'
import {
  SAFETY_BOUNDS,
  COACH_APPROVAL_REQUIRED_ACTIONS,
  AUTO_APPLICABLE_ACTIONS_SUPERVISED,
  AUTO_APPLICABLE_ACTIONS_AUTONOMOUS,
} from './safety-bounds'

/**
 * Determines if an action can be auto-applied given preferences
 */
export function canAutoApply(
  action: ProposedAction,
  preferences: AgentPreferencesData
): boolean {
  const { autonomyLevel, confidenceScore } = { ...action, ...preferences }

  // ADVISORY level: Never auto-apply
  if (preferences.autonomyLevel === 'ADVISORY') {
    return false
  }

  // Actions that always require coach approval
  if (
    COACH_APPROVAL_REQUIRED_ACTIONS.includes(
      action.actionType as (typeof COACH_APPROVAL_REQUIRED_ACTIONS)[number]
    )
  ) {
    return false
  }

  // Check confidence threshold
  if (action.confidenceScore < SAFETY_BOUNDS.MIN_CONFIDENCE_FOR_AUTO_ACTION) {
    return false
  }

  // LIMITED level: Very restricted auto-apply
  if (preferences.autonomyLevel === 'LIMITED') {
    // Only allow intensity reduction up to preference limit
    if (action.actionType === 'WORKOUT_INTENSITY_REDUCTION') {
      if (!preferences.allowWorkoutModification) return false
      const data = action.actionData as { reductionPercent?: number }
      if ((data.reductionPercent || 0) > preferences.maxIntensityReduction) {
        return false
      }
      return true
    }
    return false
  }

  // SUPERVISED level: Moderate auto-apply with notification
  if (preferences.autonomyLevel === 'SUPERVISED') {
    const canAutoApplySupervisedAction = AUTO_APPLICABLE_ACTIONS_SUPERVISED.includes(
      action.actionType as (typeof AUTO_APPLICABLE_ACTIONS_SUPERVISED)[number]
    )

    if (!canAutoApplySupervisedAction) return false

    // Check specific permissions
    if (action.actionType === 'WORKOUT_INTENSITY_REDUCTION') {
      if (!preferences.allowWorkoutModification) return false
      const data = action.actionData as { reductionPercent?: number }
      if ((data.reductionPercent || 0) > preferences.maxIntensityReduction) {
        return false
      }
    }

    return true
  }

  // AUTONOMOUS level: Full auto-apply (within safety bounds)
  if (preferences.autonomyLevel === 'AUTONOMOUS') {
    const canAutoApplyAutonomousAction = AUTO_APPLICABLE_ACTIONS_AUTONOMOUS.includes(
      action.actionType as (typeof AUTO_APPLICABLE_ACTIONS_AUTONOMOUS)[number]
    )

    if (!canAutoApplyAutonomousAction) return false

    // Still check specific permissions
    if (action.actionType === 'REST_DAY_INJECTION') {
      if (!preferences.allowRestDayInjection) return false
    }

    if (action.actionType === 'WORKOUT_INTENSITY_REDUCTION') {
      if (!preferences.allowWorkoutModification) return false
      const data = action.actionData as { reductionPercent?: number }
      if ((data.reductionPercent || 0) > preferences.maxIntensityReduction) {
        return false
      }
    }

    return true
  }

  return false
}

/**
 * Determines if an action requires coach oversight
 */
export function requiresCoachOversight(
  action: ProposedAction,
  preferences: AgentPreferencesData,
  isAICoached: boolean
): boolean {
  // AI-coached athletes don't have coach oversight (escalate to support instead)
  if (isAICoached) {
    return false
  }

  // Actions that always require coach oversight
  if (
    COACH_APPROVAL_REQUIRED_ACTIONS.includes(
      action.actionType as (typeof COACH_APPROVAL_REQUIRED_ACTIONS)[number]
    )
  ) {
    return true
  }

  // ADVISORY and LIMITED: All significant actions need oversight
  if (
    preferences.autonomyLevel === 'ADVISORY' ||
    preferences.autonomyLevel === 'LIMITED'
  ) {
    // Exclude simple nudges from oversight
    if (
      action.actionType === 'MOTIVATIONAL_NUDGE' ||
      action.actionType === 'CHECK_IN_REQUEST'
    ) {
      return false
    }
    return true
  }

  // SUPERVISED: Actions get logged for coach review
  if (preferences.autonomyLevel === 'SUPERVISED') {
    // High-impact actions still need oversight
    if (
      action.actionType === 'WORKOUT_SKIP_RECOMMENDATION' ||
      action.actionType === 'REST_DAY_INJECTION' ||
      action.actionType === 'PROGRAM_ADJUSTMENT'
    ) {
      return true
    }
    return false
  }

  // AUTONOMOUS: Only critical escalations
  return action.priority === 'URGENT'
}

/**
 * Gets the recommended action status based on autonomy
 */
export function getRecommendedActionStatus(
  action: ProposedAction,
  preferences: AgentPreferencesData
): 'PROPOSED' | 'AUTO_APPLIED' {
  if (canAutoApply(action, preferences)) {
    return 'AUTO_APPLIED'
  }
  return 'PROPOSED'
}

/**
 * Validates that an action respects preference bounds
 */
export function validateActionBounds(
  action: ProposedAction,
  preferences: AgentPreferencesData
): { valid: boolean; reason?: string } {
  // Check intensity reduction bounds
  if (action.actionType === 'WORKOUT_INTENSITY_REDUCTION') {
    const data = action.actionData as { reductionPercent?: number }
    const reduction = data.reductionPercent || 0

    if (reduction > SAFETY_BOUNDS.MAX_INTENSITY_REDUCTION_PERCENT) {
      return {
        valid: false,
        reason: `Intensity reduction ${reduction}% exceeds safety maximum of ${SAFETY_BOUNDS.MAX_INTENSITY_REDUCTION_PERCENT}%`,
      }
    }
  }

  // Check rest day injection permission
  if (action.actionType === 'REST_DAY_INJECTION') {
    if (!preferences.allowRestDayInjection) {
      return {
        valid: false,
        reason: 'Rest day injection not allowed by preferences',
      }
    }
  }

  // Check workout modification permission
  if (
    action.actionType === 'WORKOUT_INTENSITY_REDUCTION' ||
    action.actionType === 'WORKOUT_DURATION_REDUCTION' ||
    action.actionType === 'WORKOUT_SUBSTITUTION'
  ) {
    if (!preferences.allowWorkoutModification) {
      return {
        valid: false,
        reason: 'Workout modification not allowed by preferences',
      }
    }
  }

  return { valid: true }
}

/**
 * Gets human-readable description of autonomy level
 */
export function getAutonomyDescription(level: AgentAutonomyLevel): string {
  switch (level) {
    case 'ADVISORY':
      return 'The AI provides recommendations, but you decide on all changes.'
    case 'LIMITED':
      return 'The AI can make minor intensity adjustments within your limits.'
    case 'SUPERVISED':
      return 'The AI can adjust workouts with coach oversight. High-impact changes need approval.'
    case 'AUTONOMOUS':
      return 'The AI manages your training with full autonomy. Only critical issues are escalated.'
    default:
      return 'Unknown autonomy level'
  }
}
