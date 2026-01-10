/**
 * Pre-Workout Nudges Cron Job
 *
 * Runs periodically to check for athletes with upcoming workouts
 * and generates personalized pre-workout nudges.
 *
 * Should be called every 30 minutes via external cron service.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findUpcomingWorkouts, createPreWorkoutNudge } from '@/lib/ai/preworkout-nudge-generator'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results = {
    processed: 0,
    nudgesCreated: 0,
    errors: 0,
    skipped: 0,
  }

  try {
    // Find all athletes with pre-workout nudges enabled
    const athletePreferences = await prisma.aINotificationPreferences.findMany({
      where: {
        preWorkoutNudgeEnabled: true,
      },
      select: {
        clientId: true,
        preWorkoutLeadTime: true, // Minutes before workout
      },
    })

    // Also include athletes without preferences (use defaults)
    const athletesWithPrefs = new Set(athletePreferences.map((p) => p.clientId))

    // Get all athletes with accounts who might have workouts
    const allAthletes = await prisma.client.findMany({
      where: {
        athleteAccount: { isNot: null },
      },
      select: {
        id: true,
        userId: true, // Coach's user ID for API key access
      },
    })

    // Process each athlete
    for (const athlete of allAthletes) {
      results.processed++

      try {
        // Get lead time preference (default 120 minutes = 2 hours)
        const prefs = athletePreferences.find((p) => p.clientId === athlete.id)

        // Skip if athlete has explicitly disabled nudges
        if (athletesWithPrefs.has(athlete.id) && !prefs) {
          results.skipped++
          continue
        }

        const leadTime = prefs?.preWorkoutLeadTime ?? 120

        // Find upcoming workouts within the lead time window
        const upcomingWorkouts = await findUpcomingWorkouts(athlete.id, leadTime)

        if (upcomingWorkouts.length === 0) {
          results.skipped++
          continue
        }

        // Generate nudge for the next workout
        const nextWorkout = upcomingWorkouts[0]
        const nudgeId = await createPreWorkoutNudge(
          athlete.id,
          athlete.userId,
          nextWorkout
        )

        if (nudgeId) {
          results.nudgesCreated++
          console.log(`Created pre-workout nudge for athlete ${athlete.id}: ${nudgeId}`)
        } else {
          results.skipped++ // Already sent or generation failed
        }
      } catch (error) {
        results.errors++
        console.error(`Error processing athlete ${athlete.id}:`, error)
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
    })
  } catch (error) {
    console.error('Pre-workout nudges cron error:', error)
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

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request)
}
