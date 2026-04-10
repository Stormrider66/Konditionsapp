/**
 * Operator Agent Tool Executor
 *
 * Implements all tools that operator agents can call.
 * Organized by category (support, health, cost, etc.)
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { OperatorToolResult } from './types'

// ============================================================================
// PLATFORM HEALTH TOOLS
// ============================================================================

export async function getSentryErrors(minutes: number = 15): Promise<OperatorToolResult> {
  // Sentry API integration — for now, read from recent logs
  // In production, query Sentry's Issues API with a date filter
  try {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    // Placeholder: count operator agent failures as a proxy
    // until Sentry API integration is wired up
    const recentFailures = await prisma.operatorAgentRun.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: since },
      },
    })

    return {
      success: true,
      data: {
        since: since.toISOString(),
        minutes,
        operatorAgentFailures: recentFailures,
        // TODO: integrate Sentry Issues API
        note: 'Sentry API integration pending - showing operator agent failures as proxy',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getCronJobFailures(hours: number = 1): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const failures = await prisma.operatorAgentRun.findMany({
      where: {
        status: 'FAILED',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        agentType: true,
        errorMessage: true,
        createdAt: true,
      },
    })

    // Group by agent type to detect consecutive failures
    const byAgent: Record<string, number> = {}
    for (const f of failures) {
      byAgent[f.agentType] = (byAgent[f.agentType] || 0) + 1
    }

    return {
      success: true,
      data: {
        totalFailures: failures.length,
        consecutiveFailures: Object.entries(byAgent).filter(([_, c]) => c >= 3).map(([agent]) => agent),
        failures: failures.slice(0, 10),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAgentErrorRate(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [total, failed] = await Promise.all([
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since } } }),
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since }, status: 'FAILED' } }),
    ])

    const errorRate = total > 0 ? failed / total : 0

    return {
      success: true,
      data: {
        totalRuns24h: total,
        failedRuns24h: failed,
        errorRate,
        errorRatePercent: Math.round(errorRate * 100),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function logHealthSnapshot(data: Record<string, unknown>): Promise<OperatorToolResult> {
  // Store snapshot in OperatorAgentRun.details for the current run
  // (No separate snapshots table — details JSON is enough)
  logger.info('[operator-agents] Health snapshot', data)
  return { success: true, data: { logged: true } }
}

export async function alertFounder(
  severity: string,
  title: string,
  message: string
): Promise<OperatorToolResult> {
  // Use existing email infrastructure
  try {
    const founderEmail = process.env.FOUNDER_EMAIL
    if (!founderEmail) {
      logger.warn('[operator-agents] FOUNDER_EMAIL not set — alert suppressed', { severity, title })
      return { success: true, data: { sent: false, reason: 'FOUNDER_EMAIL not configured' } }
    }

    // Import lazily to avoid circular dependencies
    const { sendEmail } = await import('@/lib/email').catch(() => ({ sendEmail: null }))
    if (!sendEmail) {
      return { success: true, data: { sent: false, reason: 'sendEmail not available' } }
    }

    await sendEmail({
      to: founderEmail,
      subject: `[${severity}] ${title}`,
      html: `<h2>${title}</h2><pre style="white-space:pre-wrap;font-family:monospace">${message}</pre>`,
    })

    return { success: true, data: { sent: true, to: founderEmail } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// SUPPORT AGENT TOOLS
// ============================================================================

export async function getOpenSupportTickets(): Promise<OperatorToolResult> {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        status: 'OPEN',
        agentClassified: false,
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        userId: true,
        reporterEmail: true,
        priority: true,
        url: true,
        createdAt: true,
      },
    })

    return { success: true, data: { count: tickets.length, tickets } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getTicket(ticketId: string): Promise<OperatorToolResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    })
    if (!ticket) return { success: false, error: 'Ticket not found' }
    return { success: true, data: ticket }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function searchSimilarTickets(query: string): Promise<OperatorToolResult> {
  try {
    // Simple keyword search — can be upgraded to embedding search later
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5)
    const similar = await prisma.supportTicket.findMany({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        OR: words.map(w => ({
          OR: [
            { title: { contains: w, mode: 'insensitive' as const } },
            { description: { contains: w, mode: 'insensitive' as const } },
          ],
        })),
      },
      orderBy: { resolvedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        resolution: true,
      },
    })

    return { success: true, data: { count: similar.length, tickets: similar } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function classifyTicket(
  ticketId: string,
  category: string,
  priority: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        agentCategory: category,
        category,
        priority,
        agentClassified: true,
      },
    })
    return { success: true, data: { ticketId, category, priority } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function draftTicketResponse(
  ticketId: string,
  body: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { agentDraftResponse: body },
    })
    return { success: true, data: { ticketId, drafted: true } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function markAsFeatureRequest(ticketId: string): Promise<OperatorToolResult> {
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) return { success: false, error: 'Ticket not found' }

    // Create a FeatureRequest from the ticket
    const featureRequest = await prisma.featureRequest.create({
      data: {
        submittedBy: ticket.userId || 'anonymous',
        title: ticket.title,
        description: ticket.description,
        status: 'OPEN',
      },
    })

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        category: 'feature_request',
        featureRequestId: featureRequest.id,
        status: 'RESOLVED',
        resolution: 'Reclassified as feature request',
        resolvedAt: new Date(),
      },
    })

    return { success: true, data: { ticketId, featureRequestId: featureRequest.id } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function escalateToFounder(
  ticketId: string,
  reason: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        priority: 'URGENT',
        metadata: { escalationReason: reason, escalatedAt: new Date().toISOString() } as never,
      },
    })

    // Also send alert email
    await alertFounder('URGENT', `Escalated ticket: ${ticketId}`, reason)

    return { success: true, data: { ticketId, escalated: true } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUserContext(userId: string): Promise<OperatorToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) return { success: false, error: 'User not found' }

    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[] = []
): Promise<OperatorToolResult> {
  // Placeholder — wire up to GitHub MCP when available
  // For now, log intent and return a fake URL so the agent flow continues
  logger.info('[operator-agents] Would create GitHub issue', { title, labels })
  return {
    success: true,
    data: {
      url: `https://github.com/stormrider66/konditionsapp/issues/pending-${Date.now()}`,
      note: 'GitHub MCP integration pending — issue not actually created',
    },
  }
}

export async function linkGitHubIssue(
  ticketId: string,
  url: string
): Promise<OperatorToolResult> {
  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { githubIssueUrl: url },
    })
    return { success: true, data: { ticketId, url } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * Route a tool call by name. Used by the agent runner's tool executor.
 */
export async function executeOperatorTool(
  name: string,
  input: Record<string, unknown>
): Promise<OperatorToolResult> {
  try {
    switch (name) {
      // Platform Health
      case 'getSentryErrors':
        return await getSentryErrors((input.minutes as number) || 15)
      case 'getCronJobFailures':
        return await getCronJobFailures((input.hours as number) || 1)
      case 'getAgentErrorRate':
        return await getAgentErrorRate()
      case 'logHealthSnapshot':
        return await logHealthSnapshot(input as Record<string, unknown>)
      case 'alertFounder':
        return await alertFounder(
          input.severity as string,
          input.title as string,
          input.message as string
        )

      // Support Agent
      case 'getOpenSupportTickets':
        return await getOpenSupportTickets()
      case 'getTicket':
        return await getTicket(input.ticketId as string)
      case 'searchSimilarTickets':
        return await searchSimilarTickets(input.query as string)
      case 'classifyTicket':
        return await classifyTicket(
          input.ticketId as string,
          input.category as string,
          input.priority as string
        )
      case 'draftTicketResponse':
        return await draftTicketResponse(
          input.ticketId as string,
          input.body as string
        )
      case 'markAsFeatureRequest':
        return await markAsFeatureRequest(input.ticketId as string)
      case 'escalateToFounder':
        return await escalateToFounder(
          input.ticketId as string,
          input.reason as string
        )
      case 'getUserContext':
        return await getUserContext(input.userId as string)
      case 'createGitHubIssue':
        return await createGitHubIssue(
          input.title as string,
          input.body as string,
          (input.labels as string[]) || []
        )
      case 'linkGitHubIssue':
        return await linkGitHubIssue(
          input.ticketId as string,
          input.url as string
        )

      default:
        return { success: false, error: `Unknown operator tool: ${name}` }
    }
  } catch (error) {
    return { success: false, error: `Tool ${name} failed: ${String(error)}` }
  }
}
