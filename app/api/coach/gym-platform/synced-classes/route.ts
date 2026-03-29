import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, addDays } from 'date-fns'

/**
 * GET /api/coach/gym-platform/synced-classes
 * Returns today's and tomorrow's synced classes from gym platforms
 */
export async function GET() {
  try {
    const user = await requireCoach()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ classes: [] })
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const tomorrowEnd = endOfDay(addDays(now, 1))

    const classes = await prisma.gymSyncedClass.findMany({
      where: {
        connection: {
          businessId: membership.businessId,
          isActive: true,
        },
        startTime: { gte: todayStart, lte: tomorrowEnd },
      },
      select: {
        id: true,
        name: true,
        instructor: true,
        startTime: true,
        endTime: true,
        location: true,
        maxCapacity: true,
        bookedCount: true,
        description: true,
        connection: {
          select: { provider: true, displayName: true },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json({
      classes: classes.map(c => ({
        ...c,
        provider: c.connection.provider,
        providerName: c.connection.displayName,
        startTime: c.startTime.toISOString(),
        endTime: c.endTime.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
