/**
 * Interval Sessions API
 *
 * GET  - List coach's sessions
 * POST - Create new session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  createIntervalSession,
  listCoachSessions,
} from '@/lib/interval-session/session-service'
import { createSessionSchema } from '@/lib/interval-session/validation'
import { t, type AppLocale } from '@/lib/interval-session/api-locale'
import { resolveRequestLocale } from '@/lib/i18n/request-locale'

export async function GET(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const { searchParams } = new URL(req.url)
    const includeEnded = searchParams.get('includeEnded') === 'true'

    const sessions = await listCoachSessions(user.id, includeEnded)

    return NextResponse.json({ sessions })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error listing interval sessions:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to list sessions', 'Kunde inte hämta passen') },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)

    const body = await req.json()
    const parsed = createSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const session = await createIntervalSession(user.id, parsed.data)

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error creating interval session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to create session', 'Kunde inte skapa passet') },
      { status: 500 }
    )
  }
}
