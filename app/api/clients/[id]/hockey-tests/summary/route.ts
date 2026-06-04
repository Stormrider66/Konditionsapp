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
import { buildHockeyQualityFlags, type HockeyQualityFlag } from '@/lib/hockey/test-quality'
import {
  buildHockeyNormGap,
  findHockeyNormReference,
  mergeHockeyNormReferences,
  normalizeNormPosition,
  type HockeyNormGap,
  type HockeyNormReferenceConfig,
} from '@/lib/hockey/norm-references'
import {
  buildHockeyCoachInterpretations,
  type HockeyCoachInterpretation,
} from '@/lib/hockey/coach-interpretation'
import {
  applyLinkedHockeyAerobicProfile,
  getLinkedHockeyAerobicProfiles,
} from '@/lib/hockey/aerobic-profile-link'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

interface HockeySummary {
  id: string
  testDate: string
  sourceType: string
  notes: string | null
  season: string
  ageAtTest: number | null
  developmentLevel: string
  teamName: string | null
  aerobicAutoLinked?: boolean
  aerobicAutoLinkSource?: string | null
  aerobicAutoLinkDate?: string | null
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
  level: string
  value: number | null
  target: number
  elite: number
  gapToTarget: number
  gapToElite: number
  unit: string
  lowerIsBetter: boolean
  status: 'missing' | 'below-target' | 'target' | 'elite'
  progress: number | null
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

interface HockeySingleTestGoals {
  level: string
  goals: HockeyPathwayReadinessGap[]
}

type LoadedHockeyTest = Awaited<ReturnType<typeof loadTests>>[number]
type EnrichedHockeyTest = LoadedHockeyTest & {
  aerobicAutoLinked?: boolean
  aerobicAutoLinkSource?: string | null
  aerobicAutoLinkDate?: string | null
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
  vo2Max: 'VO2max',
  wingate30sAveragePower: 'Wingate 30 s',
  lt2SpeedKmh: 'LT2 speed',
}

const PATHWAY_LEVELS = ['J18', 'J20', 'A-team'] as const

const READINESS_METRIC_LABELS: Record<string, string> = {
  muscleLabWkg: 'MuscleLab power',
  sprint10m: '10m ice sprint',
  endurance7x40AverageKmh: '7x40 mean speed',
  vo2Max: 'VO2max',
  lt2SpeedKmh: 'LT2 speed',
  backSquat1RM: 'Back squat',
  powerClean1RM: 'Power clean',
  benchPress1RM: 'Bench press',
  gripMax: 'Grip strength',
  standingLongJump: 'Standing long jump',
  threeJumpBest: '3-jump',
  maxLactate: 'Max lactate',
  rampTimeSeconds: 'Ramp time',
  sprint30m: '30m ice sprint',
  endurance7x40Resistance: '7x40 resistance',
  enduranceFatigueDrop: '7x40 drop',
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

function toSummary(
  test: EnrichedHockeyTest,
  birthDate: Date | null,
  bodyMassKg: number | null,
  locale: AppLocale,
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
    wingate30sAveragePower: round(test.wingate30sAveragePower, 0),
    vo2Max: round(test.vo2Max, 1),
    lt1SpeedKmh: round(test.lt1SpeedKmh, 1),
    lt1HeartRate: test.lt1HeartRate,
    lt1Lactate: round(test.lt1Lactate, 1),
    lt2SpeedKmh: round(test.lt2SpeedKmh, 1),
    lt2HeartRate: test.lt2HeartRate,
    lt2Lactate: round(test.lt2Lactate, 1),
    maxLactate: round(test.maxLactate, 1),
    maxHeartRate: test.maxHeartRate,
    rampTimeSeconds: test.rampTimeSeconds,
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
    sourceType: test.sourceType === 'MUSCLE_LAB_IMPORT' || test.muscleLabMaxima
      ? 'MUSCLE_LAB_IMPORT'
      : test.sourceType,
    notes: test.notes,
    season: seasonLabel(test.testDate),
    ageAtTest: age,
    developmentLevel: developmentLevel(age, test.team?.name),
    teamName: test.team?.name ?? null,
    aerobicAutoLinked: test.aerobicAutoLinked === true,
    aerobicAutoLinkSource: test.aerobicAutoLinkSource ?? null,
    aerobicAutoLinkDate: test.aerobicAutoLinkDate ?? null,
    metrics,
    qualityFlags: buildHockeyQualityFlags({
      metrics,
      endurance7x40: test.endurance7x40,
      muscleLabMaxima: test.muscleLabMaxima,
    }, locale),
  }
}

function readinessProgress(value: number, gap: HockeyNormGap): number {
  if (gap.lowerIsBetter) {
    return gap.target > 0 && value > 0 ? Math.min(gap.target / value, 1) : 0
  }
  return gap.target > 0 ? Math.min(value / gap.target, 1) : 0
}

function normComparableValue(metricValue: number | null | undefined, unit: string, bodyMassKg: number | null | undefined): number | null {
  if (metricValue == null || !Number.isFinite(metricValue)) return null
  if (unit === 'xBW') {
    return bodyMassKg && bodyMassKg > 0 ? round(metricValue / bodyMassKg, 2) : null
  }
  return metricValue
}

function buildGoalGap(
  metricKey: string,
  rawValue: number | null | undefined,
  level: string,
  position: string,
  bodyMassKg: number | null | undefined,
  normReferences: HockeyNormReferenceConfig[],
): HockeyPathwayReadinessGap | null {
  const norm = findHockeyNormReference(normReferences, level, position, metricKey)
  if (!norm) return null
  const value = normComparableValue(rawValue, norm.unit, bodyMassKg)
  const gap = buildHockeyNormGap(value, norm)

  return {
    metricKey,
    label: READINESS_METRIC_LABELS[metricKey] ?? metricKey,
    level,
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
    progress: value != null && gap ? round(readinessProgress(value, gap) * 100, 0) : null,
  }
}

function buildPathwayReadiness(
  latest: HockeySummary | null,
  position: string,
  bodyMassKg: number | null | undefined,
  normReferences: HockeyNormReferenceConfig[],
): HockeyPathwayReadiness[] {
  const metrics = latest?.metrics ?? {}
  return PATHWAY_LEVELS.map((level) => {
    const gaps = [
      buildGoalGap('muscleLabWkg', metrics.muscleLabWkg, level, position, bodyMassKg, normReferences),
      buildGoalGap('sprint10m', metrics.sprint10m, level, position, bodyMassKg, normReferences),
      buildGoalGap('endurance7x40AverageKmh', metrics.endurance7x40AverageKmh, level, position, bodyMassKg, normReferences),
      buildGoalGap('backSquat1RM', metrics.backSquat1RM, level, position, bodyMassKg, normReferences),
    ].filter((gap): gap is HockeyPathwayReadinessGap => gap != null)

    const measured = gaps.filter((gap) => gap.value != null)
    const targetHits = measured.filter((gap) => gap.status === 'target' || gap.status === 'elite').length
    const eliteHits = measured.filter((gap) => gap.status === 'elite').length
    const score = measured.length
      ? round(measured.reduce((sum, gap) => {
          return sum + ((gap.progress ?? 0) / 100)
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

function buildPathway(
  history: HockeySummary[],
  position: string,
  bodyMassKg: number | null | undefined,
  normReferences: HockeyNormReferenceConfig[],
): HockeyPathway {
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
  const readiness = buildPathwayReadiness(latest, position, bodyMassKg, normReferences)

  return {
    seasons,
    milestones: milestones.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    readiness,
    nextLevel: readiness.find((level) => level.score == null || level.score < 100) ?? readiness[readiness.length - 1] ?? null,
  }
}

function buildSingleTestGoals(
  latest: HockeySummary | null,
  level: string | null | undefined,
  position: string,
  bodyMassKg: number | null | undefined,
  normReferences: HockeyNormReferenceConfig[],
): HockeySingleTestGoals | null {
  if (!latest || !level) return null
  const levelKey = level.trim().toLowerCase()
  const metricKeys = Array.from(new Set(
    normReferences
      .filter((norm) => norm.level.trim().toLowerCase() === levelKey)
      .map((norm) => norm.metricKey)
  ))
  const goals = metricKeys
    .map((metricKey) => buildGoalGap(
      metricKey,
      latest.metrics[metricKey],
      level,
      position,
      bodyMassKg,
      normReferences
    ))
    .filter((goal): goal is HockeyPathwayReadinessGap => goal != null)

  return { level, goals }
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

function buildFlags(latest: HockeySummary | null, trends: HockeyTrend[], locale: AppLocale): HockeyFlag[] {
  if (!latest) return []
  const flags: HockeyFlag[] = []

  const trendByKey = new Map(trends.map((trend) => [trend.key, trend]))
  const powerTrend = trendByKey.get('muscleLabWkg')
  const sprintTrend = trendByKey.get('sprint10m')
  const agilityTrend = trendByKey.get('agilityBest')
  const vo2Trend = trendByKey.get('vo2Max')
  const lt2Trend = trendByKey.get('lt2SpeedKmh')
  const fatigueDrop = latest.metrics.enduranceFatigueDrop
  const maxLactate = latest.metrics.maxLactate

  if (powerTrend && !powerTrend.isImprovement && Math.abs(powerTrend.percentChange ?? 0) >= 3) {
    flags.push({
      key: 'muscleLabWkg',
      severity: 'warning',
      label: locale === 'sv'
        ? `MuscleLab power ned ${Math.abs(powerTrend.percentChange ?? 0).toFixed(1)}% sedan föregående test`
        : `MuscleLab power down ${Math.abs(powerTrend.percentChange ?? 0).toFixed(1)}% since the previous test`,
    })
  }

  if (sprintTrend && !sprintTrend.isImprovement && Math.abs(sprintTrend.delta) >= 0.05) {
    flags.push({
      key: 'sprint10m',
      severity: 'warning',
      label: locale === 'sv'
        ? `10m sprint långsammare med ${Math.abs(sprintTrend.delta).toFixed(2)} s`
        : `10m sprint slower by ${Math.abs(sprintTrend.delta).toFixed(2)} s`,
    })
  }

  if (agilityTrend && !agilityTrend.isImprovement && Math.abs(agilityTrend.delta) >= 0.1) {
    flags.push({
      key: 'agilityBest',
      severity: 'warning',
      label: locale === 'sv'
        ? `5-10-5 långsammare med ${Math.abs(agilityTrend.delta).toFixed(2)} s`
        : `5-10-5 slower by ${Math.abs(agilityTrend.delta).toFixed(2)} s`,
    })
  }

  if (fatigueDrop != null && fatigueDrop >= 8) {
    flags.push({
      key: 'enduranceFatigueDrop',
      severity: 'warning',
      label: locale === 'sv'
        ? `7x40 drop ${fatigueDrop.toFixed(1)}%, följ återhämtning och sprintuthållighet`
        : `7x40 drop ${fatigueDrop.toFixed(1)}%; monitor recovery and repeated-sprint endurance`,
    })
  }

  if (vo2Trend && !vo2Trend.isImprovement && Math.abs(vo2Trend.delta) >= 2) {
    flags.push({
      key: 'vo2Max',
      severity: 'warning',
      label: locale === 'sv'
        ? `VO2max ned ${Math.abs(vo2Trend.delta).toFixed(1)} ml/kg/min sedan föregående test`
        : `VO2max down ${Math.abs(vo2Trend.delta).toFixed(1)} ml/kg/min since the previous test`,
    })
  }

  if (lt2Trend && lt2Trend.isImprovement && (!vo2Trend || Math.abs(vo2Trend.delta) < 1)) {
    flags.push({
      key: 'lt2SpeedKmh',
      severity: 'info',
      label: locale === 'sv'
        ? `LT2 fart upp ${Math.abs(lt2Trend.delta).toFixed(1)} km/h med stabil VO2-profil`
        : `LT2 speed up ${Math.abs(lt2Trend.delta).toFixed(1)} km/h with a stable VO2 profile`,
    })
  }

  if (maxLactate != null && maxLactate < 8) {
    flags.push({
      key: 'maxLactate',
      severity: 'info',
      label: locale === 'sv'
        ? `Maxlaktat ${maxLactate.toFixed(1)} mmol/L, kontrollera maximal insats och profiltyp`
        : `Max lactate ${maxLactate.toFixed(1)} mmol/L; verify maximal effort and profile type`,
    })
  }

  if (flags.length === 0 && trends.some((trend) => trend.isImprovement)) {
    flags.push({
      key: 'progress',
      severity: 'info',
      label: locale === 'sv'
        ? 'Positiv testtrend jämfört med föregående hockeytest'
        : 'Positive test trend compared with the previous hockey test',
    })
  }

  return flags.slice(0, 4)
}

async function loadTests(clientId: string) {
  return prisma.hockeyPhysicalTest.findMany({
    where: { clientId },
    orderBy: [
      { testDate: 'desc' },
      { updatedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 80,
    select: {
      id: true,
      clientId: true,
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
      wingate30sAveragePower: true,
      vo2Max: true,
      lt1SpeedKmh: true,
      lt1HeartRate: true,
      lt1Lactate: true,
      lt2SpeedKmh: true,
      lt2HeartRate: true,
      lt2Lactate: true,
      maxLactate: true,
      maxHeartRate: true,
      rampTimeSeconds: true,
      backSquat1RM: true,
      powerClean1RM: true,
      benchPress1RM: true,
      pullUp1RM: true,
      muscleLabMaxima: true,
      teamId: true,
      team: { select: { id: true, name: true, userId: true } },
    },
  })
}

async function loadSavedHockeyNormReferences(
  teamId: string | null | undefined,
  preferredCoachIds: Array<string | null | undefined>,
) {
  if (!teamId) return []
  const uniqueCoachIds = Array.from(new Set(preferredCoachIds.filter((id): id is string => Boolean(id))))

  for (const coachId of uniqueCoachIds) {
    const saved = await prisma.hockeyNormReference.findMany({
      where: { teamId, coachId },
      orderBy: [
        { level: 'asc' },
        { metricKey: 'asc' },
        { position: 'asc' },
      ],
    })
    if (saved.length > 0) return saved
  }

  return []
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const locale = resolveRequestLocale(request, user.language)
    const { id: clientId } = await params
    const hasAccess = await canAccessClient(user.id, clientId)

    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const [tests, client] = await Promise.all([
      loadTests(clientId),
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          birthDate: true,
          position: true,
          weight: true,
          teamId: true,
          team: { select: { id: true, userId: true } },
        },
      }),
    ])
    const normTeamId = client?.teamId ?? tests[0]?.teamId ?? null
    const savedNormReferences = await loadSavedHockeyNormReferences(normTeamId, [
      user.id,
      client?.team?.userId,
      tests[0]?.team?.userId,
    ])
    const hockeyNormReferences = mergeHockeyNormReferences(savedNormReferences)
    const linkedProfiles = await getLinkedHockeyAerobicProfiles([clientId])
    const enrichedTests = tests.map((test) => (
      applyLinkedHockeyAerobicProfile(test, linkedProfiles.get(test.clientId))
    ))
    const history = enrichedTests.map((test) => toSummary(test, client?.birthDate ?? null, client?.weight ?? null, locale))
    const latest = history[0] ?? null
    const previous = history[1] ?? null
    const trends = buildTrends(latest, previous)
    const bests = buildBests(history)
    const normPosition = normalizeNormPosition(client?.position)
    const pathway = buildPathway(history, normPosition, client?.weight ?? null, hockeyNormReferences)
    const singleTestGoals = buildSingleTestGoals(
      latest,
      pathway.nextLevel?.level ?? latest?.developmentLevel,
      normPosition,
      client?.weight ?? null,
      hockeyNormReferences
    )

    return NextResponse.json({
      success: true,
      data: {
        latest,
        previous,
        bests,
        trends,
        flags: buildFlags(latest, trends, locale),
        history,
        pathway,
        singleTestGoals,
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

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
