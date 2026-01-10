/**
 * Athlete Streaks API
 *
 * GET /api/athlete/streaks - Get streak data for the accountability widget
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  getNextMilestone,
  getMotivationMessage,
  type CheckInDay,
  type StreakResponse,
} from '@/types/streak'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete's client ID and personal best streak
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: {
        clientId: true,
        client: {
          select: {
            bestCheckInStreak: true,
            bestStreakAchievedAt: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    const clientId = athleteAccount.clientId
    const personalBest = athleteAccount.client.bestCheckInStreak || 0
    const personalBestDate = athleteAccount.client.bestStreakAchievedAt

    // Get last 30 days of metrics for streak calculation
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      select: { date: true },
    })

    // Calculate current streak
    const currentStreak = calculateCheckInStreak(metrics)

    // Check if checked in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const hasCheckedInToday = metrics.some((m) => {
      const metricDate = new Date(m.date)
      metricDate.setHours(0, 0, 0, 0)
      return metricDate.getTime() === today.getTime()
    })

    // Build 28-day check-in history for calendar
    const checkInHistory: CheckInDay[] = []
    const metricDates = new Set(
      metrics.map((m) => {
        const d = new Date(m.date)
        d.setHours(0, 0, 0, 0)
        return d.toISOString().split('T')[0]
      })
    )

    for (let i = 27; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]

      checkInHistory.push({
        date: dateStr,
        checkedIn: metricDates.has(dateStr),
      })
    }

    // Get next milestone and days until
    const nextMilestone = getNextMilestone(currentStreak)
    const daysUntilMilestone = nextMilestone ? nextMilestone.days - currentStreak : null

    // Get motivation message
    const motivation = getMotivationMessage(currentStreak, personalBest)

    // Check if beating personal record (strictly greater, not just matching)
    const isNewRecord = currentStreak > 0 && currentStreak > personalBest

    const response: StreakResponse = {
      success: true,
      data: {
        currentStreak,
        personalBest,
        personalBestDate: personalBestDate?.toISOString() || null,
        hasCheckedInToday,
        isNewRecord,
        checkInHistory,
        nextMilestone: nextMilestone
          ? {
              days: nextMilestone.days,
              label: nextMilestone.label,
              celebrationLevel: nextMilestone.celebrationLevel,
            }
          : null,
        daysUntilMilestone,
        motivation,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching streak data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streak data' },
      { status: 500 }
    )
  }
}

/**
 * Calculate consecutive days with check-ins starting from today
 */
function calculateCheckInStreak(metrics: Array<{ date: Date }>): number {
  if (metrics.length === 0) return 0

  // Sort by date descending
  const sorted = [...metrics].sort((a, b) => b.date.getTime() - a.date.getTime())

  let streak = 0
  let expectedDate = new Date()
  expectedDate.setHours(0, 0, 0, 0)

  for (const metric of sorted) {
    const metricDate = new Date(metric.date)
    metricDate.setHours(0, 0, 0, 0)

    if (metricDate.getTime() === expectedDate.getTime()) {
      streak++
      // Move to previous day
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      // Streak broken
      break
    }
  }

  return streak
}
