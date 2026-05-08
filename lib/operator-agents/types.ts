/**
 * Operator Agents - Type Definitions
 *
 * Operator agents help the founder run the platform. They live in the
 * /admin super admin page and run on schedules (not event-driven like
 * athlete agents). They handle support, churn prediction, platform
 * health, cost monitoring, feature curation, and more.
 */

import type { ModelIntent } from '@/types/ai-models'

// ============================================================================
// AGENT TYPES
// ============================================================================

export type OperatorAgentType =
  | 'SUPPORT'
  | 'CHURN_PREDICTOR'
  | 'FEATURE_CURATOR'
  | 'PLATFORM_HEALTH'
  | 'COST_GUARDIAN'
  | 'FOUNDERS_BRIEF'
  | 'ONBOARDING_ACTIVATION'
  | 'BUSINESS_INTELLIGENCE'
  | 'MARKETING_CONTENT'
  | 'DATA_QUALITY'
  | 'COMPLIANCE_SECURITY'
  | 'COMPETITOR_INTEL'

/**
 * Default model intent per operator agent.
 *
 * All operator agents currently run on the 'fast' tier. The runner resolves
 * that to the cheapest configured provider model (OpenAI GPT-5.4 Nano first,
 * Gemini Flash-Lite fallback) to keep beta-stage operating cost low. Raise
 * individual agents to 'balanced' or 'powerful' if quality regresses — the
 * runner reads this map at every invocation.
 */
export const OPERATOR_MODEL_INTENT: Record<OperatorAgentType, ModelIntent> = {
  SUPPORT: 'fast',
  CHURN_PREDICTOR: 'fast',
  FEATURE_CURATOR: 'fast',
  PLATFORM_HEALTH: 'fast',
  COST_GUARDIAN: 'fast',
  FOUNDERS_BRIEF: 'fast',
  ONBOARDING_ACTIVATION: 'fast',
  BUSINESS_INTELLIGENCE: 'fast',
  MARKETING_CONTENT: 'fast',
  DATA_QUALITY: 'fast',
  COMPLIANCE_SECURITY: 'fast',
  COMPETITOR_INTEL: 'fast',
}

// ============================================================================
// SCHEDULING
// ============================================================================

/**
 * Default schedules for each operator agent.
 * These map to Vercel cron expressions in app/api/cron/operator/*.
 * Can be overridden per-environment.
 */
export const OPERATOR_SCHEDULES: Record<OperatorAgentType, string> = {
  SUPPORT: '*/30 * * * *',              // Every 30 min
  CHURN_PREDICTOR: '0 6 * * *',         // Daily 6am UTC
  FEATURE_CURATOR: '0 2 * * 0',         // Weekly Sunday 2am
  PLATFORM_HEALTH: '*/15 * * * *',      // Every 15 min
  COST_GUARDIAN: '0 * * * *',           // Hourly
  FOUNDERS_BRIEF: '0 7 * * *',          // Daily 7am UTC
  ONBOARDING_ACTIVATION: '0 9 * * *',   // Daily 9am UTC
  BUSINESS_INTELLIGENCE: '0 8 * * 1',   // Weekly Monday 8am
  MARKETING_CONTENT: '0 15 * * 5',      // Weekly Friday 3pm
  DATA_QUALITY: '0 4 * * *',            // Daily 4am
  COMPLIANCE_SECURITY: '0 5 * * *',     // Daily 5am
  COMPETITOR_INTEL: '0 10 * * 5',       // Weekly Friday 10am
}

// ============================================================================
// AUTONOMY
// ============================================================================

/**
 * What an operator agent is allowed to do autonomously.
 * Write operations that affect users (email, DB changes) always escalate.
 */
export type OperatorAutonomy = 'read_only' | 'draft_only' | 'semi_autonomous'

/**
 * Default autonomy level per agent.
 * Graduates to 'semi_autonomous' after shadow mode validation.
 */
export const OPERATOR_AUTONOMY: Record<OperatorAgentType, OperatorAutonomy> = {
  SUPPORT: 'semi_autonomous',            // Can create GitHub issues, classify tickets
  CHURN_PREDICTOR: 'draft_only',         // Drafts emails, never sends
  FEATURE_CURATOR: 'semi_autonomous',    // Can dedupe, categorize, score
  PLATFORM_HEALTH: 'read_only',          // Only alerts, no actions
  COST_GUARDIAN: 'read_only',            // Only alerts, no actions
  FOUNDERS_BRIEF: 'semi_autonomous',     // Can send daily brief email to founder
  ONBOARDING_ACTIVATION: 'draft_only',   // Drafts nudges, founder reviews
  BUSINESS_INTELLIGENCE: 'read_only',    // Reports only
  MARKETING_CONTENT: 'draft_only',       // Drafts content, founder reviews
  DATA_QUALITY: 'read_only',             // Alerts only
  COMPLIANCE_SECURITY: 'read_only',      // Alerts only
  COMPETITOR_INTEL: 'read_only',         // Reports only
}

// ============================================================================
// RUN RESULT
// ============================================================================

export type OperatorAgentStatus = 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface OperatorAgentRunResult {
  agentType: OperatorAgentType
  status: OperatorAgentStatus
  itemsProcessed: number
  actionsTaken: number
  escalations: number
  summary: string
  details?: Record<string, unknown>
  tokensUsed: number
  costUsd: number
  modelUsed?: string
  errorMessage?: string
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface OperatorToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export type OperatorToolCategory =
  | 'read_db'        // Query Prisma (read-only)
  | 'read_external'  // Query Sentry, Stripe, etc.
  | 'draft'          // Generate content for review
  | 'write_internal' // Create internal records (agent runs, tickets)
  | 'notify_founder' // Send email/dashboard alerts to founder only
  | 'github'         // Create GitHub issues via MCP
