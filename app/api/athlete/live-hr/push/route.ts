/**
 * Live HR Push API
 *
 * POST - Push HR reading from athlete/device
 * GET  - Get active session for athlete
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { pushHRReading, getActiveSessionForAthlete } from '@/lib/live-hr/reading-service'
import { PushHRReadingInput } from '@/lib/live-hr/types'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

export async function POST(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(req, resolved.user.language)
    const { clientId } = resolved

    const body: PushHRReadingInput = await req.json()

    // Validate heart rate
    if (!body.heartRate || body.heartRate < 30 || body.heartRate > 250) {
      return NextResponse.json(
        { error: t(locale, 'Invalid heart rate (must be 30-250 bpm)', 'Ogiltig puls (måste vara 30-250 bpm)') },
        { status: 400 }
      )
    }

    if (!body.sessionId) {
      return NextResponse.json(
        { error: t(locale, 'sessionId required', 'sessionId krävs') },
        { status: 400 }
      )
    }

    const success = await pushHRReading(clientId, body)

    if (!success) {
      return NextResponse.json(
        { error: t(locale, 'Failed to push reading (not in active session)', 'Kunde inte skicka mätningen (inte i ett aktivt pass)') },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error pushing HR reading:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to push reading', 'Kunde inte skicka mätningen') },
      { status: 500 }
    )
  }
}

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, resolved.user.language)
    const { clientId } = resolved

    const activeSession = await getActiveSessionForAthlete(clientId)

    return NextResponse.json({ activeSession })
  } catch (error) {
    console.error('Error getting active session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to get active session', 'Kunde inte hämta aktivt pass') },
      { status: 500 }
    )
  }
}
