/**
 * Live HR Session Participants API
 *
 * POST   - Add participant(s) to session
 * DELETE - Remove participant from session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  addParticipant,
  removeParticipant,
  addTeamParticipants,
} from '@/lib/live-hr/session-service'
import { resolveLocale, t, type AppLocale } from '@/lib/live-hr/api-locale'

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

    // If teamId is provided, add all team members
    if (body.teamId) {
      const count = await addTeamParticipants(id, user.id, body.teamId)
      return NextResponse.json({ added: count })
    }

    // Otherwise add individual client
    if (!body.clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId or teamId required', 'clientId eller teamId är obligatoriskt') },
        { status: 400 }
      )
    }

    const success = await addParticipant(id, user.id, body.clientId)

    if (!success) {
      return NextResponse.json(
        { error: t(locale, 'Failed to add participant', 'Kunde inte lägga till deltagaren') },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
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

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'clientId required', 'clientId är obligatoriskt') },
        { status: 400 }
      )
    }

    const success = await removeParticipant(id, user.id, clientId)

    if (!success) {
      return NextResponse.json(
        { error: t(locale, 'Failed to remove participant', 'Kunde inte ta bort deltagaren') },
        { status: 400 }
      )
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
