/**
 * Daily Metrics API
 *
 * POST /api/daily-metrics - Save daily metrics (HRV, RHR, wellness)
 * GET /api/daily-metrics - Retrieve historical metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
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
import { logger } from '@/lib/logger'

const STRENGTH_FATIGUE_TTL_MS = 60 * 1000
const strengthFatigueCache = new Map<string, { expiresAt: number; value: SyncedStrengthFatigue }>()
const dailyMetricsSideEffectsDedup = new Map<string, number>()
const dailyMetricsWriteInFlight = new Map<string, Promise<void>>()
const dailyMetricsAssessmentInFlight = new Map<string, Promise<void>>()
const dailyMetricsPostWritePending = new Map<string, DailyMetricsPostWriteInput>()
const dailyMetricsPostWriteTimers = new Map<string, ReturnType<typeof setTimeout>>()
let dailyMetricsPostWriteActive = 0
const clientAccessCache = new Map<string, { expiresAt: number; allowed: boolean }>()
const dailyMetricsGetCache = new Map<string, { expiresAt: number; payload: unknown }>()
const dailyMetricsGetInFlight = new Map<string, Promise<unknown>>()
const DAILY_METRICS_RECENT_WRITE_TTL_MS = 15 * 1000
const AUTH_CONTEXT_TTL_MS = 30 * 1000
const DAILY_METRICS_POST_WRITE_DEBOUNCE_MS = 3000
const DAILY_METRICS_POST_WRITE_REPORT_INTERVAL_MS = 30 * 1000
const DAILY_METRICS_RECOMPUTE_SKIP_TTL_MS = 2 * 60 * 1000
const dailyMetricsRecentWriteCache = new Map<
  string,
  { expiresAt: number; signature: string; payload: unknown }
>()
const dailyMetricsProcessedSignatureCache = new Map<
  string,
  {
    signature: string
    processedAt: number
    readinessScore: number | null
    readinessLevel: string | null
  }
>()
const authEmailCache = new Map<string, { expiresAt: number; email: string }>()
const userIdByEmailCache = new Map<string, { expiresAt: number; userId: string }>()
const authEmailInFlight = new Map<string, Promise<string>>()
const userIdByEmailInFlight = new Map<string, Promise<string | null>>()
const postWriteMetrics = {
  enqueued: 0,
  coalesced: 0,
  started: 0,
  completed: 0,
  recomputeSkipped: 0,
  failed: 0,
  totalDurationMs: 0,
  maxDurationMs: 0,
  lastReportedAt: Date.now(),
}

/**
 * POST /api/daily-metrics
 *
 * Save daily metrics and calculate readiness score
 */
export async function POST(request: NextRequest) {
  let activeWriteKey: string | null = null
  let releaseWriteLock: () => void = () => {}
  let rejectWriteLock: (reason?: unknown) => void = () => {}
  try {
    const authResult = await resolveAuthenticatedUserId(request)
    if (!authResult.ok) {
      return authResult.response
    }
    const dbUserId = authResult.userId

    // Parse request body
    const body = await request.json()
    const {
      clientId,
      date,
      hrvRMSSD,
      hrvQuality,
      hrvArtifactPercent,
      hrvDuration,
      hrvPosition,
      restingHR,
      sleepQuality,
      sleepHours,
      muscleSoreness,
      energyLevel,
      mood,
      stress,
      injuryPain,
      notes,
      injuryDetails,
      keywordAnalysis,
      // Rehab compliance (Phase 7 - Physio System)
      rehabExercisesDone,
      rehabPainDuring,
      rehabPainAfter,
      rehabNotes,
      requestPhysioContact,
      physioContactReason,
    } = body

    // Validate required fields
    if (!clientId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, date' },
        { status: 400 }
      )
    }

    const accessCacheKey = `${dbUserId}:${clientId}`
    const cachedAccess = clientAccessCache.get(accessCacheKey)
    let hasAccess: boolean
    if (cachedAccess && cachedAccess.expiresAt > Date.now()) {
      hasAccess = cachedAccess.allowed
    } else {
      hasAccess = await canAccessClient(dbUserId, clientId)
      clientAccessCache.set(accessCacheKey, {
        expiresAt: Date.now() + 2 * 60 * 1000,
        allowed: hasAccess,
      })
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const writeKey = `${clientId}:${date}`
    const writeSignature = createDailyMetricsWriteSignature(body)
    const recentWrite = dailyMetricsRecentWriteCache.get(writeKey)
    if (
      recentWrite &&
      recentWrite.expiresAt > Date.now() &&
      recentWrite.signature === writeSignature
    ) {
      return NextResponse.json(recentWrite.payload)
    }
    const inFlightWrite = dailyMetricsWriteInFlight.get(writeKey)
    if (inFlightWrite) {
      const currentRecent = dailyMetricsRecentWriteCache.get(writeKey)
      if (
        currentRecent &&
        currentRecent.expiresAt > Date.now() &&
        currentRecent.signature === writeSignature
      ) {
        return NextResponse.json(currentRecent.payload)
      }
      // Duplicate check-in submission for the same athlete/date while a write is in-flight:
      // acknowledge quickly instead of queueing request latency.
      return NextResponse.json({
        success: true,
        queued: true,
        assessments: {
          hrv: null,
          rhr: null,
          wellness: null,
          readiness: null,
          strengthFatigue: null,
        },
        injuryResponse: {
          triggered: false,
          pendingEvaluation: true,
        },
      })
    }
    const writeLockPromise = new Promise<void>((resolve, reject) => {
      releaseWriteLock = resolve
      rejectWriteLock = reject
    })
    activeWriteKey = writeKey
    dailyMetricsWriteInFlight.set(writeKey, writeLockPromise)

    // Convert date string to Date object
    const metricsDate = new Date(date)

    const needsHrvAssessment = hrvRMSSD !== undefined && hrvQuality !== undefined
    const needsRhrAssessment = restingHR !== undefined
    const hasWellnessInputs =
      sleepQuality !== undefined &&
      sleepHours !== undefined &&
      muscleSoreness !== undefined &&
      energyLevel !== undefined &&
      mood !== undefined &&
      stress !== undefined &&
      injuryPain !== undefined
    const hasReadinessInputs = needsHrvAssessment && needsRhrAssessment && hasWellnessInputs

    // Synchronous path is intentionally minimal; expensive readiness calculations run async.
    const hrvAssessment = null
    const rhrAssessment = null
    const wellnessScoreData = null
    const readinessScoreData = null
    const hrvStatus = needsHrvAssessment ? 'PENDING' : 'NOT_MEASURED'
    const hrvPercent = null
    const hrvTrend = null
    const restingHRStatus = needsRhrAssessment ? 'PENDING' : null
    const restingHRDev = null
    const calculatedWellnessScore = null
    const calculatedReadinessScore = null
    const readinessLevel = hasReadinessInputs ? 'PENDING' : null
    const recommendedAction = null

    // ==================
    // Save to Database
    // ==================
    const dailyMetrics = await prisma.dailyMetrics.upsert({
      where: {
        clientId_date: {
          clientId,
          date: metricsDate,
        },
      },
      update: {
        // HRV data
        hrvRMSSD: hrvRMSSD || null,
        hrvQuality: hrvQuality || null,
        hrvArtifactPercent: hrvArtifactPercent ?? null,
        hrvDuration: hrvDuration ?? null,
        hrvPosition: hrvPosition ?? null,
        hrvStatus,
        hrvPercent,
        hrvTrend,

        // RHR data
        restingHR: restingHR || null,
        restingHRStatus,
        restingHRDev,

        // Wellness data
        sleepQuality: sleepQuality ?? null,
        sleepHours: sleepHours ?? null,
        muscleSoreness: muscleSoreness ?? null,
        energyLevel: energyLevel ?? null,
        mood: mood ?? null,
        stress: stress ?? null,
        injuryPain: injuryPain ?? null,
        wellnessScore: calculatedWellnessScore,

        // Readiness composite
        readinessScore: calculatedReadinessScore,
        readinessLevel,
        recommendedAction,

        // Notes
        athleteNotes: notes || null,

        // Injury details (when pain >= 3)
        injuryBodyPart: injuryDetails?.bodyPart || null,
        injurySpecificType: injuryDetails?.injuryType || null,
        injurySide: injuryDetails?.side || null,
        isIllness: injuryDetails?.isIllness || false,
        illnessType: injuryDetails?.illnessType || null,

        // Keyword analysis from notes
        detectedKeywords: keywordAnalysis?.matches || null,
        keywordBodyPart: keywordAnalysis?.suggestedBodyPart || null,
        keywordSeverity: keywordAnalysis?.severityLevel || null,
        keywordSummary: keywordAnalysis?.summary || null,

        // Rehab compliance (Phase 7 - Physio System)
        rehabExercisesDone: rehabExercisesDone ?? false,
        rehabPainDuring: rehabPainDuring ?? null,
        rehabPainAfter: rehabPainAfter ?? null,
        rehabNotes: rehabNotes || null,
        requestPhysioContact: requestPhysioContact ?? false,
        physioContactReason: physioContactReason || null,

        updatedAt: new Date(),
      },
      create: {
        clientId,
        date: metricsDate,

        // HRV data
        hrvRMSSD: hrvRMSSD || null,
        hrvQuality: hrvQuality || null,
        hrvArtifactPercent: hrvArtifactPercent ?? null,
        hrvDuration: hrvDuration ?? null,
        hrvPosition: hrvPosition ?? null,
        hrvStatus,
        hrvPercent,
        hrvTrend,

        // RHR data
        restingHR: restingHR || null,
        restingHRStatus,
        restingHRDev,

        // Wellness data
        sleepQuality: sleepQuality ?? null,
        sleepHours: sleepHours ?? null,
        muscleSoreness: muscleSoreness ?? null,
        energyLevel: energyLevel ?? null,
        mood: mood ?? null,
        stress: stress ?? null,
        injuryPain: injuryPain ?? null,
        wellnessScore: calculatedWellnessScore,

        // Readiness composite
        readinessScore: calculatedReadinessScore,
        readinessLevel,
        recommendedAction,

        // Notes
        athleteNotes: notes || null,

        // Injury details (when pain >= 3)
        injuryBodyPart: injuryDetails?.bodyPart || null,
        injurySpecificType: injuryDetails?.injuryType || null,
        injurySide: injuryDetails?.side || null,
        isIllness: injuryDetails?.isIllness || false,
        illnessType: injuryDetails?.illnessType || null,

        // Keyword analysis from notes
        detectedKeywords: keywordAnalysis?.matches || null,
        keywordBodyPart: keywordAnalysis?.suggestedBodyPart || null,
        keywordSeverity: keywordAnalysis?.severityLevel || null,
        keywordSummary: keywordAnalysis?.summary || null,

        // Rehab compliance (Phase 7 - Physio System)
        rehabExercisesDone: rehabExercisesDone ?? false,
        rehabPainDuring: rehabPainDuring ?? null,
        rehabPainAfter: rehabPainAfter ?? null,
        rehabNotes: rehabNotes || null,
        requestPhysioContact: requestPhysioContact ?? false,
        physioContactReason: physioContactReason || null,
      },
    })

    // Defer assessments + side effects to background to keep write latency low.
    const shouldRunSideEffects = shouldProcessDailyMetricsSideEffects(clientId, date)
    enqueueDailyMetricsPostWrite({
      clientId,
      date,
      signature: writeSignature,
      shouldRunSideEffects,
      sideEffectsInput: {
        clientId,
        date,
        injuryPain: injuryPain ?? 0,
        stress: stress ?? 0,
        sleepHours: sleepHours ?? 0,
        energyLevel: energyLevel ?? 0,
        readinessScore: null,
        readinessLevel: null,
        muscleSoreness: muscleSoreness ?? 0,
        injuryDetails,
        keywordAnalysis,
        requestOrigin: request.nextUrl.origin,
        authCookie: request.headers.get('cookie') || '',
        requestPhysioContact: requestPhysioContact ?? false,
        physioContactReason,
        rehabPainDuring,
        rehabPainAfter,
      },
    })

    const responsePayload = {
      success: true,
      dailyMetrics,
      assessments: {
        hrv: hrvAssessment,
        rhr: rhrAssessment,
        wellness: wellnessScoreData,
        readiness: readinessScoreData,
        deferred: true,
        // Available after async assessment pipeline completes.
        strengthFatigue: null,
      },
      injuryResponse: {
        triggered: false,
        pendingEvaluation: true,
      },
    }
    dailyMetricsRecentWriteCache.set(writeKey, {
      expiresAt: Date.now() + DAILY_METRICS_RECENT_WRITE_TTL_MS,
      signature: writeSignature,
      payload: responsePayload,
    })
    const response = NextResponse.json(responsePayload)
    // Invalidate short-lived GET cache for this athlete after writes.
    const cacheKeySuffix = `:${clientId}:`
    for (const key of dailyMetricsGetCache.keys()) {
      if (key.includes(cacheKeySuffix)) {
        dailyMetricsGetCache.delete(key)
      }
    }
    releaseWriteLock()
    return response
  } catch (error) {
    rejectWriteLock(error)
    logger.error('Error saving daily metrics', {}, error)
    return NextResponse.json(
      { error: 'Failed to save daily metrics' },
      { status: 500 }
    )
  } finally {
    if (activeWriteKey) {
      dailyMetricsWriteInFlight.delete(activeWriteKey)
    }
  }
}

interface DailyMetricsPostWriteInput {
  clientId: string
  date: string
  signature: string
  shouldRunSideEffects: boolean
  sideEffectsInput: DailyMetricsSideEffectsInput
}

function enqueueDailyMetricsPostWrite(input: DailyMetricsPostWriteInput) {
  const key = `${input.clientId}:${input.date}`
  postWriteMetrics.enqueued++
  if (dailyMetricsPostWritePending.has(key)) {
    postWriteMetrics.coalesced++
  }
  dailyMetricsPostWritePending.set(key, input)
  scheduleDailyMetricsPostWriteFlush(key, DAILY_METRICS_POST_WRITE_DEBOUNCE_MS)
  maybeReportPostWriteQueueMetrics()
}

function scheduleDailyMetricsPostWriteFlush(key: string, delayMs: number) {
  if (dailyMetricsPostWriteTimers.has(key)) {
    return
  }
  const timer = setTimeout(() => {
    dailyMetricsPostWriteTimers.delete(key)
    void flushDailyMetricsPostWrite(key).catch(error => {
      logger.error('Deferred daily-metrics post-write flush failed', { key }, error)
    })
  }, delayMs)
  dailyMetricsPostWriteTimers.set(key, timer)
}

async function flushDailyMetricsPostWrite(key: string) {
  const pending = dailyMetricsPostWritePending.get(key)
  if (!pending) {
    return
  }
  dailyMetricsPostWritePending.delete(key)
  dailyMetricsPostWriteActive++
  postWriteMetrics.started++
  const startedAt = Date.now()
  try {
    await processDailyMetricsPostWriteNow(pending)
    postWriteMetrics.completed++
  } finally {
    const durationMs = Date.now() - startedAt
    postWriteMetrics.totalDurationMs += durationMs
    postWriteMetrics.maxDurationMs = Math.max(postWriteMetrics.maxDurationMs, durationMs)
    dailyMetricsPostWriteActive--
    // If a newer payload arrived while processing this key, flush it soon.
    if (dailyMetricsPostWritePending.has(key)) {
      scheduleDailyMetricsPostWriteFlush(key, 100)
    }
    maybeReportPostWriteQueueMetrics()
  }
}

async function processDailyMetricsPostWriteNow(input: DailyMetricsPostWriteInput) {
  const { clientId, date, signature, shouldRunSideEffects, sideEffectsInput } = input
  const key = `${clientId}:${date}`
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
      postWriteMetrics.recomputeSkipped++
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
  } catch (error) {
    postWriteMetrics.failed++
    throw error
  } finally {
    dailyMetricsAssessmentInFlight.delete(key)
  }
}

function maybeReportPostWriteQueueMetrics() {
  const now = Date.now()
  if (now - postWriteMetrics.lastReportedAt < DAILY_METRICS_POST_WRITE_REPORT_INTERVAL_MS) {
    return
  }
  const completed = Math.max(postWriteMetrics.completed, 1)
  logger.info('Daily-metrics post-write queue stats', {
    enqueued: postWriteMetrics.enqueued,
    coalesced: postWriteMetrics.coalesced,
    started: postWriteMetrics.started,
    completed: postWriteMetrics.completed,
    recomputeSkipped: postWriteMetrics.recomputeSkipped,
    failed: postWriteMetrics.failed,
    active: dailyMetricsPostWriteActive,
    pending: dailyMetricsPostWritePending.size,
    timers: dailyMetricsPostWriteTimers.size,
    avgDurationMs: Math.round(postWriteMetrics.totalDurationMs / completed),
    maxDurationMs: postWriteMetrics.maxDurationMs,
  })
  postWriteMetrics.lastReportedAt = now
}

interface RecomputeDailyMetricsAssessmentsInput {
  clientId: string
  date: string
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
    const hrvMeasurement: HRVMeasurement = {
      rmssd: dailyMetrics.hrvRMSSD,
      quality: normalizeMeasurementQuality(dailyMetrics.hrvQuality),
      artifactPercent: dailyMetrics.hrvArtifactPercent ?? 0,
      duration: dailyMetrics.hrvDuration ?? 180,
      position: normalizePosition(dailyMetrics.hrvPosition),
      timestamp: metricsDate,
    }

    const historicalHRVMeasurements = historicalMetrics
      .filter(m => m.hrvRMSSD !== null)
      .map(m => ({
        rmssd: m.hrvRMSSD as number,
        quality: normalizeMeasurementQuality(m.hrvQuality),
        artifactPercent: m.hrvArtifactPercent ?? 0,
        duration: m.hrvDuration ?? 180,
        position: normalizePosition(m.hrvPosition),
        timestamp: m.date,
      }))

    let hrvBaseline: HRVBaseline | null = null
    if (historicalHRVMeasurements.length >= 14) {
      try {
        hrvBaseline = establishHRVBaseline(historicalHRVMeasurements)
      } catch (error) {
        logger.warn(
          'Failed to build HRV baseline from history',
          { clientId, measurementCount: historicalHRVMeasurements.length },
          error
        )
      }
    }
    if (!hrvBaseline) {
      hrvBaseline = createFallbackHRVBaseline(hrvMeasurement)
    }
    hrvAssessment = assessHRV(hrvMeasurement, hrvBaseline)
    hrvStatus = hrvAssessment.status
    hrvPercent = hrvAssessment.percentOfBaseline
    hrvTrend = hrvAssessment.trend
  }

  let rhrAssessment = null
  let restingHRStatus: string | null = needsRhrAssessment ? 'PENDING' : null
  let restingHRDev: number | null = null
  if (needsRhrAssessment && dailyMetrics.restingHR !== null) {
    const rhrMeasurement: RHRMeasurement = {
      heartRate: dailyMetrics.restingHR,
      quality: 'GOOD',
      duration: 60,
      position: 'SUPINE',
      timestamp: metricsDate,
    }
    const historicalRHRMeasurements = historicalMetrics
      .filter(m => m.restingHR !== null)
      .map(m => ({
        heartRate: m.restingHR as number,
        quality: 'GOOD' as const,
        duration: 60,
        position: 'SUPINE' as const,
        timestamp: m.date,
      }))

    let rhrBaseline: RHRBaseline | null = null
    if (historicalRHRMeasurements.length >= 7) {
      try {
        rhrBaseline = establishRHRBaseline(historicalRHRMeasurements)
      } catch (error) {
        logger.warn(
          'Failed to build RHR baseline from history',
          { clientId, measurementCount: historicalRHRMeasurements.length },
          error
        )
      }
    }
    if (!rhrBaseline) {
      rhrBaseline = createFallbackRHRBaseline(rhrMeasurement)
    }
    rhrAssessment = assessRHR(rhrMeasurement, rhrBaseline)
    restingHRStatus = rhrAssessment.status
    restingHRDev = rhrAssessment.deviationFromBaseline
  }

  let wellnessScoreData = null
  let wellnessScore: number | null = null
  if (
    dailyMetrics.sleepQuality !== null &&
    dailyMetrics.sleepHours !== null &&
    dailyMetrics.muscleSoreness !== null &&
    dailyMetrics.energyLevel !== null &&
    dailyMetrics.mood !== null &&
    dailyMetrics.stress !== null &&
    dailyMetrics.injuryPain !== null
  ) {
    const scaleTo5 = (value: number) => Math.round(((value - 1) / 9) * 4 + 1)
    const invertScale = (value: number) => 11 - value
    const wellnessResponses: WellnessResponses = {
      sleepQuality: scaleTo5(dailyMetrics.sleepQuality) as 1 | 2 | 3 | 4 | 5,
      sleepDuration: dailyMetrics.sleepHours,
      fatigueLevel: scaleTo5(dailyMetrics.energyLevel) as 1 | 2 | 3 | 4 | 5,
      muscleSoreness: scaleTo5(invertScale(dailyMetrics.muscleSoreness)) as 1 | 2 | 3 | 4 | 5,
      stressLevel: scaleTo5(invertScale(dailyMetrics.stress)) as 1 | 2 | 3 | 4 | 5,
      mood: scaleTo5(dailyMetrics.mood) as 1 | 2 | 3 | 4 | 5,
      motivationToTrain: scaleTo5(invertScale(dailyMetrics.injuryPain)) as 1 | 2 | 3 | 4 | 5,
    }
    wellnessScoreData = calculateWellnessScore(wellnessResponses)
    wellnessScore = wellnessScoreData.totalScore
  }

  let readinessScore: number | null = null
  let readinessLevel: string | null = null
  let recommendedAction: string | null = null
  if (hrvAssessment && rhrAssessment && wellnessScoreData) {
    const readinessScoreData = calculateReadinessScore({
      hrv: hrvAssessment,
      rhr: rhrAssessment,
      wellness: wellnessScoreData,
    })
    readinessScore = readinessScoreData.score
    readinessLevel = readinessScoreData.status
    recommendedAction = readinessScoreData.workoutModification.action
  }

  await prisma.dailyMetrics.update({
    where: { id: dailyMetrics.id },
    data: {
      hrvStatus,
      hrvPercent,
      hrvTrend,
      restingHRStatus,
      restingHRDev,
      wellnessScore,
      readinessScore,
      readinessLevel,
      recommendedAction,
    },
  })

  if (dailyMetrics.muscleSoreness !== null) {
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

interface DailyMetricsSideEffectsInput {
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
  injuryDetails?: Record<string, any>
  keywordAnalysis?: Record<string, any>
  requestOrigin: string
  authCookie: string
  requestPhysioContact: boolean
  physioContactReason?: string
  rehabPainDuring?: number
  rehabPainAfter?: number
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
    requestOrigin,
    authCookie,
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
      await fetch(`${requestOrigin}/api/injury/process-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          clientId,
          date,
          injuryPain,
          stress,
          sleepHours,
          energyLevel,
          readinessScore,
          readinessLevel,
          muscleSoreness,
          injuryDetails: injuryDetails
            ? {
                bodyPart: injuryDetails.bodyPart,
                injuryType: injuryDetails.injuryType,
                side: injuryDetails.side,
                isIllness: injuryDetails.isIllness,
                illnessType: injuryDetails.illnessType,
              }
            : undefined,
          keywordAnalysis: keywordAnalysis
            ? {
                matches: keywordAnalysis.matches,
                suggestedBodyPart: keywordAnalysis.suggestedBodyPart,
                severityLevel: keywordAnalysis.severityLevel,
                summary: keywordAnalysis.summary,
              }
            : undefined,
        }),
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
  }
}

/**
 * GET /api/daily-metrics?clientId=xxx&days=30
 *
 * Retrieve historical daily metrics
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await resolveAuthenticatedUserId(request)
    if (!authResult.ok) {
      return authResult.response
    }
    const dbUserId = authResult.userId

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }

    const accessCacheKey = `${dbUserId}:${clientId}`
    const cachedAccess = clientAccessCache.get(accessCacheKey)
    let hasAccess: boolean
    if (cachedAccess && cachedAccess.expiresAt > Date.now()) {
      hasAccess = cachedAccess.allowed
    } else {
      hasAccess = await canAccessClient(dbUserId, clientId)
      clientAccessCache.set(accessCacheKey, {
        expiresAt: Date.now() + 2 * 60 * 1000,
        allowed: hasAccess,
      })
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const cacheKey = `${dbUserId}:${clientId}:${days}`
    const nowMs = Date.now()
    const cached = dailyMetricsGetCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs) {
      return NextResponse.json(cached.payload)
    }
    const inFlight = dailyMetricsGetInFlight.get(cacheKey)
    if (inFlight) {
      const payload = await inFlight
      return NextResponse.json(payload)
    }

    const loadPromise = (async () => {

    // Retrieve metrics
    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        clientId,
        date: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        clientId: true,
        date: true,
        readinessScore: true,
        readinessLevel: true,
        recommendedAction: true,
        wellnessScore: true,
        hrvRMSSD: true,
        restingHR: true,
        sleepHours: true,
        sleepQuality: true,
        muscleSoreness: true,
        energyLevel: true,
        mood: true,
        stress: true,
        injuryPain: true,
        hrvStatus: true,
        hrvPercent: true,
        hrvTrend: true,
        restingHRStatus: true,
        restingHRDev: true,
        athleteNotes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { date: 'desc' },
    })

    // Calculate summary statistics
    const recentMetrics = metrics.slice(0, 7) // Last 7 days

    const summary = {
      totalDays: metrics.length,
      recentDays: recentMetrics.length,
      averageReadiness:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.readinessScore || 0), 0) /
            recentMetrics.filter(m => m.readinessScore !== null).length
          : null,
      averageWellness:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.wellnessScore || 0), 0) /
            recentMetrics.filter(m => m.wellnessScore !== null).length
          : null,
      averageHRV:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.hrvRMSSD || 0), 0) /
            recentMetrics.filter(m => m.hrvRMSSD !== null).length
          : null,
      averageRHR:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + (m.restingHR || 0), 0) /
            recentMetrics.filter(m => m.restingHR !== null).length
          : null,
    }

    const payload = {
      success: true,
      metrics,
      summary,
    }

    dailyMetricsGetCache.set(cacheKey, {
      expiresAt: Date.now() + 10 * 1000,
      payload,
    })
    return payload
    })()

    dailyMetricsGetInFlight.set(cacheKey, loadPromise)
    try {
      const payload = await loadPromise
      return NextResponse.json(payload)
    } finally {
      dailyMetricsGetInFlight.delete(cacheKey)
    }
  } catch (error) {
    logger.error('Error retrieving daily metrics', {}, error)
    return NextResponse.json(
      { error: 'Failed to retrieve daily metrics' },
      { status: 500 }
    )
  }
}

async function resolveAuthenticatedUserId(
  request: NextRequest
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const forwardedEmail = request.headers.get('x-auth-user-email')
  const authCacheKey = buildAuthCacheKey(request, forwardedEmail)
  const nowMs = Date.now()

  let authEmail = forwardedEmail
  if (!authEmail) {
    const cachedEmail = authEmailCache.get(authCacheKey)
    if (cachedEmail && cachedEmail.expiresAt > nowMs) {
      authEmail = cachedEmail.email
    } else {
      const inFlightEmail = authEmailInFlight.get(authCacheKey)
      if (inFlightEmail) {
        authEmail = await inFlightEmail
      } else {
        const resolveEmailPromise = (async () => {
          const supabase = await createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user?.email) {
            throw new Error('UNAUTHORIZED')
          }
          return user.email
        })()
        authEmailInFlight.set(authCacheKey, resolveEmailPromise)
        try {
          authEmail = await resolveEmailPromise
        } catch (error) {
          if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            return {
              ok: false,
              response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            }
          }
          throw error
        } finally {
          authEmailInFlight.delete(authCacheKey)
        }
      }
      authEmailCache.set(authCacheKey, {
        expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
        email: authEmail,
      })
    }
  }

  const cachedUserId = userIdByEmailCache.get(authEmail)
  if (cachedUserId && cachedUserId.expiresAt > nowMs) {
    return { ok: true, userId: cachedUserId.userId }
  }
  const inFlightUserId = userIdByEmailInFlight.get(authEmail)
  const resolvedUserId = inFlightUserId
    ? await inFlightUserId
    : await (() => {
        const lookupPromise = prisma.user
          .findUnique({
            where: { email: authEmail },
            select: { id: true },
          })
          .then(user => user?.id ?? null)
        userIdByEmailInFlight.set(authEmail, lookupPromise)
        return lookupPromise.finally(() => {
          userIdByEmailInFlight.delete(authEmail)
        })
      })()
  if (!resolvedUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    }
  }
  userIdByEmailCache.set(authEmail, {
    expiresAt: nowMs + AUTH_CONTEXT_TTL_MS,
    userId: resolvedUserId,
  })

  return { ok: true, userId: resolvedUserId }
}

function buildAuthCacheKey(request: NextRequest, forwardedEmail?: string | null): string {
  if (forwardedEmail) {
    return `forwarded:${forwardedEmail}`
  }
  const cookieHeader = request.headers.get('cookie') || ''
  const supabaseSessionCookie = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('sb-') && part.includes('auth-token='))

  if (supabaseSessionCookie) {
    return `cookie:${supabaseSessionCookie}`
  }

  return `cookie:${cookieHeader.slice(0, 256)}`
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

function shouldProcessDailyMetricsSideEffects(clientId: string, date: string): boolean {
  const dedupKey = `${clientId}:${date}`
  const now = Date.now()
  const previousRunAt = dailyMetricsSideEffectsDedup.get(dedupKey)
  if (previousRunAt && now - previousRunAt < 60 * 1000) {
    return false
  }
  dailyMetricsSideEffectsDedup.set(dedupKey, now)
  return true
}

function createDailyMetricsWriteSignature(body: Record<string, unknown>): string {
  // Keep signature stable and compact; only include fields that affect persisted values.
  return JSON.stringify({
    clientId: body.clientId ?? null,
    date: body.date ?? null,
    hrvRMSSD: body.hrvRMSSD ?? null,
    hrvQuality: body.hrvQuality ?? null,
    hrvArtifactPercent: body.hrvArtifactPercent ?? null,
    hrvDuration: body.hrvDuration ?? null,
    hrvPosition: body.hrvPosition ?? null,
    restingHR: body.restingHR ?? null,
    sleepQuality: body.sleepQuality ?? null,
    sleepHours: body.sleepHours ?? null,
    muscleSoreness: body.muscleSoreness ?? null,
    energyLevel: body.energyLevel ?? null,
    mood: body.mood ?? null,
    stress: body.stress ?? null,
    injuryPain: body.injuryPain ?? null,
    notes: body.notes ?? null,
    injuryDetails: body.injuryDetails ?? null,
    keywordAnalysis: body.keywordAnalysis ?? null,
    rehabExercisesDone: body.rehabExercisesDone ?? null,
    rehabPainDuring: body.rehabPainDuring ?? null,
    rehabPainAfter: body.rehabPainAfter ?? null,
    rehabNotes: body.rehabNotes ?? null,
    requestPhysioContact: body.requestPhysioContact ?? null,
    physioContactReason: body.physioContactReason ?? null,
  })
}

/**
 * Calculate consecutive days with check-ins starting from today
 */
function calculateStreakFromMetrics(metrics: Array<{ date: Date }>): number {
  if (metrics.length === 0) return 0

  // Sort by date descending
  const sorted = [...metrics].sort((a, b) => b.date.getTime() - a.date.getTime())

  let streak = 0
  let expectedDate = new Date()
  expectedDate.setHours(0, 0, 0, 0)

  for (const metric of sorted) {
    const metricDate = new Date(metric.date)
    metricDate.setHours(0, 0, 0, 0)

    if (metricDate.getTime() === expectedDate.getTime()) {
      streak++
      // Move to previous day
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else {
      // Streak broken
      break
    }
  }

  return streak
}