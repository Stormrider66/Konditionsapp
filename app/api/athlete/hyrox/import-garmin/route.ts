import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import {
  buildHyroxEvaluationPayload,
  type HyroxRaceType,
} from '@/lib/hyrox/race-evaluation'
import { getAthleteZones } from '@/lib/integrations/zone-distribution-service'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const DEFAULT_MAX_HR = 185

const importSchema = z.object({
  garminActivityId: z.string().min(1),
  roxzoneEnabled: z.boolean().default(false),
  raceType: z.enum(['RACE', 'SIMULATION']).default('SIMULATION'),
  division: z.string().max(80).nullable().optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
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
    const parsed = importSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid HYROX import request', 'Ogiltig HYROX-import'),
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const data = parsed.data
    const activity = await prisma.garminActivity.findFirst({
      where: {
        id: data.garminActivityId,
        clientId: resolved.clientId,
      },
    })

    if (!activity) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Garmin activity not found', 'Garmin-passet hittades inte') },
        { status: 404 },
      )
    }

    const athleteZones = await getAthleteZones(resolved.clientId)
    const payload = buildHyroxEvaluationPayload({
      activity: {
        ...activity,
        garminActivityId: activity.garminActivityId.toString(),
      },
      roxzoneEnabled: data.roxzoneEnabled,
      raceType: data.raceType as HyroxRaceType,
      division: data.division ?? null,
      maxHr: athleteZones?.maxHR ?? DEFAULT_MAX_HR,
      zones: athleteZones?.zones ?? [],
    })
    const primarySource = data.raceType === 'RACE' ? 'HYROX_RACE' : 'HYROX_SIMULATION'
    const dedupeKey = `${resolved.clientId}:hyrox:${activity.id}`

    const evaluation = await prisma.workoutEvaluation.upsert({
      where: { dedupeKey },
      update: {
        startedAt: payload.startedAt,
        completedAt: payload.completedAt,
        sourceLinks: toJson([
          {
            source: 'GARMIN',
            id: activity.id,
            label: activity.name ?? 'Garmin HYROX activity',
            confidence: activity.laps ? 'MEDIUM' : 'LOW',
            startedAt: activity.startDate.toISOString(),
            completedAt: payload.completedAt.toISOString(),
          },
        ]),
        summary: toJson(payload.summary),
        timelinePreview: toJson(payload.timelinePreview),
        segmentEvaluations: toJson(payload.segmentEvaluations),
        zoneSummary: toJson(payload.zoneSummary),
        fatigueSummary: toJson(payload.fatigueSummary),
        readinessContext: Prisma.DbNull,
        confidence: activity.hrStreamFetched ? 'HIGH' : 'MEDIUM',
        primarySource,
        updatedAt: new Date(),
      },
      create: {
        clientId: resolved.clientId,
        startedAt: payload.startedAt,
        completedAt: payload.completedAt,
        dedupeKey,
        sourceLinks: toJson([
          {
            source: 'GARMIN',
            id: activity.id,
            label: activity.name ?? 'Garmin HYROX activity',
            confidence: activity.laps ? 'MEDIUM' : 'LOW',
            startedAt: activity.startDate.toISOString(),
            completedAt: payload.completedAt.toISOString(),
          },
        ]),
        summary: toJson(payload.summary),
        timelinePreview: toJson(payload.timelinePreview),
        segmentEvaluations: toJson(payload.segmentEvaluations),
        zoneSummary: toJson(payload.zoneSummary),
        fatigueSummary: toJson(payload.fatigueSummary),
        readinessContext: Prisma.DbNull,
        confidence: activity.hrStreamFetched ? 'HIGH' : 'MEDIUM',
        primarySource,
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
      data: evaluation,
    })
  } catch (error) {
    logger.error('Failed to import HYROX Garmin activity', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to import Garmin activity', 'Kunde inte importera Garmin-passet') },
      { status: 500 },
    )
  }
}
