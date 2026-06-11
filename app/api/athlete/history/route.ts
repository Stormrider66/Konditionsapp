/**
 * GET /api/athlete/history?timeframe=30days&type=RUNNING&limit=50&offset=0
 *
 * The athlete's merged workout history (program logs, studio assignments,
 * AI WODs, ad-hoc workouts) with full-timeframe stats. Same implementation
 * as the /athlete/history page via lib/athlete/history-feed.ts.
 * Built for the mobile app (docs/MOBILE_APP_PLAN.md §4).
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getAthleteHistoryFeed } from '@/lib/athlete/history-feed'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const MAX_LIMIT = 200

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 }
      )
    }
    locale = resolveRequestLocale(request, resolved.user.language)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      MAX_LIMIT
    )
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    const feed = await getAthleteHistoryFeed({
      userId: resolved.user.id,
      clientId: resolved.clientId,
      timeframe: searchParams.get('timeframe'),
      typeFilter: searchParams.get('type'),
      fallbackAdHocName: t(locale, 'Workout', 'Träningspass'),
    })

    return NextResponse.json({
      success: true,
      data: {
        timeframe: feed.timeframe,
        items: feed.items.slice(offset, offset + limit),
        total: feed.items.length,
        stats: feed.stats,
      },
    })
  } catch (error) {
    logger.error('Failed to load athlete history feed', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}
