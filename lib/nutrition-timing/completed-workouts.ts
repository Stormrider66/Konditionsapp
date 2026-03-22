import type { WorkoutIntensity, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  deduplicateActivities,
  normalizeGarminActivity,
  normalizeStravaActivity,
  normalizeWorkoutLog,
  type NormalizedActivity,
} from '@/lib/training/activity-deduplication'
import type { WorkoutContext } from '@/lib/nutrition-timing'

type CompletedWorkoutContextInput = {
  clientId: string
  athleteUserId: string
  dayStart: Date
  dayEnd: Date
}

type ActivityCandidate = {
  context: WorkoutContext
  normalized: NormalizedActivity
}

const TYPE_MAP: Partial<Record<string, WorkoutType>> = {
  RUNNING: 'RUNNING',
  CYCLING: 'CYCLING',
  SWIMMING: 'SWIMMING',
  SKIING: 'SKIING',
  TRIATHLON: 'TRIATHLON',
  HYROX: 'HYROX',
  STRENGTH: 'STRENGTH',
  CROSS_TRAINING: 'ALTERNATIVE',
  RECOVERY: 'RECOVERY',
  OTHER: 'OTHER',
}

const INTENSITY_MAP: Partial<Record<string, WorkoutIntensity>> = {
  RECOVERY: 'RECOVERY',
  EASY: 'EASY',
  MODERATE: 'MODERATE',
  HARD: 'THRESHOLD',
  THRESHOLD: 'THRESHOLD',
  INTERVAL: 'INTERVAL',
  MAX: 'MAX',
}

function mapType(type: string | null | undefined): WorkoutType {
  if (!type) return 'OTHER'
  return TYPE_MAP[type] || 'OTHER'
}

function mapIntensity(intensity: string | null | undefined): WorkoutIntensity {
  if (!intensity) return 'MODERATE'
  return INTENSITY_MAP[intensity] || 'MODERATE'
}

export async function getCompletedWorkoutContextsForDay({
  clientId,
  athleteUserId,
  dayStart,
  dayEnd,
}: CompletedWorkoutContextInput): Promise<WorkoutContext[]> {
  const [manualLogs, stravaActivities, garminActivities] = await Promise.all([
    prisma.workoutLog.findMany({
      where: {
        athleteId: athleteUserId,
        completed: true,
        completedAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        workout: {
          select: {
            name: true,
            type: true,
            intensity: true,
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    }),
    prisma.stravaActivity.findMany({
      where: {
        clientId,
        startDate: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startDate: 'asc' },
    }),
    prisma.garminActivity.findMany({
      where: {
        clientId,
        startDate: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { startDate: 'asc' },
    }),
  ])

  const candidates: ActivityCandidate[] = []

  for (const log of manualLogs) {
    const completedAt = log.completedAt || log.createdAt
    candidates.push({
      context: {
        id: `manual-${log.id}`,
        name: log.workout?.name || 'Loggat pass',
        type: mapType(log.workout?.type),
        intensity: log.workout?.intensity || 'MODERATE',
        duration: log.duration || null,
        distance: log.distance || null,
        scheduledTime: completedAt,
        source: 'SYNCED',
        status: 'COMPLETED',
        isToday: true,
        isTomorrow: false,
        daysUntil: 0,
      },
      normalized: normalizeWorkoutLog(log),
    })
  }

  for (const activity of stravaActivities) {
    candidates.push({
      context: {
        id: `strava-${activity.id}`,
        name: activity.name,
        type: mapType(activity.mappedType || activity.type),
        intensity: mapIntensity(activity.mappedIntensity),
        duration: activity.movingTime ? Math.round(activity.movingTime / 60) : null,
        distance: activity.distance ? Math.round((activity.distance / 1000) * 10) / 10 : null,
        scheduledTime: activity.startDate,
        source: 'SYNCED',
        status: 'COMPLETED',
        estimatedCaloriesKcal: activity.calories ? Math.round(activity.calories) : null,
        isToday: true,
        isTomorrow: false,
        daysUntil: 0,
      },
      normalized: normalizeStravaActivity(activity),
    })
  }

  for (const activity of garminActivities) {
    candidates.push({
      context: {
        id: `garmin-${activity.id}`,
        name: activity.name || activity.mappedType || activity.type || 'Garmin Activity',
        type: mapType(activity.mappedType || activity.type),
        intensity: mapIntensity(activity.mappedIntensity),
        duration: activity.duration ? Math.round(activity.duration / 60) : null,
        distance: activity.distance ? Math.round((activity.distance / 1000) * 10) / 10 : null,
        scheduledTime: activity.startDate,
        source: 'SYNCED',
        status: 'COMPLETED',
        estimatedCaloriesKcal: activity.calories ? Math.round(activity.calories) : null,
        isToday: true,
        isTomorrow: false,
        daysUntil: 0,
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

  const { deduplicated } = deduplicateActivities(candidates.map((candidate) => candidate.normalized))
  const keptIds = new Set(deduplicated.map((activity) => activity.id))

  return candidates
    .filter((candidate) => keptIds.has(candidate.normalized.id))
    .map((candidate) => candidate.context)
    .sort((a, b) => {
      const aTime = a.scheduledTime ? a.scheduledTime.getTime() : 0
      const bTime = b.scheduledTime ? b.scheduledTime.getTime() : 0
      return aTime - bTime
    })
}
