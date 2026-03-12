import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { createCoachRequest } from '@/lib/coach/agreement'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/business/[id]/coach-requests
 * For coaches — list intra-business coach requests to them.
 * Supports ?status=PENDING query param filter.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const requests = await prisma.coachRequest.findMany({
      where: {
        coachUserId: user.id,
        businessId,
        ...(status ? { status } : {}),
      },
      include: {
        athlete: {
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
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/business/[id]/coach-requests
 * For athletes — create a coach request within business.
 * Body: { coachUserId, message? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    const body = await request.json()
    const { coachUserId, message } = body

    if (!coachUserId) {
      return NextResponse.json(
        { error: 'coachUserId is required' },
        { status: 400 }
      )
    }

    // Look up athlete's clientId from AthleteAccount
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const coachRequest = await createCoachRequest(
      athleteAccount.clientId,
      coachUserId,
      message,
      businessId
    )

    return NextResponse.json(coachRequest, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}
