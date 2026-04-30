/**
 * SIMCA-ready hockey test export
 *
 * GET /api/teams/[id]/hockey-tests/export
 *
 * Produces a wide CSV with one row per athlete hockey test. This is
 * intentionally plain CSV so it can go straight into SIMCA, Excel, R,
 * Python, or any later in-app MVA pipeline.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger-console'

const DEFAULT_DAYS = 365

const COLUMNS = [
  'team_id',
  'team_name',
  'athlete_id',
  'athlete_name',
  'position',
  'test_date',
  'source_type',
  'musclelab_ap_w',
  'musclelab_ap_w_per_kg_bw',
  'musclelab_peak_velocity_m_s',
  'back_squat_1rm_kg',
  'power_clean_1rm_kg',
  'bench_press_1rm_kg',
  'pullup_1rm_kg',
  'grip_left_kg',
  'grip_right_kg',
  'grip_max_kg',
  'standing_long_jump_cm',
  'three_jump_left_cm',
  'three_jump_right_cm',
  'three_jump_best_cm',
  'beep_level',
  'beep_shuttle',
  'beep_score',
  'sprint_5m_s',
  'sprint_10m_s',
  'sprint_20m_s',
  'sprint_30m_s',
  'sprint_20m_fly_s',
  'sprint_30m_fly_s',
  'agility_505_left_s',
  'agility_505_right_s',
  'agility_505_best_s',
  'endurance_7x40_best_s',
  'endurance_7x40_mean_s',
  'endurance_7x40_worst_s',
  'endurance_7x40_drop_pct',
] as const

function numberFromJson(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
}

function bestOf(values: Array<number | null | undefined>, lowerIsBetter = false): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (valid.length === 0) return null
  return lowerIsBetter ? Math.min(...valid) : Math.max(...valid)
}

function round(value: number | null, decimals = 2): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function enduranceSummary(value: unknown) {
  const times = numberArray(value)
  if (times.length === 0) {
    return { best: null, mean: null, worst: null, drop: null }
  }

  const best = Math.min(...times)
  const worst = Math.max(...times)
  const mean = times.reduce((sum, time) => sum + time, 0) / times.length
  const first = times[0]
  const drop = first > 0 ? ((worst - first) / first) * 100 : null

  return {
    best: round(best),
    mean: round(mean),
    worst: round(worst),
    drop: round(drop),
  }
}

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const text = String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvEscape).join(',')
}

function filenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'team'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const daysParam = Number(request.nextUrl.searchParams.get('days') ?? DEFAULT_DAYS)
    const days = Number.isFinite(daysParam) && daysParam > 0
      ? Math.min(Math.round(daysParam), 3650)
      : DEFAULT_DAYS

    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: {
        id: true,
        name: true,
        members: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const memberIds = team.members.map((member) => member.id)
    const memberById = new Map(team.members.map((member) => [member.id, member]))
    const since = new Date()
    since.setDate(since.getDate() - days)

    const tests = await prisma.hockeyPhysicalTest.findMany({
      where: {
        clientId: { in: memberIds },
        testDate: { gte: since },
      },
      orderBy: [{ testDate: 'desc' }, { clientId: 'asc' }],
      select: {
        clientId: true,
        testDate: true,
        sourceType: true,
        muscleLabMaxima: true,
        backSquat1RM: true,
        powerClean1RM: true,
        benchPress1RM: true,
        pullUp1RM: true,
        gripStrengthLeft: true,
        gripStrengthRight: true,
        standingLongJump: true,
        threeJumpLeft: true,
        threeJumpRight: true,
        beepTestLevel: true,
        beepTestShuttle: true,
        sprint5m: true,
        sprint10m: true,
        sprint20m: true,
        sprint30m: true,
        sprint20mFly: true,
        sprint30mFly: true,
        agility505Left: true,
        agility505Right: true,
        endurance7x40: true,
      },
    })

    const rows = tests.map((test) => {
      const athlete = memberById.get(test.clientId)
      const endurance = enduranceSummary(test.endurance7x40)
      const beepScore = test.beepTestLevel
        ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
        : null

      return [
        team.id,
        team.name,
        test.clientId,
        athlete?.name ?? '',
        athlete?.position ?? '',
        test.testDate.toISOString().slice(0, 10),
        test.sourceType,
        round(numberFromJson(test.muscleLabMaxima, 'maxAveragePower'), 0),
        round(numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 2),
        round(numberFromJson(test.muscleLabMaxima, 'maxPeakVelocity'), 2),
        test.backSquat1RM,
        test.powerClean1RM,
        test.benchPress1RM,
        test.pullUp1RM,
        test.gripStrengthLeft,
        test.gripStrengthRight,
        bestOf([test.gripStrengthLeft, test.gripStrengthRight]),
        test.standingLongJump,
        test.threeJumpLeft,
        test.threeJumpRight,
        bestOf([test.threeJumpLeft, test.threeJumpRight]),
        test.beepTestLevel,
        test.beepTestShuttle,
        round(beepScore, 1),
        test.sprint5m,
        test.sprint10m,
        test.sprint20m,
        test.sprint30m,
        test.sprint20mFly,
        test.sprint30mFly,
        test.agility505Left,
        test.agility505Right,
        bestOf([test.agility505Left, test.agility505Right], true),
        endurance.best,
        endurance.mean,
        endurance.worst,
        endurance.drop,
      ]
    })

    const csv = [
      csvRow([...COLUMNS]),
      ...rows.map(csvRow),
    ].join('\n')

    const filename = `simca-hockey-${filenamePart(team.name)}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    logError('Hockey SIMCA export error:', error)
    return NextResponse.json({ error: 'Failed to export hockey tests' }, { status: 500 })
  }
}
