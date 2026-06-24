import { NextRequest, NextResponse } from 'next/server'
import { isValid, parseISO } from 'date-fns'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { getPerformanceMealGuideForDate } from '@/lib/nutrition/performance-plan'
import { dayKeyInTimeZone } from '@/lib/nutrition/day-key'
import { getAthleteTimezone } from '@/lib/nutrition/athlete-day'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    if (dateParam && !isValid(parseISO(dateParam))) {
      return NextResponse.json({ error: t(locale, 'Invalid date', 'Ogiltigt datum') }, { status: 400 })
    }

    const timezone = await getAthleteTimezone(resolved.clientId)
    const key = dateParam || dayKeyInTimeZone(new Date(), timezone)
    const guide = await getPerformanceMealGuideForDate(resolved.clientId, key)

    if (!guide) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'No active performance meal guide found', 'Ingen aktiv Performance Meal Guide hittades'),
          canGenerate: true,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, guide })
  } catch (error) {
    logger.error('performance-plan current failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Failed to load performance meal guide', 'Kunde inte hämta Performance Meal Guide') }, { status: 500 })
  }
}
