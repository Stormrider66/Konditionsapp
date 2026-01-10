/**
 * Athlete AI Notifications API
 *
 * GET /api/athlete/notifications - Get active notifications
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    // Get active notifications (not dismissed, not expired)
    const notifications = await prisma.aINotification.findMany({
      where: {
        clientId: athleteAccount.clientId,
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
