import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

// GET /api/coach/admin/referrals - Get partner referral stats and list
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status')

    // Get business with revenue share percent
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        defaultRevenueShare: true,
        enterpriseContract: {
          select: { revenueSharePercent: true },
        },
      },
    })

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      )
    }

    // Build filter
    const where: Record<string, unknown> = { businessId }
    if (status) {
      where.status = status
    }

    // Get referrals with pagination
    const [referrals, total, stats] = await Promise.all([
      prisma.partnerReferral.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.partnerReferral.count({ where }),
      // Aggregate stats
      prisma.partnerReferral.aggregate({
        where: { businessId }, // Stats always for all referrals
        _sum: {
          totalRevenue: true,
          totalBusinessShare: true,
          totalPlatformShare: true,
          pendingPayout: true,
        },
        _count: true,
      }),
    ])

    // Count by status
    const statusCounts = await prisma.partnerReferral.groupBy({
      by: ['status'],
      where: { businessId },
      _count: true,
    })

    const statusCountsMap = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        referrals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          totalReferrals: stats._count,
          byStatus: {
            pending: statusCountsMap.PENDING || 0,
            active: statusCountsMap.ACTIVE || 0,
            churned: statusCountsMap.CHURNED || 0,
            expired: statusCountsMap.EXPIRED || 0,
          },
          revenue: {
            total: stats._sum.totalRevenue || 0,
            businessShare: stats._sum.totalBusinessShare || 0,
            platformShare: stats._sum.totalPlatformShare || 0,
            pendingPayout: stats._sum.pendingPayout || 0,
          },
          revenueSharePercent:
            business.enterpriseContract?.revenueSharePercent ||
            business.defaultRevenueShare ||
            70,
        },
        business: {
          slug: business.slug,
          name: business.name,
        },
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/referrals')
  }
}
