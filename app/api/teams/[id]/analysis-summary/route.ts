/**
 * Team Analysis Summary API
 *
 * GET /api/teams/[id]/analysis-summary
 *
 * Broad, adaptive roster analysis for "Lagets analys": load risk,
 * training quality, PR attention, available test metrics, progress
 * and goal readiness from saved hockey norms.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import {
  buildHockeyNormGap,
  findHockeyNormReference,
  mergeHockeyNormReferences,
  type HockeyNormReferenceConfig,
} from '@/lib/hockey/norm-references'
import {
  HOCKEY_METRICS,
  improvementDelta,
  metricValuesForTest,
  normComparableValue,
  percentileFromRank,
  round,
  type HockeyMetric,
  type HockeyTestForSummary,
} from '@/lib/hockey/team-test-metrics'
import {
  applyLinkedHockeyAerobicProfile,
  getLinkedHockeyAerobicProfiles,
} from '@/lib/hockey/aerobic-profile-link'

type AcwrZone = 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL' | 'UNKNOWN'
type AppLocale = 'en' | 'sv'
type ScoreTone = 'good' | 'watch' | 'risk' | 'neutral'
type MetricCategory = 'hockey' | 'strength'

interface MemberSummary {
  clientId: string
  name: string
  acwr: { value: number; zone: AcwrZone; asOf: string } | null
  daysSinceLastActivity: number | null
  recentPRs: number
  totalPRs: number
  testCount: number
}

interface NeedsAttentionEntry {
  clientId: string
  name: string
  reasons: string[]
}

interface RecentPR {
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

interface PendingPR {
  id: string
  clientId: string
  clientName: string
  exerciseId: string
  exerciseName: string
  oneRepMax: number
  date: string
  unit: string
}

interface EvaluationScore {
  key: string
  label: string
  value: number
  detail: string
  tone: ScoreTone
}

interface TrainingQualityAthlete {
  clientId: string
  name: string
  assigned: number
  completed: number
  missed: number
  completionRate: number
}

interface TrainingQuality {
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

interface AdaptiveMetricAthlete {
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
  missing: boolean
}

interface AdaptiveMetricRow {
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

interface MetricGroup {
  id: MetricCategory
  label: string
  metrics: AdaptiveMetricRow[]
}

interface GoalReadinessMetric {
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

interface GoalReadiness {
  level: string
  metrics: GoalReadinessMetric[]
  overallReadiness: number
}

interface ProgressSummary {
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

const RECENT_DAYS = 30
const STALE_ACTIVITY_DAYS = 5
const CLOSE_TO_TARGET_RATIO = 0.05

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const locale = getUserLocale(user.language)
    const { id: teamId } = await params
    const scope = getRequestedBusinessScope(request)
    const accessibleTeamWhere = await getAccessibleTeamWhere(user.id, scope.businessSlug)

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        AND: [accessibleTeamWhere],
      },
      select: {
        id: true,
        name: true,
        members: {
          select: {
            id: true,
            name: true,
            weight: true,
            position: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const memberIds = team.members.map((m) => m.id)
    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          teamId: team.id,
          teamName: team.name,
          members: [],
          aggregates: emptyAggregates(),
          recentPRs: [],
          pendingPRs: [],
          evaluationScores: emptyScores(locale),
          trainingQuality: emptyTrainingQuality(),
          metricGroups: [],
          goalReadiness: { level: inferTeamLevel(team.name), metrics: [], overallReadiness: 0 },
          progressSummary: emptyProgressSummary(),
        },
      })
    }

    const since = new Date()
    since.setDate(since.getDate() - RECENT_DAYS)
    const today = startOfDay(new Date())
    const hockeySince = new Date()
    hockeySince.setFullYear(hockeySince.getFullYear() - 5)

    const [
      trainingLoads,
      recentLoads,
      oneRepMaxRows,
      hockeyTestsRaw,
      savedNormReferences,
      strengthAssignments,
      cardioAssignments,
      hybridAssignments,
      agilityAssignments,
    ] = await Promise.all([
      prisma.trainingLoad.findMany({
        where: {
          clientId: { in: memberIds },
          acwr: { not: null },
        },
        orderBy: { date: 'desc' },
        select: {
          clientId: true,
          acwr: true,
          acwrZone: true,
          date: true,
        },
      }),
      prisma.trainingLoad.findMany({
        where: {
          clientId: { in: memberIds },
          date: { gte: since },
        },
        orderBy: { date: 'desc' },
        select: { clientId: true, date: true },
      }),
      prisma.oneRepMaxHistory.findMany({
        where: { clientId: { in: memberIds } },
        orderBy: { date: 'desc' },
        include: {
          exercise: { select: { id: true, name: true, nameSv: true } },
        },
      }),
      prisma.hockeyPhysicalTest.findMany({
        where: {
          clientId: { in: memberIds },
          testDate: { gte: hockeySince },
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
      }),
      prisma.hockeyNormReference.findMany({
        where: { teamId, coachId: user.id },
        orderBy: [
          { level: 'asc' },
          { metricKey: 'asc' },
          { position: 'asc' },
        ],
      }),
      prisma.strengthSessionAssignment.findMany({
        where: { athleteId: { in: memberIds }, assignedDate: { gte: since } },
        select: { athleteId: true, assignedDate: true, status: true },
      }),
      prisma.cardioSessionAssignment.findMany({
        where: { athleteId: { in: memberIds }, assignedDate: { gte: since } },
        select: { athleteId: true, assignedDate: true, status: true },
      }),
      prisma.hybridWorkoutAssignment.findMany({
        where: { athleteId: { in: memberIds }, assignedDate: { gte: since } },
        select: { athleteId: true, assignedDate: true, status: true },
      }),
      prisma.agilityWorkoutAssignment.findMany({
        where: { athleteId: { in: memberIds }, assignedDate: { gte: since } },
        select: { athleteId: true, assignedDate: true, status: true },
      }),
    ])

    const linkedProfiles = await getLinkedHockeyAerobicProfiles(memberIds)
    const hockeyTests = hockeyTestsRaw.map((test) => (
      applyLinkedHockeyAerobicProfile(test, linkedProfiles.get(test.clientId))
    ))
    const hockeyNormReferences = mergeHockeyNormReferences(savedNormReferences)
    const teamLevel = inferTeamLevel(team.name)
    const memberNameById = new Map(team.members.map((m) => [m.id, m.name]))

    const latestAcwrByClient = new Map<string, { value: number; zone: AcwrZone; asOf: Date }>()
    for (const row of trainingLoads) {
      if (latestAcwrByClient.has(row.clientId)) continue
      latestAcwrByClient.set(row.clientId, {
        value: row.acwr ?? 0,
        zone: (row.acwrZone as AcwrZone | null) ?? 'UNKNOWN',
        asOf: row.date,
      })
    }
    const latestActivityByClient = new Map<string, Date>()
    for (const row of recentLoads) {
      if (latestActivityByClient.has(row.clientId)) continue
      latestActivityByClient.set(row.clientId, row.date)
    }

    const prsByClient = new Map<string, typeof oneRepMaxRows>()
    for (const pr of oneRepMaxRows) {
      const arr = prsByClient.get(pr.clientId) ?? []
      arr.push(pr)
      prsByClient.set(pr.clientId, arr)
    }

    const testCountByClient = new Map<string, number>()
    for (const test of hockeyTests) {
      testCountByClient.set(test.clientId, (testCountByClient.get(test.clientId) ?? 0) + 1)
    }

    const members: MemberSummary[] = team.members.map((m) => {
      const acwr = latestAcwrByClient.get(m.id) ?? null
      const lastActivity = latestActivityByClient.get(m.id) ?? null
      const days = lastActivity
        ? Math.floor((today.getTime() - startOfDay(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : null
      const prs = prsByClient.get(m.id) ?? []
      const recentPRs = prs.filter((p) => p.date >= since).length
      return {
        clientId: m.id,
        name: m.name,
        acwr: acwr
          ? { value: Number(acwr.value.toFixed(2)), zone: acwr.zone, asOf: acwr.asOf.toISOString() }
          : null,
        daysSinceLastActivity: days,
        recentPRs,
        totalPRs: prs.length,
        testCount: testCountByClient.get(m.id) ?? 0,
      }
    })

    const metricGroups = buildMetricGroups({
      members: team.members,
      hockeyTests,
      oneRepMaxRows,
      norms: hockeyNormReferences,
      teamLevel,
    })
    const flatMetrics = metricGroups.flatMap((group) => group.metrics)
    const goalReadiness = buildGoalReadiness(flatMetrics, teamLevel)
    const progressSummary = buildProgressSummary(flatMetrics)
    const trainingQuality = buildTrainingQuality({
      members: team.members,
      assignments: [
        ...strengthAssignments,
        ...cardioAssignments,
        ...hybridAssignments,
        ...agilityAssignments,
      ],
      today,
      progressiveAthleteIds: new Set(progressSummary.topImprovers.map((item) => item.clientId)),
    })

    const acwrZones: Record<AcwrZone, number> = {
      DETRAINING: 0,
      OPTIMAL: 0,
      CAUTION: 0,
      DANGER: 0,
      CRITICAL: 0,
      UNKNOWN: 0,
    }
    for (const m of members) {
      acwrZones[m.acwr?.zone ?? 'UNKNOWN']++
    }

    const needsAttention = buildNeedsAttention({
      members,
      trainingQuality,
      goalReadiness,
      metrics: flatMetrics,
      locale,
    })

    const recentPRs = buildRecentPRs(oneRepMaxRows, prsByClient, memberNameById, since)
    const pendingPRs = buildPendingPRs(oneRepMaxRows, memberNameById)
    const evaluationScores = buildEvaluationScores({
      locale,
      members,
      flatMetrics,
      goalReadiness,
      trainingQuality,
      progressSummary,
    })

    return NextResponse.json({
      success: true,
      data: {
        teamId: team.id,
        teamName: team.name,
        members,
        aggregates: {
          total: members.length,
          acwrZones,
          needsAttention,
        },
        recentPRs,
        pendingPRs,
        evaluationScores,
        trainingQuality,
        metricGroups,
        goalReadiness,
        progressSummary,
        rosterSummary: {
          total: members.length,
          withTests: members.filter((member) => member.testCount > 0).length,
          withLoad: members.filter((member) => member.acwr).length,
          missingData: members.filter((member) => member.testCount === 0 && member.totalPRs === 0).length,
        },
      },
    })
  } catch (error) {
    logError('Team analysis summary error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team analysis summary' },
      { status: 500 }
    )
  }
}

function buildMetricGroups({
  members,
  hockeyTests,
  oneRepMaxRows,
  norms,
  teamLevel,
}: {
  members: Array<{ id: string; name: string; weight: number; position: string | null }>
  hockeyTests: HockeyTestForSummary[]
  oneRepMaxRows: Array<{
    clientId: string
    exerciseId: string
    oneRepMax: number
    unit: string
    date: Date
    exercise: { id: string; name: string; nameSv: string | null }
  }>
  norms: HockeyNormReferenceConfig[]
  teamLevel: string
}): MetricGroup[] {
  const hockeyMetrics = buildHockeyMetricRows(members, hockeyTests, norms, teamLevel)
  const strengthMetrics = buildStrengthMetricRows(members, oneRepMaxRows)
  return [
    { id: 'hockey' as const, label: 'Tester', metrics: hockeyMetrics },
    { id: 'strength' as const, label: 'Styrke-PRs', metrics: strengthMetrics },
  ].filter((group) => group.metrics.length > 0)
}

function buildHockeyMetricRows(
  members: Array<{ id: string; name: string; weight: number; position: string | null }>,
  tests: HockeyTestForSummary[],
  norms: HockeyNormReferenceConfig[],
  teamLevel: string
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
    .map((metric) => buildMetricRow({
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
    }))
    .filter((metric): metric is AdaptiveMetricRow => Boolean(metric && metric.coverage > 0))
}

function buildStrengthMetricRows(
  members: Array<{ id: string; name: string; weight: number; position: string | null }>,
  oneRepMaxRows: Array<{
    clientId: string
    exerciseId: string
    oneRepMax: number
    unit: string
    date: Date
    exercise: { id: string; name: string; nameSv: string | null }
  }>
): AdaptiveMetricRow[] {
  const exerciseIds = Array.from(new Set(oneRepMaxRows.map((row) => row.exerciseId)))
  return exerciseIds
    .map((exerciseId) => {
      const sample = oneRepMaxRows.find((row) => row.exerciseId === exerciseId)
      if (!sample) return null
      const metric: HockeyMetric = {
        key: `strength:${exerciseId}`,
        label: sample.exercise.nameSv || sample.exercise.name,
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
    .sort((a, b) => b.coverage - a.coverage || a.label.localeCompare(b.label, 'sv'))
}

function buildMetricRow({
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

function buildGoalReadiness(metrics: AdaptiveMetricRow[], level: string): GoalReadiness {
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

function buildProgressSummary(metrics: AdaptiveMetricRow[]): ProgressSummary {
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

function buildTrainingQuality({
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

function buildNeedsAttention({
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

function buildRecentPRs(
  oneRepMaxRows: Array<{
    id: string
    clientId: string
    exerciseId: string
    oneRepMax: number
    date: Date
    source: string
    unit: string
    exercise: { name: string; nameSv: string | null }
  }>,
  prsByClient: Map<string, typeof oneRepMaxRows>,
  memberNameById: Map<string, string>,
  since: Date
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
      exerciseName: pr.exercise.nameSv || pr.exercise.name,
      oneRepMax: pr.oneRepMax,
      previousMax: previous?.oneRepMax ?? null,
      date: pr.date.toISOString(),
      source: pr.source,
      unit: pr.unit,
    })
  }
  return recentPRs.slice(0, 50)
}

function buildPendingPRs(
  oneRepMaxRows: Array<{
    id: string
    clientId: string
    exerciseId: string
    oneRepMax: number
    date: Date
    source: string
    unit: string
    exercise: { name: string; nameSv: string | null }
  }>,
  memberNameById: Map<string, string>
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
      exerciseName: pr.exercise.nameSv || pr.exercise.name,
      oneRepMax: pr.oneRepMax,
      date: pr.date.toISOString(),
      unit: pr.unit,
    })
  }
  return pendingPRs
}

function buildEvaluationScores({
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

function comparableNormValue(value: number, normUnit: string, metricUnit: string, bodyWeight: number | null): number | null {
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg' && bodyWeight && bodyWeight > 0) {
    return value * bodyWeight
  }
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg') {
    return null
  }
  return value
}

function comparableNormGap(value: number, normUnit: string, metricUnit: string, bodyWeight: number | null): number | null {
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg' && bodyWeight && bodyWeight > 0) {
    return value * bodyWeight
  }
  if (normUnit === 'xBW' && metricUnit.toLowerCase() === 'kg') {
    return null
  }
  return value
}

function inferTeamLevel(teamName: string): string {
  const normalized = teamName.toLowerCase()
  if (/j18|u18/.test(normalized)) return 'J18'
  if (/j20|u20/.test(normalized)) return 'J20'
  return 'A-team'
}

function scoreTone(value: number): ScoreTone {
  if (value >= 75) return 'good'
  if (value >= 50) return 'watch'
  if (value > 0) return 'risk'
  return 'neutral'
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function emptyAggregates() {
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

function emptyScores(locale: AppLocale): EvaluationScore[] {
  return ['testCoverage', 'goalReadiness', 'trainingQuality', 'progressMomentum', 'loadAvailability'].map((key) => ({
    key,
    label: t(locale, key, key),
    value: 0,
    detail: t(locale, 'No data yet', 'Ingen data ännu'),
    tone: 'neutral' as ScoreTone,
  }))
}

function emptyTrainingQuality(): TrainingQuality {
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

function emptyProgressSummary(): ProgressSummary {
  return {
    improvedAthletes: 0,
    stalledAthletes: 0,
    improvedMetrics: 0,
    totalMetricsWithChange: 0,
    topImprovers: [],
  }
}
