import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/business/[id]/athletes/unassigned
 * Lists athletes in the business without an active coach agreement.
 * Only includes self-registered athletes (isDirect = true).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    // Get all self-registered athletes in the business without an active coach agreement
    const athletes = await prisma.client.findMany({
      where: {
        businessId,
        isDirect: true,
        coachAgreements: {
          none: {
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        sportProfile: {
          select: {
            primarySport: true,
            secondarySports: true,
            competitiveLevel: true,
          },
        },
        athleteAccount: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ athletes })
  } catch (error) {
    return handleApiError(error)
  }
}
