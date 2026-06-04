/**
 * Interval Session Lactate API
 *
 * POST - Record lactate measurement
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { recordLactate } from '@/lib/interval-session/lactate-service'
import { recordLactateSchema } from '@/lib/interval-session/validation'
import {
  t,
  translateIntervalSessionError,
  type AppLocale,
} from '@/lib/interval-session/api-locale'
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

    const body = await req.json()
    const parsed = recordLactateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await recordLactate(
      id,
      user.id,
      parsed.data.clientId,
      parsed.data.intervalNumber,
      parsed.data.lactate,
      parsed.data.heartRate,
      parsed.data.notes
    )

    if (!result.success) {
      return NextResponse.json({ error: translateIntervalSessionError(locale, result.error) }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error recording lactate:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to record lactate', 'Kunde inte registrera laktat') },
      { status: 500 }
    )
  }
}
