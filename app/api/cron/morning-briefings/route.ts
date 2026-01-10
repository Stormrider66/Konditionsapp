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
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'
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

        // Get coach's API key
        const apiKeys = await getDecryptedUserApiKeys(athlete.coachUserId)
        if (!apiKeys.anthropicKey) {
          logger.warn('No Anthropic API key for coach', { coachId: athlete.coachUserId })
          results.skipped++
          continue
        }

        // Generate briefing
        const briefingId = await createMorningBriefing(athlete.clientId, apiKeys.anthropicKey)

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
function getHourInTimezone(timezone: string): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const hourStr = formatter.format(now)
    return parseInt(hourStr, 10)
  } catch {
    // Fallback to UTC hour if timezone is invalid
    return new Date().getUTCHours()
  }
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
