import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { endCoachAgreement } from '@/lib/coach/agreement'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function translateEndCoachError(locale: AppLocale, message: string): string {
  if (message === 'Agreement not found') {
    return t(locale, message, 'Överenskommelsen hittades inte')
  }
  if (message.startsWith('Cannot end agreement with status:')) {
    const status = message.split(': ')[1] || ''
    return t(locale, `Cannot end agreement with status: ${status}`, `Kan inte avsluta överenskommelsen med status: ${status}`)
  }
  return message
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

    // Check for active CoachAgreement, pending athlete-initiated request, and coach invitations
    const [activeAgreement, pendingRequest, coachInvitations] = await Promise.all([
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
          initiatedBy: 'ATHLETE',
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
      // Coach-initiated invitations to this athlete
      prisma.coachRequest.findMany({
        where: {
          athleteClientId: athleteAccount.clientId,
          businessId,
          status: 'PENDING',
          initiatedBy: 'COACH',
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
      coachInvitations: coachInvitations || [],
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
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: t(locale, 'Athlete account not found', 'Idrottarkontot hittades inte') }, { status: 404 })
    }

    const activeAgreement = await prisma.coachAgreement.findFirst({
      where: {
        athleteClientId: athleteAccount.clientId,
        businessId,
        status: 'ACTIVE',
      },
    })

    if (!activeAgreement) {
      return NextResponse.json({ error: t(locale, 'No active agreement found', 'Ingen aktiv överenskommelse hittades') }, { status: 404 })
    }

    await endCoachAgreement(activeAgreement.id, user.id, 'Ended by athlete')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: translateEndCoachError(locale, error.message) }, { status: 400 })
    }
    return handleApiError(error)
  }
}
