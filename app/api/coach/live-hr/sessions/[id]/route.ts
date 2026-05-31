/**
 * Live HR Session API
 *
 * GET    - Get session details
 * PATCH  - Update session (pause/end/rename)
 * DELETE - Delete session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  getSession,
  updateSession,
  deleteSession,
  getAvailableClients,
} from '@/lib/live-hr/session-service'
import { resolveLocale, t, type AppLocale } from '@/lib/live-hr/api-locale'
import { UpdateLiveHRSessionInput } from '@/lib/live-hr/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params

    const session = await getSession(id)

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    // Verify ownership
    if (session.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 })
    }

    // Get available clients for adding
    const availableClients = await getAvailableClients(id, user.id)

    return NextResponse.json({ session, availableClients })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error getting live HR session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to get session', 'Kunde inte hämta passet') },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveLocale(user.language)
    const { id } = await context.params

    const body: UpdateLiveHRSessionInput = await req.json()

    const session = await updateSession(id, user.id, body)

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error updating live HR session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update session', 'Kunde inte uppdatera passet') },
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

    const deleted = await deleteSession(id, user.id)

    if (!deleted) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error deleting live HR session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to delete session', 'Kunde inte ta bort passet') },
      { status: 500 }
    )
  }
}
