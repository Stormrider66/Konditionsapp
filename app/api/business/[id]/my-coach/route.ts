import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { endCoachAgreement } from '@/lib/coach/agreement'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/business/[id]/my-coach
 * For athletes — get current coach info within business.
 * Returns active coach agreement and/or pending coach request.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    // Look up athlete's clientId from AthleteAccount
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json({ coach: null, pendingRequest: null })
    }

    // Check for active CoachAgreement and pending CoachRequest in parallel
    const [activeAgreement, pendingRequest] = await Promise.all([
      prisma.coachAgreement.findFirst({
        where: {
          athleteClientId: athleteAccount.clientId,
          businessId,
          status: 'ACTIVE',
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
                  activeClients: true,
                },
              },
            },
          },
        },
      }),
      prisma.coachRequest.findFirst({
        where: {
          athleteClientId: athleteAccount.clientId,
          businessId,
          status: 'PENDING',
        },
        include: {
          coach: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ])

    // Flatten coach data for easier consumption by the UI
    const coachData = activeAgreement
      ? {
          id: activeAgreement.id,
          name: activeAgreement.coach.name || 'Unknown',
          email: activeAgreement.coach.email,
          headline: activeAgreement.coach.coachProfile?.headline || null,
          specialties: activeAgreement.coach.coachProfile?.specialties || null,
          experienceYears: activeAgreement.coach.coachProfile?.experienceYears || null,
          connectedSince: activeAgreement.startedAt,
        }
      : null

    return NextResponse.json({
      coach: coachData,
      pendingRequest: pendingRequest || null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/business/[id]/my-coach
 * For athletes — end the active coaching agreement within business.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    const activeAgreement = await prisma.coachAgreement.findFirst({
      where: {
        athleteClientId: athleteAccount.clientId,
        businessId,
        status: 'ACTIVE',
      },
    })

    if (!activeAgreement) {
      return NextResponse.json({ error: 'No active agreement found' }, { status: 404 })
    }

    await endCoachAgreement(activeAgreement.id, user.id, 'Ended by athlete')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return handleApiError(error)
  }
}
