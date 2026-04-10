/**
 * Operator Agents Admin API
 *
 * GET /api/admin/operator-agents — Get status of all operator agents
 * POST /api/admin/operator-agents — Manually trigger an agent run
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { runOperatorAgent, OPERATOR_MODEL_INTENT, OPERATOR_SCHEDULES } from '@/lib/operator-agents'
import type { OperatorAgentType } from '@/lib/operator-agents'
import { logger } from '@/lib/logger'

// ============================================================================
// GET — Agent status dashboard data
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7', 10)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get recent runs grouped by agent
    const runs = await prisma.operatorAgentRun.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Aggregate per agent type
    const agentTypes = Object.keys(OPERATOR_MODEL_INTENT) as OperatorAgentType[]
    const agents = agentTypes.map(type => {
      const agentRuns = runs.filter(r => r.agentType === type)
      const lastRun = agentRuns[0]
      const completed = agentRuns.filter(r => r.status === 'COMPLETED').length
      const failed = agentRuns.filter(r => r.status === 'FAILED').length

      return {
        agentType: type,
        modelIntent: OPERATOR_MODEL_INTENT[type],
        schedule: OPERATOR_SCHEDULES[type],
        lastRun: lastRun ? {
          id: lastRun.id,
          status: lastRun.status,
          startedAt: lastRun.startedAt,
          durationMs: lastRun.durationMs,
          itemsProcessed: lastRun.itemsProcessed,
          actionsTaken: lastRun.actionsTaken,
          escalations: lastRun.escalations,
          summary: lastRun.summary,
          tokensUsed: lastRun.tokensUsed,
          costUsd: lastRun.costUsd,
        } : null,
        stats: {
          totalRuns: agentRuns.length,
          completed,
          failed,
          successRate: agentRuns.length > 0 ? completed / agentRuns.length : null,
          totalTokens: agentRuns.reduce((s, r) => s + r.tokensUsed, 0),
          totalCostUsd: Math.round(agentRuns.reduce((s, r) => s + r.costUsd, 0) * 1000) / 1000,
        },
      }
    })

    // Summary
    const totalCost = runs.reduce((s, r) => s + r.costUsd, 0)
    const totalTokens = runs.reduce((s, r) => s + r.tokensUsed, 0)

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      summary: {
        totalRuns: runs.length,
        totalTokens,
        totalCostUsd: Math.round(totalCost * 1000) / 1000,
      },
      agents,
    })
  } catch (error) {
    logger.error('[admin/operator-agents] Failed to get status', {}, error)
    return NextResponse.json({ error: 'Unauthorized or error' }, { status: 401 })
  }
}

// ============================================================================
// POST — Manually trigger an agent
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const agentType = body.agentType as OperatorAgentType

    if (!agentType || !OPERATOR_MODEL_INTENT[agentType]) {
      return NextResponse.json({ error: 'Invalid agentType' }, { status: 400 })
    }

    const result = await runOperatorAgent(agentType, { triggeredBy: 'manual' })
    return NextResponse.json({ success: true, result })
  } catch (error) {
    logger.error('[admin/operator-agents] Failed to trigger agent', {}, error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
