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
import {
  buildHockeyNormGap,
  findHockeyNormReference,
  mergeHockeyNormReferences,
} from '@/lib/hockey/norm-references'
import {
  buildSimcaExportQualitySummary,
  buildSimcaRowQuality,
  SIMCA_EXPORT_PRESET_DETAILS,
  SIMCA_QUALITY_AREAS,
  SIMCA_QUALITY_KEYS,
  SIMCA_REQUIRED_KEYS,
  type SimcaExportPresetId,
} from '@/lib/hockey/data-quality'

const DEFAULT_DAYS = 365
const SIMCA_EXPORT_VERSION = 'hockey-simca-v3'

const COLUMNS = [
  'simca_export_version',
  'simca_export_generated_at',
  'simca_export_preset',
  'simca_row_core_coverage_pct',
  'simca_row_required_missing_count',
  'simca_row_required_missing_keys',
  'simca_row_analysis_ready',
  'team_id',
  'team_name',
  'athlete_id',
  'athlete_name',
  'position',
  'test_date',
  'source_type',
  'athlete_age_at_test',
  'pathway_season',
  'pathway_level',
  'pathway_season_index',
  'pathway_seasons_tested',
  'pathway_tests_in_season',
  'pathway_level_transition_count',
  'pathway_positive_change_count',
  'pathway_data_gap_count',
  'pathway_power_wkg_slope_per_season',
  'pathway_10m_improvement_s_per_season',
  'pathway_7x40_kmh_slope_per_season',
  'gap_musclelab_wkg_to_target',
  'gap_musclelab_wkg_to_elite',
  'gap_sprint_10m_s_to_target',
  'gap_sprint_10m_s_to_elite',
  'gap_7x40_mean_kmh_to_target',
  'gap_7x40_mean_kmh_to_elite',
  'back_squat_1rm_x_bw',
  'gap_back_squat_x_bw_to_target',
  'gap_back_squat_x_bw_to_elite',
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
  'vo2max_ml_kg_min',
  'lt1_heart_rate_bpm',
  'lt1_speed_kmh',
  'lt1_lactate_mmol_l',
  'lt2_heart_rate_bpm',
  'lt2_speed_kmh',
  'lt2_lactate_mmol_l',
  'max_heart_rate_bpm',
  'max_lactate_mmol_l',
  'ramp_duration_s',
  'ramp_duration_min',
  'peak_speed_kmh',
  'rer_max',
  've_max_l_min',
  'breathing_frequency_max_per_min',
  'economy_ml_kg_km',
  'hr_recovery_1min_bpm',
  'hr_recovery_2min_bpm',
  'lactate_clearance_3min_mmol_l',
  'lactate_clearance_5min_mmol_l',
  'lactate_clearance_10min_mmol_l',
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
  'z_vo2max_ml_kg_min',
  'z_lt2_speed_kmh',
  'z_max_lactate_mmol_l',
  'z_ramp_duration_min',
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

type SimcaExportColumn = typeof COLUMNS[number]

const BASE_SIMCA_COLUMNS = [
  'simca_export_version',
  'simca_export_generated_at',
  'simca_export_preset',
  'simca_row_core_coverage_pct',
  'simca_row_required_missing_count',
  'simca_row_required_missing_keys',
  'simca_row_analysis_ready',
  'team_id',
  'team_name',
  'athlete_id',
  'athlete_name',
  'position',
  'test_date',
  'source_type',
] as const satisfies readonly SimcaExportColumn[]

const SIMCA_EXPORT_PRESETS: Record<SimcaExportPresetId, { label: string; description: string; columns: readonly SimcaExportColumn[] }> = {
  full: {
    label: SIMCA_EXPORT_PRESET_DETAILS.full.label,
    description: SIMCA_EXPORT_PRESET_DETAILS.full.description,
    columns: COLUMNS,
  },
  explosive_power: {
    label: SIMCA_EXPORT_PRESET_DETAILS.explosive_power.label,
    description: SIMCA_EXPORT_PRESET_DETAILS.explosive_power.description,
    columns: [
      ...BASE_SIMCA_COLUMNS,
      'athlete_age_at_test',
      'pathway_level',
      'musclelab_ap_w',
      'musclelab_ap_w_per_kg_bw',
      'musclelab_peak_velocity_m_s',
      'standing_long_jump_cm',
      'three_jump_best_cm',
      'sprint_5m_s',
      'sprint_10m_s',
      'sprint_0_10m_kmh',
      'agility_505_best_s',
      'z_musclelab_ap_w_per_kg_bw',
      'z_standing_long_jump_cm',
      'z_three_jump_best_cm',
      'z_sprint_5m_s',
      'z_sprint_10m_s',
      'z_agility_505_best_s',
    ],
  },
  on_ice_speed: {
    label: SIMCA_EXPORT_PRESET_DETAILS.on_ice_speed.label,
    description: SIMCA_EXPORT_PRESET_DETAILS.on_ice_speed.description,
    columns: [
      ...BASE_SIMCA_COLUMNS,
      'athlete_age_at_test',
      'pathway_level',
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
      'agility_505_best_s',
      'z_sprint_0_10m_kmh',
      'z_sprint_10_20m_kmh',
      'z_sprint_20_30m_kmh',
      'z_sprint_0_30m_kmh',
    ],
  },
  repeated_sprint: {
    label: SIMCA_EXPORT_PRESET_DETAILS.repeated_sprint.label,
    description: SIMCA_EXPORT_PRESET_DETAILS.repeated_sprint.description,
    columns: [
      ...BASE_SIMCA_COLUMNS,
      'athlete_age_at_test',
      'pathway_level',
      'beep_score',
      'vo2max_ml_kg_min',
      'lt2_speed_kmh',
      'max_lactate_mmol_l',
      'ramp_duration_min',
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
      'z_beep_score',
      'z_vo2max_ml_kg_min',
      'z_lt2_speed_kmh',
      'z_max_lactate_mmol_l',
      'z_ramp_duration_min',
      'z_endurance_7x40_best_kmh',
      'z_endurance_7x40_mean_kmh',
      'z_endurance_7x40_resistance_pct',
      'z_endurance_7x40_rsa_score',
      'z_endurance_7x40_drop_pct',
    ],
  },
  strength: {
    label: SIMCA_EXPORT_PRESET_DETAILS.strength.label,
    description: SIMCA_EXPORT_PRESET_DETAILS.strength.description,
    columns: [
      ...BASE_SIMCA_COLUMNS,
      'athlete_age_at_test',
      'pathway_level',
      'back_squat_1rm_kg',
      'back_squat_1rm_x_bw',
      'power_clean_1rm_kg',
      'bench_press_1rm_kg',
      'pullup_1rm_kg',
      'grip_left_kg',
      'grip_right_kg',
      'grip_max_kg',
      'z_back_squat_1rm_kg',
      'z_power_clean_1rm_kg',
      'z_bench_press_1rm_kg',
      'z_pullup_1rm_kg',
      'z_grip_max_kg',
    ],
  },
  target_gaps: {
    label: SIMCA_EXPORT_PRESET_DETAILS.target_gaps.label,
    description: SIMCA_EXPORT_PRESET_DETAILS.target_gaps.description,
    columns: [
      ...BASE_SIMCA_COLUMNS,
      'athlete_age_at_test',
      'pathway_level',
      'gap_musclelab_wkg_to_target',
      'gap_musclelab_wkg_to_elite',
      'gap_sprint_10m_s_to_target',
      'gap_sprint_10m_s_to_elite',
      'gap_7x40_mean_kmh_to_target',
      'gap_7x40_mean_kmh_to_elite',
      'back_squat_1rm_x_bw',
      'gap_back_squat_x_bw_to_target',
      'gap_back_squat_x_bw_to_elite',
    ],
  },
  development_pathway: {
    label: SIMCA_EXPORT_PRESET_DETAILS.development_pathway.label,
    description: SIMCA_EXPORT_PRESET_DETAILS.development_pathway.description,
    columns: [
      ...BASE_SIMCA_COLUMNS,
      'athlete_age_at_test',
      'pathway_season',
      'pathway_level',
      'pathway_season_index',
      'pathway_seasons_tested',
      'pathway_tests_in_season',
      'pathway_level_transition_count',
      'pathway_positive_change_count',
      'pathway_data_gap_count',
      'pathway_power_wkg_slope_per_season',
      'pathway_10m_improvement_s_per_season',
      'pathway_7x40_kmh_slope_per_season',
    ],
  },
}

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
  { source: 'vo2max_ml_kg_min', target: 'z_vo2max_ml_kg_min' },
  { source: 'lt2_speed_kmh', target: 'z_lt2_speed_kmh' },
  { source: 'max_lactate_mmol_l', target: 'z_max_lactate_mmol_l' },
  { source: 'ramp_duration_min', target: 'z_ramp_duration_min' },
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

const HOCKEY_LEVELS = ['J18', 'J20', 'A-team'] as const

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

function exportPresetFromParam(value: string | null): SimcaExportPresetId {
  if (value && value in SIMCA_EXPORT_PRESETS) return value as SimcaExportPresetId
  return 'full'
}

function filenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'team'
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

function stringFromJson(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  for (const key of keys) {
    const raw = record[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
  }
  return null
}

function developmentLevel(age: number | null, teamName?: string | null, hockeySettings?: unknown): string {
  const override = stringFromJson(hockeySettings, ['developmentLevel', 'pathwayLevel', 'level'])
  if (override && HOCKEY_LEVELS.some((level) => override.toLowerCase().includes(level.toLowerCase()))) {
    return HOCKEY_LEVELS.find((level) => override.toLowerCase().includes(level.toLowerCase())) ?? override
  }

  const settingsTeam = stringFromJson(hockeySettings, ['teamName', 'clubTeam', 'leagueLevel'])
  const normalizedTeam = `${settingsTeam ?? ''} ${teamName ?? ''}`.toLowerCase()
  if (/(a-?team|a-lag|senior|herr|dam|shl|allsvenskan|hockeyallsvenskan)/.test(normalizedTeam)) return 'A-team'
  if (/j20|u20/.test(normalizedTeam)) return 'J20'
  if (/j18|u18/.test(normalizedTeam)) return 'J18'

  if (age == null) return 'Unknown'
  if (age <= 17) return 'J18'
  if (age <= 19) return 'J20'
  return 'A-team'
}

function slope(first: number | null, current: number | null, seasonIndex: number, lowerIsBetter = false): number | null {
  if (first == null || current == null || seasonIndex <= 0) return null
  return round((lowerIsBetter ? first - current : current - first) / seasonIndex, 3)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const daysParam = Number(request.nextUrl.searchParams.get('days') ?? DEFAULT_DAYS)
    const presetId = exportPresetFromParam(request.nextUrl.searchParams.get('preset'))
    const manifestOnly = request.nextUrl.searchParams.get('manifest') === '1'
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
            birthDate: true,
            weight: true,
            position: true,
            sportProfile: { select: { hockeySettings: true } },
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (manifestOnly) {
      const memberIds = team.members.map((member) => member.id)
      const since = new Date()
      since.setDate(since.getDate() - days)
      const manifestTests = await prisma.hockeyPhysicalTest.findMany({
        where: {
          clientId: { in: memberIds },
          testDate: { gte: since },
        },
        orderBy: { testDate: 'asc' },
        select: {
          clientId: true,
          testDate: true,
        },
      })
      const athletesWithTests = new Set(manifestTests.map((test) => test.clientId))
      const firstTest = manifestTests[0]
      const lastTest = manifestTests[manifestTests.length - 1]

      return NextResponse.json({
        success: true,
        data: {
          version: SIMCA_EXPORT_VERSION,
          defaultPreset: 'full',
          quality: {
            days,
            teamAthleteCount: team.members.length,
            athleteWithTestsCount: athletesWithTests.size,
            exportedTestCount: manifestTests.length,
            firstTestDate: firstTest?.testDate.toISOString().slice(0, 10) ?? null,
            latestTestDate: lastTest?.testDate.toISOString().slice(0, 10) ?? null,
            analysisReadyRule: 'All required battery columns present and at least 75% core hockey coverage.',
            coreColumns: SIMCA_QUALITY_KEYS,
            requiredColumns: SIMCA_REQUIRED_KEYS,
            areas: SIMCA_QUALITY_AREAS.map((area) => ({
              id: area.id,
              label: area.label,
              columns: area.keys,
              requiredColumns: area.requiredKeys,
            })),
          },
          presets: Object.entries(SIMCA_EXPORT_PRESETS).map(([id, preset]) => ({
            id,
            label: preset.label,
            description: preset.description,
            columnCount: preset.columns.length,
            columns: preset.columns,
          })),
        },
      })
    }

    const memberIds = team.members.map((member) => member.id)
    const memberById = new Map(team.members.map((member) => [member.id, member]))
    const since = new Date()
    since.setDate(since.getDate() - days)

    const savedNormReferences = await prisma.hockeyNormReference.findMany({
      where: { teamId, coachId: user.id },
      orderBy: [
        { level: 'asc' },
        { metricKey: 'asc' },
        { position: 'asc' },
      ],
    })
    const hockeyNormReferences = mergeHockeyNormReferences(savedNormReferences)

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
        vo2max: true,
        lt1HeartRate: true,
        lt1SpeedKmh: true,
        lt1Lactate: true,
        lt2HeartRate: true,
        lt2SpeedKmh: true,
        lt2Lactate: true,
        maxHeartRate: true,
        maxLactate: true,
        rampDurationSec: true,
        peakSpeedKmh: true,
        rerMax: true,
        veMax: true,
        breathingFrequencyMax: true,
        economyMlKgKm: true,
        hrRecovery1Min: true,
        hrRecovery2Min: true,
        lactateClearance3Min: true,
        lactateClearance5Min: true,
        lactateClearance10Min: true,
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

    const testsByAthlete = new Map<string, typeof tests>()
    for (const test of tests) {
      const existing = testsByAthlete.get(test.clientId) ?? []
      existing.push(test)
      testsByAthlete.set(test.clientId, existing)
    }

    const pathwayStats = new Map<string, Record<string, string | number | null>>()
    for (const [athleteId, athleteTests] of testsByAthlete.entries()) {
      const athlete = memberById.get(athleteId)
      const chronological = [...athleteTests].sort((a, b) => a.testDate.getTime() - b.testDate.getTime())
      const seasons = Array.from(new Set(chronological.map((test) => seasonLabel(test.testDate))))
      let previousLevel: string | null = null
      let transitions = 0
      let positiveChanges = 0

      chronological.forEach((test, index) => {
        const season = seasonLabel(test.testDate)
        const seasonIndex = seasons.indexOf(season)
        const age = ageAtDate(athlete?.birthDate, test.testDate)
        const level = developmentLevel(age, team.name, athlete?.sportProfile?.hockeySettings)
        if (previousLevel && previousLevel !== level) transitions += 1
        previousLevel = level

        const first = chronological[0]
        const previous = chronological[index - 1]
        const endurance = enduranceSummary(test.endurance7x40)
        const firstEndurance = enduranceSummary(first.endurance7x40)
        const previousEndurance = previous ? enduranceSummary(previous.endurance7x40) : null
        const power = round(numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 2)
        const firstPower = round(numberFromJson(first.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 2)
        const previousPower = previous ? round(numberFromJson(previous.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 2) : null
        if (previousPower != null && power != null && power > previousPower) positiveChanges += 1
        if (previous?.sprint10m != null && test.sprint10m != null && test.sprint10m < previous.sprint10m) positiveChanges += 1
        if (previousEndurance?.meanKmh != null && endurance.meanKmh != null && endurance.meanKmh > previousEndurance.meanKmh) positiveChanges += 1

        const testsInSeason = chronological.filter((candidate) => seasonLabel(candidate.testDate) === season).length
        const dataGapCount = [
          power,
          test.sprint10m,
          endurance.meanKmh,
          test.backSquat1RM,
          test.powerClean1RM,
        ].filter((value) => value == null).length

        pathwayStats.set(`${athleteId}:${test.testDate.toISOString()}`, {
          athlete_age_at_test: age,
          pathway_season: season,
          pathway_level: level,
          pathway_season_index: seasonIndex,
          pathway_seasons_tested: seasons.length,
          pathway_tests_in_season: testsInSeason,
          pathway_level_transition_count: transitions,
          pathway_positive_change_count: positiveChanges,
          pathway_data_gap_count: dataGapCount,
          pathway_power_wkg_slope_per_season: slope(firstPower, power, seasonIndex),
          pathway_10m_improvement_s_per_season: slope(first.sprint10m, test.sprint10m, seasonIndex, true),
          pathway_7x40_kmh_slope_per_season: slope(firstEndurance.meanKmh, endurance.meanKmh, seasonIndex),
        })
      })
    }

    const exportGeneratedAt = new Date().toISOString()
    const rawRows: Array<Record<string, string | number | null>> = tests.map((test) => {
      const athlete = memberById.get(test.clientId)
      const endurance = enduranceSummary(test.endurance7x40)
      const beepScore = test.beepTestLevel
        ? test.beepTestLevel + ((test.beepTestShuttle ?? 0) / 10)
        : null
      const sprint10to20 = positiveSplit(test.sprint20m, test.sprint10m)
      const sprint20to30 = positiveSplit(test.sprint30m, test.sprint20m)
      const pathway = pathwayStats.get(`${test.clientId}:${test.testDate.toISOString()}`) ?? {}
      const pathwayLevel = typeof pathway.pathway_level === 'string' ? pathway.pathway_level : null
      const muscleLabWkg = round(numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 2)
      const backSquatRelative = test.backSquat1RM && athlete?.weight
        ? round(test.backSquat1RM / athlete.weight, 2)
        : null
      const muscleNormGap = buildHockeyNormGap(
        muscleLabWkg,
        findHockeyNormReference(hockeyNormReferences, pathwayLevel, athlete?.position, 'muscleLabWkg'),
      )
      const sprintNormGap = buildHockeyNormGap(
        test.sprint10m,
        findHockeyNormReference(hockeyNormReferences, pathwayLevel, athlete?.position, 'sprint10m'),
      )
      const enduranceNormGap = buildHockeyNormGap(
        endurance.meanKmh,
        findHockeyNormReference(hockeyNormReferences, pathwayLevel, athlete?.position, 'endurance7x40AverageKmh'),
      )
      const squatNormGap = buildHockeyNormGap(
        backSquatRelative,
        findHockeyNormReference(hockeyNormReferences, pathwayLevel, athlete?.position, 'backSquat1RM'),
      )

      return {
        simca_export_version: SIMCA_EXPORT_VERSION,
        simca_export_generated_at: exportGeneratedAt,
        simca_export_preset: presetId,
        team_id: team.id,
        team_name: team.name,
        athlete_id: test.clientId,
        athlete_name: athlete?.name ?? '',
        position: athlete?.position ?? '',
        test_date: test.testDate.toISOString().slice(0, 10),
        source_type: test.sourceType,
        ...pathway,
        gap_musclelab_wkg_to_target: muscleNormGap?.gapToTarget ?? null,
        gap_musclelab_wkg_to_elite: muscleNormGap?.gapToElite ?? null,
        gap_sprint_10m_s_to_target: sprintNormGap?.gapToTarget ?? null,
        gap_sprint_10m_s_to_elite: sprintNormGap?.gapToElite ?? null,
        gap_7x40_mean_kmh_to_target: enduranceNormGap?.gapToTarget ?? null,
        gap_7x40_mean_kmh_to_elite: enduranceNormGap?.gapToElite ?? null,
        back_squat_1rm_x_bw: backSquatRelative,
        gap_back_squat_x_bw_to_target: squatNormGap?.gapToTarget ?? null,
        gap_back_squat_x_bw_to_elite: squatNormGap?.gapToElite ?? null,
        musclelab_ap_w: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePower'), 0),
        musclelab_ap_w_per_kg_bw: muscleLabWkg,
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
        vo2max_ml_kg_min: test.vo2max,
        lt1_heart_rate_bpm: test.lt1HeartRate,
        lt1_speed_kmh: test.lt1SpeedKmh,
        lt1_lactate_mmol_l: test.lt1Lactate,
        lt2_heart_rate_bpm: test.lt2HeartRate,
        lt2_speed_kmh: test.lt2SpeedKmh,
        lt2_lactate_mmol_l: test.lt2Lactate,
        max_heart_rate_bpm: test.maxHeartRate,
        max_lactate_mmol_l: test.maxLactate,
        ramp_duration_s: test.rampDurationSec,
        ramp_duration_min: test.rampDurationSec ? round(test.rampDurationSec / 60, 1) : null,
        peak_speed_kmh: test.peakSpeedKmh,
        rer_max: test.rerMax,
        ve_max_l_min: test.veMax,
        breathing_frequency_max_per_min: test.breathingFrequencyMax,
        economy_ml_kg_km: test.economyMlKgKm,
        hr_recovery_1min_bpm: test.hrRecovery1Min,
        hr_recovery_2min_bpm: test.hrRecovery2Min,
        lactate_clearance_3min_mmol_l: test.lactateClearance3Min,
        lactate_clearance_5min_mmol_l: test.lactateClearance5Min,
        lactate_clearance_10min_mmol_l: test.lactateClearance10Min,
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

    rawRows.forEach((row) => {
      Object.assign(row, buildSimcaRowQuality(row))
    })
    const exportQuality = buildSimcaExportQualitySummary(rawRows)

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
      csvRow([...SIMCA_EXPORT_PRESETS[presetId].columns]),
      ...rawRows.map((row, index) => {
        const rowScores = zScores.get(index) ?? {}
        return csvRow(SIMCA_EXPORT_PRESETS[presetId].columns.map((column) => row[column] ?? rowScores[column] ?? null))
      }),
    ].join('\n')

    const filename = `simca-hockey-${filenamePart(team.name)}-${presetId}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-SIMCA-Export-Version': SIMCA_EXPORT_VERSION,
        'X-SIMCA-Export-Preset': presetId,
        'X-SIMCA-Core-Coverage-Pct': String(exportQuality.averageCoreCoveragePercent),
        'X-SIMCA-Analysis-Ready-Rows': `${exportQuality.analysisReadyRows}/${exportQuality.rowCount}`,
        'X-SIMCA-Missing-Required-Cells': String(exportQuality.missingRequiredCells),
        'X-SIMCA-Area-Coverage-Pct': exportQuality.areaCoverage
          .map((area) => `${area.id}:${area.coveragePercent}`)
          .join(';'),
      },
    })
  } catch (error) {
    logError('Hockey SIMCA export error:', error)
    return NextResponse.json({ error: 'Failed to export hockey tests' }, { status: 500 })
  }
}
