/**
 * Autonomous AI Training Agent
 *
 * This module provides the core functionality for the autonomous
 * AI training agent that can perceive athlete state, make decisions,
 * and take action within safety boundaries.
 *
 * Key Components:
 * - Perception: Collects and analyzes athlete state from multiple sources
 * - Decision: Makes recommendations based on perception and rules
 * - Guardrails: Ensures safety, consent, and autonomy constraints
 * - GDPR: Manages consent, audit logging, and data rights
 *
 * @module lib/agent
 */

// Type exports
export * from './types'

// Core modules
export * from './perception'
export * from './decision'
export * from './guardrails'
export * from './gdpr'

// Convenience imports
import { createPerception, storePerception, isPerceptionStale } from './perception'
import { makeDecisions, storeDecisions } from './decision'
import { checkGuardrails } from './guardrails'
import { getConsentStatus, grantConsent, withdrawConsent } from './gdpr'

/**
 * Run the complete agent cycle for an athlete
 *
 * 1. Create perception snapshot
 * 2. Store perception
 * 3. Make decisions
 * 4. Store decisions
 */
export async function runAgentCycle(clientId: string): Promise<{
  perceptionId: string
  actionIds: string[]
}> {
  // Create and store perception
  const perception = await createPerception(clientId)
  const perceptionId = await storePerception(perception)

  // Make and store decisions
  const actions = await makeDecisions(perception)
  const actionIds = await storeDecisions(actions, perceptionId, clientId)

  return { perceptionId, actionIds }
}

/**
 * Check if agent can run for an athlete
 */
export async function canRunAgent(clientId: string): Promise<{
  canRun: boolean
  reason?: string
}> {
  const consentStatus = await getConsentStatus(clientId)

  if (!consentStatus.hasRequiredConsent) {
    return {
      canRun: false,
      reason: 'Required consents not granted',
    }
  }

  if (consentStatus.isWithdrawn) {
    return {
      canRun: false,
      reason: 'Consent has been withdrawn',
    }
  }

  return { canRun: true }
}

/**
 * Initialize agent for a new athlete
 */
export async function initializeAgent(
  clientId: string,
  options?: {
    isAICoached?: boolean
  }
): Promise<void> {
  const { prisma } = await import('@/lib/prisma')

  // Create default preferences based on coaching mode
  const isAICoached = options?.isAICoached ?? false

  await prisma.agentPreferences.upsert({
    where: { clientId },
    create: {
      clientId,
      autonomyLevel: isAICoached ? 'SUPERVISED' : 'ADVISORY',
      allowWorkoutModification: isAICoached,
      allowRestDayInjection: isAICoached,
      maxIntensityReduction: isAICoached ? 30 : 20,
      dailyBriefingEnabled: true,
      proactiveNudgesEnabled: true,
    },
    update: {}, // Don't update if exists
  })
}
