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
import { buildRepeatedSprintProfile, percentile, repeatedSprintScore } from '@/lib/hockey/ice-speed'

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
  'sprint_0_10m_kmh',
  'sprint_10_20m_split_s',
  'sprint_10_20m_kmh',
  'sprint_20_30m_split_s',
  'sprint_20_30m_kmh',
  'sprint_0_30m_kmh',
  'sprint_0_10m_gap_m',
  'sprint_10_20m_gap_m',
  'sprint_20_30m_gap_m',
  'sprint_0_30m_gap_m',
  'sprint_20m_fly_s',
  'sprint_30m_fly_s',
  'agility_505_left_s',
  'agility_505_right_s',
  'agility_505_best_s',
  'endurance_7x40_best_s',
  'endurance_7x40_best_kmh',
  'endurance_7x40_best_gap_m',
  'endurance_7x40_mean_s',
  'endurance_7x40_mean_kmh',
  'endurance_7x40_worst_s',
  'endurance_7x40_total_s',
  'endurance_7x40_drop_pct',
  'endurance_7x40_resistance_pct',
  'endurance_7x40_decrement_pct',
  'endurance_7x40_rsa_score',
  'z_musclelab_ap_w_per_kg_bw',
  'z_back_squat_1rm_kg',
  'z_power_clean_1rm_kg',
  'z_bench_press_1rm_kg',
  'z_pullup_1rm_kg',
  'z_grip_max_kg',
  'z_standing_long_jump_cm',
  'z_three_jump_best_cm',
  'z_beep_score',
  'z_sprint_5m_s',
  'z_sprint_10m_s',
  'z_sprint_20m_s',
  'z_sprint_30m_s',
  'z_sprint_0_10m_kmh',
  'z_sprint_10_20m_kmh',
  'z_sprint_20_30m_kmh',
  'z_sprint_0_30m_kmh',
  'z_endurance_7x40_best_kmh',
  'z_endurance_7x40_mean_kmh',
  'z_endurance_7x40_resistance_pct',
  'z_endurance_7x40_rsa_score',
  'z_agility_505_best_s',
  'z_endurance_7x40_drop_pct',
] as const

const Z_SCORE_METRICS = [
  { source: 'musclelab_ap_w_per_kg_bw', target: 'z_musclelab_ap_w_per_kg_bw' },
  { source: 'back_squat_1rm_kg', target: 'z_back_squat_1rm_kg' },
  { source: 'power_clean_1rm_kg', target: 'z_power_clean_1rm_kg' },
  { source: 'bench_press_1rm_kg', target: 'z_bench_press_1rm_kg' },
  { source: 'pullup_1rm_kg', target: 'z_pullup_1rm_kg' },
  { source: 'grip_max_kg', target: 'z_grip_max_kg' },
  { source: 'standing_long_jump_cm', target: 'z_standing_long_jump_cm' },
  { source: 'three_jump_best_cm', target: 'z_three_jump_best_cm' },
  { source: 'beep_score', target: 'z_beep_score' },
  { source: 'sprint_5m_s', target: 'z_sprint_5m_s', lowerIsBetter: true },
  { source: 'sprint_10m_s', target: 'z_sprint_10m_s', lowerIsBetter: true },
  { source: 'sprint_20m_s', target: 'z_sprint_20m_s', lowerIsBetter: true },
  { source: 'sprint_30m_s', target: 'z_sprint_30m_s', lowerIsBetter: true },
  { source: 'sprint_0_10m_kmh', target: 'z_sprint_0_10m_kmh' },
  { source: 'sprint_10_20m_kmh', target: 'z_sprint_10_20m_kmh' },
  { source: 'sprint_20_30m_kmh', target: 'z_sprint_20_30m_kmh' },
  { source: 'sprint_0_30m_kmh', target: 'z_sprint_0_30m_kmh' },
  { source: 'endurance_7x40_best_kmh', target: 'z_endurance_7x40_best_kmh' },
  { source: 'endurance_7x40_mean_kmh', target: 'z_endurance_7x40_mean_kmh' },
  { source: 'endurance_7x40_resistance_pct', target: 'z_endurance_7x40_resistance_pct' },
  { source: 'endurance_7x40_rsa_score', target: 'z_endurance_7x40_rsa_score' },
  { source: 'agility_505_best_s', target: 'z_agility_505_best_s', lowerIsBetter: true },
  { source: 'endurance_7x40_drop_pct', target: 'z_endurance_7x40_drop_pct', lowerIsBetter: true },
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

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function speedKmh(distanceM: number, timeS: number | null | undefined): number | null {
  if (timeS == null || timeS <= 0) return null
  return round(distanceM / timeS * 3.6, 2)
}

function positiveSplit(later: number | null | undefined, earlier: number | null | undefined): number | null {
  if (later == null || earlier == null || later <= earlier) return null
  return round(later - earlier, 2)
}

function distanceGap(distanceM: number, leaderTimeS: number | null | undefined, athleteTimeS: number | null | undefined): number | null {
  if (leaderTimeS == null || athleteTimeS == null || leaderTimeS <= 0 || athleteTimeS <= 0) return null
  if (athleteTimeS <= leaderTimeS) return 0
  return round(distanceM - (distanceM * leaderTimeS / athleteTimeS), 2)
}

function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null
  const avg = mean(values)
  if (avg == null) return null
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length
  const sd = Math.sqrt(variance)
  return sd > 0 ? sd : null
}

function enduranceSummary(value: unknown) {
  const times = numberArray(value)
  const repeatedSprint = buildRepeatedSprintProfile(times)

  return {
    best: repeatedSprint.bestTimeS,
    bestKmh: repeatedSprint.bestSpeedKmh,
    mean: repeatedSprint.averageTimeS,
    meanKmh: repeatedSprint.averageSpeedKmh,
    worst: repeatedSprint.worstTimeS,
    total: repeatedSprint.totalTimeS,
    drop: repeatedSprint.fatigueDropPct,
    resistance: repeatedSprint.fatigueResistancePct,
    decrement: repeatedSprint.sprintDecrementPct,
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

    const rawRows: Array<Record<string, string | number | null>> = tests.map((test) => {
      const athlete = memberById.get(test.clientId)
      const endurance = enduranceSummary(test.endurance7x40)
      const beepScore = test.beepTestLevel
        ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
        : null
      const sprint10to20 = positiveSplit(test.sprint20m, test.sprint10m)
      const sprint20to30 = positiveSplit(test.sprint30m, test.sprint20m)

      return {
        team_id: team.id,
        team_name: team.name,
        athlete_id: test.clientId,
        athlete_name: athlete?.name ?? '',
        position: athlete?.position ?? '',
        test_date: test.testDate.toISOString().slice(0, 10),
        source_type: test.sourceType,
        musclelab_ap_w: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePower'), 0),
        musclelab_ap_w_per_kg_bw: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 2),
        musclelab_peak_velocity_m_s: round(numberFromJson(test.muscleLabMaxima, 'maxPeakVelocity'), 2),
        back_squat_1rm_kg: test.backSquat1RM,
        power_clean_1rm_kg: test.powerClean1RM,
        bench_press_1rm_kg: test.benchPress1RM,
        pullup_1rm_kg: test.pullUp1RM,
        grip_left_kg: test.gripStrengthLeft,
        grip_right_kg: test.gripStrengthRight,
        grip_max_kg: bestOf([test.gripStrengthLeft, test.gripStrengthRight]),
        standing_long_jump_cm: test.standingLongJump,
        three_jump_left_cm: test.threeJumpLeft,
        three_jump_right_cm: test.threeJumpRight,
        three_jump_best_cm: bestOf([test.threeJumpLeft, test.threeJumpRight]),
        beep_level: test.beepTestLevel,
        beep_shuttle: test.beepTestShuttle,
        beep_score: round(beepScore, 1),
        sprint_5m_s: test.sprint5m,
        sprint_10m_s: test.sprint10m,
        sprint_20m_s: test.sprint20m,
        sprint_30m_s: test.sprint30m,
        sprint_0_10m_kmh: speedKmh(10, test.sprint10m),
        sprint_10_20m_split_s: sprint10to20,
        sprint_10_20m_kmh: speedKmh(10, sprint10to20),
        sprint_20_30m_split_s: sprint20to30,
        sprint_20_30m_kmh: speedKmh(10, sprint20to30),
        sprint_0_30m_kmh: speedKmh(30, test.sprint30m),
        sprint_20m_fly_s: test.sprint20mFly,
        sprint_30m_fly_s: test.sprint30mFly,
        agility_505_left_s: test.agility505Left,
        agility_505_right_s: test.agility505Right,
        agility_505_best_s: bestOf([test.agility505Left, test.agility505Right], true),
        endurance_7x40_best_s: endurance.best,
        endurance_7x40_best_kmh: endurance.bestKmh,
        endurance_7x40_mean_s: endurance.mean,
        endurance_7x40_mean_kmh: endurance.meanKmh,
        endurance_7x40_worst_s: endurance.worst,
        endurance_7x40_total_s: endurance.total,
        endurance_7x40_drop_pct: endurance.drop,
        endurance_7x40_resistance_pct: endurance.resistance,
        endurance_7x40_decrement_pct: endurance.decrement,
      }
    })

    const byDate = new Map<string, Array<Record<string, string | number | null>>>()
    for (const row of rawRows) {
      const date = String(row.test_date)
      byDate.set(date, [...(byDate.get(date) ?? []), row])
    }

    const gapDefinitions = [
      { source: 'sprint_10m_s', target: 'sprint_0_10m_gap_m', distanceM: 10 },
      { source: 'sprint_10_20m_split_s', target: 'sprint_10_20m_gap_m', distanceM: 10 },
      { source: 'sprint_20_30m_split_s', target: 'sprint_20_30m_gap_m', distanceM: 10 },
      { source: 'sprint_30m_s', target: 'sprint_0_30m_gap_m', distanceM: 30 },
      { source: 'endurance_7x40_best_s', target: 'endurance_7x40_best_gap_m', distanceM: 40 },
    ] as const

    for (const rowsForDate of byDate.values()) {
      for (const definition of gapDefinitions) {
        const leaderTime = bestOf(
          rowsForDate.map((row) => row[definition.source]).filter((value): value is number => typeof value === 'number'),
          true,
        )
        for (const row of rowsForDate) {
          const athleteTime = row[definition.source]
          row[definition.target] = typeof athleteTime === 'number'
            ? distanceGap(definition.distanceM, leaderTime, athleteTime)
            : null
        }
      }
    }

    for (const rowsForDate of byDate.values()) {
      const averageSpeedValues = rowsForDate
        .map((row) => row.endurance_7x40_mean_kmh)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      const bestSpeedValues = rowsForDate
        .map((row) => row.endurance_7x40_best_kmh)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      const resistanceValues = rowsForDate
        .map((row) => row.endurance_7x40_resistance_pct)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

      for (const row of rowsForDate) {
        const averageSpeed = row.endurance_7x40_mean_kmh
        const bestSpeed = row.endurance_7x40_best_kmh
        const resistance = row.endurance_7x40_resistance_pct
        row.endurance_7x40_rsa_score = repeatedSprintScore({
          averageSpeedPercentile: typeof averageSpeed === 'number' ? percentile(averageSpeed, averageSpeedValues) : null,
          bestSpeedPercentile: typeof bestSpeed === 'number' ? percentile(bestSpeed, bestSpeedValues) : null,
          fatigueResistancePercentile: typeof resistance === 'number' ? percentile(resistance, resistanceValues) : null,
        })
      }
    }

    const zScores = new Map<number, Record<string, number | null>>()
    for (const metric of Z_SCORE_METRICS) {
      const lowerIsBetter = 'lowerIsBetter' in metric && metric.lowerIsBetter === true
      const orientedValues = rawRows
        .map((row) => row[metric.source])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        .map((value) => lowerIsBetter ? -value : value)
      const avg = mean(orientedValues)
      const sd = standardDeviation(orientedValues)
      rawRows.forEach((row, index) => {
        const rawValue = row[metric.source]
        const rowScores = zScores.get(index) ?? {}
        rowScores[metric.target] = typeof rawValue === 'number' && avg != null && sd != null
          ? round(((lowerIsBetter ? -rawValue : rawValue) - avg) / sd, 3)
          : null
        zScores.set(index, rowScores)
      })
    }

    const csv = [
      csvRow([...COLUMNS]),
      ...rawRows.map((row, index) => {
        const rowScores = zScores.get(index) ?? {}
        return csvRow(COLUMNS.map((column) => row[column] ?? rowScores[column] ?? null))
      }),
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
