/**
 * Managed Agent Monitoring API
 *
 * GET /api/agent-tools/monitor - Get agent session stats, event history,
 * shadow mode comparison data, and cost breakdown.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  getAgentMode,
  getShadowComparison,
} from '@/lib/managed-agents'

export async function GET(req: NextRequest) {
  try {
    const user = await requireCoach()
    const searchParams = req.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30', 10)
    const entityId = searchParams.get('entityId') || undefined

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get session stats
    const sessions = await prisma.managedAgentSession.findMany({
      where: {
        createdAt: { gte: since },
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Aggregate by agent type
    const byAgentType: Record<string, {
      sessions: number
      activeSessions: number
      totalTokens: number
      totalCostUsd: number
      avgTokensPerSession: number
    }> = {}

    for (const session of sessions) {
      if (!byAgentType[session.agentType]) {
        byAgentType[session.agentType] = {
          sessions: 0,
          activeSessions: 0,
          totalTokens: 0,
          totalCostUsd: 0,
          avgTokensPerSession: 0,
        }
      }
      const entry = byAgentType[session.agentType]
      entry.sessions++
      if (session.status === 'ACTIVE') entry.activeSessions++
      entry.totalTokens += session.totalTokensUsed
      entry.totalCostUsd += session.totalCostUsd
    }

    // Calculate averages
    for (const entry of Object.values(byAgentType)) {
      entry.avgTokensPerSession = entry.sessions > 0
        ? Math.round(entry.totalTokens / entry.sessions)
        : 0
      entry.totalCostUsd = Math.round(entry.totalCostUsd * 1000) / 1000
    }

    // Get recent events
    const recentEvents = await prisma.agentEvent.findMany({
      where: {
        createdAt: { gte: since },
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        eventType: true,
        entityId: true,
        processedAt: true,
        createdAt: true,
        result: true,
        session: {
          select: {
            agentType: true,
            modelIntent: true,
            status: true,
          },
        },
      },
    })

    // Event type distribution
    const eventDistribution: Record<string, number> = {}
    for (const event of recentEvents) {
      eventDistribution[event.eventType] = (eventDistribution[event.eventType] || 0) + 1
    }

    // Processing stats
    const processed = recentEvents.filter(e => e.processedAt !== null)
    const unprocessed = recentEvents.filter(e => e.processedAt === null)
    const avgProcessingTime = processed.length > 0
      ? processed.reduce((sum, e) => {
          const diff = e.processedAt!.getTime() - e.createdAt.getTime()
          return sum + diff
        }, 0) / processed.length
      : 0

    // Daily cost trend (last N days)
    const dailyCosts: { date: string; cost: number; tokens: number; sessions: number }[] = []
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      const daySessions = sessions.filter(s => s.createdAt.toISOString().slice(0, 10) === dateStr)
      dailyCosts.push({
        date: dateStr,
        cost: Math.round(daySessions.reduce((s, x) => s + x.totalCostUsd, 0) * 1000) / 1000,
        tokens: daySessions.reduce((s, x) => s + x.totalTokensUsed, 0),
        sessions: daySessions.length,
      })
    }
    dailyCosts.reverse()

    // Shadow comparison if requested
    let shadowComparison = null
    if (entityId && getAgentMode() === 'shadow') {
      shadowComparison = await getShadowComparison(entityId, days)
    }

    return NextResponse.json({
      mode: getAgentMode(),
      period: { days, since: since.toISOString() },
      summary: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.status === 'ACTIVE').length,
        erroredSessions: sessions.filter(s => s.status === 'ERROR').length,
        totalTokens: sessions.reduce((s, x) => s + x.totalTokensUsed, 0),
        totalCostUsd: Math.round(sessions.reduce((s, x) => s + x.totalCostUsd, 0) * 1000) / 1000,
        totalEvents: recentEvents.length,
        processedEvents: processed.length,
        unprocessedEvents: unprocessed.length,
        avgProcessingTimeMs: Math.round(avgProcessingTime),
      },
      byAgentType,
      eventDistribution,
      dailyCosts,
      recentEvents: recentEvents.slice(0, 20).map(e => ({
        id: e.id,
        eventType: e.eventType,
        entityId: e.entityId,
        agentType: e.session?.agentType || null,
        modelIntent: e.session?.modelIntent || null,
        processed: e.processedAt !== null,
        createdAt: e.createdAt,
      })),
      shadowComparison,
    })
  } catch (error) {
    console.error('[agent-tools/monitor] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
