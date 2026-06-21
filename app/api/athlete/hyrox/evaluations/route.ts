import { NextRequest, NextResponse } from 'next/server'

import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const HYROX_PRIMARY_SOURCES = ['HYROX_RACE', 'HYROX_SIMULATION']

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export async function GET(request: NextRequest) {
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
    const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days') ?? 90), 7), 365)
    const startDate = daysAgo(days)

    const [evaluations, garminActivities] = await Promise.all([
      prisma.workoutEvaluation.findMany({
        where: {
          clientId: resolved.clientId,
          primarySource: { in: HYROX_PRIMARY_SOURCES },
          startedAt: { gte: startDate },
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          sourceLinks: true,
          summary: true,
          segmentEvaluations: true,
          zoneSummary: true,
          fatigueSummary: true,
          confidence: true,
          primarySource: true,
          updatedAt: true,
        },
      }),
      prisma.garminActivity.findMany({
        where: {
          clientId: resolved.clientId,
          startDate: { gte: startDate },
        },
        orderBy: { startDate: 'desc' },
        take: 30,
        select: {
          id: true,
          garminActivityId: true,
          name: true,
          type: true,
          mappedType: true,
          startDate: true,
          duration: true,
          elapsedTime: true,
          distance: true,
          calories: true,
          averageHeartrate: true,
          maxHeartrate: true,
          deviceName: true,
          laps: true,
          hrStreamFetched: true,
        },
      }),
    ])

    const importedGarminIds = new Set(
      evaluations
        .map((evaluation) => {
          const summary = evaluation.summary as { hyrox?: { sourceGarminActivityId?: string } } | null
          return summary?.hyrox?.sourceGarminActivityId
        })
        .filter((id): id is string => Boolean(id))
    )

    return NextResponse.json({
      success: true,
      data: {
        evaluations,
        garminCandidates: garminActivities.map((activity) => ({
          id: activity.id,
          garminActivityId: activity.garminActivityId.toString(),
          name: activity.name,
          type: activity.type,
          mappedType: activity.mappedType,
          startDate: activity.startDate,
          duration: activity.duration,
          elapsedTime: activity.elapsedTime,
          distance: activity.distance,
          calories: activity.calories,
          averageHeartrate: activity.averageHeartrate,
          maxHeartrate: activity.maxHeartrate,
          deviceName: activity.deviceName,
          lapCount: asArray(activity.laps).length,
          hasHrStream: activity.hrStreamFetched,
          alreadyImported: importedGarminIds.has(activity.id),
        })),
      },
    })
  } catch (error) {
    logger.error('Failed to load HYROX evaluations', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load HYROX evaluations', 'Kunde inte läsa HYROX-utvärderingar') },
      { status: 500 },
    )
  }
}
