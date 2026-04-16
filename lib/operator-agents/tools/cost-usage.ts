import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'

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
