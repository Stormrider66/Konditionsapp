/**
 * Athlete AI Notifications API
 *
 * GET /api/athlete/notifications - Get active notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId } = resolved

    // Parse optional query params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const now = new Date()

    // Get active notifications (not dismissed, not expired)
    const notifications = await prisma.aINotification.findMany({
      where: {
        clientId,
        dismissedAt: null,
        ...(type ? { notificationType: type } : {}),
        AND: [
          // Not expired
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          // Only return notifications that are due (not scheduled for the future)
          { OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }] },
        ],
      },
      ...(limit && limit > 0 ? { take: limit } : {}),
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        notificationType: true,
        priority: true,
        title: true,
        message: true,
        icon: true,
        actionUrl: true,
        actionLabel: true,
        contextData: true,
        readAt: true,
        createdAt: true,
        expiresAt: true,
      },
    })

    // Mark as delivered
    const undeliveredIds = notifications
      .filter((n) => !n.readAt)
      .map((n) => n.id)

    if (undeliveredIds.length > 0) {
      await prisma.aINotification.updateMany({
        where: { id: { in: undeliveredIds } },
        data: { deliveredAt: new Date() },
      })
    }

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
