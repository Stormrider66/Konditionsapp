/**
 * Athlete Briefing API
 *
 * GET /api/athlete/briefing - Get today's briefing
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

    // Get today's briefing
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const briefing = await prisma.aIBriefing.findFirst({
      where: {
        clientId: athleteAccount.clientId,
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
