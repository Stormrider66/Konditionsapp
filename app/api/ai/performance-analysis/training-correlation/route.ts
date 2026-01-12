/**
 * Training Correlation API
 *
 * POST - Analyze training-performance correlations
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { analyzeTrainingCorrelation } from '@/lib/ai/performance-analysis'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const requestSchema = z.object({
  clientId: z.string().uuid(),
  lookbackMonths: z.number().min(6).max(36).optional().default(12),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { clientId, lookbackMonths } = parsed.data

    // Verify client belongs to coach
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
      select: { id: true, name: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      )
    }

    // Check test and workout count
    const since = new Date(Date.now() - lookbackMonths * 30 * 24 * 60 * 60 * 1000)

    const [testCount, stravaCount, garminCount] = await Promise.all([
      prisma.test.count({
        where: { clientId, testDate: { gte: since } },
      }),
      prisma.stravaActivity.count({
        where: { clientId, startDate: { gte: since } },
      }),
      prisma.garminActivity.count({
        where: { clientId, startDate: { gte: since } },
      }),
    ])

    const workoutCount = stravaCount + garminCount

    if (testCount < 3) {
      return NextResponse.json(
        { error: 'At least 3 tests required for correlation analysis', testCount },
        { status: 400 }
      )
    }

    if (workoutCount < 20) {
      return NextResponse.json(
        {
          error: 'Insufficient workout data for correlation analysis',
          workoutCount,
          minimum: 20,
        },
        { status: 400 }
      )
    }

    // Check AI budget
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const usageToday = await prisma.aIUsageLog.count({
      where: {
        userId: user.id,
        createdAt: { gte: today },
        category: 'performance_analysis',
      },
    })

    const DAILY_LIMIT = 20
    if (usageToday >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: 'Daily AI analysis limit reached', limit: DAILY_LIMIT },
        { status: 429 }
      )
    }

    // Perform correlation analysis
    const startTime = Date.now()
    const result = await analyzeTrainingCorrelation(clientId, { lookbackMonths })

    if (!result) {
      return NextResponse.json(
        { error: 'Could not analyze correlations - insufficient data' },
        { status: 400 }
      )
    }

    const duration = Date.now() - startTime

    // Log usage
    await prisma.aIUsageLog.create({
      data: {
        userId: user.id,
        category: 'performance_analysis',
        provider: 'ANTHROPIC',
        model: result.modelUsed ?? 'claude-sonnet-4-20250514',
        inputTokens: Math.floor((result.tokensUsed ?? 0) * 0.7),
        outputTokens: Math.floor((result.tokensUsed ?? 0) * 0.3),
        estimatedCost: (result.tokensUsed ?? 0) * 0.000003,
      },
    })

    logger.info('Training correlation analysis completed', {
      userId: user.id,
      clientId,
      lookbackMonths,
      testCount,
      workoutCount,
      duration,
      tokensUsed: result.tokensUsed,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Error analyzing training correlation', {}, error)
    return NextResponse.json(
      { error: 'Failed to analyze training correlation' },
      { status: 500 }
    )
  }
}
