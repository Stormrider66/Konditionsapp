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

export interface UnifiedCalendarItem {
  id: string
  type: 'WORKOUT' | 'RACE' | 'FIELD_TEST' | 'CALENDAR_EVENT' | 'CHECK_IN'
  title: string
  description?: string | null
  date: Date
  endDate?: Date
  status?: string
  metadata: Record<string, unknown>
}

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

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }

    // Verify client access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { athleteAccount: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const isCoach = client.userId === dbUser.id
    const isAthlete = client.athleteAccount?.userId === dbUser.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Default to current month if no dates provided
    const now = new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const items: UnifiedCalendarItem[] = []

    // Fetch workouts from training programs
    if (includeWorkouts) {
      const workouts = await prisma.workout.findMany({
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
        include: {
          day: {
            include: {
              week: {
                include: {
                  program: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          segments: {
            take: 3,
          },
          logs: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      })

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
    }

    // Fetch races
    if (includeRaces) {
      const races = await prisma.race.findMany({
        where: {
          clientId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          calendar: {
            select: { id: true, seasonName: true },
          },
        },
      })

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
    }

    // Fetch field tests
    if (includeFieldTests) {
      const fieldTests = await prisma.fieldTest.findMany({
        where: {
          clientId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

      for (const test of fieldTests) {
        // Extract results from JSON
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
    }

    // Fetch calendar events
    if (includeEvents) {
      const events = await prisma.calendarEvent.findMany({
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
      })

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
    }

    // Fetch daily check-ins
    if (includeCheckIns) {
      const checkIns = await prisma.dailyCheckIn.findMany({
        where: {
          clientId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      })

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

    return NextResponse.json({
      items,
      groupedByDate,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      counts: {
        total: items.length,
        workouts: items.filter((i) => i.type === 'WORKOUT').length,
        races: items.filter((i) => i.type === 'RACE').length,
        fieldTests: items.filter((i) => i.type === 'FIELD_TEST').length,
        calendarEvents: items.filter((i) => i.type === 'CALENDAR_EVENT').length,
        checkIns: items.filter((i) => i.type === 'CHECK_IN').length,
      },
    })
  } catch (error) {
    console.error('Error fetching unified calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unified calendar' },
      { status: 500 }
    )
  }
}
