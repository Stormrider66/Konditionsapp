/**
 * Athlete workout-history feed — the merged 8-source list behind
 * /athlete/history and GET /api/athlete/history.
 *
 * One implementation shared by the server-component page and the JSON API
 * (mobile app), so the two can't drift. Sources and their ID spaces:
 *
 * - WorkoutLog            athleteId = **User.id** (the only one)
 * - StrengthSessionAssignment, CardioSessionAssignment,
 *   HybridWorkoutAssignment, AgilityWorkoutAssignment,
 *   AdHocWorkout          athleteId = **Client.id**
 * - AIGeneratedWOD, QuickErgSession clientId = Client.id
 *
 * Stats are always computed over the FULL timeframe; the type filter applies
 * to the item list only (matches the page's long-standing behavior).
 */

import { prisma } from '@/lib/prisma'
import { subDays, subMonths } from 'date-fns'
import type { Prisma } from '@prisma/client'
import {
  formatMachineName,
  inferActivityType,
  inferQuickErgMachineTypeFromDevice,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'

export type HistoryTimeframe = '7days' | '30days' | '3months' | '6months' | '1year'

const TIMEFRAMES: HistoryTimeframe[] = ['7days', '30days', '3months', '6months', '1year']

export function resolveHistoryTimeframe(value: string | undefined | null): HistoryTimeframe {
  return TIMEFRAMES.includes(value as HistoryTimeframe) ? (value as HistoryTimeframe) : '30days'
}

export function historyTimeframeStart(timeframe: HistoryTimeframe, now: Date): Date {
  switch (timeframe) {
    case '7days':
      return subDays(now, 7)
    case '30days':
      return subDays(now, 30)
    case '3months':
      return subMonths(now, 3)
    case '6months':
      return subMonths(now, 6)
    case '1year':
      return subMonths(now, 12)
  }
}

const WORKOUT_LOG_INCLUDE = {
  workout: {
    select: {
      id: true,
      name: true,
      type: true,
      intensity: true,
      distance: true,
      duration: true,
      day: {
        select: {
          week: {
            select: {
              program: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.WorkoutLogInclude

export type HistoryWorkoutLog = Prisma.WorkoutLogGetPayload<{
  include: typeof WORKOUT_LOG_INCLUDE
}>

export interface HistoryFeedItem {
  id: string
  date: Date
  name: string
  type: string
  programName?: string
  distance?: number | null
  duration?: number | null
  perceivedEffort?: number | null
  isAdHoc: boolean
  inputType?: string
  workoutId?: string
  source?: string
  linkHref?: string
}

export interface HistoryFeedStats {
  totalWorkouts: number
  totalDistanceKm: number
  totalDurationMin: number
  /** Mean RPE across all sources that reported one, or null. */
  avgRPE: number | null
}

export interface AthleteHistoryFeed {
  timeframe: HistoryTimeframe
  items: HistoryFeedItem[]
  stats: HistoryFeedStats
  /** Raw program-workout logs (with workout/program context) for charts/export. */
  logs: HistoryWorkoutLog[]
}

interface ParsedAdHocHistory {
  name?: string
  type?: string
  sport?: string
  distance?: number
  duration?: number
  perceivedEffort?: number
}

function asMachineKind(value: string | null): 'bike' | 'rower' | null {
  return value === 'bike' || value === 'rower' ? value : null
}

function displayQuickErgMachineType(session: {
  machineType: QuickErgMachineType
  machineKind?: string | null
  deviceName?: string | null
}): QuickErgMachineType {
  return inferQuickErgMachineTypeFromDevice({
    currentMachineType: session.machineType,
    machineKind: asMachineKind(session.machineKind ?? null),
    deviceName: session.deviceName,
  }) ?? session.machineType
}

export async function getAthleteHistoryFeed(params: {
  /** User.id — drives the WorkoutLog query. */
  userId: string
  /** Client.id — drives assignments / ad-hoc / WOD queries. */
  clientId: string
  timeframe?: string | null
  /** Filter the item list (not the stats) to one workout type. */
  typeFilter?: string | null
  /** Localized fallback name for ad-hoc workouts without a parsed name. */
  fallbackAdHocName: string
  now?: Date
}): Promise<AthleteHistoryFeed> {
  const { userId, clientId, fallbackAdHocName } = params
  const now = params.now ?? new Date()
  const timeframe = resolveHistoryTimeframe(params.timeframe)
  const startDate = historyTimeframeStart(timeframe, now)

  const [
    logs,
    adHocWorkouts,
    strengthAssignments,
    cardioAssignments,
    hybridAssignments,
    agilityAssignments,
    completedWODs,
    quickErgSessions,
  ] = await Promise.all([
    prisma.workoutLog.findMany({
      where: {
        athleteId: userId,
        completed: true,
        completedAt: { gte: startDate, lte: now },
      },
      include: WORKOUT_LOG_INCLUDE,
      orderBy: { completedAt: 'desc' },
    }),
    prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        status: 'CONFIRMED',
        workoutDate: { gte: startDate, lte: now },
      },
      orderBy: { workoutDate: 'desc' },
    }),
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: { session: { select: { name: true } } },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.cardioSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: { session: { select: { name: true, sport: true } } },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.hybridWorkoutAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: { workout: { select: { name: true, format: true } } },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.agilityWorkoutAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: { workout: { select: { name: true } } },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      select: {
        id: true,
        title: true,
        primarySport: true,
        actualDuration: true,
        requestedDuration: true,
        sessionRPE: true,
        completedAt: true,
        source: true,
      },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.quickErgSession.findMany({
      where: {
        clientId,
        completedAt: { gte: startDate, lte: now },
      },
      select: {
        id: true,
        machineType: true,
        machineKind: true,
        deviceName: true,
        completedAt: true,
        durationSec: true,
        distanceMeters: true,
        rpe: true,
      },
      orderBy: { completedAt: 'desc' },
    }),
  ])

  const adHocWithParsedData = adHocWorkouts.map((adHoc) => {
    const parsed = adHoc.parsedStructure as ParsedAdHocHistory | null
    return {
      id: adHoc.id,
      workoutDate: adHoc.workoutDate,
      name: parsed?.name || adHoc.workoutName || fallbackAdHocName,
      type: parsed?.type || 'OTHER',
      sport: parsed?.sport,
      distance: parsed?.distance,
      duration: parsed?.duration,
      perceivedEffort: parsed?.perceivedEffort,
      isAdHoc: true,
      inputType: adHoc.inputType,
    }
  })

  const strengthItems = strengthAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.session.name,
    type: 'STRENGTH' as const,
    duration: a.duration || null, // already in minutes
    perceivedEffort: a.rpe || null,
    distance: null as number | null,
    source: 'strength-assignment' as const,
    linkHref: `/athlete/workout/${a.id}`,
  }))

  const cardioItems = cardioAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.session.name,
    type: 'CARDIO' as const,
    duration: a.actualDuration ? Math.round(a.actualDuration / 60) : null, // seconds → minutes
    perceivedEffort: null as number | null,
    distance: a.actualDistance ? a.actualDistance / 1000 : null, // meters → km
    source: 'cardio-assignment' as const,
    linkHref: `/athlete/cardio`,
  }))

  const hybridItems = hybridAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.workout.name,
    type: 'HYBRID' as const,
    duration: null as number | null,
    perceivedEffort: null as number | null,
    distance: null as number | null,
    source: 'hybrid-assignment' as const,
    linkHref: `/athlete/hybrid/${a.id}`,
  }))

  const agilityItems = agilityAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.workout.name,
    type: 'AGILITY' as const,
    duration: null as number | null,
    perceivedEffort: null as number | null,
    distance: null as number | null,
    source: 'agility-assignment' as const,
    linkHref: `/athlete/agility/${a.id}`,
  }))

  const allAssignmentItems = [...strengthItems, ...cardioItems, ...hybridItems, ...agilityItems]

  const wodItems = completedWODs.map((wod) => ({
    id: wod.id,
    date: wod.completedAt!,
    name: wod.title,
    type: wod.primarySport || 'OTHER',
    duration: wod.actualDuration || wod.requestedDuration || null,
    perceivedEffort: wod.sessionRPE || null,
    distance: null as number | null,
    source: wod.source === 'chat' ? 'ai-chat' : 'wod',
    linkHref: `/athlete/wod/${wod.id}`,
  }))

  const quickErgItems = quickErgSessions.map((session) => {
    const machineType = displayQuickErgMachineType({
      machineType: session.machineType as QuickErgMachineType,
      machineKind: session.machineKind,
      deviceName: session.deviceName,
    })

    return {
      id: session.id,
      date: session.completedAt,
      name: formatMachineName(machineType),
      type: inferActivityType(machineType),
      duration: Math.round(session.durationSec / 60),
      perceivedEffort: session.rpe || null,
      distance: session.distanceMeters ? session.distanceMeters / 1000 : null,
      source: 'quick-erg' as const,
      linkHref: `/athlete/quick-erg/${session.id}`,
    }
  })

  const totalWorkouts =
    logs.length + adHocWorkouts.length + allAssignmentItems.length + wodItems.length + quickErgItems.length
  const totalDistanceKm =
    logs.reduce((sum, log) => sum + (log.distance || 0), 0) +
    adHocWithParsedData.reduce((sum, w) => sum + (w.distance || 0), 0) +
    allAssignmentItems.reduce((sum, a) => sum + (a.distance || 0), 0) +
    quickErgItems.reduce((sum, s) => sum + (s.distance || 0), 0)
  const totalDurationMin =
    logs.reduce((sum, log) => sum + (log.duration || 0), 0) +
    adHocWithParsedData.reduce((sum, w) => sum + (w.duration || 0), 0) +
    allAssignmentItems.reduce((sum, a) => sum + (a.duration || 0), 0) +
    wodItems.reduce((sum, w) => sum + (w.duration || 0), 0) +
    quickErgItems.reduce((sum, s) => sum + (s.duration || 0), 0)

  const allEfforts = [
    ...logs.filter((log) => log.perceivedEffort).map((log) => log.perceivedEffort!),
    ...adHocWithParsedData.filter((w) => w.perceivedEffort).map((w) => w.perceivedEffort!),
    ...allAssignmentItems.filter((a) => a.perceivedEffort).map((a) => a.perceivedEffort!),
    ...wodItems.filter((w) => w.perceivedEffort).map((w) => w.perceivedEffort!),
    ...quickErgItems.filter((s) => s.perceivedEffort).map((s) => s.perceivedEffort!),
  ]
  const avgRPE =
    allEfforts.length > 0
      ? allEfforts.reduce((sum, e) => sum + e, 0) / allEfforts.length
      : null

  const items: HistoryFeedItem[] = [
    ...logs.map((log) => ({
      id: log.id,
      date: log.completedAt!,
      name: log.workout.name,
      type: log.workout.type,
      programName: log.workout.day.week.program.name,
      distance: log.distance,
      duration: log.duration,
      perceivedEffort: log.perceivedEffort,
      isAdHoc: false,
      workoutId: log.workout.id,
    })),
    ...adHocWithParsedData.map((w) => ({
      id: w.id,
      date: w.workoutDate,
      name: w.name,
      type: w.type === 'CARDIO' && w.sport ? w.sport : w.type,
      programName: undefined,
      distance: w.distance,
      duration: w.duration,
      perceivedEffort: w.perceivedEffort,
      isAdHoc: true,
      inputType: w.inputType,
    })),
    ...allAssignmentItems.map((a) => ({
      id: a.id,
      date: a.date,
      name: a.name,
      type: a.type as string,
      programName: undefined,
      distance: a.distance,
      duration: a.duration,
      perceivedEffort: a.perceivedEffort,
      isAdHoc: false,
      source: a.source as string,
      linkHref: a.linkHref,
    })),
    ...wodItems.map((w) => ({
      id: w.id,
      date: w.date,
      name: w.name,
      type: w.type,
      programName: undefined,
      distance: w.distance,
      duration: w.duration,
      perceivedEffort: w.perceivedEffort,
      isAdHoc: false,
      source: w.source,
      linkHref: w.linkHref,
    })),
    ...quickErgItems.map((session) => ({
      id: session.id,
      date: session.date,
      name: session.name,
      type: session.type,
      programName: undefined,
      distance: session.distance,
      duration: session.duration,
      perceivedEffort: session.perceivedEffort,
      isAdHoc: false,
      source: session.source,
      linkHref: session.linkHref,
    })),
  ]
    .filter((item) => !params.typeFilter || item.type === params.typeFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    timeframe,
    items,
    stats: { totalWorkouts, totalDistanceKm, totalDurationMin, avgRPE },
    logs,
  }
}
