// app/api/referrals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * GET /api/referrals
 * Get all referrals for the current user (coach)
 * Query params:
 * - status: PENDING | COMPLETED | EXPIRED | REVOKED
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only coaches can view their referrals
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only coaches can view referrals' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      referrerUserId: user.id,
    }

    if (status && ['PENDING', 'COMPLETED', 'EXPIRED', 'REVOKED'].includes(status)) {
      where.status = status
    }

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          referredUser: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          rewards: {
            select: {
              id: true,
              rewardType: true,
              value: true,
              applied: true,
              appliedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.referral.count({ where }),
    ])

    // Get referral code stats
    const referralCode = await prisma.referralCode.findUnique({
      where: { userId: user.id },
      select: {
        code: true,
        totalUses: true,
        successfulReferrals: true,
        isActive: true,
      },
    })

    // Calculate stats
    const stats = {
      total,
      pending: await prisma.referral.count({
        where: { referrerUserId: user.id, status: 'PENDING' },
      }),
      completed: await prisma.referral.count({
        where: { referrerUserId: user.id, status: 'COMPLETED' },
      }),
      rewardsEarned: await prisma.referralReward.count({
        where: { userId: user.id, applied: true },
      }),
    }

    return NextResponse.json({
      success: true,
      data: {
        referrals,
        referralCode,
        stats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching referrals', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referrals' },
      { status: 500 }
    )
  }
}
