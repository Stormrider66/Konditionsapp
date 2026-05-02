/**
 * Oura Ring Data Sync
 *
 * Pulls daily recovery aggregates (sleep, HRV, RHR, readiness, SpO2, stress)
 * and upserts into DailyMetrics. Recovery fields are only written when the
 * source-priority resolver picks Oura for this client.
 *
 * Workouts are stored as JSON inside `factorScores.oura.workouts` only when
 * Oura is the sole connected wearable (no Strava/Garmin token present),
 * matching the user-facing decision: nice-to-have visibility, not a
 * replacement for Strava/Garmin activity tracking.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveRecoverySource } from '@/lib/integrations/recovery-source'
import {
  getOuraDailyReadiness,
  getOuraDailySleep,
  getOuraDailySpo2,
  getOuraDailyStress,
  getOuraSleep,
  getOuraWorkouts,
  OuraDailyReadiness,
  OuraDailySleep,
  OuraDailySpo2,
  OuraDailyStress,
  OuraSleep,
  OuraWorkout,
} from './client'

export interface OuraSyncResult {
  daysProcessed: number
  hrvRecords: number
  sleepRecords: number
  readinessRecords: number
  workoutsSynced: number
  appliedRecoveryWrites: boolean
  errors: string[]
}

/** Picks the longest "long_sleep" session per day (some users have naps logged separately). */
function pickPrimarySleep(sleeps: OuraSleep[]): Map<string, OuraSleep> {
  const byDay = new Map<string, OuraSleep>()
  for (const s of sleeps) {
    if (s.type !== 'long_sleep') continue
    const existing = byDay.get(s.day)
    if (!existing || (s.total_sleep_duration ?? 0) > (existing.total_sleep_duration ?? 0)) {
      byDay.set(s.day, s)
    }
  }
  return byDay
}

export async function syncOuraData(
  clientId: string,
  options: { daysBack?: number } = {},
): Promise<OuraSyncResult> {
  const { daysBack = 3 } = options
  const result: OuraSyncResult = {
    daysProcessed: 0,
    hrvRecords: 0,
    sleepRecords: 0,
    readinessRecords: 0,
    workoutsSynced: 0,
    appliedRecoveryWrites: false,
    errors: [],
  }

  const token = await prisma.integrationToken.findUnique({
    where: { clientId_type: { clientId, type: 'OURA' } },
  })
  if (!token) {
    result.errors.push('No Oura connection found')
    return result
  }

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  const recoverySource = await resolveRecoverySource(clientId)
  const writeRecovery = recoverySource === 'OURA'
  result.appliedRecoveryWrites = writeRecovery

  let dailySleep: OuraDailySleep[] = []
  let sleeps: OuraSleep[] = []
  let readiness: OuraDailyReadiness[] = []
  let spo2: OuraDailySpo2[] = []
  let stress: OuraDailyStress[] = []

  try {
    ;[dailySleep, sleeps, readiness, spo2, stress] = await Promise.all([
      getOuraDailySleep(clientId, startDate, endDate),
      getOuraSleep(clientId, startDate, endDate),
      getOuraDailyReadiness(clientId, startDate, endDate).catch((e) => {
        // Some Oura tiers / new users return no readiness data; tolerate it.
        result.errors.push(`readiness: ${e instanceof Error ? e.message : 'unknown'}`)
        return [] as OuraDailyReadiness[]
      }),
      getOuraDailySpo2(clientId, startDate, endDate).catch(() => [] as OuraDailySpo2[]),
      getOuraDailyStress(clientId, startDate, endDate).catch(() => [] as OuraDailyStress[]),
    ])
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Failed to fetch Oura data')
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: { lastSyncError: result.errors.join('; ').slice(0, 500) },
    })
    return result
  }

  const primarySleep = pickPrimarySleep(sleeps)
  const dailySleepByDay = new Map(dailySleep.map(s => [s.day, s]))
  const readinessByDay = new Map(readiness.map(r => [r.day, r]))
  const spo2ByDay = new Map(spo2.map(s => [s.day, s]))
  const stressByDay = new Map(stress.map(s => [s.day, s]))

  const allDays = new Set<string>([
    ...dailySleepByDay.keys(),
    ...primarySleep.keys(),
    ...readinessByDay.keys(),
    ...spo2ByDay.keys(),
    ...stressByDay.keys(),
  ])

  for (const day of allDays) {
    try {
      const date = new Date(`${day}T00:00:00.000Z`)
      const sleep = primarySleep.get(day)
      const ds = dailySleepByDay.get(day)
      const r = readinessByDay.get(day)
      const sp = spo2ByDay.get(day)
      const st = stressByDay.get(day)

      const existing = await prisma.dailyMetrics.findUnique({
        where: { clientId_date: { clientId, date } },
      })
      const factorScores = (existing?.factorScores as Record<string, unknown>) || {}
      const existingOura = (factorScores.oura as Record<string, unknown>) || {}

      const ouraData = {
        ...existingOura,
        sleep: sleep
          ? {
              totalSleepMinutes: sleep.total_sleep_duration ? Math.round(sleep.total_sleep_duration / 60) : null,
              deepMinutes: sleep.deep_sleep_duration ? Math.round(sleep.deep_sleep_duration / 60) : null,
              lightMinutes: sleep.light_sleep_duration ? Math.round(sleep.light_sleep_duration / 60) : null,
              remMinutes: sleep.rem_sleep_duration ? Math.round(sleep.rem_sleep_duration / 60) : null,
              awakeMinutes: sleep.awake_time ? Math.round(sleep.awake_time / 60) : null,
              efficiency: sleep.efficiency,
              averageHR: sleep.average_heart_rate,
              lowestHR: sleep.lowest_heart_rate,
              averageHRV: sleep.average_hrv,
              bedtimeStart: sleep.bedtime_start,
              bedtimeEnd: sleep.bedtime_end,
            }
          : (existingOura.sleep ?? null),
        dailySleepScore: ds?.score ?? null,
        readinessScore: r?.score ?? null,
        readinessContributors: r?.contributors ?? null,
        temperatureDeviation: r?.temperature_deviation ?? null,
        spo2Average: sp?.spo2_percentage?.average ?? null,
        stressDaySummary: st?.day_summary ?? null,
        stressHigh: st?.stress_high ?? null,
        recoveryHigh: st?.recovery_high ?? null,
        syncedAt: new Date().toISOString(),
      }

      const recoveryFields = writeRecovery
        ? {
            ...(sleep?.average_hrv != null ? { hrvRMSSD: sleep.average_hrv } : {}),
            ...(sleep?.lowest_heart_rate != null ? { restingHR: sleep.lowest_heart_rate } : {}),
            ...(sleep?.total_sleep_duration != null
              ? { sleepHours: sleep.total_sleep_duration / 3600 }
              : {}),
            ...(ds?.score != null
              ? { sleepQuality: Math.max(1, Math.min(10, Math.round(ds.score / 10))) }
              : {}),
          }
        : {}

      await prisma.dailyMetrics.upsert({
        where: { clientId_date: { clientId, date } },
        update: {
          ...recoveryFields,
          factorScores: { ...factorScores, oura: ouraData },
          updatedAt: new Date(),
        },
        create: {
          clientId,
          date,
          ...recoveryFields,
          factorScores: { oura: ouraData },
        },
      })

      if (sleep) result.sleepRecords++
      if (sleep?.average_hrv != null) result.hrvRecords++
      if (r) result.readinessRecords++
      result.daysProcessed++
    } catch (error) {
      result.errors.push(`${day}: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  // Workouts: only when Oura is the sole connected wearable (per product decision).
  try {
    const otherTokens = await prisma.integrationToken.count({
      where: { clientId, type: { in: ['STRAVA', 'GARMIN'] } },
    })
    if (otherTokens === 0) {
      const workouts = await getOuraWorkouts(clientId, startDate, endDate)
      const byDay = new Map<string, OuraWorkout[]>()
      for (const w of workouts) {
        const arr = byDay.get(w.day) ?? []
        arr.push(w)
        byDay.set(w.day, arr)
      }

      for (const [day, dayWorkouts] of byDay) {
        try {
          const date = new Date(`${day}T00:00:00.000Z`)
          const existing = await prisma.dailyMetrics.findUnique({
            where: { clientId_date: { clientId, date } },
          })
          const factorScores = (existing?.factorScores as Record<string, unknown>) || {}
          const existingOura = (factorScores.oura as Record<string, unknown>) || {}

          const workoutSummaries = dayWorkouts.map(w => ({
            id: w.id,
            activity: w.activity,
            start: w.start_datetime,
            end: w.end_datetime,
            intensity: w.intensity ?? null,
            distance: w.distance ?? null,
            calories: w.calories ?? null,
            source: w.source ?? null,
          }))

          await prisma.dailyMetrics.upsert({
            where: { clientId_date: { clientId, date } },
            update: {
              factorScores: {
                ...factorScores,
                oura: { ...existingOura, workouts: workoutSummaries },
              },
              updatedAt: new Date(),
            },
            create: {
              clientId,
              date,
              factorScores: { oura: { workouts: workoutSummaries } },
            },
          })
          result.workoutsSynced += workoutSummaries.length
        } catch (error) {
          result.errors.push(`workouts ${day}: ${error instanceof Error ? error.message : 'unknown'}`)
        }
      }
    }
  } catch (error) {
    result.errors.push(`workouts: ${error instanceof Error ? error.message : 'unknown'}`)
  }

  await prisma.integrationToken.update({
    where: { id: token.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: result.errors.length ? result.errors.join('; ').slice(0, 500) : null,
    },
  })

  logger.info('Oura sync complete', {
    clientId,
    daysProcessed: result.daysProcessed,
    appliedRecoveryWrites: result.appliedRecoveryWrites,
    errors: result.errors.length,
  })

  return result
}
