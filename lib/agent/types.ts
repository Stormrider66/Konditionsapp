/**
 * Autonomous AI Agent - Type Definitions
 *
 * Core types for the autonomous training agent system.
 * Supports both coach-managed and AI-coached athletes.
 */

import type {
  AgentAutonomyLevel,
  AgentActionType,
  AgentActionStatus,
  AgentConfidence,
} from '@prisma/client'

// Re-export Prisma enums for convenience
export {
  AgentAutonomyLevel,
  AgentActionType,
  AgentActionStatus,
  AgentConfidence,
}

// ============================================================================
// PERCEPTION TYPES
// ============================================================================

/**
 * Readiness data collected from various sources
 */
export interface ReadinessData {
  /** Overall readiness score (0-100) */
  readinessScore: number | null
  /** Fatigue score (0-100, higher = more fatigued) */
  fatigueScore: number | null
  /** Sleep quality score (0-100) */
  sleepScore: number | null
  /** Stress level (0-100) */
  stressScore: number | null
  /** Data sources used */
  sources: ReadinessSource[]
}

export type ReadinessSource =
  | 'DAILY_CHECKIN'
  | 'GARMIN'
  | 'STRAVA'
  | 'WHOOP'
  | 'OURA'
  | 'MANUAL'

/**
 * Training load metrics
 */
export interface TrainingLoadData {
  /** Acute training load (7-day rolling) */
  acuteLoad: number
  /** Chronic training load (28-day rolling) */
  chronicLoad: number
  /** Acute:Chronic Workload Ratio */
  acwr: number
  /** ACWR risk zone */
  acwrZone: ACWRZone
  /** Load trend */
  loadTrend: LoadTrend
}

export type ACWRZone = 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'
export type LoadTrend = 'INCREASING' | 'STABLE' | 'DECREASING'

/**
 * Injury and restriction status
 */
export interface InjuryData {
  /** Whether athlete has any active injury */
  hasActiveInjury: boolean
  /** Whether there are any training restrictions */
  hasRestrictions: boolean
  /** Active injuries with details */
  activeInjuries: ActiveInjury[]
  /** Active restrictions */
  restrictions: Restriction[]
}

export interface ActiveInjury {
  id: string
  bodyPart: string
  severity: 'MILD' | 'MODERATE' | 'SEVERE'
  painLevel: number // 0-10
  startDate: Date
}

export interface Restriction {
  id: string
  type: 'INTENSITY' | 'VOLUME' | 'EXERCISE' | 'BODY_PART'
  description: string
  expiresAt: Date | null
}

/**
 * Behavioral metrics
 */
export interface BehaviorData {
  /** Current check-in streak */
  checkInStreak: number
  /** Best ever check-in streak */
  bestStreak: number
  /** Missed workouts in last 7 days */
  missedWorkouts7d: number
  /** Workout completion rate (last 30 days) */
  completionRate30d: number
  /** Days since last activity log */
  daysSinceLastLog: number
}

/**
 * Detected training patterns
 */
export interface PatternData {
  /** Detected patterns */
  patterns: DetectedPattern[]
  /** Overall pattern severity */
  severity: PatternSeverity
}

export interface DetectedPattern {
  type: PatternType
  description: string
  severity: PatternSeverity
  confidence: number // 0-1
  data: Record<string, unknown>
}

export type PatternType =
  | 'OVERTRAINING'
  | 'UNDERRECOVERY'
  | 'MONOTONY'
  | 'STRAIN_SPIKE'
  | 'DECLINING_PERFORMANCE'
  | 'IMPROVING_TREND'

export type PatternSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * Complete perception snapshot
 */
export interface PerceptionSnapshot {
  clientId: string
  perceivedAt: Date
  readiness: ReadinessData
  trainingLoad: TrainingLoadData
  injury: InjuryData
  behavior: BehaviorData
  patterns: PatternData
}

// ============================================================================
// DECISION TYPES
// ============================================================================

/**
 * Decision context - all data available for decision making
 */
export interface DecisionContext {
  perception: PerceptionSnapshot
  preferences: AgentPreferencesData
  upcomingWorkouts: UpcomingWorkout[]
  recentDecisions: RecentDecision[]
  athleteProfile: AthleteProfile
}

export interface AgentPreferencesData {
  autonomyLevel: AgentAutonomyLevel
  allowWorkoutModification: boolean
  allowRestDayInjection: boolean
  maxIntensityReduction: number
  minRestDaysPerWeek: number
  maxConsecutiveHardDays: number
  dailyBriefingEnabled: boolean
  proactiveNudgesEnabled: boolean
}

export interface UpcomingWorkout {
  id: string
  type: string
  scheduledDate: Date
  intensity: string
  duration: number
  description: string
}

export interface RecentDecision {
  id: string
  actionType: AgentActionType
  status: AgentActionStatus
  createdAt: Date
}

export interface AthleteProfile {
  id: string
  name: string
  sport: string
  isAICoached: boolean
  coachId: string | null
}

/**
 * Proposed action from the decision engine
 */
export interface ProposedAction {
  actionType: AgentActionType
  actionData: ActionData
  reasoning: string
  confidence: AgentConfidence
  confidenceScore: number
  priority: ActionPriority
  targetWorkoutId?: string
  targetDate?: Date
  expiresAt?: Date
}

export type ActionData =
  | WorkoutIntensityReductionData
  | WorkoutDurationReductionData
  | WorkoutSubstitutionData
  | WorkoutSkipData
  | RestDayInjectionData
  | RecoveryActivityData
  | EscalationData
  | NudgeData

export interface WorkoutIntensityReductionData {
  type: 'INTENSITY_REDUCTION'
  originalIntensity: string
  newIntensity: string
  reductionPercent: number
}

export interface WorkoutDurationReductionData {
  type: 'DURATION_REDUCTION'
  originalDuration: number
  newDuration: number
  reductionPercent: number
}

export interface WorkoutSubstitutionData {
  type: 'SUBSTITUTION'
  originalWorkoutType: string
  newWorkoutType: string
  reason: string
}

export interface WorkoutSkipData {
  type: 'SKIP'
  reason: string
}

export interface RestDayInjectionData {
  type: 'REST_DAY'
  targetDate: Date
  reason: string
}

export interface RecoveryActivityData {
  type: 'RECOVERY_ACTIVITY'
  activityType: string
  duration: number
  instructions: string
}

export interface EscalationData {
  type: 'ESCALATION'
  escalateTo: 'COACH' | 'SUPPORT'
  reason: string
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export interface NudgeData {
  type: 'NUDGE'
  nudgeType: 'MOTIVATIONAL' | 'CHECK_IN' | 'REMINDER'
  message: string
}

export type ActionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

// ============================================================================
// SAFETY TYPES
// ============================================================================

/**
 * Safety check result
 */
export interface SafetyCheckResult {
  passed: boolean
  violations: SafetyViolation[]
  warnings: SafetyWarning[]
}

export interface SafetyViolation {
  rule: string
  description: string
  severity: 'BLOCKING' | 'CRITICAL'
  data: Record<string, unknown>
}

export interface SafetyWarning {
  rule: string
  description: string
  recommendation: string
}

// ============================================================================
// CONSENT TYPES
// ============================================================================

/**
 * Consent status for agent operations
 */
export interface ConsentStatus {
  hasRequiredConsent: boolean
  dataProcessingConsent: boolean
  automatedDecisionConsent: boolean
  healthDataProcessingConsent: boolean
  learningContributionConsent: boolean
  anonymizedResearchConsent: boolean
  consentVersion: string
  consentGivenAt: Date | null
  isWithdrawn: boolean
}

/**
 * Consent update request
 */
export interface ConsentUpdate {
  dataProcessingConsent?: boolean
  automatedDecisionConsent?: boolean
  healthDataProcessingConsent?: boolean
  learningContributionConsent?: boolean
  anonymizedResearchConsent?: boolean
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export type AuditAction =
  | 'DATA_ACCESS'
  | 'DECISION_MADE'
  | 'ACTION_TAKEN'
  | 'CONSENT_CHANGED'
  | 'DATA_EXPORTED'
  | 'DATA_DELETED'

export type AuditActorType = 'AGENT' | 'ATHLETE' | 'COACH' | 'SYSTEM'

export interface AuditEntry {
  clientId: string
  action: AuditAction
  resource: string
  details: Record<string, unknown>
  actorType: AuditActorType
  actorId?: string
  ipAddress?: string
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

/**
 * Result of executing an action
 */
export interface ExecutionResult {
  success: boolean
  actionId: string
  executedAt: Date
  changes?: Record<string, unknown>
  error?: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AgentStatusResponse {
  isActive: boolean
  hasConsent: boolean
  autonomyLevel: AgentAutonomyLevel
  pendingActions: number
  lastPerception: Date | null
}

export interface AgentActionsResponse {
  actions: AgentActionResponse[]
  total: number
}

export interface AgentActionResponse {
  id: string
  actionType: AgentActionType
  actionData: ActionData
  reasoning: string
  confidence: AgentConfidence
  confidenceScore: number
  priority: ActionPriority
  status: AgentActionStatus
  targetDate: Date | null
  proposedAt: Date
  expiresAt: Date | null
}
