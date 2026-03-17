/**
 * Daily Metrics API
 *
 * POST /api/daily-metrics - Save daily metrics (HRV, RHR, wellness)
 * GET /api/daily-metrics - Retrieve historical metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import {
  enqueueDailyMetricsPostWriteJob,
  processDailyMetricsPostWriteJobs,
} from '@/lib/daily-metrics-jobs'
import { createDistributedJsonCache } from '@/lib/distributed-json-cache'
import { logger } from '@/lib/logger'

const dailyMetricsWriteInFlight = new Map<string, Promise<void>>()
const dailyMetricsGetCache = createDistributedJsonCache<{ data: unknown }>('daily-metrics-get')
const dailyMetricsGetInFlight = new Map<string, Promise<unknown>>()
const dailyMetricsRecentWriteCache = new Map<
  string,
  { expiresAt: number; signature: string; payload: unknown }
>()

const DAILY_METRICS_RECENT_WRITE_TTL_MS = 2 * 60 * 1000

export async function POST(request: NextRequest) {
  let activeWriteKey: string | null = null
  let releaseWriteLock: () => void = () => {}
  let rejectWriteLock: (reason?: unknown) => void = () => {}

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      rehabExercisesDone,
      rehabPainDuring,
      rehabPainAfter,
      rehabNotes,
      requestPhysioContact,
      physioContactReason,
    } = body

    if (!clientId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, date' },
        { status: 400 }
      )
    }

    if (resolved.clientId !== clientId) {
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

    const metricsDate = normalizeMetricsDate(date)
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

    const dailyMetrics = await prisma.dailyMetrics.upsert({
      where: {
        clientId_date: {
          clientId,
          date: metricsDate,
        },
      },
      update: {
        hrvRMSSD: hrvRMSSD || null,
        hrvQuality: hrvQuality || null,
        hrvArtifactPercent: hrvArtifactPercent ?? null,
        hrvDuration: hrvDuration ?? null,
        hrvPosition: hrvPosition ?? null,
        hrvStatus: needsHrvAssessment ? 'PENDING' : 'NOT_MEASURED',
        hrvPercent: null,
        hrvTrend: null,
        restingHR: restingHR || null,
        restingHRStatus: needsRhrAssessment ? 'PENDING' : null,
        restingHRDev: null,
        sleepQuality: sleepQuality ?? null,
        sleepHours: sleepHours ?? null,
        muscleSoreness: muscleSoreness ?? null,
        energyLevel: energyLevel ?? null,
        mood: mood ?? null,
        stress: stress ?? null,
        injuryPain: injuryPain ?? null,
        wellnessScore: null,
        readinessScore: null,
        readinessLevel: hasWellnessInputs && needsHrvAssessment && needsRhrAssessment ? 'PENDING' : null,
        recommendedAction: null,
        athleteNotes: notes || null,
        injuryBodyPart: injuryDetails?.bodyPart || null,
        injurySpecificType: injuryDetails?.injuryType || null,
        injurySide: injuryDetails?.side || null,
        isIllness: injuryDetails?.isIllness || false,
        illnessType: injuryDetails?.illnessType || null,
        detectedKeywords: keywordAnalysis?.matches || null,
        keywordBodyPart: keywordAnalysis?.suggestedBodyPart || null,
        keywordSeverity: keywordAnalysis?.severityLevel || null,
        keywordSummary: keywordAnalysis?.summary || null,
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
        hrvRMSSD: hrvRMSSD || null,
        hrvQuality: hrvQuality || null,
        hrvArtifactPercent: hrvArtifactPercent ?? null,
        hrvDuration: hrvDuration ?? null,
        hrvPosition: hrvPosition ?? null,
        hrvStatus: needsHrvAssessment ? 'PENDING' : 'NOT_MEASURED',
        hrvPercent: null,
        hrvTrend: null,
        restingHR: restingHR || null,
        restingHRStatus: needsRhrAssessment ? 'PENDING' : null,
        restingHRDev: null,
        sleepQuality: sleepQuality ?? null,
        sleepHours: sleepHours ?? null,
        muscleSoreness: muscleSoreness ?? null,
        energyLevel: energyLevel ?? null,
        mood: mood ?? null,
        stress: stress ?? null,
        injuryPain: injuryPain ?? null,
        wellnessScore: null,
        readinessScore: null,
        readinessLevel: hasWellnessInputs && needsHrvAssessment && needsRhrAssessment ? 'PENDING' : null,
        recommendedAction: null,
        athleteNotes: notes || null,
        injuryBodyPart: injuryDetails?.bodyPart || null,
        injurySpecificType: injuryDetails?.injuryType || null,
        injurySide: injuryDetails?.side || null,
        isIllness: injuryDetails?.isIllness || false,
        illnessType: injuryDetails?.illnessType || null,
        detectedKeywords: keywordAnalysis?.matches || null,
        keywordBodyPart: keywordAnalysis?.suggestedBodyPart || null,
        keywordSeverity: keywordAnalysis?.severityLevel || null,
        keywordSummary: keywordAnalysis?.summary || null,
        rehabExercisesDone: rehabExercisesDone ?? false,
        rehabPainDuring: rehabPainDuring ?? null,
        rehabPainAfter: rehabPainAfter ?? null,
        rehabNotes: rehabNotes || null,
        requestPhysioContact: requestPhysioContact ?? false,
        physioContactReason: physioContactReason || null,
      },
    })

    await enqueueDailyMetricsPostWriteJob({
      clientId,
      date,
      signature: writeSignature,
      shouldRunSideEffects: true,
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
        hrv: null,
        rhr: null,
        wellness: null,
        readiness: null,
        deferred: true,
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
    const cacheKeySuffix = `:${clientId}:`
    for (const key of dailyMetricsGetCache.keys()) {
      if (key.includes(cacheKeySuffix)) {
        void dailyMetricsGetCache.delete(key)
      }
    }

    void processDailyMetricsPostWriteJobs({ limit: 1, jobKey: writeKey }).catch(error => {
      logger.warn('Immediate daily-metrics job processing failed; cron will retry', { writeKey }, error)
    })

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

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required parameter: clientId' },
        { status: 400 }
      )
    }
    if (resolved.clientId !== clientId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const cacheKey = `${resolved.user.id}:${clientId}:${days}`
    const nowMs = Date.now()
    const cached = await dailyMetricsGetCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs) {
      return NextResponse.json(cached.payload.data)
    }

    const inFlight = dailyMetricsGetInFlight.get(cacheKey)
    if (inFlight) {
      const payload = await inFlight
      return NextResponse.json(payload)
    }

    const loadPromise = (async () => {
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

      const recentMetrics = metrics.slice(0, 7)
      const payload = {
        success: true,
        metrics,
        summary: {
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
        },
      }

      await dailyMetricsGetCache.set(cacheKey, {
        expiresAt: Date.now() + 10 * 1000,
        staleUntil: Date.now() + 10 * 1000,
        payload: { data: payload },
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

function createDailyMetricsWriteSignature(body: Record<string, unknown>): string {
  return JSON.stringify({
    clientId: body.clientId ?? null,
    date: typeof body.date === 'string' ? body.date.slice(0, 10) : body.date ?? null,
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

function normalizeMetricsDate(input: string): Date {
  const datePart = input.slice(0, 10)
  return new Date(`${datePart}T00:00:00.000Z`)
}
