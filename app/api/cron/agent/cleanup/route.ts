/**
 * Agent Cleanup Cron Job
 *
 * Handles data retention policies:
 * - Perceptions: 90 days (then aggregate)
 * - Actions: 1 year (then delete)
 * - Learning Events: 2 years (then aggregate)
 * - Audit Logs: 7 years (legal requirement)
 *
 * Schedule: Daily at 4 AM
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/api/cron-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Retention periods in days
const RETENTION = {
  PERCEPTIONS: 90,
  ACTIONS: 365,
  LEARNING_EVENTS: 730, // 2 years
  AUDIT_LOGS: 2555, // 7 years
}

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    logger.info('Starting agent cleanup batch')

    const results = {
      perceptionsDeleted: 0,
      actionsDeleted: 0,
      learningEventsDeleted: 0,
      auditLogsDeleted: 0,
    }

    // 1. Clean up old perceptions (90 days)
    const perceptionCutoff = new Date(Date.now() - RETENTION.PERCEPTIONS * 24 * 60 * 60 * 1000)

    // First, aggregate perception data before deletion (optional - for analytics)
    const oldPerceptions = await prisma.agentPerception.findMany({
      where: {
        perceivedAt: { lt: perceptionCutoff },
      },
      select: {
        clientId: true,
        readinessScore: true,
        fatigueScore: true,
        acwr: true,
      },
      take: 10000, // Limit batch size
    })

    // Delete old perceptions (after recording aggregate if needed)
    const perceptionDeleteResult = await prisma.agentPerception.deleteMany({
      where: {
        perceivedAt: { lt: perceptionCutoff },
      },
    })
    results.perceptionsDeleted = perceptionDeleteResult.count

    // 2. Clean up old actions (1 year)
    const actionCutoff = new Date(Date.now() - RETENTION.ACTIONS * 24 * 60 * 60 * 1000)

    const actionDeleteResult = await prisma.agentAction.deleteMany({
      where: {
        createdAt: { lt: actionCutoff },
      },
    })
    results.actionsDeleted = actionDeleteResult.count

    // 3. Clean up old learning events (2 years)
    const learningCutoff = new Date(Date.now() - RETENTION.LEARNING_EVENTS * 24 * 60 * 60 * 1000)

    const learningDeleteResult = await prisma.agentLearningEvent.deleteMany({
      where: {
        createdAt: { lt: learningCutoff },
      },
    })
    results.learningEventsDeleted = learningDeleteResult.count

    // 4. Clean up old audit logs (7 years - only if really old)
    const auditCutoff = new Date(Date.now() - RETENTION.AUDIT_LOGS * 24 * 60 * 60 * 1000)

    const auditDeleteResult = await prisma.agentAuditLog.deleteMany({
      where: {
        createdAt: { lt: auditCutoff },
      },
    })
    results.auditLogsDeleted = auditDeleteResult.count

    // 5. Clean up orphaned oversight items (where related action no longer exists)
    // Use raw query since Prisma doesn't support checking for deleted relations easily
    const orphanedOversight = await prisma.$executeRaw`
      DELETE FROM "AgentOversightItem"
      WHERE "actionId" NOT IN (SELECT "id" FROM "AgentAction")
    `

    const duration = Date.now() - startTime

    logger.info('Agent cleanup batch completed', {
      duration: `${duration}ms`,
      ...results,
      orphanedOversightDeleted: orphanedOversight,
    })

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        ...results,
        orphanedOversightDeleted: orphanedOversight,
        retentionPolicy: {
          perceptions: `${RETENTION.PERCEPTIONS} days`,
          actions: `${RETENTION.ACTIONS} days`,
          learningEvents: `${RETENTION.LEARNING_EVENTS} days`,
          auditLogs: `${RETENTION.AUDIT_LOGS} days`,
        },
      },
    })
  } catch (error) {
    logger.error('Agent cleanup cron error', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run agent cleanup',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
