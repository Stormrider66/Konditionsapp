import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { createCoachRequest } from '@/lib/coach/agreement'
import { CoachRequestStatus } from '@prisma/client'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function translateCoachRequestError(locale: AppLocale, message: string): string {
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
  if (message === 'This coach is not currently accepting new clients') {
    return t(locale, message, 'Den här tränaren tar inte emot nya klienter just nu')
  }
  return message
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
        ...(status && status in CoachRequestStatus ? { status: status as CoachRequestStatus } : {}),
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
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    const body = await request.json()
    const { coachUserId, message } = body

    if (!coachUserId) {
      return NextResponse.json(
        { error: t(locale, 'coachUserId is required', 'coachUserId krävs') },
        { status: 400 }
      )
    }

    // Look up athlete's clientId from AthleteAccount
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: t(locale, 'Athlete account not found', 'Idrottarkontot hittades inte') },
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
      return NextResponse.json({ error: translateCoachRequestError(locale, error.message) }, { status: 400 })
    }
    return handleApiError(error)
  }
}
