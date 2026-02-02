/**
 * GET /api/coach/agent/metrics
 *
 * Get agent performance metrics for the coach
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get('range') || '30d'

    // Calculate date range
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all actions for coach's athletes in range
    const actions = await prisma.agentAction.findMany({
      where: {
        client: { userId: user.id },
        createdAt: { gte: startDate },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    // Calculate summary
    const summary = {
      totalActions: actions.length,
      autoApplied: actions.filter((a) => a.status === 'AUTO_APPLIED').length,
      accepted: actions.filter((a) => a.status === 'ACCEPTED').length,
      rejected: actions.filter((a) => a.status === 'REJECTED').length,
      overridden: actions.filter((a) => a.coachOverride).length,
      acceptanceRate: 0,
      overrideRate: 0,
    }

    const decidedActions = summary.autoApplied + summary.accepted + summary.rejected
    if (decidedActions > 0) {
      summary.acceptanceRate =
        ((summary.autoApplied + summary.accepted) / decidedActions) * 100
      summary.overrideRate = (summary.overridden / decidedActions) * 100
    }

    // Group by action type
    const byActionType = Object.entries(
      actions.reduce(
        (acc, a) => {
          if (!acc[a.actionType]) {
            acc[a.actionType] = { total: 0, accepted: 0, rejected: 0, autoApplied: 0 }
          }
          acc[a.actionType].total++
          if (a.status === 'ACCEPTED') acc[a.actionType].accepted++
          if (a.status === 'REJECTED') acc[a.actionType].rejected++
          if (a.status === 'AUTO_APPLIED') acc[a.actionType].autoApplied++
          return acc
        },
        {} as Record<string, { total: number; accepted: number; rejected: number; autoApplied: number }>
      )
    ).map(([actionType, stats]) => ({ actionType, ...stats }))

    // Group by athlete
    const byAthlete = Object.entries(
      actions.reduce(
        (acc, a) => {
          if (!acc[a.clientId]) {
            acc[a.clientId] = { clientName: a.client.name, total: 0, accepted: 0, rejected: 0 }
          }
          acc[a.clientId].total++
          if (a.status === 'ACCEPTED' || a.status === 'AUTO_APPLIED') acc[a.clientId].accepted++
          if (a.status === 'REJECTED') acc[a.clientId].rejected++
          return acc
        },
        {} as Record<string, { clientName: string; total: number; accepted: number; rejected: number }>
      )
    ).map(([clientId, stats]) => ({ clientId, ...stats }))

    // Generate trend data (daily counts)
    const trendMap = new Map<string, { proposed: number; autoApplied: number; accepted: number; rejected: number }>()

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      trendMap.set(dateStr, { proposed: 0, autoApplied: 0, accepted: 0, rejected: 0 })
    }

    // Fill in counts
    for (const action of actions) {
      const dateStr = action.createdAt.toISOString().split('T')[0]
      const dayData = trendMap.get(dateStr)
      if (dayData) {
        dayData.proposed++
        if (action.status === 'AUTO_APPLIED') dayData.autoApplied++
        if (action.status === 'ACCEPTED') dayData.accepted++
        if (action.status === 'REJECTED') dayData.rejected++
      }
    }

    const trends = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Confidence analysis
    const confidenceGroups: Record<string, { total: number; successful: number }> = {
      LOW: { total: 0, successful: 0 },
      MEDIUM: { total: 0, successful: 0 },
      HIGH: { total: 0, successful: 0 },
      VERY_HIGH: { total: 0, successful: 0 },
    }

    let totalConfidence = 0
    let confidenceCount = 0

    for (const action of actions) {
      if (action.status === 'PROPOSED') continue // Skip pending

      const group = confidenceGroups[action.confidence]
      if (group) {
        group.total++
        if (action.status === 'AUTO_APPLIED' || action.status === 'ACCEPTED') {
          group.successful++
        }
      }

      totalConfidence += action.confidenceScore
      confidenceCount++
    }

    const accuracyByConfidence = Object.entries(confidenceGroups).map(([level, data]) => ({
      level,
      total: data.total,
      successful: data.successful,
      rate: data.total > 0 ? (data.successful / data.total) * 100 : 0,
    }))

    const confidence = {
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      accuracyByConfidence,
    }

    return NextResponse.json({
      summary,
      byActionType,
      byAthlete,
      trends,
      confidence,
    })
  } catch (error) {
    console.error('Error getting agent metrics:', error)
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    )
  }
}
