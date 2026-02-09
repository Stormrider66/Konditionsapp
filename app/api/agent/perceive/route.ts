/**
 * POST /api/agent/perceive
 *
 * Trigger perception for an athlete (creates perception snapshot)
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { createPerception, storePerception, canRunAgent } from '@/lib/agent'

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user, clientId } = resolved

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
