/**
 * Founder's Daily Brief Operator Agent Cron
 *
 * Schedule: Daily 7am UTC
 * Generates and emails the founder's morning brief.
 */

import { NextResponse } from 'next/server'
import { runOperatorAgent } from '@/lib/operator-agents'
import { logger } from '@/lib/logger'

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return process.env.NODE_ENV === 'development'
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runOperatorAgent('FOUNDERS_BRIEF', { triggeredBy: 'cron' })
    return NextResponse.json({ success: true, result })
  } catch (error) {
    logger.error('[cron/operator/daily-brief] Failed', {}, error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
