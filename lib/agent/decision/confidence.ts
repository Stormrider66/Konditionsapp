/**
 * Confidence Scoring Module
 *
 * Calculates confidence scores for agent decisions based on data quality and certainty.
 */

import type { PerceptionSnapshot, ProposedAction, AgentConfidence } from '../types'

/**
 * Factors that affect confidence
 */
interface ConfidenceFactors {
  /** Data freshness (0-1, 1 = very fresh) */
  dataFreshness: number
  /** Data completeness (0-1, 1 = all data available) */
  dataCompleteness: number
  /** Pattern strength (0-1, 1 = very clear pattern) */
  patternStrength: number
  /** Historical accuracy for this action type (0-1) */
  historicalAccuracy: number
  /** Alignment with safety rules (0-1, 1 = clearly aligned) */
  safetyAlignment: number
}

/**
 * Calculate confidence score for an action
 */
export function calculateConfidence(
  action: ProposedAction,
  perception: PerceptionSnapshot,
  additionalFactors?: Partial<ConfidenceFactors>
): { score: number; level: AgentConfidence } {
  const factors = calculateConfidenceFactors(perception, action, additionalFactors)

  // Weight the factors (safety alignment is most important)
  const weightedScore =
    factors.safetyAlignment * 0.35 +
    factors.dataCompleteness * 0.25 +
    factors.dataFreshness * 0.15 +
    factors.patternStrength * 0.15 +
    factors.historicalAccuracy * 0.1

  return {
    score: Math.round(weightedScore * 100) / 100,
    level: scoreToLevel(weightedScore),
  }
}

/**
 * Calculate individual confidence factors
 */
function calculateConfidenceFactors(
  perception: PerceptionSnapshot,
  action: ProposedAction,
  additional?: Partial<ConfidenceFactors>
): ConfidenceFactors {
  return {
    dataFreshness: calculateDataFreshness(perception),
    dataCompleteness: calculateDataCompleteness(perception),
    patternStrength: calculatePatternStrength(perception),
    historicalAccuracy: additional?.historicalAccuracy ?? 0.7, // Default to 70% if unknown
    safetyAlignment: calculateSafetyAlignment(action, perception),
  }
}

/**
 * Calculate data freshness score
 */
function calculateDataFreshness(perception: PerceptionSnapshot): number {
  const now = Date.now()
  const perceivedAt = perception.perceivedAt.getTime()
  const ageHours = (now - perceivedAt) / (1000 * 60 * 60)

  // Fresh data (< 1 hour) = 1.0
  // 6 hours old = 0.5
  // 24 hours old = 0.1
  if (ageHours < 1) return 1.0
  if (ageHours < 6) return 1.0 - (ageHours / 6) * 0.5
  if (ageHours < 24) return 0.5 - ((ageHours - 6) / 18) * 0.4
  return 0.1
}

/**
 * Calculate data completeness score
 */
function calculateDataCompleteness(perception: PerceptionSnapshot): number {
  let score = 0
  let total = 0

  // Readiness data
  total += 4
  if (perception.readiness.readinessScore !== null) score += 1
  if (perception.readiness.fatigueScore !== null) score += 1
  if (perception.readiness.sleepScore !== null) score += 1
  if (perception.readiness.stressScore !== null) score += 1

  // Training load data
  total += 3
  if (perception.trainingLoad.acuteLoad > 0) score += 1
  if (perception.trainingLoad.chronicLoad > 0) score += 1
  if (perception.trainingLoad.acwr > 0) score += 1

  // Behavior data
  total += 2
  if (perception.behavior.checkInStreak >= 0) score += 1
  if (perception.behavior.completionRate30d >= 0) score += 1

  return score / total
}

/**
 * Calculate pattern strength score
 */
function calculatePatternStrength(perception: PerceptionSnapshot): number {
  if (perception.patterns.patterns.length === 0) {
    return 0.5 // No patterns = neutral confidence
  }

  // Average confidence of detected patterns
  const avgPatternConfidence =
    perception.patterns.patterns.reduce((sum, p) => sum + p.confidence, 0) /
    perception.patterns.patterns.length

  // Higher severity patterns = higher confidence in action
  const severityMultiplier =
    perception.patterns.severity === 'CRITICAL'
      ? 1.0
      : perception.patterns.severity === 'HIGH'
        ? 0.9
        : perception.patterns.severity === 'MEDIUM'
          ? 0.7
          : perception.patterns.severity === 'LOW'
            ? 0.5
            : 0.3

  return avgPatternConfidence * severityMultiplier
}

/**
 * Calculate safety alignment score
 */
function calculateSafetyAlignment(
  action: ProposedAction,
  perception: PerceptionSnapshot
): number {
  // Safety-related actions get high alignment scores
  if (action.priority === 'URGENT') {
    return 1.0 // Urgent actions are clearly safety-aligned
  }

  // Actions that reduce load when ACWR is high
  if (
    action.actionType === 'WORKOUT_INTENSITY_REDUCTION' ||
    action.actionType === 'REST_DAY_INJECTION'
  ) {
    if (perception.trainingLoad.acwrZone === 'CRITICAL') return 1.0
    if (perception.trainingLoad.acwrZone === 'DANGER') return 0.95
    if (perception.trainingLoad.acwrZone === 'CAUTION') return 0.85
    return 0.7
  }

  // Escalation actions when there's injury
  if (
    action.actionType === 'ESCALATE_TO_COACH' ||
    action.actionType === 'ESCALATE_TO_SUPPORT'
  ) {
    if (perception.injury.hasActiveInjury) return 0.95
    return 0.7
  }

  // Default for other actions
  return 0.6
}

/**
 * Convert numeric score to confidence level
 */
function scoreToLevel(score: number): AgentConfidence {
  if (score >= 0.95) return 'VERY_HIGH'
  if (score >= 0.8) return 'HIGH'
  if (score >= 0.6) return 'MEDIUM'
  return 'LOW'
}

/**
 * Check if confidence meets threshold for auto-apply
 */
export function meetsAutoApplyThreshold(score: number): boolean {
  return score >= 0.8
}

/**
 * Check if confidence meets threshold for supervised action
 */
export function meetsSupervisedThreshold(score: number): boolean {
  return score >= 0.6
}

/**
 * Get explanation for confidence level
 */
export function explainConfidence(
  factors: ConfidenceFactors
): string[] {
  const explanations: string[] = []

  if (factors.dataFreshness < 0.5) {
    explanations.push('Data may be stale (older than 6 hours)')
  }

  if (factors.dataCompleteness < 0.5) {
    explanations.push('Some readiness or training data is missing')
  }

  if (factors.patternStrength > 0.8) {
    explanations.push('Clear patterns detected in recent data')
  }

  if (factors.safetyAlignment > 0.9) {
    explanations.push('Action strongly aligned with safety protocols')
  }

  return explanations
}
