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
// INTERNAL HELPERS
// ============================================================================

/**
 * Send an email to the founder with consistent error handling.
 * Used by all agents that deliver reports/alerts to the founder.
 *
 * Uses dynamic import because the email module depends on Resend which
 * may not be configured in all environments. If the import fails or
 * FOUNDER_EMAIL is not set, we log a warning but don't throw — the
 * caller can decide what to do based on the `sent` flag.
 */
async function sendFounderEmail(
  subject: string,
  content: string
): Promise<{ sent: boolean; to?: string; reason?: string }> {
  const founderEmail = process.env.FOUNDER_EMAIL
  if (!founderEmail) {
    logger.warn('[operator-agents] FOUNDER_EMAIL not configured — email skipped', { subject })
    return { sent: false, reason: 'FOUNDER_EMAIL not configured' }
  }

  let sendEmail: ((args: { to: string; subject: string; html: string }) => Promise<unknown>) | null = null
  try {
    const mod = await import('@/lib/email')
    sendEmail = mod.sendEmail
  } catch (error) {
    logger.error('[operator-agents] Failed to load email module', { subject }, error)
    return { sent: false, reason: 'Email module not available' }
  }

  if (!sendEmail) {
    return { sent: false, reason: 'sendEmail not exported' }
  }

  try {
    await sendEmail({
      to: founderEmail,
      subject,
      html: `<div style="font-family:sans-serif;white-space:pre-wrap;line-height:1.5">${escapeHtml(content)}</div>`,
    })
    return { sent: true, to: founderEmail }
  } catch (error) {
    logger.error('[operator-agents] Failed to send founder email', { subject }, error)
    return { sent: false, reason: String(error) }
  }
}

/**
 * Minimal HTML escape for email content.
 * Agents control the content, but we still escape to avoid injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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
  const result = await sendFounderEmail(`[${severity}] ${title}`, message)
  return {
    success: true,
    data: result,
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

/**
 * Create a GitHub issue for a confirmed bug.
 *
 * TODO: wire up real GitHub integration. Options:
 * 1. Use @octokit/rest with a GITHUB_TOKEN env var (simplest)
 * 2. Use GitHub MCP server when available in this environment
 * 3. Call the GitHub REST API directly via fetch
 *
 * Until then, this records the intent so the Support Agent's workflow
 * can continue. The draft content is preserved in the ticket so the
 * founder can create the issue manually.
 */
export async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[] = []
): Promise<OperatorToolResult> {
  logger.warn('[operator-agents] createGitHubIssue called — GitHub integration NOT wired up yet', {
    title,
    labelsCount: labels.length,
  })
  return {
    success: true,
    data: {
      url: null,
      draftedTitle: title,
      draftedBody: body,
      draftedLabels: labels,
      note: 'GitHub integration pending. Draft preserved for manual creation. See TODO in tool-executor.ts.',
      placeholder: true,
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
// COST BREAKDOWN BY ENTITY (users / businesses / platform)
// ============================================================================

/**
 * Break down AI costs by entity type (athlete, coach, platform) over a period.
 * Platform costs = AI spend from admin users OR usage with no associated client/business.
 */
export async function getCostBreakdownByEntity(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all logs in period with user role
    const logs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: {
        estimatedCost: true,
        inputTokens: true,
        outputTokens: true,
        userId: true,
        user: { select: { role: true, adminRole: true } },
      },
    })

    // Aggregate by role
    const byRole: Record<string, { count: number; cost: number; tokens: number }> = {
      ATHLETE: { count: 0, cost: 0, tokens: 0 },
      COACH: { count: 0, cost: 0, tokens: 0 },
      PHYSIO: { count: 0, cost: 0, tokens: 0 },
      ADMIN: { count: 0, cost: 0, tokens: 0 },
      UNKNOWN: { count: 0, cost: 0, tokens: 0 },
    }

    for (const log of logs) {
      const role = log.user?.adminRole ? 'ADMIN' : (log.user?.role || 'UNKNOWN')
      const bucket = byRole[role] || byRole.UNKNOWN
      bucket.count++
      bucket.cost += log.estimatedCost
      bucket.tokens += log.inputTokens + log.outputTokens
    }

    // Round costs
    for (const key of Object.keys(byRole)) {
      byRole[key].cost = Math.round(byRole[key].cost * 1000) / 1000
    }

    const totalCost = logs.reduce((s, l) => s + l.estimatedCost, 0)

    return {
      success: true,
      data: {
        days,
        totalRequests: logs.length,
        totalCostUsd: Math.round(totalCost * 1000) / 1000,
        byRole,
        platformOverheadUsd: byRole.ADMIN.cost,
        userDrivenUsd: byRole.ATHLETE.cost + byRole.COACH.cost + byRole.PHYSIO.cost,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Top-spending individual users with their role and subscription tier.
 */
export async function getTopSpendingUsers(days: number = 30, limit: number = 10): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const grouped = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true, inputTokens: true, outputTokens: true },
      orderBy: { _sum: { estimatedCost: 'desc' } },
      take: limit,
    })

    // Enrich with user + subscription data
    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map(g => g.userId) } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clients: {
          select: {
            athleteSubscription: {
              select: { tier: true, status: true },
            },
          },
          take: 1,
        },
      },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    const topSpenders = grouped.map(g => {
      const user = userMap.get(g.userId)
      const cost = g._sum.estimatedCost || 0
      return {
        userId: g.userId,
        name: user?.name || 'Unknown',
        email: user?.email,
        role: user?.role,
        tier: user?.clients[0]?.athleteSubscription?.tier || 'N/A',
        subscriptionStatus: user?.clients[0]?.athleteSubscription?.status || 'N/A',
        totalCostUsd: Math.round(cost * 1000) / 1000,
        totalTokens: (g._sum.inputTokens || 0) + (g._sum.outputTokens || 0),
      }
    })

    return {
      success: true,
      data: { days, limit, topSpenders },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Aggregate AI spend by business.
 * Joins AIUsageLog → User → Client → Business.
 */
export async function getCostBreakdownByBusiness(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all logs grouped by userId
    const grouped = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true, inputTokens: true, outputTokens: true },
    })

    // Map each user to their business (via Client.businessId)
    const userIds = grouped.map(g => g.userId)
    const clients = await prisma.client.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, businessId: true, name: true },
    })
    const userToBusiness = new Map<string, string | null>()
    for (const c of clients) {
      userToBusiness.set(c.userId, c.businessId)
    }

    // Aggregate by business
    const byBusiness: Record<string, { cost: number; tokens: number; userCount: Set<string> }> = {}
    const noBusiness = { cost: 0, tokens: 0, userCount: new Set<string>() }

    for (const g of grouped) {
      const businessId = userToBusiness.get(g.userId)
      const cost = g._sum.estimatedCost || 0
      const tokens = (g._sum.inputTokens || 0) + (g._sum.outputTokens || 0)

      if (!businessId) {
        noBusiness.cost += cost
        noBusiness.tokens += tokens
        noBusiness.userCount.add(g.userId)
      } else {
        if (!byBusiness[businessId]) {
          byBusiness[businessId] = { cost: 0, tokens: 0, userCount: new Set() }
        }
        byBusiness[businessId].cost += cost
        byBusiness[businessId].tokens += tokens
        byBusiness[businessId].userCount.add(g.userId)
      }
    }

    // Get business names
    const businessIds = Object.keys(byBusiness)
    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, name: true },
    })
    const businessNames = new Map(businesses.map(b => [b.id, b.name]))

    const breakdown = businessIds
      .map(id => ({
        businessId: id,
        businessName: businessNames.get(id) || 'Unknown',
        costUsd: Math.round(byBusiness[id].cost * 1000) / 1000,
        tokens: byBusiness[id].tokens,
        userCount: byBusiness[id].userCount.size,
        costPerUserUsd: Math.round((byBusiness[id].cost / byBusiness[id].userCount.size) * 1000) / 1000,
      }))
      .sort((a, b) => b.costUsd - a.costUsd)

    return {
      success: true,
      data: {
        days,
        businesses: breakdown,
        independent: {
          costUsd: Math.round(noBusiness.cost * 1000) / 1000,
          userCount: noBusiness.userCount.size,
          tokens: noBusiness.tokens,
        },
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// LIMIT TRACKING
// ============================================================================

/**
 * Find users who are at or approaching their AI chat message limit.
 * Reports both athletes (via AthleteSubscription) and tier limits.
 */
export async function getUsersNearLimits(thresholdPercent: number = 80): Promise<OperatorToolResult> {
  try {
    const subs = await prisma.athleteSubscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        aiChatMessagesLimit: { gt: 0 }, // Ignore unlimited (-1) and disabled (0)
      },
      select: {
        clientId: true,
        tier: true,
        aiChatMessagesUsed: true,
        aiChatMessagesLimit: true,
        client: { select: { name: true, userId: true } },
      },
    })

    const nearLimit = subs
      .map(s => {
        const percent = s.aiChatMessagesLimit > 0
          ? (s.aiChatMessagesUsed / s.aiChatMessagesLimit) * 100
          : 0
        return {
          clientId: s.clientId,
          userId: s.client.userId,
          name: s.client.name,
          tier: s.tier,
          used: s.aiChatMessagesUsed,
          limit: s.aiChatMessagesLimit,
          percentUsed: Math.round(percent * 10) / 10,
          status: percent >= 100 ? 'EXCEEDED' : percent >= 95 ? 'CRITICAL' : percent >= 80 ? 'WARNING' : 'OK',
        }
      })
      .filter(u => u.percentUsed >= thresholdPercent)
      .sort((a, b) => b.percentUsed - a.percentUsed)

    const exceeded = nearLimit.filter(u => u.status === 'EXCEEDED').length
    const critical = nearLimit.filter(u => u.status === 'CRITICAL').length
    const warning = nearLimit.filter(u => u.status === 'WARNING').length

    return {
      success: true,
      data: {
        thresholdPercent,
        totalAtRisk: nearLimit.length,
        exceeded,
        critical,
        warning,
        users: nearLimit.slice(0, 20),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// REVENUE vs COST MARGIN ANALYSIS
// ============================================================================

/**
 * Get the monthly revenue per tier from PricingTier config.
 */
async function getTierRevenueMap(): Promise<Map<string, number>> {
  const tiers = await prisma.pricingTier.findMany({
    where: { tierType: 'ATHLETE', isActive: true },
    select: { tierName: true, monthlyPriceCents: true },
  })

  const map = new Map<string, number>()
  for (const t of tiers) {
    // Convert öre (cents) to SEK, then roughly to USD (10 SEK ≈ $1 — approximate)
    const monthlyUsd = (t.monthlyPriceCents / 100) / 10
    map.set(t.tierName, monthlyUsd)
  }
  return map
}

/**
 * Calculate gross margin (revenue - cost) per user and by tier.
 * Flags users where AI cost exceeds or approaches their subscription revenue.
 */
export async function getRevenueVsCost(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get all AI cost grouped by userId
    const grouped = await prisma.aIUsageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { estimatedCost: true },
    })

    // Get tier revenues
    const tierRevenue = await getTierRevenueMap()
    // Period adjustment (cost is over `days`, revenue is monthly)
    const periodFraction = days / 30

    // Enrich with subscription info
    const userIds = grouped.map(g => g.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        role: true,
        clients: {
          select: {
            athleteSubscription: {
              select: { tier: true, status: true },
            },
          },
          take: 1,
        },
      },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // Calculate margin per user
    type MarginEntry = {
      userId: string
      name: string
      role: string | undefined
      tier: string
      costUsd: number
      revenueUsd: number
      marginUsd: number
      marginPercent: number | null
      status: 'PROFITABLE' | 'THIN_MARGIN' | 'LOSS' | 'FREE_LOSS'
    }

    const entries: MarginEntry[] = []
    let totalCost = 0
    let totalRevenue = 0

    for (const g of grouped) {
      const user = userMap.get(g.userId)
      const tier = user?.clients[0]?.athleteSubscription?.tier || 'FREE'
      const status = user?.clients[0]?.athleteSubscription?.status
      const cost = g._sum.estimatedCost || 0
      const monthlyRevenue = tierRevenue.get(tier) || 0
      const periodRevenue = monthlyRevenue * periodFraction

      // Only count revenue for ACTIVE (not TRIAL — they're not paying yet)
      const effectiveRevenue = status === 'ACTIVE' ? periodRevenue : 0

      const margin = effectiveRevenue - cost
      const marginPct = effectiveRevenue > 0 ? (margin / effectiveRevenue) * 100 : null

      let marginStatus: MarginEntry['status']
      if (tier === 'FREE' && cost > 0.01) marginStatus = 'FREE_LOSS'
      else if (margin < 0) marginStatus = 'LOSS'
      else if (marginPct !== null && marginPct < 30) marginStatus = 'THIN_MARGIN'
      else marginStatus = 'PROFITABLE'

      entries.push({
        userId: g.userId,
        name: user?.name || 'Unknown',
        role: user?.role,
        tier,
        costUsd: Math.round(cost * 1000) / 1000,
        revenueUsd: Math.round(effectiveRevenue * 100) / 100,
        marginUsd: Math.round(margin * 100) / 100,
        marginPercent: marginPct !== null ? Math.round(marginPct * 10) / 10 : null,
        status: marginStatus,
      })

      totalCost += cost
      totalRevenue += effectiveRevenue
    }

    // Sort by worst margin first (biggest problems)
    entries.sort((a, b) => a.marginUsd - b.marginUsd)

    // Summary by tier
    const byTier: Record<string, { count: number; cost: number; revenue: number; margin: number }> = {}
    for (const e of entries) {
      if (!byTier[e.tier]) byTier[e.tier] = { count: 0, cost: 0, revenue: 0, margin: 0 }
      byTier[e.tier].count++
      byTier[e.tier].cost += e.costUsd
      byTier[e.tier].revenue += e.revenueUsd
      byTier[e.tier].margin += e.marginUsd
    }
    for (const k of Object.keys(byTier)) {
      byTier[k].cost = Math.round(byTier[k].cost * 100) / 100
      byTier[k].revenue = Math.round(byTier[k].revenue * 100) / 100
      byTier[k].margin = Math.round(byTier[k].margin * 100) / 100
    }

    // Counts
    const losses = entries.filter(e => e.status === 'LOSS').length
    const freeLosses = entries.filter(e => e.status === 'FREE_LOSS').length
    const thinMargin = entries.filter(e => e.status === 'THIN_MARGIN').length

    return {
      success: true,
      data: {
        days,
        totalUsersAnalyzed: entries.length,
        totalCostUsd: Math.round(totalCost * 100) / 100,
        totalRevenueUsd: Math.round(totalRevenue * 100) / 100,
        totalMarginUsd: Math.round((totalRevenue - totalCost) * 100) / 100,
        platformMarginPercent: totalRevenue > 0
          ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10
          : null,
        counts: { losses, freeLosses, thinMargin, profitable: entries.length - losses - freeLosses - thinMargin },
        byTier,
        worstOffenders: entries.slice(0, 10),
        note: 'Revenue uses approximate USD conversion from PricingTier (SEK / 10). Update conversion if FX rates change significantly.',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Find users whose AI costs exceed or approach their subscription revenue (margin at-risk).
 */
export async function getMarginAtRiskUsers(days: number = 30): Promise<OperatorToolResult> {
  try {
    const result = await getRevenueVsCost(days)
    if (!result.success || !result.data) return result

    const data = result.data as { worstOffenders: unknown[]; counts: Record<string, number> }
    const atRisk = (data.worstOffenders as Array<{ status: string }>).filter(
      u => u.status === 'LOSS' || u.status === 'FREE_LOSS'
    )

    return {
      success: true,
      data: {
        days,
        atRiskCount: atRisk.length,
        atRiskUsers: atRisk,
        summary: data.counts,
      },
    }
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
// FOUNDER'S BRIEF TOOLS
// ============================================================================

export async function getRevenueYesterday(): Promise<OperatorToolResult> {
  try {
    const now = new Date()
    const startOfYesterday = new Date(now)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    startOfYesterday.setHours(0, 0, 0, 0)
    const endOfYesterday = new Date(startOfYesterday)
    endOfYesterday.setHours(23, 59, 59, 999)

    const [newSubs, totalActiveSubs] = await Promise.all([
      prisma.athleteSubscription.findMany({
        where: {
          createdAt: { gte: startOfYesterday, lte: endOfYesterday },
          tier: { not: 'FREE' },
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
        select: { tier: true, billingCycle: true },
      }),
      prisma.athleteSubscription.count({
        where: {
          tier: { not: 'FREE' },
          status: 'ACTIVE',
        },
      }),
    ])

    // Rough MRR from tier counts (actual amounts depend on pricing config)
    const byTier = newSubs.reduce((acc, s) => {
      acc[s.tier] = (acc[s.tier] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      data: {
        newSubscribers: newSubs.length,
        byTier,
        totalActiveSubscribers: totalActiveSubs,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getSignupsYesterday(): Promise<OperatorToolResult> {
  try {
    const startOfYesterday = new Date()
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    startOfYesterday.setHours(0, 0, 0, 0)
    const endOfYesterday = new Date(startOfYesterday)
    endOfYesterday.setHours(23, 59, 59, 999)

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: startOfYesterday, lte: endOfYesterday } },
      select: { id: true, role: true, createdAt: true },
    })

    const byRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      data: { total: users.length, byRole },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUrgentSupportTickets(): Promise<OperatorToolResult> {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        status: 'OPEN',
        priority: { in: ['URGENT', 'HIGH'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        priority: true,
        category: true,
        createdAt: true,
      },
    })

    return { success: true, data: { count: tickets.length, tickets } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getCriticalErrors(hours: number = 24): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    const failures = await prisma.operatorAgentRun.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: since },
      },
    })

    // Also count escalations (CRITICAL alerts from Platform Health Agent)
    const escalations = await prisma.operatorAgentRun.aggregate({
      where: {
        agentType: 'PLATFORM_HEALTH',
        createdAt: { gte: since },
      },
      _sum: { escalations: true },
    })

    return {
      success: true,
      data: {
        hours,
        operatorFailures: failures,
        platformHealthAlerts: escalations._sum.escalations || 0,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAtRiskUsers(limit: number = 3): Promise<OperatorToolResult> {
  try {
    // Read from most recent Churn Predictor run
    const latestRun = await prisma.operatorAgentRun.findFirst({
      where: {
        agentType: 'CHURN_PREDICTOR',
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!latestRun) {
      return { success: true, data: { atRiskUsers: [], note: 'No Churn Predictor run yet' } }
    }

    // Extract flagged users from the run details
    const details = (latestRun.details as Record<string, unknown>) || {}
    return {
      success: true,
      data: {
        lastRunAt: latestRun.createdAt,
        escalations: latestRun.escalations,
        summary: latestRun.summary,
        details,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getTopFeatureRequest(): Promise<OperatorToolResult> {
  try {
    const top = await prisma.featureRequest.findFirst({
      where: {
        status: 'OPEN',
        agentImpactScore: { gte: 60 },
      },
      orderBy: { agentImpactScore: 'desc' },
      select: {
        id: true,
        title: true,
        upvotes: true,
        agentImpactScore: true,
        category: true,
      },
    })

    return { success: true, data: { request: top } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getCostToday(): Promise<OperatorToolResult> {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const logs = await prisma.aIUsageLog.findMany({
      where: { createdAt: { gte: startOfDay } },
      select: { estimatedCost: true },
    })

    const total = logs.reduce((s, l) => s + l.estimatedCost, 0)
    return {
      success: true,
      data: {
        requests: logs.length,
        totalCostUsd: Math.round(total * 1000) / 1000,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getKeyMetrics(): Promise<OperatorToolResult> {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [activeUsers, totalUsers, checkIns, workouts] = await Promise.all([
      prisma.user.count({
        where: {
          clients: {
            some: {
              dailyCheckIns: {
                some: { date: { gte: weekAgo } },
              },
            },
          },
        },
      }).catch(() => 0),
      prisma.user.count(),
      prisma.dailyCheckIn.count({ where: { date: { gte: weekAgo } } }),
      prisma.strengthSessionAssignment.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: weekAgo },
        },
      }),
    ])

    return {
      success: true,
      data: {
        totalUsers,
        activeUsersLast7d: activeUsers,
        checkInsLast7d: checkIns,
        workoutsCompletedLast7d: workouts,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function saveBriefAndEmail(content: string): Promise<OperatorToolResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Upsert on composite unique (date, briefType)
    const brief = await prisma.founderBrief.upsert({
      where: { date_briefType: { date: today, briefType: 'DAILY' } },
      update: {
        fullContent: content,
        revenue: {},
        attention: {},
      },
      create: {
        date: today,
        briefType: 'DAILY',
        fullContent: content,
        revenue: {},
        attention: {},
      },
    })

    // Email it to the founder
    const emailResult = await sendFounderEmail(
      `Daily Brief — ${today.toISOString().slice(0, 10)}`,
      content
    )
    if (emailResult.sent) {
      await prisma.founderBrief.update({
        where: { id: brief.id },
        data: { emailedTo: emailResult.to, emailedAt: new Date() },
      })
    }

    return { success: true, data: { briefId: brief.id, emailed: emailResult.sent } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// ONBOARDING ACTIVATION TOOLS
// ============================================================================

export async function getNewUsersLast7d(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: { count: users.length, users } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getUserActivationProgress(userId: string): Promise<OperatorToolResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        clients: {
          select: {
            id: true,
            name: true,
            dailyCheckIns: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { date: true },
            },
          },
        },
      },
    })

    if (!user) return { success: false, error: 'User not found' }

    const client = user.clients[0]
    const hasProfile = !!client && client.name.trim().length > 0
    const hasCheckIn = !!client && client.dailyCheckIns.length > 0

    let hasWorkout = false
    if (client) {
      const workoutCount = await prisma.strengthSessionAssignment.count({
        where: { athleteId: client.id },
      })
      hasWorkout = workoutCount > 0
    }

    const daysSinceSignup = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    )

    return {
      success: true,
      data: {
        userId,
        daysSinceSignup,
        hasProfile,
        hasCheckIn,
        hasWorkout,
        activated: hasProfile && hasCheckIn && hasWorkout,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findStuckUsers(): Promise<OperatorToolResult> {
  try {
    // Users who signed up >2 days ago but haven't checked in
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo, lt: twoDaysAgo },
        clients: {
          some: {
            dailyCheckIns: { none: {} },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      take: 20,
    })

    return {
      success: true,
      data: {
        count: users.length,
        users: users.map(u => ({
          ...u,
          stuckStep: 'first_checkin',
          daysSinceSignup: Math.floor(
            (Date.now() - new Date(u.createdAt).getTime()) / (24 * 60 * 60 * 1000)
          ),
        })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function draftOnboardingNudge(
  userId: string,
  step: string,
  subject: string,
  body: string
): Promise<OperatorToolResult> {
  try {
    logger.info('[operator-agents] Onboarding nudge drafted', { userId, step })
    return {
      success: true,
      data: {
        userId,
        step,
        subject,
        body,
        note: 'Draft saved for founder review',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// BUSINESS INTELLIGENCE TOOLS
// ============================================================================

export async function getMRRSnapshot(): Promise<OperatorToolResult> {
  try {
    const active = await prisma.athleteSubscription.findMany({
      where: {
        status: 'ACTIVE',
        tier: { not: 'FREE' },
      },
      select: { tier: true, billingCycle: true },
    })

    const byTier = active.reduce((acc, s) => {
      acc[s.tier] = (acc[s.tier] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      data: {
        totalActiveSubscribers: active.length,
        byTier,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getChurnRate(days: number = 30): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const [canceled, totalActive] = await Promise.all([
      prisma.athleteSubscription.count({
        where: {
          status: 'CANCELLED',
          updatedAt: { gte: since },
        },
      }),
      prisma.athleteSubscription.count({
        where: { status: 'ACTIVE', tier: { not: 'FREE' } },
      }),
    ])

    const rate = totalActive > 0 ? canceled / (totalActive + canceled) : 0

    return {
      success: true,
      data: {
        days,
        canceled,
        totalActive,
        churnRate: Math.round(rate * 10000) / 100, // as percentage with 2 decimals
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getNewSubscribersLast7d(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const subs = await prisma.athleteSubscription.findMany({
      where: {
        createdAt: { gte: since },
        tier: { not: 'FREE' },
      },
      select: { tier: true, status: true },
    })

    const byTier = subs.reduce((acc, s) => {
      acc[s.tier] = (acc[s.tier] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { success: true, data: { total: subs.length, byTier } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function saveBIReport(content: string): Promise<OperatorToolResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const report = await prisma.founderBrief.upsert({
      where: { date_briefType: { date: today, briefType: 'BI_WEEKLY' } },
      update: { fullContent: content },
      create: {
        date: today,
        briefType: 'BI_WEEKLY',
        fullContent: content,
        revenue: {},
        attention: {},
      },
    })

    const emailResult = await sendFounderEmail(
      `Weekly BI Report — ${today.toISOString().slice(0, 10)}`,
      content
    )
    if (emailResult.sent) {
      await prisma.founderBrief.update({
        where: { id: report.id },
        data: { emailedTo: emailResult.to, emailedAt: new Date() },
      })
    }

    return { success: true, data: { reportId: report.id, emailed: emailResult.sent } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// MARKETING CONTENT TOOLS
// ============================================================================

export async function findMilestoneEvents(days: number = 7): Promise<OperatorToolResult> {
  try {
    const now = new Date()
    const [totalUsers, totalWorkouts, totalClients] = await Promise.all([
      prisma.user.count(),
      prisma.strengthSessionAssignment.count({ where: { status: 'COMPLETED' } }),
      prisma.client.count(),
    ])

    // Detect round-number milestones
    const roundNumbers = [100, 500, 1000, 5000, 10000, 50000, 100000]
    const milestones: { type: string; value: number; metric: string }[] = []

    for (const target of roundNumbers) {
      if (totalUsers === target) milestones.push({ type: 'USER_MILESTONE', value: target, metric: 'users' })
      if (totalWorkouts === target) milestones.push({ type: 'WORKOUT_MILESTONE', value: target, metric: 'workouts' })
      if (totalClients === target) milestones.push({ type: 'CLIENT_MILESTONE', value: target, metric: 'athletes' })
    }

    return {
      success: true,
      data: {
        totalUsers,
        totalWorkouts,
        totalClients,
        milestonesThisWeek: milestones,
        nearestNextMilestone: {
          users: roundNumbers.find(n => n > totalUsers),
          workouts: roundNumbers.find(n => n > totalWorkouts),
          clients: roundNumbers.find(n => n > totalClients),
        },
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getPlatformMetrics(): Promise<OperatorToolResult> {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [totalUsers, totalClients, workoutsThisWeek, coaches] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.strengthSessionAssignment.count({
        where: { status: 'COMPLETED', completedAt: { gte: weekAgo } },
      }),
      prisma.user.count({ where: { role: 'COACH' } }),
    ])

    return {
      success: true,
      data: { totalUsers, totalClients, workoutsThisWeek, coaches },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function draftSocialPost(
  platform: string,
  topic: string,
  body: string,
  imagePrompt?: string
): Promise<OperatorToolResult> {
  logger.info('[operator-agents] Social post drafted', { platform, topic })
  return {
    success: true,
    data: { platform, topic, body, imagePrompt, note: 'Draft saved for founder review' },
  }
}

export async function draftBlogPost(
  title: string,
  outline: string,
  body: string
): Promise<OperatorToolResult> {
  logger.info('[operator-agents] Blog post drafted', { title })
  return {
    success: true,
    data: { title, outline, body, note: 'Draft saved for founder review' },
  }
}

export async function draftNewsletter(
  week: string,
  highlights: string[],
  body: string
): Promise<OperatorToolResult> {
  logger.info('[operator-agents] Newsletter drafted', { week, highlightCount: highlights.length })
  return {
    success: true,
    data: { week, highlights, body, note: 'Draft saved for founder review' },
  }
}

export async function saveContentQueue(content: Record<string, unknown>): Promise<OperatorToolResult> {
  logger.info('[operator-agents] Content added to queue', { items: Object.keys(content).length })
  return { success: true, data: { queued: true, items: Object.keys(content).length } }
}

// ============================================================================
// DATA QUALITY TOOLS
// ============================================================================

export async function findOrphanedRecords(): Promise<OperatorToolResult> {
  try {
    // Check for common orphan patterns
    const [strengthAssignments, cardioAssignments, checkIns] = await Promise.all([
      // Strength assignments pointing to non-existent clients
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "StrengthSessionAssignment" s
        LEFT JOIN "Client" c ON c.id = s."athleteId"
        WHERE c.id IS NULL
      `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "CardioSessionAssignment" s
        LEFT JOIN "Client" c ON c.id = s."athleteId"
        WHERE c.id IS NULL
      `.catch(() => [{ count: BigInt(0) }]),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint as count
        FROM "DailyCheckIn" d
        LEFT JOIN "Client" c ON c.id = d."clientId"
        WHERE c.id IS NULL
      `.catch(() => [{ count: BigInt(0) }]),
    ])

    const total = Number(strengthAssignments[0]?.count || 0) +
                  Number(cardioAssignments[0]?.count || 0) +
                  Number(checkIns[0]?.count || 0)

    return {
      success: true,
      data: {
        totalOrphaned: total,
        byTable: {
          strengthSessionAssignment: Number(strengthAssignments[0]?.count || 0),
          cardioSessionAssignment: Number(cardioAssignments[0]?.count || 0),
          dailyCheckIn: Number(checkIns[0]?.count || 0),
        },
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findDuplicateUsers(): Promise<OperatorToolResult> {
  try {
    const dupes = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
      SELECT email, COUNT(*)::bigint as count
      FROM "User"
      WHERE email IS NOT NULL
      GROUP BY email
      HAVING COUNT(*) > 1
      LIMIT 20
    `.catch(() => [])

    return {
      success: true,
      data: {
        duplicateCount: dupes.length,
        duplicates: dupes.map(d => ({ email: d.email, count: Number(d.count) })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findInvalidDates(): Promise<OperatorToolResult> {
  try {
    const now = new Date()
    const futureBirth = await prisma.client.count({
      where: { birthDate: { gt: now } },
    })
    const tooOld = await prisma.client.count({
      where: { birthDate: { lt: new Date('1900-01-01') } },
    })

    return {
      success: true,
      data: {
        futureBirthDates: futureBirth,
        impossiblyOldBirthDates: tooOld,
        totalIssues: futureBirth + tooOld,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findIncompleteProfiles(): Promise<OperatorToolResult> {
  try {
    const incomplete = await prisma.client.count({
      where: {
        OR: [
          { name: '' },
          { gender: undefined as never },
        ],
      },
    })

    const totalClients = await prisma.client.count()
    const percentIncomplete = totalClients > 0 ? (incomplete / totalClients) * 100 : 0

    return {
      success: true,
      data: {
        incompleteProfiles: incomplete,
        totalClients,
        percentIncomplete: Math.round(percentIncomplete * 10) / 10,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function findStaleData(): Promise<OperatorToolResult> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const [staleClients, totalClients] = await Promise.all([
      prisma.client.count({ where: { updatedAt: { lt: ninetyDaysAgo } } }),
      prisma.client.count(),
    ])

    return {
      success: true,
      data: {
        staleClients,
        totalClients,
        percentStale: totalClients > 0 ? Math.round((staleClients / totalClients) * 1000) / 10 : 0,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function calculateDataHealthScore(): Promise<OperatorToolResult> {
  try {
    // Start at 100 and deduct for each issue
    let score = 100
    const issues: string[] = []

    const orphans = await findOrphanedRecords()
    if (orphans.success && orphans.data) {
      const total = (orphans.data as { totalOrphaned: number }).totalOrphaned
      if (total > 10) { score -= 20; issues.push(`${total} orphaned records`) }
      else if (total > 0) { score -= 5; issues.push(`${total} orphaned records`) }
    }

    const dupes = await findDuplicateUsers()
    if (dupes.success && dupes.data) {
      const count = (dupes.data as { duplicateCount: number }).duplicateCount
      if (count > 0) { score -= 25; issues.push(`${count} duplicate user emails`) }
    }

    const invalidDates = await findInvalidDates()
    if (invalidDates.success && invalidDates.data) {
      const total = (invalidDates.data as { totalIssues: number }).totalIssues
      if (total > 5) { score -= 10; issues.push(`${total} invalid dates`) }
      else if (total > 0) { score -= 3; issues.push(`${total} invalid dates`) }
    }

    const stale = await findStaleData()
    if (stale.success && stale.data) {
      const pct = (stale.data as { percentStale: number }).percentStale
      if (pct > 30) { score -= 10; issues.push(`${pct}% of clients are stale`) }
    }

    return {
      success: true,
      data: {
        score: Math.max(0, score),
        grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
        issues,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// COMPLIANCE & SECURITY TOOLS
// ============================================================================

export async function getConsentWithdrawals(days: number = 1): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const withdrawals = await prisma.agentConsent.count({
      where: {
        consentWithdrawnAt: { gte: since },
      },
    })

    return { success: true, data: { days, withdrawals } }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getPendingGDPRRequests(): Promise<OperatorToolResult> {
  try {
    // Check audit log for GDPR-related entries that haven't been resolved
    // This is a placeholder — in practice, GDPR requests would have their own model
    const recentAuditEntries = await prisma.agentAuditLog.count({
      where: {
        action: { in: ['DATA_EXPORTED', 'DATA_DELETED'] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    })

    return {
      success: true,
      data: {
        recentGDPRActivity30d: recentAuditEntries,
        note: 'No dedicated GDPRRequest model — showing audit log activity as proxy',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAuditLogAnomalies(hours: number = 24): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    const recent = await prisma.auditLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        action: true,
        userId: true,
        createdAt: true,
        ipAddress: true,
      },
    })

    // Flag potential anomalies
    const byAction = recent.reduce((acc, a) => {
      acc[a.action] = (acc[a.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const anomalies: string[] = []
    if ((byAction['DATA_DELETE'] || 0) > 10) {
      anomalies.push(`${byAction['DATA_DELETE']} DATA_DELETE actions in ${hours}h`)
    }
    if ((byAction['USER_ROLE_CHANGE'] || 0) > 5) {
      anomalies.push(`${byAction['USER_ROLE_CHANGE']} role changes in ${hours}h`)
    }

    return {
      success: true,
      data: {
        hours,
        totalActions: recent.length,
        byAction,
        anomalies,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Detect failed login attempts (brute force signals).
 *
 * TODO: wire up real auth event monitoring. Options:
 * 1. NextAuth signIn error callback → log to a new AuthEvent table
 * 2. Query Sentry for auth-related errors (already integrated)
 * 3. Track failed login attempts in Redis with IP-based counters
 *
 * Until implemented, returns 0 — meaning this check is effectively
 * disabled. The Compliance Agent should NOT alert based on this metric
 * until the integration is complete.
 */
export async function getFailedLogins(hours: number = 24): Promise<OperatorToolResult> {
  logger.warn('[operator-agents] getFailedLogins called — auth monitoring NOT wired up yet', { hours })
  return {
    success: true,
    data: {
      hours,
      failedLogins: 0,
      note: 'Failed login monitoring not wired up. See TODO in tool-executor.ts.',
      placeholder: true,
    },
  }
}

/**
 * Detect suspicious access patterns (device/IP anomalies).
 *
 * TODO: requires session IP tracking. Options:
 * 1. Add an ipAddress field to Session model and track on every request
 * 2. Use Vercel's geolocation headers for country-level anomaly detection
 * 3. Integrate with a fraud detection service (Castle, Arkose, etc.)
 */
export async function getSuspiciousPatterns(): Promise<OperatorToolResult> {
  logger.warn('[operator-agents] getSuspiciousPatterns called — session tracking NOT wired up yet')
  return {
    success: true,
    data: {
      suspiciousPatterns: 0,
      note: 'Session IP tracking not wired up. See TODO in tool-executor.ts.',
      placeholder: true,
    },
  }
}

export async function getAgentActionAnomalies(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Check for agent actions without consent (violations)
    const agentActions = await prisma.agentAction.count({
      where: { createdAt: { gte: since } },
    })

    // Check for burst writes (suspicious pattern)
    const byClient = await prisma.agentAction.groupBy({
      by: ['clientId'],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { clientId: 'desc' } },
      take: 5,
    })

    const burstyClients = byClient.filter(c => c._count > 50)

    return {
      success: true,
      data: {
        totalAgentActions24h: agentActions,
        burstyClients: burstyClients.length,
        topClients: byClient.map(c => ({ clientId: c.clientId, count: c._count })),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================================================
// COMPETITOR INTEL TOOLS
// ============================================================================

const KNOWN_COMPETITORS = [
  'TrainingPeaks',
  'Final Surge',
  'TriDot',
  'Strava',
  "Today's Plan",
  'Humango',
  'Vert.run',
  'Runna',
  'MyFitnessPal',
  'Whoop',
  'Oura',
  'Garmin Connect',
]

export async function getKnownCompetitors(): Promise<OperatorToolResult> {
  return {
    success: true,
    data: {
      competitors: KNOWN_COMPETITORS,
      count: KNOWN_COMPETITORS.length,
    },
  }
}

/**
 * Web search for competitor intelligence research.
 *
 * TODO: wire up a real search API. Recommended options:
 * 1. Tavily (tavily-python / REST) — optimized for LLM agents
 * 2. Brave Search API — no tracking, simple REST
 * 3. Google Custom Search JSON API (requires API key + CSE ID)
 *
 * Set TAVILY_API_KEY (or BRAVE_API_KEY / GOOGLE_SEARCH_API_KEY) and
 * implement the fetch call here. Until then, the Competitor Intel agent
 * runs but returns empty research results.
 */
export async function webSearch(query: string): Promise<OperatorToolResult> {
  logger.warn('[operator-agents] webSearch called — search API NOT wired up yet', { query })
  return {
    success: true,
    data: {
      query,
      results: [],
      note: 'Web search integration pending. See TODO in tool-executor.ts for setup.',
      placeholder: true,
    },
  }
}

export async function fetchUrl(url: string): Promise<OperatorToolResult> {
  try {
    // Basic URL fetching with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KonditionsAppBot/1.0)' },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    const text = await response.text()
    // Truncate to avoid context bloat
    const truncated = text.slice(0, 5000)

    return {
      success: true,
      data: {
        url,
        status: response.status,
        content: truncated,
        truncated: text.length > 5000,
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function saveCompetitorDigest(content: string): Promise<OperatorToolResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const brief = await prisma.founderBrief.upsert({
      where: { date_briefType: { date: today, briefType: 'COMPETITOR' } },
      update: { fullContent: content },
      create: {
        date: today,
        briefType: 'COMPETITOR',
        fullContent: content,
        revenue: {},
        attention: {},
      },
    })

    const emailResult = await sendFounderEmail(
      `Competitor Intelligence — Week of ${today.toISOString().slice(0, 10)}`,
      content
    )
    if (emailResult.sent) {
      await prisma.founderBrief.update({
        where: { id: brief.id },
        data: { emailedTo: emailResult.to, emailedAt: new Date() },
      })
    }

    return { success: true, data: { digestId: brief.id, emailed: emailResult.sent } }
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
      case 'getCostBreakdownByEntity':
        return await getCostBreakdownByEntity((input.days as number) || 30)
      case 'getTopSpendingUsers':
        return await getTopSpendingUsers(
          (input.days as number) || 30,
          (input.limit as number) || 10
        )
      case 'getCostBreakdownByBusiness':
        return await getCostBreakdownByBusiness((input.days as number) || 30)
      case 'getUsersNearLimits':
        return await getUsersNearLimits((input.thresholdPercent as number) || 80)
      case 'getRevenueVsCost':
        return await getRevenueVsCost((input.days as number) || 30)
      case 'getMarginAtRiskUsers':
        return await getMarginAtRiskUsers((input.days as number) || 30)

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

      // Founder's Brief
      case 'getRevenueYesterday':
        return await getRevenueYesterday()
      case 'getSignupsYesterday':
        return await getSignupsYesterday()
      case 'getUrgentSupportTickets':
        return await getUrgentSupportTickets()
      case 'getCriticalErrors':
        return await getCriticalErrors((input.hours as number) || 24)
      case 'getAtRiskUsers':
        return await getAtRiskUsers((input.limit as number) || 3)
      case 'getTopFeatureRequest':
        return await getTopFeatureRequest()
      case 'getCostToday':
        return await getCostToday()
      case 'getKeyMetrics':
        return await getKeyMetrics()
      case 'saveBriefAndEmail':
        return await saveBriefAndEmail(input.content as string)

      // Onboarding Activation
      case 'getNewUsersLast7d':
        return await getNewUsersLast7d()
      case 'getUserActivationProgress':
        return await getUserActivationProgress(input.userId as string)
      case 'findStuckUsers':
        return await findStuckUsers()
      case 'draftOnboardingNudge':
        return await draftOnboardingNudge(
          input.userId as string,
          input.step as string,
          input.subject as string,
          input.body as string
        )

      // Business Intelligence
      case 'getMRRSnapshot':
        return await getMRRSnapshot()
      case 'getChurnRate':
        return await getChurnRate((input.days as number) || 30)
      case 'getNewSubscribersLast7d':
        return await getNewSubscribersLast7d()
      case 'saveBIReport':
        return await saveBIReport(input.content as string)

      // Marketing Content
      case 'findMilestoneEvents':
        return await findMilestoneEvents((input.days as number) || 7)
      case 'getPlatformMetrics':
        return await getPlatformMetrics()
      case 'draftSocialPost':
        return await draftSocialPost(
          input.platform as string,
          input.topic as string,
          input.body as string,
          input.imagePrompt as string | undefined
        )
      case 'draftBlogPost':
        return await draftBlogPost(
          input.title as string,
          input.outline as string,
          input.body as string
        )
      case 'draftNewsletter':
        return await draftNewsletter(
          input.week as string,
          (input.highlights as string[]) || [],
          input.body as string
        )
      case 'saveContentQueue':
        return await saveContentQueue(input as Record<string, unknown>)

      // Data Quality
      case 'findOrphanedRecords':
        return await findOrphanedRecords()
      case 'findDuplicateUsers':
        return await findDuplicateUsers()
      case 'findInvalidDates':
        return await findInvalidDates()
      case 'findIncompleteProfiles':
        return await findIncompleteProfiles()
      case 'findStaleData':
        return await findStaleData()
      case 'calculateDataHealthScore':
        return await calculateDataHealthScore()

      // Compliance & Security
      case 'getConsentWithdrawals':
        return await getConsentWithdrawals((input.days as number) || 1)
      case 'getPendingGDPRRequests':
        return await getPendingGDPRRequests()
      case 'getAuditLogAnomalies':
        return await getAuditLogAnomalies((input.hours as number) || 24)
      case 'getFailedLogins':
        return await getFailedLogins((input.hours as number) || 24)
      case 'getSuspiciousPatterns':
        return await getSuspiciousPatterns()
      case 'getAgentActionAnomalies':
        return await getAgentActionAnomalies()

      // Competitor Intel
      case 'getKnownCompetitors':
        return await getKnownCompetitors()
      case 'webSearch':
        return await webSearch(input.query as string)
      case 'fetchUrl':
        return await fetchUrl(input.url as string)
      case 'saveCompetitorDigest':
        return await saveCompetitorDigest(input.content as string)

      default:
        return { success: false, error: `Unknown operator tool: ${name}` }
    }
  } catch (error) {
    return { success: false, error: `Tool ${name} failed: ${String(error)}` }
  }
}
