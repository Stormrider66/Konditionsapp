import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getRequestedBusinessScope } from '@/lib/auth-utils'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { logger } from '@/lib/logger'
import {
  sendCoachMessageAction,
  sendCoachMessageActionSchema,
} from '@/lib/ai/coach-message-actions'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Obehörig' }, { status: 401 })
    }

    const hasCoachAccess = await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess) {
      return NextResponse.json({ success: false, error: 'Coachbehörighet krävs' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = sendCoachMessageActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Ogiltig åtgärd', details: parsed.error.flatten() },
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
      { success: false, error: 'Kunde inte skicka meddelandet' },
      { status: 500 }
    )
  }
}
