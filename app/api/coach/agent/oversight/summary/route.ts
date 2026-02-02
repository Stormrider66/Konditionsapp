/**
 * GET /api/coach/agent/oversight/summary
 *
 * Get summary of pending agent actions for dashboard widget
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Get recent pending actions
    const recentActions = await prisma.agentAction.findMany({
      where: {
        client: { userId: user.id },
        status: 'PROPOSED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ priority: 'asc' }, { proposedAt: 'desc' }],
      take: 5,
      include: {
        client: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      counts: {
        proposed,
        accepted,
        rejected,
        autoApplied,
      },
      recentActions: recentActions.map((a) => ({
        id: a.id,
        actionType: a.actionType,
        clientName: a.client.name,
        priority: a.priority,
      })),
    })
  } catch (error) {
    console.error('Error getting oversight summary:', error)
    return NextResponse.json(
      { error: 'Failed to get summary' },
      { status: 500 }
    )
  }
}
