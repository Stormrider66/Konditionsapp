import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { OperatorToolResult } from '../types'
import { sendFounderEmail } from './_shared'
import { alertFounder } from './platform-health'

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
