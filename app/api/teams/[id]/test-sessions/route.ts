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
import { percentile, repeatedSprintScore, round as roundHockey } from '@/lib/hockey/ice-speed'
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
import {
  HOCKEY_METRICS,
  PATHWAY_METRIC_KEYS,
  averageMetric,
  benchmarkBand,
  improvementDelta,
  mean,
  metricValuesForTest,
  normComparableValue,
  orientedMetricValue,
  percentileFromRank,
  round,
  standardDeviation,
  type HockeyBenchmarkBand,
  type HockeyMetric,
  type HockeyMetricValues,
  type HockeyTestForSummary,
} from '@/lib/hockey/team-test-metrics'

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

type AppLocale = 'en' | 'sv'
type HockeyMetricRanks = Record<string, { rank: number; percentile: number } | null>
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

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const HOCKEY_METRIC_LABELS_EN: Record<string, string> = {
  backSquat1RM: 'Back squat',
  benchPress1RM: 'Bench press',
  gripMax: 'Grip max',
  standingLongJump: 'Standing long jump',
  threeJumpBest: 'Best triple jump',
  beepScore: 'Beep test',
  lt1SpeedKmh: 'LT1 speed',
  lt1HeartRate: 'LT1 heart rate',
  lt1Lactate: 'LT1 lactate',
  lt2SpeedKmh: 'LT2 speed',
  lt2HeartRate: 'LT2 heart rate',
  lt2Lactate: 'LT2 lactate',
  maxLactate: 'Max lactate',
  maxHeartRate: 'Max heart rate',
  rampTimeSeconds: 'Ramp time',
  agilityBest: 'Best 5-10-5',
  endurance7x40Best: 'Best 7x40',
  endurance7x40Average: '7x40 average',
  endurance7x40AverageKmh: '7x40 average speed',
  endurance7x40Drop: '7x40 drop',
}

function localizeHockeyMetric(metric: HockeyMetric, locale: AppLocale): HockeyMetric {
  if (locale === 'sv') return metric
  return {
    ...metric,
    label: HOCKEY_METRIC_LABELS_EN[metric.key] ?? metric.label,
    unit: metric.unit === 'nivå' ? 'level' : metric.unit,
  }
}

function localizedHockeyMetrics(locale: AppLocale): HockeyMetric[] {
  return HOCKEY_METRICS.map((metric) => localizeHockeyMetric(metric, locale))
}

function normalizeHockeyPosition(position: string | null | undefined, locale: AppLocale): { key: string; label: string } {
  const raw = (position ?? '').trim().toLowerCase()
  if (!raw) return { key: 'unknown', label: t(locale, 'Position missing', 'Position saknas') }
  if (['g', 'goalie', 'goalkeeper', 'målvakt', 'malvakt'].some((needle) => raw.includes(needle))) {
    return { key: 'G', label: t(locale, 'Goalie', 'Målvakt') }
  }
  if (['d', 'defense', 'defence', 'defender', 'back'].some((needle) => raw === needle || raw.includes(needle))) {
    return { key: 'D', label: t(locale, 'Defense', 'Back') }
  }
  if (['c', 'center', 'centre', 'centerforward'].some((needle) => raw === needle || raw.includes(needle))) {
    return { key: 'C', label: 'Center' }
  }
  if (['w', 'wing', 'winger', 'forward', 'fwd', 'lw', 'rw'].some((needle) => raw === needle || raw.includes(needle))) {
    return { key: 'W', label: t(locale, 'Forward/wing', 'Forward/ving') }
  }
  return { key: raw.toUpperCase().slice(0, 12), label: position ?? t(locale, 'Other', 'Övrig') }
}

function buildHockeyPathway(teamMembers: TeamMemberForPathway[], tests: HockeyPathwayTest[], teamName: string, locale: AppLocale) {
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
    metrics: localizedHockeyMetrics(locale).filter((metric) => PATHWAY_METRIC_KEYS.includes(metric.key as (typeof PATHWAY_METRIC_KEYS)[number])),
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
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = user.language === 'sv' ? 'sv' : 'en'
    const { id: teamId } = await params
    const businessSlug = request.nextUrl.searchParams.get('businessSlug') ?? undefined

    const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
    if (!accessibleTeam) {
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
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
      return NextResponse.json({ error: t(locale, 'Team not found', 'Laget hittades inte') }, { status: 404 })
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
        exercise: { select: { name: true, nameSv: true, nameEn: true } },
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
        exerciseName: locale === 'sv'
          ? r.exercise.nameSv || r.exercise.nameEn || r.exercise.name || 'Övning'
          : r.exercise.nameEn || r.exercise.name || r.exercise.nameSv || 'Exercise',
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
        position: normalizeHockeyPosition(member.position, locale),
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
            }, locale)
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
        ...localizeHockeyMetric(metric, locale),
        coverage: values.length,
        average: avg,
        leader: values[0] ?? null,
      }
    })

    const pathway = buildHockeyPathway(team.members, hockeyTests, team.name, locale)
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
    ).sort((a, b) => a.label.localeCompare(b.label, locale === 'sv' ? 'sv' : 'en'))

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
        ...localizeHockeyMetric(metric, locale),
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
          metrics: localizedHockeyMetrics(locale),
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
      { error: t(locale, 'Failed to fetch test sessions', 'Kunde inte hämta testpass') },
      { status: 500 }
    )
  }
}
