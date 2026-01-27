// app/api/cron/reset-ai-usage/route.ts
/**
 * Monthly AI Usage Reset Cron Job
 *
 * Resets the AI chat message usage counters for all athlete subscriptions
 * at the beginning of each month.
 *
 * Trigger: Cron job (1st of each month at 00:05 AM)
 * Method: POST /api/cron/reset-ai-usage
 * Auth: Cron secret token (CRON_SECRET environment variable)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not configured', {})
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET not set' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting monthly AI usage reset job')

    const now = new Date()

    // Reset all AI chat message counters
    const result = await prisma.athleteSubscription.updateMany({
      where: {
        aiChatMessagesUsed: { gt: 0 },
      },
      data: {
        aiChatMessagesUsed: 0,
      },
    })

    logger.info('AI usage reset complete', {
      resetCount: result.count,
    })

    return NextResponse.json({
      success: true,
      resetCount: result.count,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    logger.error('AI usage reset job failed', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Allow GET for manual testing (requires same authentication)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}
