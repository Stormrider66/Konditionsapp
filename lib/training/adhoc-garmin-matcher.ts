/**
 * Ad-Hoc ↔ Garmin Activity Matcher
 *
 * Automatically links manually-logged workouts (AdHocWorkout) with
 * Garmin-synced activities (GarminActivity) when they represent the
 * same workout session. Combines the ad-hoc's workout description
 * (exercises, sets, reps) with Garmin's sensor data (HR, zones, TSS).
 */

import { prisma } from '@/lib/prisma'
import { areTypesCompatible } from '@/lib/training/activity-deduplication'
import { startOfDay, endOfDay } from 'date-fns'
import { logger } from '@/lib/logger'

const TIME_WINDOW_MS = 2 * 60 * 60 * 1000 // ±2 hours
const DURATION_TOLERANCE = 0.3 // ±30%

// If the ad-hoc time is near midnight (within this threshold), treat it as "date-only"
// and skip strict time matching (user likely didn't set a specific time)
const MIDNIGHT_THRESHOLD_MS = 5 * 60 * 1000 // within 5 minutes of midnight

interface ParsedStructure {
  duration?: number
  type?: string
  sport?: string
}

/**
 * Check if a Date is near midnight (00:00), indicating no specific time was set.
 */
function isDateOnly(date: Date): boolean {
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const msFromMidnight = (hours * 60 + minutes) * 60 * 1000
  return msFromMidnight < MIDNIGHT_THRESHOLD_MS || msFromMidnight > (24 * 60 * 60 * 1000 - MIDNIGHT_THRESHOLD_MS)
}

/**
 * Find a matching GarminActivity for a confirmed AdHocWorkout.
 * Returns null if zero or multiple candidates (ambiguous).
 */
export async function findMatchingGarminActivity(
  adHoc: { workoutDate: Date; parsedStructure: unknown; parsedType: string | null },
  clientId: string
): Promise<{ id: string; tss: number | null; averageHeartrate: number | null; maxHeartrate: number | null; duration: number | null; distance: number | null; calories: number | null } | null> {
  const dayStart = startOfDay(adHoc.workoutDate)
  const dayEnd = endOfDay(adHoc.workoutDate)

  const candidates = await prisma.garminActivity.findMany({
    where: {
      clientId,
      startDate: { gte: dayStart, lte: dayEnd },
      adHocWorkout: null, // Not already linked
    },
    select: {
      id: true,
      startDate: true,
      duration: true,
      distance: true,
      type: true,
      mappedType: true,
      tss: true,
      averageHeartrate: true,
      maxHeartrate: true,
      calories: true,
    },
  })

  if (candidates.length === 0) return null

  const parsed = adHoc.parsedStructure as ParsedStructure | null
  const adHocDuration = parsed?.duration ? parsed.duration * 60 : null // minutes → seconds
  const adHocType = adHoc.parsedType || parsed?.type || parsed?.sport || 'OTHER'
  const adHocIsDateOnly = isDateOnly(adHoc.workoutDate)

  const matches = candidates.filter((garmin) => {
    // Time window check - skip if ad-hoc has no meaningful time (date-only)
    if (!adHocIsDateOnly) {
      const timeDiff = Math.abs(garmin.startDate.getTime() - adHoc.workoutDate.getTime())
      if (timeDiff > TIME_WINDOW_MS) return false
    }
    // If ad-hoc is date-only, same day is enough (already filtered by dayStart/dayEnd)

    // Duration check (if both have duration)
    if (adHocDuration && garmin.duration) {
      const ratio = Math.abs(adHocDuration - garmin.duration) / Math.max(adHocDuration, garmin.duration)
      if (ratio > DURATION_TOLERANCE) return false
    }

    // Type compatibility check
    const garminType = garmin.mappedType || garmin.type || 'OTHER'
    if (!areTypesCompatible(adHocType, garminType) && adHocType !== 'OTHER' && garminType !== 'OTHER') {
      return false
    }

    return true
  })

  // Only auto-link if exactly 1 match (avoid wrong links)
  if (matches.length !== 1) return null

  return matches[0]
}

/**
 * Find a matching confirmed AdHocWorkout for a GarminActivity.
 * Returns null if zero or multiple candidates.
 */
export async function findMatchingAdHocWorkout(
  garmin: { id: string; clientId: string; startDate: Date; duration: number | null; type: string | null; mappedType: string | null },
): Promise<{ id: string } | null> {
  const dayStart = startOfDay(garmin.startDate)
  const dayEnd = endOfDay(garmin.startDate)

  const candidates = await prisma.adHocWorkout.findMany({
    where: {
      athleteId: garmin.clientId,
      status: { in: ['CONFIRMED', 'READY_FOR_REVIEW'] },
      workoutDate: { gte: dayStart, lte: dayEnd },
      garminActivityId: null, // Not already linked
      inputType: { notIn: ['STRAVA_IMPORT', 'GARMIN_IMPORT', 'CONCEPT2_IMPORT'] },
    },
    select: {
      id: true,
      workoutDate: true,
      parsedType: true,
      parsedStructure: true,
    },
  })

  if (candidates.length === 0) return null

  const garminType = garmin.mappedType || garmin.type || 'OTHER'
  const garminDuration = garmin.duration // in seconds

  const matches = candidates.filter((adHoc) => {
    const adHocIsDateOnly = isDateOnly(adHoc.workoutDate)

    // Time window - skip strict check if ad-hoc is date-only
    if (!adHocIsDateOnly) {
      const timeDiff = Math.abs(garmin.startDate.getTime() - adHoc.workoutDate.getTime())
      if (timeDiff > TIME_WINDOW_MS) return false
    }

    // Duration check
    const parsed = adHoc.parsedStructure as ParsedStructure | null
    const adHocDuration = parsed?.duration ? parsed.duration * 60 : null
    if (adHocDuration && garminDuration) {
      const ratio = Math.abs(adHocDuration - garminDuration) / Math.max(adHocDuration, garminDuration)
      if (ratio > DURATION_TOLERANCE) return false
    }

    // Type compatibility
    const adHocType = adHoc.parsedType || parsed?.type || parsed?.sport || 'OTHER'
    if (!areTypesCompatible(adHocType, garminType) && adHocType !== 'OTHER' && garminType !== 'OTHER') {
      return false
    }

    return true
  })

  if (matches.length !== 1) return null

  return { id: matches[0].id }
}

/**
 * Link an AdHocWorkout to a GarminActivity.
 * Updates the FK and enriches the TrainingLoad with Garmin's sensor data.
 */
export async function linkAdHocToGarmin(
  adHocWorkoutId: string,
  garminActivityId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Set the link
    const adHoc = await tx.adHocWorkout.update({
      where: { id: adHocWorkoutId },
      data: { garminActivityId },
      select: { trainingLoadId: true },
    })

    // Enrich TrainingLoad with Garmin's better data
    if (adHoc.trainingLoadId) {
      const garmin = await tx.garminActivity.findUnique({
        where: { id: garminActivityId },
        select: { tss: true, averageHeartrate: true, maxHeartrate: true, duration: true, distance: true, calories: true },
      })

      if (garmin) {
        await tx.trainingLoad.update({
          where: { id: adHoc.trainingLoadId },
          data: {
            ...(garmin.tss != null ? { dailyLoad: garmin.tss } : {}),
            ...(garmin.averageHeartrate != null ? { avgHR: garmin.averageHeartrate } : {}),
            ...(garmin.maxHeartrate != null ? { maxHR: garmin.maxHeartrate } : {}),
            ...(garmin.duration != null ? { duration: Math.round(garmin.duration / 60) } : {}),
            ...(garmin.distance != null ? { distance: garmin.distance / 1000 } : {}),
          },
        })
      }
    }
  })

  logger.info('Linked ad-hoc workout to Garmin activity', { adHocWorkoutId, garminActivityId })
}

/**
 * Unlink an AdHocWorkout from its GarminActivity.
 */
export async function unlinkAdHocFromGarmin(adHocWorkoutId: string): Promise<void> {
  await prisma.adHocWorkout.update({
    where: { id: adHocWorkoutId },
    data: { garminActivityId: null },
  })

  logger.info('Unlinked ad-hoc workout from Garmin activity', { adHocWorkoutId })
}
