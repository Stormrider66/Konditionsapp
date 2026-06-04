/**
 * Athlete AI Notification Actions API
 *
 * PATCH /api/athlete/notifications/[id] - Update notification (read/dismiss/action)
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

interface RouteParams {
  params: Promise<{ id: string }>
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

    // Verify notification belongs to this athlete
    const notification = await prisma.aINotification.findFirst({
      where: {
        id,
        clientId,
      },
    })

    if (!notification) {
      return NextResponse.json(
        { error: t(locale, 'Notification not found', 'Notisen hittades inte') },
        { status: 404 }
      )
    }

    // Parse action from body
    const body = await request.json()
    const { action } = body

    if (action === 'read') {
      await prisma.aINotification.update({
        where: { id },
        data: { readAt: new Date() },
      })
      return NextResponse.json({ success: true, action: 'read' })
    }

    if (action === 'dismiss') {
      await prisma.aINotification.update({
        where: { id },
        data: { dismissedAt: new Date() },
      })
      return NextResponse.json({ success: true, action: 'dismiss' })
    }

    if (action === 'action_taken') {
      await prisma.aINotification.update({
        where: { id },
        data: { actionTakenAt: new Date() },
      })
      return NextResponse.json({ success: true, action: 'action_taken' })
    }

    return NextResponse.json(
      { error: t(locale, 'Invalid action', 'Ogiltig åtgärd') },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update notification', 'Kunde inte uppdatera notisen') },
      { status: 500 }
    )
  }
}
