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
 * Should be called daily at 06:00.
 *
 * Authorization: Requires CRON_SECRET header for security.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  generateMentalPrepContent,
  getPrepTypeForDay,
  type MentalPrepContext,
} from '@/lib/ai/mental-prep-generator'
import { logger } from '@/lib/logger'

// Allow longer execution time for AI generation
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results = {
    racesFound: 0,
    notificationsCreated: 0,
    skipped: 0,
    errors: 0,
  }

  try {
    // Find races in the next 1-3 days
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 4) // +4 to include day 3

    const races = await prisma.race.findMany({
      where: {
        date: {
          gt: today,
          lt: threeDaysFromNow,
        },
      },
      include: {
        calendar: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                userId: true,
              },
            },
          },
        },
      },
    })

    results.racesFound = races.length

    logger.info('Mental prep cron started', {
      racesFound: races.length,
      dateRange: { from: today.toISOString(), to: threeDaysFromNow.toISOString() },
    })

    // Process each race
    for (const race of races) {
      try {
        // Calculate days until race
        const raceDate = new Date(race.date)
        raceDate.setHours(0, 0, 0, 0)
        const diffTime = raceDate.getTime() - today.getTime()
        const daysUntilRace = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Determine prep type for this day
        const prepType = getPrepTypeForDay(daysUntilRace)
        if (!prepType) {
          results.skipped++
          continue
        }

        // Check if notification already exists for this race + prep type
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

        // Check if we already have a notification for this specific prep type
        if (existingNotification) {
          const existingPrepType = (existingNotification.contextData as { prepType?: string })?.prepType
          if (existingPrepType === prepType) {
            results.skipped++
            continue
          }
        }

        // Get the client and coach info
        const client = race.calendar?.client
        if (!client?.userId) {
          logger.warn('Race has no associated client/coach', { raceId: race.id })
          results.skipped++
          continue
        }

        // Build context for AI generation
        const context: MentalPrepContext = {
          raceName: race.name,
          raceDate: race.date,
          distance: race.distance,
          targetTime: race.targetTime,
          targetPace: race.targetPace,
          classification: race.classification,
          athleteName: client.name.split(' ')[0], // First name
          coachUserId: client.userId,
        }

        // Generate mental prep content
        const content = await generateMentalPrepContent(context, prepType, daysUntilRace)

        // Schedule for 08:00 today
        const scheduledFor = new Date(today)
        scheduledFor.setHours(8, 0, 0, 0)

        // Create AINotification
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
            expiresAt: raceDate, // Expires on race day
          },
        })

        results.notificationsCreated++

        logger.info('Created mental prep notification', {
          raceId: race.id,
          raceName: race.name,
          prepType,
          daysUntilRace,
          clientId: race.clientId,
        })
      } catch (error) {
        logger.error('Error processing race for mental prep', { raceId: race.id }, error)
        results.errors++
      }
    }

    const duration = Date.now() - startTime
    logger.info('Mental prep cron completed', { ...results, durationMs: duration })

    return NextResponse.json({
      success: true,
      ...results,
      durationMs: duration,
    })
  } catch (error) {
    logger.error('Mental prep cron failed', {}, error)
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
