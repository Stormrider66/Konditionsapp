/**
 * Single Calendar Notification API
 *
 * GET /api/calendar/notifications/[id] - Get single notification
 * PUT /api/calendar/notifications/[id] - Mark notification as read/unread
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/calendar/notifications/[id]
 * Get a single notification
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    const notification = await prisma.calendarEventChange.findUnique({
      where: { id },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            userId: true,
            athleteAccount: {
              select: { userId: true },
            },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, notification.client.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      notification: {
        id: notification.id,
        type: notification.changeType,
        description: notification.description,
        clientId: notification.clientId,
        clientName: notification.client.name,
        eventId: notification.eventId,
        event: notification.event,
        changedBy: notification.changedBy,
        isRead: notification.notificationRead,
        readAt: notification.notificationReadAt,
        createdAt: notification.createdAt,
        previousData: notification.previousData,
        newData: notification.newData,
      },
    })
  } catch (error) {
    logError('Error fetching notification:', error)
    return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 })
  }
}

/**
 * PUT /api/calendar/notifications/[id]
 * Mark notification as read or unread
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const { read } = body

    // Find notification and verify access
    const notification = await prisma.calendarEventChange.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            userId: true,
            athleteAccount: {
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, notification.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update notification
    const updated = await prisma.calendarEventChange.update({
      where: { id },
      data: {
        notificationRead: read !== false,
        notificationReadAt: read !== false ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      notification: {
        id: updated.id,
        isRead: updated.notificationRead,
        readAt: updated.notificationReadAt,
      },
    })
  } catch (error) {
    logError('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
