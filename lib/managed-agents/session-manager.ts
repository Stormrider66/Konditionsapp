/**
 * Managed Agent Session Manager
 *
 * Handles creating, resuming, and terminating agent sessions.
 * Each agent session maps to a Claude Managed Agent session via the API.
 */

import { prisma } from '@/lib/prisma'
import { resolveModel } from '@/types/ai-models'
import type { AgentType, AgentEvent, AgentSessionStatus, EscalationContext } from './types'
import { AGENT_MODEL_INTENT, resolveAgentModelIntent, EVENT_TO_AGENT } from './types'

// ============================================================================
// SESSION LIFECYCLE
// ============================================================================

/**
 * Get or create an active session for an entity.
 * Reuses existing active sessions, creates new ones if needed.
 */
export async function getOrCreateSession(
  agentType: AgentType,
  entityId: string,
  escalationContext?: EscalationContext
): Promise<{
  sessionId: string
  isNew: boolean
  modelIntent: string
}> {
  // Look for existing active session
  const existing = await prisma.managedAgentSession.findFirst({
    where: {
      agentType,
      entityId,
      status: 'ACTIVE',
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (existing) {
    // Update last event time
    await prisma.managedAgentSession.update({
      where: { id: existing.id },
      data: { lastEventAt: new Date() },
    })

    return {
      sessionId: existing.id,
      isNew: false,
      modelIntent: existing.modelIntent,
    }
  }

  // Resolve model intent with potential escalation
  const modelIntent = resolveAgentModelIntent(agentType, escalationContext)

  // Create new session
  const session = await prisma.managedAgentSession.create({
    data: {
      agentType,
      entityId,
      status: 'ACTIVE',
      modelIntent,
      lastEventAt: new Date(),
      totalTokensUsed: 0,
      totalCostUsd: 0,
    },
  })

  return {
    sessionId: session.id,
    isNew: true,
    modelIntent,
  }
}

/**
 * Update session with usage metrics after an agent invocation.
 */
export async function updateSessionUsage(
  sessionId: string,
  tokensUsed: number,
  costUsd: number,
  externalId?: string
): Promise<void> {
  await prisma.managedAgentSession.update({
    where: { id: sessionId },
    data: {
      totalTokensUsed: { increment: tokensUsed },
      totalCostUsd: { increment: costUsd },
      lastEventAt: new Date(),
      ...(externalId ? { externalId } : {}),
    },
  })
}

/**
 * Expire sessions that have been inactive for too long.
 */
export async function expireInactiveSessions(
  maxInactiveHours: number = 24
): Promise<number> {
  const cutoff = new Date(Date.now() - maxInactiveHours * 60 * 60 * 1000)

  const result = await prisma.managedAgentSession.updateMany({
    where: {
      status: 'ACTIVE',
      lastEventAt: { lt: cutoff },
    },
    data: { status: 'EXPIRED' },
  })

  return result.count
}

/**
 * Mark a session as errored.
 */
export async function markSessionError(
  sessionId: string,
  error: string
): Promise<void> {
  await prisma.managedAgentSession.update({
    where: { id: sessionId },
    data: {
      status: 'ERROR',
      metadata: { lastError: error, errorAt: new Date().toISOString() },
    },
  })
}

// ============================================================================
// EVENT ROUTING
// ============================================================================

/**
 * Route an event to the appropriate agent(s).
 * Returns the agent types that should handle this event.
 */
export function routeEvent(event: AgentEvent): AgentType[] {
  return EVENT_TO_AGENT[event.type] || []
}

/**
 * Store an event and route it to the appropriate agent sessions.
 */
export async function dispatchEvent(event: AgentEvent): Promise<{
  dispatched: { agentType: AgentType; sessionId: string }[]
}> {
  const targetAgents = routeEvent(event)
  const dispatched: { agentType: AgentType; sessionId: string }[] = []

  // Store the event
  const storedEvent = await prisma.agentEvent.create({
    data: {
      eventType: event.type,
      entityId: event.entityId,
      eventData: event.data as Record<string, unknown>,
      createdAt: event.timestamp,
    },
  })

  // Get or create sessions for each target agent
  for (const agentType of targetAgents) {
    const { sessionId } = await getOrCreateSession(agentType, event.entityId)

    // Link event to session
    await prisma.agentEvent.update({
      where: { id: storedEvent.id },
      data: { sessionId },
    })

    dispatched.push({ agentType, sessionId })
  }

  return { dispatched }
}

// ============================================================================
// SESSION QUERIES
// ============================================================================

/**
 * Get active sessions for an entity.
 */
export async function getActiveSessions(entityId: string): Promise<{
  sessions: {
    id: string
    agentType: AgentType
    status: AgentSessionStatus
    modelIntent: string
    lastEventAt: Date
    totalTokensUsed: number
    totalCostUsd: number
  }[]
}> {
  const sessions = await prisma.managedAgentSession.findMany({
    where: {
      entityId,
      status: 'ACTIVE',
    },
    orderBy: { updatedAt: 'desc' },
  })

  return {
    sessions: sessions.map(s => ({
      id: s.id,
      agentType: s.agentType as AgentType,
      status: s.status as AgentSessionStatus,
      modelIntent: s.modelIntent,
      lastEventAt: s.lastEventAt,
      totalTokensUsed: s.totalTokensUsed,
      totalCostUsd: s.totalCostUsd,
    })),
  }
}

/**
 * Get session usage stats for billing/monitoring.
 */
export async function getSessionStats(
  entityId: string,
  periodDays: number = 30
): Promise<{
  totalSessions: number
  totalTokens: number
  totalCostUsd: number
  byAgentType: Record<string, { sessions: number; tokens: number; costUsd: number }>
}> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

  const sessions = await prisma.managedAgentSession.findMany({
    where: {
      entityId,
      createdAt: { gte: since },
    },
  })

  const byAgentType: Record<string, { sessions: number; tokens: number; costUsd: number }> = {}

  for (const session of sessions) {
    if (!byAgentType[session.agentType]) {
      byAgentType[session.agentType] = { sessions: 0, tokens: 0, costUsd: 0 }
    }
    byAgentType[session.agentType].sessions++
    byAgentType[session.agentType].tokens += session.totalTokensUsed
    byAgentType[session.agentType].costUsd += session.totalCostUsd
  }

  return {
    totalSessions: sessions.length,
    totalTokens: sessions.reduce((sum, s) => sum + s.totalTokensUsed, 0),
    totalCostUsd: sessions.reduce((sum, s) => sum + s.totalCostUsd, 0),
    byAgentType,
  }
}
