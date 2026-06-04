/**
 * AI Configuration Endpoint
 *
 * GET /api/ai/config - Get AI configuration for current user
 *
 * Works for both coaches and athletes:
 * - Coaches: returns their own API keys and model settings
 * - Athletes: returns their coach's API keys and model settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserAIConfig } from '@/lib/ai/user-ai-config'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export async function GET(request: NextRequest) {
  const locale = resolveRequestLocale(request)

  try {
    const config = await getUserAIConfig()

    if (!config) {
      return NextResponse.json(
        { error: t(locale, 'Unauthorized', 'Obehörig'), success: false },
        { status: 401 }
      )
    }

    const rateLimited = await rateLimitJsonResponse('ai:config', config.userId, {
      limit: 60,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    // Format response for FloatingAIChat compatibility
    const keys = [
      {
        provider: 'anthropic',
        configured: config.anthropicConfigured,
        valid: config.anthropicValid,
      },
      {
        provider: 'google',
        configured: config.googleConfigured,
        valid: config.googleValid,
      },
      {
        provider: 'openai',
        configured: config.openaiConfigured,
        valid: config.openaiValid,
      },
    ]

    return NextResponse.json({
      success: true,
      keys,
      hasApiKeys: config.hasApiKeys,
      defaultModel: config.defaultModel,
      isExplicitlySet: config.isExplicitlySet,
      coachId: config.coachId,
      userRole: config.userRole,
      isAthlete: config.isAthlete,
    })
  } catch (error) {
    logger.error('Get AI config error', {}, error)

    return NextResponse.json(
      { error: t(locale, 'Failed to get AI configuration', 'Kunde inte hämta AI-konfiguration'), success: false },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
