/**
 * GET/DELETE /api/ai/wod/preferences
 *
 * Athlete-owned learned Dagens pass preferences.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getWODPreferenceProfile, resetWODPreferenceProfile } from '@/lib/ai/wod-learning'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

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

export async function DELETE(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)

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
