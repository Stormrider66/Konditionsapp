/**
 * Interval Session Timer API
 *
 * POST - Start the timer (SETUP → ACTIVE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { startTimer } from '@/lib/interval-session/session-service'
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

    const session = await startTimer(id, user.id)

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error starting timer:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to start timer', 'Kunde inte starta timern') },
      { status: 500 }
    )
  }
}
