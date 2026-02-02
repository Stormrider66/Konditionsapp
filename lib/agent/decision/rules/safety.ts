/**
 * Safety Rules - Non-negotiable safety-first decisions
 *
 * These rules take precedence over all other decision logic.
 */

import type { PerceptionSnapshot, ProposedAction, ActionPriority } from '../../types'
import { SAFETY_BOUNDS } from '../../guardrails/safety-bounds'

/**
 * Check if safety rules require intervention
 */
export function checkSafetyRules(
  perception: PerceptionSnapshot,
  isAICoached: boolean
): ProposedAction[] {
  const actions: ProposedAction[] = []

  // Rule 1: Critical ACWR requires immediate intervention
  if (perception.trainingLoad.acwr >= SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD) {
    actions.push({
      actionType: 'WORKOUT_INTENSITY_REDUCTION',
      actionData: {
        type: 'INTENSITY_REDUCTION' as const,
        originalIntensity: 'PLANNED',
        newIntensity: 'RECOVERY',
        reductionPercent: 50,
      },
      reasoning: `ACWR is ${perception.trainingLoad.acwr.toFixed(2)}, which is in the CRITICAL zone (≥${SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD}). Training load must be immediately reduced to prevent injury. Reducing intensity by 50% until ACWR returns to safe levels.`,
      confidence: 'VERY_HIGH',
      confidenceScore: 0.98,
      priority: 'URGENT' as ActionPriority,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })
  }

  // Rule 2: Critical pain requires escalation
  for (const injury of perception.injury.activeInjuries) {
    if (injury.painLevel >= SAFETY_BOUNDS.PAIN_STOP_THRESHOLD) {
      actions.push({
        actionType: isAICoached ? 'ESCALATE_TO_SUPPORT' : 'ESCALATE_TO_COACH',
        actionData: {
          type: 'ESCALATION' as const,
          escalateTo: isAICoached ? 'SUPPORT' : 'COACH',
          reason: `Severe pain reported: ${injury.painLevel}/10 for ${injury.bodyPart}. This requires medical attention.`,
          urgency: 'URGENT' as const,
        },
        reasoning: `Pain level of ${injury.painLevel}/10 for ${injury.bodyPart} exceeds the critical threshold of ${SAFETY_BOUNDS.PAIN_STOP_THRESHOLD}. This requires immediate attention from a healthcare professional. Training should be paused until cleared.`,
        confidence: 'VERY_HIGH',
        confidenceScore: 0.99,
        priority: 'URGENT' as ActionPriority,
      })

      // Also add workout skip recommendation
      actions.push({
        actionType: 'WORKOUT_SKIP_RECOMMENDATION',
        actionData: {
          type: 'SKIP' as const,
          reason: `Severe pain in ${injury.bodyPart}. Training should be avoided until pain subsides and medical clearance is obtained.`,
        },
        reasoning: `Due to severe pain (${injury.painLevel}/10) in ${injury.bodyPart}, all training should be skipped today to prevent injury aggravation.`,
        confidence: 'VERY_HIGH',
        confidenceScore: 0.98,
        priority: 'URGENT' as ActionPriority,
        targetDate: new Date(),
      })
    } else if (injury.painLevel >= SAFETY_BOUNDS.PAIN_ESCALATION_THRESHOLD) {
      // High pain (7-8) requires attention but not emergency
      actions.push({
        actionType: isAICoached ? 'ESCALATE_TO_SUPPORT' : 'ESCALATE_TO_COACH',
        actionData: {
          type: 'ESCALATION' as const,
          escalateTo: isAICoached ? 'SUPPORT' : 'COACH',
          reason: `High pain reported: ${injury.painLevel}/10 for ${injury.bodyPart}. Should be evaluated.`,
          urgency: 'HIGH' as const,
        },
        reasoning: `Pain level of ${injury.painLevel}/10 for ${injury.bodyPart} is concerning and should be evaluated. Consider modifying training to avoid aggravating the injury.`,
        confidence: 'HIGH',
        confidenceScore: 0.9,
        priority: 'HIGH' as ActionPriority,
      })
    }
  }

  // Rule 3: Active restrictions require workout modification
  if (perception.injury.hasRestrictions) {
    for (const restriction of perception.injury.restrictions) {
      if (restriction.type === 'INTENSITY') {
        actions.push({
          actionType: 'WORKOUT_INTENSITY_REDUCTION',
          actionData: {
            type: 'INTENSITY_REDUCTION' as const,
            originalIntensity: 'PLANNED',
            newIntensity: 'REDUCED',
            reductionPercent: 30,
          },
          reasoning: `Active intensity restriction: ${restriction.description}. Reducing planned intensity by 30% to comply with restriction.`,
          confidence: 'HIGH',
          confidenceScore: 0.92,
          priority: 'HIGH' as ActionPriority,
          expiresAt: restriction.expiresAt ?? undefined,
        })
      }
    }
  }

  // Rule 4: Consecutive missed check-ins requires outreach
  if (perception.behavior.checkInStreak === 0) {
    // Check how many days since last check-in by looking at daysSinceLastLog
    if (perception.behavior.daysSinceLastLog >= SAFETY_BOUNDS.MISSED_CHECKINS_ESCALATION) {
      actions.push({
        actionType: isAICoached ? 'ESCALATE_TO_SUPPORT' : 'ESCALATE_TO_COACH',
        actionData: {
          type: 'ESCALATION' as const,
          escalateTo: isAICoached ? 'SUPPORT' : 'COACH',
          reason: `No activity for ${perception.behavior.daysSinceLastLog} days. Wellness check recommended.`,
          urgency: 'MEDIUM' as const,
        },
        reasoning: `Athlete has not logged any activity for ${perception.behavior.daysSinceLastLog} days. This exceeds the ${SAFETY_BOUNDS.MISSED_CHECKINS_ESCALATION}-day threshold and warrants a wellness check.`,
        confidence: 'MEDIUM',
        confidenceScore: 0.75,
        priority: 'NORMAL' as ActionPriority,
      })
    } else if (perception.behavior.daysSinceLastLog >= SAFETY_BOUNDS.MISSED_CHECKINS_WARNING) {
      actions.push({
        actionType: 'CHECK_IN_REQUEST',
        actionData: {
          type: 'NUDGE' as const,
          nudgeType: 'CHECK_IN' as const,
          message: "We haven't heard from you in a few days. How are you feeling?",
        },
        reasoning: `No check-in for ${perception.behavior.daysSinceLastLog} days. Sending a friendly check-in request.`,
        confidence: 'HIGH',
        confidenceScore: 0.85,
        priority: 'NORMAL' as ActionPriority,
      })
    }
  }

  return actions
}

/**
 * Check if any safety rules block a workout
 */
export function isWorkoutBlocked(perception: PerceptionSnapshot): {
  blocked: boolean
  reason: string | null
} {
  // Critical ACWR blocks high-intensity workouts
  if (perception.trainingLoad.acwr >= SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD) {
    return {
      blocked: true,
      reason: `ACWR is critically high (${perception.trainingLoad.acwr.toFixed(2)}). Only recovery activities allowed.`,
    }
  }

  // Severe pain blocks all workouts
  for (const injury of perception.injury.activeInjuries) {
    if (injury.painLevel >= SAFETY_BOUNDS.PAIN_STOP_THRESHOLD) {
      return {
        blocked: true,
        reason: `Severe pain (${injury.painLevel}/10) in ${injury.bodyPart}. Training blocked until cleared.`,
      }
    }
  }

  return { blocked: false, reason: null }
}
