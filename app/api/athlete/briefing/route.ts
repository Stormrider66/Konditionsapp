/**
 * Athlete Briefing API
 *
 * GET /api/athlete/briefing - Get today's briefing
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

    // Get today's briefing
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const briefing = await prisma.aIBriefing.findFirst({
      where: {
        clientId,
        briefingType: 'MORNING',
        scheduledFor: { gte: today },
        dismissedAt: null,
      },
      orderBy: { scheduledFor: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        highlights: true,
        readinessScore: true,
        todaysWorkout: true,
        alerts: true,
        quickActions: true,
        scheduledFor: true,
        readAt: true,
        createdAt: true,
      },
    })

    if (!briefing) {
      return NextResponse.json({ briefing: null })
    }

    // Mark as delivered if not already
    if (!briefing.readAt) {
      await prisma.aIBriefing.update({
        where: { id: briefing.id },
        data: { deliveredAt: new Date() },
      })
    }

    return NextResponse.json({ briefing })
  } catch (error) {
    console.error('Error fetching briefing:', error)
    return NextResponse.json({ error: 'Failed to fetch briefing' }, { status: 500 })
  }
}
