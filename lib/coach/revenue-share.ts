// lib/coach/revenue-share.ts
// Revenue share calculation and recording for coach marketplace

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface RevenueShareInput {
  athleteClientId: string
  subscriptionId: string
  totalAmount: number // Total payment in öre (cents)
  periodStart: Date
  periodEnd: Date
}

/**
 * Calculate and record coach revenue share for a subscription payment
 *
 * Called from payment webhook when an athlete subscription renewal is processed.
 * Only creates earnings record if:
 * 1. Athlete has an assigned coach
 * 2. Revenue share start date has been reached
 */
export async function calculateAndRecordRevenueShare(
  input: RevenueShareInput
): Promise<{ recorded: boolean; reason?: string }> {
  const { athleteClientId, subscriptionId, totalAmount, periodStart, periodEnd } = input

  // Get the athlete's subscription with coach assignment info
  const subscription = await prisma.athleteSubscription.findUnique({
    where: { clientId: athleteClientId },
    select: {
      assignedCoachId: true,
      coachRevenueSharePercent: true,
      coachRevenueShareStartDate: true,
    },
  })

  if (!subscription) {
    return { recorded: false, reason: 'No subscription found' }
  }

  if (!subscription.assignedCoachId) {
    return { recorded: false, reason: 'No assigned coach' }
  }

  if (!subscription.coachRevenueSharePercent) {
    return { recorded: false, reason: 'No revenue share percentage set' }
  }

  // Check if revenue share start date has been reached
  if (subscription.coachRevenueShareStartDate && subscription.coachRevenueShareStartDate > periodStart) {
    return { recorded: false, reason: 'Revenue share start date not yet reached' }
  }

  // Calculate the split
  const sharePercent = subscription.coachRevenueSharePercent
  const coachAmount = Math.round(totalAmount * (sharePercent / 100))
  const platformAmount = totalAmount - coachAmount

  // Create earnings record
  await prisma.coachEarnings.create({
    data: {
      coachUserId: subscription.assignedCoachId,
      athleteClientId,
      subscriptionId,
      periodStart,
      periodEnd,
      totalAmount,
      coachAmount,
      platformAmount,
      sharePercent,
      status: 'PENDING',
    },
  })

  logger.info('Revenue share recorded', {
    coachUserId: subscription.assignedCoachId,
    athleteClientId,
    totalAmount,
    coachAmount,
    platformAmount,
    sharePercent,
  })

  return { recorded: true }
}

/**
 * Get earnings summary for a coach
 */
export async function getCoachEarningsSummary(coachUserId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  // Get all-time totals
  const allTime = await prisma.coachEarnings.aggregate({
    where: {
      coachUserId,
    },
    _sum: {
      coachAmount: true,
    },
    _count: true,
  })

  // Get this month's totals
  const thisMonth = await prisma.coachEarnings.aggregate({
    where: {
      coachUserId,
      periodStart: { gte: startOfMonth },
    },
    _sum: {
      coachAmount: true,
    },
    _count: true,
  })

  // Get this year's totals
  const thisYear = await prisma.coachEarnings.aggregate({
    where: {
      coachUserId,
      periodStart: { gte: startOfYear },
    },
    _sum: {
      coachAmount: true,
    },
    _count: true,
  })

  // Get pending payout total
  const pendingPayout = await prisma.coachEarnings.aggregate({
    where: {
      coachUserId,
      status: 'PENDING',
    },
    _sum: {
      coachAmount: true,
    },
  })

  return {
    allTime: {
      totalEarnings: allTime._sum.coachAmount || 0,
      transactionCount: allTime._count,
    },
    thisMonth: {
      totalEarnings: thisMonth._sum.coachAmount || 0,
      transactionCount: thisMonth._count,
    },
    thisYear: {
      totalEarnings: thisYear._sum.coachAmount || 0,
      transactionCount: thisYear._count,
    },
    pendingPayout: pendingPayout._sum.coachAmount || 0,
  }
}

/**
 * Get detailed earnings history for a coach
 */
export async function getCoachEarningsHistory(
  coachUserId: string,
  options?: {
    page?: number
    limit?: number
    status?: 'PENDING' | 'PAID_OUT'
  }
) {
  const page = options?.page || 1
  const limit = options?.limit || 20

  const where: Record<string, unknown> = {
    coachUserId,
  }

  if (options?.status) {
    where.status = options.status
  }

  const [total, earnings] = await Promise.all([
    prisma.coachEarnings.count({ where }),
    prisma.coachEarnings.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ])

  return {
    earnings: earnings.map(e => ({
      id: e.id,
      athleteId: e.athleteClientId,
      athleteName: e.athlete.name,
      periodStart: e.periodStart,
      periodEnd: e.periodEnd,
      totalAmount: e.totalAmount,
      coachAmount: e.coachAmount,
      platformAmount: e.platformAmount,
      sharePercent: e.sharePercent,
      status: e.status,
      paidOutAt: e.paidOutAt,
      createdAt: e.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Mark earnings as paid out (admin function)
 */
export async function markEarningsAsPaidOut(earningsIds: string[]): Promise<number> {
  const result = await prisma.coachEarnings.updateMany({
    where: {
      id: { in: earningsIds },
      status: 'PENDING',
    },
    data: {
      status: 'PAID_OUT',
      paidOutAt: new Date(),
    },
  })

  return result.count
}
