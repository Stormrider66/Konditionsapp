/**
 * AI Usage Statistics API
 *
 * GET /api/ai/budget/usage - Get usage history and statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { rateLimitJsonResponse } from '@/lib/rate-limit-redis'
import { getUsageStats } from '@/lib/ai/deep-research/budget-manager'

// ============================================
// GET - Get Usage Statistics
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireCoach()

    // Rate limit
    const rateLimited = await rateLimitJsonResponse('ai:budget:usage', user.id, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Parse query params
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') as 'day' | 'week' | 'month' | 'all') || 'month'
    const groupBy = searchParams.get('groupBy') || 'day'

    // Get usage stats
    const stats = await getUsageStats(user.id, period)

    // Get detailed usage history
    let startDate: Date
    const now = new Date()

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
        startDate = new Date(0) // Beginning of time
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Get usage logs
    const usageLogs = await prisma.aIUsageLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        category: true,
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        researchSessionId: true,
        conversationId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 entries
    })

    // Group by date for chart data
    const dailyUsage = new Map<string, number>()

    for (const log of usageLogs) {
      const date = log.createdAt.toISOString().split('T')[0]
      dailyUsage.set(date, (dailyUsage.get(date) || 0) + log.estimatedCost)
    }

    // Convert to array sorted by date
    const history = Array.from(dailyUsage.entries())
      .map(([date, cost]) => ({ date, cost: Math.round(cost * 1000) / 1000 }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get top models by cost
    const modelCosts = await prisma.aIUsageLog.groupBy({
      by: ['model'],
      where: {
        userId: user.id,
        createdAt: { gte: startDate },
      },
      _sum: {
        estimatedCost: true,
        inputTokens: true,
        outputTokens: true,
      },
      orderBy: {
        _sum: {
          estimatedCost: 'desc',
        },
      },
      take: 10,
    })

    // Get research session stats
    const researchStats = await prisma.deepResearchSession.groupBy({
      by: ['status'],
      where: {
        coachId: user.id,
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: {
        estimatedCost: true,
        tokensUsed: true,
      },
    })

    return NextResponse.json({
      // Summary stats
      total: stats.total,
      byCategory: stats.byCategory,
      byProvider: stats.byProvider,

      // Time series for charts
      history,

      // Detailed breakdown
      topModels: modelCosts.map((m) => ({
        model: m.model,
        cost: m._sum.estimatedCost || 0,
        inputTokens: m._sum.inputTokens || 0,
        outputTokens: m._sum.outputTokens || 0,
      })),

      // Research session stats
      researchStats: researchStats.map((s) => ({
        status: s.status,
        count: s._count,
        totalCost: s._sum.estimatedCost || 0,
        totalTokens: s._sum.tokensUsed || 0,
      })),

      // Recent logs
      recentLogs: usageLogs.slice(0, 20).map((log) => ({
        id: log.id,
        category: log.category,
        provider: log.provider,
        model: log.model,
        cost: log.estimatedCost,
        tokens: log.inputTokens + log.outputTokens,
        hasResearchSession: !!log.researchSessionId,
        hasConversation: !!log.conversationId,
        createdAt: log.createdAt,
      })),

      // Metadata
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching usage statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}
