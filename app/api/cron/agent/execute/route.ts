/**
 * Agent Execution Cron Job
 *
 * Executes pending agent actions that are eligible for auto-application.
 * Also expires old actions that were never acted upon.
 *
 * Schedule: Every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/api/cron-auth'
import { executePendingActions, expireOldActions } from '@/lib/agent/execution'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

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

export async function POST(request: NextRequest) {
  return GET(request)
}
