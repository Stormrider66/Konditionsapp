/**
 * Analyze Test API
 *
 * POST - Analyze a single test using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { analyzeTest } from '@/lib/ai/performance-analysis'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const requestSchema = z.object({
  testId: z.string().uuid(),
  includePredictions: z.boolean().optional().default(true),
  includeRecommendations: z.boolean().optional().default(true),
  trainingLookbackWeeks: z.number().min(4).max(52).optional().default(12),
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

    const { testId, includePredictions, includeRecommendations, trainingLookbackWeeks } = parsed.data

    // Verify test belongs to coach's client
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        client: { userId: user.id },
      },
      select: { id: true, clientId: true },
    })

    if (!test) {
      return NextResponse.json(
        { error: 'Test not found or access denied' },
        { status: 404 }
      )
    }

    // Check AI budget (simple check - could be more sophisticated)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const usageToday = await prisma.aIUsageLog.count({
      where: {
        userId: user.id,
        createdAt: { gte: today },
        category: 'performance_analysis',
      },
    })

    const DAILY_LIMIT = 20 // Could be subscription-based
    if (usageToday >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: 'Daily AI analysis limit reached', limit: DAILY_LIMIT },
        { status: 429 }
      )
    }

    // Perform analysis
    const startTime = Date.now()
    const result = await analyzeTest(testId, {
      includePredictions,
      includeRecommendations,
      trainingLookbackWeeks,
      userId: user.id,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Could not analyze test - insufficient data' },
        { status: 400 }
      )
    }

    const duration = Date.now() - startTime

    // Log usage
    await prisma.aIUsageLog.create({
      data: {
        userId: user.id,
        category: 'performance_analysis',
        provider: result.modelUsed?.startsWith('gemini') ? 'GOOGLE' : result.modelUsed?.startsWith('gpt') ? 'OPENAI' : 'ANTHROPIC',
        model: result.modelUsed ?? 'unknown',
        inputTokens: Math.floor((result.tokensUsed ?? 0) * 0.7), // Approximate split
        outputTokens: Math.floor((result.tokensUsed ?? 0) * 0.3),
        estimatedCost: (result.tokensUsed ?? 0) * 0.000002, // Gemini pricing
      },
    })

    logger.info('Test analysis completed', {
      userId: user.id,
      testId,
      duration,
      tokensUsed: result.tokensUsed,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Error analyzing test', {}, error)
    return NextResponse.json(
      { error: 'Failed to analyze test' },
      { status: 500 }
    )
  }
}
