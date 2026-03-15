/**
 * Mental Prep Cron Job
 *
 * POST /api/cron/mental-prep
 *
 * Detects upcoming races and creates mental preparation notifications:
 * - 3 days before: Visualization
 * - 2 days before: Race Plan
 * - 1 day before: Affirmations
 *
 * Processed in bounded concurrent batches to avoid sweeping all
 * upcoming races serially in a single request.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  generateMentalPrepContent,
  getPrepTypeForDay,
  type MentalPrepContext,
} from '@/lib/ai/mental-prep-generator'
import { logger } from '@/lib/logger'

export const maxDuration = 300

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

type RaceCandidate = {
  id: string
  clientId: string
  name: string
  date: Date
  distance: string
  targetTime: string | null
  targetPace: number | null
  classification: string
  client: {
    id: string
    name: string
    userId: string
  }
}

type ProcessRaceOutcome =
  | { status: 'created' }
  | { status: 'skipped' }
  | { status: 'error' }

function hasValidCronSecret(request: NextRequest): boolean {
  const cronSecret = request.headers.get('x-cron-secret')
  return cronSecret === process.env.CRON_SECRET
}

function hasValidBearerSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(request: NextRequest) {
  if (!hasValidCronSecret(request)) {
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
  const results = {
    racesFound: 0,
    scanned: 0,
    processed: 0,
    notificationsCreated: 0,
    skipped: 0,
    errors: 0,
    exhausted: false,
    timedOut: false,
  }
  let hasMore = false

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 4)

    logger.info('Mental prep cron started', {
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
      dateRange: { from: today.toISOString(), to: threeDaysFromNow.toISOString() },
    })

    let cursor: string | null = null

    while (results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const races: RaceCandidate[] = await prisma.race.findMany({
        where: {
          date: {
            gt: today,
            lt: threeDaysFromNow,
          },
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
          clientId: true,
          name: true,
          date: true,
          distance: true,
          targetTime: true,
          targetPace: true,
          classification: true,
          client: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      })

      if (results.racesFound === 0) {
        results.racesFound = races.length
      } else if (cursor !== null) {
        results.racesFound += races.length
      }

      if (races.length === 0) {
        results.exhausted = true
        break
      }

      results.scanned += races.length
      cursor = races[races.length - 1].id

      const remainingCapacity = batchLimit - results.processed
      if (races.length > remainingCapacity) {
        hasMore = true
      }
      const racesToProcess = races.slice(0, remainingCapacity)

      for (let i = 0; i < racesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = racesToProcess.slice(i, i + concurrency)
        const outcomes = await Promise.all(chunk.map((race) => processRace(race, today)))

        for (const outcome of outcomes) {
          results.processed++
          if (outcome.status === 'created') {
            results.notificationsCreated++
          } else if (outcome.status === 'skipped') {
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

      if (races.length < pageSize) {
        results.exhausted = true
        break
      }

      hasMore = true
    }

    const duration = Date.now() - startTime
    logger.info('Mental prep cron completed', { ...results, durationMs: duration })

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: duration,
      hasMore: hasMore || !results.exhausted,
    })
  } catch (error) {
    logger.error('Mental prep cron failed', {}, error)
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  if (!hasValidBearerSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: new Headers({
        'x-cron-secret': process.env.CRON_SECRET || '',
      }),
    })
  )
}

async function processRace(
  race: RaceCandidate,
  today: Date
): Promise<ProcessRaceOutcome> {
  try {
    const raceDate = new Date(race.date)
    raceDate.setHours(0, 0, 0, 0)
    const diffTime = raceDate.getTime() - today.getTime()
    const daysUntilRace = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const prepType = getPrepTypeForDay(daysUntilRace)
    if (!prepType) {
      return { status: 'skipped' }
    }

    const existingNotification = await prisma.aINotification.findFirst({
      where: {
        clientId: race.clientId,
        notificationType: 'MENTAL_PREP',
        contextData: {
          path: ['raceId'],
          equals: race.id,
        },
      },
    })

    if (existingNotification) {
      const existingPrepType = (existingNotification.contextData as { prepType?: string })?.prepType
      if (existingPrepType === prepType) {
        return { status: 'skipped' }
      }
    }

    if (!race.client.userId) {
      logger.warn('Race has no associated client/coach', { raceId: race.id })
      return { status: 'skipped' }
    }

    const context: MentalPrepContext = {
      raceName: race.name,
      raceDate: race.date,
      distance: race.distance,
      targetTime: race.targetTime,
      targetPace: race.targetPace,
      classification: race.classification,
      athleteName: race.client.name.split(' ')[0],
      coachUserId: race.client.userId,
    }

    const content = await generateMentalPrepContent(context, prepType, daysUntilRace)

    const scheduledFor = new Date(today)
    scheduledFor.setHours(8, 0, 0, 0)

    await prisma.aINotification.create({
      data: {
        clientId: race.clientId,
        notificationType: 'MENTAL_PREP',
        priority: race.classification === 'A' ? 'HIGH' : 'NORMAL',
        title: content.title,
        message: content.preview,
        icon: '🧠',
        actionUrl: '/athlete/chat',
        actionLabel: 'Chatta med AI',
        contextData: {
          prepType: content.prepType,
          raceId: race.id,
          raceName: race.name,
          raceDate: race.date.toISOString(),
          distance: race.distance,
          targetTime: race.targetTime,
          daysUntilRace: content.daysUntilRace,
          content: {
            title: content.title,
            subtitle: content.subtitle,
            mainContent: content.mainContent,
            preview: content.preview,
            bulletPoints: content.bulletPoints,
          },
        },
        triggeredBy: 'cron',
        triggerReason: `Mental prep for ${race.name} (${daysUntilRace} days away)`,
        scheduledFor,
        expiresAt: raceDate,
      },
    })

    logger.info('Created mental prep notification', {
      raceId: race.id,
      raceName: race.name,
      prepType,
      daysUntilRace,
      clientId: race.clientId,
    })

    return { status: 'created' }
  } catch (error) {
    logger.error('Error processing race for mental prep', { raceId: race.id }, error)
    return { status: 'error' }
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
