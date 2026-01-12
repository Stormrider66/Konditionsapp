/**
 * Compare Tests API
 *
 * POST - Compare two tests using AI
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { compareTests } from '@/lib/ai/performance-analysis'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const requestSchema = z.object({
  currentTestId: z.string().uuid(),
  previousTestId: z.string().uuid(),
  includeTrainingCorrelation: z.boolean().optional().default(true),
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

    const { currentTestId, previousTestId, includeTrainingCorrelation } = parsed.data

    // Verify both tests belong to coach's clients
    const tests = await prisma.test.findMany({
      where: {
        id: { in: [currentTestId, previousTestId] },
        client: { userId: user.id },
      },
      select: { id: true, clientId: true, testType: true },
    })

    if (tests.length !== 2) {
      return NextResponse.json(
        { error: 'One or both tests not found or access denied' },
        { status: 404 }
      )
    }

    // Ensure tests are from same client and same type
    if (tests[0].clientId !== tests[1].clientId) {
      return NextResponse.json(
        { error: 'Tests must be from the same athlete' },
        { status: 400 }
      )
    }

    if (tests[0].testType !== tests[1].testType) {
      return NextResponse.json(
        { error: 'Tests must be of the same type to compare' },
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

    // Perform comparison
    const startTime = Date.now()
    const result = await compareTests(currentTestId, previousTestId, {
      includeTrainingCorrelation,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Could not compare tests - insufficient data' },
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

    logger.info('Test comparison completed', {
      userId: user.id,
      currentTestId,
      previousTestId,
      duration,
      tokensUsed: result.tokensUsed,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Error comparing tests', {}, error)
    return NextResponse.json(
      { error: 'Failed to compare tests' },
      { status: 500 }
    )
  }
}
