/**
 * Post-Workout Check-ins Cron Job
 *
 * Runs periodically to find recently completed workouts
 * and create personalized check-in prompts for athletes.
 *
 * Should be called every 30-60 minutes via external cron service.
 */

import { NextResponse } from 'next/server'
import { processPostWorkoutCheckIns } from '@/lib/ai/post-workout-checkin'
import { logger } from '@/lib/logger'

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

  try {
    logger.info('Starting post-workout check-in processing')

    // Look for workouts completed in the last 4 hours
    const results = await processPostWorkoutCheckIns(4)

    const duration = Date.now() - startTime

    logger.info('Post-workout check-ins completed', { duration: `${duration}ms`, ...results })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
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

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request)
}
