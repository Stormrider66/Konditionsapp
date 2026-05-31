/**
 * Interval Session Advance API
 *
 * POST - Advance to next interval
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { advanceInterval } from '@/lib/interval-session/session-service'
import { resolveLocale, t, type AppLocale } from '@/lib/interval-session/api-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'
  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params

    const session = await advanceInterval(id, user.id)

    if (!session) {
      return NextResponse.json(
        { error: t(locale, 'Session not found or ended', 'Passet hittades inte eller är avslutat') },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error advancing interval:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to advance interval', 'Kunde inte gå vidare till nästa intervall') },
      { status: 500 }
    )
  }
}
