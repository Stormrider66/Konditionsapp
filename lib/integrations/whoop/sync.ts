/**
 * WHOOP data sync.
 *
 * WHOOP is recovery-first for Trainomics. Recovery, sleep, and cycle data are
 * archived under DailyMetrics.factorScores.whoop. Canonical recovery fields are
 * only written when the user-selected recovery source resolves to WHOOP.
 */

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveRecoverySource } from '@/lib/integrations/recovery-source'
import {
  getWhoopCycles,
  getWhoopRecoveries,
  getWhoopSleeps,
  getWhoopWorkouts,
  WhoopCycle,
  WhoopRecovery,
  WhoopSleep,
  WhoopWorkout,
  WhoopZoneDurations,
} from './client'

const MILLIS_PER_MINUTE = 60_000

export interface WhoopSyncResult {
  cyclesSynced: number
  sleepsSynced: number
  recoveriesSynced: number
  workoutsSynced: number
  appliedRecoveryWrites: boolean
  errors: string[]
}

function dateOnlyFrom(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`)
}

function secondsBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return null
  return Math.round((endTime - startTime) / 1000)
}

function millisToMinutes(value?: number | null): number | null {
  return value == null ? null : Math.round(value / MILLIS_PER_MINUTE)
}

function sleepDurationHours(sleep: WhoopSleep): number | null {
  const stages = sleep.score?.stage_summary
  const sleepMillis =
    (stages?.total_light_sleep_time_milli ?? 0) +
    (stages?.total_slow_wave_sleep_time_milli ?? 0) +
    (stages?.total_rem_sleep_time_milli ?? 0)

  if (sleepMillis > 0) return sleepMillis / 3_600_000

  const inBed = stages?.total_in_bed_time_milli
  const awake = stages?.total_awake_time_milli ?? 0
  if (inBed != null && inBed > awake) return (inBed - awake) / 3_600_000

  const duration = secondsBetween(sleep.start, sleep.end)
  return duration == null ? null : duration / 3600
}

function sleepQuality(sleep: WhoopSleep): number | null {
  const performance = sleep.score?.sleep_performance_percentage
  if (performance == null) return null
  return Math.max(1, Math.min(10, Math.round(performance / 10)))
}

function factorScoresRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function pickPrimarySleeps(sleeps: WhoopSleep[]): Map<string, WhoopSleep> {
  const byDay = new Map<string, WhoopSleep>()

  for (const sleep of sleeps) {
    if (sleep.nap) continue
    const date = dateOnlyFrom(sleep.end)
    if (!date) continue
    const day = date.toISOString().slice(0, 10)
    const existing = byDay.get(day)
    if (!existing || (sleepDurationHours(sleep) ?? 0) > (sleepDurationHours(existing) ?? 0)) {
      byDay.set(day, sleep)
    }
  }

  return byDay
}

function mapSportName(sportName?: string | null): { mappedType: string; mappedIntensity: string } {
  const normalized = (sportName ?? '').toLowerCase()
  let mappedType = 'OTHER'

  if (normalized.includes('run')) mappedType = 'RUNNING'
  else if (normalized.includes('cycl') || normalized.includes('bike')) mappedType = 'CYCLING'
  else if (normalized.includes('swim')) mappedType = 'SWIMMING'
  else if (normalized.includes('ski')) mappedType = 'SKIING'
  else if (normalized.includes('row')) mappedType = 'CROSS_TRAINING'
  else if (normalized.includes('strength') || normalized.includes('weight')) mappedType = 'STRENGTH'
  else if (normalized.includes('yoga') || normalized.includes('mobility')) mappedType = 'RECOVERY'

  return { mappedType, mappedIntensity: 'MODERATE' }
}

function intensityFromStrain(strain?: number | null): string {
  if (strain == null) return 'MODERATE'
  if (strain < 7) return 'EASY'
  if (strain < 12) return 'MODERATE'
  if (strain < 17) return 'HARD'
  return 'MAX'
}

function whoopJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function mergeWhoopDaily(
  clientId: string,
  date: Date,
  whoopPatch: Record<string, unknown>,
  recoveryFields: Record<string, unknown> = {},
): Promise<void> {
  const existing = await prisma.dailyMetrics.findUnique({
    where: { clientId_date: { clientId, date } },
  })
  const factorScores = factorScoresRecord(existing?.factorScores)
  const existingWhoop = factorScoresRecord(factorScores.whoop as Prisma.JsonValue | null | undefined)

  await prisma.dailyMetrics.upsert({
    where: { clientId_date: { clientId, date } },
    update: {
      ...recoveryFields,
      factorScores: {
        ...factorScores,
        whoop: {
          ...existingWhoop,
          ...whoopPatch,
          syncedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      ...recoveryFields,
      factorScores: {
        whoop: {
          ...whoopPatch,
          syncedAt: new Date().toISOString(),
        },
      },
    },
  })
}

export async function syncWhoopCycle(clientId: string, cycle: WhoopCycle): Promise<void> {
  const date = dateOnlyFrom(cycle.end ?? cycle.start)
  if (!date) return

  await mergeWhoopDaily(clientId, date, {
    cycle: {
      id: cycle.id,
      start: cycle.start,
      end: cycle.end ?? null,
      timezoneOffset: cycle.timezone_offset ?? null,
      scoreState: cycle.score_state ?? null,
      strain: cycle.score?.strain ?? null,
      kilojoules: cycle.score?.kilojoule ?? null,
      averageHeartRate: cycle.score?.average_heart_rate ?? null,
      maxHeartRate: cycle.score?.max_heart_rate ?? null,
    },
  })
}

export async function syncWhoopSleep(
  clientId: string,
  sleep: WhoopSleep,
  writeRecovery: boolean,
): Promise<void> {
  const date = dateOnlyFrom(sleep.end)
  if (!date) return

  const stages = sleep.score?.stage_summary
  const sleepHours = sleepDurationHours(sleep)
  const quality = sleepQuality(sleep)

  const recoveryFields = writeRecovery
    ? {
        ...(sleepHours != null ? { sleepHours } : {}),
        ...(quality != null ? { sleepQuality: quality } : {}),
      }
    : {}

  await mergeWhoopDaily(clientId, date, {
    sleep: {
      id: sleep.id,
      start: sleep.start,
      end: sleep.end,
      nap: sleep.nap ?? false,
      scoreState: sleep.score_state ?? null,
      sleepHours,
      sleepQuality: quality,
      performancePercentage: sleep.score?.sleep_performance_percentage ?? null,
      consistencyPercentage: sleep.score?.sleep_consistency_percentage ?? null,
      efficiencyPercentage: sleep.score?.sleep_efficiency_percentage ?? null,
      respiratoryRate: sleep.score?.respiratory_rate ?? null,
      stages: {
        inBedMinutes: millisToMinutes(stages?.total_in_bed_time_milli),
        awakeMinutes: millisToMinutes(stages?.total_awake_time_milli),
        lightMinutes: millisToMinutes(stages?.total_light_sleep_time_milli),
        slowWaveMinutes: millisToMinutes(stages?.total_slow_wave_sleep_time_milli),
        remMinutes: millisToMinutes(stages?.total_rem_sleep_time_milli),
        noDataMinutes: millisToMinutes(stages?.total_no_data_time_milli),
        sleepCycleCount: stages?.sleep_cycle_count ?? null,
        disturbanceCount: stages?.disturbance_count ?? null,
      },
    },
  }, recoveryFields)
}

export async function syncWhoopRecovery(
  clientId: string,
  recovery: WhoopRecovery,
  sleep: WhoopSleep | undefined,
  cycle: WhoopCycle | undefined,
  writeRecovery: boolean,
): Promise<void> {
  const date = dateOnlyFrom(sleep?.end ?? cycle?.end ?? cycle?.start ?? recovery.updated_at)
  if (!date) return

  const score = recovery.score
  const recoveryFields = writeRecovery
    ? {
        ...(score?.hrv_rmssd_milli != null ? { hrvRMSSD: score.hrv_rmssd_milli } : {}),
        ...(score?.resting_heart_rate != null ? { restingHR: score.resting_heart_rate } : {}),
      }
    : {}

  await mergeWhoopDaily(clientId, date, {
    recovery: {
      cycleId: recovery.cycle_id,
      sleepId: recovery.sleep_id ?? sleep?.id ?? null,
      scoreState: recovery.score_state ?? null,
      recoveryScore: score?.recovery_score ?? null,
      restingHeartRate: score?.resting_heart_rate ?? null,
      hrvRMSSD: score?.hrv_rmssd_milli ?? null,
      spo2Percentage: score?.spo2_percentage ?? null,
      skinTempCelsius: score?.skin_temp_celsius ?? null,
      userCalibrating: score?.user_calibrating ?? null,
    },
  }, recoveryFields)
}

export async function syncWhoopWorkout(clientId: string, workout: WhoopWorkout): Promise<void> {
  const startDate = new Date(workout.start)
  if (Number.isNaN(startDate.getTime())) return

  const score = workout.score
  const duration = secondsBetween(workout.start, workout.end)
  const mapping = mapSportName(workout.sport_name)

  await prisma.whoopActivity.upsert({
    where: { whoopWorkoutId: workout.id },
    update: {
      whoopV1Id: workout.v1_id ?? null,
      externalUserId: String(workout.user_id),
      name: workout.sport_name ?? null,
      type: workout.sport_name ?? String(workout.sport_id ?? 'WHOOP_WORKOUT'),
      sportId: workout.sport_id ?? null,
      startDate,
      endDate: workout.end ? new Date(workout.end) : null,
      timezoneOffset: workout.timezone_offset ?? null,
      distance: score?.distance_meter ?? null,
      duration,
      elevationGain: score?.altitude_gain_meter ?? null,
      averageHeartrate: score?.average_heart_rate ?? null,
      maxHeartrate: score?.max_heart_rate ?? null,
      strain: score?.strain ?? null,
      kilojoules: score?.kilojoule ?? null,
      percentRecorded: score?.percent_recorded ?? null,
      scoreState: workout.score_state ?? null,
      mappedType: mapping.mappedType,
      mappedIntensity: intensityFromStrain(score?.strain),
      hrZoneMilli: score?.zone_durations ? whoopJson(score.zone_durations satisfies WhoopZoneDurations) : Prisma.JsonNull,
      raw: whoopJson(workout),
      updatedAt: new Date(),
    },
    create: {
      clientId,
      whoopWorkoutId: workout.id,
      whoopV1Id: workout.v1_id ?? null,
      externalUserId: String(workout.user_id),
      name: workout.sport_name ?? null,
      type: workout.sport_name ?? String(workout.sport_id ?? 'WHOOP_WORKOUT'),
      sportId: workout.sport_id ?? null,
      startDate,
      endDate: workout.end ? new Date(workout.end) : null,
      timezoneOffset: workout.timezone_offset ?? null,
      distance: score?.distance_meter ?? null,
      duration,
      elevationGain: score?.altitude_gain_meter ?? null,
      averageHeartrate: score?.average_heart_rate ?? null,
      maxHeartrate: score?.max_heart_rate ?? null,
      strain: score?.strain ?? null,
      kilojoules: score?.kilojoule ?? null,
      percentRecorded: score?.percent_recorded ?? null,
      scoreState: workout.score_state ?? null,
      mappedType: mapping.mappedType,
      mappedIntensity: intensityFromStrain(score?.strain),
      hrZoneMilli: score?.zone_durations ? whoopJson(score.zone_durations) : Prisma.JsonNull,
      raw: whoopJson(workout),
    },
  })
}

export async function syncWhoopData(
  clientId: string,
  options: { daysBack?: number } = {},
): Promise<WhoopSyncResult> {
  const { daysBack = 7 } = options
  const result: WhoopSyncResult = {
    cyclesSynced: 0,
    sleepsSynced: 0,
    recoveriesSynced: 0,
    workoutsSynced: 0,
    appliedRecoveryWrites: false,
    errors: [],
  }

  const token = await prisma.integrationToken.findUnique({
    where: { clientId_type: { clientId, type: 'WHOOP' } },
  })
  if (!token) {
    result.errors.push('No WHOOP connection found')
    return result
  }

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  const recoverySource = await resolveRecoverySource(clientId)
  const writeRecovery = recoverySource === 'WHOOP'
  result.appliedRecoveryWrites = writeRecovery

  let cycles: WhoopCycle[] = []
  let sleeps: WhoopSleep[] = []
  let recoveries: WhoopRecovery[] = []
  let workouts: WhoopWorkout[] = []

  await Promise.all([
    getWhoopCycles(clientId, startDate, endDate)
      .then(data => { cycles = data })
      .catch(error => result.errors.push(`cycles: ${error instanceof Error ? error.message : 'unknown'}`)),
    getWhoopSleeps(clientId, startDate, endDate)
      .then(data => { sleeps = data })
      .catch(error => result.errors.push(`sleeps: ${error instanceof Error ? error.message : 'unknown'}`)),
    getWhoopRecoveries(clientId, startDate, endDate)
      .then(data => { recoveries = data })
      .catch(error => result.errors.push(`recoveries: ${error instanceof Error ? error.message : 'unknown'}`)),
    getWhoopWorkouts(clientId, startDate, endDate)
      .then(data => { workouts = data })
      .catch(error => result.errors.push(`workouts: ${error instanceof Error ? error.message : 'unknown'}`)),
  ])

  const cyclesById = new Map(cycles.map(cycle => [cycle.id, cycle]))
  const sleepsById = new Map(sleeps.map(sleep => [sleep.id, sleep]))

  for (const cycle of cycles) {
    try {
      await syncWhoopCycle(clientId, cycle)
      result.cyclesSynced++
    } catch (error) {
      result.errors.push(`cycle ${cycle.id}: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  for (const sleep of pickPrimarySleeps(sleeps).values()) {
    try {
      await syncWhoopSleep(clientId, sleep, writeRecovery)
      result.sleepsSynced++
    } catch (error) {
      result.errors.push(`sleep ${sleep.id}: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  for (const recovery of recoveries) {
    try {
      const sleep = recovery.sleep_id ? sleepsById.get(recovery.sleep_id) : undefined
      const cycle = cyclesById.get(recovery.cycle_id)
      await syncWhoopRecovery(clientId, recovery, sleep, cycle, writeRecovery)
      result.recoveriesSynced++
    } catch (error) {
      result.errors.push(`recovery ${recovery.cycle_id}: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  for (const workout of workouts) {
    try {
      await syncWhoopWorkout(clientId, workout)
      result.workoutsSynced++
    } catch (error) {
      result.errors.push(`workout ${workout.id}: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  await prisma.integrationToken.update({
    where: { id: token.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: result.errors.length ? result.errors.join('; ').slice(0, 500) : null,
    },
  })

  logger.info('WHOOP sync completed', {
    clientId,
    cycles: result.cyclesSynced,
    sleeps: result.sleepsSynced,
    recoveries: result.recoveriesSynced,
    workouts: result.workoutsSynced,
    errorCount: result.errors.length,
  })

  return result
}
