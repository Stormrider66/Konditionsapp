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
import { buildRepeatedSprintProfile, positiveSplit, speedKmh } from '@/lib/hockey/ice-speed'

interface HockeySummary {
  id: string
  testDate: string
  sourceType: string
  notes: string | null
  season: string
  ageAtTest: number | null
  developmentLevel: string
  teamName: string | null
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

interface HockeyPathwaySeason {
  season: string
  level: string
  testCount: number
  firstDate: string
  lastDate: string
  ageRange: string | null
  teamNames: string[]
  startMetrics: Record<string, number | null>
  endMetrics: Record<string, number | null>
  changes: Record<string, number | null>
}

interface HockeyPathwayMilestone {
  id: string
  date: string
  label: string
  detail: string
  tone: 'info' | 'positive'
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

const PATHWAY_MILESTONE_LABELS: Record<string, string> = {
  muscleLabWkg: 'power W/kg',
  sprint10m: '10m ice sprint',
  sprint30m: '30m ice sprint',
  endurance7x40AverageKmh: '7x40 average speed',
  backSquat1RM: 'back squat',
  powerClean1RM: 'power clean',
}

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

function seasonLabel(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const startYear = month >= 5 ? year : year - 1
  return `${startYear}/${String(startYear + 1).slice(-2)}`
}

function ageAtDate(birthDate: Date | null | undefined, date: Date): number | null {
  if (!birthDate) return null
  const years = date.getFullYear() - birthDate.getFullYear()
  const beforeBirthday = date.getMonth() < birthDate.getMonth()
    || (date.getMonth() === birthDate.getMonth() && date.getDate() < birthDate.getDate())
  return years - (beforeBirthday ? 1 : 0)
}

function developmentLevel(age: number | null, teamName?: string | null): string {
  const normalizedTeam = (teamName ?? '').toLowerCase()
  if (/(a-?team|a-lag|senior|herr|dam|shl|allsvenskan)/.test(normalizedTeam)) return 'A-team'
  if (/j20|u20/.test(normalizedTeam)) return 'J20'
  if (/j18|u18/.test(normalizedTeam)) return 'J18'
  if (age == null) return 'Unknown'
  if (age <= 17) return 'J18'
  if (age <= 19) return 'J20'
  return 'A-team'
}

function improvementDeltaValue(key: string, latest: number | null, previous: number | null): number | null {
  if (latest == null || previous == null) return null
  const lowerIsBetter = LOWER_IS_BETTER.has(key)
  return round(lowerIsBetter ? previous - latest : latest - previous, 2)
}

function toSummary(test: Awaited<ReturnType<typeof loadTests>>[number], birthDate: Date | null): HockeySummary {
  const beepScore = test.beepTestLevel
    ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
    : null
  const enduranceValues = Array.isArray(test.endurance7x40)
    ? test.endurance7x40.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : []
  const repeatedSprint = buildRepeatedSprintProfile(enduranceValues)
  const endurance7x40Best = repeatedSprint.bestTimeS
  const sprint10to20Split = positiveSplit(test.sprint20m, test.sprint10m)
  const sprint20to30Split = positiveSplit(test.sprint30m, test.sprint20m)
  const age = ageAtDate(birthDate, test.testDate)

  return {
    id: test.id,
    testDate: test.testDate.toISOString(),
    sourceType: test.sourceType,
    notes: test.notes,
    season: seasonLabel(test.testDate),
    ageAtTest: age,
    developmentLevel: developmentLevel(age, test.team?.name),
    teamName: test.team?.name ?? null,
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
      endurance7x40Average: repeatedSprint.averageTimeS,
      endurance7x40AverageKmh: repeatedSprint.averageSpeedKmh,
      endurance7x40Total: repeatedSprint.totalTimeS,
      endurance7x40FirstToLastDrop: repeatedSprint.firstToLastDropS,
      endurance7x40FirstToLastDropPct: repeatedSprint.firstToLastDropPct,
      endurance7x40Resistance: repeatedSprint.fatigueResistancePct,
      endurance7x40DecrementPct: repeatedSprint.sprintDecrementPct,
      enduranceFatigueDrop: repeatedSprint.fatigueDropPct,
    },
  }
}

function buildPathway(history: HockeySummary[]) {
  const chronological = [...history].sort((a, b) => a.testDate.localeCompare(b.testDate))
  const bySeason = new Map<string, HockeySummary[]>()
  for (const test of chronological) {
    bySeason.set(test.season, [...(bySeason.get(test.season) ?? []), test])
  }

  const seasons: HockeyPathwaySeason[] = Array.from(bySeason.entries()).map(([season, tests]) => {
    const first = tests[0]
    const last = tests[tests.length - 1]
    const ages = tests.map((test) => test.ageAtTest).filter((age): age is number => age != null)
    const teamNames = Array.from(new Set(tests.map((test) => test.teamName).filter((team): team is string => Boolean(team))))
    const levels = tests.map((test) => test.developmentLevel).filter((level) => level !== 'Unknown')
    const level = levels[levels.length - 1] ?? 'Unknown'
    const metricKeys = new Set([...Object.keys(first.metrics), ...Object.keys(last.metrics)])
    const changes: Record<string, number | null> = {}
    for (const key of metricKeys) {
      changes[key] = improvementDeltaValue(key, last.metrics[key], first.metrics[key])
    }

    const minAge = ages.length ? Math.min(...ages) : null
    const maxAge = ages.length ? Math.max(...ages) : null

    return {
      season,
      level,
      testCount: tests.length,
      firstDate: first.testDate,
      lastDate: last.testDate,
      ageRange: minAge == null || maxAge == null ? null : minAge === maxAge ? `${minAge}` : `${minAge}-${maxAge}`,
      teamNames,
      startMetrics: first.metrics,
      endMetrics: last.metrics,
      changes,
    }
  })

  const milestones: HockeyPathwayMilestone[] = []
  for (const season of seasons) {
    const previous = seasons[seasons.indexOf(season) - 1]
    if (!previous || previous.level !== season.level) {
      milestones.push({
        id: `level-${season.season}`,
        date: season.firstDate,
        label: season.level === 'Unknown' ? 'New season' : `Entered ${season.level}`,
        detail: `${season.season}${season.teamNames.length ? ` · ${season.teamNames.join(', ')}` : ''}`,
        tone: 'info',
      })
    }
  }

  for (const [key, best] of Object.entries(buildBests(history))) {
    const label = PATHWAY_MILESTONE_LABELS[key]
    if (!best || !label) continue
    milestones.push({
      id: `best-${key}`,
      date: best.testDate,
      label: `Best ${label}`,
      detail: `${best.value}`,
      tone: 'positive',
    })
  }

  return {
    seasons,
    milestones: milestones.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
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
    take: 80,
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
      team: { select: { name: true } },
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

    const [tests, client] = await Promise.all([
      loadTests(clientId),
      prisma.client.findUnique({
        where: { id: clientId },
        select: { birthDate: true },
      }),
    ])
    const history = tests.map((test) => toSummary(test, client?.birthDate ?? null))
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
        pathway: buildPathway(history),
        count: history.length,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
