import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { timingSafeStringEqual } from '@/lib/security/timing-safe'

/**
 * Verify the Bearer CRON_SECRET on a cron route.
 *
 * Fails closed: a missing CRON_SECRET is treated as a server
 * misconfiguration (500), never as an open door. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` automatically when the env var
 * is set.
 *
 * Returns null when authorized, otherwise the error response to send.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('CRON_SECRET environment variable is not configured')
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization') || ''
  if (!timingSafeStringEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
