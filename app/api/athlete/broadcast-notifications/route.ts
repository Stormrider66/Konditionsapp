/**
 * Athlete Broadcast Notifications API
 *
 * GET   - List notifications with unread count
 * PATCH - Mark notification(s) as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveLocale(request, user.language)

    const notifications = await prisma.broadcastNotification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
    })

    const unreadCount = await prisma.broadcastNotification.count({
      where: { userId: user.id, isRead: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch {
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch notifications', 'Kunde inte hämta notiser') },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(req)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(req, user.language)

    const body = await req.json()

    if (body.markAllRead) {
      await prisma.broadcastNotification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
    } else if (body.notificationId) {
      await prisma.broadcastNotification.update({
        where: { id: body.notificationId },
        data: { isRead: true, readAt: new Date() },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: t(locale, 'Failed to update notifications', 'Kunde inte uppdatera notiser') },
      { status: 500 }
    )
  }
}
