import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { acceptCoachRequest } from '@/lib/coach/agreement'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function translateAcceptError(locale: AppLocale, message: string): string {
  if (message === 'Coach request not found') {
    return t(locale, message, 'Tränarförfrågan hittades inte')
  }
  if (message === 'Unauthorized: not your request') {
    return t(locale, message, 'Obehörig: det här är inte din förfrågan')
  }
  if (message.startsWith('Cannot accept request with status:')) {
    const status = message.split(': ')[1] || ''
    return t(locale, `Cannot accept request with status: ${status}`, `Kan inte acceptera förfrågan med status: ${status}`)
  }
  if (message === 'Request has expired') {
    return t(locale, message, 'Förfrågan har gått ut')
  }
  return message
}

/**
 * POST /api/business/[id]/coach-requests/[requestId]/accept
 * Accept a coach request within business.
 * Body: { response?, programAction? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: businessId, requestId } = await params

    await requireBusinessMembership(user.id, businessId, {
      roles: ['OWNER', 'ADMIN', 'COACH'],
    })

    // Verify the request belongs to this business
    const coachRequest = await prisma.coachRequest.findUnique({
      where: { id: requestId },
    })

    if (!coachRequest || coachRequest.businessId !== businessId) {
      return NextResponse.json(
        { error: t(locale, 'Coach request not found in this business', 'Tränarförfrågan hittades inte i den här verksamheten') },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { response, programAction } = body

    const result = await acceptCoachRequest(requestId, user.id, {
      response,
      programAction,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: translateAcceptError(locale, error.message) }, { status: 400 })
    }
    return handleApiError(error)
  }
}
