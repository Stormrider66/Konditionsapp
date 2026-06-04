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
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { withAiContext } from '@/lib/ai/usage-logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const requestSchema = z.object({
  testId: z.string().uuid(),
  includePredictions: z.boolean().optional().default(true),
  includeRecommendations: z.boolean().optional().default(true),
  trainingLookbackWeeks: z.number().min(4).max(52).optional().default(12),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig förfrågan'), details: parsed.error.flatten() },
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
        { error: t(locale, 'Test not found or access denied', 'Testet hittades inte eller saknar behörighet') },
        { status: 404 }
      )
    }

    const allowanceDenied = await requireAiAllowance(test.clientId)
    if (allowanceDenied) return allowanceDenied

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
        { error: t(locale, 'Daily AI analysis limit reached', 'Daglig gräns för AI-analys är nådd'), limit: DAILY_LIMIT },
        { status: 429 }
      )
    }

    // Perform analysis
    const startTime = Date.now()
    const result = await withAiContext(
      { userId: user.id, clientId: test.clientId, category: 'performance_analysis' },
      () => analyzeTest(testId, {
        includePredictions,
        includeRecommendations,
        trainingLookbackWeeks,
        locale,
        userId: user.id,
      }),
    )

    if (!result) {
      return NextResponse.json(
        { error: t(locale, 'Could not analyze test - insufficient data', 'Kunde inte analysera testet - otillräcklig data') },
        { status: 400 }
      )
    }

    const duration = Date.now() - startTime

    logger.info('Test analysis completed', {
      userId: user.id,
      testId,
      duration,
      tokensUsed: result.tokensUsed,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Error analyzing test', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to analyze test', 'Kunde inte analysera testet') },
      { status: 500 }
    )
  }
}
