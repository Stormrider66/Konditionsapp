/**
 * Push an AI-generated WOD (Workout of the Day) to Garmin.
 *
 * POST /api/ai/wod/[id]/push-garmin
 *
 * Athlete-scoped: the logged-in athlete pushes their OWN WOD to their Garmin
 * Connect account and schedules it for today. Strength/mixed/core WODs use the
 * strength serializer (lap-button sets); cardio WODs use the cardio serializer
 * (timed/distance steps). Re-pushing replaces the previous Garmin workout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { pushAiWodToGarmin } from '@/lib/ai/wod-garmin-push'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    const { id: wodId } = await params
    const result = await pushAiWodToGarmin({ wodId, clientId, locale })
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.status ?? 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error pushing AI WOD to Garmin', {}, error)
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: t(locale, 'Garmin rate limit exceeded. Try again later.', 'Garmins hastighetsgräns har nåtts. Försök igen senare.') },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to send to Garmin', 'Kunde inte skicka till Garmin') },
      { status: 500 }
    )
  }
}
