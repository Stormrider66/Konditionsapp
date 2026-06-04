/**
 * Interval Session Rest Timer API
 *
 * POST - Manually start group rest timer
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { startGroupRest } from '@/lib/interval-session/session-service'
import { t, type AppLocale } from '@/lib/interval-session/api-locale'
import { resolveRequestLocale } from '@/lib/i18n/request-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await context.params

    const result = await startGroupRest(id, user.id)

    if (!result) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error starting group rest:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to start group rest', 'Kunde inte starta gruppvilan') },
      { status: 500 }
    )
  }
}
