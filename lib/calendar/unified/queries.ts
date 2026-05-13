import { prisma } from '@/lib/prisma'
import type { CalendarItemsMode } from './types'

export interface QueryInput {
  clientId: string
  startDate: Date
  endDate: Date
  itemsMode: CalendarItemsMode
  maxItemsPerSource: number
}

// Each "fetchX" returns either a typed array or `[]` when the caller disabled
// that source. The route then concatenates + serializes.

const scheduledWorkoutAssignmentSelect = {
  strengthAssignments: {
    take: 1,
    select: {
      id: true,
      sessionId: true,
      assignedDate: true,
      status: true,
      completedAt: true,
      rpe: true,
      duration: true,
      session: { select: { id: true, name: true } },
    },
  },
  cardioAssignments: {
    take: 1,
    select: {
      id: true,
      sessionId: true,
      assignedDate: true,
      status: true,
      completedAt: true,
      actualDuration: true,
      actualDistance: true,
      avgHeartRate: true,
      session: { select: { id: true, name: true } },
    },
  },
  hybridAssignments: {
    take: 1,
    select: {
      id: true,
      workoutId: true,
      assignedDate: true,
      status: true,
      completedAt: true,
      resultId: true,
      workout: { select: { id: true, name: true } },
    },
  },
  agilityAssignments: {
    take: 1,
    select: {
      id: true,
      workoutId: true,
      assignedDate: true,
      status: true,
      completedAt: true,
      workout: { select: { id: true, name: true } },
    },
  },
} as const

export const fetchWorkouts = ({ clientId, startDate, endDate, itemsMode, maxItemsPerSource }: QueryInput) =>
  itemsMode === 'light'
    ? prisma.workout.findMany({
        where: {
          day: {
            date: { gte: startDate, lte: endDate },
            week: { program: { clientId, isActive: true } },
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
          type: true,
          order: true,
          day: { select: { date: true, dayNumber: true } },
          logs: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { completed: true, completedAt: true },
          },
        },
        take: maxItemsPerSource,
        orderBy: { day: { date: 'asc' } },
      })
    : prisma.workout.findMany({
        where: {
          day: {
            date: { gte: startDate, lte: endDate },
            week: { program: { clientId, isActive: true } },
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
                  program: { select: { id: true, name: true } },
                },
              },
            },
          },
          segments: { take: 3, select: { id: true } },
          logs: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { completed: true, completedAt: true },
          },
        },
        take: maxItemsPerSource,
        orderBy: { day: { date: 'asc' } },
      })

export const fetchRaces = ({ clientId, startDate, endDate, itemsMode, maxItemsPerSource }: QueryInput) =>
  itemsMode === 'light'
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
        where: { clientId, date: { gte: startDate, lte: endDate } },
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
          calendar: { select: { id: true, seasonName: true } },
        },
        take: maxItemsPerSource,
        orderBy: { date: 'asc' },
      })

export const fetchFieldTests = ({ clientId, startDate, endDate, itemsMode, maxItemsPerSource }: QueryInput) =>
  itemsMode === 'light'
    ? prisma.fieldTest.findMany({
        where: { clientId, date: { gte: startDate, lte: endDate } },
        select: { id: true, testType: true, date: true, valid: true },
        take: maxItemsPerSource,
        orderBy: { date: 'asc' },
      })
    : prisma.fieldTest.findMany({
        where: { clientId, date: { gte: startDate, lte: endDate } },
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

export const fetchCalendarEvents = ({ clientId, startDate, endDate, itemsMode, maxItemsPerSource }: QueryInput) =>
  itemsMode === 'light'
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
          isReadOnly: true,
          startTime: true,
          endTime: true,
          ...scheduledWorkoutAssignmentSelect,
        },
        take: maxItemsPerSource,
        orderBy: { startDate: 'asc' },
      })
    : prisma.calendarEvent.findMany({
        where: {
          clientId,
          OR: [
            { startDate: { gte: startDate, lte: endDate } },
            { endDate: { gte: startDate, lte: endDate } },
            { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
          ],
          status: { not: 'CANCELLED' },
        },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          ...scheduledWorkoutAssignmentSelect,
        },
        take: maxItemsPerSource,
        orderBy: { startDate: 'asc' },
      })

export const fetchCheckIns = ({ clientId, startDate, endDate, itemsMode, maxItemsPerSource }: QueryInput) =>
  itemsMode === 'light'
    ? prisma.dailyCheckIn.findMany({
        where: { clientId, date: { gte: startDate, lte: endDate } },
        select: { id: true, date: true, readinessScore: true, readinessDecision: true },
        take: maxItemsPerSource,
        orderBy: { date: 'asc' },
      })
    : prisma.dailyCheckIn.findMany({
        where: { clientId, date: { gte: startDate, lte: endDate } },
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

export const fetchWODs = ({ clientId, startDate, endDate, itemsMode, maxItemsPerSource }: QueryInput) =>
  itemsMode === 'light'
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
          createdAt: { gte: startDate, lte: endDate },
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

export const fetchAdHoc = ({ clientId, startDate, endDate, itemsMode, maxItemsPerSource }: QueryInput) =>
  itemsMode === 'light'
    ? prisma.adHocWorkout.findMany({
        where: {
          athleteId: clientId,
          status: 'CONFIRMED',
          workoutDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          workoutName: true,
          workoutDate: true,
          parsedType: true,
          inputType: true,
        },
        take: maxItemsPerSource,
        orderBy: { workoutDate: 'asc' },
      })
    : prisma.adHocWorkout.findMany({
        where: {
          athleteId: clientId,
          status: 'CONFIRMED',
          workoutDate: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          workoutName: true,
          workoutDate: true,
          parsedType: true,
          parsedStructure: true,
          inputType: true,
          parsingConfidence: true,
        },
        take: maxItemsPerSource,
        orderBy: { workoutDate: 'asc' },
      })

export const fetchGarminActivities = ({ clientId, startDate, endDate, maxItemsPerSource }: QueryInput) =>
  prisma.garminActivity.findMany({
    where: { clientId, startDate: { gte: startDate, lte: endDate } },
    select: {
      id: true,
      name: true,
      type: true,
      mappedType: true,
      startDate: true,
      distance: true,
      duration: true,
      averageHeartrate: true,
      maxHeartrate: true,
      averageSpeed: true,
      averageWatts: true,
      calories: true,
      tss: true,
      deviceName: true,
      indoor: true,
    },
    take: maxItemsPerSource,
    orderBy: { startDate: 'asc' },
  })

/**
 * Counts-only fast path for the no-items mode (used by perf tests + UI
 * lightweight loading states). Avoids expensive selects and big JSON
 * payloads.
 */
export async function fetchAllCounts(
  q: QueryInput & {
    includeWorkouts: boolean
    includeRaces: boolean
    includeFieldTests: boolean
    includeEvents: boolean
    includeCheckIns: boolean
    includeWODs: boolean
    includeAdHoc: boolean
  }
) {
  const { clientId, startDate, endDate } = q
  const [
    workouts,
    races,
    fieldTests,
    events,
    checkIns,
    wods,
    adHoc,
  ] = await Promise.all([
    q.includeWorkouts
      ? prisma.workout.count({
          where: {
            day: {
              date: { gte: startDate, lte: endDate },
              week: { program: { clientId, isActive: true } },
            },
          },
        })
      : Promise.resolve(0),
    q.includeRaces
      ? prisma.race.count({
          where: { clientId, date: { gte: startDate, lte: endDate } },
        })
      : Promise.resolve(0),
    q.includeFieldTests
      ? prisma.fieldTest.count({
          where: { clientId, date: { gte: startDate, lte: endDate } },
        })
      : Promise.resolve(0),
    q.includeEvents
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
    q.includeCheckIns
      ? prisma.dailyCheckIn.count({
          where: { clientId, date: { gte: startDate, lte: endDate } },
        })
      : Promise.resolve(0),
    q.includeWODs
      ? prisma.aIGeneratedWOD.count({
          where: {
            clientId,
            createdAt: { gte: startDate, lte: endDate },
            status: { notIn: ['ABANDONED'] },
          },
        })
      : Promise.resolve(0),
    q.includeAdHoc
      ? prisma.adHocWorkout.count({
          where: {
            athleteId: clientId,
            status: 'CONFIRMED',
            workoutDate: { gte: startDate, lte: endDate },
          },
        })
      : Promise.resolve(0),
  ])

  return { workouts, races, fieldTests, events, checkIns, wods, adHoc }
}
