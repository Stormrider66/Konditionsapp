/**
 * Athlete Broadcast Notifications API
 *
 * GET   - List notifications with unread count
 * PATCH - Mark notification(s) as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
