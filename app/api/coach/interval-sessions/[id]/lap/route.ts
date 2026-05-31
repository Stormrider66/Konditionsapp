/**
 * Interval Session Lap API
 *
 * POST   - Record a lap
 * DELETE - Undo a lap
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { recordLap, deleteLap } from '@/lib/interval-session/timing-service'
import { recordLapSchema, deleteLapSchema } from '@/lib/interval-session/validation'
import { checkAndStartGroupRest } from '@/lib/interval-session/session-service'
import {
  resolveLocale,
  t,
  translateIntervalSessionError,
  type AppLocale,
} from '@/lib/interval-session/api-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'
  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params

    const body = await req.json()
    const parsed = recordLapSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await recordLap(id, user.id, parsed.data.clientId, parsed.data.cumulativeMs)

    if (!result.success) {
      return NextResponse.json({ error: translateIntervalSessionError(locale, result.error) }, { status: 400 })
    }

    // Auto-start group rest when all athletes have tapped (GROUP mode only)
    await checkAndStartGroupRest(id, user.id)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error recording lap:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to record lap', 'Kunde inte registrera varvet') },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'
  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params

    const body = await req.json()
    const parsed = deleteLapSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid input', 'Ogiltig inmatning'), details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const deleted = await deleteLap(id, user.id, parsed.data.clientId, parsed.data.intervalNumber)

    if (!deleted) {
      return NextResponse.json({ error: t(locale, 'Lap not found', 'Varvet hittades inte') }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error deleting lap:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to delete lap', 'Kunde inte ta bort varvet') },
      { status: 500 }
    )
  }
}
