import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { acceptCoachInvitation } from '@/lib/coach/agreement'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function translateAcceptInvitationError(locale: AppLocale, message: string): string {
  if (message === 'Invitation not found') {
    return t(locale, message, 'Inbjudan hittades inte')
  }
  if (message === 'Unauthorized: not your invitation') {
    return t(locale, message, 'Obehörig: det här är inte din inbjudan')
  }
  if (message === 'This is not a coach-initiated invitation') {
    return t(locale, message, 'Det här är inte en tränarinitierad inbjudan')
  }
  if (message.startsWith('Cannot accept invitation with status:')) {
    const status = message.split(': ')[1] || ''
    return t(locale, `Cannot accept invitation with status: ${status}`, `Kan inte acceptera inbjudan med status: ${status}`)
  }
  if (message === 'Invitation has expired') {
    return t(locale, message, 'Inbjudan har gått ut')
  }
  return message
}

/**
 * POST /api/business/[id]/coach-invitations/[requestId]/accept
 * Athlete accepts a coach-initiated invitation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: businessId, requestId } = await params

    await requireBusinessMembership(user.id, businessId)

    // Get athlete's clientId
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { userId: user.id },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: t(locale, 'Athlete account not found', 'Idrottarkontot hittades inte') },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const result = await acceptCoachInvitation(
      requestId,
      athleteAccount.clientId,
      body.response
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: translateAcceptInvitationError(locale, error.message) }, { status: 400 })
    }
    return handleApiError(error)
  }
}
