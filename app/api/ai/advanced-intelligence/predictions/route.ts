// app/api/ai/advanced-intelligence/predictions/route.ts
// Predictive goals and race time predictions API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { generatePredictiveGoals, predictRaceTimes, calculateTrainingReadiness } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'

/**
 * GET /api/ai/advanced-intelligence/predictions
 * Get goal predictions and race time estimates
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:advanced:predictions:get', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const type = searchParams.get('type') || 'all' // 'goals', 'race-times', 'readiness', 'all'
    const distance = searchParams.get('distance') as '5K' | '10K' | 'HALF' | 'MARATHON' | null
    const trainingWeeks = parseInt(searchParams.get('trainingWeeks') || '12')
    const goalDateStr = searchParams.get('goalDate')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId är obligatoriskt' },
        { status: 400 }
      )
    }

    // Prevent IDOR: ensure user can access this clientId
    const allowed = await canAccessClient(user.id, clientId)
    if (!allowed) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const result: Record<string, unknown> = {
      success: true,
      clientId,
      generatedAt: new Date().toISOString(),
    }

    // Goal predictions
    if ((type === 'all' || type === 'goals') && distance) {
      result.goalPrediction = await generatePredictiveGoals(clientId, distance)
    }

    // Race time predictions
    if (type === 'all' || type === 'race-times') {
      result.racePredictions = await predictRaceTimes(clientId, trainingWeeks)
    }

    // Training readiness
    if ((type === 'all' || type === 'readiness') && goalDateStr) {
      const goalDate = new Date(goalDateStr)
      result.trainingReadiness = await calculateTrainingReadiness(clientId, goalDate)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error generating predictions', {}, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/advanced-intelligence/predictions
 * Generate specific goal prediction
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:advanced:predictions:post', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { clientId, targetDistance, goalDate } = body

    if (!clientId || !targetDistance) {
      return NextResponse.json(
        { error: 'clientId och targetDistance är obligatoriska' },
        { status: 400 }
      )
    }

    // Prevent IDOR: ensure user can access this clientId
    const allowed = await canAccessClient(user.id, clientId)
    if (!allowed) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const validDistances = ['5K', '10K', 'HALF', 'MARATHON']
    if (!validDistances.includes(targetDistance)) {
      return NextResponse.json(
        { error: `targetDistance måste vara en av: ${validDistances.join(', ')}` },
        { status: 400 }
      )
    }

    const goalPrediction = await generatePredictiveGoals(clientId, targetDistance)

    let readiness = null
    if (goalDate) {
      readiness = await calculateTrainingReadiness(clientId, new Date(goalDate))
    }

    return NextResponse.json({
      success: true,
      clientId,
      targetDistance,
      goalPrediction,
      readiness,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error generating goal prediction', {}, error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
