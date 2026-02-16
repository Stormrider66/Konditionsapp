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
import { performance } from 'node:perf_hooks'

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

type CalendarItemsMode = 'full' | 'light'

// Increase TTL aggressively to reduce refresh work that can block the Node event loop under load.
// Calendar UI is refreshed frequently; serving cached data for a few minutes is acceptable.
const UNIFIED_CALENDAR_TTL_MS = 10 * 60 * 1000
const UNIFIED_CALENDAR_STALE_MS = 30 * 60 * 1000
// Auth context is safe to cache a bit longer than the main payload; it avoids
// repeated Supabase calls / DB lookups under load.
const AUTH_CONTEXT_TTL_MS = 2 * 60 * 1000
const CLIENT_ACCESS_TTL_MS = 2 * 60 * 1000
const unifiedCalendarCache = new Map<
  string,
  { expiresAt: number; staleUntil: number; json: string }
>()
const unifiedCalendarInFlight = new Map<string, Promise<string>>()
const clientAccessCache = new Map<string, { expiresAt: number; allowed: boolean }>()
const clientAccessInFlight = new Map<string, Promise<boolean>>()
const authEmailCache = new Map<string, { expiresAt: number; email: string }>()
const userIdByEmailCache = new Map<string, { expiresAt: number; userId: string }>()
const authEmailInFlight = new Map<string, Promise<string>>()
const userIdByEmailInFlight = new Map<string, Promise<string | null>>()

/**
 * GET /api/calendar/unified
 * Get all calendar items for a client within a date range
 */
export async function GET(request: NextRequest) {
  try {
    const emitDebugHeaders = shouldEmitPerfDebugHeaders(request)
    const t0 = emitDebugHeaders ? performance.now() : 0
    const authResult = await resolveAuthenticatedUserId(request)
    if (!authResult.ok) {
      return authResult.response
    }
    const dbUserId = authResult.userId

    const searchParams = request.nextUrl.searchParams
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
    // Response shape (both true by default for backwards compatibility)
    const includeItems = searchParams.get('includeItems') !== 'false'
    const includeGroupedByDate = searchParams.get('includeGroupedByDate') !== 'false'
    // When includeItems=true, allow a lighter payload (minimal selects + smaller metadata).
    const itemsMode = normalizeCalendarItemsMode(searchParams.get('itemsMode'))

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }

    const accessCacheKey = `${dbUserId}:${clientId}`
    const cachedAccess = clientAccessCache.get(accessCacheKey)
    let hasAccess: boolean
    if (cachedAccess && cachedAccess.expiresAt > Date.now()) {
      hasAccess = cachedAccess.allowed
    } else {
      const inFlight = clientAccessInFlight.get(accessCacheKey)
      if (inFlight) {
        hasAccess = await inFlight
      } else {
        const task = canAccessClient(dbUserId, clientId)
        clientAccessInFlight.set(accessCacheKey, task)
        try {
          hasAccess = await task
        } finally {
          clientAccessInFlight.delete(accessCacheKey)
        }
      }
      clientAccessCache.set(accessCacheKey, {
        expiresAt: Date.now() + CLIENT_ACCESS_TTL_MS,
        allowed: hasAccess,
      })
    }
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
    const maxItemsPerSource = Math.min(parseInt(searchParams.get('maxItemsPerSource') || '150', 10) || 150, 1000)
    const requestedRangeMs = endDate.getTime() - startDate.getTime()
    const maxRangeMs = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000
    const rangeClamped = requestedRangeMs > maxRangeMs
    if (rangeClamped) {
      endDate = new Date(startDate.getTime() + maxRangeMs)
    }

    const cacheKey = [
      dbUserId,
      clientId,
      startDate.toISOString(),
      endDate.toISOString(),
      includeWorkouts ? '1' : '0',
      includeRaces ? '1' : '0',
      includeFieldTests ? '1' : '0',
      includeEvents ? '1' : '0',
      includeCheckIns ? '1' : '0',
      includeWODs ? '1' : '0',
      includeItems ? '1' : '0',
      itemsMode,
      includeGroupedByDate ? '1' : '0',
      maxItemsPerSource.toString(),
    ].join(':')
    const nowMs = Date.now()
    const cached = unifiedCalendarCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs) {
      return jsonResponse(
        cached.json,
        withHandlerTiming(
          emitDebugHeaders,
          t0,
          { 'x-cache': 'hit' }
        )
      )
    }
    const inFlight = unifiedCalendarInFlight.get(cacheKey)
    if (cached && cached.staleUntil > nowMs) {
      if (!inFlight) {
        const refreshPromise = buildUnifiedCalendarPayload({
          cacheKey,
          dbUserId,
          clientId,
          startDate,
          endDate,
          includeWorkouts,
          includeRaces,
          includeFieldTests,
          includeEvents,
          includeCheckIns,
          includeWODs,
          includeItems,
          itemsMode,
          includeGroupedByDate,
          maxItemsPerSource,
          rangeClamped,
          maxRangeDays: MAX_RANGE_DAYS,
        })
        unifiedCalendarInFlight.set(cacheKey, refreshPromise)
        void refreshPromise.finally(() => unifiedCalendarInFlight.delete(cacheKey))
      }
      return jsonResponse(
        cached.json,
        withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' })
      )
    }
    if (inFlight) {
      const json = await inFlight
      return jsonResponse(
        json,
        withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'inflight' })
      )
    }

    const loadPromise = buildUnifiedCalendarPayload({
      cacheKey,
      dbUserId,
      clientId,
      startDate,
      endDate,
      includeWorkouts,
      includeRaces,
      includeFieldTests,
      includeEvents,
      includeCheckIns,
      includeWODs,
      includeItems,
      itemsMode,
      includeGroupedByDate,
      maxItemsPerSource,
      rangeClamped,
      maxRangeDays: MAX_RANGE_DAYS,
    })

    unifiedCalendarInFlight.set(cacheKey, loadPromise)
    try {
      const json = await loadPromise
      return jsonResponse(
        json,
        withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'miss' })
      )
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

function shouldEmitPerfDebugHeaders(request: NextRequest) {
  const host = request.nextUrl.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!isLocal) return false

  const incomingSecret = request.headers.get('x-load-test-secret')
  const secret = process.env.LOAD_TEST_BYPASS_SECRET
  return !!secret && !!incomingSecret && incomingSecret === secret
}

function withHandlerTiming(
  enabled: boolean,
  t0: number,
  headers: Record<string, string>
): Record<string, string> | undefined {
  if (!enabled) return undefined
  const handlerMs = Math.max(0, performance.now() - t0)
  return {
    ...headers,
    'x-handler-ms': handlerMs.toFixed(2),
    'Server-Timing': `handler;dur=${handlerMs.toFixed(2)}`,
  }
}

interface BuildUnifiedCalendarPayloadInput {
  cacheKey: string
  dbUserId: string
  clientId: string
  startDate: Date
  endDate: Date
  includeWorkouts: boolean
  includeRaces: boolean
  includeFieldTests: boolean
  includeEvents: boolean
  includeCheckIns: boolean
  includeWODs: boolean
  includeItems: boolean
  itemsMode: CalendarItemsMode
  includeGroupedByDate: boolean
  maxItemsPerSource: number
  rangeClamped: boolean
  maxRangeDays: number
}

async function buildUnifiedCalendarPayload(input: BuildUnifiedCalendarPayloadInput) {
  const {
    cacheKey,
    clientId,
    startDate,
    endDate,
    includeWorkouts,
    includeRaces,
    includeFieldTests,
    includeEvents,
    includeCheckIns,
    includeWODs,
    includeItems,
    itemsMode,
    includeGroupedByDate,
    maxItemsPerSource,
    rangeClamped,
    maxRangeDays,
  } = input

  // Fast path: counts-only response. This avoids expensive joins/selects and large JSON payloads.
  // Used by perf tests and can be used by the UI for lightweight loading states.
  if (!includeItems && !includeGroupedByDate) {
    const [
      workoutsCount,
      racesCount,
      fieldTestsCount,
      eventsCount,
      checkInsCount,
      wodsCount,
    ] = await Promise.all([
      includeWorkouts
        ? prisma.workout.count({
            where: {
              day: {
                date: { gte: startDate, lte: endDate },
                week: {
                  program: {
                    clientId,
                    isActive: true,
                  },
                },
              },
            },
          })
        : Promise.resolve(0),
      includeRaces
        ? prisma.race.count({
            where: {
              clientId,
              date: { gte: startDate, lte: endDate },
            },
          })
        : Promise.resolve(0),
      includeFieldTests
        ? prisma.fieldTest.count({
            where: {
              clientId,
              date: { gte: startDate, lte: endDate },
            },
          })
        : Promise.resolve(0),
      includeEvents
        ? prisma.calendarEvent.count({
            where: {
              clientId,
              OR: [
                { startDate: { gte: startDate, lte: endDate } },
                { endDate: { gte: startDate, lte: endDate } },
                { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
              ],
              status: { not: 'CANCELLED' },
            },
          })
        : Promise.resolve(0),
      includeCheckIns
        ? prisma.dailyCheckIn.count({
            where: {
              clientId,
              date: { gte: startDate, lte: endDate },
            },
          })
        : Promise.resolve(0),
      includeWODs
        ? prisma.aIGeneratedWOD.count({
            where: {
              clientId,
              createdAt: { gte: startDate, lte: endDate },
              status: { notIn: ['ABANDONED'] },
            },
          })
        : Promise.resolve(0),
    ])

    const payload = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      rangeClamped,
      maxRangeDays: maxRangeDays,
      maxItemsPerSource,
      counts: {
        total:
          workoutsCount +
          racesCount +
          fieldTestsCount +
          eventsCount +
          checkInsCount +
          wodsCount,
        workouts: workoutsCount,
        races: racesCount,
        fieldTests: fieldTestsCount,
        calendarEvents: eventsCount,
        checkIns: checkInsCount,
        wods: wodsCount,
      },
    }

    const json = JSON.stringify(payload)
    unifiedCalendarCache.set(cacheKey, {
      expiresAt: Date.now() + UNIFIED_CALENDAR_TTL_MS,
      staleUntil: Date.now() + UNIFIED_CALENDAR_STALE_MS,
      json,
    })
    return json
  }

  const workoutsPromise = includeWorkouts
    ? itemsMode === 'light'
      ? prisma.workout.findMany({
          where: {
            day: {
              date: { gte: startDate, lte: endDate },
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
            status: true,
            type: true,
            order: true,
            day: {
              select: {
                date: true,
                dayNumber: true,
              },
            },
          },
          take: maxItemsPerSource,
          orderBy: { day: { date: 'asc' } },
        })
      : prisma.workout.findMany({
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
    ? itemsMode === 'light'
      ? prisma.race.findMany({
          where: { clientId, date: { gte: startDate, lte: endDate } },
          select: {
            id: true,
            name: true,
            date: true,
            distance: true,
            classification: true,
            actualTime: true,
          },
          take: maxItemsPerSource,
          orderBy: { date: 'asc' },
        })
      : prisma.race.findMany({
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
    ? itemsMode === 'light'
      ? prisma.fieldTest.findMany({
          where: { clientId, date: { gte: startDate, lte: endDate } },
          select: {
            id: true,
            testType: true,
            date: true,
            valid: true,
          },
          take: maxItemsPerSource,
          orderBy: { date: 'asc' },
        })
      : prisma.fieldTest.findMany({
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
    ? itemsMode === 'light'
      ? prisma.calendarEvent.findMany({
          where: {
            clientId,
            OR: [
              { startDate: { gte: startDate, lte: endDate } },
              { endDate: { gte: startDate, lte: endDate } },
              { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
            ],
            status: { not: 'CANCELLED' },
          },
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            status: true,
            type: true,
            trainingImpact: true,
            allDay: true,
            color: true,
          },
          take: maxItemsPerSource,
          orderBy: { startDate: 'asc' },
        })
      : prisma.calendarEvent.findMany({
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
    ? itemsMode === 'light'
      ? prisma.dailyCheckIn.findMany({
          where: { clientId, date: { gte: startDate, lte: endDate } },
          select: {
            id: true,
            date: true,
            readinessScore: true,
            readinessDecision: true,
          },
          take: maxItemsPerSource,
          orderBy: { date: 'asc' },
        })
      : prisma.dailyCheckIn.findMany({
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
    ? itemsMode === 'light'
      ? prisma.aIGeneratedWOD.findMany({
          where: {
            clientId,
            createdAt: { gte: startDate, lte: endDate },
            status: { notIn: ['ABANDONED'] },
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
            status: true,
            primarySport: true,
            requestedDuration: true,
          },
          take: maxItemsPerSource,
          orderBy: { createdAt: 'asc' },
        })
      : prisma.aIGeneratedWOD.findMany({
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

  const needsItems = includeItems || includeGroupedByDate
  const items: UnifiedCalendarItem[] = []
  const counts = {
    total: 0,
    workouts: 0,
    races: 0,
    fieldTests: 0,
    calendarEvents: 0,
    checkIns: 0,
    wods: 0,
  }

  for (const workout of workouts) {
    counts.total += 1
    counts.workouts += 1
    if (!needsItems) continue
    items.push({
      id: workout.id,
      type: 'WORKOUT',
      title: workout.name,
      description: itemsMode === 'light' ? null : (workout as any).description,
      date: workout.day.date,
      status: workout.status,
      metadata: {
        workoutType: workout.type,
        ...(itemsMode === 'light'
          ? {}
          : {
              intensity: (workout as any).intensity,
              duration: (workout as any).duration,
              distance: (workout as any).distance,
              programId: (workout as any).day.week.program.id,
              programName: (workout as any).day.week.program.name,
              phase: (workout as any).day.week.phase,
              weekNumber: (workout as any).day.week.weekNumber,
              segmentCount: (workout as any).segments.length,
              isCompleted:
                (workout as any).logs.length > 0 && (workout as any).logs[0].completed,
            }),
        dayNumber: workout.day.dayNumber,
        order: workout.order,
      },
    })
  }
  for (const race of races) {
    counts.total += 1
    counts.races += 1
    if (!needsItems) continue
    items.push({
      id: race.id,
      type: 'RACE',
      title: race.name,
      description:
        itemsMode === 'light'
          ? null
          : `${(race as any).distance}${(race as any).distance?.includes('km') ? '' : ' km'} - ${(race as any).classification} Race`,
      date: race.date,
      metadata: {
        distance: (race as any).distance,
        classification: (race as any).classification,
        ...(itemsMode === 'light'
          ? { isCompleted: !!(race as any).actualTime }
          : {
              targetTime: (race as any).targetTime,
              targetPace: (race as any).targetPace,
              actualTime: (race as any).actualTime,
              actualPace: (race as any).actualPace,
              vdot: (race as any).vdot,
              assessment: (race as any).assessment,
              taperWeeks: (race as any).taperWeeks,
              calendarId: (race as any).calendar?.id,
              seasonName: (race as any).calendar?.seasonName,
              isCompleted: !!(race as any).actualTime,
            }),
      },
    })
  }
  for (const test of fieldTests) {
    const results = itemsMode === 'light' ? null : ((test as any).results as Record<string, unknown> | null)
    counts.total += 1
    counts.fieldTests += 1
    if (!needsItems) continue
    items.push({
      id: test.id,
      type: 'FIELD_TEST',
      title: `Fälttest: ${test.testType.replace(/_/g, ' ')}`,
      description: itemsMode === 'light' ? null : ((test as any).notes ?? null),
      date: test.date,
      status: test.valid ? 'VALID' : 'INVALID',
      metadata: {
        testType: test.testType,
        ...(itemsMode === 'light'
          ? {}
          : {
              lt1Pace: (test as any).lt1Pace,
              lt1HR: (test as any).lt1HR,
              lt2Pace: (test as any).lt2Pace,
              lt2HR: (test as any).lt2HR,
              confidence: (test as any).confidence,
              results,
            }),
        valid: test.valid,
      },
    })
  }
  for (const event of events) {
    counts.total += 1
    counts.calendarEvents += 1
    if (!needsItems) continue
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
        trainingImpact: (event as any).trainingImpact,
        allDay: (event as any).allDay,
        color: (event as any).color,
        ...(itemsMode === 'light'
          ? {}
          : {
              impactNotes: (event as any).impactNotes,
              startTime: (event as any).startTime,
              endTime: (event as any).endTime,
              altitude: (event as any).altitude,
              adaptationPhase: (event as any).adaptationPhase,
              illnessType: (event as any).illnessType,
              returnToTrainingDate: (event as any).returnToTrainingDate,
              medicalClearance: (event as any).medicalClearance,
              isReadOnly: (event as any).isReadOnly,
              externalCalendarType: (event as any).externalCalendarType,
              externalCalendarName: (event as any).externalCalendarName,
              createdBy: (event as any).createdBy,
            }),
      },
    })
  }
  for (const checkIn of checkIns) {
    counts.total += 1
    counts.checkIns += 1
    if (!needsItems) continue
    items.push({
      id: checkIn.id,
      type: 'CHECK_IN',
      title: 'Daily Check-in',
      description: itemsMode === 'light' ? null : ((checkIn as any).notes ?? null),
      date: checkIn.date,
      metadata: {
        readinessScore: checkIn.readinessScore,
        readinessDecision: checkIn.readinessDecision,
        ...(itemsMode === 'light'
          ? {}
          : {
              sleepQuality: (checkIn as any).sleepQuality,
              sleepHours: (checkIn as any).sleepHours,
              soreness: (checkIn as any).soreness,
              fatigue: (checkIn as any).fatigue,
              stress: (checkIn as any).stress,
              mood: (checkIn as any).mood,
              restingHR: (checkIn as any).restingHR,
              hrv: (checkIn as any).hrv,
            }),
      },
    })
  }
  for (const wod of wods) {
    counts.total += 1
    counts.wods += 1
    if (!needsItems) continue
    items.push({
      id: wod.id,
      type: 'WOD',
      title: wod.title,
      description: itemsMode === 'light' ? null : ((wod as any).subtitle ?? null),
      date: wod.createdAt,
      status: wod.status,
      metadata: {
        requestedDuration: (wod as any).requestedDuration,
        primarySport: (wod as any).primarySport,
        ...(itemsMode === 'light'
          ? { isCompleted: (wod as any).status === 'COMPLETED' }
          : {
              mode: (wod as any).mode,
              actualDuration: (wod as any).actualDuration,
              intensityAdjusted: (wod as any).intensityAdjusted,
              isCompleted: (wod as any).status === 'COMPLETED',
              sessionRPE: (wod as any).sessionRPE,
            }),
      },
    })
  }

  // Sort by date (only affects response ordering; keeps behavior stable)
  if (needsItems) {
    items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  // Group by date for easier consumption (optional; can be expensive for large ranges).
  const groupedByDate: Record<string, UnifiedCalendarItem[]> | undefined = includeGroupedByDate
    ? (() => {
        const grouped: Record<string, UnifiedCalendarItem[]> = {}
        for (const item of items) {
          const dateKey = item.date.toISOString().slice(0, 10)
          if (!grouped[dateKey]) {
            grouped[dateKey] = []
          }
          grouped[dateKey].push(item)
        }
        return grouped
      })()
    : undefined

  const payload = {
    ...(includeItems ? { items } : {}),
    ...(includeGroupedByDate ? { groupedByDate } : {}),
    itemsMode: includeItems ? itemsMode : undefined,
    dateRange: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    rangeClamped,
    maxRangeDays: maxRangeDays,
    maxItemsPerSource,
    counts,
  }

  // Cache the serialized JSON string so cached responses avoid repeating JSON.stringify()
  // under high concurrency (event-loop CPU savings).
  const json = JSON.stringify(payload)
  unifiedCalendarCache.set(cacheKey, {
    expiresAt: Date.now() + UNIFIED_CALENDAR_TTL_MS,
    staleUntil: Date.now() + UNIFIED_CALENDAR_STALE_MS,
    json,
  })
  return json
}

function jsonResponse(json: string, extraHeaders?: Record<string, string>) {
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
  })
}

async function resolveAuthenticatedUserId(
  request: NextRequest
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const forwardedEmail = request.headers.get('x-auth-user-email')
  const authCacheKey = buildAuthCacheKey(request, forwardedEmail)
  const nowMs = Date.now()

  let authEmail = forwardedEmail
  if (!authEmail) {
    const cachedEmail = authEmailCache.get(authCacheKey)
    if (cachedEmail && cachedEmail.expiresAt > nowMs) {
      authEmail = cachedEmail.email
    } else {
      const inFlightEmail = authEmailInFlight.get(authCacheKey)
      if (inFlightEmail) {
        authEmail = await inFlightEmail
      } else {
        const resolveEmailPromise = (async () => {
          const supabase = await createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user?.email) {
            throw new Error('UNAUTHORIZED')
          }
          return user.email
        })()
        authEmailInFlight.set(authCacheKey, resolveEmailPromise)
        try {
          authEmail = await resolveEmailPromise
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return {
              ok: false,
              response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            }
          }
          throw error
        } finally {
          authEmailInFlight.delete(authCacheKey)
        }
      }
      authEmailCache.set(authCacheKey, {
        expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
        email: authEmail,
      })
    }
  }

  const cachedUserId = userIdByEmailCache.get(authEmail)
  if (cachedUserId && cachedUserId.expiresAt > nowMs) {
    return { ok: true, userId: cachedUserId.userId }
  }

  const inFlightUserId = userIdByEmailInFlight.get(authEmail)
  const resolvedUserId = inFlightUserId
    ? await inFlightUserId
    : await (() => {
        const lookupPromise = prisma.user
          .findUnique({
            where: { email: authEmail },
            select: { id: true },
          })
          .then(user => user?.id ?? null)
        userIdByEmailInFlight.set(authEmail, lookupPromise)
        return lookupPromise.finally(() => {
          userIdByEmailInFlight.delete(authEmail)
        })
      })()

  if (!resolvedUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    }
  }

  userIdByEmailCache.set(authEmail, {
    expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
    userId: resolvedUserId,
  })

  return { ok: true, userId: resolvedUserId }
}

function buildAuthCacheKey(request: NextRequest, forwardedEmail?: string | null): string {
  if (forwardedEmail) {
    return `forwarded:${forwardedEmail}`
  }
  const cookieHeader = request.headers.get('cookie') || ''
  const supabaseSessionCookie = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('sb-') && part.includes('auth-token='))

  if (supabaseSessionCookie) {
    return `cookie:${supabaseSessionCookie}`
  }

  return `cookie:${cookieHeader.slice(0, 256)}`
}

function normalizeCalendarItemsMode(value: string | null): CalendarItemsMode {
  if (value === 'light') return 'light'
  return 'full'
}
