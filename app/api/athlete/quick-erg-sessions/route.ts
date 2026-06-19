import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { invalidateUnifiedCalendarCacheForClient } from '@/lib/calendar/unified/invalidate'
import { syncQuickErgCoachAlertsSafely } from '@/lib/quick-erg/coach-alerts'
import { refreshWorkoutEvaluationsAround } from '@/lib/workout-evaluation'
import {
  buildQuickErgDedupeKey,
  buildQuickErgSessionAnalysis,
  estimateQuickErgTrainingLoad,
  formatMachineName,
  inferActivityType,
  mapRpeToIntensity,
  type QuickErgMachineType,
  type QuickErgSource,
  type QuickErgSample,
} from '@/lib/quick-erg/session-summary'

const MACHINE_TYPES = [
  'CONCEPT2_ROW',
  'CONCEPT2_SKIERG',
  'CONCEPT2_BIKEERG',
  'WATTBIKE',
  'ASSAULT_BIKE',
  'FTMS_BIKE',
  'FTMS_AIRBIKE',
  'UNKNOWN',
] as const

const SOURCES = [
  'BLUETOOTH_FTMS',
  'BLUETOOTH_PM5',
  'BLUETOOTH_CPS',
  'MANUAL_IMPORT',
] as const

const sampleSchema = z.object({
  elapsedSec: z.number().int().min(0),
  power: z.number().finite().optional(),
  cadence: z.number().finite().optional(),
  speed: z.number().finite().optional(),
  distanceMeters: z.number().finite().min(0).optional(),
  heartRate: z.number().finite().min(0).optional(),
  pace500m: z.number().finite().min(0).optional(),
  strokeRate: z.number().finite().min(0).optional(),
  strokeCount: z.number().finite().min(0).optional(),
  calories: z.number().finite().min(0).optional(),
})

const createQuickErgSessionSchema = z.object({
  machineType: z.enum(MACHINE_TYPES),
  machineKind: z.enum(['bike', 'rower']).nullable().optional(),
  source: z.enum(SOURCES).optional(),
  deviceName: z.string().max(160).nullable().optional(),
  deviceId: z.string().max(160).nullable().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  samples: z.array(sampleSchema).min(5).max(21_600),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function sanitizeSamples(samples: QuickErgSample[]): QuickErgSample[] {
  const bySecond = new Map<number, QuickErgSample>()

  for (const sample of samples) {
    bySecond.set(sample.elapsedSec, {
      elapsedSec: sample.elapsedSec,
      power: numberOrUndefined(sample.power),
      cadence: numberOrUndefined(sample.cadence),
      speed: numberOrUndefined(sample.speed),
      distanceMeters: numberOrUndefined(sample.distanceMeters),
      heartRate: numberOrUndefined(sample.heartRate),
      pace500m: numberOrUndefined(sample.pace500m),
      strokeRate: numberOrUndefined(sample.strokeRate),
      strokeCount: numberOrUndefined(sample.strokeCount),
      calories: numberOrUndefined(sample.calories),
    })
  }

  return [...bySecond.values()].sort((a, b) => a.elapsedSec - b.elapsedSec)
}

function numberOrUndefined(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function dayDate(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehorig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, resolved.user.language)
    const body = await request.json()
    const parsed = createQuickErgSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid quick erg session data', 'Ogiltig data for ergpasset'),
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    const startedAt = new Date(data.startedAt)
    const completedAt = new Date(data.completedAt)

    if (completedAt <= startedAt) {
      return NextResponse.json(
        { success: false, error: t(locale, 'End time must be after start time', 'Sluttiden maste vara efter starttiden') },
        { status: 400 }
      )
    }

    const samples = sanitizeSamples(data.samples)
    const analysis = buildQuickErgSessionAnalysis(samples)

    if (analysis.summary.durationSec < 5) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Session is too short to save', 'Passet ar for kort for att sparas') },
        { status: 400 }
      )
    }

    const machineType = data.machineType as QuickErgMachineType
    const source = (data.source ?? 'BLUETOOTH_FTMS') as QuickErgSource
    const dedupeKey = buildQuickErgDedupeKey({
      clientId: resolved.clientId,
      machineType,
      startedAt,
      summary: analysis.summary,
    })

    const existing = await prisma.quickErgSession.findUnique({
      where: { dedupeKey },
      select: { id: true, trainingLoadId: true, startedAt: true },
    })

    if (existing) {
      await invalidateUnifiedCalendarCacheForClient(resolved.clientId)
      await syncQuickErgCoachAlertsSafely({ sessionId: existing.id })
      await refreshWorkoutEvaluationsAround(resolved.clientId, existing.startedAt)

      return NextResponse.json({
        success: true,
        duplicate: true,
        data: existing,
      })
    }

    const trainingLoadValue = estimateQuickErgTrainingLoad(analysis.summary, data.rpe ?? undefined)
    const activityType = inferActivityType(machineType)

    const result = await prisma.$transaction(async (tx) => {
      const trainingLoad = await tx.trainingLoad.create({
        data: {
          clientId: resolved.clientId,
          date: dayDate(startedAt),
          source: 'WORKOUT',
          dailyLoad: trainingLoadValue,
          loadType: 'QUICK_ERG_TSS',
          duration: Math.round((analysis.summary.durationSec / 60) * 10) / 10,
          distance: analysis.summary.distanceMeters
            ? Math.round((analysis.summary.distanceMeters / 1000) * 100) / 100
            : undefined,
          avgHR: analysis.summary.avgHeartRate,
          maxHR: analysis.summary.maxHeartRate,
          intensity: mapRpeToIntensity(data.rpe ?? undefined),
          workoutType: activityType,
        },
      })

      const session = await tx.quickErgSession.create({
        data: {
          clientId: resolved.clientId,
          machineType,
          machineKind: data.machineKind ?? undefined,
          source,
          deviceName: data.deviceName ?? undefined,
          deviceId: data.deviceId ?? undefined,
          startedAt,
          completedAt,
          durationSec: analysis.summary.durationSec,
          distanceMeters: analysis.summary.distanceMeters,
          calories: analysis.summary.calories,
          avgPower: analysis.summary.avgPower,
          maxPower: analysis.summary.maxPower,
          normalizedPower: analysis.summary.normalizedPower,
          avgHeartRate: analysis.summary.avgHeartRate,
          maxHeartRate: analysis.summary.maxHeartRate,
          avgCadence: analysis.summary.avgCadence,
          maxCadence: analysis.summary.maxCadence,
          avgStrokeRate: analysis.summary.avgStrokeRate,
          maxStrokeRate: analysis.summary.maxStrokeRate,
          avgPace500m: analysis.summary.avgPace500m,
          rpe: data.rpe ?? undefined,
          notes: data.notes?.trim() || undefined,
          samples: analysis.samples as unknown as Prisma.InputJsonValue,
          summary: analysis.summary as unknown as Prisma.InputJsonValue,
          bestEfforts: analysis.bestEfforts as unknown as Prisma.InputJsonValue,
          detectedIntervals: analysis.detectedIntervals as unknown as Prisma.InputJsonValue,
          trainingLoadId: trainingLoad.id,
          dedupeKey,
        },
      })

      return { session, trainingLoad }
    })

    logger.info('Quick erg session saved', {
      clientId: resolved.clientId,
      sessionId: result.session.id,
      machineType,
      durationSec: analysis.summary.durationSec,
    })
    await invalidateUnifiedCalendarCacheForClient(resolved.clientId)
    await syncQuickErgCoachAlertsSafely({ sessionId: result.session.id })
    await refreshWorkoutEvaluationsAround(resolved.clientId, startedAt)

    return NextResponse.json({
      success: true,
      data: {
        id: result.session.id,
        trainingLoadId: result.trainingLoad.id,
        name: formatMachineName(machineType),
        summary: analysis.summary,
        bestEfforts: analysis.bestEfforts,
        detectedIntervals: analysis.detectedIntervals,
      },
    }, { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ success: false, error: t(locale, 'Session already saved', 'Passet ar redan sparat') }, { status: 409 })
    }

    logger.error('Failed to save quick erg session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to save quick erg session', 'Kunde inte spara ergpasset') },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehorig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, resolved.user.language)
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20', 10), 100)

    const sessions = await prisma.quickErgSession.findMany({
      where: { clientId: resolved.clientId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        machineType: true,
        deviceName: true,
        startedAt: true,
        completedAt: true,
        durationSec: true,
        distanceMeters: true,
        calories: true,
        avgPower: true,
        maxPower: true,
        avgHeartRate: true,
        maxHeartRate: true,
        avgCadence: true,
        avgStrokeRate: true,
        avgPace500m: true,
        rpe: true,
        notes: true,
      },
    })

    return NextResponse.json({ success: true, data: sessions })
  } catch (error) {
    logger.error('Failed to list quick erg sessions', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch quick erg sessions', 'Kunde inte hamta ergpass') },
      { status: 500 }
    )
  }
}
