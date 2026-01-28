/**
 * Pattern Detection Cron Job
 *
 * Analyzes athlete check-in data for concerning patterns
 * and creates AI-powered alerts with recommendations.
 *
 * Should be called once or twice daily via external cron service.
 */

import { NextResponse } from 'next/server'
import { analyzeAllAthletes } from '@/lib/ai/pattern-detector'
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
    logger.info('Starting pattern detection analysis')

    const results = await analyzeAllAthletes()

    const duration = Date.now() - startTime

    logger.info('Pattern detection completed', { duration: `${duration}ms`, ...results })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
    })
  } catch (error) {
    console.error('Pattern detection cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run pattern detection',
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: Request) {
  return GET(request)
}
