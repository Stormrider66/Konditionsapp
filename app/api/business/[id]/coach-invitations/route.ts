import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { createCoachRequest } from '@/lib/coach/agreement'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/business/[id]/coach-invitations
 * For athletes — list coach-initiated invitations sent to them.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    // Get the athlete's clientId
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json({ invitations: [] })
    }

    const invitations = await prisma.coachRequest.findMany({
      where: {
        athleteClientId: athleteAccount.clientId,
        businessId,
        initiatedBy: 'COACH',
        status: 'PENDING',
      },
      include: {
        coach: {
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
      orderBy: { requestedAt: 'desc' },
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/business/[id]/coach-invitations
 * For coaches — invite an unassigned athlete in the business.
 * Body: { athleteClientId, message? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    const body = await request.json()
    const { athleteClientId, message } = body

    if (!athleteClientId) {
      return NextResponse.json(
        { error: 'athleteClientId is required' },
        { status: 400 }
      )
    }

    const coachRequest = await createCoachRequest(
      athleteClientId,
      user.id,
      message,
      businessId,
      'COACH'
    )

    return NextResponse.json(coachRequest, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}
