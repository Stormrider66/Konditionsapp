// app/api/ai/advanced-intelligence/patterns/route.ts
// Training pattern recognition API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { analyzeTrainingPatterns } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireFeatureAccess } from '@/lib/subscription/require-feature-access'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'

type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/ai/advanced-intelligence/patterns
 * Analyze training history patterns for an athlete
 */
export async function GET(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(user.language)

    const rateLimited = await rateLimitJsonResponse('ai:advanced:patterns', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const weeks = parseInt(searchParams.get('weeks') || '12')

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId is required', 'clientId är obligatoriskt') },
        { status: 400 }
      )
    }

    // Prevent IDOR: ensure user can access this clientId
    const allowed = await canAccessClient(user.id, clientId)
    if (!allowed) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Atleten hittades inte') }, { status: 404 })
    }

    // Subscription gate
    const denied = await requireFeatureAccess(clientId, 'advanced_intelligence')
    if (denied) return denied

    const patterns = await analyzeTrainingPatterns(clientId, weeks, locale)

    return NextResponse.json({
      success: true,
      clientId,
      lookbackWeeks: weeks,
      patterns,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error analyzing training patterns', {}, error)
    return NextResponse.json(
      {
        error: t(locale, 'Internal server error', 'Internt serverfel'),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
