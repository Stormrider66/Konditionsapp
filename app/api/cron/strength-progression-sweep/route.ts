// app/api/cron/strength-progression-sweep/route.ts
/**
 * Nightly Strength Progression Sweep
 *
 * Rolls up StrengthSessionAssignment SetLogs into ProgressionTracking +
 * OneRepMaxHistory for sessions that never reached COMPLETED. The focus-mode
 * completion hook handles the happy path, but athletes who log sets and then
 * close the app (assignment stuck in PENDING/SCHEDULED/MODIFIED) never trigger
 * it — their logged work stays invisible on the progression dashboards.
 *
 * COMPLETED assignments are swept too: the completion hook is best-effort
 * (errors are logged, not retried), so this self-heals silent failures.
 * SKIPPED assignments are excluded — skipping is an explicit signal from the
 * coach/athlete that the session shouldn't count.
 *
 * Only past days are swept (sets are final once the day is over), capped at a
 * 30-day lookback. The rollup is idempotent per client/exercise/day, so
 * re-sweeping already-covered assignments is a no-op.
 *
 * Trigger: Cron job (daily at 3:45 AM)
 * Method: POST /api/cron/strength-progression-sweep
 * Auth: Cron secret token (CRON_SECRET environment variable)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { rollupAssignmentProgression } from '@/lib/training-engine/progression/assignment-rollup'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const LOOKBACK_DAYS = 30

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access (REQUIRED)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('CRON_SECRET environment variable is not configured', {})
      return NextResponse.json(
        { error: 'Server misconfiguration: CRON_SECRET not set' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lookbackStart = new Date(today)
    lookbackStart.setDate(today.getDate() - LOOKBACK_DAYS)

    const assignments = await prisma.strengthSessionAssignment.findMany({
      where: {
        assignedDate: { gte: lookbackStart, lt: today },
        status: { not: 'SKIPPED' },
        setLogs: { some: {} },
      },
      select: { id: true, status: true },
      orderBy: { assignedDate: 'asc' },
    })

    let created = 0
    let skipped = 0
    let prs = 0
    let errors = 0

    for (const assignment of assignments) {
      try {
        const result = await rollupAssignmentProgression(assignment.id)
        created += result.created
        skipped += result.skipped
        prs += result.prs
      } catch (error) {
        errors++
        logger.warn('Strength progression sweep failed for assignment', { assignmentId: assignment.id }, error)
      }
    }

    if (created > 0 || prs > 0 || errors > 0) {
      logger.info('Strength progression sweep finished', {
        assignments: assignments.length,
        created,
        skipped,
        prs,
        errors,
      })
    }

    return NextResponse.json({
      success: true,
      assignments: assignments.length,
      created,
      skipped,
      prs,
      errors,
    })
  } catch (error) {
    logger.error('Strength progression sweep failed', {}, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
