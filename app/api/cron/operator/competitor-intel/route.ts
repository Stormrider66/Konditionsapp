/**
 * Competitor Intelligence Operator Agent Cron
 *
 * Schedule: Weekly Friday 10am UTC
 * Researches competitors, generates strategic digest.
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
    const result = await runOperatorAgent('COMPETITOR_INTEL', { triggeredBy: 'cron' })
    return NextResponse.json({ success: true, result })
  } catch (error) {
    logger.error('[cron/operator/competitor-intel] Failed', {}, error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
