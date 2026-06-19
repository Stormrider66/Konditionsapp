import { differenceInCalendarDays, subDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import {
  formatMachineName,
  inferActivityType,
  inferQuickErgMachineTypeFromDevice,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'
import {
  deduplicateActivities,
  normalizeAIWod,
  normalizeConcept2Activity,
  normalizeGarminActivity,
  normalizeQuickErgActivity,
  normalizeStravaActivity,
  normalizeWorkoutLog,
  aggregateTSSByDay,
  type ActivitySource,
  type NormalizedActivity,
} from '@/lib/training/activity-deduplication'
import type { DashboardRecentActivitySummary } from '@/types/dashboard-recent-activity'

type ActivityCandidate = {
  summary: DashboardRecentActivitySummary
  normalized: NormalizedActivity
}

function asQuickErgMachineKind(value?: string | null): 'bike' | 'rower' | null {
  return value === 'bike' || value === 'rower' ? value : null
}

function displayQuickErgMachineType(session: {
  machineType: QuickErgMachineType
  machineKind?: string | null
  deviceName?: string | null
}): QuickErgMachineType {
  return inferQuickErgMachineTypeFromDevice({
    currentMachineType: session.machineType,
    machineKind: asQuickErgMachineKind(session.machineKind),
    deviceName: session.deviceName,
  }) ?? session.machineType
}

export async function getDashboardRecentActivitySummary(clientId: string): Promise<DashboardRecentActivitySummary | null> {
  const now = new Date()
  const since = subDays(now, 14)

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      athleteAccount: {
        select: { userId: true },
      },
    },
  })

  const athleteUserId = client?.athleteAccount?.userId ?? null

  const [manualLogs, stravaActivities, garminActivities, concept2Results, quickErgSessions, phoneRunSessions, aiWods, adHocWorkouts, hybridWorkoutLogs] = await Promise.all([
    athleteUserId
      ? prisma.workoutLog.findMany({
          where: {
            athleteId: athleteUserId,
            completedAt: { gte: since },
          },
          include: {
            workout: { select: { name: true, type: true } },
          },
          orderBy: { completedAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: { gte: since },
      },
      orderBy: { startDate: 'desc' },
      take: 5,
    }),
    prisma.garminActivity.findMany({
      where: {
        clientId,
        startDate: { gte: since },
        adHocWorkout: null,
        cardioSessionLog: null,
        hybridWorkoutLog: null,
      },
      orderBy: { startDate: 'desc' },
      take: 5,
    }),
    prisma.concept2Result.findMany({
      where: {
        clientId,
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.quickErgSession.findMany({
      where: {
        clientId,
        startedAt: { gte: since },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),
    prisma.phoneRunSession.findMany({
      where: {
        clientId,
        startedAt: { gte: since },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),
    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId,
        status: 'COMPLETED',
        completedAt: { gte: since },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    }),
    prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        status: 'CONFIRMED',
        workoutDate: { gte: since },
      },
      orderBy: { workoutDate: 'desc' },
      take: 5,
    }),
    prisma.hybridWorkoutLog.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        startedAt: { gte: since },
      },
      include: {
        workout: { select: { name: true, format: true } },
        garminActivity: {
          select: {
            tss: true,
            averageHeartrate: true,
            duration: true,
            distance: true,
            calories: true,
            deviceName: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),
  ])

  const candidates: ActivityCandidate[] = []

  for (const log of manualLogs) {
    candidates.push({
      summary: {
        id: log.id,
        source: 'manual',
        name: log.workout?.name || 'Workout',
        type: log.workout?.type || 'OTHER',
        date: log.completedAt || log.createdAt,
        durationMinutes: log.duration || undefined,
        distanceKm: log.distance || undefined,
        avgHR: log.avgHR || undefined,
        notes: log.notes || undefined,
      },
      normalized: normalizeWorkoutLog(log),
    })
  }

  for (const activity of stravaActivities) {
    candidates.push({
      summary: {
        id: activity.id,
        source: 'strava',
        name: activity.name,
        type: activity.mappedType || activity.type || 'OTHER',
        date: activity.startDate,
        durationMinutes: activity.movingTime ? Math.round(activity.movingTime / 60) : undefined,
        distanceKm: activity.distance ? Math.round((activity.distance / 1000) * 10) / 10 : undefined,
        avgHR: activity.averageHeartrate || undefined,
        calories: activity.calories || undefined,
        tss: activity.tss ? Math.round(activity.tss) : undefined,
      },
      normalized: normalizeStravaActivity(activity),
    })
  }

  for (const activity of garminActivities) {
    candidates.push({
      summary: {
        id: activity.id,
        source: 'garmin',
        name: activity.name || activity.mappedType || activity.type || 'Garmin Activity',
        type: activity.mappedType || activity.type || 'OTHER',
        date: activity.startDate,
        durationMinutes: activity.duration ? Math.round(activity.duration / 60) : undefined,
        distanceKm: activity.distance ? Math.round((activity.distance / 1000) * 10) / 10 : undefined,
        avgHR: activity.averageHeartrate || undefined,
        calories: activity.calories || undefined,
        tss: activity.tss ? Math.round(activity.tss) : undefined,
        deviceModel: activity.deviceName || undefined,
      },
      normalized: normalizeGarminActivity(
        {
          activityId: activity.garminActivityId.toString(),
          type: activity.type,
          mappedType: activity.mappedType || undefined,
          duration: activity.duration || undefined,
          distance: activity.distance || undefined,
          tss: activity.tss || undefined,
          avgHR: activity.averageHeartrate || undefined,
          startTimeSeconds: Math.floor(activity.startDate.getTime() / 1000),
        },
        activity.startDate
      ),
    })
  }

  for (const result of concept2Results) {
    candidates.push({
      summary: {
        id: result.id,
        source: 'concept2',
        name: result.workoutType ? `${result.type} - ${result.workoutType}` : result.type,
        type: result.mappedType || 'ROWING',
        date: result.date,
        durationMinutes: result.time ? Math.round(result.time / 600) : undefined,
        distanceKm: result.distance ? Math.round((result.distance / 1000) * 10) / 10 : undefined,
        avgHR: result.avgHeartRate || undefined,
        calories: result.calories || undefined,
        tss: result.tss ? Math.round(result.tss) : undefined,
        notes: result.comments || undefined,
      },
      normalized: normalizeConcept2Activity(result),
    })
  }

  for (const session of quickErgSessions) {
    const machineType = displayQuickErgMachineType({
      machineType: session.machineType as QuickErgMachineType,
      machineKind: session.machineKind,
      deviceName: session.deviceName,
    })

    candidates.push({
      summary: {
        id: session.id,
        source: 'quickerg',
        name: formatMachineName(machineType),
        type: inferActivityType(machineType),
        date: session.startedAt,
        durationMinutes: Math.round(session.durationSec / 60),
        distanceKm: session.distanceMeters ? Math.round((session.distanceMeters / 1000) * 10) / 10 : undefined,
        avgHR: session.avgHeartRate || undefined,
        calories: session.calories || undefined,
        notes: session.notes || undefined,
      },
      normalized: normalizeQuickErgActivity(session),
    })
  }

  for (const session of phoneRunSessions) {
    candidates.push({
      summary: {
        id: session.id,
        source: 'phonerun',
        name: 'Phone run',
        type: 'RUNNING',
        date: session.startedAt,
        durationMinutes: Math.round(session.durationSec / 60),
        distanceKm: Math.round((session.distanceMeters / 1000) * 10) / 10,
        avgHR: session.avgHeartRate || undefined,
        notes: session.notes || undefined,
        deviceModel: session.deviceName || undefined,
      },
      normalized: {
        id: `phonerun-${session.id}`,
        source: 'phonerun',
        date: session.startedAt,
        startTime: session.startedAt,
        duration: session.durationSec,
        type: 'RUNNING',
        distance: session.distanceMeters,
        avgHR: session.avgHeartRate || undefined,
        originalId: session.id,
      },
    })
  }

  for (const wod of aiWods) {
    candidates.push({
      summary: {
        id: wod.id,
        source: 'ai',
        name: wod.title,
        type: wod.primarySport || 'STRENGTH',
        date: wod.completedAt || wod.createdAt,
        durationMinutes: wod.actualDuration || wod.requestedDuration || undefined,
        tss: wod.sessionRPE && (wod.actualDuration || wod.requestedDuration)
          ? Math.round((wod.actualDuration || wod.requestedDuration || 0) * wod.sessionRPE * 0.8)
          : undefined,
        notes: wod.subtitle || undefined,
      },
      normalized: normalizeAIWod(wod),
    })
  }

  for (const workout of adHocWorkouts) {
    const parsed = workout.parsedStructure as ParsedWorkout | null
    const name =
      workout.workoutName ||
      parsed?.name ||
      `${parsed?.sport ? `${parsed.sport} ` : ''}${workout.parsedType || parsed?.type || 'Workout'}`

    candidates.push({
      summary: {
        id: workout.id,
        source: 'adhoc',
        name,
        type: workout.parsedType || parsed?.type || 'OTHER',
        date: workout.workoutDate,
        durationMinutes: parsed?.duration || undefined,
        distanceKm: getParsedWorkoutDistanceKm(parsed) || undefined,
        avgHR: parsed?.avgHeartRate || undefined,
        calories: parsed?.estimatedCalories || undefined,
        notes: parsed?.notes || undefined,
      },
      normalized: {
        id: `adhoc-${workout.id}`,
        source: 'adhoc' as ActivitySource,
        date: workout.workoutDate,
        startTime: workout.workoutDate,
        duration: (parsed?.duration || 0) * 60,
        type: workout.parsedType || parsed?.type || 'OTHER',
        distance: getParsedWorkoutDistanceKm(parsed) ? getParsedWorkoutDistanceKm(parsed)! * 1000 : undefined,
        avgHR: parsed?.avgHeartRate || undefined,
        originalId: workout.id,
      },
    })
  }

  for (const log of hybridWorkoutLogs) {
    const garmin = log.garminActivity
    const durationMinutes = garmin?.duration
      ? Math.round(garmin.duration / 60)
      : log.totalTime
        ? Math.round(log.totalTime / 60)
        : undefined
    const estimatedTSS = log.totalTime
      ? Math.round((log.totalTime / 60) * ((log.sessionRPE || 7) / 10) * 1.1)
      : undefined

    candidates.push({
      summary: {
        id: log.id,
        source: 'hybrid',
        name: log.workout?.name || 'Hybrid workout',
        type: 'HYBRID',
        date: log.completedAt || log.startedAt,
        durationMinutes,
        distanceKm: garmin?.distance ? Math.round((garmin.distance / 1000) * 10) / 10 : undefined,
        avgHR: garmin?.averageHeartrate || undefined,
        calories: garmin?.calories || undefined,
        tss: garmin?.tss ? Math.round(garmin.tss) : estimatedTSS,
        deviceModel: garmin?.deviceName || undefined,
        notes: log.notes || undefined,
      },
      normalized: {
        id: `hybrid-${log.id}`,
        source: 'hybrid' as ActivitySource,
        date: log.completedAt || log.startedAt,
        startTime: log.startedAt,
        duration: (durationMinutes || 0) * 60,
        type: 'HYBRID',
        distance: garmin?.distance || undefined,
        tss: garmin?.tss || estimatedTSS,
        avgHR: garmin?.averageHeartrate || undefined,
        originalId: log.id,
      },
    })
  }

  const { deduplicated } = deduplicateActivities(candidates.map((candidate) => candidate.normalized))
  const keptIds = new Set(deduplicated.map((activity) => activity.id))

  return candidates
    .filter((candidate) => keptIds.has(candidate.normalized.id))
    .sort((a, b) => b.summary.date.getTime() - a.summary.date.getTime())[0]
    ?.summary ?? null
}

const DEFAULT_WEEKLY_TSS_TARGET = 400

export interface DashboardWeeklyLoad {
  weeklyTSS: number
  weeklyTSSTarget: number
  targetSource: 'history' | 'default'
}

export async function getDashboardWeeklyLoad(clientId: string): Promise<DashboardWeeklyLoad> {
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const twentyEightDaysAgo = subDays(now, 28)

  const [manualTrainingLoads, stravaActivities, garminActivities] = await Promise.all([
    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: twentyEightDaysAgo },
        // WORKOUT rows only — ACWR_SUMMARY rows duplicate the day's
        // workout rows' dailyLoad and would double-count.
        source: 'WORKOUT',
      },
      select: {
        dailyLoad: true,
        date: true,
      },
    }),
    prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: { gte: twentyEightDaysAgo },
      },
      select: {
        id: true,
        startDate: true,
        movingTime: true,
        distance: true,
        mappedType: true,
        type: true,
        tss: true,
        trimp: true,
        averageHeartrate: true,
        stravaId: true,
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.garminActivity.findMany({
      where: {
        clientId,
        startDate: { gte: twentyEightDaysAgo },
        adHocWorkout: null,
        cardioSessionLog: null,
        hybridWorkoutLog: null,
      },
      select: {
        garminActivityId: true,
        startDate: true,
        duration: true,
        distance: true,
        type: true,
        mappedType: true,
        tss: true,
        averageHeartrate: true,
      },
      orderBy: { startDate: 'desc' },
    }),
  ])

  const dedupInputs: NormalizedActivity[] = [
    ...stravaActivities.map((activity) => normalizeStravaActivity(activity)),
    ...garminActivities.map((activity) =>
      normalizeGarminActivity(
        {
          activityId: activity.garminActivityId.toString(),
          type: activity.type,
          mappedType: activity.mappedType || undefined,
          duration: activity.duration || undefined,
          distance: activity.distance || undefined,
          tss: activity.tss || undefined,
          avgHR: activity.averageHeartrate || undefined,
          startTimeSeconds: Math.floor(activity.startDate.getTime() / 1000),
        },
        activity.startDate
      )
    ),
  ]

  const { deduplicated } = deduplicateActivities(dedupInputs)
  const dailyTSS = aggregateTSSByDay(deduplicated)

  let weeklyTss = 0
  let fourWeekTss = 0
  let earliestActivity: Date | null = null

  for (const [dateKey, tss] of Object.entries(dailyTSS)) {
    const date = new Date(dateKey)
    fourWeekTss += tss
    if (date >= sevenDaysAgo) {
      weeklyTss += tss
    }
    if (tss > 0 && (!earliestActivity || date < earliestActivity)) {
      earliestActivity = date
    }
  }

  for (const load of manualTrainingLoads) {
    const value = load.dailyLoad || 0
    fourWeekTss += value
    if (load.date >= sevenDaysAgo) {
      weeklyTss += value
    }
    if (value > 0 && (!earliestActivity || load.date < earliestActivity)) {
      earliestActivity = load.date
    }
  }

  const weeklyTSS = Math.round(weeklyTss)

  if (fourWeekTss <= 0 || !earliestActivity) {
    return { weeklyTSS, weeklyTSSTarget: DEFAULT_WEEKLY_TSS_TARGET, targetSource: 'default' }
  }

  // Target = average weekly load over the observed history. Athletes with
  // fewer than four weeks of data are averaged over their actual history so
  // the target isn't diluted by empty weeks.
  const historyDays = Math.min(differenceInCalendarDays(now, earliestActivity) + 1, 28)
  const observedWeeks = Math.min(Math.max(historyDays / 7, 1), 4)
  const weeklyTSSTarget = Math.max(Math.round(fourWeekTss / observedWeeks / 10) * 10, 100)

  return { weeklyTSS, weeklyTSSTarget, targetSource: 'history' }
}
