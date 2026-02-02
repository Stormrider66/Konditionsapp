/**
 * Safety Bounds - Non-negotiable safety rules for the AI agent
 *
 * These bounds are ABSOLUTE limits that the agent cannot exceed,
 * regardless of autonomy level or preferences.
 */

/**
 * Absolute safety bounds for the agent
 */
export const SAFETY_BOUNDS = {
  // Intensity modification limits
  MAX_INTENSITY_REDUCTION_PERCENT: 50, // Never reduce more than 50%
  MIN_INTENSITY_FLOOR_PERCENT: 30, // Never go below 30% of planned

  // Rest day constraints
  MIN_REST_DAYS_PER_WEEK: 1, // At least 1 rest day per week
  MAX_CONSECUTIVE_HARD_DAYS: 4, // Max 4 hard days in a row

  // ACWR thresholds
  ACWR_CRITICAL_THRESHOLD: 2.0, // Immediate intervention required
  ACWR_DANGER_THRESHOLD: 1.5, // High risk zone
  ACWR_CAUTION_THRESHOLD: 1.25, // Elevated risk
  ACWR_OPTIMAL_MAX: 1.25, // Upper bound of optimal zone
  ACWR_OPTIMAL_MIN: 0.8, // Lower bound of optimal zone

  // Pain escalation
  PAIN_ESCALATION_THRESHOLD: 7, // Pain >= 7 triggers escalation
  PAIN_STOP_THRESHOLD: 9, // Pain >= 9 means stop immediately

  // Behavioral triggers
  CONSECUTIVE_LOW_READINESS_DAYS: 3, // 3 consecutive low readiness days
  MISSED_CHECKINS_WARNING: 3, // 3 missed check-ins triggers warning
  MISSED_CHECKINS_ESCALATION: 5, // 5 missed check-ins triggers escalation
  MISSED_WORKOUTS_CONCERN: 3, // 3 missed workouts in 7 days

  // Confidence thresholds
  MIN_CONFIDENCE_FOR_AUTO_ACTION: 0.8, // 80% confidence for auto-apply
  MIN_CONFIDENCE_FOR_SUPERVISED: 0.6, // 60% for supervised actions

  // Time limits
  ACTION_EXPIRY_HOURS: 24, // Actions expire after 24 hours
  PERCEPTION_STALENESS_HOURS: 6, // Perception data older than 6h is stale
} as const

/**
 * Determines the ACWR zone based on the ratio
 */
export function getACWRZone(
  acwr: number
): 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL' {
  if (acwr >= SAFETY_BOUNDS.ACWR_CRITICAL_THRESHOLD) return 'CRITICAL'
  if (acwr >= SAFETY_BOUNDS.ACWR_DANGER_THRESHOLD) return 'DANGER'
  if (acwr >= SAFETY_BOUNDS.ACWR_CAUTION_THRESHOLD) return 'CAUTION'
  if (acwr >= SAFETY_BOUNDS.ACWR_OPTIMAL_MIN) return 'OPTIMAL'
  // Below optimal range - could be undertrained but not dangerous
  return 'OPTIMAL'
}

/**
 * Checks if pain level requires immediate escalation
 */
export function isPainCritical(painLevel: number): boolean {
  return painLevel >= SAFETY_BOUNDS.PAIN_ESCALATION_THRESHOLD
}

/**
 * Checks if pain level requires immediate stop
 */
export function isPainSevere(painLevel: number): boolean {
  return painLevel >= SAFETY_BOUNDS.PAIN_STOP_THRESHOLD
}

/**
 * Default preferences for AI-coached athletes (higher autonomy)
 */
export const AI_COACHED_DEFAULTS = {
  autonomyLevel: 'SUPERVISED' as const,
  allowWorkoutModification: true,
  allowRestDayInjection: true,
  maxIntensityReduction: 30, // More flexibility than coach-managed
  minRestDaysPerWeek: 1,
  maxConsecutiveHardDays: 3,
  dailyBriefingEnabled: true,
  proactiveNudgesEnabled: true,
  preferredContactMethod: 'IN_APP' as const,
}

/**
 * Default preferences for coach-managed athletes (conservative)
 */
export const COACH_MANAGED_DEFAULTS = {
  autonomyLevel: 'ADVISORY' as const,
  allowWorkoutModification: false,
  allowRestDayInjection: false,
  maxIntensityReduction: 20,
  minRestDaysPerWeek: 1,
  maxConsecutiveHardDays: 3,
  dailyBriefingEnabled: true,
  proactiveNudgesEnabled: true,
  preferredContactMethod: 'IN_APP' as const,
}

/**
 * Actions that require coach approval regardless of autonomy level
 */
export const COACH_APPROVAL_REQUIRED_ACTIONS = [
  'PROGRAM_ADJUSTMENT',
  'ESCALATE_TO_COACH',
] as const

/**
 * Actions that can be auto-applied at SUPERVISED autonomy or higher
 */
export const AUTO_APPLICABLE_ACTIONS_SUPERVISED = [
  'WORKOUT_INTENSITY_REDUCTION',
  'WORKOUT_DURATION_REDUCTION',
  'RECOVERY_ACTIVITY_SUGGESTION',
  'MOTIVATIONAL_NUDGE',
  'CHECK_IN_REQUEST',
] as const

/**
 * Actions that can be auto-applied at AUTONOMOUS level only
 */
export const AUTO_APPLICABLE_ACTIONS_AUTONOMOUS = [
  ...AUTO_APPLICABLE_ACTIONS_SUPERVISED,
  'WORKOUT_SUBSTITUTION',
  'REST_DAY_INJECTION',
  'WORKOUT_SKIP_RECOMMENDATION',
] as const
