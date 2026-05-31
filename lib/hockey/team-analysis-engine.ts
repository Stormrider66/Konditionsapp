/**
 * Team Analysis Engine
 *
 * Pure (Prisma-free) analysis logic for the "Lagets analys" team summary.
 * Extracted from app/api/teams/[id]/analysis-summary/route.ts so the route
 * stays a thin HTTP+Prisma wrapper around these testable functions.
 */

import {
  buildHockeyNormGap,
  findHockeyNormReference,
  type HockeyNormReferenceConfig,
} from '@/lib/hockey/norm-references'
import {
  HOCKEY_METRICS,
  improvementDelta,
  localizeHockeyMetric,
  metricValuesForTest,
  normComparableValue,
  percentileFromRank,
  round,
  type HockeyMetric,
  type HockeyTestForSummary,
} from '@/lib/hockey/team-test-metrics'
import {
  buildHockeyAerobicFieldsFromLabTest,
  hasHockeyAerobicData,
} from '@/lib/hockey/aerobic-profile-link'

export type AcwrZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL' | 'UNKNOWN'
export type AppLocale = 'en' | 'sv'
export type ScoreTone = 'good' | 'watch' | 'risk' | 'neutral'
export type MetricCategory = 'hockey' | 'strength'
export type LocalizedExerciseName = { name: string; nameSv: string | null; nameEn: string | null }

/** Hockey season starts July 1 — a test in Aug 2025 belongs to season "2025/26". */
const SEASON_START_MONTH = 6 // July (0-indexed)

function seasonStartYear(date: Date): number {
  return date.getMonth() >= SEASON_START_MONTH ? date.getFullYear() : date.getFullYear() - 1
}

function seasonLabel(startYear: number): string {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`
}

/** Map a stored position string onto the C/W/D/G norm buckets (else null). */
export function normalizeHockeyPosition(position: string | null | undefined): HockeyPosition | null {
  const p = (position ?? '').trim().toUpperCase()
  if (!p) return null
  if (p.startsWith('G') || p.includes('GOAL') || p.includes('MÅLVAKT')) return 'G'
  if (p.startsWith('D') || p.includes('BACK') || p.includes('FÖRSVAR')) return 'D'
  if (p.startsWith('C') || p.includes('CENTER') || p.includes('CENTRE')) return 'C'
  if (p.startsWith('W') || p.includes('WING') || p.startsWith('F') || p.includes('FORWARD') || p.includes('ANFALL')) return 'W'
  return null
}

/**
 * Position-adjusted 0-100 score for one value against a target/elite norm
 * (already converted to the metric's unit). Scale: 70 = meets target,
 * 100 = elite, 0 = a floor symmetric below target.
 */
export function normScore(value: number, target: number, elite: number, lowerIsBetter: boolean): number {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))
  if (lowerIsBetter) {
    const span = target - elite
    if (span <= 0) return value <= target ? 100 : 0
    if (value <= elite) return 100
    if (value <= target) return clamp(70 + (30 * (target - value)) / span)
    const floor = target + span
    if (value >= floor) return 0
    return clamp((70 * (floor - value)) / (floor - target))
  }
  const span = elite - target
  if (span <= 0) return value >= target ? 100 : 0
  if (value >= elite) return 100
  if (value >= target) return clamp(70 + (30 * (value - target)) / span)
  const floor = target - span
  if (value <= floor) return 0
  return clamp((70 * (value - floor)) / (target - floor))
}

export interface MemberSummary {
  clientId: string
  name: string
  acwr: { value: number; zone: AcwrZone; asOf: string } | null
  daysSinceLastActivity: number | null
  recentPRs: number
  totalPRs: number
  testCount: number
}

export interface NeedsAttentionEntry {
  clientId: string
  name: string
  reasons: string[]
}

export interface RecentPR {
  id: string
  clientId: string
  clientName: string
  exerciseName: string
  oneRepMax: number
  previousMax: number | null
  date: string
  source: string
  unit: string
}

export interface PendingPR {
  id: string
  clientId: string
  clientName: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  date: string
  unit: string
}

export interface EvaluationScore {
  key: string
  label: string
  value: number
  detail: string
  tone: ScoreTone
}

export interface TrainingQualityAthlete {
  clientId: string
  name: string
  assigned: number
  completed: number
  missed: number
  completionRate: number
}

export interface TrainingQuality {
  periodDays: number
  assigned: number
  completed: number
  missed: number
  completionRate: number
  lowCompletionAthletes: TrainingQualityAthlete[]
  missedAthletes: TrainingQualityAthlete[]
  completingWithoutProgress: TrainingQualityAthlete[]
  progressingDespiteLowCompletion: TrainingQualityAthlete[]
}

export interface AdaptiveMetricAthlete {
  clientId: string
  name: string
  latest: number | null
  previous: number | null
  delta: number | null
  percentChange: number | null
  latestDate: string | null
  previousDate: string | null
  rank: number | null
  percentile: number | null
  targetGap: number | null
  /**
   * Position-adjusted 0-100 sub-score for this metric (70 = meets position
   * target, 100 = elite). Null when the athlete has no value or no resolvable
   * norm. Averaged across metrics to form the player composite.
   */
  score: number | null
  missing: boolean
}

export type HockeyPosition = 'C' | 'W' | 'D' | 'G'

export interface PlayerScore {
  clientId: string
  name: string
  position: string | null
  pos: HockeyPosition | null
  /** Composite 0-100 (mean of per-metric sub-scores), null when no scored tests. */
  total: number | null
  /** How many metrics contributed to the composite. */
  count: number
}

export interface SeasonAnalysis {
  key: string
  label: string
  metricGroups: MetricGroup[]
  scores: PlayerScore[]
}

export interface AdaptiveMetricRow {
  key: string
  label: string
  unit: string
  category: MetricCategory
  lowerIsBetter: boolean
  coverage: number
  teamAverage: number | null
  target: number | null
  elite: number | null
  leader: { clientId: string; name: string; value: number } | null
  athletes: AdaptiveMetricAthlete[]
}

export interface MetricGroup {
  id: MetricCategory
  label: string
  metrics: AdaptiveMetricRow[]
}

export interface GoalReadinessMetric {
  key: string
  label: string
  unit: string
  category: MetricCategory
  target: number
  elite: number | null
  coverage: number
  teamAverage: number | null
  aboveTarget: number
  closeToTarget: number
  belowTarget: number
  missing: number
  readiness: number
}

export interface GoalReadiness {
  level: string
  metrics: GoalReadinessMetric[]
  overallReadiness: number
}

export interface ProgressSummary {
  improvedAthletes: number
  stalledAthletes: number
  improvedMetrics: number
  totalMetricsWithChange: number
  topImprovers: Array<{
    clientId: string
    name: string
    metricLabel: string
    delta: number
    unit: string
  }>
}

export const RECENT_DAYS = 30
export const STALE_ACTIVITY_DAYS = 5
export const CLOSE_TO_TARGET_RATIO = 0.05

export function buildMetricGroups({
  members,
  hockeyTests,
  oneRepMaxRows,
  norms,
  teamLevel,
  locale,
}: {
  members: Array<{ id: string; name: string; weight: number; position: string | null }>
  hockeyTests: HockeyTestForSummary[]
  oneRepMaxRows: Array<{
    clientId: string
    exerciseId: string
    oneRepMax: number
    unit: string
    date: Date
    exercise: { id: string } & LocalizedExerciseName
  }>
  norms: HockeyNormReferenceConfig[]
  teamLevel: string
  locale: AppLocale
}): MetricGroup[] {
  const hockeyMetrics = buildHockeyMetricRows(members, hockeyTests, norms, teamLevel, locale)
  const strengthMetrics = buildStrengthMetricRows(members, oneRepMaxRows, locale)
  return [
    { id: 'hockey' as const, label: t(locale, 'Tests', 'Tester'), metrics: hockeyMetrics },
    { id: 'strength' as const, label: t(locale, 'Strength PRs', 'Styrke-PRs'), metrics: strengthMetrics },
  ].filter((group) => group.metrics.length > 0)
}

type OneRepMaxRow = {
  clientId: string
  exerciseId: string
  oneRepMax: number
  unit: string
  date: Date
  exercise: { id: string } & LocalizedExerciseName
}

/**
 * Composite 0-100 profile score per player: the mean of each player's
 * position-adjusted per-metric sub-scores across the supplied groups.
 */
export function buildPlayerScores(
  members: Array<{ id: string; name: string; position: string | null }>,
  groups: MetricGroup[]
): PlayerScore[] {
  const metrics = groups.flatMap((group) => group.metrics)
  return members.map((member) => {
    const subs: number[] = []
    for (const metric of metrics) {
      const athlete = metric.athletes.find((a) => a.clientId === member.id)
      if (athlete && athlete.score != null) subs.push(athlete.score)
    }
    const total = subs.length ? Math.round(subs.reduce((sum, v) => sum + v, 0) / subs.length) : null
    return {
      clientId: member.id,
      name: member.name,
      position: member.position,
      pos: normalizeHockeyPosition(member.position),
      total,
      count: subs.length,
    }
  })
}

/**
 * Bucket all test/PR history into hockey seasons (July 1 boundary) and build a
 * full MetricGroup[] + composite scores per season, newest first. Seasons with
 * no usable data are dropped, keeping the view adaptive across years too.
 */
export function buildSeasonAnalyses({
  members,
  hockeyTests,
  oneRepMaxRows,
  norms,
  teamLevel,
  locale,
  maxSeasons = 3,
}: {
  members: Array<{ id: string; name: string; weight: number; position: string | null }>
  hockeyTests: HockeyTestForSummary[]
  oneRepMaxRows: OneRepMaxRow[]
  norms: HockeyNormReferenceConfig[]
  teamLevel: string
  locale: AppLocale
  maxSeasons?: number
}): SeasonAnalysis[] {
  const years = new Set<number>()
  for (const test of hockeyTests) years.add(seasonStartYear(test.testDate))
  for (const row of oneRepMaxRows) years.add(seasonStartYear(row.date))

  const orderedYears = Array.from(years).sort((a, b) => b - a).slice(0, maxSeasons)

  return orderedYears
    .map((year) => {
      const seasonTests = hockeyTests.filter((test) => seasonStartYear(test.testDate) === year)
      const seasonRows = oneRepMaxRows.filter((row) => seasonStartYear(row.date) === year)
      const metricGroups = buildMetricGroups({
        members,
        hockeyTests: seasonTests,
        oneRepMaxRows: seasonRows,
        norms,
        teamLevel,
        locale,
      })
      return {
        key: String(year),
        label: seasonLabel(year),
        metricGroups,
        scores: buildPlayerScores(members, metricGroups),
      }
    })
    .filter((season) => season.metricGroups.length > 0)
}

type LabTestForSummary = Parameters<typeof buildHockeyAerobicFieldsFromLabTest>[0] & {
  clientId: string
  testDate: Date
}

export function labTestToHockeySummary(test: LabTestForSummary): HockeyTestForSummary | null {
  const aerobic = buildHockeyAerobicFieldsFromLabTest(test)
  if (!hasHockeyAerobicData(aerobic)) return null

  return {
    clientId: test.clientId,
    testDate: test.testDate,
    sprint5m: null,
    sprint10m: null,
    sprint20m: null,
    sprint30m: null,
    sprint20mFly: null,
    sprint30mFly: null,
    agility505Left: null,
    agility505Right: null,
    endurance7x40: null,
    gripStrengthLeft: null,
    gripStrengthRight: null,
    standingLongJump: null,
    threeJumpLeft: null,
    threeJumpRight: null,
    beepTestLevel: null,
    beepTestShuttle: null,
    wingate30sAveragePower: null,
    vo2Max: aerobic.vo2Max ?? null,
    lt1SpeedKmh: aerobic.lt1SpeedKmh ?? null,
    lt1HeartRate: aerobic.lt1HeartRate ?? null,
    lt1Lactate: aerobic.lt1Lactate ?? null,
    lt2SpeedKmh: aerobic.lt2SpeedKmh ?? null,
    lt2HeartRate: aerobic.lt2HeartRate ?? null,
    lt2Lactate: aerobic.lt2Lactate ?? null,
    maxLactate: aerobic.maxLactate ?? null,
    maxHeartRate: aerobic.maxHeartRate ?? null,
    rampTimeSeconds: aerobic.rampTimeSeconds ?? null,
    backSquat1RM: null,
    powerClean1RM: null,
    benchPress1RM: null,
    pullUp1RM: null,
    muscleLabMaxima: null,
  }
}

export function buildHockeyMetricRows(
  members: Array<{ id: string; name: string; weight: number; position: string | null }>,
  tests: HockeyTestForSummary[],
  norms: HockeyNormReferenceConfig[],
  teamLevel: string,
  locale: AppLocale
): AdaptiveMetricRow[] {
  const testsByAthlete = new Map<string, HockeyTestForSummary[]>()
  for (const test of tests) {
    const arr = testsByAthlete.get(test.clientId) ?? []
    arr.push(test)
    testsByAthlete.set(test.clientId, arr)
  }
  for (const arr of testsByAthlete.values()) {
    arr.sort((a, b) => b.testDate.getTime() - a.testDate.getTime())
  }

  return HOCKEY_METRICS
    .map((metric) => {
      const row = buildMetricRow({
        metric,
        category: 'hockey',
        members,
        valuesByAthlete: new Map(members.map((member) => {
          const values = (testsByAthlete.get(member.id) ?? [])
            .map((test) => ({
              date: test.testDate,
              value: metricValuesForTest(test)[metric.key],
            }))
            .filter((row): row is { date: Date; value: number } => row.value != null)
          return [member.id, values]
        })),
        normResolver: (member) => findHockeyNormReference(
          norms,
          teamLevel,
          member.position ?? 'All',
          metric.key
        ),
      })
      if (!row) return null
      const localizedMetric = localizeHockeyMetric(metric, locale)
      return {
        ...row,
        label: localizedMetric.label,
        unit: localizedMetric.unit,
      }
    })
    .filter((metric): metric is AdaptiveMetricRow => Boolean(metric && metric.coverage > 0))
}

export function buildStrengthMetricRows(
  members: Array<{ id: string; name: string; weight: number; position: string | null }>,
  oneRepMaxRows: Array<{
    clientId: string
    exerciseId: string
    oneRepMax: number
    unit: string
    date: Date
    exercise: { id: string } & LocalizedExerciseName
  }>,
  locale: AppLocale
): AdaptiveMetricRow[] {
  const exerciseIds = Array.from(new Set(oneRepMaxRows.map((row) => row.exerciseId)))
  return exerciseIds
    .map((exerciseId) => {
      const sample = oneRepMaxRows.find((row) => row.exerciseId === exerciseId)
      if (!sample) return null
      const metric: HockeyMetric = {
        key: `strength:${exerciseId}`,
        label: exerciseNameForLocale(sample.exercise, locale),
        unit: sample.unit || 'KG',
      }
      const valuesByAthlete = new Map<string, Array<{ date: Date; value: number }>>()
      for (const member of members) {
        valuesByAthlete.set(
          member.id,
          oneRepMaxRows
            .filter((row) => row.clientId === member.id && row.exerciseId === exerciseId)
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((row) => ({ date: row.date, value: row.oneRepMax }))
        )
      }
      return buildMetricRow({
        metric,
        category: 'strength',
        members,
        valuesByAthlete,
      })
    })
    .filter((metric): metric is AdaptiveMetricRow => Boolean(metric && metric.coverage > 0))
    .sort((a, b) => b.coverage - a.coverage || a.label.localeCompare(b.label, locale === 'sv' ? 'sv' : 'en'))
}

export function buildMetricRow({
  metric,
  category,
  members,
  valuesByAthlete,
  normResolver,
}: {
  metric: HockeyMetric
  category: MetricCategory
  members: Array<{ id: string; name: string; weight: number; position: string | null }>
  valuesByAthlete: Map<string, Array<{ date: Date; value: number }>>
  normResolver?: (member: { id: string; name: string; weight: number; position: string | null }) => HockeyNormReferenceConfig | null
}): AdaptiveMetricRow | null {
  const latestValues = members
    .map((member) => {
      const values = valuesByAthlete.get(member.id) ?? []
      const latest = values[0]
      return latest ? { member, value: latest.value } : null
    })
    .filter((row): row is { member: typeof members[number]; value: number } => Boolean(row))

  if (latestValues.length === 0) return null

  const ranked = latestValues
    .slice()
    .sort((a, b) => metric.lowerIsBetter ? a.value - b.value : b.value - a.value)
  const rankByClient = new Map(ranked.map((row, index) => [
    row.member.id,
    {
      rank: index + 1,
      percentile: percentileFromRank(index + 1, ranked.length),
    },
  ]))

  const targetRows = members
    .map((member) => {
      const norm = normResolver?.(member)
      if (!norm) return null
      return {
        target: comparableNormValue(norm.target, norm.unit, metric.unit, member.weight),
        elite: comparableNormValue(norm.elite, norm.unit, metric.unit, member.weight),
      }
    })
    .filter((row): row is { target: number; elite: number | null } => (
      row != null && row.target != null && Number.isFinite(row.target)
    ))
  const target = targetRows.length > 0
    ? round(targetRows.reduce((sum, row) => sum + row.target, 0) / targetRows.length, metric.unit === 's' ? 2 : 1)
    : null
  const eliteRows = targetRows.filter((row) => row.elite != null && Number.isFinite(row.elite))
  const elite = eliteRows.length > 0
    ? round(eliteRows.reduce((sum, row) => sum + (row.elite ?? 0), 0) / eliteRows.length, metric.unit === 's' ? 2 : 1)
    : null

  const athletes = members.map((member): AdaptiveMetricAthlete => {
    const values = valuesByAthlete.get(member.id) ?? []
    const latest = values[0] ?? null
    const previous = values[1] ?? null
    const delta = improvementDelta(metric, latest?.value ?? null, previous?.value ?? null)
    const percentChange = delta != null && previous?.value
      ? round((delta / previous.value) * 100, 1)
      : null
    const norm = normResolver?.(member)
    const comparableValue = norm
      ? normComparableValue(latest?.value ?? null, norm.unit, member.weight)
      : latest?.value ?? null
    const normGap = comparableValue == null || !norm
      ? null
      : buildHockeyNormGap(comparableValue, norm)
    const targetGap = normGap && norm
      ? comparableNormGap(normGap.gapToTarget, norm.unit, metric.unit, member.weight)
      : null
    const rank = rankByClient.get(member.id)

    // Position-adjusted 0-100 sub-score: grade the athlete's value against
    // their own position's target/elite (both converted to the metric's unit).
    let score: number | null = null
    if (norm && latest?.value != null) {
      const scoreTarget = comparableNormValue(norm.target, norm.unit, metric.unit, member.weight)
      const scoreElite = comparableNormValue(norm.elite, norm.unit, metric.unit, member.weight)
      if (scoreTarget != null && Number.isFinite(scoreTarget) && scoreElite != null && Number.isFinite(scoreElite)) {
        score = normScore(latest.value, scoreTarget, scoreElite, metric.lowerIsBetter === true)
      }
    }

    return {
      clientId: member.id,
      name: member.name,
      latest: latest?.value ?? null,
      previous: previous?.value ?? null,
      delta,
      percentChange,
      latestDate: latest?.date.toISOString() ?? null,
      previousDate: previous?.date.toISOString() ?? null,
      rank: rank?.rank ?? null,
      percentile: rank?.percentile ?? null,
      targetGap,
      score,
      missing: !latest,
    }
  })

  return {
    key: metric.key,
    label: metric.label,
    unit: metric.unit,
    category,
    lowerIsBetter: metric.lowerIsBetter === true,
    coverage: latestValues.length,
    teamAverage: round(
      latestValues.reduce((sum, row) => sum + row.value, 0) / latestValues.length,
      metric.unit === 's' ? 2 : 1
    ),
    target,
    elite,
    leader: ranked[0]
      ? { clientId: ranked[0].member.id, name: ranked[0].member.name, value: ranked[0].value }
      : null,
    athletes,
  }
}

export function buildGoalReadiness(metrics: AdaptiveMetricRow[], level: string): GoalReadiness {
  const readinessMetrics: GoalReadinessMetric[] = metrics
    .flatMap((metric) => {
      const target = metric.target
      if (target == null) return []
      let aboveTarget = 0
      let closeToTarget = 0
      let belowTarget = 0
      let missing = 0
      for (const athlete of metric.athletes) {
        if (athlete.latest == null) {
          missing++
          continue
        }
        const reached = metric.lowerIsBetter
          ? athlete.latest <= target
          : athlete.latest >= target
        const distanceRatio = target === 0
          ? 1
          : Math.abs((athlete.latest - target) / target)
        if (reached) aboveTarget++
        else if (distanceRatio <= CLOSE_TO_TARGET_RATIO) closeToTarget++
        else belowTarget++
      }
      const measured = aboveTarget + closeToTarget + belowTarget
      const readiness = measured > 0
        ? Math.round(((aboveTarget + closeToTarget * 0.5) / measured) * 100)
        : 0
      return [{
        key: metric.key,
        label: metric.label,
        unit: metric.unit,
        category: metric.category,
        target,
        elite: metric.elite,
        coverage: metric.coverage,
        teamAverage: metric.teamAverage,
        aboveTarget,
        closeToTarget,
        belowTarget,
        missing,
        readiness,
      }]
    })
    .sort((a, b) => b.coverage - a.coverage || a.label.localeCompare(b.label, 'sv'))

  return {
    level,
    metrics: readinessMetrics,
    overallReadiness: readinessMetrics.length > 0
      ? Math.round(readinessMetrics.reduce((sum, metric) => sum + metric.readiness, 0) / readinessMetrics.length)
      : 0,
  }
}

export function buildProgressSummary(metrics: AdaptiveMetricRow[]): ProgressSummary {
  const improvedAthleteIds = new Set<string>()
  const athleteWithChangeIds = new Set<string>()
  let improvedMetrics = 0
  let totalMetricsWithChange = 0
  const topImprovers: ProgressSummary['topImprovers'] = []

  for (const metric of metrics) {
    for (const athlete of metric.athletes) {
      if (athlete.delta == null) continue
      totalMetricsWithChange++
      athleteWithChangeIds.add(athlete.clientId)
      if (athlete.delta > 0) {
        improvedMetrics++
        improvedAthleteIds.add(athlete.clientId)
        topImprovers.push({
          clientId: athlete.clientId,
          name: athlete.name,
          metricLabel: metric.label,
          delta: athlete.delta,
          unit: metric.unit,
        })
      }
    }
  }

  return {
    improvedAthletes: improvedAthleteIds.size,
    stalledAthletes: Math.max(0, athleteWithChangeIds.size - improvedAthleteIds.size),
    improvedMetrics,
    totalMetricsWithChange,
    topImprovers: topImprovers
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6),
  }
}

export function buildTrainingQuality({
  members,
  assignments,
  today,
  progressiveAthleteIds,
}: {
  members: Array<{ id: string; name: string }>
  assignments: Array<{ athleteId: string; assignedDate: Date; status: string }>
  today: Date
  progressiveAthleteIds: Set<string>
}): TrainingQuality {
  const stats = new Map<string, TrainingQualityAthlete>()
  for (const member of members) {
    stats.set(member.id, {
      clientId: member.id,
      name: member.name,
      assigned: 0,
      completed: 0,
      missed: 0,
      completionRate: 0,
    })
  }

  for (const assignment of assignments) {
    const stat = stats.get(assignment.athleteId)
    if (!stat) continue
    const completed = assignment.status === 'COMPLETED'
    stat.assigned++
    if (completed) stat.completed++
    if (!completed && startOfDay(assignment.assignedDate) < today) stat.missed++
  }

  for (const stat of stats.values()) {
    stat.completionRate = stat.assigned > 0 ? Math.round((stat.completed / stat.assigned) * 100) : 0
  }

  const athletes = Array.from(stats.values())
  const assigned = athletes.reduce((sum, athlete) => sum + athlete.assigned, 0)
  const completed = athletes.reduce((sum, athlete) => sum + athlete.completed, 0)
  const missed = athletes.reduce((sum, athlete) => sum + athlete.missed, 0)

  return {
    periodDays: RECENT_DAYS,
    assigned,
    completed,
    missed,
    completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    lowCompletionAthletes: athletes
      .filter((athlete) => athlete.assigned >= 2 && athlete.completionRate < 60)
      .sort((a, b) => a.completionRate - b.completionRate || b.assigned - a.assigned)
      .slice(0, 8),
    missedAthletes: athletes
      .filter((athlete) => athlete.missed > 0)
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 8),
    completingWithoutProgress: athletes
      .filter((athlete) => athlete.assigned >= 2 && athlete.completionRate >= 75 && !progressiveAthleteIds.has(athlete.clientId))
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 6),
    progressingDespiteLowCompletion: athletes
      .filter((athlete) => athlete.assigned >= 2 && athlete.completionRate < 60 && progressiveAthleteIds.has(athlete.clientId))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 6),
  }
}

export function buildNeedsAttention({
  members,
  trainingQuality,
  goalReadiness,
  metrics,
  locale,
}: {
  members: MemberSummary[]
  trainingQuality: TrainingQuality
  goalReadiness: GoalReadiness
  metrics: AdaptiveMetricRow[]
  locale: AppLocale
}): NeedsAttentionEntry[] {
  const lowCompletionIds = new Set(trainingQuality.lowCompletionAthletes.map((athlete) => athlete.clientId))
  const missedIds = new Set(trainingQuality.missedAthletes.map((athlete) => athlete.clientId))
  const priorityTargetIds = new Set<string>()
  for (const metric of goalReadiness.metrics) {
    if (metric.readiness >= 50) continue
    const source = metrics.find((row) => row.key === metric.key)
    source?.athletes
      .filter((athlete) => athlete.targetGap != null && athlete.targetGap < 0)
      .forEach((athlete) => priorityTargetIds.add(athlete.clientId))
  }

  const needsAttention: NeedsAttentionEntry[] = []
  for (const m of members) {
    const reasons: string[] = []
    if (m.acwr?.zone === 'DANGER') {
      reasons.push(t(locale, `High injury risk (ACWR ${m.acwr.value})`, `Hög skaderisk (ACWR ${m.acwr.value})`))
    }
    if (m.acwr?.zone === 'CRITICAL') {
      reasons.push(t(locale, `Critical load (ACWR ${m.acwr.value})`, `Kritisk belastning (ACWR ${m.acwr.value})`))
    }
    if (m.acwr?.zone === 'DETRAINING') {
      reasons.push(t(locale, 'Detraining: low load over recent weeks', 'Detraining – lite belastning på sista veckorna'))
    }
    if (m.daysSinceLastActivity != null && m.daysSinceLastActivity >= STALE_ACTIVITY_DAYS) {
      reasons.push(t(locale, `${m.daysSinceLastActivity} days since last activity`, `${m.daysSinceLastActivity} dagar sedan senaste aktivitet`))
    }
    if (m.daysSinceLastActivity == null) {
      reasons.push(t(locale, 'No activity in the last 30 days', 'Ingen aktivitet senaste 30 dagarna'))
    }
    if (m.totalPRs === 0) {
      reasons.push(t(locale, 'Missing 1RM PR: % of 1RM workouts cannot be resolved', 'Saknar 1RM PR – % av 1RM-pass kan inte upplösas'))
    }
    if (lowCompletionIds.has(m.clientId)) {
      reasons.push(t(locale, 'Low workout completion', 'Låg genomförandegrad'))
    }
    if (missedIds.has(m.clientId)) {
      reasons.push(t(locale, 'Missed assigned sessions', 'Missade tilldelade pass'))
    }
    if (m.testCount === 0 && m.totalPRs === 0) {
      reasons.push(t(locale, 'Missing test data', 'Saknar testdata'))
    }
    if (priorityTargetIds.has(m.clientId)) {
      reasons.push(t(locale, 'Below priority test target', 'Under prioriterat testmål'))
    }
    if (reasons.length > 0) {
      needsAttention.push({ clientId: m.clientId, name: m.name, reasons })
    }
  }
  return needsAttention
}

export function buildRecentPRs(
  oneRepMaxRows: Array<{
    id: string
    clientId: string
    exerciseId: string
    oneRepMax: number
    date: Date
    source: string
    unit: string
    exercise: LocalizedExerciseName
  }>,
  prsByClient: Map<string, typeof oneRepMaxRows>,
  memberNameById: Map<string, string>,
  since: Date,
  locale: AppLocale
): RecentPR[] {
  const recentPRs: RecentPR[] = []
  for (const pr of oneRepMaxRows) {
    if (pr.date < since) break
    const history = prsByClient.get(pr.clientId) ?? []
    const previous = history.find(
      (h) => h.exerciseId === pr.exerciseId && h.date < pr.date
    )
    recentPRs.push({
      id: pr.id,
      clientId: pr.clientId,
      clientName: memberNameById.get(pr.clientId) ?? '',
      exerciseName: exerciseNameForLocale(pr.exercise, locale),
      oneRepMax: pr.oneRepMax,
      previousMax: previous?.oneRepMax ?? null,
      date: pr.date.toISOString(),
      source: pr.source,
      unit: pr.unit,
    })
  }
  return recentPRs.slice(0, 50)
}

export function buildPendingPRs(
  oneRepMaxRows: Array<{
    id: string
    clientId: string
    exerciseId: string
    oneRepMax: number
    date: Date
    source: string
    unit: string
    exercise: LocalizedExerciseName
  }>,
  memberNameById: Map<string, string>,
  locale: AppLocale
): PendingPR[] {
  const pendingPRs: PendingPR[] = []
  const seenPair = new Set<string>()
  for (const pr of oneRepMaxRows) {
    const pairKey = `${pr.clientId}:${pr.exerciseId}`
    if (seenPair.has(pairKey)) continue
    seenPair.add(pairKey)
    if (pr.source !== 'ESTIMATED') continue
    pendingPRs.push({
      id: pr.id,
      clientId: pr.clientId,
      clientName: memberNameById.get(pr.clientId) ?? '',
      exerciseId: pr.exerciseId,
      exerciseName: exerciseNameForLocale(pr.exercise, locale),
      oneRepMax: pr.oneRepMax,
      date: pr.date.toISOString(),
      unit: pr.unit,
    })
  }
  return pendingPRs
}

export function buildEvaluationScores({
  locale,
  members,
  flatMetrics,
  goalReadiness,
  trainingQuality,
  progressSummary,
}: {
  locale: AppLocale
  members: MemberSummary[]
  flatMetrics: AdaptiveMetricRow[]
  goalReadiness: GoalReadiness
  trainingQuality: TrainingQuality
  progressSummary: ProgressSummary
}): EvaluationScore[] {
  const totalMembers = Math.max(1, members.length)
  const testCoverage = flatMetrics.length > 0
    ? Math.round(flatMetrics.reduce((sum, metric) => sum + (metric.coverage / totalMembers) * 100, 0) / flatMetrics.length)
    : 0
  const loadAvailability = Math.round((members.filter((member) => member.acwr).length / totalMembers) * 100)
  const progressMomentum = progressSummary.totalMetricsWithChange > 0
    ? Math.round((progressSummary.improvedMetrics / progressSummary.totalMetricsWithChange) * 100)
    : 0

  return [
    {
      key: 'testCoverage',
      label: t(locale, 'Test coverage', 'Testtäckning'),
      value: testCoverage,
      detail: t(locale, `${flatMetrics.length} active metrics`, `${flatMetrics.length} aktiva mätvärden`),
      tone: scoreTone(testCoverage),
    },
    {
      key: 'goalReadiness',
      label: t(locale, 'Goal readiness', 'Målberedskap'),
      value: goalReadiness.overallReadiness,
      detail: t(locale, `${goalReadiness.metrics.length} target metrics`, `${goalReadiness.metrics.length} målmätvärden`),
      tone: scoreTone(goalReadiness.overallReadiness),
    },
    {
      key: 'trainingQuality',
      label: t(locale, 'Training quality', 'Träningskvalitet'),
      value: trainingQuality.completionRate,
      detail: t(locale, `${trainingQuality.completed}/${trainingQuality.assigned} sessions`, `${trainingQuality.completed}/${trainingQuality.assigned} pass`),
      tone: scoreTone(trainingQuality.completionRate),
    },
    {
      key: 'progressMomentum',
      label: t(locale, 'Progress momentum', 'Progressmomentum'),
      value: progressMomentum,
      detail: t(locale, `${progressSummary.improvedMetrics} positive changes`, `${progressSummary.improvedMetrics} positiva förändringar`),
      tone: scoreTone(progressMomentum),
    },
    {
      key: 'loadAvailability',
      label: t(locale, 'Load availability', 'Belastningsdata'),
      value: loadAvailability,
      detail: t(locale, `${members.filter((member) => member.acwr).length}/${members.length} tracked`, `${members.filter((member) => member.acwr).length}/${members.length} spårade`),
      tone: scoreTone(loadAvailability),
    },
  ]
}

export function comparableNormValue(value: number, normUnit: string, metricUnit: string, bodyWeight: number | null): number | null {
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg' && bodyWeight && bodyWeight > 0) {
    return value * bodyWeight
  }
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg') {
    return null
  }
  return value
}

export function comparableNormGap(value: number, normUnit: string, metricUnit: string, bodyWeight: number | null): number | null {
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg' && bodyWeight && bodyWeight > 0) {
    return value * bodyWeight
  }
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg') {
    return null
  }
  return value
}

export function inferTeamLevel(teamName: string): string {
  const normalized = teamName.toLowerCase()
  if (/j18|u18/.test(normalized)) return 'J18'
  if (/j20|u20/.test(normalized)) return 'J20'
  return 'A-team'
}

export function scoreTone(value: number): ScoreTone {
  if (value >= 75) return 'good'
  if (value >= 50) return 'watch'
  if (value > 0) return 'risk'
  return 'neutral'
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

export function exerciseNameForLocale(exercise: LocalizedExerciseName, locale: AppLocale): string {
  return locale === 'sv'
    ? exercise.nameSv || exercise.nameEn || exercise.name
    : exercise.nameEn || exercise.name || exercise.nameSv || 'Exercise'
}

export function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export function emptyAggregates() {
  return {
    total: 0,
    acwrZones: {
      DETRAINING: 0,
      OPTIMAL: 0,
      CAUTION: 0,
      DANGER: 0,
      CRITICAL: 0,
      UNKNOWN: 0,
    },
    needsAttention: [] as NeedsAttentionEntry[],
  }
}

export function emptyScores(locale: AppLocale): EvaluationScore[] {
  return ['testCoverage', 'goalReadiness', 'trainingQuality', 'progressMomentum', 'loadAvailability'].map((key) => ({
    key,
    label: t(locale, key, key),
    value: 0,
    detail: t(locale, 'No data yet', 'Ingen data ännu'),
    tone: 'neutral' as ScoreTone,
  }))
}

export function emptyTrainingQuality(): TrainingQuality {
  return {
    periodDays: RECENT_DAYS,
    assigned: 0,
    completed: 0,
    missed: 0,
    completionRate: 0,
    lowCompletionAthletes: [],
    missedAthletes: [],
    completingWithoutProgress: [],
    progressingDespiteLowCompletion: [],
  }
}

export function emptyProgressSummary(): ProgressSummary {
  return {
    improvedAthletes: 0,
    stalledAthletes: 0,
    improvedMetrics: 0,
    totalMetricsWithChange: 0,
    topImprovers: [],
  }
}
