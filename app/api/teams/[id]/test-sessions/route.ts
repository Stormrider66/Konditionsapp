/**
 * Team Test Sessions API
 *
 * GET /api/teams/[id]/test-sessions
 *
 * Synthesises "test sessions" by grouping the team's
 * OneRepMaxHistory entries by calendar date. Each session
 * summarises:
 *   - date
 *   - distinct athletes that logged a PR
 *   - distinct exercises tested
 *   - total PR rows
 *   - source breakdown (TESTED vs ESTIMATED vs CALCULATED)
 *
 * Powers the team Test page's history view so the coach can scan
 * past test days at a glance and drill into one for confirmation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { getAccessibleTeam } from '@/lib/coach/team-access'

interface PRRow {
  id: string
  clientId: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  unit: string
  source: string
  athleteName: string
}

interface TestSession {
  date: string // YYYY-MM-DD
  athleteCount: number
  exerciseCount: number
  totalPRs: number
  bySource: Record<'TESTED' | 'CALCULATED' | 'ESTIMATED', number>
  rows: PRRow[]
}

interface HockeyMetric {
  key: string
  label: string
  unit: string
  lowerIsBetter?: boolean
}

type HockeyMetricValues = Record<string, number | null>
type HockeyMetricRanks = Record<string, { rank: number; percentile: number } | null>
type HockeyBenchmarkBand = 'top' | 'above' | 'team' | 'watch' | 'priority'
type HockeyMetricBenchmarks = Record<string, {
  zScore: number | null
  percentile: number | null
  positionZScore: number | null
  positionPercentile: number | null
  positionRank: number | null
  positionCoverage: number
  band: HockeyBenchmarkBand
} | null>

const DEFAULT_DAYS = 365

const HOCKEY_METRICS: HockeyMetric[] = [
  { key: 'muscleLabWkg', label: 'MuscleLab AP/BW', unit: 'W/kg' },
  { key: 'backSquat1RM', label: 'Knäböj', unit: 'kg' },
  { key: 'powerClean1RM', label: 'Power clean', unit: 'kg' },
  { key: 'benchPress1RM', label: 'Bänkpress', unit: 'kg' },
  { key: 'pullUp1RM', label: 'Pull-up 1RM', unit: 'kg' },
  { key: 'gripMax', label: 'Grepp max', unit: 'kg' },
  { key: 'standingLongJump', label: 'Längdhopp', unit: 'cm' },
  { key: 'threeJumpBest', label: '3-steg bäst', unit: 'cm' },
  { key: 'beepScore', label: 'Beep', unit: 'nivå' },
  { key: 'sprint5m', label: '5m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint10m', label: '10m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint20m', label: '20m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint30m', label: '30m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint20mFly', label: '20m fly', unit: 's', lowerIsBetter: true },
  { key: 'sprint30mFly', label: '30m fly', unit: 's', lowerIsBetter: true },
  { key: 'agilityBest', label: '5-10-5 bäst', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40Best', label: '7x40 bäst', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40Drop', label: '7x40 drop', unit: '%', lowerIsBetter: true },
]

type HockeyTestForSummary = {
  clientId: string
  testDate: Date
  sprint5m: number | null
  sprint10m: number | null
  sprint20m: number | null
  sprint30m: number | null
  sprint20mFly: number | null
  sprint30mFly: number | null
  agility505Left: number | null
  agility505Right: number | null
  endurance7x40: unknown
  gripStrengthLeft: number | null
  gripStrengthRight: number | null
  standingLongJump: number | null
  threeJumpLeft: number | null
  threeJumpRight: number | null
  beepTestLevel: number | null
  beepTestShuttle: number | null
  backSquat1RM: number | null
  powerClean1RM: number | null
  benchPress1RM: number | null
  pullUp1RM: number | null
  muscleLabMaxima: unknown
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

function percentileFromRank(rank: number, coverage: number): number {
  if (coverage <= 1) return 100
  return Math.round(((coverage - rank) / (coverage - 1)) * 100)
}

function benchmarkBand(percentile: number | null): HockeyBenchmarkBand {
  if (percentile == null) return 'team'
  if (percentile >= 80) return 'top'
  if (percentile >= 60) return 'above'
  if (percentile >= 40) return 'team'
  if (percentile >= 20) return 'watch'
  return 'priority'
}

function normalizeHockeyPosition(position: string | null | undefined): { key: string; label: string } {
  const raw = (position ?? '').trim().toLowerCase()
  if (!raw) return { key: 'unknown', label: 'Position saknas' }
  if (['g', 'goalie', 'goalkeeper', 'målvakt', 'malvakt'].some((needle) => raw.includes(needle))) {
    return { key: 'G', label: 'Målvakt' }
  }
  if (['d', 'defense', 'defence', 'defender', 'back'].some((needle) => raw === needle || raw.includes(needle))) {
    return { key: 'D', label: 'Back' }
  }
  if (['c', 'center', 'centre', 'centerforward'].some((needle) => raw === needle || raw.includes(needle))) {
    return { key: 'C', label: 'Center' }
  }
  if (['w', 'wing', 'winger', 'forward', 'fwd', 'lw', 'rw'].some((needle) => raw === needle || raw.includes(needle))) {
    return { key: 'W', label: 'Forward/ving' }
  }
  return { key: raw.toUpperCase().slice(0, 12), label: position ?? 'Övrig' }
}

function orientedMetricValue(value: number | null, metric: HockeyMetric): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return metric.lowerIsBetter ? -value : value
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null
  const avg = mean(values)
  if (avg == null) return null
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length
  const sd = Math.sqrt(variance)
  return sd > 0 ? sd : null
}

function metricValuesForTest(test: HockeyTestForSummary | undefined): HockeyMetricValues {
  const beepScore = test?.beepTestLevel
    ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
    : null
  const endurance = enduranceValues(test?.endurance7x40)

  return {
    muscleLabWkg: round(numberFromJson(test?.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 1),
    backSquat1RM: test?.backSquat1RM ?? null,
    powerClean1RM: test?.powerClean1RM ?? null,
    benchPress1RM: test?.benchPress1RM ?? null,
    pullUp1RM: test?.pullUp1RM ?? null,
    gripMax: bestOf([test?.gripStrengthLeft, test?.gripStrengthRight]),
    standingLongJump: test?.standingLongJump ?? null,
    threeJumpBest: bestOf([test?.threeJumpLeft, test?.threeJumpRight]),
    beepScore: round(beepScore, 1),
    sprint5m: test?.sprint5m ?? null,
    sprint10m: test?.sprint10m ?? null,
    sprint20m: test?.sprint20m ?? null,
    sprint30m: test?.sprint30m ?? null,
    sprint20mFly: test?.sprint20mFly ?? null,
    sprint30mFly: test?.sprint30mFly ?? null,
    agilityBest: bestOf([test?.agility505Left, test?.agility505Right], true),
    endurance7x40Best: endurance.length > 0 ? Math.min(...endurance) : null,
    endurance7x40Drop: enduranceDropPercent(test?.endurance7x40),
  }
}

function improvementDelta(
  metric: HockeyMetric,
  latest: number | null,
  previous: number | null
): number | null {
  if (latest == null || previous == null) return null
  return round(metric.lowerIsBetter ? previous - latest : latest - previous, metric.unit === 's' ? 2 : 1)
}

function enduranceValues(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function enduranceDropPercent(value: unknown): number | null {
  const values = enduranceValues(value)
  if (values.length < 2) return null
  const best = Math.min(...values)
  const last = values[values.length - 1]
  if (!Number.isFinite(best) || best <= 0) return null
  return round(((last - best) / best) * 100, 1)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params

    const accessibleTeam = await getAccessibleTeam(user.id, teamId)
    if (!accessibleTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        members: { select: { id: true, name: true, position: true } },
      },
    })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const memberIds = team.members.map((m) => m.id)
    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, data: { sessions: [] } })
    }

    const since = new Date()
    since.setDate(since.getDate() - DEFAULT_DAYS)

    const rows = await prisma.oneRepMaxHistory.findMany({
      where: {
        clientId: { in: memberIds },
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
      include: {
        exercise: { select: { name: true, nameSv: true } },
      },
    })

    const hockeyTests = await prisma.hockeyPhysicalTest.findMany({
      where: {
        clientId: { in: memberIds },
        testDate: { gte: since },
      },
      orderBy: { testDate: 'desc' },
      select: {
        id: true,
        clientId: true,
        testDate: true,
        sprint5m: true,
        sprint10m: true,
        sprint20m: true,
        sprint30m: true,
        sprint20mFly: true,
        sprint30mFly: true,
        agility505Left: true,
        agility505Right: true,
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

    const memberNameById = new Map<string, string>(
      team.members.map((m) => [m.id, typeof m.name === 'string' ? m.name : ''])
    )
    const latestHockeyByAthlete = new Map<string, (typeof hockeyTests)[number]>()
    for (const test of hockeyTests) {
      if (!latestHockeyByAthlete.has(test.clientId)) {
        latestHockeyByAthlete.set(test.clientId, test)
      }
    }

    // Group by calendar date (YYYY-MM-DD). The PR table doesn't store
    // sessions explicitly so we synthesise them — coaches who paste
    // a sheet on a single date naturally produce one session.
    const byDate = new Map<string, PRRow[]>()
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10)
      const arr = byDate.get(key) ?? []
      arr.push({
        id: r.id,
        clientId: r.clientId,
        exerciseId: r.exerciseId,
        exerciseName: r.exercise.nameSv || r.exercise.name,
        oneRepMax: r.oneRepMax,
        unit: r.unit,
        source: r.source,
        athleteName: memberNameById.get(r.clientId) ?? '',
      })
      byDate.set(key, arr)
    }

    const sessions: TestSession[] = Array.from(byDate.entries())
      .map(([date, rs]) => {
        const athletes = new Set(rs.map((r) => r.clientId))
        const exercises = new Set(rs.map((r) => r.exerciseId))
        const bySource = { TESTED: 0, CALCULATED: 0, ESTIMATED: 0 }
        for (const r of rs) {
          if (r.source === 'TESTED') bySource.TESTED++
          else if (r.source === 'CALCULATED') bySource.CALCULATED++
          else bySource.ESTIMATED++
        }
        return {
          date,
          athleteCount: athletes.size,
          exerciseCount: exercises.size,
          totalPRs: rs.length,
          bySource,
          rows: rs,
        }
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))

    const hockeyAthletes = team.members.map((member) => {
      const latest = latestHockeyByAthlete.get(member.id)
      const metrics = metricValuesForTest(latest)

      return {
        id: member.id,
        name: member.name,
        position: normalizeHockeyPosition(member.position),
        latestTestDate: latest?.testDate.toISOString().slice(0, 10) ?? null,
        metrics,
        ranks: {} as HockeyMetricRanks,
        benchmarks: {} as HockeyMetricBenchmarks,
      }
    })

    const hockeyLeaders = HOCKEY_METRICS.map((metric) => {
      const values = hockeyAthletes
        .map((athlete) => ({
          athleteId: athlete.id,
          athleteName: athlete.name,
          value: athlete.metrics[metric.key],
        }))
        .filter((row): row is { athleteId: string; athleteName: string; value: number } => row.value != null)
        .sort((a, b) => metric.lowerIsBetter ? a.value - b.value : b.value - a.value)

      const numericValues = values.map((row) => row.value)
      const avg = numericValues.length > 0
        ? round(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length, metric.lowerIsBetter ? 2 : 1)
        : null

      values.forEach((row, index) => {
        const athlete = hockeyAthletes.find((candidate) => candidate.id === row.athleteId)
        if (athlete) {
          athlete.ranks[metric.key] = {
            rank: index + 1,
            percentile: percentileFromRank(index + 1, values.length),
          }
        }
      })

      const orientedTeamValues = values
        .map((row) => orientedMetricValue(row.value, metric))
        .filter((value): value is number => value != null)
      const teamMean = mean(orientedTeamValues)
      const teamSd = standardDeviation(orientedTeamValues)
      const valuesByPosition = new Map<string, typeof values>()
      for (const row of values) {
        const athlete = hockeyAthletes.find((candidate) => candidate.id === row.athleteId)
        const key = athlete?.position.key ?? 'unknown'
        const positionRows = valuesByPosition.get(key) ?? []
        positionRows.push(row)
        valuesByPosition.set(key, positionRows)
      }

      for (const athlete of hockeyAthletes) {
        const value = athlete.metrics[metric.key]
        const orientedValue = orientedMetricValue(value, metric)
        const teamPercentile = athlete.ranks[metric.key]?.percentile ?? null
        let positionZScore: number | null = null
        let positionPercentile: number | null = null
        let positionRank: number | null = null
        let positionCoverage = 0

        if (value != null) {
          const positionRows = valuesByPosition.get(athlete.position.key) ?? []
          positionCoverage = positionRows.length
          const positionIndex = positionRows.findIndex((row) => row.athleteId === athlete.id)
          if (positionIndex >= 0) {
            positionRank = positionIndex + 1
            positionPercentile = percentileFromRank(positionRank, positionRows.length)
          }
          const orientedPositionValues = positionRows
            .map((row) => orientedMetricValue(row.value, metric))
            .filter((candidate): candidate is number => candidate != null)
          const positionMean = mean(orientedPositionValues)
          const positionSd = standardDeviation(orientedPositionValues)
          positionZScore = orientedValue != null && positionMean != null && positionSd != null
            ? round((orientedValue - positionMean) / positionSd, 2)
            : null
        }

        athlete.benchmarks[metric.key] = value == null
          ? null
          : {
              zScore: orientedValue != null && teamMean != null && teamSd != null
                ? round((orientedValue - teamMean) / teamSd, 2)
                : null,
              percentile: teamPercentile,
              positionZScore,
              positionPercentile,
              positionRank,
              positionCoverage,
              band: benchmarkBand(positionPercentile ?? teamPercentile),
            }
      }

      return {
        ...metric,
        coverage: values.length,
        average: avg,
        leader: values[0] ?? null,
      }
    })

    const hockeyPositions = Array.from(
      hockeyAthletes.reduce((map, athlete) => {
        const existing = map.get(athlete.position.key)
        map.set(athlete.position.key, {
          ...athlete.position,
          athleteCount: (existing?.athleteCount ?? 0) + 1,
        })
        return map
      }, new Map<string, { key: string; label: string; athleteCount: number }>())
        .values()
    ).sort((a, b) => a.label.localeCompare(b.label, 'sv'))

    const hockeyTestsByAthlete = new Map<string, typeof hockeyTests>()
    for (const test of hockeyTests) {
      const existing = hockeyTestsByAthlete.get(test.clientId) ?? []
      existing.push(test)
      hockeyTestsByAthlete.set(test.clientId, existing)
    }

    const hockeyHistory = HOCKEY_METRICS.map((metric) => {
      const byDate = new Map<string, number[]>()
      for (const test of hockeyTests) {
        const value = metricValuesForTest(test)[metric.key]
        if (value == null) continue
        const dateKey = test.testDate.toISOString().slice(0, 10)
        const values = byDate.get(dateKey) ?? []
        values.push(value)
        byDate.set(dateKey, values)
      }

      const teamTrend = Array.from(byDate.entries())
        .map(([date, values]) => ({
          date,
          average: round(
            values.reduce((sum, value) => sum + value, 0) / values.length,
            metric.unit === 's' ? 2 : 1
          ),
          count: values.length,
        }))
        .sort((a, b) => (a.date > b.date ? 1 : -1))

      const athletes = team.members.map((member) => {
        const testsForAthlete = hockeyTestsByAthlete.get(member.id) ?? []
        const values = testsForAthlete
          .map((test) => ({
            date: test.testDate.toISOString().slice(0, 10),
            value: metricValuesForTest(test)[metric.key],
          }))
          .filter((row): row is { date: string; value: number } => row.value != null)

        const latest = values[0] ?? null
        const previous = values[1] ?? null
        const delta = improvementDelta(metric, latest?.value ?? null, previous?.value ?? null)
        const percentChange = delta != null && previous?.value
          ? round((delta / previous.value) * 100, 1)
          : null

        return {
          id: member.id,
          name: member.name,
          latestTestDate: latest?.date ?? null,
          previousTestDate: previous?.date ?? null,
          latest: latest?.value ?? null,
          previous: previous?.value ?? null,
          delta,
          percentChange,
          rank: hockeyAthletes.find((athlete) => athlete.id === member.id)?.ranks[metric.key] ?? null,
        }
      })

      return {
        ...metric,
        teamTrend,
        athletes,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        teamId: team.id,
        teamName: team.name,
        sessions,
        hockey: {
          metrics: HOCKEY_METRICS,
          athletes: hockeyAthletes,
          leaders: hockeyLeaders,
          history: hockeyHistory,
          positions: hockeyPositions,
          testCount: hockeyTests.length,
        },
      },
    })
  } catch (error) {
    logError('Team test-sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test sessions' },
      { status: 500 }
    )
  }
}
