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
import { requireAiAllowance } from '@/lib/ai/billing/require-ai-allowance'
import { withAiContext } from '@/lib/ai/usage-logger'

const requestSchema = z.object({
  currentTestId: z.string().uuid(),
  previousTestId: z.string().uuid(),
  includeTrainingCorrelation: z.boolean().optional().default(true),
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
        { error: t(locale, 'One or both tests not found or access denied', 'Ett eller båda testerna hittades inte eller saknar behörighet') },
        { status: 404 }
      )
    }

    // Ensure tests are from same client and same type
    if (tests[0].clientId !== tests[1].clientId) {
      return NextResponse.json(
        { error: t(locale, 'Tests must be from the same athlete', 'Testerna måste vara från samma atlet') },
        { status: 400 }
      )
    }

    if (tests[0].testType !== tests[1].testType) {
      return NextResponse.json(
        { error: t(locale, 'Tests must be of the same type to compare', 'Testerna måste vara av samma typ för att jämföras') },
        { status: 400 }
      )
    }

    const clientId = tests[0].clientId
    const allowanceDenied = await requireAiAllowance(clientId)
    if (allowanceDenied) return allowanceDenied

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

    // Perform comparison
    const startTime = Date.now()
    const result = await withAiContext(
      { userId: user.id, clientId, category: 'performance_analysis' },
      () => compareTests(currentTestId, previousTestId, {
        includeTrainingCorrelation,
        locale,
        userId: user.id,
      }),
    )

    if (!result) {
      return NextResponse.json(
        { error: t(locale, 'Could not compare tests - insufficient data', 'Kunde inte jämföra testerna - otillräcklig data') },
        { status: 400 }
      )
    }

    const duration = Date.now() - startTime

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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    logger.error('Error comparing tests', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to compare tests', 'Kunde inte jämföra testerna') },
      { status: 500 }
    )
  }
}
