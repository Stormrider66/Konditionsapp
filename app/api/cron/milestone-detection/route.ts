/**
 * Milestone Detection Cron Job
 *
 * Detects and celebrates athlete achievements like PRs,
 * consistency streaks, workout counts, and anniversaries.
 *
 * Processed in bounded batches to avoid sweeping the full
 * athlete population serially in a single request.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processAllAthleteMilestones } from '@/lib/ai/milestone-detector'
import { logger } from '@/lib/logger'

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
    logger.info('Starting milestone detection', {
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
    })

    const results = await processAllAthleteMilestones({
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
    })

    const duration = Date.now() - startTime

    logger.info('Milestone detection completed', { duration: `${duration}ms`, ...results })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
      hasMore: results.hasMore,
    })
  } catch (error) {
    console.error('Milestone detection cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run milestone detection',
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
