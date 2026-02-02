/**
 * Agent Execution Cron Job
 *
 * Executes pending agent actions that are eligible for auto-application.
 * Also expires old actions that were never acted upon.
 *
 * Schedule: Every 5 minutes
 */

import { NextResponse } from 'next/server'
import { executePendingActions, expireOldActions } from '@/lib/agent/execution'
import { logger } from '@/lib/logger'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    logger.info('Starting agent execution batch')

    // First, expire old actions
    const expiredCount = await expireOldActions()

    if (expiredCount > 0) {
      logger.info('Expired old actions', { count: expiredCount })
    }

    // Execute pending actions
    const result = await executePendingActions(100)

    const duration = Date.now() - startTime

    logger.info('Agent execution batch completed', {
      duration: `${duration}ms`,
      expired: expiredCount,
      ...result,
    })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        expired: expiredCount,
        ...result,
      },
    })
  } catch (error) {
    logger.error('Agent execution cron error', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run agent execution',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
