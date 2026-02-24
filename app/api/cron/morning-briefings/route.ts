/**
 * Morning Briefings Cron Job
 *
 * POST /api/cron/morning-briefings
 *
 * Generates personalized morning briefings for athletes.
 * Should be called hourly to handle different timezone preferences.
 *
 * Authorization: Requires CRON_SECRET header for security.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMorningBriefing } from '@/lib/ai/briefing-generator'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'

// Allow longer execution time for batch processing
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  }

  try {
    // Find athletes who should receive briefings now
    // Based on their timezone and preferred briefing time (DST-aware)
    const athletesForBriefing = await findAthletesForBriefing()

    logger.info('Morning briefings cron started', {
      athletesToProcess: athletesForBriefing.length,
    })

    // Process each athlete
    for (const athlete of athletesForBriefing) {
      results.processed++

      try {
        // Check if briefing already exists for today
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const existingBriefing = await prisma.aIBriefing.findFirst({
          where: {
            clientId: athlete.clientId,
            briefingType: 'MORNING',
            scheduledFor: { gte: today },
          },
        })

        if (existingBriefing) {
          results.skipped++
          continue
        }

        // Get coach's API keys
        const apiKeys = await getResolvedAiKeys(athlete.coachUserId)
        if (!apiKeys.anthropicKey && !apiKeys.googleKey && !apiKeys.openaiKey) {
          logger.warn('No AI API key for coach', { coachId: athlete.coachUserId })
          results.skipped++
          continue
        }

        // Generate briefing
        const briefingId = await createMorningBriefing(athlete.clientId, apiKeys)

        if (briefingId) {
          results.created++
        } else {
          results.errors++
        }
      } catch (error) {
        logger.error('Error processing athlete briefing', { clientId: athlete.clientId }, error)
        results.errors++
      }
    }

    const duration = Date.now() - startTime
    logger.info('Morning briefings cron completed', { ...results, durationMs: duration })

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: duration,
    })
  } catch (error) {
    logger.error('Morning briefings cron failed', {}, error)
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Get the current hour in a specific timezone (DST-aware)
 */
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
    // Retry with a known-good default timezone if the supplied one is invalid.
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

/**
 * Fallback when Intl timeZone support is unavailable.
 * Sweden follows EU DST rules: UTC+1 (CET) in winter, UTC+2 (CEST) in summer.
 */
function getStockholmHourFallback(now: Date): number {
  const year = now.getUTCFullYear()

  // DST starts: last Sunday in March at 01:00 UTC
  const dstStart = getLastSundayOfMonthUTC(year, 2)
  dstStart.setUTCHours(1, 0, 0, 0)

  // DST ends: last Sunday in October at 01:00 UTC
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

/**
 * Find athletes who should receive morning briefings at the current hour
 */
async function findAthletesForBriefing(): Promise<
  { clientId: string; coachUserId: string }[]
> {
  // Get athletes with notification preferences who want morning briefings
  const preferences = await prisma.aINotificationPreferences.findMany({
    where: {
      morningBriefingEnabled: true,
    },
    select: {
      clientId: true,
      morningBriefingTime: true,
      timezone: true,
      client: {
        select: {
          userId: true, // Coach's user ID
        },
      },
    },
  })

  // Also get athletes without explicit preferences (use defaults)
  const clientsWithPrefs = new Set(preferences.map((p) => p.clientId))

  const clientsWithoutPrefs = await prisma.client.findMany({
    where: {
      id: { notIn: Array.from(clientsWithPrefs) },
      athleteAccount: { isNot: null }, // Only athletes with accounts
    },
    select: {
      id: true,
      userId: true,
    },
    take: 100, // Limit batch size
  })

  const result: { clientId: string; coachUserId: string }[] = []

  // Check athletes with preferences
  for (const pref of preferences) {
    const briefingHour = parseInt(pref.morningBriefingTime.split(':')[0], 10)
    const localHour = getHourInTimezone(pref.timezone)

    if (localHour === briefingHour) {
      result.push({
        clientId: pref.clientId,
        coachUserId: pref.client.userId,
      })
    }
  }

  // Check athletes without preferences (default: 07:00 Stockholm time)
  const defaultBriefingHour = 7
  const stockholmHour = getHourInTimezone('Europe/Stockholm')

  if (stockholmHour === defaultBriefingHour) {
    for (const client of clientsWithoutPrefs) {
      result.push({
        clientId: client.id,
        coachUserId: client.userId,
      })
    }
  }

  return result
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  // For Vercel Cron, check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Forward to POST handler
  return POST(request)
}
