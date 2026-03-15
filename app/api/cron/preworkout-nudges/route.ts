/**
 * Pre-Workout Nudges Cron Job
 *
 * Runs periodically to check for athletes with upcoming workouts
 * and generates personalized pre-workout nudges.
 *
 * Processed in bounded, paged batches to avoid sweeping the full
 * athlete population in a single serial request.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findUpcomingWorkouts, createPreWorkoutNudge } from '@/lib/ai/preworkout-nudge-generator'
import { logger } from '@/lib/logger'

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 50_000

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

type AthletePage = {
  id: string
  userId: string
  aiNotificationPrefs: {
    preWorkoutNudgeEnabled: boolean
    preWorkoutLeadTime: number
  } | null
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
    10_000,
    DEFAULT_EXECUTION_BUDGET_MS
  )

  const startTime = Date.now()
  const results = {
    scanned: 0,
    processed: 0,
    nudgesCreated: 0,
    errors: 0,
    skipped: 0,
    exhausted: false,
    timedOut: false,
  }
  let hasMore = false

  try {
    let cursor: string | null = null

    while (results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const athletes: AthletePage[] = await prisma.client.findMany({
        where: {
          athleteAccount: { isNot: null },
        },
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        take: pageSize,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          userId: true,
          aiNotificationPrefs: {
            select: {
              preWorkoutNudgeEnabled: true,
              preWorkoutLeadTime: true,
            },
          },
        },
      })

      if (athletes.length === 0) {
        results.exhausted = true
        break
      }

      results.scanned += athletes.length
      cursor = athletes[athletes.length - 1].id

      const remainingCapacity = batchLimit - results.processed
      if (athletes.length > remainingCapacity) {
        hasMore = true
      }
      const athletesToProcess = athletes.slice(0, remainingCapacity)

      for (let i = 0; i < athletesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = athletesToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map(processAthlete))

        for (const outcome of outcomes) {
          results.processed++
          if (outcome === 'created') {
            results.nudgesCreated++
          } else if (outcome === 'skipped') {
            results.skipped++
          } else {
            results.errors++
          }
        }

        if (results.processed >= batchLimit) {
          break
        }
      }

      if (results.timedOut) {
        break
      }

      if (athletes.length < pageSize) {
        results.exhausted = true
        break
      }

      hasMore = true
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
      hasMore: hasMore || !results.exhausted,
    })
  } catch (error) {
    logger.error('Pre-workout nudges cron error', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process pre-workout nudges',
        results,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

async function processAthlete(athlete: AthletePage): Promise<'created' | 'skipped' | 'error'> {
  try {
    const prefs = athlete.aiNotificationPrefs

    if (prefs && !prefs.preWorkoutNudgeEnabled) {
      return 'skipped'
    }

    const leadTime = prefs?.preWorkoutLeadTime ?? 120
    const upcomingWorkouts = await findUpcomingWorkouts(athlete.id, leadTime)

    if (upcomingWorkouts.length === 0) {
      return 'skipped'
    }

    const nextWorkout = upcomingWorkouts[0]
    const nudgeId = await createPreWorkoutNudge(
      athlete.id,
      athlete.userId,
      nextWorkout
    )

    if (nudgeId) {
      logger.debug('Created pre-workout nudge', { athleteId: athlete.id, nudgeId })
      return 'created'
    }

    return 'skipped'
  } catch (error) {
    logger.error('Error processing pre-workout nudge athlete', { athleteId: athlete.id }, error)
    return 'error'
  }
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
