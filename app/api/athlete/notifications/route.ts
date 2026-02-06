/**
 * Athlete AI Notifications API
 *
 * GET /api/athlete/notifications - Get active notifications
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId } = resolved

    // Get active notifications (not dismissed, not expired)
    const notifications = await prisma.aINotification.findMany({
      where: {
        clientId,
        dismissedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
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
