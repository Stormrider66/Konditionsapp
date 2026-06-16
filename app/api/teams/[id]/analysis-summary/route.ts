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
import { mergeHockeyNormReferences } from '@/lib/hockey/norm-references'
import { type HockeyTestForSummary } from '@/lib/hockey/team-test-metrics'
import {
  applyLinkedHockeyAerobicProfile,
  getLinkedHockeyAerobicProfiles,
} from '@/lib/hockey/aerobic-profile-link'
import {
  buildEvaluationScores,
  buildGoalReadiness,
  buildMetricGroups,
  buildNeedsAttention,
  buildPendingPRs,
  buildProgressSummary,
  buildRecentPRs,
  buildSeasonAnalyses,
  buildTrainingQuality,
  emptyAggregates,
  emptyProgressSummary,
  emptyScores,
  emptyTrainingQuality,
  getUserLocale,
  inferTeamLevel,
  labTestToHockeySummary,
  startOfDay,
  RECENT_DAYS,
  type AcwrZone,
  type MemberSummary,
} from '@/lib/hockey/team-analysis-engine'
import { usableTestQualityReviewWhere } from '@/lib/testing/test-quality-review'

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
      labTestsRaw,
      savedNormReferences,
      strengthAssignments,
      cardioAssignments,
      hybridAssignments,
      agilityAssignments,
    ] = await Promise.all([
      prisma.trainingLoad.findMany({
        where: {
          clientId: { in: memberIds },
          source: 'ACWR_SUMMARY',
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
          // Last-activity must read logged sessions only — the nightly cron
          // writes an ACWR_SUMMARY row per athlete/day even on rest days.
          source: 'WORKOUT',
        },
        orderBy: { date: 'desc' },
        select: { clientId: true, date: true },
      }),
      prisma.oneRepMaxHistory.findMany({
        where: { clientId: { in: memberIds } },
        orderBy: { date: 'desc' },
        include: {
          exercise: { select: { id: true, name: true, nameSv: true, nameEn: true } },
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
      prisma.test.findMany({
        where: {
          clientId: { in: memberIds },
          testDate: { gte: hockeySince },
          status: 'COMPLETED',
          ...usableTestQualityReviewWhere,
        },
        orderBy: { testDate: 'desc' },
        select: {
          clientId: true,
          testDate: true,
          vo2max: true,
          maxHR: true,
          maxLactate: true,
          postTestMeasurements: true,
          aerobicThreshold: true,
          anaerobicThreshold: true,
          thresholdCalculation: {
            select: {
              lt1Intensity: true,
              lt1Hr: true,
              lt1Lactate: true,
              lt2Intensity: true,
              lt2Hr: true,
              lt2Lactate: true,
            },
          },
          testStages: {
            orderBy: { sequence: 'asc' },
            select: {
              vo2: true,
              lactate: true,
              heartRate: true,
            },
          },
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
    const labHockeyTests = labTestsRaw
      .map(labTestToHockeySummary)
      .filter((test): test is HockeyTestForSummary => test != null)
    const clientsWithLabTests = new Set(labHockeyTests.map((test) => test.clientId))
    const hockeyPhysicalTests: HockeyTestForSummary[] = hockeyTestsRaw.map((test): HockeyTestForSummary => (
      clientsWithLabTests.has(test.clientId)
        ? test
        : applyLinkedHockeyAerobicProfile(test, linkedProfiles.get(test.clientId))
    ))
    const hockeyTests: HockeyTestForSummary[] = [...hockeyPhysicalTests, ...labHockeyTests]
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
      locale,
    })
    const flatMetrics = metricGroups.flatMap((group) => group.metrics)
    const seasons = buildSeasonAnalyses({
      members: team.members,
      hockeyTests,
      oneRepMaxRows,
      norms: hockeyNormReferences,
      teamLevel,
      locale,
    })
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

    const recentPRs = buildRecentPRs(oneRepMaxRows, prsByClient, memberNameById, since, locale)
    const pendingPRs = buildPendingPRs(oneRepMaxRows, memberNameById, locale)
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
        seasons,
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
