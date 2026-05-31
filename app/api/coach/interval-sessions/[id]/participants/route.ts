/**
 * Interval Session Participants API
 *
 * POST   - Add participant
 * DELETE - Remove participant
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  addParticipant,
  removeParticipant,
} from '@/lib/interval-session/session-service'
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

    const { clientId } = await req.json()

    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId required', 'clientId är obligatoriskt') }, { status: 400 })
    }

    const success = await addParticipant(id, user.id, clientId)

    if (!success) {
      return NextResponse.json({ error: t(locale, 'Failed to add participant', 'Kunde inte lägga till deltagaren') }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error adding participant:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to add participant', 'Kunde inte lägga till deltagaren') },
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

    const { clientId } = await req.json()

    if (!clientId) {
      return NextResponse.json({ error: t(locale, 'clientId required', 'clientId är obligatoriskt') }, { status: 400 })
    }

    const success = await removeParticipant(id, user.id, clientId)

    if (!success) {
      return NextResponse.json({ error: t(locale, 'Failed to remove participant', 'Kunde inte ta bort deltagaren') }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error removing participant:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to remove participant', 'Kunde inte ta bort deltagaren') },
      { status: 500 }
    )
  }
}
