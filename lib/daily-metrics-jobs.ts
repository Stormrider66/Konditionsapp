import { BackgroundJobStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import {
  assessHRV,
  assessRHR,
  calculateWellnessScore,
  calculateReadinessScore,
  establishHRVBaseline,
  establishRHRBaseline,
  type HRVBaseline,
  type HRVMeasurement,
  type RHRBaseline,
  type RHRMeasurement,
  type WellnessResponses,
} from '@/lib/training-engine/monitoring'
import {
  calculateSyncedStrengthFatigue,
  type SyncedStrengthFatigue,
} from '@/lib/training-engine/monitoring/synced-strength-fatigue'

const STRENGTH_FATIGUE_TTL_MS = 60 * 1000
const DAILY_METRICS_RECOMPUTE_SKIP_TTL_MS = 2 * 60 * 1000
const DAILY_METRICS_JOB_STALE_LOCK_MS = 5 * 60 * 1000
const DAILY_METRICS_JOB_RETRY_BASE_MS = 30 * 1000

const strengthFatigueCache = new Map<string, { expiresAt: number; value: SyncedStrengthFatigue }>()
const dailyMetricsAssessmentInFlight = new Map<string, Promise<void>>()
const dailyMetricsProcessedSignatureCache = new Map<
  string,
  {
    signature: string
    processedAt: number
    readinessScore: number | null
    readinessLevel: string | null
  }
>()

export interface DailyMetricsSideEffectsInput {
  clientId: string
  clientName?: string
  date: string
  injuryPain: number
  stress: number
  sleepHours: number
  energyLevel: number
  readinessScore: number | null
  readinessLevel: string | null
  muscleSoreness: number
  injuryDetails?: Record<string, unknown>
  keywordAnalysis?: Record<string, unknown>
  requestPhysioContact: boolean
  physioContactReason?: string
  rehabPainDuring?: number
  rehabPainAfter?: number
}

export interface DailyMetricsPostWriteJobInput {
  clientId: string
  date: string
  signature: string
  shouldRunSideEffects: boolean
  sideEffectsInput: DailyMetricsSideEffectsInput
}

type DailyMetricsJobPayload = DailyMetricsPostWriteJobInput

type RecomputeDailyMetricsAssessmentsInput = {
  clientId: string
  date: string
}

function normalizeTenPointScoreToFivePoint(score: number): 1 | 2 | 3 | 4 | 5 {
  const normalized = Math.round(score / 2)
  return Math.max(1, Math.min(normalized, 5)) as 1 | 2 | 3 | 4 | 5
}

function invertFivePointScore(score: 1 | 2 | 3 | 4 | 5): 1 | 2 | 3 | 4 | 5 {
  return (6 - score) as 1 | 2 | 3 | 4 | 5
}

export function buildDailyMetricsJobKey(clientId: string, date: string) {
  return `${clientId}:${date}`
}

export async function enqueueDailyMetricsPostWriteJob(
  input: DailyMetricsPostWriteJobInput
) {
  const metricsDate = new Date(input.date)
  await prisma.dailyMetricsProcessingJob.upsert({
    where: {
      jobKey: buildDailyMetricsJobKey(input.clientId, input.date),
    },
    update: {
      clientId: input.clientId,
      date: metricsDate,
      signature: input.signature,
      payload: input as unknown as Prisma.InputJsonValue,
      status: BackgroundJobStatus.PENDING,
      runAfter: new Date(),
      lockedAt: null,
      completedAt: null,
      lastError: null,
    },
    create: {
      jobKey: buildDailyMetricsJobKey(input.clientId, input.date),
      clientId: input.clientId,
      date: metricsDate,
      signature: input.signature,
      payload: input as unknown as Prisma.InputJsonValue,
      status: BackgroundJobStatus.PENDING,
      runAfter: new Date(),
    },
  })
}

export async function processDailyMetricsPostWriteJobs(options?: {
  limit?: number
  jobKey?: string
}) {
  const now = new Date()
  const staleLockCutoff = new Date(now.getTime() - DAILY_METRICS_JOB_STALE_LOCK_MS)
  const limit = Math.max(1, Math.min(options?.limit ?? 10, 100))
  const claimedIds: string[] = []
  let completed = 0
  let failed = 0

  const candidates = await prisma.dailyMetricsProcessingJob.findMany({
    where: {
      ...(options?.jobKey ? { jobKey: options.jobKey } : {}),
      OR: [
        {
          status: BackgroundJobStatus.PENDING,
          runAfter: { lte: now },
        },
        {
          status: BackgroundJobStatus.FAILED,
          runAfter: { lte: now },
        },
        {
          status: BackgroundJobStatus.PROCESSING,
          lockedAt: { lt: staleLockCutoff },
        },
      ],
    },
    orderBy: [{ runAfter: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  })

  for (const candidate of candidates) {
    const claimCount = await prisma.dailyMetricsProcessingJob.updateMany({
      where: {
        id: candidate.id,
        OR: [
          {
            status: BackgroundJobStatus.PENDING,
            runAfter: { lte: now },
          },
          {
            status: BackgroundJobStatus.FAILED,
            runAfter: { lte: now },
          },
          {
            status: BackgroundJobStatus.PROCESSING,
            lockedAt: { lt: staleLockCutoff },
          },
        ],
      },
      data: {
        status: BackgroundJobStatus.PROCESSING,
        lockedAt: new Date(),
        startedAt: candidate.startedAt ?? new Date(),
        attempts: { increment: 1 },
      },
    })

    if (claimCount.count === 0) {
      continue
    }

    claimedIds.push(candidate.id)

    try {
      await processDailyMetricsPostWriteJobPayload(candidate.payload as unknown as DailyMetricsJobPayload)
      await prisma.dailyMetricsProcessingJob.update({
        where: { id: candidate.id },
        data: {
          status: BackgroundJobStatus.COMPLETED,
          lockedAt: null,
          completedAt: new Date(),
          lastError: null,
        },
      })
      completed++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      const retryDelayMs = DAILY_METRICS_JOB_RETRY_BASE_MS * Math.min(candidate.attempts + 1, 10)
      await prisma.dailyMetricsProcessingJob.update({
        where: { id: candidate.id },
        data: {
          status: BackgroundJobStatus.FAILED,
          lockedAt: null,
          lastError: message.slice(0, 10_000),
          runAfter: new Date(Date.now() + retryDelayMs),
        },
      })
      failed++
      logger.error('Daily-metrics durable job failed', { jobId: candidate.id, jobKey: candidate.jobKey }, error)
    }
  }

  return {
    scanned: candidates.length,
    claimed: claimedIds.length,
    completed,
    failed,
  }
}

export async function processDailyMetricsPostWriteJobPayload(
  input: DailyMetricsPostWriteJobInput
) {
  const { clientId, date, signature, shouldRunSideEffects, sideEffectsInput } = input
  const key = buildDailyMetricsJobKey(clientId, date)
  const inFlight = dailyMetricsAssessmentInFlight.get(key)
  if (inFlight) {
    return inFlight
  }

  const task = (async () => {
    const cachedProcessing = dailyMetricsProcessedSignatureCache.get(key)
    const now = Date.now()
    const canSkipRecompute =
      cachedProcessing &&
      cachedProcessing.signature === signature &&
      now - cachedProcessing.processedAt < DAILY_METRICS_RECOMPUTE_SKIP_TTL_MS

    let computed: { readinessScore: number | null; readinessLevel: string | null }
    if (canSkipRecompute) {
      computed = {
        readinessScore: cachedProcessing.readinessScore,
        readinessLevel: cachedProcessing.readinessLevel,
      }
    } else {
      computed = await recomputeDailyMetricsAssessments({ clientId, date })
      dailyMetricsProcessedSignatureCache.set(key, {
        signature,
        processedAt: now,
        readinessScore: computed.readinessScore,
        readinessLevel: computed.readinessLevel,
      })
    }

    if (shouldRunSideEffects) {
      await processDailyMetricsSideEffects({
        ...sideEffectsInput,
        readinessScore: computed.readinessScore,
        readinessLevel: computed.readinessLevel,
      })
    }
  })()

  dailyMetricsAssessmentInFlight.set(key, task)
  try {
    await task
  } finally {
    dailyMetricsAssessmentInFlight.delete(key)
  }
}

async function recomputeDailyMetricsAssessments(input: RecomputeDailyMetricsAssessmentsInput) {
  const { clientId, date } = input
  const metricsDate = new Date(date)
  const dailyMetrics = await prisma.dailyMetrics.findUnique({
    where: {
      clientId_date: {
        clientId,
        date: metricsDate,
      },
    },
    select: {
      id: true,
      hrvRMSSD: true,
      hrvQuality: true,
      hrvArtifactPercent: true,
      hrvDuration: true,
      hrvPosition: true,
      restingHR: true,
      sleepQuality: true,
      sleepHours: true,
      muscleSoreness: true,
      energyLevel: true,
      mood: true,
      stress: true,
      injuryPain: true,
    },
  })
  if (!dailyMetrics) {
    return { readinessScore: null as number | null, readinessLevel: null as string | null }
  }

  const needsHrvAssessment =
    dailyMetrics.hrvRMSSD !== null && dailyMetrics.hrvQuality !== null
  const needsRhrAssessment = dailyMetrics.restingHR !== null

  const historicalMetrics =
    needsHrvAssessment || needsRhrAssessment
      ? await prisma.dailyMetrics.findMany({
          where: {
            clientId,
            date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              lt: metricsDate,
            },
          },
          select: {
            date: true,
            hrvRMSSD: true,
            hrvQuality: true,
            hrvArtifactPercent: true,
            hrvDuration: true,
            hrvPosition: true,
            restingHR: true,
          },
          orderBy: { date: 'asc' },
        })
      : []

  let hrvAssessment = null
  let hrvStatus: string | null = needsHrvAssessment ? 'PENDING' : 'NOT_MEASURED'
  let hrvPercent: number | null = null
  let hrvTrend: string | null = null

  if (needsHrvAssessment && dailyMetrics.hrvRMSSD !== null && dailyMetrics.hrvQuality !== null) {
    const measurement: HRVMeasurement = {
      timestamp: metricsDate,
      rmssd: dailyMetrics.hrvRMSSD,
      quality: normalizeMeasurementQuality(dailyMetrics.hrvQuality),
      artifactPercent: dailyMetrics.hrvArtifactPercent ?? 0,
      duration: dailyMetrics.hrvDuration ?? 0,
      position: normalizePosition(dailyMetrics.hrvPosition),
    }

    const historicalMeasurements = historicalMetrics
      .filter(m => m.hrvRMSSD !== null && m.hrvQuality !== null)
      .map((m): HRVMeasurement => ({
        timestamp: m.date,
        rmssd: m.hrvRMSSD as number,
        quality: normalizeMeasurementQuality(m.hrvQuality),
        artifactPercent: m.hrvArtifactPercent ?? 0,
        duration: m.hrvDuration ?? 0,
        position: normalizePosition(m.hrvPosition),
      }))

    const baseline =
      historicalMeasurements.length >= 7
        ? establishHRVBaseline(historicalMeasurements)
        : createFallbackHRVBaseline(measurement)

    hrvAssessment = assessHRV(measurement, baseline)
    hrvStatus = hrvAssessment.status
    hrvPercent = hrvAssessment.percentOfBaseline
    hrvTrend = hrvAssessment.trend
  }

  let rhrAssessment = null
  let restingHRStatus: string | null = needsRhrAssessment ? 'PENDING' : null
  let restingHRDev: number | null = null

  if (needsRhrAssessment && dailyMetrics.restingHR !== null) {
    const measurement: RHRMeasurement = {
      timestamp: metricsDate,
      heartRate: dailyMetrics.restingHR,
      quality: 'GOOD',
      duration: 60,
      position: 'SUPINE',
    }

    const historicalMeasurements = historicalMetrics
      .filter(m => m.restingHR !== null)
      .map((m): RHRMeasurement => ({
        timestamp: m.date,
        heartRate: m.restingHR as number,
        quality: 'GOOD',
        duration: 60,
        position: 'SUPINE',
      }))

    const baseline =
      historicalMeasurements.length >= 7
        ? establishRHRBaseline(historicalMeasurements)
        : createFallbackRHRBaseline(measurement)

    rhrAssessment = assessRHR(measurement, baseline)
    restingHRStatus = rhrAssessment.status
    restingHRDev = rhrAssessment.deviationFromBaseline
  }

  let calculatedWellnessScore: number | null = null
  let readinessScore: number | null = null
  let readinessLevel: string | null = null
  let recommendedAction: string | null = null
  let factorScores: Record<string, unknown> | null = null
  let redFlags: string[] | null = null
  let yellowFlags: string[] | null = null

  if (
    dailyMetrics.sleepQuality !== null &&
    dailyMetrics.sleepHours !== null &&
    dailyMetrics.muscleSoreness !== null &&
    dailyMetrics.energyLevel !== null &&
    dailyMetrics.mood !== null &&
    dailyMetrics.stress !== null &&
    dailyMetrics.injuryPain !== null
  ) {
    const wellnessResponses: WellnessResponses = {
      sleepQuality: normalizeTenPointScoreToFivePoint(dailyMetrics.sleepQuality),
      sleepDuration: dailyMetrics.sleepHours,
      fatigueLevel: normalizeTenPointScoreToFivePoint(dailyMetrics.energyLevel),
      muscleSoreness: invertFivePointScore(
        normalizeTenPointScoreToFivePoint(dailyMetrics.muscleSoreness)
      ),
      stressLevel: invertFivePointScore(
        normalizeTenPointScoreToFivePoint(dailyMetrics.stress)
      ),
      mood: normalizeTenPointScoreToFivePoint(dailyMetrics.mood),
      motivationToTrain: normalizeTenPointScoreToFivePoint(dailyMetrics.energyLevel),
    }

    const wellnessScoreData = calculateWellnessScore(wellnessResponses)
    calculatedWellnessScore = wellnessScoreData.totalScore

    if (hrvAssessment && rhrAssessment) {
      const readinessScoreData = calculateReadinessScore({
        hrv: hrvAssessment,
        rhr: rhrAssessment,
        wellness: wellnessScoreData,
      })

      readinessScore = readinessScoreData.score
      readinessLevel = readinessScoreData.status
      recommendedAction = readinessScoreData.recommendation
      factorScores = readinessScoreData.componentScores as Record<string, unknown>
      redFlags = readinessScoreData.criticalFlags
      yellowFlags = readinessScoreData.warnings
    }
  }

  await prisma.dailyMetrics.update({
    where: {
      clientId_date: {
        clientId,
        date: metricsDate,
      },
    },
    data: {
      hrvStatus,
      hrvPercent,
      hrvTrend,
      restingHRStatus,
      restingHRDev,
      wellnessScore: calculatedWellnessScore,
      readinessScore,
      readinessLevel,
      recommendedAction,
      factorScores: factorScores
        ? (factorScores as unknown as Prisma.InputJsonValue)
        : undefined,
      redFlags: redFlags ?? undefined,
      yellowFlags: yellowFlags ?? undefined,
    },
  })

  if (readinessScore !== null) {
    try {
      const syncedStrengthFatigue = await calculateSyncedStrengthFatigue(clientId, prisma)
      strengthFatigueCache.set(clientId, {
        expiresAt: Date.now() + STRENGTH_FATIGUE_TTL_MS,
        value: syncedStrengthFatigue,
      })
    } catch (error) {
      logger.warn('Error calculating synced strength fatigue', { clientId }, error)
    }
  }

  return { readinessScore, readinessLevel }
}

async function processDailyMetricsSideEffects(input: DailyMetricsSideEffectsInput) {
  const {
    clientId,
    clientName,
    date,
    injuryPain,
    stress,
    sleepHours,
    energyLevel,
    readinessScore,
    readinessLevel,
    muscleSoreness,
    injuryDetails,
    keywordAnalysis,
    requestPhysioContact,
    physioContactReason,
    rehabPainDuring,
    rehabPainAfter,
  } = input

  try {
    if (injuryPain <= 2) {
      const activeInjuries = await prisma.injuryAssessment.findMany({
        where: {
          clientId,
          status: { not: 'FULLY_RECOVERED' },
        },
      })
      if (activeInjuries.length > 0) {
        await prisma.injuryAssessment.updateMany({
          where: {
            clientId,
            status: { not: 'FULLY_RECOVERED' },
          },
          data: {
            status: 'FULLY_RECOVERED',
            updatedAt: new Date(),
          },
        })
      }
    }

    const shouldTriggerInjury =
      injuryPain >= 5 ||
      (readinessScore !== null && readinessScore < 5.5) ||
      sleepHours < 5 ||
      stress >= 8

    if (shouldTriggerInjury) {
      await triggerInjuryProcessing({
        clientId,
        date,
        injuryPain,
        stress,
        sleepHours,
        energyLevel,
        readinessScore,
        readinessLevel,
        muscleSoreness,
        injuryDetails,
        keywordAnalysis,
      })
    }

    if (requestPhysioContact) {
      let athleteName = clientName
      if (!athleteName) {
        const athlete = await prisma.client.findUnique({
          where: { id: clientId },
          select: { name: true },
        })
        athleteName = athlete?.name
      }

      const physioAssignment = await prisma.physioAssignment.findFirst({
        where: {
          clientId,
          isActive: true,
        },
      })
      if (physioAssignment) {
        await prisma.aINotification.create({
          data: {
            clientId,
            notificationType: 'PHYSIO_CONTACT_REQUEST',
            title: '📞 Atlet begär kontakt',
            message: physioContactReason || 'Atleten vill prata med dig.',
            priority: 'HIGH',
            contextData: {
              requestType: 'ATHLETE_INITIATED',
              athleteName: athleteName || 'Atlet',
              reason: physioContactReason,
              checkInDate: new Date(date).toISOString(),
              rehabPainDuring,
              rehabPainAfter,
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      }
    }

    const allMetrics = await prisma.dailyMetrics.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      select: { date: true },
      take: 400,
    })
    const currentStreak = calculateStreakFromMetrics(allMetrics)
    const clientData = await prisma.client.findUnique({
      where: { id: clientId },
      select: { bestCheckInStreak: true },
    })
    const previousBest = clientData?.bestCheckInStreak || 0
    if (currentStreak > previousBest) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          bestCheckInStreak: currentStreak,
          bestStreakAchievedAt: new Date(),
        },
      })
    }
  } catch (error) {
    logger.error('Error processing deferred daily-metrics side effects', { clientId }, error)
    throw error
  }
}

async function triggerInjuryProcessing(payload: Record<string, unknown>) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const internalSecret = process.env.CRON_SECRET

  if (!internalSecret) {
    throw new Error('CRON_SECRET is required for durable injury processing jobs')
  }

  const response = await fetch(`${baseUrl}/api/injury/process-checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-job-secret': internalSecret,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => 'Failed to read response body')
    throw new Error(`Injury processing failed (${response.status}): ${message.slice(0, 500)}`)
  }
}

function normalizeMeasurementQuality(
  value?: string | null
): 'GOOD' | 'FAIR' | 'POOR' {
  if (value === 'FAIR') return 'FAIR'
  if (value === 'POOR') return 'POOR'
  return 'GOOD'
}

function normalizePosition(value?: string | null): 'SUPINE' | 'SEATED' {
  return value === 'SEATED' ? 'SEATED' : 'SUPINE'
}

function createFallbackHRVBaseline(measurement: HRVMeasurement): HRVBaseline {
  return {
    mean: measurement.rmssd,
    stdDev: 0,
    cv: 0,
    measurementDays: 1,
    startDate: measurement.timestamp,
    endDate: measurement.timestamp,
    thresholds: {
      excellent: measurement.rmssd,
      good: measurement.rmssd,
      moderate: measurement.rmssd,
      fair: measurement.rmssd,
      poor: measurement.rmssd,
      veryPoor: measurement.rmssd,
    },
  }
}

function createFallbackRHRBaseline(measurement: RHRMeasurement): RHRBaseline {
  return {
    mean: measurement.heartRate,
    stdDev: 0,
    min: measurement.heartRate,
    max: measurement.heartRate,
    measurementDays: 1,
    startDate: measurement.timestamp,
    endDate: measurement.timestamp,
    thresholds: {
      normal: measurement.heartRate,
      slightlyElevated: measurement.heartRate + 3,
      elevated: measurement.heartRate + 6,
      highlyElevated: measurement.heartRate + 8,
    },
  }
}

function calculateStreakFromMetrics(metrics: Array<{ date: Date }>): number {
  if (metrics.length === 0) return 0

  const sorted = [...metrics].sort((a, b) => b.date.getTime() - a.date.getTime())
  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const metric of sorted) {
    const metricDate = new Date(metric.date)
    metricDate.setHours(0, 0, 0, 0)
    const dayDiff = Math.round(
      (currentDate.getTime() - metricDate.getTime()) / (24 * 60 * 60 * 1000)
    )

    if (dayDiff === 0) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else if (dayDiff === 1 && streak === 0) {
      streak++
      currentDate = metricDate
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}
