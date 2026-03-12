import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/business/[id]/coaches/available
 * Lists coaches in the business available for a new athlete connection.
 * Excludes coaches the athlete already has a PENDING request to or ACTIVE agreement with.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    // Get the athlete's clientId from AthleteAccount
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    // Get coaches who already have a PENDING request or ACTIVE agreement with this athlete
    let excludeCoachIds: string[] = []

    if (athleteAccount) {
      const [pendingRequests, activeAgreements] = await Promise.all([
        prisma.coachRequest.findMany({
          where: {
            athleteClientId: athleteAccount.clientId,
            status: 'PENDING',
          },
          select: { coachUserId: true },
        }),
        prisma.coachAgreement.findMany({
          where: {
            athleteClientId: athleteAccount.clientId,
            status: 'ACTIVE',
          },
          select: { coachUserId: true },
        }),
      ])

      excludeCoachIds = [
        ...pendingRequests.map(r => r.coachUserId),
        ...activeAgreements.map(a => a.coachUserId),
      ]
    }

    // Get all coach members of this business
    const businessCoaches = await prisma.businessMember.findMany({
      where: {
        businessId,
        isActive: true,
        role: { in: ['OWNER', 'ADMIN', 'COACH'] },
        ...(excludeCoachIds.length > 0
          ? { userId: { notIn: excludeCoachIds } }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            coachProfile: {
              select: {
                headline: true,
                specialties: true,
                experienceYears: true,
              },
            },
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    // Count active clients for each coach
    const coachIds = businessCoaches.map(m => m.user.id)
    const clientCounts = await prisma.client.groupBy({
      by: ['userId'],
      where: {
        userId: { in: coachIds },
      },
      _count: { id: true },
    })

    const countMap = new Map(
      clientCounts.map(c => [c.userId, c._count.id])
    )

    const coaches = businessCoaches.map(member => ({
      id: member.user.id,
      name: member.user.name || 'Unknown',
      email: member.user.email || undefined,
      role: member.role,
      headline: member.user.coachProfile?.headline || null,
      specialties: member.user.coachProfile?.specialties || null,
      experienceYears: member.user.coachProfile?.experienceYears || null,
      activeClientCount: countMap.get(member.user.id) || 0,
    }))

    return NextResponse.json({ coaches })
  } catch (error) {
    return handleApiError(error)
  }
}
