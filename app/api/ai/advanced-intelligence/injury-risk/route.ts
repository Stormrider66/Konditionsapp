// app/api/ai/advanced-intelligence/injury-risk/route.ts
// Injury risk prediction API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { calculateInjuryRisk } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { logPrediction, createInjuryRiskInputSnapshot } from '@/lib/data-moat/prediction-logger'

/**
 * GET /api/ai/advanced-intelligence/injury-risk
 * Calculate comprehensive injury risk assessment
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = await rateLimitJsonResponse('ai:advanced:injury-risk', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

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

    const riskAssessment = await calculateInjuryRisk(clientId)

    // Data Moat: Log injury risk prediction for validation
    logPrediction({
      athleteId: clientId,
      coachId: user.id,
      predictionType: 'INJURY_RISK',
      predictedValue: {
        overallRisk: riskAssessment.overallRisk,
        riskScore: riskAssessment.riskScore,
        riskFactors: riskAssessment.riskFactors.map((f) => ({
          name: f.name,
          severity: f.severity,
          contribution: f.contribution,
        })),
      },
      confidenceScore: 0.7, // Default confidence for injury risk model
      modelVersion: 'injury-risk-v1',
      inputDataSnapshot: createInjuryRiskInputSnapshot({
        acuteLoad: riskAssessment.loadAnalysis.weeklyTSS,
        chronicLoad: riskAssessment.loadAnalysis.acwr > 0
          ? riskAssessment.loadAnalysis.weeklyTSS / riskAssessment.loadAnalysis.acwr
          : 0,
        acwr: riskAssessment.loadAnalysis.acwr,
        hrvTrend: undefined,
        sleepScore: undefined,
        fatigueLevel: undefined,
      }),
      displayedToUser: true,
    }).catch((err) => logger.error('Failed to log injury risk prediction', {}, err))

    return NextResponse.json({
      success: true,
      clientId,
      assessment: riskAssessment,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error calculating injury risk', {}, error)
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
