/**
 * Live Power Push API
 *
 * POST - Push a live Wattbike power reading from an athlete. The active LiveHR
 * session is resolved server-side, so the device only sends the reading.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { pushPowerReading } from '@/lib/live-hr/reading-service'
import { PushPowerReadingInput } from '@/lib/live-hr/types'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
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

    const body: PushPowerReadingInput = await req.json()

    if (typeof body.power !== 'number' || body.power < 0 || body.power > 2500) {
      return NextResponse.json(
        { error: t(locale, 'Invalid power (0-2500 W)', 'Ogiltig effekt (0-2500 W)') },
        { status: 400 }
      )
    }

    // `pushed` is false simply when the athlete isn't in an active session right
    // now — that's not an error, so the device can keep streaming idempotently.
    const pushed = await pushPowerReading(clientId, body)

    return NextResponse.json({ success: true, pushed })
  } catch (error) {
    console.error('Error pushing power reading:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to push reading', 'Kunde inte skicka mätningen') },
      { status: 500 }
    )
  }
}
