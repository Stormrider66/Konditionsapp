/**
 * Unified Calendar API
 *
 * GET /api/calendar/unified - Get all calendar items (workouts, races, events, check-ins) for a date range
 *
 * Returns a unified view of:
 * - Workouts from training programs
 * - Races from race calendar
 * - Field tests
 * - Calendar events (travel, camps, illness, vacation, etc.)
 * - Daily check-ins
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

export interface UnifiedCalendarItem {
  id: string
  type: 'WORKOUT' | 'RACE' | 'FIELD_TEST' | 'CALENDAR_EVENT' | 'CHECK_IN' | 'WOD'
  title: string
  description?: string | null
  date: Date
  endDate?: Date
  status?: string
  metadata: Record<string, unknown>
}

const UNIFIED_CALENDAR_TTL_MS = 15 * 1000
const unifiedCalendarCache = new Map<string, { expiresAt: number; payload: unknown }>()
const unifiedCalendarInFlight = new Map<string, Promise<unknown>>()

/**
 * GET /api/calendar/unified
 * Get all calendar items for a client within a date range
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    // What to include (all true by default)
    const includeWorkouts = searchParams.get('includeWorkouts') !== 'false'
    const includeRaces = searchParams.get('includeRaces') !== 'false'
    const includeFieldTests = searchParams.get('includeFieldTests') !== 'false'
    const includeEvents = searchParams.get('includeEvents') !== 'false'
    const includeCheckIns = searchParams.get('includeCheckIns') !== 'false'
    const includeWODs = searchParams.get('includeWODs') !== 'false'

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }

    const hasAccess = await canAccessClient(dbUser.id, clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Default to current month if no dates provided
    const now = new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    let endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const MAX_RANGE_DAYS = 120
    const maxItemsPerSource = Math.min(
      parseInt(searchParams.get('maxItemsPerSource') || '150'),
      1000
    )
    const requestedRangeMs = endDate.getTime() - startDate.getTime()
    const maxRangeMs = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000
    const rangeClamped = requestedRangeMs > maxRangeMs
    if (rangeClamped) {
      endDate = new Date(startDate.getTime() + maxRangeMs)
    }

    const cacheKey = [
      dbUser.id,
      clientId,
      startDate.toISOString(),
      endDate.toISOString(),
      includeWorkouts ? '1' : '0',
      includeRaces ? '1' : '0',
      includeFieldTests ? '1' : '0',
      includeEvents ? '1' : '0',
      includeCheckIns ? '1' : '0',
      includeWODs ? '1' : '0',
      maxItemsPerSource.toString(),
    ].join(':')
    const nowMs = Date.now()
    const cached = unifiedCalendarCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs) {
      return NextResponse.json(cached.payload)
    }
    const inFlight = unifiedCalendarInFlight.get(cacheKey)
    if (inFlight) {
      const payload = await inFlight
      return NextResponse.json(payload)
    }

    const loadPromise = (async () => {

    const workoutsPromise = includeWorkouts
      ? prisma.workout.findMany({
        where: {
          day: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            week: {
              program: {
                clientId,
                isActive: true,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          type: true,
          intensity: true,
          duration: true,
          distance: true,
          order: true,
          day: {
            select: {
              date: true,
              dayNumber: true,
              week: {
                select: {
                  phase: true,
                  weekNumber: true,
                  program: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          segments: {
            take: 3,
            select: { id: true },
          },
          logs: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { completed: true },
          },
        },
        take: maxItemsPerSource,
        orderBy: {
          day: {
            date: 'asc',
          },
        },
      })
      : Promise.resolve([])

    const racesPromise = includeRaces
      ? prisma.race.findMany({
        where: {
          clientId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          name: true,
          date: true,
          distance: true,
          classification: true,
          targetTime: true,
          targetPace: true,
          actualTime: true,
          actualPace: true,
          vdot: true,
          assessment: true,
          taperWeeks: true,
          calendar: {
            select: { id: true, seasonName: true },
          },
        },
        take: maxItemsPerSource,
        orderBy: { date: 'asc' },
      })
      : Promise.resolve([])

    const fieldTestsPromise = includeFieldTests
      ? prisma.fieldTest.findMany({
        where: {
          clientId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          testType: true,
          notes: true,
          date: true,
          valid: true,
          lt1Pace: true,
          lt1HR: true,
          lt2Pace: true,
          lt2HR: true,
          confidence: true,
          results: true,
        },
        take: maxItemsPerSource,
        orderBy: { date: 'asc' },
      })
      : Promise.resolve([])

    const eventsPromise = includeEvents
      ? prisma.calendarEvent.findMany({
        where: {
          clientId,
          OR: [
            {
              startDate: { gte: startDate, lte: endDate },
            },
            {
              endDate: { gte: startDate, lte: endDate },
            },
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: endDate } },
              ],
            },
          ],
          status: { not: 'CANCELLED' },
        },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
        take: maxItemsPerSource,
        orderBy: { startDate: 'asc' },
      })
      : Promise.resolve([])

    const checkInsPromise = includeCheckIns
      ? prisma.dailyCheckIn.findMany({
        where: {
          clientId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          notes: true,
          date: true,
          readinessScore: true,
          readinessDecision: true,
          sleepQuality: true,
          sleepHours: true,
          soreness: true,
          fatigue: true,
          stress: true,
          mood: true,
          restingHR: true,
          hrv: true,
        },
        take: maxItemsPerSource,
        orderBy: { date: 'asc' },
      })
      : Promise.resolve([])

    const wodsPromise = includeWODs
      ? prisma.aIGeneratedWOD.findMany({
        where: {
          clientId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: { notIn: ['ABANDONED'] },
        },
        select: {
          id: true,
          title: true,
          subtitle: true,
          createdAt: true,
          status: true,
          mode: true,
          requestedDuration: true,
          actualDuration: true,
          intensityAdjusted: true,
          sessionRPE: true,
          primarySport: true,
        },
        take: maxItemsPerSource,
        orderBy: { createdAt: 'asc' },
      })
      : Promise.resolve([])

    const [workouts, races, fieldTests, events, checkIns, wods] = await Promise.all([
      workoutsPromise,
      racesPromise,
      fieldTestsPromise,
      eventsPromise,
      checkInsPromise,
      wodsPromise,
    ])

    const items: UnifiedCalendarItem[] = []
    for (const workout of workouts) {
      items.push({
        id: workout.id,
        type: 'WORKOUT',
        title: workout.name,
        description: workout.description,
        date: workout.day.date,
        status: workout.status,
        metadata: {
          workoutType: workout.type,
          intensity: workout.intensity,
          duration: workout.duration,
          distance: workout.distance,
          programId: workout.day.week.program.id,
          programName: workout.day.week.program.name,
          phase: workout.day.week.phase,
          weekNumber: workout.day.week.weekNumber,
          dayNumber: workout.day.dayNumber,
          segmentCount: workout.segments.length,
          isCompleted: workout.logs.length > 0 && workout.logs[0].completed,
          order: workout.order,
        },
      })
    }
    for (const race of races) {
      items.push({
        id: race.id,
        type: 'RACE',
        title: race.name,
        description: `${race.distance}${race.distance?.includes('km') ? '' : ' km'} - ${race.classification} Race`,
        date: race.date,
        metadata: {
          distance: race.distance,
          classification: race.classification,
          targetTime: race.targetTime,
          targetPace: race.targetPace,
          actualTime: race.actualTime,
          actualPace: race.actualPace,
          vdot: race.vdot,
          assessment: race.assessment,
          taperWeeks: race.taperWeeks,
          calendarId: race.calendar?.id,
          seasonName: race.calendar?.seasonName,
          isCompleted: !!race.actualTime,
        },
      })
    }
    for (const test of fieldTests) {
      const results = test.results as Record<string, unknown> | null
      items.push({
        id: test.id,
        type: 'FIELD_TEST',
        title: `Fälttest: ${test.testType.replace(/_/g, ' ')}`,
        description: test.notes,
        date: test.date,
        status: test.valid ? 'VALID' : 'INVALID',
        metadata: {
          testType: test.testType,
          lt1Pace: test.lt1Pace,
          lt1HR: test.lt1HR,
          lt2Pace: test.lt2Pace,
          lt2HR: test.lt2HR,
          confidence: test.confidence,
          results,
          valid: test.valid,
        },
      })
    }
    for (const event of events) {
      items.push({
        id: event.id,
        type: 'CALENDAR_EVENT',
        title: event.title,
        description: event.description,
        date: event.startDate,
        endDate: event.endDate,
        status: event.status,
        metadata: {
          eventType: event.type,
          trainingImpact: event.trainingImpact,
          impactNotes: event.impactNotes,
          allDay: event.allDay,
          startTime: event.startTime,
          endTime: event.endTime,
          altitude: event.altitude,
          adaptationPhase: event.adaptationPhase,
          illnessType: event.illnessType,
          returnToTrainingDate: event.returnToTrainingDate,
          medicalClearance: event.medicalClearance,
          isReadOnly: event.isReadOnly,
          externalCalendarType: event.externalCalendarType,
          externalCalendarName: event.externalCalendarName,
          color: event.color,
          createdBy: event.createdBy,
        },
      })
    }
    for (const checkIn of checkIns) {
      items.push({
        id: checkIn.id,
        type: 'CHECK_IN',
        title: 'Daily Check-in',
        description: checkIn.notes,
        date: checkIn.date,
        metadata: {
          readinessScore: checkIn.readinessScore,
          readinessDecision: checkIn.readinessDecision,
          sleepQuality: checkIn.sleepQuality,
          sleepHours: checkIn.sleepHours,
          soreness: checkIn.soreness,
          fatigue: checkIn.fatigue,
          stress: checkIn.stress,
          mood: checkIn.mood,
          restingHR: checkIn.restingHR,
          hrv: checkIn.hrv,
        },
      })
    }
    for (const wod of wods) {
      items.push({
        id: wod.id,
        type: 'WOD',
        title: wod.title,
        description: wod.subtitle,
        date: wod.createdAt,
        status: wod.status,
        metadata: {
          mode: wod.mode,
          requestedDuration: wod.requestedDuration,
          actualDuration: wod.actualDuration,
          intensityAdjusted: wod.intensityAdjusted,
          isCompleted: wod.status === 'COMPLETED',
          sessionRPE: wod.sessionRPE,
          primarySport: wod.primarySport,
        },
      })
    }

    // Sort by date
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Group by date for easier consumption
    const groupedByDate: Record<string, UnifiedCalendarItem[]> = {}
    for (const item of items) {
      const dateKey = new Date(item.date).toISOString().split('T')[0]
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(item)
    }

    const payload = {
      items,
      groupedByDate,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      rangeClamped,
      maxRangeDays: MAX_RANGE_DAYS,
      maxItemsPerSource,
      counts: {
        total: items.length,
        workouts: items.filter((i) => i.type === 'WORKOUT').length,
        races: items.filter((i) => i.type === 'RACE').length,
        fieldTests: items.filter((i) => i.type === 'FIELD_TEST').length,
        calendarEvents: items.filter((i) => i.type === 'CALENDAR_EVENT').length,
        checkIns: items.filter((i) => i.type === 'CHECK_IN').length,
        wods: items.filter((i) => i.type === 'WOD').length,
      },
    }

    unifiedCalendarCache.set(cacheKey, {
      expiresAt: Date.now() + UNIFIED_CALENDAR_TTL_MS,
      payload,
    })
    return payload
    })()

    unifiedCalendarInFlight.set(cacheKey, loadPromise)
    try {
      const payload = await loadPromise
      return NextResponse.json(payload)
    } finally {
      unifiedCalendarInFlight.delete(cacheKey)
    }
  } catch (error) {
    logError('Error fetching unified calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unified calendar' },
      { status: 500 }
    )
  }
}
