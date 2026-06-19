import { NextRequest, NextResponse } from 'next/server'
import { subDays } from 'date-fns'

import { requireCoach } from '@/lib/auth-utils'
import { getRequestedBusinessScope } from '@/lib/auth/current-user'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import type { SegmentEvaluation, WorkoutFatigueSummary, WorkoutZoneSummary } from '@/lib/workout-evaluation'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function sumZones(summary: WorkoutZoneSummary | null | undefined): number {
  if (!summary) return 0
  return summary.zone4Seconds + summary.zone5Seconds
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length)
}

function asFatigue(value: unknown): WorkoutFatigueSummary | null {
  if (!value || typeof value !== 'object') return null
  return value as WorkoutFatigueSummary
}

function asZoneSummary(value: unknown): WorkoutZoneSummary | null {
  if (!value || typeof value !== 'object') return null
  return value as WorkoutZoneSummary
}

function asSegments(value: unknown): SegmentEvaluation[] {
  return Array.isArray(value) ? value as SegmentEvaluation[] : []
}

function fatigueRank(level?: WorkoutFatigueSummary['level']): number {
  if (level === 'VERY_HIGH') return 4
  if (level === 'HIGH') return 3
  if (level === 'MODERATE') return 2
  if (level === 'LOW') return 1
  return 0
}

export async function GET(request: NextRequest, context: RouteContext) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const { teamId } = await context.params
    const scope = getRequestedBusinessScope(request)

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Team not found', 'Laget hittades inte') },
        { status: 404 },
      )
    }

    const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days') ?? 7), 1), 30)
    const since = subDays(new Date(), days)
    const members = await prisma.client.findMany({
      where: { teamId },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
      },
    })
    const memberIds = members.map((member) => member.id)

    const [evaluations, metrics, loads] = await Promise.all([
      prisma.workoutEvaluation.findMany({
        where: {
          clientId: { in: memberIds },
          startedAt: { gte: since },
        },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          clientId: true,
          startedAt: true,
          summary: true,
          zoneSummary: true,
          fatigueSummary: true,
          segmentEvaluations: true,
          confidence: true,
        },
      }),
      prisma.dailyMetrics.findMany({
        where: {
          clientId: { in: memberIds },
          date: { gte: subDays(new Date(), 3) },
        },
        orderBy: { date: 'desc' },
        select: {
          clientId: true,
          date: true,
          readinessScore: true,
          sleepHours: true,
          hrvRMSSD: true,
          restingHR: true,
          stress: true,
        },
      }),
      prisma.trainingLoad.findMany({
        where: {
          clientId: { in: memberIds },
          date: { gte: since },
        },
        select: {
          clientId: true,
          dailyLoad: true,
          duration: true,
        },
      }),
    ])

    const latestEvaluationByClient = new Map<string, typeof evaluations[number]>()
    const weeklyIntensityByClient = new Map<string, number>()
    for (const evaluation of evaluations) {
      if (!latestEvaluationByClient.has(evaluation.clientId)) {
        latestEvaluationByClient.set(evaluation.clientId, evaluation)
      }
      const zoneSummary = asZoneSummary(evaluation.zoneSummary)
      weeklyIntensityByClient.set(
        evaluation.clientId,
        (weeklyIntensityByClient.get(evaluation.clientId) ?? 0) + sumZones(zoneSummary),
      )
    }

    const latestMetricByClient = new Map<string, typeof metrics[number]>()
    for (const metric of metrics) {
      if (!latestMetricByClient.has(metric.clientId)) {
        latestMetricByClient.set(metric.clientId, metric)
      }
    }

    const loadByClient = new Map<string, number>()
    for (const load of loads) {
      loadByClient.set(load.clientId, (loadByClient.get(load.clientId) ?? 0) + load.dailyLoad)
    }

    const loadValues = Array.from(loadByClient.values())
    const averageLoad = avg(loadValues) ?? 0

    const players = members.map((member) => {
      const latestEvaluation = latestEvaluationByClient.get(member.id)
      const fatigue = asFatigue(latestEvaluation?.fatigueSummary)
      const zoneSummary = asZoneSummary(latestEvaluation?.zoneSummary)
      const metric = latestMetricByClient.get(member.id)
      const highIntensitySeconds = weeklyIntensityByClient.get(member.id) ?? 0
      const load = loadByClient.get(member.id) ?? 0
      const segments = asSegments(latestEvaluation?.segmentEvaluations)
      const complianceScores = segments.map((segment) => segment.compliance.score).filter((score) => Number.isFinite(score))

      return {
        id: member.id,
        name: member.name,
        jerseyNumber: member.jerseyNumber,
        position: member.position,
        readinessScore: metric?.readinessScore ?? null,
        sleepHours: metric?.sleepHours ?? null,
        hrvRMSSD: metric?.hrvRMSSD ?? null,
        restingHR: metric?.restingHR ?? null,
        stress: metric?.stress ?? null,
        weeklyLoad: Math.round(load),
        highIntensityMinutes: Math.round(highIntensitySeconds / 60),
        loadSpike: averageLoad > 0 && load > averageLoad * 1.35,
        fatigueLevel: fatigue?.level ?? null,
        fatigueScore: fatigue?.score ?? null,
        latestWorkout: latestEvaluation ? {
          id: latestEvaluation.id,
          startedAt: latestEvaluation.startedAt,
          summary: latestEvaluation.summary,
          zoneSummary,
          confidence: latestEvaluation.confidence,
          z4z5Minutes: Math.round(sumZones(zoneSummary) / 60),
          avgRecoveryHrDrop: fatigue?.avgRecoveryHrDrop ?? null,
          powerDropPct: fatigue?.powerDropPct ?? null,
          paceDropPct: fatigue?.paceDropPct ?? null,
          complianceScore: avg(complianceScores),
        } : null,
      }
    })

    const readinessValues = players
      .map((player) => player.readinessScore)
      .filter((value): value is number => typeof value === 'number')
    const fatigueFlags = players.filter((player) => fatigueRank(player.fatigueLevel ?? undefined) >= 3)
    const recoveryOutliers = players.filter((player) =>
      (typeof player.readinessScore === 'number' && player.readinessScore < 45) ||
      (typeof player.sleepHours === 'number' && player.sleepHours < 6) ||
      (typeof player.stress === 'number' && player.stress > 70)
    )
    const loadSpikes = players.filter((player) => player.loadSpike)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          readinessAverage: avg(readinessValues),
          fatigueFlags: fatigueFlags.length,
          loadSpikes: loadSpikes.length,
          highIntensityMinutes: players.reduce((total, player) => total + player.highIntensityMinutes, 0),
        },
        needsAttention: [...fatigueFlags, ...recoveryOutliers, ...loadSpikes]
          .filter((player, index, all) => all.findIndex((item) => item.id === player.id) === index)
          .sort((a, b) =>
            fatigueRank(b.fatigueLevel ?? undefined) - fatigueRank(a.fatigueLevel ?? undefined) ||
            (b.weeklyLoad - a.weeklyLoad)
          )
          .slice(0, 10),
        players,
      },
    })
  } catch (error) {
    logger.error('Failed to load team monitoring rollup', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to load team monitoring', 'Kunde inte läsa lagmonitoring') },
      { status: 500 },
    )
  }
}
