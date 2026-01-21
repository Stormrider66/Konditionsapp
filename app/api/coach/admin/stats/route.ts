import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

// GET /api/coach/admin/stats - Get business overview stats
export async function GET(request: NextRequest) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId

    // Fetch all stats in parallel
    const [
      membersCount,
      locationsCount,
      testersCount,
      activeApiKeys,
      totalApiKeys,
      business,
      referralStats,
    ] = await Promise.all([
      // Members count
      prisma.businessMember.count({
        where: { businessId, isActive: true },
      }),
      // Locations count
      prisma.location.count({
        where: { businessId, isActive: true },
      }),
      // Coaches count (members with COACH role)
      prisma.businessMember.count({
        where: { businessId, role: 'COACH', isActive: true },
      }),
      // Active API keys
      prisma.businessApiKey.count({
        where: { businessId, isActive: true },
      }),
      // Total API keys
      prisma.businessApiKey.count({
        where: { businessId },
      }),
      // Business with contract
      prisma.business.findUnique({
        where: { id: businessId },
        include: {
          enterpriseContract: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              monthlyFee: true,
              currency: true,
              athleteLimit: true,
              coachLimit: true,
            },
          },
        },
      }),
      // Referral stats aggregate
      prisma.partnerReferral.aggregate({
        where: { businessId },
        _sum: {
          totalRevenue: true,
          totalBusinessShare: true,
          pendingPayout: true,
        },
        _count: true,
      }),
    ])

    // Count referrals by status
    const referralStatusCounts = await prisma.partnerReferral.groupBy({
      by: ['status'],
      where: { businessId },
      _count: true,
    })

    const referralsByStatus = referralStatusCounts.reduce((acc, curr) => {
      acc[curr.status.toLowerCase()] = curr._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: {
        members: {
          total: membersCount,
          testers: testersCount,
        },
        locations: locationsCount,
        apiKeys: {
          active: activeApiKeys,
          total: totalApiKeys,
        },
        referrals: {
          total: referralStats._count,
          active: referralsByStatus.active || 0,
          pending: referralsByStatus.pending || 0,
          churned: referralsByStatus.churned || 0,
          totalRevenue: referralStats._sum.totalRevenue || 0,
          businessShare: referralStats._sum.totalBusinessShare || 0,
          pendingPayout: referralStats._sum.pendingPayout || 0,
        },
        contract: business?.enterpriseContract || null,
        business: {
          id: business?.id,
          name: business?.name,
          slug: business?.slug,
        },
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/coach/admin/stats')
  }
}
