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

const DEFAULT_DAYS = 365

const HOCKEY_METRICS: HockeyMetric[] = [
  { key: 'muscleLabWkg', label: 'MuscleLab AP/BW', unit: 'W/kg' },
  { key: 'backSquat1RM', label: 'Knäböj', unit: 'kg' },
  { key: 'powerClean1RM', label: 'Power clean', unit: 'kg' },
  { key: 'benchPress1RM', label: 'Bänkpress', unit: 'kg' },
  { key: 'gripMax', label: 'Grepp max', unit: 'kg' },
  { key: 'standingLongJump', label: 'Längdhopp', unit: 'cm' },
  { key: 'threeJumpBest', label: '3-steg bäst', unit: 'cm' },
  { key: 'beepScore', label: 'Beep', unit: 'nivå' },
  { key: 'sprint10m', label: '10m is', unit: 's', lowerIsBetter: true },
  { key: 'agilityBest', label: '5-10-5 bäst', unit: 's', lowerIsBetter: true },
]

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
        members: { select: { id: true, name: true } },
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
        sprint10m: true,
        agility505Left: true,
        agility505Right: true,
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
      const beepScore = latest?.beepTestLevel
        ? latest.beepTestLevel + ((latest.beepTestShuttle ?? 0) / 10)
        : null
      const metrics: HockeyMetricValues = {
        muscleLabWkg: round(numberFromJson(latest?.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 1),
        backSquat1RM: latest?.backSquat1RM ?? null,
        powerClean1RM: latest?.powerClean1RM ?? null,
        benchPress1RM: latest?.benchPress1RM ?? null,
        gripMax: bestOf([latest?.gripStrengthLeft, latest?.gripStrengthRight]),
        standingLongJump: latest?.standingLongJump ?? null,
        threeJumpBest: bestOf([latest?.threeJumpLeft, latest?.threeJumpRight]),
        beepScore: round(beepScore, 1),
        sprint10m: latest?.sprint10m ?? null,
        agilityBest: bestOf([latest?.agility505Left, latest?.agility505Right], true),
      }

      return {
        id: member.id,
        name: member.name,
        latestTestDate: latest?.testDate.toISOString().slice(0, 10) ?? null,
        metrics,
        ranks: {} as HockeyMetricRanks,
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

      return {
        ...metric,
        coverage: values.length,
        average: avg,
        leader: values[0] ?? null,
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
