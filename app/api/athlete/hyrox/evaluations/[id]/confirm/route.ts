import { NextRequest, NextResponse } from 'next/server'
import { Prisma, SportType } from '@prisma/client'
import { z } from 'zod'

import { summarizeHyroxPerformance } from '@/lib/hyrox/race-evaluation'
import type { SegmentEvaluation } from '@/lib/workout-evaluation/types'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{ id: string }>
}

const HYROX_PRIMARY_SOURCES = ['HYROX_RACE', 'HYROX_SIMULATION']

const confirmSchema = z.object({
  eventName: z.string().max(160).nullable().optional(),
  athleteNotes: z.string().max(2000).nullable().optional(),
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

function numberFrom(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function formattedTime(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes}:${secs.toString().padStart(2, '0')}`
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const parsed = confirmSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Invalid confirmation request', 'Ogiltig bekräftelse'),
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const evaluation = await prisma.workoutEvaluation.findFirst({
      where: {
        id,
        clientId: resolved.clientId,
        primarySource: { in: HYROX_PRIMARY_SOURCES },
      },
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        summary: true,
        segmentEvaluations: true,
        zoneSummary: true,
        fatigueSummary: true,
        primarySource: true,
      },
    })

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: t(locale, 'HYROX evaluation not found', 'HYROX-utvärderingen hittades inte') },
        { status: 404 },
      )
    }

    const summary = isRecord(evaluation.summary) ? { ...evaluation.summary } : {}
    const hyrox = isRecord(summary.hyrox) ? { ...summary.hyrox } : {}
    const segments = Array.isArray(evaluation.segmentEvaluations)
      ? evaluation.segmentEvaluations as unknown as SegmentEvaluation[]
      : []
    const performance = summarizeHyroxPerformance(segments)
    const raceType = hyrox.raceType === 'RACE' ? 'RACE' : 'SIMULATION'
    const eventType = raceType === 'RACE' ? 'HYROX_RACE' : 'HYROX_SIMULATION'
    const eventName = parsed.data.eventName || (typeof summary.name === 'string' ? summary.name : eventType)
    const avgHr = numberFrom(summary.avgHr)
    const maxHr = numberFrom(summary.maxHr)
    const totalTime = performance.hyroxTotalTime || numberFrom(summary.durationSec) || 0
    const division = typeof hyrox.division === 'string' ? hyrox.division : null

    const existingPerformance = await prisma.sportPerformance.findFirst({
      where: {
        clientId: resolved.clientId,
        sport: SportType.HYROX,
        eventType,
        eventDate: evaluation.startedAt,
      },
      select: { id: true },
    })

    const performanceData = {
      clientId: resolved.clientId,
      sport: SportType.HYROX,
      eventType,
      eventName,
      eventDate: evaluation.startedAt,
      timeSeconds: totalTime,
      timeFormatted: formattedTime(totalTime),
      distanceMeters: 8000,
      hyroxDivision: division,
      hyroxStations: toJson(performance.hyroxStations),
      hyroxRunSplits: toJson(performance.hyroxRunSplits),
      hyroxTotalTime: totalTime,
      avgHeartRate: avgHr ? Math.round(avgHr) : null,
      maxHeartRate: maxHr ? Math.round(maxHr) : null,
      athleteNotes: parsed.data.athleteNotes ?? null,
      isPR: false,
      usedForZones: false,
    }

    const sportPerformance = existingPerformance
      ? await prisma.sportPerformance.update({
          where: { id: existingPerformance.id },
          data: performanceData,
          select: { id: true },
        })
      : await prisma.sportPerformance.create({
          data: performanceData,
          select: { id: true },
        })

    const updatedSummary = {
      ...summary,
      name: eventName,
      durationSec: totalTime || summary.durationSec,
      hyrox: {
        ...hyrox,
        status: 'CONFIRMED',
        performance,
        sportPerformanceId: sportPerformance.id,
        confirmedAt: new Date().toISOString(),
      },
    }

    const updated = await prisma.workoutEvaluation.update({
      where: { id: evaluation.id },
      data: {
        summary: toJson(updatedSummary),
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
    logger.error('Failed to confirm HYROX evaluation', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to confirm HYROX result', 'Kunde inte bekräfta HYROX-resultatet') },
      { status: 500 },
    )
  }
}
