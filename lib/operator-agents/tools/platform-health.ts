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
    const since1h = new Date(Date.now() - 60 * 60 * 1000)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [total1h, failed1h, total24h, failed24h] = await Promise.all([
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since1h } } }),
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since1h }, status: 'FAILED' } }),
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since24h } } }),
      prisma.operatorAgentRun.count({ where: { createdAt: { gte: since24h }, status: 'FAILED' } }),
    ])

    const errorRate1h = total1h > 0 ? failed1h / total1h : 0
    const errorRate24h = total24h > 0 ? failed24h / total24h : 0

    return {
      success: true,
      data: {
        totalRuns1h: total1h,
        failedRuns1h: failed1h,
        errorRate: errorRate1h,
        errorRatePercent: Math.round(errorRate1h * 100),
        totalRuns24h: total24h,
        failedRuns24h: failed24h,
        errorRate24h,
        errorRatePercent24h: Math.round(errorRate24h * 100),
        note: 'Use the 1h error rate for alerting. The 24h rate is historical context and may stay elevated after an incident is fixed.',
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
