/**
 * Agent Execution Orchestrator
 *
 * Orchestrates the execution of agent actions based on autonomy level.
 * Coordinates workout modifications, rest day injections, and notifications.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { AgentAction, AgentActionStatus, AgentAutonomyLevel } from '@prisma/client'
import { logAgentAudit } from '../gdpr/audit-logger'
import { getConsentStatus } from '../gdpr/consent-manager'
import { SAFETY_BOUNDS } from '../guardrails/safety-bounds'
import {
  applyIntensityReduction,
  applyDurationReduction,
  applyWorkoutSubstitution,
  skipWorkout,
  type WorkoutModificationResult,
} from './workout-modifier'
import { injectRestDay, suggestRecoveryActivity, type RestDayInjectionResult } from './rest-day-injector'
import { notifyOfAgentAction, notifyCoachOfAction } from './notification'

export interface ExecutionResult {
  actionId: string
  executed: boolean
  status: AgentActionStatus
  result?: WorkoutModificationResult | RestDayInjectionResult
  error?: string
}

export interface BatchExecutionResult {
  total: number
  executed: number
  failed: number
  results: ExecutionResult[]
}

/**
 * Determine if an action can be auto-applied based on autonomy level and action type
 */
function canAutoApply(
  autonomyLevel: AgentAutonomyLevel,
  action: AgentAction,
  preferences: {
    allowWorkoutModification: boolean
    allowRestDayInjection: boolean
    maxIntensityReduction: number
  }
): { canApply: boolean; reason?: string } {
  // Advisory mode never auto-applies
  if (autonomyLevel === 'ADVISORY') {
    return { canApply: false, reason: 'Advisory mode - recommendations only' }
  }

  // Check action-specific permissions
  switch (action.actionType) {
    case 'WORKOUT_INTENSITY_REDUCTION':
    case 'WORKOUT_DURATION_REDUCTION':
    case 'WORKOUT_SUBSTITUTION':
    case 'WORKOUT_SKIP_RECOMMENDATION':
      if (!preferences.allowWorkoutModification) {
        return { canApply: false, reason: 'Workout modification not allowed' }
      }
      // Check intensity reduction limit
      const actionData = action.actionData as { reductionPercent?: number }
      if (
        actionData.reductionPercent &&
        actionData.reductionPercent > preferences.maxIntensityReduction
      ) {
        return {
          canApply: false,
          reason: `Reduction ${actionData.reductionPercent}% exceeds max ${preferences.maxIntensityReduction}%`,
        }
      }
      break

    case 'REST_DAY_INJECTION':
      if (!preferences.allowRestDayInjection) {
        return { canApply: false, reason: 'Rest day injection not allowed' }
      }
      break

    case 'ESCALATE_TO_COACH':
    case 'ESCALATE_TO_SUPPORT':
      // Escalations always go through
      return { canApply: true }

    case 'MOTIVATIONAL_NUDGE':
    case 'CHECK_IN_REQUEST':
      // Low-impact actions can always auto-apply
      return { canApply: true }

    default:
      break
  }

  // Limited autonomy requires higher confidence
  if (autonomyLevel === 'LIMITED') {
    if (action.confidence === 'LOW') {
      return { canApply: false, reason: 'Low confidence action requires review' }
    }
    if (action.confidenceScore < 0.7) {
      return { canApply: false, reason: 'Confidence below threshold for auto-apply' }
    }
  }

  // Supervised autonomy notifies coach but applies
  if (autonomyLevel === 'SUPERVISED') {
    // Will apply but coach gets notified
    return { canApply: true }
  }

  // Autonomous applies everything within bounds
  if (autonomyLevel === 'AUTONOMOUS') {
    return { canApply: true }
  }

  return { canApply: true }
}

/**
 * Execute a single agent action
 */
export async function executeAction(action: AgentAction): Promise<ExecutionResult> {
  const startTime = Date.now()

  try {
    // Check consent
    const consentStatus = await getConsentStatus(action.clientId)
    if (!consentStatus.hasRequiredConsent) {
      return {
        actionId: action.id,
        executed: false,
        status: 'PROPOSED',
        error: 'Missing required consents',
      }
    }

    // Get preferences
    const preferences = await prisma.agentPreferences.findUnique({
      where: { clientId: action.clientId },
    })

    if (!preferences) {
      return {
        actionId: action.id,
        executed: false,
        status: 'PROPOSED',
        error: 'No agent preferences found',
      }
    }

    // Get latest perception for readiness score
    const latestPerception = await prisma.agentPerception.findFirst({
      where: { clientId: action.clientId },
      orderBy: { perceivedAt: 'desc' },
    })

    const readinessScore = latestPerception?.readinessScore || 5

    // Check if can auto-apply
    const autoApplyCheck = canAutoApply(preferences.autonomyLevel, action, {
      allowWorkoutModification: preferences.allowWorkoutModification,
      allowRestDayInjection: preferences.allowRestDayInjection,
      maxIntensityReduction: preferences.maxIntensityReduction,
    })

    if (!autoApplyCheck.canApply) {
      // Action stays as PROPOSED for manual review
      logger.info('Action requires manual review', {
        actionId: action.id,
        reason: autoApplyCheck.reason,
      })

      // Notify for review
      await notifyOfAgentAction(action)

      return {
        actionId: action.id,
        executed: false,
        status: 'PROPOSED',
        error: autoApplyCheck.reason,
      }
    }

    // Execute based on action type
    let result: WorkoutModificationResult | RestDayInjectionResult | null = null
    let success = false

    switch (action.actionType) {
      case 'WORKOUT_INTENSITY_REDUCTION':
        result = await applyIntensityReduction(action, readinessScore)
        success = result.success
        break

      case 'WORKOUT_DURATION_REDUCTION':
        result = await applyDurationReduction(action, readinessScore)
        success = result.success
        break

      case 'WORKOUT_SUBSTITUTION':
        result = await applyWorkoutSubstitution(action)
        success = result.success
        break

      case 'WORKOUT_SKIP_RECOMMENDATION':
        result = await skipWorkout(action)
        success = result.success
        break

      case 'REST_DAY_INJECTION':
        result = await injectRestDay(action)
        success = result.success
        break

      case 'RECOVERY_ACTIVITY_SUGGESTION':
        result = await suggestRecoveryActivity(action)
        success = result.success
        break

      case 'ESCALATE_TO_COACH':
        // Handled via notification
        success = true
        break

      case 'MOTIVATIONAL_NUDGE':
      case 'CHECK_IN_REQUEST':
        // Handled via notification
        success = true
        break

      default:
        logger.warn('Unknown action type', { actionType: action.actionType })
        success = false
    }

    // Update action status
    const newStatus: AgentActionStatus = success ? 'AUTO_APPLIED' : 'PROPOSED'

    await prisma.agentAction.update({
      where: { id: action.id },
      data: {
        status: newStatus,
        decidedAt: success ? new Date() : null,
        decidedBy: success ? 'AGENT' : null,
      },
    })

    // Send notifications
    if (success) {
      const updatedAction = { ...action, status: newStatus }
      await notifyOfAgentAction(updatedAction)

      // For supervised mode, also notify coach
      if (preferences.autonomyLevel === 'SUPERVISED') {
        const client = await prisma.client.findUnique({
          where: { id: action.clientId },
          include: {
            user: { select: { email: true, name: true } },
          },
        })

        if (client?.user?.email) {
          await notifyCoachOfAction(
            updatedAction,
            client.user.email,
            client.user.name || 'Coach',
            client.name
          )
        }
      }
    }

    // Audit log
    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'AgentAction',
      details: {
        type: 'ACTION_EXECUTED',
        actionId: action.id,
        actionType: action.actionType,
        success,
        result,
        executionTimeMs: Date.now() - startTime,
      },
      actorType: 'AGENT',
    })

    logger.info('Action executed', {
      actionId: action.id,
      actionType: action.actionType,
      success,
      executionTimeMs: Date.now() - startTime,
    })

    return {
      actionId: action.id,
      executed: success,
      status: newStatus,
      result: result || undefined,
    }
  } catch (error) {
    logger.error('Action execution failed', { actionId: action.id }, error)

    return {
      actionId: action.id,
      executed: false,
      status: 'PROPOSED',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute all pending auto-applicable actions
 */
export async function executePendingActions(limit: number = 50): Promise<BatchExecutionResult> {
  const results: ExecutionResult[] = []

  try {
    // Get actions that are ready for execution
    const pendingActions = await prisma.agentAction.findMany({
      where: {
        status: 'PROPOSED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ priority: 'desc' }, { proposedAt: 'asc' }],
      take: limit,
    })

    logger.info('Processing pending actions', { count: pendingActions.length })

    for (const action of pendingActions) {
      const result = await executeAction(action)
      results.push(result)
    }

    const executed = results.filter((r) => r.executed).length
    const failed = results.filter((r) => !r.executed && r.error).length

    logger.info('Batch execution complete', {
      total: pendingActions.length,
      executed,
      failed,
    })

    return {
      total: pendingActions.length,
      executed,
      failed,
      results,
    }
  } catch (error) {
    logger.error('Batch execution failed', {}, error)
    throw error
  }
}

/**
 * Execute actions for a specific athlete
 */
export async function executeActionsForAthlete(clientId: string): Promise<BatchExecutionResult> {
  const results: ExecutionResult[] = []

  try {
    const pendingActions = await prisma.agentAction.findMany({
      where: {
        clientId,
        status: 'PROPOSED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ priority: 'desc' }, { proposedAt: 'asc' }],
    })

    for (const action of pendingActions) {
      const result = await executeAction(action)
      results.push(result)
    }

    const executed = results.filter((r) => r.executed).length
    const failed = results.filter((r) => !r.executed && r.error).length

    return {
      total: pendingActions.length,
      executed,
      failed,
      results,
    }
  } catch (error) {
    logger.error('Athlete action execution failed', { clientId }, error)
    throw error
  }
}

/**
 * Expire old pending actions
 */
export async function expireOldActions(): Promise<number> {
  try {
    const result = await prisma.agentAction.updateMany({
      where: {
        status: 'PROPOSED',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    })

    if (result.count > 0) {
      logger.info('Expired old actions', { count: result.count })
    }

    return result.count
  } catch (error) {
    logger.error('Failed to expire old actions', {}, error)
    throw error
  }
}

/**
 * Manual accept of a proposed action
 */
export async function acceptAction(
  actionId: string,
  acceptedBy: string,
  feedback?: string
): Promise<ExecutionResult> {
  try {
    const action = await prisma.agentAction.findUnique({
      where: { id: actionId },
    })

    if (!action) {
      return {
        actionId,
        executed: false,
        status: 'PROPOSED',
        error: 'Action not found',
      }
    }

    if (action.status !== 'PROPOSED') {
      return {
        actionId,
        executed: false,
        status: action.status,
        error: `Action already ${action.status}`,
      }
    }

    // Update to accepted and execute
    await prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: 'ACCEPTED',
        decidedAt: new Date(),
        decidedBy: acceptedBy,
        athleteFeedback: feedback,
      },
    })

    // Execute the action
    const result = await executeAction({ ...action, status: 'ACCEPTED' })

    // Log learning event
    await prisma.agentLearningEvent.create({
      data: {
        clientId: action.clientId,
        actionId: action.id,
        eventType: 'ACTION_ACCEPTED',
        agentDecision: {
          actionType: action.actionType,
          confidence: action.confidence,
          reasoning: action.reasoning,
        },
        actualOutcome: { accepted: true, feedback },
        contextAtDecision: action.actionData as object,
      },
    })

    return result
  } catch (error) {
    logger.error('Failed to accept action', { actionId }, error)
    return {
      actionId,
      executed: false,
      status: 'PROPOSED',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Manual reject of a proposed action
 */
export async function rejectAction(
  actionId: string,
  rejectedBy: string,
  reason?: string
): Promise<void> {
  try {
    const action = await prisma.agentAction.findUnique({
      where: { id: actionId },
    })

    if (!action) {
      throw new Error('Action not found')
    }

    await prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: 'REJECTED',
        decidedAt: new Date(),
        decidedBy: rejectedBy,
        athleteFeedback: reason,
      },
    })

    // Log learning event
    await prisma.agentLearningEvent.create({
      data: {
        clientId: action.clientId,
        actionId: action.id,
        eventType: 'ACTION_REJECTED',
        agentDecision: {
          actionType: action.actionType,
          confidence: action.confidence,
          reasoning: action.reasoning,
        },
        actualOutcome: { rejected: true, reason },
        contextAtDecision: action.actionData as object,
      },
    })

    await logAgentAudit({
      clientId: action.clientId,
      action: 'ACTION_TAKEN',
      resource: 'AgentAction',
      details: {
        type: 'ACTION_REJECTED',
        actionId,
        rejectedBy,
        reason,
      },
      actorType: 'ATHLETE',
      actorId: rejectedBy,
    })

    logger.info('Action rejected', { actionId, rejectedBy, reason })
  } catch (error) {
    logger.error('Failed to reject action', { actionId }, error)
    throw error
  }
}

// Re-export for convenience
export * from './workout-modifier'
export * from './rest-day-injector'
export * from './notification'
