import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiKey } from '@/lib/api-key-auth'

/**
 * External API: Get partner referral statistics
 *
 * GET /api/external/v1/referrals
 * Authorization: Bearer bak_xxxxx
 *
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - status: Filter by status (PENDING, ACTIVE, CHURNED, EXPIRED)
 *
 * Required scope: read:analytics (or admin:business)
 */
export const GET = withApiKey(
  async (request, { apiKey }) => {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status')

    // Build filter
    const where: Record<string, unknown> = {
      businessId: apiKey.businessId
    }
    if (status) {
      where.status = status
    }

    // Get referrals and stats
    const [referrals, total, stats, business] = await Promise.all([
      prisma.partnerReferral.findMany({
        where,
        select: {
          id: true,
          status: true,
          referralSource: true,
          subscriptionTier: true,
          monthlyAmount: true,
          currency: true,
          totalRevenue: true,
          totalBusinessShare: true,
          paymentCount: true,
          signedUpAt: true,
          activatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partnerReferral.count({ where }),
      prisma.partnerReferral.aggregate({
        where: { businessId: apiKey.businessId },
        _sum: {
          totalRevenue: true,
          totalBusinessShare: true,
          pendingPayout: true,
        },
        _count: true,
      }),
      prisma.business.findUnique({
        where: { id: apiKey.businessId },
        select: {
          enterpriseContract: {
            select: { revenueSharePercent: true }
          }
        }
      })
    ])

    // Count by status
    const statusCounts = await prisma.partnerReferral.groupBy({
      by: ['status'],
      where: { businessId: apiKey.businessId },
      _count: true,
    })

    const statusCountsMap = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count
      return acc
    }, {} as Record<string, number>)

    // Generate referral link
    const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.starbythomson.se'}/register/partner/${apiKey.business.slug}`

    return NextResponse.json({
      success: true,
      data: {
        referrals: referrals.map(r => ({
          id: r.id,
          user: {
            id: r.user.id,
            name: r.user.name,
            email: r.user.email,
          },
          status: r.status,
          source: r.referralSource,
          subscription: {
            tier: r.subscriptionTier,
            monthlyAmount: r.monthlyAmount,
            currency: r.currency,
          },
          revenue: {
            total: r.totalRevenue,
            yourShare: r.totalBusinessShare,
            payments: r.paymentCount,
          },
          signedUpAt: r.signedUpAt,
          activatedAt: r.activatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalReferrals: stats._count,
          byStatus: {
            pending: statusCountsMap.PENDING || 0,
            active: statusCountsMap.ACTIVE || 0,
            churned: statusCountsMap.CHURNED || 0,
            expired: statusCountsMap.EXPIRED || 0,
          },
          revenue: {
            totalGenerated: stats._sum.totalRevenue || 0,
            yourEarnings: stats._sum.totalBusinessShare || 0,
            pendingPayout: stats._sum.pendingPayout || 0,
            currency: 'SEK',
          },
          revenueSharePercent: business?.enterpriseContract?.revenueSharePercent || 70,
        },
        referralLink,
      },
      meta: {
        business: apiKey.business.name,
        requestedAt: new Date().toISOString()
      }
    })
  },
  { requiredScopes: ['read:analytics'], requireAllScopes: false }
)
