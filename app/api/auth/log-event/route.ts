/**
 * Auth Event Logging API
 *
 * POST /api/auth/log-event — Record an auth event (login success/failure, etc.)
 *
 * Called from client-side auth flows (login page, signup, etc.) to
 * populate the AuthEvent table for security monitoring.
 *
 * Rate-limited per IP to prevent log spam.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logAuthEvent, type AuthEventType } from '@/lib/auth/auth-events'
import { rateLimitJsonResponse, getRequestIp } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const VALID_EVENT_TYPES: AuthEventType[] = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'SIGN_OUT',
  'PASSWORD_RESET',
  'LOCKOUT',
  'OAUTH_START',
  'OAUTH_SUCCESS',
  'OAUTH_FAILURE',
]

export async function POST(req: NextRequest) {
  const locale = resolveRequestLocale(req)

  try {
    const ip = getRequestIp(req)

    // Rate limit: 30 log events per minute per IP (generous — allows
    // failed login retries while preventing log flooding)
    const rateLimited = await rateLimitJsonResponse('auth:log-event', ip, {
      limit: 30,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { eventType, userId, email, failureReason, metadata } = body

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: t(locale, 'Invalid eventType', 'Ogiltig eventType') },
        { status: 400 }
      )
    }

    // Guard against oversized fields
    const safeEmail = typeof email === 'string' ? email.slice(0, 320) : null
    const safeFailureReason = typeof failureReason === 'string' ? failureReason.slice(0, 200) : null

    await logAuthEvent({
      eventType,
      userId: typeof userId === 'string' ? userId : null,
      email: safeEmail,
      failureReason: safeFailureReason,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
      metadata: metadata && typeof metadata === 'object' ? metadata : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[auth/log-event] Failed to log event', {}, error)
    // Return 200 even on error — logging failures should not affect auth UX
    return NextResponse.json({ success: false })
  }
}
