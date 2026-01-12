/**
 * Trend Analysis API
 *
 * POST - Analyze long-term performance trends
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { analyzeTrends } from '@/lib/ai/performance-analysis'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const requestSchema = z.object({
  clientId: z.string().uuid(),
  months: z.number().min(3).max(36).optional().default(12),
  metrics: z.array(z.enum(['vo2max', 'lt1', 'lt2', 'economy', 'maxHR'])).optional(),
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

    const { clientId, months, metrics } = parsed.data

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

    // Check test count
    const testCount = await prisma.test.count({
      where: {
        clientId,
        testDate: {
          gte: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000),
        },
      },
    })

    if (testCount < 2) {
      return NextResponse.json(
        { error: 'At least 2 tests required for trend analysis', testCount },
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

    // Perform trend analysis
    const startTime = Date.now()
    const result = await analyzeTrends(clientId, { months, metrics, userId: user.id })

    if (!result) {
      return NextResponse.json(
        { error: 'Could not analyze trends - insufficient data' },
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

    logger.info('Trend analysis completed', {
      userId: user.id,
      clientId,
      months,
      testCount,
      duration,
      tokensUsed: result.tokensUsed,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Error analyzing trends', {}, error)
    return NextResponse.json(
      { error: 'Failed to analyze trends' },
      { status: 500 }
    )
  }
}
