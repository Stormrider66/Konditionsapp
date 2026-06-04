import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { createCoachRequest } from '@/lib/coach/agreement'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function translateCoachInvitationError(locale: AppLocale, message: string): string {
  if (message === 'You already have a pending request to this coach') {
    return t(locale, message, 'Du har redan en väntande förfrågan till den här tränaren')
  }
  if (message === 'You are already connected with this coach') {
    return t(locale, message, 'Du är redan kopplad till den här tränaren')
  }
  if (message === 'You already have an active coach. End that agreement first.') {
    return t(locale, message, 'Du har redan en aktiv tränare. Avsluta den överenskommelsen först.')
  }
  if (message === 'Athlete is not part of this business') {
    return t(locale, message, 'Idrottaren tillhör inte den här verksamheten')
  }
  if (message === 'Coach is not part of this business') {
    return t(locale, message, 'Tränaren tillhör inte den här verksamheten')
  }
  return message
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
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    const body = await request.json()
    const { athleteClientId, message } = body

    if (!athleteClientId) {
      return NextResponse.json(
        { error: t(locale, 'athleteClientId is required', 'athleteClientId krävs') },
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
      return NextResponse.json({ error: translateCoachInvitationError(locale, error.message) }, { status: 400 })
    }
    return handleApiError(error)
  }
}
