import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { processGarminActivityZonesForClient } from '@/lib/integrations/zone-distribution-service'
import { refreshWorkoutEvaluationsAround } from '@/lib/workout-evaluation'
import {
  GarminActivity,
  GarminBodyComposition,
  GarminDailySummary,
  GarminHRVData,
  GarminSleepData,
  normalizeGarminSampleOffsets,
} from '@/lib/integrations/garmin/client'
import { resliceCardioLogHr } from '@/lib/cardio/garmin-cardio-link'

const DEFAULT_MAX_HR = 185
const BODY_COMP_LIMITS = {
  weightKg: { min: 25, max: 250 },
  bodyFatPercent: { min: 2, max: 75 },
  muscleMassKg: { min: 5, max: 120 },
  boneMassKg: { min: 1, max: 8 },
  waterPercent: { min: 30, max: 75 },
  visceralFat: { min: 1, max: 60 },
  bmrKcal: { min: 500, max: 5000 },
  metabolicAge: { min: 10, max: 100 },
} as const

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

function isStrengthGarminActivity(activity: { activityType?: string | null }): boolean {
  const activityType = activity.activityType?.toUpperCase() ?? ''
  const mappedType = activity.activityType ? ACTIVITY_TYPE_MAP[activity.activityType]?.type : undefined

  return (
    mappedType === 'STRENGTH' ||
    activityType.includes('STRENGTH') ||
    activityType.includes('WEIGHT') ||
    activityType.includes('GYM')
  )
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

function collectNutritionRelevantGarminUserIds(payload: GarminWebhookPayload): string[] {
  const userIds = new Set<string>()
  const addUserId = (userId?: string) => {
    if (userId) userIds.add(userId)
  }

  payload.dailies?.forEach(item => addUserId(item.userId))
  payload.activities?.forEach(item => addUserId(item.userId))
  payload.activityDetails?.forEach(item => addUserId(item.userId))
  payload.sleeps?.forEach(item => addUserId(item.userId))
  payload.bodyComps?.forEach(item => addUserId(item.userId))
  payload.hrv?.forEach(item => addUserId(item.userId))

  return Array.from(userIds)
}

async function refreshNutritionGuidesAfterGarminSync(
  payload: GarminWebhookPayload,
  results: GarminWebhookResults
): Promise<void> {
  const processedCount =
    results.dailies +
    results.activities +
    results.activityDetails +
    results.sleeps +
    results.bodyComps +
    results.hrv

  if (processedCount === 0) return

  const clientIds = new Set<string>()
  for (const userId of collectNutritionRelevantGarminUserIds(payload)) {
    const clientId = await findClientId(userId)
    if (clientId) clientIds.add(clientId)
  }

  if (clientIds.size === 0) return

  const { refreshActivePerformanceMealGuideForClient } = await import('@/lib/nutrition/performance-plan')
  await Promise.all(
    Array.from(clientIds).map(clientId =>
      refreshActivePerformanceMealGuideForClient({
        clientId,
        reason: 'garmin_sync',
      })
    )
  )
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
        const processed = await processBodyComposition(bodyComp)
        if (processed) results.bodyComps++
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

  void refreshNutritionGuidesAfterGarminSync(payload, results).catch(error => {
    logger.warn('Failed to refresh nutrition guides after Garmin sync', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  })

  // Dispatch events to Managed Agents (non-blocking, respects mode)
  import('@/lib/managed-agents').then(({ isAgentProcessingEnabled }) => {
    if (isAgentProcessingEnabled()) {
      dispatchGarminEventsToAgents(payload, results).catch(err =>
        logger.warn('Failed to dispatch Garmin events to agents', { error: err instanceof Error ? err.message : 'Unknown' })
      )
    }
  }).catch(() => { /* module load failed, agents disabled */ })

  return results
}

export function processGarminWebhookPayloadAsync(
  payload: GarminWebhookPayload,
  source = 'garmin-webhook'
): void {
  void processGarminWebhookPayload(payload)
    .then(results => {
      logger.info('Garmin webhook processing completed asynchronously', {
        source,
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
    })
    .catch(error => {
      logger.error('Garmin webhook asynchronous processing failed', { source }, error)
    })
}

/**
 * Dispatch Garmin webhook data as agent events for real-time processing.
 * Runs asynchronously - does not block the webhook response.
 */
async function dispatchGarminEventsToAgents(
  payload: GarminWebhookPayload,
  results: GarminWebhookResults
): Promise<void> {
  const { dispatchEvent } = await import('@/lib/managed-agents')

  // Map each processed data type to agent events
  const dispatches: Promise<unknown>[] = []

  if (results.activities > 0 && payload.activities) {
    for (const activity of payload.activities) {
      const clientId = await findClientId(activity.userId)
      if (clientId) {
        dispatches.push(dispatchEvent({
          id: crypto.randomUUID(),
          type: 'GARMIN_ACTIVITY',
          entityId: clientId,
          data: { activityType: activity.activityType, distance: activity.distanceInMeters, duration: activity.activityDurationInSeconds },
          timestamp: new Date(),
        }))
      }
    }
  }

  if (results.sleeps > 0 && payload.sleeps) {
    for (const sleep of payload.sleeps) {
      const clientId = await findClientId(sleep.userId)
      if (clientId) {
        dispatches.push(dispatchEvent({
          id: crypto.randomUUID(),
          type: 'GARMIN_SLEEP',
          entityId: clientId,
          data: { duration: sleep.durationInSeconds, scores: sleep.sleepScores },
          timestamp: new Date(),
        }))
      }
    }
  }

  if (results.hrv > 0 && payload.hrv) {
    for (const hrv of payload.hrv) {
      const clientId = await findClientId(hrv.userId)
      if (clientId) {
        dispatches.push(dispatchEvent({
          id: crypto.randomUUID(),
          type: 'GARMIN_HRV',
          entityId: clientId,
          data: { weeklyAvg: hrv.weeklyAvg, lastNightAvg: hrv.lastNightAvg, status: hrv.status },
          timestamp: new Date(),
        }))
      }
    }
  }

  if (results.dailies > 0 && payload.dailies) {
    for (const daily of payload.dailies) {
      const clientId = await findClientId(daily.userId)
      if (clientId) {
        dispatches.push(dispatchEvent({
          id: crypto.randomUUID(),
          type: 'GARMIN_DAILY',
          entityId: clientId,
          data: { steps: daily.steps, restingHR: daily.restingHeartRateInBeatsPerMinute, stress: daily.averageStressLevel },
          timestamp: new Date(),
        }))
      }
    }
  }

  if (results.bodyComps > 0 && payload.bodyComps) {
    for (const bodyComp of payload.bodyComps) {
      const clientId = await findClientId(bodyComp.userId)
      if (clientId) {
        dispatches.push(dispatchEvent({
          id: crypto.randomUUID(),
          type: 'GARMIN_BODY_COMPOSITION',
          entityId: clientId,
          data: { weightKg: bodyComp.weightInKilograms ?? (bodyComp.weightInGrams ? bodyComp.weightInGrams / 1000 : null), bodyFatPercent: bodyComp.bodyFatInPercent },
          timestamp: new Date(),
        }))
      }
    }
  }

  await Promise.allSettled(dispatches)
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

  const garminRecord = await prisma.garminActivity.upsert({
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
    select: {
      id: true,
      clientId: true,
      startDate: true,
      duration: true,
      type: true,
      mappedType: true,
    },
  })

  logger.debug('Synced Garmin activity to GarminActivity model', { clientId, activityId: activity.activityId })

  await processGarminActivityZonesForClient(clientId, garminRecord.id)

  // Auto-link with matching ad-hoc workout if one exists
  try {
    const { findMatchingAdHocWorkout, linkAdHocToGarmin } = await import('@/lib/training/adhoc-garmin-matcher')
    const match = await findMatchingAdHocWorkout(garminRecord)
    if (match) {
      await linkAdHocToGarmin(match.id, garminRecord.id)
      logger.info('Auto-linked Garmin activity to ad-hoc workout', { garminActivityId: garminRecord.id, adHocWorkoutId: match.id })
    }
  } catch (err) {
    logger.warn('Failed to auto-link Garmin to ad-hoc', { error: err })
  }

  // Auto-link with matching hybrid focus-mode log if one exists
  try {
    const { linkGarminToHybridLogByActivity } = await import('@/lib/hybrid/garmin-hybrid-link')
    const linkedHybrid = await linkGarminToHybridLogByActivity(garminRecord.id)
    if (linkedHybrid) {
      logger.info('Auto-linked Garmin activity to hybrid workout log', { garminActivityId: garminRecord.id })
    }
  } catch (err) {
    logger.warn('Failed to auto-link Garmin to hybrid workout log', { error: err })
  }

  // Auto-complete matching cardio session assignment
  try {
    await completeCardioAssignmentFromGarmin(clientId, startDate, activity)
  } catch (err) {
    logger.warn('Failed to auto-complete cardio assignment from Garmin', { error: err })
  }

  // Auto-complete matching strength session assignment
  try {
    await completeStrengthAssignmentFromGarmin(clientId, startDate, activity)
  } catch (err) {
    logger.warn('Failed to auto-complete strength assignment from Garmin', { error: err })
  }

  await refreshWorkoutEvaluationsAround(clientId, startDate)
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

async function processBodyComposition(bodyComp: GarminBodyComposition): Promise<boolean> {
  const clientId = await findClientId(bodyComp.userId)
  if (!clientId) {
    logger.warn('No client found for Garmin body composition data')
    return false
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

  const plausibility = validateBodyCompositionValues({
    weightKg,
    bodyFatPercent,
    muscleMassKg,
    boneMassKg,
    waterPercent,
    visceralFat,
    bmrKcal,
    metabolicAge,
  })

  if (!plausibility.valid) {
    logger.warn('Skipped implausible Garmin body composition data', {
      clientId,
      date: measurementDate.toISOString().slice(0, 10),
      summaryId: bodyComp.summaryId,
      reasons: plausibility.reasons,
    })
    return false
  }

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
  return true
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
    select: { id: true, startDate: true },
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
    const validSamples = detail.samples.filter(
      sample => sample.heartRate !== undefined && sample.heartRate > 0
    )

    if (validSamples.length > 0) {
      updateData.hrStream = validSamples.map(sample => sample.heartRate as number)
      updateData.hrStreamOffsets = normalizeGarminSampleOffsets(
        validSamples.map(sample =>
          typeof sample.recordingTime === 'number' ? sample.recordingTime : null
        ),
        detail.summary?.startTimeInSeconds
      )
      updateData.hrStreamFetched = true
    }
  }

  if (detail.laps && detail.laps.length > 0) {
    updateData.laps = detail.laps
  }

  if (detail.summary?.deviceName) {
    updateData.deviceName = detail.summary.deviceName
  }

  if (detail.summary?.activeKilocalories !== undefined) {
    updateData.calories = detail.summary.activeKilocalories
  }

  if (Object.keys(updateData).length > 0) {
    const shouldRefreshZoneDistribution = 'hrZoneSeconds' in updateData || 'hrStream' in updateData

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

    if (shouldRefreshZoneDistribution) {
      await processGarminActivityZonesForClient(clientId, existing.id)
    }

    // If a cardio focus-mode log was linked before the HR stream arrived,
    // slice the freshly-stored stream onto its segments now.
    if ('hrStream' in updateData) {
      try {
        await resliceCardioLogHr(existing.id)
      } catch (error) {
        logger.warn('Failed to re-slice cardio log HR after details', { activityId }, error)
      }
    }

    await refreshWorkoutEvaluationsAround(clientId, existing.startDate)
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

function validateBodyCompositionValues(values: {
  weightKg: number | null
  bodyFatPercent: number | null
  muscleMassKg: number | null
  boneMassKg: number | null
  waterPercent: number | null
  visceralFat: number | null
  bmrKcal: number | null
  metabolicAge: number | null
}): { valid: boolean; reasons: string[] } {
  const reasons: string[] = []

  addRangeIssue(reasons, 'weightKg', values.weightKg, BODY_COMP_LIMITS.weightKg)
  addRangeIssue(reasons, 'bodyFatPercent', values.bodyFatPercent, BODY_COMP_LIMITS.bodyFatPercent)
  addRangeIssue(reasons, 'muscleMassKg', values.muscleMassKg, BODY_COMP_LIMITS.muscleMassKg)
  addRangeIssue(reasons, 'boneMassKg', values.boneMassKg, BODY_COMP_LIMITS.boneMassKg)
  addRangeIssue(reasons, 'waterPercent', values.waterPercent, BODY_COMP_LIMITS.waterPercent)
  addRangeIssue(reasons, 'visceralFat', values.visceralFat, BODY_COMP_LIMITS.visceralFat)
  addRangeIssue(reasons, 'bmrKcal', values.bmrKcal, BODY_COMP_LIMITS.bmrKcal)
  addRangeIssue(reasons, 'metabolicAge', values.metabolicAge, BODY_COMP_LIMITS.metabolicAge)

  if (
    values.weightKg &&
    values.muscleMassKg &&
    values.muscleMassKg > values.weightKg * 0.9
  ) {
    reasons.push(`muscleMassKg ${values.muscleMassKg} exceeds 90% of weight ${values.weightKg}`)
  }

  if (
    values.weightKg &&
    values.boneMassKg &&
    values.boneMassKg > values.weightKg * 0.12
  ) {
    reasons.push(`boneMassKg ${values.boneMassKg} exceeds 12% of weight ${values.weightKg}`)
  }

  return { valid: reasons.length === 0, reasons }
}

function addRangeIssue(
  reasons: string[],
  field: string,
  value: number | null,
  range: { min: number; max: number }
) {
  if (value === null) return
  if (!Number.isFinite(value)) {
    reasons.push(`${field} is not finite`)
    return
  }
  if (value < range.min || value > range.max) {
    reasons.push(`${field} ${value} outside ${range.min}-${range.max}`)
  }
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

/**
 * Auto-complete a CardioSessionAssignment when a matching Garmin activity arrives.
 *
 * Matches by: same athlete, same day (±1 day), pending/scheduled status,
 * has a garminWorkoutId (was pushed to Garmin).
 */
async function completeCardioAssignmentFromGarmin(
  clientId: string,
  activityStart: Date,
  activity: GarminActivityPayload
) {
  if (isStrengthGarminActivity(activity)) return

  // Find pending cardio assignments for this athlete around this date
  const dayStart = new Date(activityStart)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const assignments = await prisma.cardioSessionAssignment.findMany({
    where: {
      athleteId: clientId,
      assignedDate: { gte: dayStart, lt: dayEnd },
      status: { in: ['PENDING', 'SCHEDULED'] },
      garminWorkoutId: { not: null },
    },
    select: {
      id: true,
      sessionId: true,
      garminWorkoutId: true,
      session: { select: { name: true } },
    },
  })

  if (assignments.length === 0) return

  // Pick the best match — if only one pending assignment, use it
  const assignment = assignments[0]

  await prisma.cardioSessionAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      actualDuration: activity.activityDurationInSeconds || null,
      actualDistance: activity.distanceInMeters ? Math.round(activity.distanceInMeters) : null,
      avgHeartRate: activity.averageHeartRateInBeatsPerMinute
        ? Math.round(activity.averageHeartRateInBeatsPerMinute)
        : null,
    },
  })

  logger.info('Auto-completed cardio assignment from Garmin activity', {
    clientId,
    assignmentId: assignment.id,
    sessionName: assignment.session.name,
    duration: activity.activityDurationInSeconds,
    distance: activity.distanceInMeters,
    avgHR: activity.averageHeartRateInBeatsPerMinute,
  })
}

/**
 * Auto-complete a StrengthSessionAssignment when a matching Garmin strength
 * activity arrives from a pushed workout.
 */
async function completeStrengthAssignmentFromGarmin(
  clientId: string,
  activityStart: Date,
  activity: GarminActivityPayload
) {
  if (!isStrengthGarminActivity(activity)) return

  const dayStart = new Date(activityStart)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const assignments = await prisma.strengthSessionAssignment.findMany({
    where: {
      athleteId: clientId,
      assignedDate: { gte: dayStart, lt: dayEnd },
      status: { in: ['PENDING', 'SCHEDULED'] },
      garminWorkoutId: { not: null },
    },
    select: {
      id: true,
      garminWorkoutId: true,
      session: { select: { name: true } },
    },
    orderBy: { assignedDate: 'asc' },
  })

  if (assignments.length === 0) return

  const assignment = assignments[0]

  await prisma.strengthSessionAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      duration: activity.activityDurationInSeconds
        ? Math.round(activity.activityDurationInSeconds / 60)
        : null,
    },
  })

  logger.info('Auto-completed strength assignment from Garmin activity', {
    clientId,
    assignmentId: assignment.id,
    sessionName: assignment.session.name,
    duration: activity.activityDurationInSeconds,
    activityType: activity.activityType,
  })
}
