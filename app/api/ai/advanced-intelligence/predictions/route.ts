// app/api/ai/advanced-intelligence/predictions/route.ts
// Predictive goals and race time predictions API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { generatePredictiveGoals, predictRaceTimes, calculateTrainingReadiness } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { logPrediction, logPredictionBatch, createRaceTimeInputSnapshot } from '@/lib/data-moat/prediction-logger'

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

    // Subscription gate
    const denied = await requireFeatureAccess(clientId, 'advanced_intelligence')
    if (denied) return denied

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
      const racePredictions = await predictRaceTimes(clientId, trainingWeeks)
      result.racePredictions = racePredictions

      // Data Moat: Log race time predictions
      if (racePredictions && Array.isArray(racePredictions) && racePredictions.length > 0) {
        const predictionBatch = racePredictions.map((pred) => ({
          athleteId: clientId,
          coachId: user.id,
          predictionType: 'RACE_TIME' as const,
          predictedValue: {
            distance: pred.distance,
            currentPrediction: pred.currentPrediction,
            trainedPrediction: pred.trainedPrediction,
            improvementPercent: pred.improvementPercent,
          },
          confidenceScore: pred.confidence,
          modelVersion: 'race-prediction-v1',
          inputDataSnapshot: createRaceTimeInputSnapshot({
            targetDistance: pred.distance === '5K' ? 5000 : pred.distance === '10K' ? 10000 : pred.distance === 'HALF' ? 21097 : 42195,
          }),
          displayedToUser: true,
        }))

        logPredictionBatch(predictionBatch).catch((err) =>
          logger.error('Failed to log race predictions', {}, err)
        )
      }
    }

    // Training readiness
    if ((type === 'all' || type === 'readiness') && goalDateStr) {
      const goalDate = new Date(goalDateStr)
      const readiness = await calculateTrainingReadiness(clientId, goalDate)
      result.trainingReadiness = readiness

      // Data Moat: Log readiness prediction
      if (readiness) {
        logPrediction({
          athleteId: clientId,
          coachId: user.id,
          predictionType: 'READINESS_SCORE',
          predictedValue: readiness,
          confidenceScore: (readiness as { confidence?: number }).confidence ?? 0.7,
          modelVersion: 'readiness-v1',
          inputDataSnapshot: { goalDate: goalDateStr, generatedAt: new Date().toISOString() },
          displayedToUser: true,
        }).catch((err) => logger.error('Failed to log readiness prediction', {}, err))
      }
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

    // Subscription gate
    const deniedPost = await requireFeatureAccess(clientId, 'advanced_intelligence')
    if (deniedPost) return deniedPost

    const validDistances = ['5K', '10K', 'HALF', 'MARATHON']
    if (!validDistances.includes(targetDistance)) {
      return NextResponse.json(
        { error: `targetDistance måste vara en av: ${validDistances.join(', ')}` },
        { status: 400 }
      )
    }

    const goalPrediction = await generatePredictiveGoals(clientId, targetDistance)

    // Data Moat: Log goal prediction
    if (goalPrediction) {
      const distanceMeters = targetDistance === '5K' ? 5000 : targetDistance === '10K' ? 10000 : targetDistance === 'HALF' ? 21097 : 42195
      logPrediction({
        athleteId: clientId,
        coachId: user.id,
        predictionType: 'RACE_TIME',
        predictedValue: {
          distance: targetDistance,
          predictedTime: goalPrediction.predictedTime,
          predictedPace: goalPrediction.predictedPace,
          confidenceInterval: goalPrediction.confidenceInterval,
          targetDate: goalDate,
        },
        confidenceScore: goalPrediction.confidence,
        modelVersion: 'goal-prediction-v1',
        inputDataSnapshot: createRaceTimeInputSnapshot({
          targetDistance: distanceMeters,
          targetDate: goalDate,
        }),
        validUntil: goalDate ? new Date(goalDate) : undefined,
        displayedToUser: true,
      }).catch((err) => logger.error('Failed to log goal prediction', {}, err))
    }

    let readiness = null
    if (goalDate) {
      readiness = await calculateTrainingReadiness(clientId, new Date(goalDate))

      // Data Moat: Log readiness prediction
      if (readiness) {
        logPrediction({
          athleteId: clientId,
          coachId: user.id,
          predictionType: 'READINESS_SCORE',
          predictedValue: readiness,
          confidenceScore: (readiness as { confidence?: number }).confidence ?? 0.7,
          modelVersion: 'readiness-v1',
          inputDataSnapshot: { targetDistance, goalDate, generatedAt: new Date().toISOString() },
          displayedToUser: true,
        }).catch((err) => logger.error('Failed to log readiness prediction', {}, err))
      }
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
