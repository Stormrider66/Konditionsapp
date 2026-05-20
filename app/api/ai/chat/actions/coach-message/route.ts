import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getRequestedBusinessScope } from '@/lib/auth-utils'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { logger } from '@/lib/logger'
import {
  sendCoachMessageAction,
  sendCoachMessageActionSchema,
} from '@/lib/ai/coach-message-actions'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    locale = user.language === 'sv' ? 'sv' : 'en'

    const hasCoachAccess = await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Coach access required', 'Coachbehörighet krävs') },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = sendCoachMessageActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid action', 'Ogiltig åtgärd'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const scope = getRequestedBusinessScope(request)
    const businessSlug = scope.businessSlug || parsed.data.businessSlug
    const result = await sendCoachMessageAction(user.id, parsed.data, businessSlug)

    if (!result.success) {
      return NextResponse.json(result, { status: result.needsClarification ? 409 : 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error('Failed to execute coach AI message action', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Could not send the message', 'Kunde inte skicka meddelandet') },
      { status: 500 }
    )
  }
}
