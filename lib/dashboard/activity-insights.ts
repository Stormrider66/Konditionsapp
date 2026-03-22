import { subDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import {
  deduplicateActivities,
  normalizeAIWod,
  normalizeConcept2Activity,
  normalizeGarminActivity,
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

  const [manualLogs, stravaActivities, garminActivities, concept2Results, aiWods, adHocWorkouts] = await Promise.all([
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

  const { deduplicated } = deduplicateActivities(candidates.map((candidate) => candidate.normalized))
  const keptIds = new Set(deduplicated.map((activity) => activity.id))

  return candidates
    .filter((candidate) => keptIds.has(candidate.normalized.id))
    .sort((a, b) => b.summary.date.getTime() - a.summary.date.getTime())[0]
    ?.summary ?? null
}

export async function getDashboardWeeklyTSS(clientId: string): Promise<number> {
  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const twentyEightDaysAgo = subDays(now, 28)

  const [manualTrainingLoads, stravaActivities, garminActivities] = await Promise.all([
    prisma.trainingLoad.findMany({
      where: {
        clientId,
        date: { gte: sevenDaysAgo },
      },
      select: {
        dailyLoad: true,
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

  let syncedWeeklyTss = 0
  for (const [dateKey, tss] of Object.entries(dailyTSS)) {
    const date = new Date(dateKey)
    if (date >= sevenDaysAgo) {
      syncedWeeklyTss += tss
    }
  }

  const manualWeeklyTss = manualTrainingLoads.reduce((sum, load) => sum + (load.dailyLoad || 0), 0)
  return Math.round(syncedWeeklyTss + manualWeeklyTss)
}
