/**
 * POST /api/agent/perceive
 *
 * Trigger perception for an athlete (creates perception snapshot)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createPerception, storePerception, canRunAgent } from '@/lib/agent'

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

    // Create and store perception
    const perception = await createPerception(clientId)
    const perceptionId = await storePerception(perception)

    return NextResponse.json({
      success: true,
      perceptionId,
      perception: {
        perceivedAt: perception.perceivedAt,
        readinessScore: perception.readiness.readinessScore,
        acwr: perception.trainingLoad.acwr,
        acwrZone: perception.trainingLoad.acwrZone,
        hasActiveInjury: perception.injury.hasActiveInjury,
        patternSeverity: perception.patterns.severity,
      },
    })
  } catch (error) {
    console.error('Error creating perception:', error)
    return NextResponse.json(
      { error: 'Failed to create perception' },
      { status: 500 }
    )
  }
}
