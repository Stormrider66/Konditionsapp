/**
 * My Availability API (Athlete)
 *
 * GET /api/calendar/my-availability - Get athlete's own calendar availability
 *
 * Returns availability information for the authenticated athlete's calendar.
 * Used by athlete portal to show upcoming blockers and training capacity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAthlete } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import {
  calculateAvailability,
  isDateAvailable,
  getAltitudeAdjustment,
} from '@/lib/calendar/availability-calculator'
import { addDays, format } from 'date-fns'
import { sv } from 'date-fns/locale'

/**
 * GET /api/calendar/my-availability
 *
 * Query params:
 * - weeksAhead: Optional - Number of weeks to check (default: 4)
 * - date: Optional - Check specific date availability (ISO format)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAthlete()
    const { searchParams } = new URL(request.url)

    // Get athlete's client ID
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    const clientId = athleteAccount.clientId

    // Check for specific date query
    const specificDate = searchParams.get('date')
    if (specificDate) {
      const date = new Date(specificDate)
      const [dateAvailability, altitudeAdjustment] = await Promise.all([
        isDateAvailable(clientId, date),
        getAltitudeAdjustment(clientId, date),
      ])

      return NextResponse.json({
        date: specificDate,
        ...dateAvailability,
        altitude: altitudeAdjustment,
      })
    }

    // Get availability overview
    const weeksAhead = parseInt(searchParams.get('weeksAhead') || '4')
    const startDate = new Date()
    const endDate = addDays(new Date(), weeksAhead * 7)

    const availability = await calculateAvailability(clientId, startDate, endDate)

    // Format blocked days for display
    const upcomingBlockers = availability.blockedDays
      .slice(0, 10)
      .map((day) => ({
        date: format(day.date, 'yyyy-MM-dd'),
        displayDate: format(day.date, 'd MMMM', { locale: sv }),
        reason: day.reason,
        type: day.eventType,
      }))

    // Format altitude periods
    const altitudePeriods = availability.altitudePeriods.map((period) => ({
      start: format(period.startDate, 'yyyy-MM-dd'),
      end: format(period.endDate, 'yyyy-MM-dd'),
      displayStart: format(period.startDate, 'd MMMM', { locale: sv }),
      displayEnd: format(period.endDate, 'd MMMM', { locale: sv }),
      altitude: period.altitude,
      phase: period.adaptationPhase,
    }))

    // Format reduced days
    const reducedDays = availability.reducedDays
      .slice(0, 10)
      .map((day) => ({
        date: format(day.date, 'yyyy-MM-dd'),
        displayDate: format(day.date, 'd MMMM', { locale: sv }),
        reason: day.reason,
        impact: day.impact,
      }))

    // Calculate weekly breakdown
    const weeklyBreakdown: {
      week: number
      startDate: string
      endDate: string
      availableDays: number
      blockedDays: number
      reducedDays: number
    }[] = []

    for (let week = 0; week < weeksAhead; week++) {
      const weekStart = addDays(startDate, week * 7)
      const weekEnd = addDays(weekStart, 6)
      const weekAvailability = await calculateAvailability(clientId, weekStart, weekEnd)

      weeklyBreakdown.push({
        week: week + 1,
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
        availableDays: weekAvailability.availableCount,
        blockedDays: weekAvailability.blockedCount,
        reducedDays: weekAvailability.reducedCount,
      })
    }

    return NextResponse.json({
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        weeks: weeksAhead,
      },
      summary: {
        totalDays: availability.totalDays,
        availableDays: availability.availableCount,
        blockedDays: availability.blockedCount,
        reducedDays: availability.reducedCount,
        availablePercent: Math.round(
          (availability.availableCount / availability.totalDays) * 100
        ),
      },
      upcomingBlockers,
      altitudePeriods,
      reducedDays,
      weeklyBreakdown,
    })
  } catch (error) {
    console.error('My availability error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    )
  }
}
