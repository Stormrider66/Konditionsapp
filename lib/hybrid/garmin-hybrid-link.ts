/**
 * Hybrid focus mode ↔ Garmin Activity link.
 *
 * Hybrid focus logs have wall-clock session timestamps and their own
 * TrainingLoad row. Linking a matching Garmin recording lets us enrich that
 * workload with sensor-derived HR/TSS while preventing the synced activity
 * from being counted again as a separate workout.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { pickBestOverlap } from '@/lib/cardio/garmin-cardio-link'
import { areTypesCompatible } from '@/lib/training/activity-deduplication'

const WINDOW_PAD_MS = 30 * 60 * 1000
const FALLBACK_SESSION_LENGTH_MS = 2 * 60 * 60 * 1000

const HYBRID_COMPATIBLE_TYPES = new Set([
  'CARDIO',
  'CROSS_TRAINING',
  'FUNCTIONAL_FITNESS',
  'GYM',
  'HIIT',
  'HYBRID',
  'INDOOR_CARDIO',
  'OTHER',
  'STRENGTH',
  'STRENGTH_TRAINING',
  'WEIGHT_TRAINING',
])

interface HybridSessionBounds {
  startMs: number
  endMs: number
}

function normalizeActivityType(type: string | null | undefined): string {
  return (type || 'OTHER').trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function isHybridCompatibleActivity(activity: { type: string | null; mappedType: string | null }): boolean {
  const rawType = normalizeActivityType(activity.type)
  const mappedType = normalizeActivityType(activity.mappedType)
  return (
    areTypesCompatible('HYBRID', rawType) ||
    areTypesCompatible('HYBRID', mappedType) ||
    HYBRID_COMPATIBLE_TYPES.has(rawType) ||
    HYBRID_COMPATIBLE_TYPES.has(mappedType)
  )
}

function getHybridSessionBounds(log: {
  startedAt: Date
  completedAt: Date | null
  totalTime: number | null
}): HybridSessionBounds {
  const startMs = log.startedAt.getTime()
  const endMs = log.completedAt
    ? log.completedAt.getTime()
    : log.totalTime
      ? startMs + log.totalTime * 1000
      : startMs + FALLBACK_SESSION_LENGTH_MS

  return {
    startMs,
    endMs: Math.max(endMs, startMs + 1000),
  }
}

async function applyGarminToHybridLoad(hybridWorkoutLogId: string): Promise<void> {
  const log = await prisma.hybridWorkoutLog.findUnique({
    where: { id: hybridWorkoutLogId },
    select: {
      id: true,
      trainingLoadId: true,
      garminActivity: {
        select: {
          id: true,
          tss: true,
          averageHeartrate: true,
          maxHeartrate: true,
          duration: true,
          distance: true,
          mappedIntensity: true,
        },
      },
    },
  })

  if (!log?.trainingLoadId || !log.garminActivity) return

  const garmin = log.garminActivity
  const updateData = {
    ...(garmin.tss != null ? { dailyLoad: garmin.tss } : {}),
    ...(garmin.averageHeartrate != null ? { avgHR: garmin.averageHeartrate } : {}),
    ...(garmin.maxHeartrate != null ? { maxHR: garmin.maxHeartrate } : {}),
    ...(garmin.duration != null ? { duration: Math.round(garmin.duration / 60) } : {}),
    ...(garmin.distance != null ? { distance: garmin.distance / 1000 } : {}),
    ...(garmin.mappedIntensity ? { intensity: garmin.mappedIntensity } : {}),
  }

  if (Object.keys(updateData).length === 0) return

  await prisma.trainingLoad.update({
    where: { id: log.trainingLoadId },
    data: updateData,
  })

  logger.info('Enriched hybrid training load from Garmin activity', {
    hybridWorkoutLogId: log.id,
    garminActivityId: garmin.id,
    trainingLoadId: log.trainingLoadId,
  })
}

/**
 * Try to link a completed hybrid focus log to the Garmin recording that covers
 * it. No-op when already linked or no clear match exists.
 */
export async function linkGarminToHybridLog(hybridWorkoutLogId: string): Promise<boolean> {
  const log = await prisma.hybridWorkoutLog.findUnique({
    where: { id: hybridWorkoutLogId },
    select: {
      id: true,
      athleteId: true,
      startedAt: true,
      completedAt: true,
      totalTime: true,
      garminActivityId: true,
    },
  })

  if (!log || log.garminActivityId) return false

  const { startMs, endMs } = getHybridSessionBounds(log)

  const candidates = await prisma.garminActivity.findMany({
    where: {
      clientId: log.athleteId,
      adHocWorkout: null,
      cardioSessionLog: null,
      hybridWorkoutLog: null,
      startDate: {
        gte: new Date(startMs - 4 * 60 * 60 * 1000),
        lte: new Date(endMs + WINDOW_PAD_MS),
      },
    },
    select: {
      id: true,
      startDate: true,
      duration: true,
      elapsedTime: true,
      type: true,
      mappedType: true,
    },
  })

  const compatibleCandidates = candidates.filter(isHybridCompatibleActivity)
  const match = pickBestOverlap(startMs, endMs, compatibleCandidates)
  if (!match) return false

  await prisma.hybridWorkoutLog.update({
    where: { id: log.id },
    data: { garminActivityId: match.id },
  })

  logger.info('Linked hybrid workout log to Garmin activity', {
    hybridWorkoutLogId: log.id,
    garminActivityId: match.id,
  })

  await applyGarminToHybridLoad(log.id)
  return true
}

/**
 * Try to link a newly synced Garmin activity to an already-completed hybrid
 * focus log. Used by the Garmin webhook when the watch recording arrives
 * after the app session has completed.
 */
export async function linkGarminToHybridLogByActivity(garminActivityDbId: string): Promise<boolean> {
  const garmin = await prisma.garminActivity.findUnique({
    where: { id: garminActivityDbId },
    select: {
      id: true,
      clientId: true,
      startDate: true,
      duration: true,
      elapsedTime: true,
      type: true,
      mappedType: true,
      adHocWorkout: { select: { id: true } },
      cardioSessionLog: { select: { id: true } },
      hybridWorkoutLog: { select: { id: true } },
    },
  })

  if (!garmin || garmin.adHocWorkout || garmin.cardioSessionLog || garmin.hybridWorkoutLog) {
    return false
  }
  if (!isHybridCompatibleActivity(garmin)) return false

  const activityStartMs = garmin.startDate.getTime()
  const activityLengthSec = garmin.duration ?? garmin.elapsedTime
  const activityEndMs = activityLengthSec && activityLengthSec > 0
    ? activityStartMs + activityLengthSec * 1000
    : activityStartMs + FALLBACK_SESSION_LENGTH_MS

  const candidateLogs = await prisma.hybridWorkoutLog.findMany({
    where: {
      athleteId: garmin.clientId,
      status: 'COMPLETED',
      garminActivityId: null,
      startedAt: {
        gte: new Date(activityStartMs - 4 * 60 * 60 * 1000),
        lte: new Date(activityEndMs + WINDOW_PAD_MS),
      },
    },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      totalTime: true,
    },
  })

  const logCandidates = candidateLogs.map((log) => {
    const { startMs, endMs } = getHybridSessionBounds(log)
    return {
      id: log.id,
      startDate: new Date(startMs),
      duration: Math.round((endMs - startMs) / 1000),
      elapsedTime: null,
    }
  })

  const match = pickBestOverlap(activityStartMs, activityEndMs, logCandidates)
  if (!match) return false

  await prisma.hybridWorkoutLog.update({
    where: { id: match.id },
    data: { garminActivityId: garmin.id },
  })

  logger.info('Linked Garmin activity to hybrid workout log', {
    garminActivityId: garmin.id,
    hybridWorkoutLogId: match.id,
  })

  await applyGarminToHybridLoad(match.id)
  return true
}
