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
import { buildRepeatedSprintProfile, percentile, repeatedSprintScore, round as roundHockey } from '@/lib/hockey/ice-speed'
import {
  buildHockeyNormGap,
  findHockeyNormReference,
  mergeHockeyNormReferences,
  type HockeyNormGap,
} from '@/lib/hockey/norm-references'
import { buildHockeyQualityFlags, type HockeyQualityFlag } from '@/lib/hockey/test-quality'
import {
  applyLinkedHockeyAerobicProfile,
  getLinkedHockeyAerobicProfiles,
} from '@/lib/hockey/aerobic-profile-link'

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
type HockeyNormGaps = Record<string, HockeyNormGap | null>

const DEFAULT_DAYS = 365
const HOCKEY_PATHWAY_YEARS = 5

const HOCKEY_LEVELS = ['J18', 'J20', 'A-team'] as const

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
  { key: 'wingate30sAveragePower', label: 'Wingate 30 s', unit: 'W' },
  { key: 'vo2Max', label: 'VO2max', unit: 'ml/kg/min' },
  { key: 'lt1SpeedKmh', label: 'LT1 fart', unit: 'km/h' },
  { key: 'lt1HeartRate', label: 'LT1 puls', unit: 'bpm' },
  { key: 'lt1Lactate', label: 'LT1 laktat', unit: 'mmol/L' },
  { key: 'lt2SpeedKmh', label: 'LT2 fart', unit: 'km/h' },
  { key: 'lt2HeartRate', label: 'LT2 puls', unit: 'bpm' },
  { key: 'lt2Lactate', label: 'LT2 laktat', unit: 'mmol/L' },
  { key: 'maxLactate', label: 'Max laktat', unit: 'mmol/L' },
  { key: 'maxHeartRate', label: 'Maxpuls', unit: 'bpm' },
  { key: 'rampTimeSeconds', label: 'Ramptid', unit: 's' },
  { key: 'sprint5m', label: '5m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint10m', label: '10m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint20m', label: '20m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint30m', label: '30m is', unit: 's', lowerIsBetter: true },
  { key: 'sprint20mFly', label: '20m fly', unit: 's', lowerIsBetter: true },
  { key: 'sprint30mFly', label: '30m fly', unit: 's', lowerIsBetter: true },
  { key: 'agilityBest', label: '5-10-5 bäst', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40Best', label: '7x40 bäst', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40Average', label: '7x40 snitt', unit: 's', lowerIsBetter: true },
  { key: 'endurance7x40AverageKmh', label: '7x40 snittfart', unit: 'km/h' },
  { key: 'endurance7x40Drop', label: '7x40 drop', unit: '%', lowerIsBetter: true },
  { key: 'endurance7x40Resistance', label: '7x40 resistance', unit: '%' },
  { key: 'endurance7x40Score', label: 'RSA score', unit: 'pts' },
]

const PATHWAY_METRIC_KEYS = [
  'muscleLabWkg',
  'sprint10m',
  'endurance7x40AverageKmh',
  'vo2Max',
  'lt2SpeedKmh',
  'backSquat1RM',
  'powerClean1RM',
] as const

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
  wingate30sAveragePower: number | null
  vo2Max: number | null
  lt1SpeedKmh: number | null
  lt1HeartRate: number | null
  lt1Lactate: number | null
  lt2SpeedKmh: number | null
  lt2HeartRate: number | null
  lt2Lactate: number | null
  maxLactate: number | null
  maxHeartRate: number | null
  rampTimeSeconds: number | null
  backSquat1RM: number | null
  powerClean1RM: number | null
  benchPress1RM: number | null
  pullUp1RM: number | null
  muscleLabMaxima: unknown
}

type TeamMemberForPathway = {
  id: string
  name: string
  birthDate: Date
  weight: number
  position: string | null
  sportProfile: {
    hockeySettings: unknown
  } | null
}

type HockeyPathwayTest = HockeyTestForSummary & {
  id: string
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
  const repeatedSprint = buildRepeatedSprintProfile(endurance)

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
    wingate30sAveragePower: round(test?.wingate30sAveragePower ?? null, 0),
    vo2Max: round(test?.vo2Max ?? null, 1),
    lt1SpeedKmh: round(test?.lt1SpeedKmh ?? null, 1),
    lt1HeartRate: test?.lt1HeartRate ?? null,
    lt1Lactate: round(test?.lt1Lactate ?? null, 1),
    lt2SpeedKmh: round(test?.lt2SpeedKmh ?? null, 1),
    lt2HeartRate: test?.lt2HeartRate ?? null,
    lt2Lactate: round(test?.lt2Lactate ?? null, 1),
    maxLactate: round(test?.maxLactate ?? null, 1),
    maxHeartRate: test?.maxHeartRate ?? null,
    rampTimeSeconds: test?.rampTimeSeconds ?? null,
    sprint5m: test?.sprint5m ?? null,
    sprint10m: test?.sprint10m ?? null,
    sprint20m: test?.sprint20m ?? null,
    sprint30m: test?.sprint30m ?? null,
    sprint20mFly: test?.sprint20mFly ?? null,
    sprint30mFly: test?.sprint30mFly ?? null,
    agilityBest: bestOf([test?.agility505Left, test?.agility505Right], true),
    endurance7x40Best: repeatedSprint.bestTimeS,
    endurance7x40Average: repeatedSprint.averageTimeS,
    endurance7x40AverageKmh: repeatedSprint.averageSpeedKmh,
    endurance7x40Drop: repeatedSprint.fatigueDropPct,
    endurance7x40Resistance: repeatedSprint.fatigueResistancePct,
    endurance7x40Score: null,
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

function averageMetric(rows: Array<Record<string, number | null>>, key: string, unit = ''): number | null {
  const values = rows.map((row) => row[key]).filter((value): value is number => value != null)
  if (values.length === 0) return null
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, unit === 's' ? 2 : 1)
}

function normComparableValue(metricValue: number | null | undefined, unit: string, bodyWeightKg: number | null | undefined): number | null {
  if (metricValue == null || !Number.isFinite(metricValue)) return null
  if (unit === 'xBW') {
    return bodyWeightKg && bodyWeightKg > 0 ? round(metricValue / bodyWeightKg, 2) : null
  }
  return metricValue
}

function buildHockeyPathway(teamMembers: TeamMemberForPathway[], tests: HockeyPathwayTest[], teamName: string) {
  const testsByAthlete = new Map<string, HockeyPathwayTest[]>()
  for (const test of tests) {
    const existing = testsByAthlete.get(test.clientId) ?? []
    existing.push(test)
    testsByAthlete.set(test.clientId, existing)
  }

  const athletes = teamMembers.map((member) => {
    const athleteTests = (testsByAthlete.get(member.id) ?? [])
      .sort((a, b) => a.testDate.getTime() - b.testDate.getTime())
    const bySeason = new Map<string, HockeyPathwayTest[]>()
    for (const test of athleteTests) {
      const season = seasonLabel(test.testDate)
      bySeason.set(season, [...(bySeason.get(season) ?? []), test])
    }

    const seasons = Array.from(bySeason.entries()).map(([season, seasonTests]) => {
      const first = seasonTests[0]
      const last = seasonTests[seasonTests.length - 1]
      const ages = seasonTests
        .map((test) => ageAtDate(member.birthDate, test.testDate))
        .filter((age): age is number => age != null)
      const startMetrics = metricValuesForTest(first)
      const endMetrics = metricValuesForTest(last)
      const changes = Object.fromEntries(
        PATHWAY_METRIC_KEYS.map((key) => {
          const metric = HOCKEY_METRICS.find((candidate) => candidate.key === key)
          return [key, improvementDelta(metric ?? { key, label: key, unit: '' }, endMetrics[key], startMetrics[key])]
        })
      ) as HockeyMetricValues
      const minAge = ages.length ? Math.min(...ages) : null
      const maxAge = ages.length ? Math.max(...ages) : null

      return {
        season,
        level: developmentLevel(maxAge, teamName, member.sportProfile?.hockeySettings),
        testCount: seasonTests.length,
        firstDate: first.testDate.toISOString().slice(0, 10),
        lastDate: last.testDate.toISOString().slice(0, 10),
        ageRange: minAge == null || maxAge == null ? null : minAge === maxAge ? `${minAge}` : `${minAge}-${maxAge}`,
        metrics: endMetrics,
        changes,
      }
    })

    const latestTest = athleteTests[athleteTests.length - 1]
    const latestMetrics = latestTest ? metricValuesForTest(latestTest) : {}
    const latestAge = latestTest ? ageAtDate(member.birthDate, latestTest.testDate) : ageAtDate(member.birthDate, new Date())
    const latestLevel = seasons[seasons.length - 1]?.level
      ?? developmentLevel(latestAge, teamName, member.sportProfile?.hockeySettings)
    const totalPositiveChanges = seasons.reduce((count, season) => (
      count + PATHWAY_METRIC_KEYS.filter((key) => (season.changes[key] ?? 0) > 0).length
    ), 0)
    const watchCount = ['muscleLabWkg', 'sprint10m', 'endurance7x40AverageKmh', 'vo2Max'].filter((key) => latestMetrics[key] == null).length

    return {
      id: member.id,
      name: member.name,
      position: member.position,
      currentLevel: latestLevel,
      latestAge,
      latestTestDate: latestTest?.testDate.toISOString().slice(0, 10) ?? null,
      seasonCount: seasons.length,
      testCount: athleteTests.length,
      positiveChangeCount: totalPositiveChanges,
      watchCount,
      seasons,
    }
  })

  const seasonKeys = Array.from(new Set(athletes.flatMap((athlete) => athlete.seasons.map((season) => season.season)))).sort()
  const seasonSummaries = seasonKeys.map((season) => {
    const athleteSeasons = athletes.flatMap((athlete) => athlete.seasons
      .filter((entry) => entry.season === season)
      .map((entry) => ({ athleteId: athlete.id, level: entry.level, testCount: entry.testCount, metrics: entry.metrics })))
    const levelCounts = athleteSeasons.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.level] = (acc[entry.level] ?? 0) + 1
      return acc
    }, {})
    const metricRows = athleteSeasons.map((entry) => entry.metrics)

    return {
      season,
      athleteCount: new Set(athleteSeasons.map((entry) => entry.athleteId)).size,
      testCount: athleteSeasons.reduce((sum, entry) => sum + entry.testCount, 0),
      levelCounts,
      metrics: Object.fromEntries(
        PATHWAY_METRIC_KEYS.map((key) => {
          const metric = HOCKEY_METRICS.find((candidate) => candidate.key === key)
          return [key, averageMetric(metricRows, key, metric?.unit)]
        })
      ),
    }
  })

  const latestLevelCounts = athletes.reduce<Record<string, number>>((acc, athlete) => {
    acc[athlete.currentLevel] = (acc[athlete.currentLevel] ?? 0) + 1
    return acc
  }, {})
  const promoted = athletes
    .filter((athlete) => {
      const levels = athlete.seasons.map((season) => season.level).filter((level) => level !== 'Unknown')
      return new Set(levels).size > 1
    })
    .sort((a, b) => b.seasonCount - a.seasonCount)
    .slice(0, 6)
  const watch = athletes
    .filter((athlete) => athlete.testCount > 0)
    .sort((a, b) => b.watchCount - a.watchCount || a.name.localeCompare(b.name, 'sv'))
    .slice(0, 6)

  return {
    metrics: HOCKEY_METRICS.filter((metric) => PATHWAY_METRIC_KEYS.includes(metric.key as (typeof PATHWAY_METRIC_KEYS)[number])),
    seasonSummaries,
    athletes,
    latestLevelCounts,
    promoted,
    watch,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined

    const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
    if (!accessibleTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId },
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

    const memberIds = team.members.map((m) => m.id)
    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, data: { sessions: [] } })
    }

    const since = new Date()
    since.setDate(since.getDate() - DEFAULT_DAYS)
    const pathwaySince = new Date()
    pathwaySince.setFullYear(pathwaySince.getFullYear() - HOCKEY_PATHWAY_YEARS)

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

    const hockeyTestsRaw = await prisma.hockeyPhysicalTest.findMany({
      where: {
        clientId: { in: memberIds },
        testDate: { gte: pathwaySince },
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
      },
    })
    const linkedProfiles = await getLinkedHockeyAerobicProfiles(memberIds)
    const hockeyTests = hockeyTestsRaw.map((test) => (
      applyLinkedHockeyAerobicProfile(test, linkedProfiles.get(test.clientId))
    ))

    const savedNormReferences = await prisma.hockeyNormReference.findMany({
      where: {
        teamId,
        coachId: user.id,
      },
      orderBy: [
        { level: 'asc' },
        { metricKey: 'asc' },
        { position: 'asc' },
      ],
    })
    const hockeyNormReferences = mergeHockeyNormReferences(savedNormReferences)

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
        aerobicAutoLinked: latest?.aerobicAutoLinked === true,
        aerobicAutoLinkSource: latest?.aerobicAutoLinkSource ?? null,
        aerobicAutoLinkDate: latest?.aerobicAutoLinkDate ?? null,
        metrics,
        ranks: {} as HockeyMetricRanks,
        benchmarks: {} as HockeyMetricBenchmarks,
        normGaps: {} as HockeyNormGaps,
        qualityFlags: latest
          ? buildHockeyQualityFlags({
              metrics: {
                ...metrics,
                gripStrengthLeft: latest.gripStrengthLeft,
                gripStrengthRight: latest.gripStrengthRight,
                threeJumpLeft: latest.threeJumpLeft,
                threeJumpRight: latest.threeJumpRight,
                agility505Left: latest.agility505Left,
                agility505Right: latest.agility505Right,
              },
              endurance7x40: latest.endurance7x40,
              muscleLabMaxima: latest.muscleLabMaxima,
            })
          : [] as HockeyQualityFlag[],
      }
    })

    const repeatedSprintComponents = hockeyAthletes.map((athlete) => ({
      athlete,
      averageSpeed: athlete.metrics.endurance7x40AverageKmh,
      bestSpeed: athlete.metrics.endurance7x40Best != null ? (40 / athlete.metrics.endurance7x40Best) * 3.6 : null,
      resistance: athlete.metrics.endurance7x40Resistance,
    }))
    const averageSpeedValues = repeatedSprintComponents
      .map((entry) => entry.averageSpeed)
      .filter((value): value is number => value != null && Number.isFinite(value))
    const bestSpeedValues = repeatedSprintComponents
      .map((entry) => entry.bestSpeed)
      .filter((value): value is number => value != null && Number.isFinite(value))
    const resistanceValues = repeatedSprintComponents
      .map((entry) => entry.resistance)
      .filter((value): value is number => value != null && Number.isFinite(value))

    for (const entry of repeatedSprintComponents) {
      entry.athlete.metrics.endurance7x40Score = repeatedSprintScore({
        averageSpeedPercentile: entry.averageSpeed == null ? null : percentile(entry.averageSpeed, averageSpeedValues),
        bestSpeedPercentile: entry.bestSpeed == null ? null : percentile(entry.bestSpeed, bestSpeedValues),
        fatigueResistancePercentile: entry.resistance == null ? null : percentile(entry.resistance, resistanceValues),
      })
    }

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
            ? roundHockey((orientedValue - positionMean) / positionSd, 2)
            : null
        }

        athlete.benchmarks[metric.key] = value == null
          ? null
          : {
              zScore: orientedValue != null && teamMean != null && teamSd != null
                ? roundHockey((orientedValue - teamMean) / teamSd, 2)
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

    const pathway = buildHockeyPathway(team.members, hockeyTests, team.name)
    const pathwayLevelByAthlete = new Map(pathway.athletes.map((athlete) => [athlete.id, athlete.currentLevel]))
    const memberById = new Map(team.members.map((member) => [member.id, member]))

    for (const athlete of hockeyAthletes) {
      const member = memberById.get(athlete.id)
      const level = pathwayLevelByAthlete.get(athlete.id) ?? 'Unknown'
      for (const metric of HOCKEY_METRICS) {
        const norm = findHockeyNormReference(hockeyNormReferences, level, athlete.position.key, metric.key)
        const comparableValue = normComparableValue(athlete.metrics[metric.key], norm?.unit ?? metric.unit, member?.weight)
        athlete.normGaps[metric.key] = buildHockeyNormGap(comparableValue, norm)
      }
    }

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
          pathway,
          normReferences: hockeyNormReferences,
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
