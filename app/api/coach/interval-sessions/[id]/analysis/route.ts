/**
 * Interval Session Analysis API
 *
 * GET - Get analysis data for charts
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { getAnalysisData } from '@/lib/interval-session/analysis-service'
import { t, type AppLocale } from '@/lib/interval-session/api-locale'
import { resolveRequestLocale } from '@/lib/i18n/request-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await context.params

    const data = await getAnalysisData(id, user.id)

    if (!data) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error getting analysis data:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to get analysis data', 'Kunde inte hämta analysdata') },
      { status: 500 }
    )
  }
}
