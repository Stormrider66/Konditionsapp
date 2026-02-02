/**
 * GET /api/coach/agent/oversight
 *
 * Get all pending agent actions for the coach's athletes
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import type { AgentActionStatus, Prisma } from '@prisma/client'

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
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status') || 'PROPOSED'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Get coach's user record
    const coachUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, role: true },
    })

    if (!coachUser || coachUser.role !== 'COACH') {
      return NextResponse.json({ error: 'Not a coach' }, { status: 403 })
    }

    // Build where clause
    const where: Prisma.AgentActionWhereInput = {
      client: { userId: user.id }, // Only actions for coach's athletes
      status: status === 'all'
        ? { in: ['PROPOSED', 'ACCEPTED', 'REJECTED', 'AUTO_APPLIED'] as AgentActionStatus[] }
        : status as AgentActionStatus,
    }

    if (clientId) {
      where.clientId = clientId
    }

    // Fetch actions with client info
    const actions = await prisma.agentAction.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // CRITICAL first
        { proposedAt: 'desc' },
      ],
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        perception: {
          select: {
            readinessScore: true,
            acwr: true,
            acwrZone: true,
          },
        },
      },
    })

    // Transform response
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
      client: {
        id: action.client.id,
        name: action.client.name,
        email: action.client.email,
      },
      perception: action.perception,
    }))

    // Get counts
    const [proposed, accepted, rejected, autoApplied] = await Promise.all([
      prisma.agentAction.count({
        where: {
          client: { userId: user.id },
          status: 'PROPOSED',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      prisma.agentAction.count({
        where: { client: { userId: user.id }, status: 'ACCEPTED' },
      }),
      prisma.agentAction.count({
        where: { client: { userId: user.id }, status: 'REJECTED' },
      }),
      prisma.agentAction.count({
        where: { client: { userId: user.id }, status: 'AUTO_APPLIED' },
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
    console.error('Error getting oversight queue:', error)
    return NextResponse.json(
      { error: 'Failed to get oversight queue' },
      { status: 500 }
    )
  }
}
