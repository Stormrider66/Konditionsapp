/**
 * Managed Agents - Type Definitions
 *
 * Core types for the Claude Managed Agents system that replaces
 * the cron-based perceive/decide/execute loop with event-driven agents.
 */

import type { ModelIntent } from '@/types/ai-models'

// ============================================================================
// AGENT TYPES
// ============================================================================

export type AgentType =
  | 'COACHING'
  | 'PROGRAM_GENERATION'
  | 'COACH_DASHBOARD'
  | 'NUTRITION'
  | 'PHYSIO'
  | 'RESEARCH'
  | 'LEARNING'

export type AgentSessionStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ERROR'

/**
 * Default model intent per agent type.
 * Maps to the existing ModelIntent system in types/ai-models.ts.
 */
export const AGENT_MODEL_INTENT: Record<AgentType, ModelIntent> = {
  COACHING: 'balanced',           // Sonnet 4.6 — high volume, good reasoning
  PROGRAM_GENERATION: 'powerful', // Opus 4.6 — complex multi-phase generation
  COACH_DASHBOARD: 'balanced',    // Sonnet 4.6 — synthesis and queries
  NUTRITION: 'fast',              // Haiku 4.5 — frequent simple nudges
  PHYSIO: 'balanced',             // Sonnet 4.6 — clinical reasoning matters
  RESEARCH: 'powerful',           // Opus 4.6 — deep multi-source synthesis
  LEARNING: 'balanced',           // Sonnet 4.6 — batch pattern analysis
}

// ============================================================================
// ESCALATION CONTEXT
// ============================================================================

export interface EscalationContext {
  /** ACWR zone if available */
  acwrZone?: 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'
  /** Whether athlete has an active injury */
  activeInjury?: boolean
  /** Whether this is a weekly report (for Nutrition Agent) */
  isWeeklyReport?: boolean
  /** Whether a plateau was detected (for Nutrition Agent) */
  plateauDetected?: boolean
  /** Current rehab phase (for Physio Agent) */
  rehabPhase?: string
}

/**
 * Resolve the model intent for an agent, with dynamic escalation.
 *
 * Agents start with their default tier and escalate when complexity requires:
 * - Coaching: balanced -> powerful when ACWR critical + injury
 * - Nutrition: fast -> balanced for weekly reports and plateaus
 * - Physio: balanced -> powerful for return-to-sport clearance
 */
export function resolveAgentModelIntent(
  agentType: AgentType,
  context?: EscalationContext
): ModelIntent {
  const base = AGENT_MODEL_INTENT[agentType]
  if (!context) return base

  if (agentType === 'NUTRITION' && (context.isWeeklyReport || context.plateauDetected)) {
    return 'balanced'
  }

  if (agentType === 'COACHING' && context.acwrZone === 'CRITICAL' && context.activeInjury) {
    return 'powerful'
  }

  if (agentType === 'PHYSIO' && context.rehabPhase === 'RETURN_TO_SPORT') {
    return 'powerful'
  }

  return base
}

// ============================================================================
// AGENT EVENTS
// ============================================================================

export type AgentEventType =
  | 'GARMIN_ACTIVITY'
  | 'GARMIN_SLEEP'
  | 'GARMIN_HRV'
  | 'GARMIN_DAILY'
  | 'GARMIN_BODY_COMPOSITION'
  | 'GARMIN_STRESS'
  | 'STRAVA_ACTIVITY'
  | 'CONCEPT2_RESULT'
  | 'CHECKIN_SUBMITTED'
  | 'WORKOUT_COMPLETED'
  | 'WORKOUT_SKIPPED'
  | 'INJURY_REPORTED'
  | 'RESTRICTION_CREATED'
  | 'RESTRICTION_UPDATED'
  | 'RESTRICTION_CLEARED'
  | 'MEAL_LOGGED'
  | 'FOOD_SCANNED'
  | 'BODY_COMP_LOGGED'
  | 'PROGRAM_REQUESTED'
  | 'RESEARCH_REQUESTED'
  | 'COACH_QUERY'
  | 'MORNING_SCHEDULE'
  | 'WEEKLY_REVIEW'
  | 'REHAB_LOG_SUBMITTED'

export interface AgentEvent {
  id: string
  type: AgentEventType
  /** The entity this event is for (clientId, coachId, physioId) */
  entityId: string
  /** Event payload - varies by type */
  data: Record<string, unknown>
  /** When the event occurred */
  timestamp: Date
}

// ============================================================================
// AGENT SESSION
// ============================================================================

export interface AgentSession {
  id: string
  agentType: AgentType
  /** The entity this agent serves (clientId, coachId, physioId) */
  entityId: string
  /** Claude Managed Agent session ID from the API */
  externalId: string | null
  status: AgentSessionStatus
  /** Current model intent being used */
  modelIntent: ModelIntent
  lastEventAt: Date
  totalTokensUsed: number
  totalCostUsd: number
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Tool categories for organizing agent capabilities.
 */
export type ToolCategory = 'read' | 'calculate' | 'write'

/**
 * Base interface for all tool inputs.
 * Every write tool requires clientId for consent/guardrail checks.
 */
export interface ToolInput {
  clientId: string
}

/**
 * Standardized tool result.
 */
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  /** Consent or safety violation that prevented execution */
  violation?: string
}

// ============================================================================
// TOOL INPUT TYPES - READ
// ============================================================================

export interface ReadAthleteProfileInput extends ToolInput {}

export interface ReadReadinessInput extends ToolInput {
  date?: string // ISO date string
}

export interface ReadTrainingLoadInput extends ToolInput {}

export interface ReadActiveInjuriesInput extends ToolInput {}

export interface ReadUpcomingWorkoutsInput extends ToolInput {
  days?: number // Default 7
}

export interface ReadRecentDecisionsInput extends ToolInput {
  days?: number // Default 7
}

export interface ReadGarminLatestInput extends ToolInput {}

export interface ReadMealsTodayInput extends ToolInput {}

export interface ReadDailyMacrosInput extends ToolInput {
  date?: string
}

export interface ReadBodyCompHistoryInput extends ToolInput {
  days?: number // Default 90
}

export interface ReadRehabProgressInput extends ToolInput {
  programId?: string
}

// ============================================================================
// TOOL INPUT TYPES - CALCULATE
// ============================================================================

export interface CalculateACWRInput extends ToolInput {}

export interface DetectPatternsInput extends ToolInput {
  days?: number // Default 7
}

export interface DetectMilestonesInput extends ToolInput {}

export interface CalculateInjuryRiskInput extends ToolInput {}

export interface CalculateTDEEInput extends ToolInput {}

export interface CalculateMacroTargetsInput extends ToolInput {
  goalType: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP'
  tdee: number
}

// ============================================================================
// TOOL INPUT TYPES - WRITE
// ============================================================================

export interface ModifyWorkoutIntensityInput extends ToolInput {
  assignmentId: string
  reductionPercent: number // 1-50
}

export interface ModifyWorkoutDurationInput extends ToolInput {
  assignmentId: string
  reductionPercent: number // 1-50
}

export interface SubstituteWorkoutInput extends ToolInput {
  assignmentId: string
  newType: 'EASY_AEROBIC' | 'RECOVERY' | 'CROSS_TRAINING' | 'MOBILITY'
  reason: string
}

export interface SkipWorkoutInput extends ToolInput {
  assignmentId: string
  reason: string
}

export interface InjectRestDayInput extends ToolInput {
  date: string // ISO date
  reason: string
}

export interface SendNotificationInput extends ToolInput {
  type: 'RECOVERY' | 'TRAINING' | 'NUTRITION' | 'MILESTONE' | 'GENERAL'
  title: string
  message: string
}

export interface CreateCoachAlertInput {
  coachId: string
  clientId: string
  alertType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
}

export interface RequestCheckInInput extends ToolInput {
  reason: string
}

export interface SendNutritionNudgeInput extends ToolInput {
  type: 'MEAL_REMINDER' | 'HYDRATION' | 'PROTEIN' | 'DEFICIT_WARNING' | 'SURPLUS_WARNING'
  message: string
}

export interface LogAgentActionInput extends ToolInput {
  actionType: string
  reasoning: string
  confidence: number // 0-1
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

// ============================================================================
// EVENT ROUTING
// ============================================================================

/**
 * Maps event types to the agent types that should handle them.
 */
export const EVENT_TO_AGENT: Record<AgentEventType, AgentType[]> = {
  GARMIN_ACTIVITY: ['COACHING'],
  GARMIN_SLEEP: ['COACHING'],
  GARMIN_HRV: ['COACHING'],
  GARMIN_DAILY: ['COACHING'],
  GARMIN_BODY_COMPOSITION: ['NUTRITION'],
  GARMIN_STRESS: ['COACHING'],
  STRAVA_ACTIVITY: ['COACHING'],
  CONCEPT2_RESULT: ['COACHING'],
  CHECKIN_SUBMITTED: ['COACHING'],
  WORKOUT_COMPLETED: ['COACHING', 'LEARNING'],
  WORKOUT_SKIPPED: ['COACHING', 'LEARNING'],
  INJURY_REPORTED: ['COACHING', 'PHYSIO'],
  RESTRICTION_CREATED: ['COACHING'],
  RESTRICTION_UPDATED: ['COACHING'],
  RESTRICTION_CLEARED: ['COACHING'],
  MEAL_LOGGED: ['NUTRITION'],
  FOOD_SCANNED: ['NUTRITION'],
  BODY_COMP_LOGGED: ['NUTRITION'],
  PROGRAM_REQUESTED: ['PROGRAM_GENERATION'],
  RESEARCH_REQUESTED: ['RESEARCH'],
  COACH_QUERY: ['COACH_DASHBOARD'],
  MORNING_SCHEDULE: ['COACH_DASHBOARD'],
  WEEKLY_REVIEW: ['NUTRITION', 'LEARNING'],
  REHAB_LOG_SUBMITTED: ['PHYSIO'],
}
