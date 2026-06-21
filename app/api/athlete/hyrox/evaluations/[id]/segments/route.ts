import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import {
  buildHyroxFatigueSummary,
  normalizeHyroxSegmentsForReview,
  summarizeHyroxPerformance,
} from '@/lib/hyrox/race-evaluation'
import type { SegmentEvaluation, WorkoutZoneSummary } from '@/lib/workout-evaluation/types'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{ id: string }>
}

const HYROX_PRIMARY_SOURCES = ['HYROX_RACE', 'HYROX_SIMULATION']

const zoneSecondsSchema = z.object({
  1: z.number().min(0).optional(),
  2: z.number().min(0).optional(),
  3: z.number().min(0).optional(),
  4: z.number().min(0).optional(),
  5: z.number().min(0).optional(),
}).partial()

const segmentSchema = z.object({
  segmentIndex: z.number().int().positive().optional(),
  label: z.string().min(1).max(120),
  planned: z.record(z.unknown()).default({}),
  actual: z.object({
    durationSec: z.number().min(0).optional(),
    avgHr: z.number().min(0).max(255).optional(),
    maxHr: z.number().min(0).max(255).optional(),
    avgHrPercentMax: z.number().min(0).max(250).optional(),
    maxHrPercentMax: z.number().min(0).max(250).optional(),
    zoneSeconds: zoneSecondsSchema.optional(),
    avgPaceSecPerKm: z.number().min(0).optional(),
    calories: z.number().min(0).optional(),
  }).passthrough().default({}),
  compliance: z.record(z.unknown()).optional(),
}).passthrough()

const updateSegmentsSchema = z.object({
  segments: z.array(segmentSchema).min(1).max(40),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function updateSummaryWithSegments(summary: unknown, segments: SegmentEvaluation[]) {
  const base = isRecord(summary) ? { ...summary } : {}
  const hyrox = isRecord(base.hyrox) ? { ...base.hyrox } : {}
  const performance = summarizeHyroxPerformance(segments)
  const expectedLapCount = typeof hyrox.expectedLapCount === 'number' ? hyrox.expectedLapCount : segments.length
  const actualLapCount = segments.length

  return {
    ...base,
    durationSec: performance.hyroxTotalTime || base.durationSec,
    hyrox: {
      ...hyrox,
      status: 'DRAFT',
      actualLapCount,
      lapCountStatus: actualLapCount === expectedLapCount ? 'MATCH' : actualLapCount < expectedLapCount ? 'MISSING_LAPS' : 'EXTRA_LAPS',
      performance,
    },
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params
    const parsed = updateSegmentsSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid HYROX segments', 'Ogiltiga HYROX-segment'),
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const existing = await prisma.workoutEvaluation.findFirst({
      where: {
        id,
        clientId: resolved.clientId,
        primarySource: { in: HYROX_PRIMARY_SOURCES },
      },
      select: {
        id: true,
        summary: true,
        zoneSummary: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: t(locale, 'HYROX evaluation not found', 'HYROX-utvärderingen hittades inte') },
        { status: 404 },
      )
    }

    const segments = normalizeHyroxSegmentsForReview(parsed.data.segments as unknown as SegmentEvaluation[])
    const summary = updateSummaryWithSegments(existing.summary, segments)
    const zoneSummary = existing.zoneSummary as unknown as WorkoutZoneSummary
    const fatigueSummary = buildHyroxFatigueSummary(segments, zoneSummary)

    const updated = await prisma.workoutEvaluation.update({
      where: { id },
      data: {
        summary: toJson(summary),
        segmentEvaluations: toJson(segments),
        zoneSummary: toJson(zoneSummary),
        fatigueSummary: toJson(fatigueSummary),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        summary: true,
        segmentEvaluations: true,
        zoneSummary: true,
        fatigueSummary: true,
        confidence: true,
        primarySource: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Failed to update HYROX evaluation segments', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to update HYROX segments', 'Kunde inte uppdatera HYROX-segment') },
      { status: 500 },
    )
  }
}
