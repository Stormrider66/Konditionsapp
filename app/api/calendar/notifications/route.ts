/**
 * Calendar Notifications API
 *
 * GET /api/calendar/notifications - Get notifications for user
 * POST /api/calendar/notifications - Mark multiple notifications as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

/**
 * GET /api/calendar/notifications
 * Get calendar change notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const dbUser = await getCurrentUser()

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query based on user role
    // Coach sees notifications for all their clients
    // Athlete sees notifications for their client profile
    let clientIds: string[] = []

    if (dbUser.role === 'COACH') {
      // Check if coach is in athlete mode
      const resolved = await resolveAthleteClientId()
      if (resolved?.isCoachInAthleteMode) {
        clientIds = [resolved.clientId]
      } else {
        // Get all clients the coach manages
        const clients = await prisma.client.findMany({
          where: { userId: dbUser.id },
          select: { id: true },
        })
        clientIds = clients.map((c) => c.id)

        // If specific clientId requested, filter to that one
        if (clientId && clientIds.includes(clientId)) {
          clientIds = [clientId]
        }
      }
    } else if (dbUser.role === 'ATHLETE') {
      // Athlete sees notifications for their profile
      const resolved = await resolveAthleteClientId()
      if (resolved) {
        clientIds = [resolved.clientId]
      }
    }

    if (clientIds.length === 0) {
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        total: 0,
      })
    }

    // Build where clause
    const whereClause: {
      clientId: { in: string[] }
      notificationRead?: boolean
      changedById?: { not: string }
    } = {
      clientId: { in: clientIds },
    }

    if (unreadOnly) {
      whereClause.notificationRead = false
    }

    // Don't show user their own changes
    whereClause.changedById = { not: dbUser.id }

    // Get notifications
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.calendarEventChange.findMany({
        where: whereClause,
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
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.calendarEventChange.count({ where: whereClause }),
      prisma.calendarEventChange.count({
        where: {
          ...whereClause,
          notificationRead: false,
        },
      }),
    ])

    // Format notifications for response
    const formattedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.changeType,
      description: n.description,
      clientId: n.clientId,
      clientName: n.client.name,
      eventId: n.eventId,
      eventTitle: n.event?.title,
      eventType: n.event?.type,
      changedBy: {
        id: n.changedBy.id,
        name: n.changedBy.name,
        role: n.changedBy.role,
      },
      isRead: n.notificationRead,
      readAt: n.notificationReadAt,
      createdAt: n.createdAt,
      previousData: n.previousData,
      newData: n.newData,
    }))

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    logError('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

/**
 * POST /api/calendar/notifications
 * Mark multiple notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const dbUser = await getCurrentUser()

    if (!dbUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAll } = body

    // Get client IDs user has access to
    let clientIds: string[] = []

    if (dbUser.role === 'COACH') {
      // Check if coach is in athlete mode
      const resolved = await resolveAthleteClientId()
      if (resolved?.isCoachInAthleteMode) {
        clientIds = [resolved.clientId]
      } else {
        const clients = await prisma.client.findMany({
          where: { userId: dbUser.id },
          select: { id: true },
        })
        clientIds = clients.map((c) => c.id)
      }
    } else if (dbUser.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      if (resolved) {
        clientIds = [resolved.clientId]
      }
    }

    if (clientIds.length === 0) {
      return NextResponse.json({ error: 'No access to notifications' }, { status: 403 })
    }

    const now = new Date()

    if (markAll) {
      // Mark all unread notifications as read
      const result = await prisma.calendarEventChange.updateMany({
        where: {
          clientId: { in: clientIds },
          notificationRead: false,
          changedById: { not: dbUser.id },
        },
        data: {
          notificationRead: true,
          notificationReadAt: now,
        },
      })

      return NextResponse.json({
        success: true,
        marked: result.count,
      })
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const result = await prisma.calendarEventChange.updateMany({
        where: {
          id: { in: notificationIds },
          clientId: { in: clientIds },
          changedById: { not: dbUser.id },
        },
        data: {
          notificationRead: true,
          notificationReadAt: now,
        },
      })

      return NextResponse.json({
        success: true,
        marked: result.count,
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    logError('Error marking notifications as read:', error)
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}
