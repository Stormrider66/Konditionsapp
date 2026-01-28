/**
 * Milestone Detection Cron Job
 *
 * Detects and celebrates athlete achievements like PRs,
 * consistency streaks, workout counts, and anniversaries.
 *
 * Should be called once or twice daily via external cron service.
 */

import { NextResponse } from 'next/server'
import { processAllAthleteMilestones } from '@/lib/ai/milestone-detector'
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
    logger.info('Starting milestone detection')

    const results = await processAllAthleteMilestones()

    const duration = Date.now() - startTime

    logger.info('Milestone detection completed', { duration: `${duration}ms`, ...results })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
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

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request)
}
