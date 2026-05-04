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
import { buildRepeatedSprintProfile, distanceGapM, median, percentile, positiveSplit, speedKmh } from '@/lib/hockey/ice-speed'
import { buildHockeyQualityFlags, type HockeyQualityFlag } from '@/lib/hockey/test-quality'
import {
  buildHockeyNormGap,
  DEFAULT_HOCKEY_NORM_REFERENCES,
  findHockeyNormReference,
  normalizeNormPosition,
  type HockeyNormGap,
} from '@/lib/hockey/norm-references'
import {
  buildHockeyCoachInterpretations,
  type HockeyCoachInterpretation,
} from '@/lib/hockey/coach-interpretation'

interface HockeySummary {
  id: string
  testDate: string
  sourceType: string
  notes: string | null
  teamId: string | null
  season: string
  ageAtTest: number | null
  developmentLevel: string
  teamName: string | null
  metrics: Record<string, number | null>
  qualityFlags: HockeyQualityFlag[]
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

interface HockeyPathwayReadinessGap {
  metricKey: string
  label: string
  value: number | null
  target: number
  elite: number
  gapToTarget: number
  gapToElite: number
  unit: string
  lowerIsBetter: boolean
  status: 'missing' | 'below-target' | 'target' | 'elite'
}

interface HockeyPathwayReadiness {
  level: string
  score: number | null
  targetHits: number
  targetCount: number
  eliteHits: number
  gaps: HockeyPathwayReadinessGap[]
  primaryGap: HockeyPathwayReadinessGap | null
}

interface HockeyPathway {
  seasons: HockeyPathwaySeason[]
  milestones: HockeyPathwayMilestone[]
  readiness: HockeyPathwayReadiness[]
  nextLevel: HockeyPathwayReadiness | null
}

interface HockeyComparisonMetricConfig {
  key: string
  label: string
  unit: string
  decimals: number
  lowerIsBetter?: boolean
  distanceM?: number
}

interface HockeyPlayerComparisonMetric {
  key: string
  label: string
  unit: string
  decimals: number
  lowerIsBetter: boolean
  value: number
  teamPercentile: number | null
  positionPercentile: number | null
  teamMedian: number | null
  positionMedian: number | null
  teamRank: number | null
  positionRank: number | null
  gapToTeamMedian: number | null
  gapToPositionMedian: number | null
  gapToLeader: number | null
  gapToLeaderMeters: number | null
  leaderValue: number | null
  coverage: number
  positionCoverage: number
  band: 'top' | 'above' | 'team' | 'watch' | 'priority'
}

interface HockeyPlayerComparison {
  teamId: string
  teamName: string
  athleteCount: number
  position: string
  positionLabel: string
  mode: 'TEAM_CONTEXT' | 'POSITION_CONTEXT' | 'FULL_RANKING'
  sensitiveMetricsVisible: boolean
  metrics: HockeyPlayerComparisonMetric[]
}

interface HockeyPlayerVisibility {
  comparisonMode: 'OWN_PROGRESS' | 'TEAM_CONTEXT' | 'POSITION_CONTEXT' | 'FULL_RANKING'
  sensitiveMetricsVisible: boolean
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

const PATHWAY_LEVELS = ['J18', 'J20', 'A-team'] as const

const READINESS_METRIC_LABELS: Record<string, string> = {
  muscleLabWkg: 'MuscleLab power',
  sprint10m: '10m ice sprint',
  endurance7x40AverageKmh: '7x40 mean speed',
  backSquat1RM: 'Back squat',
}

const COMPARISON_METRICS: HockeyComparisonMetricConfig[] = [
  { key: 'muscleLabWkg', label: 'MuscleLab', unit: 'W/kg', decimals: 1 },
  { key: 'sprint10m', label: '10m is', unit: 's', decimals: 2, lowerIsBetter: true, distanceM: 10 },
  { key: 'sprint30m', label: '30m is', unit: 's', decimals: 2, lowerIsBetter: true, distanceM: 30 },
  { key: 'agilityBest', label: '5-10-5', unit: 's', decimals: 2, lowerIsBetter: true },
  { key: 'endurance7x40AverageKmh', label: '7x40 snitt', unit: 'km/h', decimals: 1 },
  { key: 'endurance7x40Resistance', label: '7x40 resistance', unit: '%', decimals: 0 },
  { key: 'vo2max', label: 'VO2max', unit: 'ml/kg/min', decimals: 1 },
  { key: 'lt2SpeedKmh', label: 'LT2 fart', unit: 'km/h', decimals: 1 },
  { key: 'backSquatRelative', label: 'Knäböj', unit: 'xBW', decimals: 2 },
]

const SENSITIVE_COMPARISON_KEYS = new Set(['vo2max', 'lt2SpeedKmh'])

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

function percentileBand(percentileValue: number | null): HockeyPlayerComparisonMetric['band'] {
  if (percentileValue == null) return 'team'
  if (percentileValue >= 80) return 'top'
  if (percentileValue >= 60) return 'above'
  if (percentileValue >= 40) return 'team'
  if (percentileValue >= 20) return 'watch'
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
    return { key: 'W', label: 'Forward' }
  }
  return { key: raw.toUpperCase().slice(0, 12), label: position ?? 'Övrig' }
}

function comparisonGap(value: number, reference: number | null, lowerIsBetter: boolean): number | null {
  if (reference == null) return null
  return round(lowerIsBetter ? reference - value : value - reference, 2)
}

function leaderGap(value: number, leader: number | null, lowerIsBetter: boolean): number | null {
  if (leader == null) return null
  return round(lowerIsBetter ? value - leader : leader - value, 2)
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

function toSummary(
  test: Awaited<ReturnType<typeof loadTests>>[number],
  birthDate: Date | null,
  bodyMassKg: number | null,
): HockeySummary {
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

  const metrics = {
    muscleLabWkg: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePowerPerBodyMass'), 1),
    muscleLabPower: round(numberFromJson(test.muscleLabMaxima, 'maxAveragePower'), 0),
    backSquat1RM: test.backSquat1RM,
    backSquatRelative: test.backSquat1RM != null && bodyMassKg != null && bodyMassKg > 0
      ? round(test.backSquat1RM / bodyMassKg, 2)
      : null,
    powerClean1RM: test.powerClean1RM,
    benchPress1RM: test.benchPress1RM,
    pullUp1RM: test.pullUp1RM,
    gripStrengthLeft: test.gripStrengthLeft,
    gripStrengthRight: test.gripStrengthRight,
    gripMax: bestOf([test.gripStrengthLeft, test.gripStrengthRight]),
    standingLongJump: test.standingLongJump,
    threeJumpLeft: test.threeJumpLeft,
    threeJumpRight: test.threeJumpRight,
    threeJumpBest: bestOf([test.threeJumpLeft, test.threeJumpRight]),
    beepScore: round(beepScore, 1),
    vo2max: test.vo2max,
    lt1HeartRate: test.lt1HeartRate,
    lt1SpeedKmh: test.lt1SpeedKmh,
    lt1Lactate: test.lt1Lactate,
    lt2HeartRate: test.lt2HeartRate,
    lt2SpeedKmh: test.lt2SpeedKmh,
    lt2Lactate: test.lt2Lactate,
    maxHeartRate: test.maxHeartRate,
    maxLactate: test.maxLactate,
    rampDurationMin: test.rampDurationSec ? round(test.rampDurationSec / 60, 1) : null,
    peakSpeedKmh: test.peakSpeedKmh,
    rerMax: test.rerMax,
    veMax: test.veMax,
    breathingFrequencyMax: test.breathingFrequencyMax,
    economyMlKgKm: test.economyMlKgKm,
    hrRecovery1Min: test.hrRecovery1Min,
    hrRecovery2Min: test.hrRecovery2Min,
    lactateClearance3Min: test.lactateClearance3Min,
    lactateClearance5Min: test.lactateClearance5Min,
    lactateClearance10Min: test.lactateClearance10Min,
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
    agility505Left: test.agility505Left,
    agility505Right: test.agility505Right,
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
  }

  return {
    id: test.id,
    testDate: test.testDate.toISOString(),
    sourceType: test.sourceType,
    notes: test.notes,
    teamId: test.teamId,
    season: seasonLabel(test.testDate),
    ageAtTest: age,
    developmentLevel: developmentLevel(age, test.team?.name),
    teamName: test.team?.name ?? null,
    metrics,
    qualityFlags: buildHockeyQualityFlags({
      metrics,
      endurance7x40: test.endurance7x40,
      muscleLabMaxima: test.muscleLabMaxima,
    }),
  }
}

function readinessProgress(value: number, gap: HockeyNormGap): number {
  if (gap.lowerIsBetter) {
    return gap.target > 0 && value > 0 ? Math.min(gap.target / value, 1) : 0
  }
  return gap.target > 0 ? Math.min(value / gap.target, 1) : 0
}

function buildReadinessGap(metricKey: string, value: number | null, level: string, position: string): HockeyPathwayReadinessGap | null {
  const norm = findHockeyNormReference(DEFAULT_HOCKEY_NORM_REFERENCES, level, position, metricKey)
  if (!norm) return null
  const gap = buildHockeyNormGap(value, norm)

  return {
    metricKey,
    label: READINESS_METRIC_LABELS[metricKey] ?? metricKey,
    value,
    target: norm.target,
    elite: norm.elite,
    gapToTarget: gap?.gapToTarget ?? 0,
    gapToElite: gap?.gapToElite ?? 0,
    unit: norm.unit,
    lowerIsBetter: norm.lowerIsBetter === true,
    status: value == null
      ? 'missing'
      : gap && gap.gapToElite >= 0
        ? 'elite'
        : gap && gap.gapToTarget >= 0
          ? 'target'
          : 'below-target',
  }
}

function buildPathwayReadiness(latest: HockeySummary | null, position: string): HockeyPathwayReadiness[] {
  const metrics = latest?.metrics ?? {}
  return PATHWAY_LEVELS.map((level) => {
    const gaps = [
      buildReadinessGap('muscleLabWkg', metrics.muscleLabWkg, level, position),
      buildReadinessGap('sprint10m', metrics.sprint10m, level, position),
      buildReadinessGap('endurance7x40AverageKmh', metrics.endurance7x40AverageKmh, level, position),
      buildReadinessGap('backSquat1RM', metrics.backSquatRelative, level, position),
    ].filter((gap): gap is HockeyPathwayReadinessGap => gap != null)

    const measured = gaps.filter((gap) => gap.value != null)
    const targetHits = measured.filter((gap) => gap.status === 'target' || gap.status === 'elite').length
    const eliteHits = measured.filter((gap) => gap.status === 'elite').length
    const score = measured.length
      ? round(measured.reduce((sum, gap) => {
          const normGap = buildHockeyNormGap(gap.value, {
            level,
            position,
            metricKey: gap.metricKey,
            target: gap.target,
            elite: gap.elite,
            unit: gap.unit,
            lowerIsBetter: gap.lowerIsBetter,
          })
          return sum + (normGap && gap.value != null ? readinessProgress(gap.value, normGap) : 0)
        }, 0) / measured.length * 100, 0)
      : null
    const primaryGap = measured
      .filter((gap) => gap.status === 'below-target')
      .sort((a, b) => a.gapToTarget - b.gapToTarget)[0] ?? null

    return {
      level,
      score,
      targetHits,
      targetCount: measured.length,
      eliteHits,
      gaps,
      primaryGap,
    }
  })
}

function buildPathway(history: HockeySummary[], position: string): HockeyPathway {
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

  const latest = history[0] ?? null
  const readiness = buildPathwayReadiness(latest, position)

  return {
    seasons,
    milestones: milestones.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    readiness,
    nextLevel: readiness.find((level) => level.score == null || level.score < 100) ?? readiness[readiness.length - 1] ?? null,
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

async function buildPlayerComparison(options: {
  clientId: string
  latestRawTest: Awaited<ReturnType<typeof loadTests>>[number] | undefined
  latest: HockeySummary | null
  clientPosition: string | null | undefined
}): Promise<HockeyPlayerComparison | null> {
  if (!options.latest || !options.latestRawTest) return null

  const team = options.latestRawTest.teamId
    ? await prisma.team.findUnique({
        where: { id: options.latestRawTest.teamId },
        select: {
          id: true,
          name: true,
          hockeyPlayerComparisonMode: true,
          hockeySensitiveMetricsVisible: true,
          members: {
            select: {
              id: true,
              name: true,
              position: true,
              birthDate: true,
              weight: true,
            },
          },
        },
      })
    : await prisma.team.findFirst({
        where: { members: { some: { id: options.clientId } } },
        select: {
          id: true,
          name: true,
          hockeyPlayerComparisonMode: true,
          hockeySensitiveMetricsVisible: true,
          members: {
            select: {
              id: true,
              name: true,
              position: true,
              birthDate: true,
              weight: true,
            },
          },
        },
      })

  if (!team || team.members.length < 2) return null
  const mode = team.hockeyPlayerComparisonMode === 'OWN_PROGRESS'
    ? 'OWN_PROGRESS'
    : team.hockeyPlayerComparisonMode === 'TEAM_CONTEXT'
      ? 'TEAM_CONTEXT'
      : team.hockeyPlayerComparisonMode === 'FULL_RANKING'
        ? 'FULL_RANKING'
        : 'POSITION_CONTEXT'
  const sensitiveMetricsVisible = team.hockeySensitiveMetricsVisible !== false

  if (mode === 'OWN_PROGRESS') return null

  const memberIds = team.members.map((member) => member.id)
  const since = new Date(options.latestRawTest.testDate)
  since.setDate(since.getDate() - 120)
  const teamTests = await prisma.hockeyPhysicalTest.findMany({
    where: {
      clientId: { in: memberIds },
      testDate: { gte: since },
    },
    orderBy: { testDate: 'desc' },
    select: {
      id: true,
      clientId: true,
      teamId: true,
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
      backSquat1RM: true,
      powerClean1RM: true,
      benchPress1RM: true,
      pullUp1RM: true,
      muscleLabMaxima: true,
      team: { select: { name: true } },
    },
  })

  const latestByAthlete = new Map<string, (typeof teamTests)[number]>()
  for (const test of teamTests) {
    if (!latestByAthlete.has(test.clientId)) {
      latestByAthlete.set(test.clientId, test)
    }
  }

  const summaries = team.members
    .map((member) => {
      const test = latestByAthlete.get(member.id)
      if (!test) return null
      return {
        id: member.id,
        position: normalizeHockeyPosition(member.position),
        summary: toSummary(test, member.birthDate, member.weight),
      }
    })
    .filter((row): row is { id: string; position: { key: string; label: string }; summary: HockeySummary } => row != null)

  const athlete = summaries.find((row) => row.id === options.clientId)
  if (!athlete) return null

  const athletePosition = athlete.position.key !== 'unknown'
    ? athlete.position
    : normalizeHockeyPosition(options.clientPosition)

  const metrics = COMPARISON_METRICS
    .filter((metric) => sensitiveMetricsVisible || !SENSITIVE_COMPARISON_KEYS.has(metric.key))
    .map((metric): HockeyPlayerComparisonMetric | null => {
    const value = athlete.summary.metrics[metric.key]
    if (value == null) return null

    const rowsWithMetric = summaries
      .map((row) => ({
        ...row,
        value: row.summary.metrics[metric.key],
      }))
      .filter((row): row is typeof row & { value: number } => row.value != null && Number.isFinite(row.value))

    if (rowsWithMetric.length < 2) return null

    const positionRows = rowsWithMetric.filter((row) => row.position.key === athletePosition.key)
    const values = rowsWithMetric.map((row) => row.value)
    const positionValues = positionRows.map((row) => row.value)
    const sorted = [...values].sort((a, b) => metric.lowerIsBetter ? a - b : b - a)
    const leader = sorted[0] ?? null
    const teamPercentile = percentile(value, values, metric.lowerIsBetter !== true)
    const positionPercentile = positionValues.length >= 2
      ? percentile(value, positionValues, metric.lowerIsBetter !== true)
      : null
    const rankedTeamRows = [...rowsWithMetric].sort((a, b) => metric.lowerIsBetter ? a.value - b.value : b.value - a.value)
    const rankedPositionRows = [...positionRows].sort((a, b) => metric.lowerIsBetter ? a.value - b.value : b.value - a.value)
    const teamRank = rankedTeamRows.findIndex((row) => row.id === options.clientId) + 1
    const positionRank = rankedPositionRows.findIndex((row) => row.id === options.clientId) + 1

    return {
      key: metric.key,
      label: metric.label,
      unit: metric.unit,
      decimals: metric.decimals,
      lowerIsBetter: metric.lowerIsBetter === true,
      value,
      teamPercentile,
      positionPercentile: mode === 'TEAM_CONTEXT' ? null : positionPercentile,
      teamMedian: round(median(values), metric.decimals),
      positionMedian: mode === 'TEAM_CONTEXT'
        ? null
        : positionValues.length >= 2 ? round(median(positionValues), metric.decimals) : null,
      teamRank: mode === 'FULL_RANKING' && teamRank > 0 ? teamRank : null,
      positionRank: mode === 'FULL_RANKING' && positionRank > 0 ? positionRank : null,
      gapToTeamMedian: comparisonGap(value, median(values), metric.lowerIsBetter === true),
      gapToPositionMedian: mode === 'TEAM_CONTEXT'
        ? null
        : positionValues.length >= 2
        ? comparisonGap(value, median(positionValues), metric.lowerIsBetter === true)
        : null,
      gapToLeader: leaderGap(value, leader, metric.lowerIsBetter === true),
      gapToLeaderMeters: metric.distanceM && metric.lowerIsBetter
        ? distanceGapM(metric.distanceM, leader, value)
        : null,
      leaderValue: leader,
      coverage: rowsWithMetric.length,
      positionCoverage: mode === 'TEAM_CONTEXT' ? 0 : positionRows.length,
      band: percentileBand(mode === 'TEAM_CONTEXT' ? teamPercentile : positionPercentile ?? teamPercentile),
    }
  }).filter((metric): metric is HockeyPlayerComparisonMetric => metric != null)

  return {
    teamId: team.id,
    teamName: team.name,
    athleteCount: summaries.length,
    position: athletePosition.key,
    positionLabel: athletePosition.label,
    mode,
    sensitiveMetricsVisible,
    metrics,
  }
}

async function loadPlayerVisibility(options: {
  clientId: string
  latestRawTest: Awaited<ReturnType<typeof loadTests>>[number] | undefined
}): Promise<HockeyPlayerVisibility> {
  const team = options.latestRawTest?.teamId
    ? await prisma.team.findUnique({
        where: { id: options.latestRawTest.teamId },
        select: {
          hockeyPlayerComparisonMode: true,
          hockeySensitiveMetricsVisible: true,
        },
      })
    : await prisma.team.findFirst({
        where: { members: { some: { id: options.clientId } } },
        select: {
          hockeyPlayerComparisonMode: true,
          hockeySensitiveMetricsVisible: true,
        },
      })

  return {
    comparisonMode: team?.hockeyPlayerComparisonMode === 'OWN_PROGRESS'
      ? 'OWN_PROGRESS'
      : team?.hockeyPlayerComparisonMode === 'TEAM_CONTEXT'
        ? 'TEAM_CONTEXT'
        : team?.hockeyPlayerComparisonMode === 'FULL_RANKING'
          ? 'FULL_RANKING'
          : 'POSITION_CONTEXT',
    sensitiveMetricsVisible: team?.hockeySensitiveMetricsVisible !== false,
  }
}

async function loadTests(clientId: string) {
  return prisma.hockeyPhysicalTest.findMany({
    where: { clientId },
    orderBy: { testDate: 'desc' },
    take: 80,
    select: {
      id: true,
      clientId: true,
      teamId: true,
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
        select: { birthDate: true, position: true, weight: true },
      }),
    ])
    const history = tests.map((test) => toSummary(test, client?.birthDate ?? null, client?.weight ?? null))
    const latest = history[0] ?? null
    const previous = history[1] ?? null
    const trends = buildTrends(latest, previous)
    const bests = buildBests(history)
    const pathway = buildPathway(history, normalizeNormPosition(client?.position))
    const [comparison, playerVisibility] = await Promise.all([
      buildPlayerComparison({
        clientId,
        latestRawTest: tests[0],
        latest,
        clientPosition: client?.position,
      }),
      loadPlayerVisibility({
        clientId,
        latestRawTest: tests[0],
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        latest,
        previous,
        bests,
        trends,
        flags: buildFlags(latest, trends),
        history,
        pathway,
        comparison,
        playerVisibility,
        interpretations: buildHockeyCoachInterpretations({
          latest,
          trends,
          readiness: pathway,
        }) satisfies HockeyCoachInterpretation[],
        count: history.length,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
