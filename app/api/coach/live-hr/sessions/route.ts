/**
 * Live HR Sessions API
 *
 * GET  - List coach's sessions
 * POST - Create new session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  createLiveHRSession,
  listCoachSessions,
} from '@/lib/live-hr/session-service'
import { resolveLocale, t, type AppLocale } from '@/lib/live-hr/api-locale'
import { CreateLiveHRSessionInput } from '@/lib/live-hr/types'

export async function GET(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)

    const { searchParams } = new URL(req.url)
    const includeEnded = searchParams.get('includeEnded') === 'true'

    const sessions = await listCoachSessions(user.id, includeEnded)

    return NextResponse.json({ sessions })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error listing live HR sessions:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to list sessions', 'Kunde inte hämta passen') },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)

    const body: CreateLiveHRSessionInput = await req.json()

    const session = await createLiveHRSession(user.id, body)

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error creating live HR session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to create session', 'Kunde inte skapa passet') },
      { status: 500 }
    )
  }
}
