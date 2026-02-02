/**
 * Agent Learning Cron Job
 *
 * Processes learning events to improve agent decisions.
 * Analyzes acceptance/rejection patterns and coach overrides.
 *
 * Schedule: Daily at 3 AM
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    logger.info('Starting agent learning batch')

    // Get unprocessed learning events
    const unprocessedEvents = await prisma.agentLearningEvent.findMany({
      where: {
        processedForTraining: false,
      },
      include: {
        client: {
          select: {
            id: true,
            agentPreferences: true,
          },
        },
      },
      take: 1000,
    })

    logger.info('Found unprocessed learning events', { count: unprocessedEvents.length })

    // Calculate aggregate statistics per action type
    const statsByActionType = new Map<
      string,
      {
        total: number
        accepted: number
        rejected: number
        avgConfidence: number
      }
    >()

    for (const event of unprocessedEvents) {
      const decision = event.agentDecision as { actionType?: string; confidence?: string }
      const actionType = decision?.actionType || 'UNKNOWN'
      const outcome = event.actualOutcome as { accepted?: boolean; rejected?: boolean }

      const existing = statsByActionType.get(actionType) || {
        total: 0,
        accepted: 0,
        rejected: 0,
        avgConfidence: 0,
      }

      existing.total++
      if (outcome?.accepted) existing.accepted++
      if (outcome?.rejected) existing.rejected++

      statsByActionType.set(actionType, existing)
    }

    // Calculate coach override patterns
    const coachOverrides = await prisma.agentAction.findMany({
      where: {
        coachOverride: true,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      select: {
        actionType: true,
        confidence: true,
        coachOverrideReason: true,
      },
    })

    logger.info('Found coach overrides', { count: coachOverrides.length })

    // Mark events as processed
    if (unprocessedEvents.length > 0) {
      await prisma.agentLearningEvent.updateMany({
        where: {
          id: { in: unprocessedEvents.map((e) => e.id) },
        },
        data: {
          processedForTraining: true,
        },
      })
    }

    // Track outcomes for completed actions
    const untracked = await prisma.agentAction.findMany({
      where: {
        status: { in: ['AUTO_APPLIED', 'ACCEPTED'] },
        outcomeTracked: false,
        decidedAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // At least 24 hours old
        },
      },
      take: 100,
    })

    let outcomesTracked = 0

    for (const action of untracked) {
      // Check if there's follow-up data (e.g., next check-in, workout completion)
      const nextPerception = await prisma.agentPerception.findFirst({
        where: {
          clientId: action.clientId,
          perceivedAt: {
            gt: action.decidedAt || new Date(),
          },
        },
        orderBy: { perceivedAt: 'asc' },
      })

      if (nextPerception) {
        // Determine if outcome was positive
        const wasPositive = Boolean(
          nextPerception.readinessScore &&
          nextPerception.readinessScore >= 5 &&
          !nextPerception.hasActiveInjury
        )

        await prisma.agentAction.update({
          where: { id: action.id },
          data: {
            outcomeTracked: true,
            outcomeSuccess: wasPositive,
          },
        })

        outcomesTracked++
      }
    }

    const duration = Date.now() - startTime

    // Convert stats map to object
    const actionTypeStats: Record<string, object> = {}
    statsByActionType.forEach((stats, actionType) => {
      actionTypeStats[actionType] = {
        ...stats,
        acceptanceRate: stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0,
      }
    })

    logger.info('Agent learning batch completed', {
      duration: `${duration}ms`,
      eventsProcessed: unprocessedEvents.length,
      coachOverrides: coachOverrides.length,
      outcomesTracked,
    })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        eventsProcessed: unprocessedEvents.length,
        coachOverrides: coachOverrides.length,
        outcomesTracked,
        actionTypeStats,
      },
    })
  } catch (error) {
    logger.error('Agent learning cron error', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run agent learning',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
