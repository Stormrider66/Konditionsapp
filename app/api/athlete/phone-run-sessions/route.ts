import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import {
  buildPhoneRunDedupeKey,
  buildPhoneRunSessionAnalysis,
  estimatePhoneRunTrainingLoad,
  mapRunRpeToIntensity,
  type PhoneRunRawSample,
} from '@/lib/outdoor-run/session-summary'
import { prisma } from '@/lib/prisma'

const SOURCES = ['ANDROID_CHROME_PWA'] as const

const sampleSchema = z.object({
  elapsedSec: z.number().int().min(0).max(86_400),
  timestamp: z.string().datetime().optional(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(10_000).optional(),
  altitude: z.number().finite().optional(),
  speed: z.number().finite().min(0).max(25).optional(),
  heading: z.number().finite().min(0).max(360).optional(),
  heartRate: z.number().finite().min(0).max(250).optional(),
})

const createPhoneRunSessionSchema = z.object({
  source: z.enum(SOURCES).optional(),
  deviceName: z.string().max(160).nullable().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  samples: z.array(sampleSchema).min(2).max(43_200),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function dayDate(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
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
    const parsed = createPhoneRunSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid run data', 'Ogiltig lopdata'),
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

    const analysis = buildPhoneRunSessionAnalysis(data.samples as PhoneRunRawSample[])

    if (analysis.summary.durationSec < 10 || analysis.summary.distanceMeters < 20) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Run is too short to save', 'Lopningen ar for kort for att sparas') },
        { status: 400 }
      )
    }

    const dedupeKey = buildPhoneRunDedupeKey({
      clientId: resolved.clientId,
      startedAt,
      summary: analysis.summary,
    })

    const existing = await prisma.phoneRunSession.findUnique({
      where: { dedupeKey },
      select: { id: true, trainingLoadId: true },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        data: existing,
      })
    }

    const trainingLoadValue = estimatePhoneRunTrainingLoad(analysis.summary, data.rpe ?? undefined)

    const result = await prisma.$transaction(async (tx) => {
      const trainingLoad = await tx.trainingLoad.create({
        data: {
          clientId: resolved.clientId,
          date: dayDate(startedAt),
          source: 'WORKOUT',
          dailyLoad: trainingLoadValue,
          loadType: 'PHONE_RUN_TSS',
          duration: Math.round((analysis.summary.durationSec / 60) * 10) / 10,
          distance: Math.round((analysis.summary.distanceMeters / 1000) * 100) / 100,
          avgHR: analysis.summary.avgHeartRate,
          maxHR: analysis.summary.maxHeartRate,
          avgPace: analysis.summary.avgPaceSecPerKm,
          intensity: mapRunRpeToIntensity(data.rpe ?? undefined),
          workoutType: 'RUNNING',
        },
      })

      const session = await tx.phoneRunSession.create({
        data: {
          clientId: resolved.clientId,
          source: data.source ?? 'ANDROID_CHROME_PWA',
          deviceName: data.deviceName ?? undefined,
          startedAt,
          completedAt,
          durationSec: analysis.summary.durationSec,
          movingDurationSec: analysis.summary.movingDurationSec,
          distanceMeters: analysis.summary.distanceMeters,
          avgPaceSecPerKm: analysis.summary.avgPaceSecPerKm,
          avgSpeedMps: analysis.summary.avgSpeedMps,
          maxSpeedMps: analysis.summary.maxSpeedMps,
          elevationGainMeters: analysis.summary.elevationGainMeters,
          avgHeartRate: analysis.summary.avgHeartRate,
          maxHeartRate: analysis.summary.maxHeartRate,
          routePolyline: analysis.routePolyline,
          samples: toInputJson(analysis.samples),
          summary: toInputJson(analysis.summary),
          splits: toInputJson(analysis.splits),
          rpe: data.rpe ?? undefined,
          notes: data.notes?.trim() || undefined,
          trainingLoadId: trainingLoad.id,
          dedupeKey,
        },
      })

      return { session, trainingLoad }
    })

    logger.info('Phone run session saved', {
      clientId: resolved.clientId,
      sessionId: result.session.id,
      durationSec: analysis.summary.durationSec,
      distanceMeters: analysis.summary.distanceMeters,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.session.id,
        trainingLoadId: result.trainingLoad.id,
        summary: analysis.summary,
        splits: analysis.splits,
      },
    }, { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ success: false, error: t(locale, 'Run already saved', 'Lopningen ar redan sparad') }, { status: 409 })
    }

    logger.error('Failed to save phone run session', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to save run', 'Kunde inte spara lopningen') },
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
    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)))

    const sessions = await prisma.phoneRunSession.findMany({
      where: { clientId: resolved.clientId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: sessions })
  } catch (error) {
    logger.error('Failed to list phone run sessions', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load runs', 'Kunde inte hamta lopningar') },
      { status: 500 }
    )
  }
}
