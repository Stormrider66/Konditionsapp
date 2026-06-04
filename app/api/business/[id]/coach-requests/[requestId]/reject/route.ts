import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { rejectCoachRequest } from '@/lib/coach/agreement'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function translateRejectError(locale: AppLocale, message: string): string {
  if (message === 'Coach request not found') {
    return t(locale, message, 'Tränarförfrågan hittades inte')
  }
  if (message === 'Unauthorized: not your request') {
    return t(locale, message, 'Obehörig: det här är inte din förfrågan')
  }
  if (message.startsWith('Cannot reject request with status:')) {
    const status = message.split(': ')[1] || ''
    return t(locale, `Cannot reject request with status: ${status}`, `Kan inte avvisa förfrågan med status: ${status}`)
  }
  return message
}

/**
 * POST /api/business/[id]/coach-requests/[requestId]/reject
 * Reject a coach request within business.
 * Body: { response? }
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

    const body = await request.json()
    const { response } = body

    const updatedRequest = await rejectCoachRequest(requestId, user.id, response)

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: translateRejectError(locale, error.message) }, { status: 400 })
    }
    return handleApiError(error)
  }
}
