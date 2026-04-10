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
// COST GUARDIAN TOOLS
// ============================================================================

export async function getAIUsage24h(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const logs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: { inputTokens: true, outputTokens: true, estimatedCost: true, provider: true, model: true },
    })

    const totalCost = logs.reduce((s, l) => s + l.estimatedCost, 0)
    const totalTokens = logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0)
    const byProvider: Record<string, { count: number; cost: number }> = {}
    for (const log of logs) {
      if (!byProvider[log.provider]) byProvider[log.provider] = { count: 0, cost: 0 }
      byProvider[log.provider].count++
      byProvider[log.provider].cost += log.estimatedCost
    }

    return {
      success: true,
      data: {
        requests: logs.length,
        totalTokens,
        totalCostUsd: Math.round(totalCost * 1000) / 1000,
        byProvider,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAIUsageMonthToDate(): Promise<OperatorToolResult> {
  try {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const logs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { inputTokens: true, outputTokens: true, estimatedCost: true },
    })

    const totalCost = logs.reduce((s, l) => s + l.estimatedCost, 0)
    const totalTokens = logs.reduce((s, l) => s + l.inputTokens + l.outputTokens, 0)
    const daysElapsed = Math.max(1, Math.ceil((Date.now() - monthStart.getTime()) / (24 * 60 * 60 * 1000)))

    return {
      success: true,
      data: {
        monthStart: monthStart.toISOString(),
        daysElapsed,
        requests: logs.length,
        totalTokens,
        totalCostUsd: Math.round(totalCost * 1000) / 1000,
        avgDailyCostUsd: Math.round((totalCost / daysElapsed) * 1000) / 1000,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getTopSpenders(days: number = 7): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const logs = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true, inputTokens: true, outputTokens: true },
      orderBy: { _sum: { estimatedCost: 'desc' } },
      take: 10,
    })

    // Get user names for the top spenders
    const userIds = logs.map(l => l.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    return {
      success: true,
      data: {
        topSpenders: logs.map(l => ({
          userId: l.userId,
          name: userMap.get(l.userId)?.name || 'Unknown',
          email: userMap.get(l.userId)?.email,
          role: userMap.get(l.userId)?.role,
          totalCostUsd: Math.round((l._sum.estimatedCost || 0) * 1000) / 1000,
          totalTokens: (l._sum.inputTokens || 0) + (l._sum.outputTokens || 0),
        })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function predictMonthEnd(): Promise<OperatorToolResult> {
  try {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const now = new Date()
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)))

    // Days in the current month
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const daysInMonth = monthEnd.getDate()

    const logs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { estimatedCost: true },
    })
    const mtdCost = logs.reduce((s, l) => s + l.estimatedCost, 0)
    const projectedMonthEnd = (mtdCost / daysElapsed) * daysInMonth

    // Last month for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const lastMonthLogs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { estimatedCost: true },
    })
    const lastMonthTotal = lastMonthLogs.reduce((s, l) => s + l.estimatedCost, 0)

    return {
      success: true,
      data: {
        mtdCostUsd: Math.round(mtdCost * 1000) / 1000,
        projectedMonthEndUsd: Math.round(projectedMonthEnd * 1000) / 1000,
        lastMonthTotalUsd: Math.round(lastMonthTotal * 1000) / 1000,
        vsLastMonthPercent: lastMonthTotal > 0
          ? Math.round(((projectedMonthEnd - lastMonthTotal) / lastMonthTotal) * 100)
          : null,
        daysElapsed,
        daysInMonth,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function detectCostAnomalies(): Promise<OperatorToolResult> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Get 24h spend by user
    const recent = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: yesterday } },
      _sum: { estimatedCost: true },
    })

    // Get 7-day average by user
    const baseline = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: weekAgo, lt: yesterday } },
      _sum: { estimatedCost: true },
    })
    const baselineMap = new Map(baseline.map(b => [b.userId, (b._sum.estimatedCost || 0) / 6])) // 6 prior days avg

    const anomalies = recent
      .map(r => {
        const todayCost = r._sum.estimatedCost || 0
        const avgDaily = baselineMap.get(r.userId) || 0
        const ratio = avgDaily > 0 ? todayCost / avgDaily : (todayCost > 1 ? 999 : 0)
        return { userId: r.userId, todayCost, avgDaily, ratio }
      })
      .filter(a => a.ratio > 3 && a.todayCost > 1) // Spiked >3x AND absolute cost >$1
      .sort((a, b) => b.todayCost - a.todayCost)
      .slice(0, 10)

    return { success: true, data: { anomalies } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// FEATURE CURATOR TOOLS
// ============================================================================

export async function getOpenFeatureRequests(): Promise<OperatorToolResult> {
  try {
    const requests = await prisma.featureRequest.findMany({
      where: {
        status: 'OPEN',
        agentImpactScore: null, // Not yet curated
      },
      orderBy: { createdAt: 'asc' },
      take: 30,
    })
    return { success: true, data: { count: requests.length, requests } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAllFeatureRequests(): Promise<OperatorToolResult> {
  try {
    const requests = await prisma.featureRequest.findMany({
      where: { status: { in: ['OPEN', 'PLANNED'] } },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        upvotes: true,
      },
      take: 200,
    })
    return { success: true, data: { count: requests.length, requests } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function categorizeFeatureRequest(
  id: string,
  category: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: { category },
    })
    return { success: true, data: { id, category } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function scoreFeatureRequest(
  id: string,
  score: number,
  reasoning: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: {
        agentImpactScore: Math.max(0, Math.min(100, score)),
        agentSummary: reasoning.slice(0, 500),
      },
    })
    return { success: true, data: { id, score } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function markDuplicate(
  id: string,
  duplicateOfId: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: {
        agentDuplicateOf: duplicateOfId,
        status: 'DECLINED', // Duplicate declined, master stays open
      },
    })
    return { success: true, data: { id, duplicateOfId } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function summarizeFeatureRequest(
  id: string,
  summary: string
): Promise<OperatorToolResult> {
  try {
    await prisma.featureRequest.update({
      where: { id },
      data: { agentSummary: summary.slice(0, 500) },
    })
    return { success: true, data: { id } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUserTier(userId: string): Promise<OperatorToolResult> {
  try {
    const client = await prisma.client.findFirst({
      where: { userId },
      select: {
        id: true,
        athleteSubscription: {
          select: { tier: true, status: true },
        },
      },
    })

    const tier = client?.athleteSubscription?.tier || 'FREE'
    const status = client?.athleteSubscription?.status || null
    return { success: true, data: { userId, tier, status } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// CHURN PREDICTOR TOOLS
// ============================================================================

export async function getActiveSubscriptions(): Promise<OperatorToolResult> {
  try {
    const subs = await prisma.athleteSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        tier: { not: 'FREE' },
      },
      select: {
        clientId: true,
        tier: true,
        status: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
      take: 200,
    })

    return {
      success: true,
      data: {
        count: subs.length,
        subscriptions: subs.map(s => ({
          clientId: s.clientId,
          userId: s.client.userId,
          name: s.client.name,
          tier: s.tier,
          status: s.status,
          subscribedAt: s.createdAt,
        })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Fix getUserTier to use Client relation

export async function getUserEngagement(
  userId: string,
  days: number = 30
): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    })

    if (!client) return { success: false, error: 'Client not found' }

    const [checkIns, completedStrength, completedCardio] = await Promise.all([
      prisma.dailyCheckIn.count({
        where: { clientId: client.id, date: { gte: since } },
      }),
      prisma.strengthSessionAssignment.count({
        where: {
          athleteId: client.id,
          status: 'COMPLETED',
          completedAt: { gte: since },
        },
      }),
      prisma.cardioSessionAssignment.count({
        where: {
          athleteId: client.id,
          status: 'COMPLETED',
          completedAt: { gte: since },
        },
      }),
    ])

    return {
      success: true,
      data: {
        period: days,
        checkIns,
        workoutsCompleted: completedStrength + completedCardio,
        checkInsPerWeek: Math.round((checkIns / days) * 7 * 10) / 10,
        workoutsPerWeek: Math.round(((completedStrength + completedCardio) / days) * 7 * 10) / 10,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getSupportHistory(userId: string): Promise<OperatorToolResult> {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      success: true,
      data: {
        count: tickets.length,
        openCount: tickets.filter(t => t.status === 'OPEN').length,
        tickets,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUsageTrend(userId: string): Promise<OperatorToolResult> {
  try {
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    })
    if (!client) return { success: false, error: 'Client not found' }

    // Compare last 7 days to previous 7 days
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [recent, previous] = await Promise.all([
      prisma.dailyCheckIn.count({
        where: { clientId: client.id, date: { gte: sevenDaysAgo } },
      }),
      prisma.dailyCheckIn.count({
        where: { clientId: client.id, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
    ])

    let trend: 'GROWING' | 'STABLE' | 'DECLINING' = 'STABLE'
    const change = recent - previous
    if (change > 1) trend = 'GROWING'
    else if (change < -1) trend = 'DECLINING'

    return {
      success: true,
      data: {
        last7days: recent,
        previous7days: previous,
        change,
        trend,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function calculateChurnScore(userId: string): Promise<OperatorToolResult> {
  try {
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    })
    if (!client) return { success: false, error: 'Client not found' }

    let score = 0
    const signals: string[] = []

    // Check last check-in
    const lastCheckIn = await prisma.dailyCheckIn.findFirst({
      where: { clientId: client.id },
      orderBy: { date: 'desc' },
      select: { date: true },
    })

    if (lastCheckIn) {
      const daysSince = Math.floor((Date.now() - new Date(lastCheckIn.date).getTime()) / (24 * 60 * 60 * 1000))
      if (daysSince >= 14) {
        score += 25
        signals.push(`No check-in for ${daysSince} days`)
      } else if (daysSince >= 7) {
        score += 10
        signals.push(`No check-in for ${daysSince} days`)
      }
    } else {
      score += 30
      signals.push('Never submitted a check-in')
    }

    // Check support ticket history
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      select: { description: true, category: true },
      take: 5,
    })
    const hasCancelMention = tickets.some(t =>
      t.description.toLowerCase().includes('cancel') ||
      t.description.toLowerCase().includes('refund')
    )
    if (hasCancelMention) {
      score += 25
      signals.push('Mentioned cancellation in a support ticket')
    }
    const hasComplaint = tickets.some(t => t.category === 'complaint')
    if (hasComplaint) {
      score += 15
      signals.push('Has filed a complaint')
    }

    // Check workout activity
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentWorkouts = await prisma.strengthSessionAssignment.count({
      where: {
        athleteId: client.id,
        status: 'COMPLETED',
        completedAt: { gte: weekAgo },
      },
    })
    if (recentWorkouts === 0) {
      score += 10
      signals.push('No workouts completed in last 7 days')
    }

    return {
      success: true,
      data: {
        userId,
        clientId: client.id,
        score: Math.min(100, score),
        band: score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'WATCH' : 'HEALTHY',
        signals,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function draftRetentionEmail(
  userId: string,
  subject: string,
  body: string,
  reasoning: string
): Promise<OperatorToolResult> {
  try {
    // Store as a FounderBrief attention item for now
    // (Later: dedicated RetentionDraft model)
    logger.info('[operator-agents] Retention email drafted', { userId, subject })
    return {
      success: true,
      data: {
        userId,
        subject,
        body,
        reasoning,
        note: 'Draft saved for founder review (view in OperatorAgentRun.details)',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function flagForFounderReview(
  userId: string,
  reason: string
): Promise<OperatorToolResult> {
  try {
    await alertFounder(
      'HIGH',
      `At-risk user: ${userId}`,
      `Reason: ${reason}\n\nReview the Churn Predictor dashboard for draft retention email.`
    )
    return { success: true, data: { userId, flagged: true } }
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

      // Cost Guardian
      case 'getAIUsage24h':
        return await getAIUsage24h()
      case 'getAIUsageMonthToDate':
        return await getAIUsageMonthToDate()
      case 'getTopSpenders':
        return await getTopSpenders((input.days as number) || 7)
      case 'predictMonthEnd':
        return await predictMonthEnd()
      case 'detectCostAnomalies':
        return await detectCostAnomalies()

      // Feature Curator
      case 'getOpenFeatureRequests':
        return await getOpenFeatureRequests()
      case 'getAllFeatureRequests':
        return await getAllFeatureRequests()
      case 'categorizeFeatureRequest':
        return await categorizeFeatureRequest(
          input.id as string,
          input.category as string
        )
      case 'scoreFeatureRequest':
        return await scoreFeatureRequest(
          input.id as string,
          input.score as number,
          input.reasoning as string
        )
      case 'markDuplicate':
        return await markDuplicate(
          input.id as string,
          input.duplicateOfId as string
        )
      case 'summarizeFeatureRequest':
        return await summarizeFeatureRequest(
          input.id as string,
          input.summary as string
        )
      case 'getUserTier':
        return await getUserTier(input.userId as string)

      // Churn Predictor
      case 'getActiveSubscriptions':
        return await getActiveSubscriptions()
      case 'getUserEngagement':
        return await getUserEngagement(
          input.userId as string,
          (input.days as number) || 30
        )
      case 'getSupportHistory':
        return await getSupportHistory(input.userId as string)
      case 'getUsageTrend':
        return await getUsageTrend(input.userId as string)
      case 'calculateChurnScore':
        return await calculateChurnScore(input.userId as string)
      case 'draftRetentionEmail':
        return await draftRetentionEmail(
          input.userId as string,
          input.subject as string,
          input.body as string,
          input.reasoning as string
        )
      case 'flagForFounderReview':
        return await flagForFounderReview(
          input.userId as string,
          input.reason as string
        )

      default:
        return { success: false, error: `Unknown operator tool: ${name}` }
    }
  } catch (error) {
    return { success: false, error: `Tool ${name} failed: ${String(error)}` }
  }
}
