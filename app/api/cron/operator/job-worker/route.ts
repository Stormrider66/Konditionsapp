/**
 * Operator Agent Job Worker Cron
 *
 * Schedule: Every minute
 * Picks up pending jobs from OperatorAgentJob queue and runs the
 * corresponding agents. Handles retries and stale lock reclaim.
 */

import { NextResponse } from 'next/server'
import { processPendingJobs } from '@/lib/operator-agents'
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
    const result = await processPendingJobs()

    if (result.processed > 0) {
      logger.info('[cron/operator/job-worker] Processed jobs', result)
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    logger.error('[cron/operator/job-worker] Failed', {}, error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
