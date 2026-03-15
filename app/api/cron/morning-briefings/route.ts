/**
 * Morning Briefings Cron Job
 *
 * POST /api/cron/morning-briefings
 *
 * Generates personalized morning briefings for athletes.
 * The work is processed in bounded concurrent batches so one invocation
 * does not try to sweep the full userbase serially.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMorningBriefing } from '@/lib/ai/briefing-generator'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'

export const maxDuration = 300

const DEFAULT_BATCH_LIMIT = 120
const DEFAULT_PAGE_SIZE = 200
const DEFAULT_CONCURRENCY = 6
const DEFAULT_EXECUTION_BUDGET_MS = 4 * 60 * 1000

type ScanState =
  | { phase: 'prefs'; cursor: string | null }
  | { phase: 'defaults'; cursor: string | null }
  | null

type BriefingCandidate = {
  clientId: string
  coachUserId: string
}

type CandidatePage = {
  athletes: BriefingCandidate[]
  scanned: number
  nextState: ScanState
}

type ProcessAthleteResult = 'created' | 'skipped' | 'error'

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
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
    scanned: 0,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    exhausted: false,
    timedOut: false,
  }

  try {
    let state: ScanState = { phase: 'prefs', cursor: null }

    logger.info('Morning briefings cron started', {
      batchLimit,
      pageSize,
      concurrency,
      executionBudgetMs,
    })

    while (state && results.processed < batchLimit) {
      if (Date.now() - startTime >= executionBudgetMs) {
        results.timedOut = true
        break
      }

      const page = await fetchBriefingCandidates(state, pageSize)
      results.scanned += page.scanned
      state = page.nextState

      if (page.athletes.length === 0) {
        continue
      }

      const remainingCapacity = batchLimit - results.processed
      const athletesToProcess = page.athletes.slice(0, remainingCapacity)

      for (let i = 0; i < athletesToProcess.length; i += concurrency) {
        if (Date.now() - startTime >= executionBudgetMs) {
          results.timedOut = true
          break
        }

        const chunk = athletesToProcess.slice(i, i + concurrency)
        const chunkResults = await Promise.all(
          chunk.map(async (athlete) => processAthleteBriefing(athlete))
        )

        for (const outcome of chunkResults) {
          results.processed++
          if (outcome === 'created') {
            results.created++
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
    }

    results.exhausted = state === null

    const duration = Date.now() - startTime
    logger.info('Morning briefings cron completed', {
      ...results,
      durationMs: duration,
    })

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: duration,
      hasMore: !results.exhausted,
    })
  } catch (error) {
    logger.error('Morning briefings cron failed', {}, error)
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

async function processAthleteBriefing(athlete: BriefingCandidate): Promise<ProcessAthleteResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingBriefing = await prisma.aIBriefing.findFirst({
      where: {
        clientId: athlete.clientId,
        briefingType: 'MORNING',
        scheduledFor: { gte: today },
      },
      select: { id: true },
    })

    if (existingBriefing) {
      return 'skipped'
    }

    const apiKeys = await getResolvedAiKeys(athlete.coachUserId)
    if (!apiKeys.anthropicKey && !apiKeys.googleKey && !apiKeys.openaiKey) {
      logger.warn('No AI API key for coach', { coachId: athlete.coachUserId })
      return 'skipped'
    }

    const briefingId = await createMorningBriefing(athlete.clientId, apiKeys)
    return briefingId ? 'created' : 'error'
  } catch (error) {
    logger.error('Error processing athlete briefing', { clientId: athlete.clientId }, error)
    return 'error'
  }
}

async function fetchBriefingCandidates(
  state: Exclude<ScanState, null>,
  pageSize: number
): Promise<CandidatePage> {
  if (state.phase === 'prefs') {
    const preferences = await prisma.aINotificationPreferences.findMany({
      where: {
        morningBriefingEnabled: true,
      },
      ...(state.cursor
        ? {
            cursor: { clientId: state.cursor },
            skip: 1,
          }
        : {}),
      take: pageSize,
      orderBy: { clientId: 'asc' },
      select: {
        clientId: true,
        morningBriefingTime: true,
        timezone: true,
        client: {
          select: {
            userId: true,
          },
        },
      },
    })

    const athletes = preferences.flatMap((pref) => {
      const briefingHour = parseInt(pref.morningBriefingTime.split(':')[0], 10)
      const localHour = getHourInTimezone(pref.timezone)
      if (localHour !== briefingHour) {
        return []
      }
      return [{ clientId: pref.clientId, coachUserId: pref.client.userId }]
    })

    const nextState: ScanState =
      preferences.length < pageSize
        ? { phase: 'defaults', cursor: null }
        : { phase: 'prefs', cursor: preferences[preferences.length - 1].clientId }

    return {
      athletes,
      scanned: preferences.length,
      nextState,
    }
  }

  const stockholmHour = getHourInTimezone('Europe/Stockholm')
  if (stockholmHour !== 7) {
    return {
      athletes: [],
      scanned: 0,
      nextState: null,
    }
  }

  const clients = await prisma.client.findMany({
    where: {
      athleteAccount: { isNot: null },
      aiNotificationPrefs: { is: null },
    },
    ...(state.cursor
      ? {
          cursor: { id: state.cursor },
          skip: 1,
        }
      : {}),
    take: pageSize,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      userId: true,
    },
  })

  const nextState: ScanState =
    clients.length < pageSize
      ? null
      : { phase: 'defaults', cursor: clients[clients.length - 1].id }

  return {
    athletes: clients.map((client) => ({
      clientId: client.id,
      coachUserId: client.userId,
    })),
    scanned: clients.length,
    nextState,
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

function getHourInTimezone(timezone: string | null | undefined): number {
  const now = new Date()
  const requestedTimezone = timezone || 'Europe/Stockholm'

  const getHourWithIntl = (tz: string): number => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      hourCycle: 'h23',
    })

    const hourStr = formatter.formatToParts(now).find((p) => p.type === 'hour')?.value
    const hour = hourStr ? parseInt(hourStr, 10) : Number.NaN

    if (!Number.isFinite(hour)) {
      throw new Error(`Failed to parse hour for timezone: ${tz}`)
    }

    return hour
  }

  try {
    return getHourWithIntl(requestedTimezone)
  } catch (error) {
    if (requestedTimezone !== 'Europe/Stockholm') {
      try {
        return getHourWithIntl('Europe/Stockholm')
      } catch (stockholmError) {
        logger.warn(
          'Failed to compute hour via Intl timeZone; falling back to Stockholm DST algorithm',
          { timezone: requestedTimezone },
          stockholmError
        )
        return getStockholmHourFallback(now)
      }
    }

    logger.warn(
      'Failed to compute Europe/Stockholm hour via Intl timeZone; falling back to Stockholm DST algorithm',
      { timezone: requestedTimezone },
      error
    )
    return getStockholmHourFallback(now)
  }
}

function getStockholmHourFallback(now: Date): number {
  const year = now.getUTCFullYear()
  const dstStart = getLastSundayOfMonthUTC(year, 2)
  dstStart.setUTCHours(1, 0, 0, 0)
  const dstEnd = getLastSundayOfMonthUTC(year, 9)
  dstEnd.setUTCHours(1, 0, 0, 0)
  const isDst = now.getTime() >= dstStart.getTime() && now.getTime() < dstEnd.getTime()
  const stockholmOffsetHours = isDst ? 2 : 1
  return (now.getUTCHours() + stockholmOffsetHours) % 24
}

function getLastSundayOfMonthUTC(year: number, monthIndex: number): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0))
  const lastSundayDate = lastDayOfMonth.getUTCDate() - lastDayOfMonth.getUTCDay()
  return new Date(Date.UTC(year, monthIndex, lastSundayDate))
}
