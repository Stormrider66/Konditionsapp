/**
 * Shadow Mode
 *
 * Runs managed agents alongside existing cron-based system.
 * Agent decisions are logged but not executed (log-only mode).
 * Compares agent decisions with cron decisions for validation.
 *
 * Usage:
 * 1. Set MANAGED_AGENTS_MODE=shadow in .env.local
 * 2. Events are dispatched to agents, but write tools are intercepted
 * 3. Agent decisions are logged to AgentEvent.result
 * 4. Cron jobs continue to run and execute normally
 * 5. Compare logs to validate agent decision quality
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { AgentType, AgentEvent } from './types'
import { invokeAgent } from './agent-client'

export type ManagedAgentsMode = 'disabled' | 'shadow' | 'primary' | 'exclusive'

/**
 * Get the current operating mode from environment.
 *
 * - disabled: Managed agents are off (crons only)
 * - shadow: Agents run but don't execute writes (log-only, crons active)
 * - primary: Agents handle events, crons are fallback only
 * - exclusive: Agents only, crons disabled (except essential ones)
 */
export function getAgentMode(): ManagedAgentsMode {
  const mode = process.env.MANAGED_AGENTS_MODE as ManagedAgentsMode | undefined
  return mode || 'disabled'
}

/**
 * Check if agents should process events.
 */
export function isAgentProcessingEnabled(): boolean {
  return getAgentMode() !== 'disabled'
}

/**
 * Check if agent write tools should actually execute.
 * In shadow mode, writes are intercepted and logged but not applied.
 */
export function shouldExecuteWrites(): boolean {
  const mode = getAgentMode()
  return mode === 'primary' || mode === 'exclusive'
}

/**
 * Check if cron jobs should still run.
 */
export function shouldCronsRun(): boolean {
  const mode = getAgentMode()
  return mode !== 'exclusive'
}

/**
 * Process an event through the managed agent system.
 * Respects the current operating mode.
 */
export async function processEventWithAgent(
  agentType: AgentType,
  event: AgentEvent
): Promise<void> {
  const mode = getAgentMode()

  if (mode === 'disabled') return

  try {
    if (mode === 'shadow') {
      // Shadow mode: invoke agent but intercept writes
      logger.info(`[shadow-mode] Processing ${event.type} for ${event.entityId} with ${agentType}`)

      const result = await invokeAgent(agentType, event)

      // Log the shadow result
      await prisma.agentEvent.updateMany({
        where: {
          entityId: event.entityId,
          eventType: event.type,
          processedAt: null,
        },
        data: {
          processedAt: new Date(),
          result: {
            mode: 'shadow',
            response: result.response,
            toolsUsed: result.toolsUsed,
            tokensUsed: result.tokensUsed,
          },
        },
      })

      logger.info(`[shadow-mode] Completed ${event.type} for ${event.entityId}`, {
        agentType,
        toolsUsed: result.toolsUsed.length,
        tokensUsed: result.tokensUsed,
      })
    } else {
      // Primary or exclusive: full execution
      const result = await invokeAgent(agentType, event)

      logger.info(`[managed-agents] Completed ${event.type} for ${event.entityId}`, {
        agentType,
        mode,
        toolsUsed: result.toolsUsed.length,
        tokensUsed: result.tokensUsed,
      })
    }
  } catch (error) {
    logger.error(`[managed-agents] Failed to process ${event.type}`, {
      agentType,
      entityId: event.entityId,
      mode,
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

/**
 * Get shadow mode comparison data.
 * Returns recent agent decisions alongside cron decisions for the same athlete.
 */
export async function getShadowComparison(
  entityId: string,
  days: number = 7
): Promise<{
  agentDecisions: { eventType: string; result: unknown; processedAt: Date | null }[]
  cronDecisions: { actionType: string; status: string; reasoning: string; createdAt: Date }[]
  matchRate: number | null
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [agentEvents, cronActions] = await Promise.all([
    prisma.agentEvent.findMany({
      where: {
        entityId,
        processedAt: { not: null, gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.agentAction.findMany({
      where: {
        clientId: entityId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  return {
    agentDecisions: agentEvents.map(e => ({
      eventType: e.eventType,
      result: e.result,
      processedAt: e.processedAt,
    })),
    cronDecisions: cronActions.map(a => ({
      actionType: a.actionType,
      status: a.status,
      reasoning: a.reasoning || '',
      createdAt: a.createdAt,
    })),
    matchRate: null, // TODO: implement comparison logic once we have enough data
  }
}
