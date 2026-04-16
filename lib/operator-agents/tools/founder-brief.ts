import { prisma } from '@/lib/prisma'
import type { OperatorToolResult } from '../types'
import { sendFounderEmail } from './_shared'

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

    // FounderBrief has @unique(date) — simple upsert
    const brief = await prisma.founderBrief.upsert({
      where: { date: today },
      update: {
        fullContent: content,
        revenue: {},
        attention: {},
      },
      create: {
        date: today,
        fullContent: content,
        revenue: {},
        attention: {},
      },
    })

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
