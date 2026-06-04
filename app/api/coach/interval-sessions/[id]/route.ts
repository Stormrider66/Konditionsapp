/**
 * Interval Session API
 *
 * GET    - Get session details
 * PATCH  - Update session (status/rename)
 * DELETE - Delete session
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import {
  getSession,
  updateSession,
  deleteSession,
  getAvailableClients,
} from '@/lib/interval-session/session-service'
import { t, type AppLocale } from '@/lib/interval-session/api-locale'
import { UpdateIntervalSessionInput } from '@/lib/interval-session/types'
import { resolveRequestLocale } from '@/lib/i18n/request-locale'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await context.params

    const session = await getSession(id)

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    if (session.coachId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 403 })
    }

    const availableClients = await getAvailableClients(id, user.id)

    return NextResponse.json({ session, availableClients })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error getting interval session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to get session', 'Kunde inte hämta passet') },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { id } = await context.params

    const body: UpdateIntervalSessionInput = await req.json()

    const session = await updateSession(id, user.id, body)

    if (!session) {
      return NextResponse.json({ error: t(locale, 'Session not found', 'Passet hittades inte') }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    console.error('Error updating interval session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update session', 'Kunde inte uppdatera passet') },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
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
    console.error('Error deleting interval session:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to delete session', 'Kunde inte ta bort passet') },
      { status: 500 }
    )
  }
}
