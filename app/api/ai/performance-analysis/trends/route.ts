/**
 * Trend Analysis API
 *
 * POST - Analyze long-term performance trends
 */

import { NextRequest, NextResponse } from 'next/server'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { analyzeTrends } from '@/lib/ai/performance-analysis'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { withAiContext } from '@/lib/ai/usage-logger'

const requestSchema = z.object({
  clientId: z.string().uuid(),
  months: z.number().min(3).max(36).optional().default(12),
  metrics: z.array(z.enum(['vo2max', 'lt1', 'lt2', 'economy', 'maxHR'])).optional(),
})

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'

    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid request', 'Ogiltig förfrågan'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { clientId, months, metrics } = parsed.data

    const hasAccess = await canAccessClient(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Client not found or access denied', 'Atleten hittades inte eller saknar behörighet') },
        { status: 404 }
      )
    }

    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

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
        { error: t(locale, 'At least 2 tests required for trend analysis', 'Minst 2 tester krävs för trendanalys'), testCount },
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

    // Perform trend analysis
    const startTime = Date.now()
    const result = await withAiContext(
      { userId: user.id, clientId, category: 'performance_analysis' },
      () => analyzeTrends(clientId, { months, metrics, locale, userId: user.id }),
    )

    if (!result) {
      return NextResponse.json(
        { error: t(locale, 'Could not analyze trends - insufficient data', 'Kunde inte analysera trender - otillräcklig data') },
        { status: 400 }
      )
    }

    const duration = Date.now() - startTime

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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Error analyzing trends', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to analyze trends', 'Kunde inte analysera trender') },
      { status: 500 }
    )
  }
}
