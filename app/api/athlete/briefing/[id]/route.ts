/**
 * Athlete Briefing Actions API
 *
 * PATCH /api/athlete/briefing/[id] - Update briefing (read/dismiss)
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PATCH(request: Request, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const { id } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    const { clientId } = resolved

    // Verify briefing belongs to this athlete
    const briefing = await prisma.aIBriefing.findFirst({
      where: {
        id,
        clientId,
      },
    })

    if (!briefing) {
      return NextResponse.json(
        { error: t(locale, 'Briefing not found', 'Briefingen hittades inte') },
        { status: 404 }
      )
    }

    // Parse action from body
    const body = await request.json()
    const { action } = body

    if (action === 'read') {
      await prisma.aIBriefing.update({
        where: { id },
        data: { readAt: new Date() },
      })
      return NextResponse.json({ success: true, action: 'read' })
    }

    if (action === 'dismiss') {
      await prisma.aIBriefing.update({
        where: { id },
        data: { dismissedAt: new Date() },
      })
      return NextResponse.json({ success: true, action: 'dismiss' })
    }

    return NextResponse.json(
      { error: t(locale, 'Invalid action', 'Ogiltig åtgärd') },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating briefing:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update briefing', 'Kunde inte uppdatera briefingen') },
      { status: 500 }
    )
  }
}
