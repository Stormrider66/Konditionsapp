/**
 * Training Correlation API
 *
 * POST - Analyze training-performance correlations
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { analyzeTrainingCorrelation } from '@/lib/ai/performance-analysis'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { requireCoachAiBudget } from '@/lib/ai/billing/coach-budget'
import { withAiContext } from '@/lib/ai/usage-logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const requestSchema = z.object({
  clientId: z.string().uuid(),
  lookbackMonths: z.number().min(6).max(36).optional().default(12),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const budgetDenied = await requireCoachAiBudget(user.id)
    if (budgetDenied) return budgetDenied

    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig förfrågan'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { clientId, lookbackMonths } = parsed.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Atleten hittades inte eller saknar behörighet') },
        { status: 404 }
      )
    }

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

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
        { error: t(locale, 'At least 3 tests required for correlation analysis', 'Minst 3 tester krävs för korrelationsanalys'), testCount },
        { status: 400 }
      )
    }

    if (workoutCount < 20) {
      return NextResponse.json(
        {
          error: t(locale, 'Insufficient workout data for correlation analysis', 'Otillräcklig träningsdata för korrelationsanalys'),
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
        { error: t(locale, 'Daily AI analysis limit reached', 'Daglig gräns för AI-analys är nådd'), limit: DAILY_LIMIT },
        { status: 429 }
      )
    }

    // Get API keys and perform correlation analysis
    const apiKeys = await getResolvedAiKeys(user.id)
    const startTime = Date.now()
    const result = await withAiContext(
      { userId: user.id, clientId, category: 'performance_analysis' },
      () => analyzeTrainingCorrelation(clientId, apiKeys, { lookbackMonths, locale }),
    )

    if (!result) {
      return NextResponse.json(
        { error: t(locale, 'Could not analyze correlations - insufficient data', 'Kunde inte analysera korrelationer - otillräcklig data') },
        { status: 400 }
      )
    }

    const duration = Date.now() - startTime

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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Error analyzing training correlation', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to analyze training correlation', 'Kunde inte analysera träningskorrelation') },
      { status: 500 }
    )
  }
}
