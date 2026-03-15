/**
 * Post-Workout Check-ins Cron Job
 *
 * Runs periodically to find recently completed workouts
 * and create personalized check-in prompts for athletes.
 *
 * Processed in bounded batches inside the service so one invocation
 * does not sweep the entire recent-workout window serially.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processPostWorkoutCheckIns } from '@/lib/ai/post-workout-checkin'
import { logger } from '@/lib/logger'

const DEFAULT_HOURS_AGO = 4
const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoursAgo = parseBoundedInt(
    request.nextUrl.searchParams.get('hoursAgo'),
    DEFAULT_HOURS_AGO,
    1,
    24
  )
  const batchLimit = parseBoundedInt(
    request.nextUrl.searchParams.get('limit'),
    DEFAULT_BATCH_LIMIT,
    1,
    500
  )
  const pageSize = parseBoundedInt(
    request.nextUrl.searchParams.get('pageSize'),
    DEFAULT_PAGE_SIZE,
    25,
    500
  )
  const concurrency = parseBoundedInt(
    request.nextUrl.searchParams.get('concurrency'),
    DEFAULT_CONCURRENCY,
    1,
    20
  )
  const executionBudgetMs = parseBoundedInt(
    request.nextUrl.searchParams.get('budgetMs'),
    DEFAULT_EXECUTION_BUDGET_MS,
    30_000,
    DEFAULT_EXECUTION_BUDGET_MS
  )

  const startTime = Date.now()

  try {
    logger.info('Starting post-workout check-in processing', {
      hoursAgo,
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
    })

    const results = await processPostWorkoutCheckIns(hoursAgo, {
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
    })

    const duration = Date.now() - startTime

    logger.info('Post-workout check-ins completed', { duration: `${duration}ms`, ...results })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
      hasMore: results.hasMore,
    })
  } catch (error) {
    console.error('Post-workout check-ins cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process post-workout check-ins',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = value ? parseInt(value, 10) : fallback
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(parsed, max))
}
