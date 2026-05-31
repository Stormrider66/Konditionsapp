/**
 * Interval Session Garmin Sync API
 *
 * POST - Trigger Garmin enrichment for all participants
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { syncGarminForSession } from '@/lib/interval-session/garmin-enrichment'
import {
  resolveLocale,
  t,
  translateIntervalSessionError,
  type AppLocale,
} from '@/lib/interval-session/api-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'
  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params

    const rawResults = await syncGarminForSession(id, user.id)
    const results = rawResults.map((result) => ({
      ...result,
      error: result.error ? translateIntervalSessionError(locale, result.error) : undefined,
    }))

    if (results.length === 0) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    const matchedCount = results.filter((r) => r.matched).length

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        matched: matchedCount,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error syncing Garmin data:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to sync Garmin data', 'Kunde inte synka Garmin-data') },
      { status: 500 }
    )
  }
}
