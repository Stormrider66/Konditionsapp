import { NextRequest, NextResponse } from 'next/server'
import { parseISO, isValid } from 'date-fns'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { generateAndSavePerformanceMealGuide } from '@/lib/nutrition/performance-plan'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const body = await request.json().catch(() => ({}))
    const startDate = typeof body?.startDate === 'string' ? parseISO(body.startDate) : new Date()
    if (!isValid(startDate)) {
      return NextResponse.json({ error: t(locale, 'Invalid start date', 'Ogiltigt startdatum') }, { status: 400 })
    }

    const guide = await generateAndSavePerformanceMealGuide({
      clientId: resolved.clientId,
      userId: resolved.user.id,
      locale,
      startDate,
      useAi: body?.useAi !== false,
    })

    return NextResponse.json({ success: true, guide })
  } catch (error) {
    logger.error('performance-plan generate failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Failed to generate performance meal guide', 'Kunde inte skapa Performance Meal Guide') }, { status: 500 })
  }
}
