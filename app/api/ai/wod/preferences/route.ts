/**
 * GET/DELETE /api/ai/wod/preferences
 *
 * Athlete-owned learned Dagens pass preferences.
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getWODPreferenceProfile, resetWODPreferenceProfile } from '@/lib/ai/wod-learning'
import { logger } from '@/lib/logger'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET() {
  let locale: AppLocale = 'en'

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolved.user.language === 'sv' ? 'sv' : 'en'

    const profile = await getWODPreferenceProfile(resolved.clientId)
    return NextResponse.json({ profile })
  } catch (error) {
    logger.error('Failed to fetch WOD preferences', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch WOD preferences', 'Kunde inte hämta inställningar för dagens pass') },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  let locale: AppLocale = 'en'

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolved.user.language === 'sv' ? 'sv' : 'en'

    await resetWODPreferenceProfile(resolved.clientId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to reset WOD preferences', {}, error)
    return NextResponse.json(
      { error: t(locale, 'Failed to reset WOD preferences', 'Kunde inte återställa inställningar för dagens pass') },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
