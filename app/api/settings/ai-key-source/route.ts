/**
 * AI Key Source
 *
 * GET /api/settings/ai-key-source - Get where the current user's AI keys come from
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getAiKeySource } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const result = await getAiKeySource(user.id)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('GET /api/settings/ai-key-source error', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to check AI key source', 'Kunde inte kontrollera källan för AI-nycklar') },
      { status: 500 }
    )
  }
}
