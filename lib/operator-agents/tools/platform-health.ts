import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { OperatorToolResult } from '../types'
import { sendFounderEmail } from './_shared'

// ============================================================================
// PLATFORM HEALTH TOOLS
// ============================================================================

export async function getSentryErrors(minutes: number = 15): Promise<OperatorToolResult> {
  // Sentry API integration — for now, read from recent logs
  // In production, query Sentry's Issues API with a date filter
  try {
    const since = new Date(Date.now() - minutes * 60 * 1000)

    // Placeholder: count operator agent failures as a proxy
    // until Sentry API integration is wired up
    const recentFailures = await prisma.operatorAgentRun.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: since },
      },
    })

    return {
      success: true,
      data: {
        since: since.toISOString(),
        minutes,
        operatorAgentFailures: recentFailures,
        // TODO: integrate Sentry Issues API
        note: 'Sentry API integration pending - showing operator agent failures as proxy',
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getCronJobFailures(hours: number = 1): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const failures = await prisma.operatorAgentRun.findMany({
      where: {
        status: 'FAILED',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        agentType: true,
        errorMessage: true,
        createdAt: true,
      },
    })

    // Group by agent type to detect consecutive failures
    const byAgent: Record<string, number> = {}
    for (const f of failures) {
      byAgent[f.agentType] = (byAgent[f.agentType] || 0) + 1
    }

    return {
      success: true,
      data: {
        totalFailures: failures.length,
        consecutiveFailures: Object.entries(byAgent).filter(([_, c]) => c >= 3).map(([agent]) => agent),
        failures: failures.slice(0, 10),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getAgentErrorRate(): Promise<OperatorToolResult> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [total, failed] = await Promise.all([
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since } } }),
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since }, status: 'FAILED' } }),
    ])

    const errorRate = total > 0 ? failed / total : 0

    return {
      success: true,
      data: {
        totalRuns24h: total,
        failedRuns24h: failed,
        errorRate,
        errorRatePercent: Math.round(errorRate * 100),
      },
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function logHealthSnapshot(data: Record<string, unknown>): Promise<OperatorToolResult> {
  // Store snapshot in OperatorAgentRun.details for the current run
  // (No separate snapshots table — details JSON is enough)
  logger.info('[operator-agents] Health snapshot', data)
  return { success: true, data: { logged: true } }
}

export async function alertFounder(
  severity: string,
  title: string,
  message: string
): Promise<OperatorToolResult> {
  const result = await sendFounderEmail(`[${severity}] ${title}`, message)
  return {
    success: true,
    data: result,
  }
}

// ============================================================================
// SUPPORT AGENT TOOLS
// ============================================================================
