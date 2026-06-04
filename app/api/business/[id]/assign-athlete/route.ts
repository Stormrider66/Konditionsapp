import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { assignAthleteToCoach } from '@/lib/coach/agreement'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function translateAssignError(locale: AppLocale, message: string): string {
  if (message === 'Athlete is not part of this business') {
    return t(locale, message, 'Idrottaren tillhör inte den här verksamheten')
  }
  if (message === 'Coach is not part of this business') {
    return t(locale, message, 'Tränaren tillhör inte den här verksamheten')
  }
  if (message === 'Cannot assign an athlete to themselves as coach') {
    return t(locale, message, 'Det går inte att tilldela en idrottare till sig själv som tränare')
  }
  if (message === 'Athlete already has an active coach. End that agreement first.') {
    return t(locale, message, 'Idrottaren har redan en aktiv tränare. Avsluta den överenskommelsen först.')
  }
  return message
}

/**
 * POST /api/business/[id]/assign-athlete
 * Direct assignment of an athlete to a coach by coach/admin.
 * Body: { athleteClientId, coachUserId }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: businessId } = await params

    const { role } = await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    const body = await request.json()
    const { athleteClientId, coachUserId } = body

    if (!athleteClientId || !coachUserId) {
      return NextResponse.json(
        { error: t(locale, 'athleteClientId and coachUserId are required', 'athleteClientId och coachUserId krävs') },
        { status: 400 }
      )
    }

    // If role is COACH (not OWNER/ADMIN), can only assign to self
    if (role === 'COACH' && coachUserId !== user.id) {
      return NextResponse.json(
        { error: t(locale, 'Coaches can only assign athletes to themselves', 'Tränare kan bara tilldela idrottare till sig själva') },
        { status: 403 }
      )
    }

    const agreement = await assignAthleteToCoach(
      athleteClientId,
      coachUserId,
      user.id,
      businessId
    )

    return NextResponse.json(agreement, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: translateAssignError(locale, error.message) }, { status: 400 })
    }
    return handleApiError(error)
  }
}
