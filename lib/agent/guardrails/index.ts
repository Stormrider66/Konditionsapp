/**
 * Agent Guardrails - Safety, Consent, and Autonomy controls
 *
 * This module provides the safety layer for the autonomous agent.
 * All agent operations must pass through these guardrails.
 */

export * from './safety-bounds'
export * from './consent'
export * from './autonomy'

import type { AgentConsent, AgentPreferences } from '@prisma/client'
import type {
  ProposedAction,
  SafetyCheckResult,
  SafetyViolation,
  SafetyWarning,
  PerceptionSnapshot,
  AgentPreferencesData,
} from '../types'
import { SAFETY_BOUNDS, getACWRZone, isPainCritical } from './safety-bounds'
import { checkConsent, canMakeAutomatedDecisions } from './consent'
import { canAutoApply, validateActionBounds } from './autonomy'

/**
 * Complete guardrail check for an agent operation
 */
export interface GuardrailCheckResult {
  canProceed: boolean
  consentValid: boolean
  safetyPassed: boolean
  canAutoApply: boolean
  violations: SafetyViolation[]
  warnings: SafetyWarning[]
  requiresCoachOversight: boolean
}

/**
 * Performs complete guardrail check for a proposed action
 */
export function checkGuardrails(
  action: ProposedAction,
  perception: PerceptionSnapshot,
  consent: AgentConsent | null,
  preferences: AgentPreferences | null,
  isAICoached: boolean
): GuardrailCheckResult {
  const violations: SafetyViolation[] = []
  const warnings: SafetyWarning[] = []

  // 1. Check consent
  const consentStatus = checkConsent(consent)
  if (!consentStatus.hasRequiredConsent) {
    violations.push({
      rule: 'CONSENT_REQUIRED',
      description: 'Required consents not granted',
      severity: 'BLOCKING',
      data: { consentStatus },
    })
  }

  // 2. Check automated decision consent if auto-apply is possible
  const autoDecisionAllowed = canMakeAutomatedDecisions(consent)

  // 3. Check safety bounds
  const safetyResult = checkSafety(action, perception)
  violations.push(...safetyResult.violations)
  warnings.push(...safetyResult.warnings)

  // 4. Check action bounds against preferences
  const prefData = preferencesToData(preferences, isAICoached)
  const boundsResult = validateActionBounds(action, prefData)
  if (!boundsResult.valid) {
    violations.push({
      rule: 'BOUNDS_EXCEEDED',
      description: boundsResult.reason || 'Action exceeds allowed bounds',
      severity: 'BLOCKING',
      data: {},
    })
  }

  // 5. Determine if action can be auto-applied
  const autoApplyAllowed =
    autoDecisionAllowed && canAutoApply(action, prefData)

  // 6. Determine if coach oversight is needed
  const requiresCoachOversight =
    !isAICoached &&
    !autoApplyAllowed &&
    action.priority !== 'LOW' &&
    action.actionType !== 'MOTIVATIONAL_NUDGE' &&
    action.actionType !== 'CHECK_IN_REQUEST'

  return {
    canProceed: violations.length === 0,
    consentValid: consentStatus.hasRequiredConsent,
    safetyPassed: safetyResult.passed,
    canAutoApply: autoApplyAllowed && violations.length === 0,
    violations,
    warnings,
    requiresCoachOversight,
  }
}

/**
 * Performs safety checks on the current perception state
 */
export function checkSafety(
  action: ProposedAction,
  perception: PerceptionSnapshot
): SafetyCheckResult {
  const violations: SafetyViolation[] = []
  const warnings: SafetyWarning[] = []

  // Check ACWR critical zone
  if (perception.trainingLoad.acwr >= SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD) {
    violations.push({
      rule: 'ACWR_CRITICAL',
      description: `ACWR is ${perception.trainingLoad.acwr.toFixed(2)}, which is in the CRITICAL zone`,
      severity: 'CRITICAL',
      data: { acwr: perception.trainingLoad.acwr },
    })
  } else if (perception.trainingLoad.acwr >= SAFETY_BOUNDS.ACWR_DANGER_THRESHOLD) {
    warnings.push({
      rule: 'ACWR_DANGER',
      description: `ACWR is ${perception.trainingLoad.acwr.toFixed(2)}, which is in the DANGER zone`,
      recommendation: 'Consider reducing training load',
    })
  }

  // Check for active injuries with high pain
  for (const injury of perception.injury.activeInjuries) {
    if (isPainCritical(injury.painLevel)) {
      violations.push({
        rule: 'PAIN_CRITICAL',
        description: `Pain level ${injury.painLevel}/10 for ${injury.bodyPart} exceeds threshold`,
        severity: 'CRITICAL',
        data: { injury },
      })
    }
  }

  // Check consecutive low readiness
  if (perception.readiness.readinessScore !== null) {
    if (perception.readiness.readinessScore < 40) {
      warnings.push({
        rule: 'LOW_READINESS',
        description: `Readiness score is ${perception.readiness.readinessScore}/100`,
        recommendation: 'Consider reducing workout intensity or taking rest',
      })
    }
  }

  // Check missed workouts pattern
  if (perception.behavior.missedWorkouts7d >= SAFETY_BOUNDS.MISSED_WORKOUTS_CONCERN) {
    warnings.push({
      rule: 'MISSED_WORKOUTS',
      description: `${perception.behavior.missedWorkouts7d} missed workouts in the last 7 days`,
      recommendation: 'Check in with athlete about barriers to training',
    })
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  }
}

/**
 * Converts preferences model to data interface with defaults
 */
function preferencesToData(
  preferences: AgentPreferences | null,
  isAICoached: boolean
): AgentPreferencesData {
  if (preferences) {
    return {
      autonomyLevel: preferences.autonomyLevel,
      allowWorkoutModification: preferences.allowWorkoutModification,
      allowRestDayInjection: preferences.allowRestDayInjection,
      maxIntensityReduction: preferences.maxIntensityReduction,
      minRestDaysPerWeek: preferences.minRestDaysPerWeek,
      maxConsecutiveHardDays: preferences.maxConsecutiveHardDays,
      dailyBriefingEnabled: preferences.dailyBriefingEnabled,
      proactiveNudgesEnabled: preferences.proactiveNudgesEnabled,
    }
  }

  // Return defaults based on athlete type
  if (isAICoached) {
    return {
      autonomyLevel: 'SUPERVISED',
      allowWorkoutModification: true,
      allowRestDayInjection: true,
      maxIntensityReduction: 30,
      minRestDaysPerWeek: 1,
      maxConsecutiveHardDays: 3,
      dailyBriefingEnabled: true,
      proactiveNudgesEnabled: true,
    }
  }

  return {
    autonomyLevel: 'ADVISORY',
    allowWorkoutModification: false,
    allowRestDayInjection: false,
    maxIntensityReduction: 20,
    minRestDaysPerWeek: 1,
    maxConsecutiveHardDays: 3,
    dailyBriefingEnabled: true,
    proactiveNudgesEnabled: true,
  }
}
