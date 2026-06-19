import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { refreshWorkoutEvaluationsAround } from '@/lib/workout-evaluation'

const SOURCES = [
  'NATIVE_CAPTURE',
  'CONCEPT2_PM5_BLUETOOTH',
  'WATTBIKE_BLUETOOTH',
  'HR_BELT_BLUETOOTH',
  'APP_GPS',
] as const

const deviceSchema = z.object({
  id: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
  type: z.string().max(80).optional(),
  manufacturer: z.string().max(120).optional(),
}).passthrough()

const sampleSchema = z.object({
  timeSec: z.number().int().min(0).max(172_800).optional(),
  elapsedSec: z.number().int().min(0).max(172_800).optional(),
  timestamp: z.string().datetime().optional(),
  heartRate: z.number().finite().min(0).max(255).optional(),
  power: z.number().finite().min(0).max(3000).optional(),
  paceSecPerKm: z.number().finite().min(1).max(7200).optional(),
  paceSecPer500m: z.number().finite().min(1).max(3600).optional(),
  speedMps: z.number().finite().min(0).max(40).optional(),
  speed: z.number().finite().min(0).max(40).optional(),
  cadence: z.number().finite().min(0).max(300).optional(),
  strokeRate: z.number().finite().min(0).max(100).optional(),
  distanceMeters: z.number().finite().min(0).optional(),
  calories: z.number().finite().min(0).optional(),
}).passthrough()

const captureSchema = z.object({
  source: z.enum(SOURCES).optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  devices: z.array(deviceSchema).default([]),
  samples: z.array(sampleSchema).min(1).max(86_400),
  summary: z.record(z.unknown()).nullable().optional(),
  plannedWorkoutId: z.string().max(120).nullable().optional(),
  calendarEventId: z.string().max(120).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function buildDedupeKey(input: {
  clientId: string
  source: string
  startedAt: Date
  completedAt: Date
  sampleCount: number
}): string {
  return [
    input.clientId,
    input.source,
    input.startedAt.toISOString(),
    input.completedAt.toISOString(),
    input.sampleCount,
  ].join(':')
}

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 401 },
      )
    }

    locale = resolveRequestLocale(request, resolved.user.language)
    const body = await request.json()
    const parsed = captureSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid sensor capture', 'Ogiltig sensorinspelning'),
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const data = parsed.data
    const startedAt = new Date(data.startedAt)
    const completedAt = new Date(data.completedAt)

    if (completedAt <= startedAt) {
      return NextResponse.json(
        { success: false, error: t(locale, 'End time must be after start time', 'Sluttiden måste vara efter starttiden') },
        { status: 400 },
      )
    }

    const source = data.source ?? 'NATIVE_CAPTURE'
    const dedupeKey = buildDedupeKey({
      clientId: resolved.clientId,
      source,
      startedAt,
      completedAt,
      sampleCount: data.samples.length,
    })

    const existing = await prisma.workoutSensorCapture.findUnique({
      where: { dedupeKey },
      select: { id: true, workoutEvaluationId: true },
    })

    if (existing) {
      await refreshWorkoutEvaluationsAround(resolved.clientId, startedAt)
      return NextResponse.json({
        success: true,
        duplicate: true,
        data: existing,
      })
    }

    const capture = await prisma.workoutSensorCapture.create({
      data: {
        clientId: resolved.clientId,
        source,
        startedAt,
        completedAt,
        devices: toInputJson(data.devices),
        samples: toInputJson(data.samples),
        summary: data.summary ? toInputJson(data.summary) : Prisma.DbNull,
        plannedWorkoutId: data.plannedWorkoutId ?? null,
        calendarEventId: data.calendarEventId ?? null,
        rpe: data.rpe ?? null,
        notes: data.notes ?? null,
        dedupeKey,
      },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        source: true,
      },
    })

    await refreshWorkoutEvaluationsAround(resolved.clientId, startedAt)

    return NextResponse.json({
      success: true,
      data: capture,
    })
  } catch (error) {
    logger.error('Failed to save sensor capture', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to save sensor capture', 'Kunde inte spara sensorinspelningen') },
      { status: 500 },
    )
  }
}
