import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  GarminActivity,
  GarminBodyComposition,
  GarminDailySummary,
  GarminHRVData,
  GarminSleepData,
} from '@/lib/integrations/garmin/client'

const DEFAULT_MAX_HR = 185

const ACTIVITY_TYPE_MAP: Record<string, { type: string; intensity: string }> = {
  RUNNING: { type: 'RUNNING', intensity: 'MODERATE' },
  TRAIL_RUNNING: { type: 'RUNNING', intensity: 'HARD' },
  TREADMILL_RUNNING: { type: 'RUNNING', intensity: 'MODERATE' },
  INDOOR_RUNNING: { type: 'RUNNING', intensity: 'MODERATE' },
  CYCLING: { type: 'CYCLING', intensity: 'MODERATE' },
  INDOOR_CYCLING: { type: 'CYCLING', intensity: 'MODERATE' },
  MOUNTAIN_BIKING: { type: 'CYCLING', intensity: 'HARD' },
  GRAVEL_CYCLING: { type: 'CYCLING', intensity: 'MODERATE' },
  SWIMMING: { type: 'SWIMMING', intensity: 'MODERATE' },
  POOL_SWIMMING: { type: 'SWIMMING', intensity: 'MODERATE' },
  OPEN_WATER_SWIMMING: { type: 'SWIMMING', intensity: 'MODERATE' },
  WALKING: { type: 'CROSS_TRAINING', intensity: 'EASY' },
  HIKING: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  CROSS_COUNTRY_SKIING: { type: 'SKIING', intensity: 'MODERATE' },
  RESORT_SKIING: { type: 'SKIING', intensity: 'MODERATE' },
  BACKCOUNTRY_SKIING: { type: 'SKIING', intensity: 'HARD' },
  STRENGTH_TRAINING: { type: 'STRENGTH', intensity: 'MODERATE' },
  INDOOR_CARDIO: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  HIIT: { type: 'STRENGTH', intensity: 'HARD' },
  ELLIPTICAL: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  STAIR_CLIMBING: { type: 'CROSS_TRAINING', intensity: 'MODERATE' },
  YOGA: { type: 'RECOVERY', intensity: 'EASY' },
  PILATES: { type: 'RECOVERY', intensity: 'EASY' },
}

export type GarminWebhookPayload = {
  dailies?: Array<GarminDailySummary & { userId?: string }>
  activities?: Array<GarminActivity & {
    userId?: string
    deviceName?: string
    durationInSeconds?: number
    summary?: {
      activityId?: number
      activityType?: string
      startTimeInSeconds?: number
      durationInSeconds?: number
      distanceInMeters?: number
      averageHeartRateInBeatsPerMinute?: number
      maxHeartRateInBeatsPerMinute?: number
      averageSpeedInMetersPerSecond?: number
      maxSpeedInMetersPerSecond?: number
      activeKilocalories?: number
      averagePowerInWatts?: number
      normalizedPowerInWatts?: number
      averageCadenceInRoundsPerMinute?: number
      maxCadenceInRoundsPerMinute?: number
      deviceName?: string
    }
  }>
  sleeps?: Array<GarminSleepData & { userId?: string }>
  bodyComps?: GarminBodyComposition[]
  hrv?: Array<GarminHRVData & { userId?: string }>
  activityDetails?: Array<GarminActivityDetailsPayload>
  deregistrations?: Array<{ userId?: string }>
  userPermissionsChange?: Array<{ userId?: string; permissions?: Record<string, boolean> }>
}

type GarminActivityDetailsPayload = {
  activityId?: number
  userId?: string
  summary?: {
    activityId?: number
    activityType?: string
    startTimeInSeconds?: number
    durationInSeconds?: number
    distanceInMeters?: number
    averageHeartRateInBeatsPerMinute?: number
    maxHeartRateInBeatsPerMinute?: number
    averageSpeedInMetersPerSecond?: number
    activeKilocalories?: number
    averagePowerInWatts?: number
    normalizedPowerInWatts?: number
    deviceName?: string
  }
  heartRateZones?: {
    zone1TimeInSeconds?: number
    zone2TimeInSeconds?: number
    zone3TimeInSeconds?: number
    zone4TimeInSeconds?: number
    zone5TimeInSeconds?: number
  }
  samples?: Array<{
    recordingTime: number
    heartRate?: number
    speed?: number
    power?: number
    cadence?: number
    altitude?: number
  }>
  laps?: unknown[]
}

export type GarminWebhookResults = {
  dailies: number
  activities: number
  activityDetails: number
  sleeps: number
  bodyComps: number
  hrv: number
  deregistrations: number
  permissionChanges: number
  errors: string[]
}

type GarminActivityPayload = NonNullable<GarminWebhookPayload['activities']>[number]

export function verifyGarminWebhookRequest(input: {
  verifyToken?: string | null
  challenge?: string | null
  expectedVerifyToken?: string
}): { ok: boolean; status: number; body: Record<string, string> } {
  const { verifyToken, challenge, expectedVerifyToken } = input

  if (!expectedVerifyToken) {
    return { ok: false, status: 500, body: { error: 'Webhook not configured' } }
  }

  if (verifyToken !== expectedVerifyToken) {
    return { ok: false, status: 403, body: { error: 'Invalid verification' } }
  }

  if (challenge) {
    return { ok: true, status: 200, body: { challenge } }
  }

  return { ok: true, status: 200, body: { status: 'ok' } }
}

export function logGarminWebhookReceipt(payload: GarminWebhookPayload) {
  logger.info('Garmin webhook event received', {
    hasDailies: Array.isArray(payload?.dailies),
    hasActivities: Array.isArray(payload?.activities),
    hasActivityDetails: Array.isArray(payload?.activityDetails),
    hasSleeps: Array.isArray(payload?.sleeps),
    hasBodyComps: Array.isArray(payload?.bodyComps),
    hasHrv: Array.isArray(payload?.hrv),
    hasDeregistrations: Array.isArray(payload?.deregistrations),
    hasUserPermissionsChange: Array.isArray(payload?.userPermissionsChange),
  })
}

export async function processGarminWebhookPayload(payload: GarminWebhookPayload): Promise<GarminWebhookResults> {
  const results: GarminWebhookResults = {
    dailies: 0,
    activities: 0,
    activityDetails: 0,
    sleeps: 0,
    bodyComps: 0,
    hrv: 0,
    deregistrations: 0,
    permissionChanges: 0,
    errors: [],
  }

  if (payload.deregistrations && Array.isArray(payload.deregistrations)) {
    for (const dereg of payload.deregistrations) {
      await handleDeregistration(dereg)
      results.deregistrations++
    }
  }

  if (payload.dailies && Array.isArray(payload.dailies)) {
    for (const daily of payload.dailies) {
      try {
        await processDailySummary(daily)
        results.dailies++
      } catch (error) {
        results.errors.push(`Daily ${daily.summaryId}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  if (payload.activities && Array.isArray(payload.activities)) {
    for (const activity of payload.activities) {
      try {
        await processActivity(activity)
        results.activities++
      } catch (error) {
        results.errors.push(`Activity ${activity.activityId}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  if (payload.sleeps && Array.isArray(payload.sleeps)) {
    for (const sleep of payload.sleeps) {
      try {
        await processSleepData(sleep)
        results.sleeps++
      } catch (error) {
        results.errors.push(`Sleep ${sleep.summaryId}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  if (payload.bodyComps && Array.isArray(payload.bodyComps)) {
    for (const bodyComp of payload.bodyComps) {
      try {
        await processBodyComposition(bodyComp)
        results.bodyComps++
      } catch (error) {
        results.errors.push(`BodyComp ${bodyComp.summaryId ?? bodyComp.measurementTimeInSeconds ?? 'unknown'}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  if (payload.hrv && Array.isArray(payload.hrv)) {
    for (const hrv of payload.hrv) {
      try {
        await processHRVData(hrv)
        results.hrv++
      } catch (error) {
        results.errors.push(`HRV ${hrv.summaryId}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  if (payload.activityDetails && Array.isArray(payload.activityDetails)) {
    for (const detail of payload.activityDetails) {
      try {
        await processActivityDetails(detail)
        results.activityDetails++
      } catch (error) {
        results.errors.push(`ActivityDetails ${detail.activityId}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  if (payload.userPermissionsChange && Array.isArray(payload.userPermissionsChange)) {
    for (const change of payload.userPermissionsChange) {
      try {
        await handleUserPermissionsChange(change)
        results.permissionChanges++
      } catch (error) {
        results.errors.push(`PermissionChange ${change.userId}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  logger.info('Garmin webhook processing results', {
    dailies: results.dailies,
    activities: results.activities,
    activityDetails: results.activityDetails,
    sleeps: results.sleeps,
    bodyComps: results.bodyComps,
    hrv: results.hrv,
    deregistrations: results.deregistrations,
    permissionChanges: results.permissionChanges,
    errorCount: results.errors.length,
  })

  return results
}

async function getAthleteMaxHR(clientId: string): Promise<number> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      manualMaxHR: true,
      tests: {
        where: { maxHR: { not: null } },
        orderBy: { testDate: 'desc' },
        take: 1,
        select: { maxHR: true },
      },
    },
  })

  return client?.manualMaxHR ?? client?.tests[0]?.maxHR ?? DEFAULT_MAX_HR
}

function calculateTSS(
  duration: number,
  avgHr?: number,
  avgSpeed?: number,
  avgWatts?: number,
  maxHR: number = DEFAULT_MAX_HR
): number {
  let intensityFactor = 0.7

  if (avgHr) {
    const hrRatio = avgHr / maxHR
    intensityFactor = Math.min(1.2, Math.max(0.4, hrRatio))
  } else if (avgWatts) {
    intensityFactor = avgWatts / 200
  } else if (avgSpeed) {
    const paceMinPerKm = 1000 / (avgSpeed * 60)
    intensityFactor = Math.min(1.2, Math.max(0.5, 1.4 - paceMinPerKm * 0.15))
  }

  return Math.round((duration * Math.pow(intensityFactor, 2) * 100) / 3600)
}

async function handleDeregistration(dereg: { userId?: string }) {
  if (!dereg.userId) {
    logger.warn('Garmin deregistration missing userId')
    return
  }

  const token = await prisma.integrationToken.findFirst({
    where: {
      type: 'GARMIN',
      externalUserId: dereg.userId,
    },
    select: { id: true, clientId: true },
  })

  if (token) {
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        syncEnabled: false,
        lastSyncError: 'User deauthorized the application via Garmin',
      },
    })
    logger.info('Disabled Garmin sync (user deregistered)', { clientId: token.clientId })
  }
}

async function processDailySummary(summary: GarminDailySummary & { userId?: string }) {
  const clientId = await findClientId(summary.userId)
  if (!clientId) {
    logger.warn('No client found for Garmin daily summary')
    return
  }

  const date = new Date(summary.calendarDate)
  const stressLevel = summary.averageStressLevel ? Math.round(summary.averageStressLevel / 10) : null
  const existingMetrics = await prisma.dailyMetrics.findUnique({
    where: { clientId_date: { clientId, date } },
  })
  const factorScores = (existingMetrics?.factorScores as Record<string, unknown>) || {}

  await prisma.dailyMetrics.upsert({
    where: { clientId_date: { clientId, date } },
    update: {
      restingHR: summary.restingHeartRateInBeatsPerMinute,
      stress: stressLevel,
      factorScores: {
        ...factorScores,
        garminDaily: {
          steps: summary.steps,
          activeMinutes: Math.round(summary.activeTimeInSeconds / 60),
          calories: Math.round(summary.activeKilocalories + summary.bmrKilocalories),
          distance: summary.distanceInMeters,
          avgHR: summary.averageHeartRateInBeatsPerMinute,
          maxHR: summary.maxHeartRateInBeatsPerMinute,
          minHR: summary.minHeartRateInBeatsPerMinute,
          moderateMinutes: Math.round(summary.moderateIntensityDurationInSeconds / 60),
          vigorousMinutes: Math.round(summary.vigorousIntensityDurationInSeconds / 60),
          floorsClimbed: summary.floorsClimbed,
          syncedAt: new Date().toISOString(),
          source: 'webhook',
        },
      },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      restingHR: summary.restingHeartRateInBeatsPerMinute,
      stress: stressLevel,
      factorScores: {
        garminDaily: {
          steps: summary.steps,
          activeMinutes: Math.round(summary.activeTimeInSeconds / 60),
          calories: Math.round(summary.activeKilocalories + summary.bmrKilocalories),
          distance: summary.distanceInMeters,
          avgHR: summary.averageHeartRateInBeatsPerMinute,
          maxHR: summary.maxHeartRateInBeatsPerMinute,
          minHR: summary.minHeartRateInBeatsPerMinute,
          moderateMinutes: Math.round(summary.moderateIntensityDurationInSeconds / 60),
          vigorousMinutes: Math.round(summary.vigorousIntensityDurationInSeconds / 60),
          floorsClimbed: summary.floorsClimbed,
          syncedAt: new Date().toISOString(),
          source: 'webhook',
        },
      },
    },
  })

  logger.debug('Synced Garmin daily summary', { clientId, date: summary.calendarDate })
}

async function processActivity(activity: GarminActivityPayload) {
  if (activity.summary) {
    activity.activityDurationInSeconds = activity.activityDurationInSeconds || activity.summary.durationInSeconds || 0
    activity.distanceInMeters = activity.distanceInMeters || activity.summary.distanceInMeters || 0
    activity.averageHeartRateInBeatsPerMinute = activity.averageHeartRateInBeatsPerMinute || activity.summary.averageHeartRateInBeatsPerMinute
    activity.maxHeartRateInBeatsPerMinute = activity.maxHeartRateInBeatsPerMinute || activity.summary.maxHeartRateInBeatsPerMinute
    activity.averageSpeedInMetersPerSecond = activity.averageSpeedInMetersPerSecond || activity.summary.averageSpeedInMetersPerSecond
    activity.maxSpeedInMetersPerSecond = activity.maxSpeedInMetersPerSecond || activity.summary.maxSpeedInMetersPerSecond
    activity.activeKilocalories = activity.activeKilocalories || activity.summary.activeKilocalories
    activity.averagePowerInWatts = activity.averagePowerInWatts || activity.summary.averagePowerInWatts
    activity.deviceName = activity.deviceName || activity.summary.deviceName
  }

  if (!activity.activityDurationInSeconds && activity.durationInSeconds) {
    activity.activityDurationInSeconds = activity.durationInSeconds
  }

  if (!activity.activityDurationInSeconds && activity.distanceInMeters && activity.averageSpeedInMetersPerSecond && activity.averageSpeedInMetersPerSecond > 0) {
    activity.activityDurationInSeconds = Math.round(activity.distanceInMeters / activity.averageSpeedInMetersPerSecond)
  }

  const clientId = await findClientId(activity.userId)
  if (!clientId) {
    logger.warn('No client found for Garmin activity')
    return
  }

  const typeInfo = ACTIVITY_TYPE_MAP[activity.activityType] || { type: 'OTHER', intensity: 'MODERATE' }
  const maxHR = await getAthleteMaxHR(clientId)
  const tss = calculateTSS(
    activity.activityDurationInSeconds,
    activity.averageHeartRateInBeatsPerMinute,
    activity.averageSpeedInMetersPerSecond,
    activity.averagePowerInWatts,
    maxHR
  )

  const startDate = new Date(activity.startTimeInSeconds * 1000)
  const isIndoor =
    activity.activityType?.includes('INDOOR') ||
    activity.activityType?.includes('TREADMILL') ||
    activity.activityType?.includes('TRAINER')

  let mappedIntensity = typeInfo.intensity
  if (activity.averageHeartRateInBeatsPerMinute) {
    const hrRatio = activity.averageHeartRateInBeatsPerMinute / maxHR
    if (hrRatio < 0.65) mappedIntensity = 'EASY'
    else if (hrRatio < 0.8) mappedIntensity = 'MODERATE'
    else if (hrRatio < 0.9) mappedIntensity = 'HARD'
    else mappedIntensity = 'MAX'
  }

  await prisma.garminActivity.upsert({
    where: { garminActivityId: BigInt(activity.activityId) },
    update: {
      type: activity.activityType,
      startDate,
      distance: activity.distanceInMeters || null,
      duration: activity.activityDurationInSeconds || null,
      averageSpeed: activity.averageSpeedInMetersPerSecond || null,
      maxSpeed: activity.maxSpeedInMetersPerSecond || null,
      averageHeartrate: activity.averageHeartRateInBeatsPerMinute || null,
      maxHeartrate: activity.maxHeartRateInBeatsPerMinute || null,
      averageCadence: activity.averageCadenceInRoundsPerMinute || null,
      averageWatts: activity.averagePowerInWatts || null,
      normalizedPower: activity.normalizedPowerInWatts || null,
      calories: activity.activeKilocalories || null,
      indoor: isIndoor,
      tss,
      mappedType: typeInfo.type,
      mappedIntensity,
      ...(activity.deviceName ? { deviceName: activity.deviceName } : {}),
      updatedAt: new Date(),
    },
    create: {
      clientId,
      garminActivityId: BigInt(activity.activityId),
      type: activity.activityType,
      startDate,
      distance: activity.distanceInMeters || null,
      duration: activity.activityDurationInSeconds || null,
      averageSpeed: activity.averageSpeedInMetersPerSecond || null,
      maxSpeed: activity.maxSpeedInMetersPerSecond || null,
      averageHeartrate: activity.averageHeartRateInBeatsPerMinute || null,
      maxHeartrate: activity.maxHeartRateInBeatsPerMinute || null,
      averageCadence: activity.averageCadenceInRoundsPerMinute || null,
      averageWatts: activity.averagePowerInWatts || null,
      normalizedPower: activity.normalizedPowerInWatts || null,
      calories: activity.activeKilocalories || null,
      indoor: isIndoor,
      manual: false,
      tss,
      mappedType: typeInfo.type,
      mappedIntensity,
      deviceName: activity.deviceName || null,
      laps: Prisma.JsonNull,
      splits: Prisma.JsonNull,
    },
  })

  logger.debug('Synced Garmin activity to GarminActivity model', { clientId, activityId: activity.activityId })
}

async function processSleepData(sleep: GarminSleepData & { userId?: string }) {
  const clientId = await findClientId(sleep.userId)
  if (!clientId) {
    logger.warn('No client found for Garmin sleep data')
    return
  }

  const date = new Date(sleep.calendarDate)
  const sleepHours = sleep.durationInSeconds / 3600
  const sleepQuality = sleep.sleepScores?.overall ? Math.max(1, Math.min(10, Math.round(sleep.sleepScores.overall / 10))) : null

  const existingMetrics = await prisma.dailyMetrics.findUnique({
    where: { clientId_date: { clientId, date } },
  })

  const factorScores = (existingMetrics?.factorScores as Record<string, unknown>) || {}
  const sleepData = {
    durationMinutes: Math.round(sleep.durationInSeconds / 60),
    deepSleepMinutes: Math.round(sleep.deepSleepDurationInSeconds / 60),
    lightSleepMinutes: Math.round(sleep.lightSleepDurationInSeconds / 60),
    remSleepMinutes: Math.round(sleep.remSleepInSeconds / 60),
    awakeMinutes: Math.round(sleep.awakeDurationInSeconds / 60),
    scores: sleep.sleepScores,
    syncedAt: new Date().toISOString(),
    source: 'webhook',
  }

  await prisma.dailyMetrics.upsert({
    where: { clientId_date: { clientId, date } },
    update: {
      sleepHours,
      sleepQuality,
      factorScores: { ...factorScores, garminSleep: sleepData },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      sleepHours,
      sleepQuality,
      factorScores: { garminSleep: sleepData },
    },
  })

  logger.debug('Synced Garmin sleep data', { clientId, date: sleep.calendarDate })
}

async function processBodyComposition(bodyComp: GarminBodyComposition) {
  const clientId = await findClientId(bodyComp.userId)
  if (!clientId) {
    logger.warn('No client found for Garmin body composition data')
    return
  }

  const measurementDate = getBodyCompMeasurementDate(bodyComp)
  const weightKg = gramsToKg(bodyComp.weightInGrams) ?? bodyComp.weightInKilograms ?? null
  const bodyFatPercent = bodyComp.bodyFatInPercent ?? bodyComp.bodyFatPercent ?? null
  const muscleMassKg =
    gramsToKg(bodyComp.skeletalMuscleMassInGrams) ??
    gramsToKg(bodyComp.muscleMassInGrams) ??
    bodyComp.muscleMassInKilograms ??
    null
  const boneMassKg = gramsToKg(bodyComp.boneMassInGrams) ?? bodyComp.boneMassInKilograms ?? null
  const waterPercent = bodyComp.bodyWaterInPercent ?? bodyComp.totalBodyWaterInPercent ?? null
  const visceralFat = bodyComp.visceralFatRating ?? null
  const bmrKcal = bodyComp.basalMetabolicRateInCalories ?? null
  const metabolicAge = bodyComp.metabolicAge ?? null

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { height: true },
  })

  const bmi = weightKg && client?.height ? Math.round((weightKg / Math.pow(client.height / 100, 2)) * 10) / 10 : null
  const ffmi =
    weightKg && bodyFatPercent && client?.height
      ? Math.round(((weightKg * (1 - bodyFatPercent / 100)) / Math.pow(client.height / 100, 2)) * 10) / 10
      : null

  await prisma.bodyComposition.upsert({
    where: {
      clientId_measurementDate: {
        clientId,
        measurementDate,
      },
    },
    update: {
      weightKg,
      bodyFatPercent,
      muscleMassKg,
      visceralFat,
      boneMassKg,
      waterPercent,
      bmrKcal,
      metabolicAge,
      bmi,
      ffmi,
      deviceBrand: 'Garmin',
      notes: buildGarminBodyCompNotes(bodyComp),
      updatedAt: new Date(),
    },
    create: {
      clientId,
      measurementDate,
      weightKg,
      bodyFatPercent,
      muscleMassKg,
      visceralFat,
      boneMassKg,
      waterPercent,
      bmrKcal,
      metabolicAge,
      bmi,
      ffmi,
      deviceBrand: 'Garmin',
      notes: buildGarminBodyCompNotes(bodyComp),
    },
  })

  const existingMetrics = await prisma.dailyMetrics.findUnique({
    where: { clientId_date: { clientId, date: measurementDate } },
  })

  const factorScores = (existingMetrics?.factorScores as Record<string, unknown>) || {}
  const bodyCompSnapshot = {
    weightKg,
    bodyFatPercent,
    muscleMassKg,
    boneMassKg,
    waterPercent,
    visceralFat,
    bmrKcal,
    metabolicAge,
    syncedAt: new Date().toISOString(),
    source: 'webhook',
  }

  await prisma.dailyMetrics.upsert({
    where: { clientId_date: { clientId, date: measurementDate } },
    update: {
      factorScores: { ...factorScores, garminBodyComposition: bodyCompSnapshot },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date: measurementDate,
      factorScores: { garminBodyComposition: bodyCompSnapshot },
    },
  })

  logger.debug('Synced Garmin body composition', { clientId, date: measurementDate.toISOString().slice(0, 10) })
}

async function processHRVData(hrv: GarminHRVData & { userId?: string }) {
  const clientId = await findClientId(hrv.userId)
  if (!clientId) {
    logger.warn('No client found for Garmin HRV data')
    return
  }

  const date = new Date(hrv.calendarDate)
  const existingMetrics = await prisma.dailyMetrics.findUnique({
    where: { clientId_date: { clientId, date } },
  })

  const factorScores = (existingMetrics?.factorScores as Record<string, unknown>) || {}
  const hrvData = {
    weeklyAvg: hrv.weeklyAvg,
    lastNightAvg: hrv.lastNightAvg,
    lastNight5MinHigh: hrv.lastNight5MinHigh,
    baselineLowUpper: hrv.baselineLowUpper,
    baselineBalancedLower: hrv.baselineBalancedLower,
    baselineBalancedUpper: hrv.baselineBalancedUpper,
    status: hrv.status,
    syncedAt: new Date().toISOString(),
    source: 'webhook',
  }

  await prisma.dailyMetrics.upsert({
    where: { clientId_date: { clientId, date } },
    update: {
      hrvRMSSD: hrv.lastNightAvg,
      hrvStatus: hrv.status,
      factorScores: { ...factorScores, garminHRV: hrvData },
      updatedAt: new Date(),
    },
    create: {
      clientId,
      date,
      hrvRMSSD: hrv.lastNightAvg,
      hrvStatus: hrv.status,
      factorScores: { garminHRV: hrvData },
    },
  })

  logger.debug('Synced Garmin HRV data', { clientId, date: hrv.calendarDate })
}

async function processActivityDetails(detail: GarminActivityDetailsPayload) {
  const activityId = detail.activityId || detail.summary?.activityId
  if (!activityId) {
    logger.warn('Activity details push missing activityId')
    return
  }

  const clientId = await findClientId(detail.userId)
  if (!clientId) {
    logger.warn('No client found for Garmin activity details', { activityId })
    return
  }

  const existing = await prisma.garminActivity.findUnique({
    where: { garminActivityId: BigInt(activityId) },
    select: { id: true },
  })

  if (!existing) {
    logger.debug('Activity details received before activity summary, skipping', { activityId })
    return
  }

  const updateData: Record<string, unknown> = {}

  if (detail.heartRateZones) {
    const zones = detail.heartRateZones
    const hasZoneData =
      zones.zone1TimeInSeconds !== undefined ||
      zones.zone2TimeInSeconds !== undefined ||
      zones.zone3TimeInSeconds !== undefined ||
      zones.zone4TimeInSeconds !== undefined ||
      zones.zone5TimeInSeconds !== undefined

    if (hasZoneData) {
      updateData.hrZoneSeconds = {
        zone1: zones.zone1TimeInSeconds ?? 0,
        zone2: zones.zone2TimeInSeconds ?? 0,
        zone3: zones.zone3TimeInSeconds ?? 0,
        zone4: zones.zone4TimeInSeconds ?? 0,
        zone5: zones.zone5TimeInSeconds ?? 0,
      }
    }
  }

  if (detail.samples && detail.samples.length > 0) {
    const hrSamples = detail.samples
      .filter(sample => sample.heartRate !== undefined && sample.heartRate > 0)
      .map(sample => sample.heartRate as number)

    if (hrSamples.length > 0) {
      updateData.hrStream = hrSamples
      updateData.hrStreamFetched = true
    }
  }

  if (detail.laps && detail.laps.length > 0) {
    updateData.laps = detail.laps
  }

  if (detail.summary?.deviceName) {
    updateData.deviceName = detail.summary.deviceName
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date()
    await prisma.garminActivity.update({
      where: { garminActivityId: BigInt(activityId) },
      data: updateData,
    })
    logger.debug('Updated Garmin activity with details', {
      clientId,
      activityId,
      fields: Object.keys(updateData),
    })
  }
}

async function handleUserPermissionsChange(change: { userId?: string; permissions?: Record<string, boolean> }) {
  if (!change.userId) {
    logger.warn('Garmin userPermissionsChange missing userId')
    return
  }

  const token = await prisma.integrationToken.findFirst({
    where: {
      type: 'GARMIN',
      externalUserId: change.userId,
    },
    select: { id: true, clientId: true },
  })

  if (!token) {
    logger.warn('No token found for Garmin permission change', { userId: change.userId })
    return
  }

  const permissions = change.permissions || {}
  const allRevoked = Object.values(permissions).every(value => value === false)

  if (allRevoked) {
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        syncEnabled: false,
        scope: JSON.stringify(permissions),
        lastSyncError: 'All permissions revoked by user in Garmin Connect',
      },
    })
    logger.info('Disabled Garmin sync — all permissions revoked', { clientId: token.clientId })
  } else {
    await prisma.integrationToken.update({
      where: { id: token.id },
      data: {
        scope: JSON.stringify(permissions),
        syncEnabled: true,
        lastSyncError: null,
      },
    })
    logger.info('Updated Garmin permissions', { clientId: token.clientId, permissions })
  }
}

async function findClientId(userId?: string): Promise<string | null> {
  if (!userId) return null

  const token = await prisma.integrationToken.findFirst({
    where: {
      type: 'GARMIN',
      syncEnabled: true,
      externalUserId: userId,
    },
    select: { clientId: true },
  })

  return token?.clientId ?? null
}

function gramsToKg(value?: number): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.round((value / 1000) * 100) / 100
}

function getBodyCompMeasurementDate(bodyComp: GarminBodyComposition): Date {
  if (bodyComp.calendarDate) return new Date(bodyComp.calendarDate)

  const unixSeconds = bodyComp.measurementTimeInSeconds ?? bodyComp.startTimeInSeconds
  if (typeof unixSeconds === 'number') {
    const timestamp = new Date(unixSeconds * 1000)
    return new Date(timestamp.toISOString().slice(0, 10))
  }

  return new Date(new Date().toISOString().slice(0, 10))
}

function buildGarminBodyCompNotes(bodyComp: GarminBodyComposition): string {
  const extra: string[] = []

  if (bodyComp.summaryId) extra.push(`summaryId=${bodyComp.summaryId}`)
  if (bodyComp.physiqueRating !== undefined) extra.push(`physiqueRating=${String(bodyComp.physiqueRating)}`)

  return extra.length > 0 ? `Garmin webhook: ${extra.join(', ')}` : 'Garmin webhook'
}
