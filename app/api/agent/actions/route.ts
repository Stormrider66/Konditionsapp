/**
 * GET /api/agent/actions
 *
 * Get agent actions for the current athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import type { AgentActionStatus } from '@prisma/client'

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
    let clientId = searchParams.get('clientId')
    const status = searchParams.get('status') // PROPOSED, ACCEPTED, etc.
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!clientId) {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })

      if (!athleteAccount) {
        return NextResponse.json(
          { error: 'No athlete profile found' },
          { status: 404 }
        )
      }

      clientId = athleteAccount.clientId
    }

    // Build where clause
    const where: {
      clientId: string
      status?: AgentActionStatus
      expiresAt?: { gt: Date }
    } = { clientId }

    if (status) {
      where.status = status as AgentActionStatus
    } else {
      // By default, only show non-expired actions
      where.expiresAt = { gt: new Date() }
    }

    // Fetch actions
    const actions = await prisma.agentAction.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        perception: {
          select: {
            readinessScore: true,
            acwr: true,
            acwrZone: true,
          },
        },
      },
    })

    // Transform to response format
    const response = actions.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      actionData: action.actionData,
      reasoning: action.reasoning,
      confidence: action.confidence,
      confidenceScore: action.confidenceScore,
      priority: action.priority,
      status: action.status,
      targetDate: action.targetDate,
      proposedAt: action.proposedAt,
      expiresAt: action.expiresAt,
      perception: action.perception
        ? {
            readinessScore: action.perception.readinessScore,
            acwr: action.perception.acwr,
            acwrZone: action.perception.acwrZone,
          }
        : null,
    }))

    // Count by status
    const [proposed, accepted, rejected, autoApplied] = await Promise.all([
      prisma.agentAction.count({
        where: { clientId, status: 'PROPOSED', expiresAt: { gt: new Date() } },
      }),
      prisma.agentAction.count({
        where: { clientId, status: 'ACCEPTED' },
      }),
      prisma.agentAction.count({
        where: { clientId, status: 'REJECTED' },
      }),
      prisma.agentAction.count({
        where: { clientId, status: 'AUTO_APPLIED' },
      }),
    ])

    return NextResponse.json({
      actions: response,
      counts: {
        proposed,
        accepted,
        rejected,
        autoApplied,
      },
    })
  } catch (error) {
    console.error('Error getting agent actions:', error)
    return NextResponse.json(
      { error: 'Failed to get agent actions' },
      { status: 500 }
    )
  }
}
