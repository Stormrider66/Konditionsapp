/**
 * POST /api/agent/decide
 *
 * Run decision engine for an athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import {
  createPerception,
  storePerception,
  getLatestPerception,
  isPerceptionStale,
  makeDecisions,
  storeDecisions,
  canRunAgent,
} from '@/lib/agent'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let clientId = body.clientId
    const forcePerception = body.forcePerception ?? false

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

    // Check if agent can run
    const canRun = await canRunAgent(clientId)
    if (!canRun.canRun) {
      return NextResponse.json(
        { error: 'Agent cannot run', reason: canRun.reason },
        { status: 400 }
      )
    }

    // Get or create perception
    let perceptionId: string
    let perception = await getLatestPerception(clientId)

    // Create new perception if stale or forced
    if (!perception || forcePerception || (await isPerceptionStale(clientId))) {
      perception = await createPerception(clientId)
      perceptionId = await storePerception(perception)
    } else {
      // Use latest perception
      const latest = await prisma.agentPerception.findFirst({
        where: { clientId },
        orderBy: { perceivedAt: 'desc' },
        select: { id: true },
      })
      perceptionId = latest?.id ?? ''
    }

    // Make decisions
    const actions = await makeDecisions(perception)

    // Store decisions
    const actionIds = await storeDecisions(actions, perceptionId, clientId)

    // Get stored actions for response
    const storedActions = await prisma.agentAction.findMany({
      where: { id: { in: actionIds } },
      select: {
        id: true,
        actionType: true,
        confidence: true,
        confidenceScore: true,
        priority: true,
        status: true,
        reasoning: true,
      },
    })

    return NextResponse.json({
      success: true,
      perceptionId,
      actions: storedActions,
      summary: {
        totalActions: storedActions.length,
        proposed: storedActions.filter((a) => a.status === 'PROPOSED').length,
        autoApplied: storedActions.filter((a) => a.status === 'AUTO_APPLIED').length,
      },
    })
  } catch (error) {
    console.error('Error running decision engine:', error)
    return NextResponse.json(
      { error: 'Failed to run decision engine' },
      { status: 500 }
    )
  }
}
