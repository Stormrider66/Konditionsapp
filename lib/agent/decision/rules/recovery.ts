/**
 * Recovery Rules - Proactive recovery interventions
 *
 * These rules suggest recovery actions based on fatigue and readiness.
 */

import type { PerceptionSnapshot, ProposedAction, ActionPriority } from '../../types'
import { SAFETY_BOUNDS } from '../../guardrails/safety-bounds'

/**
 * Check if recovery interventions are needed
 */
export function checkRecoveryRules(
  perception: PerceptionSnapshot
): ProposedAction[] {
  const actions: ProposedAction[] = []

  // Rule 1: Low readiness suggests reduced intensity
  if (perception.readiness.readinessScore !== null) {
    if (perception.readiness.readinessScore < 40) {
      actions.push({
        actionType: 'WORKOUT_INTENSITY_REDUCTION',
        actionData: {
          type: 'INTENSITY_REDUCTION' as const,
          originalIntensity: 'PLANNED',
          newIntensity: 'EASY',
          reductionPercent: 30,
        },
        reasoning: `Readiness score is low (${perception.readiness.readinessScore}/100). Reducing workout intensity by 30% to allow for better recovery. High-intensity training with low readiness increases injury risk and reduces training benefit.`,
        confidence: 'HIGH',
        confidenceScore: 0.85,
        priority: 'NORMAL' as ActionPriority,
        targetDate: new Date(),
      })
    } else if (perception.readiness.readinessScore < 60) {
      actions.push({
        actionType: 'WORKOUT_INTENSITY_REDUCTION',
        actionData: {
          type: 'INTENSITY_REDUCTION' as const,
          originalIntensity: 'PLANNED',
          newIntensity: 'MODERATE',
          reductionPercent: 15,
        },
        reasoning: `Readiness score is below optimal (${perception.readiness.readinessScore}/100). Suggesting a 15% intensity reduction to balance training stimulus with recovery capacity.`,
        confidence: 'MEDIUM',
        confidenceScore: 0.7,
        priority: 'NORMAL' as ActionPriority,
        targetDate: new Date(),
      })
    }
  }

  // Rule 2: High fatigue suggests recovery activity
  if (perception.readiness.fatigueScore !== null && perception.readiness.fatigueScore > 70) {
    actions.push({
      actionType: 'RECOVERY_ACTIVITY_SUGGESTION',
      actionData: {
        type: 'RECOVERY_ACTIVITY' as const,
        activityType: 'ACTIVE_RECOVERY',
        duration: 30,
        instructions: 'Light walking, gentle stretching, or foam rolling. Keep heart rate below zone 2. Focus on blood flow and mobility.',
      },
      reasoning: `High fatigue level (${perception.readiness.fatigueScore}/100) detected. Suggesting active recovery to promote blood flow and reduce muscle soreness without adding training stress.`,
      confidence: 'HIGH',
      confidenceScore: 0.8,
      priority: 'NORMAL' as ActionPriority,
      targetDate: new Date(),
    })
  }

  // Rule 3: Poor sleep quality suggests modified training
  if (perception.readiness.sleepScore !== null && perception.readiness.sleepScore < 50) {
    // Only suggest modification if we haven't already suggested intensity reduction
    if (!actions.some((a) => a.actionType === 'WORKOUT_INTENSITY_REDUCTION')) {
      actions.push({
        actionType: 'WORKOUT_DURATION_REDUCTION',
        actionData: {
          type: 'DURATION_REDUCTION' as const,
          originalDuration: 60, // Placeholder, will be replaced with actual
          newDuration: 45,
          reductionPercent: 25,
        },
        reasoning: `Sleep quality was poor (${perception.readiness.sleepScore}/100). Reducing workout duration by 25% to prevent excessive fatigue accumulation. Quality sleep is essential for adaptation.`,
        confidence: 'MEDIUM',
        confidenceScore: 0.72,
        priority: 'NORMAL' as ActionPriority,
        targetDate: new Date(),
      })
    }
  }

  // Rule 4: High stress suggests lighter training
  if (perception.readiness.stressScore !== null && perception.readiness.stressScore > 70) {
    actions.push({
      actionType: 'WORKOUT_SUBSTITUTION',
      actionData: {
        type: 'SUBSTITUTION' as const,
        originalWorkoutType: 'HIGH_INTENSITY',
        newWorkoutType: 'LOW_INTENSITY',
        reason: 'High stress levels warrant a shift to less demanding training',
      },
      reasoning: `Stress level is elevated (${perception.readiness.stressScore}/100). High stress increases cortisol and impairs recovery. Suggesting a shift to lower-intensity training to avoid compounding stress.`,
      confidence: 'MEDIUM',
      confidenceScore: 0.68,
      priority: 'NORMAL' as ActionPriority,
      targetDate: new Date(),
    })
  }

  // Rule 5: ACWR in danger zone but not critical
  if (
    perception.trainingLoad.acwr >= SAFETY_BOUNDS.ACWR_DANGER_THRESHOLD &&
    perception.trainingLoad.acwr < SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD
  ) {
    actions.push({
      actionType: 'REST_DAY_INJECTION',
      actionData: {
        type: 'REST_DAY' as const,
        targetDate: getNextRestDayDate(),
        reason: `ACWR is ${perception.trainingLoad.acwr.toFixed(2)} (DANGER zone). Adding a rest day to reduce injury risk.`,
      },
      reasoning: `ACWR has reached ${perception.trainingLoad.acwr.toFixed(2)}, which is in the DANGER zone (${SAFETY_BOUNDS.ACWR_DANGER_THRESHOLD}-${SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD}). Recommending an additional rest day within the next 2-3 days to bring workload ratio back to safe levels.`,
      confidence: 'HIGH',
      confidenceScore: 0.88,
      priority: 'HIGH' as ActionPriority,
      targetDate: getNextRestDayDate(),
    })
  }

  // Rule 6: Pattern-based recovery
  if (perception.patterns.severity === 'HIGH' || perception.patterns.severity === 'CRITICAL') {
    const overtrainingPattern = perception.patterns.patterns.find(
      (p) => p.type === 'OVERTRAINING'
    )
    if (overtrainingPattern) {
      actions.push({
        actionType: 'PROGRAM_ADJUSTMENT',
        actionData: {
          type: 'ESCALATION' as const,
          escalateTo: 'COACH',
          reason: 'Overtraining pattern detected - program review recommended',
          urgency: 'HIGH' as const,
        },
        reasoning: `Overtraining pattern detected with ${perception.patterns.severity} severity. Key indicators: ${overtrainingPattern.description}. Recommend reviewing the training program and potentially incorporating a deload week.`,
        confidence: 'HIGH',
        confidenceScore: 0.82,
        priority: 'HIGH' as ActionPriority,
      })
    }
  }

  return actions
}

/**
 * Suggest recovery activities based on current state
 */
export function suggestRecoveryActivities(
  perception: PerceptionSnapshot
): Array<{
  activity: string
  duration: number
  reason: string
  priority: number
}> {
  const suggestions: Array<{
    activity: string
    duration: number
    reason: string
    priority: number
  }> = []

  // High fatigue -> active recovery
  if (perception.readiness.fatigueScore !== null && perception.readiness.fatigueScore > 60) {
    suggestions.push({
      activity: 'Light walk or easy cycling',
      duration: 20,
      reason: 'Promotes blood flow for recovery',
      priority: 1,
    })
    suggestions.push({
      activity: 'Foam rolling',
      duration: 15,
      reason: 'Reduces muscle tension and soreness',
      priority: 2,
    })
  }

  // Poor sleep -> relaxation
  if (perception.readiness.sleepScore !== null && perception.readiness.sleepScore < 60) {
    suggestions.push({
      activity: 'Gentle yoga or stretching',
      duration: 20,
      reason: 'Promotes relaxation and may improve sleep',
      priority: 1,
    })
  }

  // High stress -> stress relief
  if (perception.readiness.stressScore !== null && perception.readiness.stressScore > 60) {
    suggestions.push({
      activity: 'Meditation or breathing exercises',
      duration: 10,
      reason: 'Helps reduce stress and cortisol levels',
      priority: 1,
    })
    suggestions.push({
      activity: 'Nature walk',
      duration: 30,
      reason: 'Combines light movement with stress relief',
      priority: 2,
    })
  }

  // Sort by priority
  return suggestions.sort((a, b) => a.priority - b.priority)
}

/**
 * Get the next suitable date for a rest day
 */
function getNextRestDayDate(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow
}
