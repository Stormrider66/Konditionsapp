/**
 * Athlete hockey test summary
 *
 * GET /api/clients/[id]/hockey-tests/summary
 *
 * Read-only profile endpoint for latest hockey physical metrics and
 * compact history. Uses normal client access checks, so it works from
 * both coach and athlete profile contexts.
 */

import { NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessClient } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { positiveSplit, speedKmh } from '@/lib/hockey/ice-speed'

interface HockeySummary {
  id: string
  testDate: string
  sourceType: string
  notes: string | null
  metrics: Record<string, number | null>
}

interface HockeyTrend {
  key: string
  delta: number
  percentChange: number | null
  direction: 'up' | 'down'
  isImprovement: boolean
}

interface HockeyBest {
  key: string
  value: number
  testDate: string
  testId: string
}

interface HockeyFlag {
  key: string
  severity: 'info' | 'warning'
  label: string
}

const LOWER_IS_BETTER = new Set([
  'sprint5m',
  'sprint10m',
  'sprint20m',
  'sprint30m',
  'sprint20mFly',
  'sprint30mFly',
  'sprint10to20Split',
  'sprint20to30Split',
  'agilityBest',
  'enduranceFatigueDrop',
])

function numberFromJson(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function bestOf(values: Array<number | null | undefined>, lowerIsBetter = false): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (valid.length === 0) return null
  return lowerIsBetter ? Math.min(...valid) : Math.max(...valid)
}

function round(value: number | null, decimals = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function fatigueDrop(value: unknown): number | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const times = value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
  if (times.length < 2) return null
  const first = times[0]
  const worst = Math.max(...times)
  if (first <= 0) return null
  return round(((worst - first) / first) * 100, 1)
}

function toSummary(test: Awaited<ReturnType<typeof loadTests>>[number]): HockeySummary {
  const beepScore = test.beepTestLevel
    ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
    : null
  const enduranceValues = Array.isArray(test.endurance7x40)
    ? test.endurance7x40.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : []
  const endurance7x40Best = enduranceValues.length > 0 ? Math.min(...enduranceValues) : null
  const sprint10to20Split = positiveSplit(test.sprint20m, test.sprint10m)
  const sprint20to30Split = positiveSplit(test.sprint30m, test.sprint20m)

  return {
    id: test.id,
    testDate: test.testDate.toISOString(),
    sourceType: test.sourceType,
    notes: test.notes,
    metrics: {
      muscleLabWkg: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 1),
      muscleLabPower: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePower'), 0),
      backSquat1RM: test.backSquat1RM,
      powerClean1RM: test.powerClean1RM,
      benchPress1RM: test.benchPress1RM,
      pullUp1RM: test.pullUp1RM,
      gripMax: bestOf([test.gripStrengthLeft, test.gripStrengthRight]),
      standingLongJump: test.standingLongJump,
      threeJumpBest: bestOf([test.threeJumpLeft, test.threeJumpRight]),
      beepScore: round(beepScore, 1),
      sprint5m: test.sprint5m,
      sprint10m: test.sprint10m,
      sprint20m: test.sprint20m,
      sprint30m: test.sprint30m,
      sprint20mFly: test.sprint20mFly,
      sprint30mFly: test.sprint30mFly,
      sprint0to10Kmh: speedKmh(10, test.sprint10m),
      sprint10to20Split,
      sprint10to20Kmh: speedKmh(10, sprint10to20Split),
      sprint20to30Split,
      sprint20to30Kmh: speedKmh(10, sprint20to30Split),
      sprint0to30Kmh: speedKmh(30, test.sprint30m),
      agilityBest: bestOf([test.agility505Left, test.agility505Right], true),
      endurance7x40Best,
      endurance7x40BestKmh: speedKmh(40, endurance7x40Best),
      enduranceFatigueDrop: fatigueDrop(test.endurance7x40),
    },
  }
}

function buildTrends(latest: HockeySummary | null, previous: HockeySummary | null): HockeyTrend[] {
  if (!latest || !previous) return []

  return Object.entries(latest.metrics)
    .map(([key, current]) => {
      const oldValue = previous.metrics[key]
      if (current == null || oldValue == null || current === oldValue) return null

      const delta = round(current - oldValue, 2)
      if (delta == null) return null

      const percentChange = oldValue !== 0
        ? round((delta / oldValue) * 100, 1)
        : null
      const direction = delta > 0 ? 'up' : 'down'
      const lowerIsBetter = LOWER_IS_BETTER.has(key)

      return {
        key,
        delta,
        percentChange,
        direction,
        isImprovement: lowerIsBetter ? delta < 0 : delta > 0,
      }
    })
    .filter((trend): trend is HockeyTrend => trend != null)
}

function buildBests(history: HockeySummary[]): Record<string, HockeyBest | null> {
  const metricKeys = new Set(history.flatMap((test) => Object.keys(test.metrics)))
  const bests: Record<string, HockeyBest | null> = {}

  for (const key of metricKeys) {
    const lowerIsBetter = LOWER_IS_BETTER.has(key)
    const candidates = history
      .map((test) => ({ test, value: test.metrics[key] }))
      .filter((row): row is { test: HockeySummary; value: number } => row.value != null)
      .sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value)

    bests[key] = candidates[0]
      ? {
          key,
          value: candidates[0].value,
          testDate: candidates[0].test.testDate,
          testId: candidates[0].test.id,
        }
      : null
  }

  return bests
}

function buildFlags(latest: HockeySummary | null, trends: HockeyTrend[]): HockeyFlag[] {
  if (!latest) return []
  const flags: HockeyFlag[] = []

  const trendByKey = new Map(trends.map((trend) => [trend.key, trend]))
  const powerTrend = trendByKey.get('muscleLabWkg')
  const sprintTrend = trendByKey.get('sprint10m')
  const agilityTrend = trendByKey.get('agilityBest')
  const fatigueDrop = latest.metrics.enduranceFatigueDrop

  if (powerTrend && !powerTrend.isImprovement && Math.abs(powerTrend.percentChange ?? 0) >= 3) {
    flags.push({
      key: 'muscleLabWkg',
      severity: 'warning',
      label: `MuscleLab power ned ${Math.abs(powerTrend.percentChange ?? 0).toFixed(1)}% sedan föregående test`,
    })
  }

  if (sprintTrend && !sprintTrend.isImprovement && Math.abs(sprintTrend.delta) >= 0.05) {
    flags.push({
      key: 'sprint10m',
      severity: 'warning',
      label: `10m sprint långsammare med ${Math.abs(sprintTrend.delta).toFixed(2)} s`,
    })
  }

  if (agilityTrend && !agilityTrend.isImprovement && Math.abs(agilityTrend.delta) >= 0.1) {
    flags.push({
      key: 'agilityBest',
      severity: 'warning',
      label: `5-10-5 långsammare med ${Math.abs(agilityTrend.delta).toFixed(2)} s`,
    })
  }

  if (fatigueDrop != null && fatigueDrop >= 8) {
    flags.push({
      key: 'enduranceFatigueDrop',
      severity: 'warning',
      label: `7x40 drop ${fatigueDrop.toFixed(1)}%, följ återhämtning och sprintuthållighet`,
    })
  }

  if (flags.length === 0 && trends.some((trend) => trend.isImprovement)) {
    flags.push({
      key: 'progress',
      severity: 'info',
      label: 'Positiv testtrend jämfört med föregående hockeytest',
    })
  }

  return flags.slice(0, 4)
}

async function loadTests(clientId: string) {
  return prisma.hockeyPhysicalTest.findMany({
    where: { clientId },
    orderBy: { testDate: 'desc' },
    take: 12,
    select: {
      id: true,
      testDate: true,
      sourceType: true,
      notes: true,
      agility505Left: true,
      agility505Right: true,
      sprint5m: true,
      sprint10m: true,
      sprint20m: true,
      sprint30m: true,
      sprint20mFly: true,
      sprint30mFly: true,
      endurance7x40: true,
      gripStrengthLeft: true,
      gripStrengthRight: true,
      standingLongJump: true,
      threeJumpLeft: true,
      threeJumpRight: true,
      beepTestLevel: true,
      beepTestShuttle: true,
      backSquat1RM: true,
      powerClean1RM: true,
      benchPress1RM: true,
      pullUp1RM: true,
      muscleLabMaxima: true,
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: clientId } = await params
    const hasAccess = await canAccessClient(user.id, clientId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tests = await loadTests(clientId)
    const history = tests.map(toSummary)
    const latest = history[0] ?? null
    const previous = history[1] ?? null
    const trends = buildTrends(latest, previous)
    const bests = buildBests(history)

    return NextResponse.json({
      success: true,
      data: {
        latest,
        previous,
        bests,
        trends,
        flags: buildFlags(latest, trends),
        history,
        count: history.length,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
