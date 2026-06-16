/**
 * Shared server loader for a team's hockey season analyses.
 *
 * Encapsulates the fetch + lab-aerobic linking + season assembly so both the
 * coach analysis-summary route and the athlete hockey-profile route produce
 * identical numbers from the same engine (buildSeasonAnalyses).
 */

import { prisma } from '@/lib/prisma'
import { mergeHockeyNormReferences } from '@/lib/hockey/norm-references'
import { type HockeyTestForSummary } from '@/lib/hockey/team-test-metrics'
import {
  applyLinkedHockeyAerobicProfile,
  getLinkedHockeyAerobicProfiles,
} from '@/lib/hockey/aerobic-profile-link'
import {
  buildSeasonAnalyses,
  inferTeamLevel,
  labTestToHockeySummary,
  type AppLocale,
  type SeasonAnalysis,
} from '@/lib/hockey/team-analysis-engine'
import { usableTestQualityReviewWhere } from '@/lib/testing/test-quality-review'

const HOCKEY_TEST_SELECT = {
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
} as const

const LAB_TEST_SELECT = {
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
    orderBy: { sequence: 'asc' as const },
    select: { vo2: true, lactate: true, heartRate: true },
  },
} as const

export async function loadTeamHockeySeasons({
  teamId,
  teamName,
  coachUserId,
  members,
  locale,
}: {
  teamId: string
  teamName: string
  coachUserId: string
  members: Array<{ id: string; name: string; weight: number; position: string | null }>
  locale: AppLocale
}): Promise<SeasonAnalysis[]> {
  const memberIds = members.map((m) => m.id)
  if (memberIds.length === 0) return []

  const hockeySince = new Date()
  hockeySince.setFullYear(hockeySince.getFullYear() - 5)

  const [oneRepMaxRows, hockeyTestsRaw, labTestsRaw, savedNormReferences] = await Promise.all([
    prisma.oneRepMaxHistory.findMany({
      where: { clientId: { in: memberIds } },
      orderBy: { date: 'desc' },
      include: { exercise: { select: { id: true, name: true, nameSv: true, nameEn: true } } },
    }),
    prisma.hockeyPhysicalTest.findMany({
      where: { clientId: { in: memberIds }, testDate: { gte: hockeySince } },
      orderBy: { testDate: 'desc' },
      select: HOCKEY_TEST_SELECT,
    }),
    prisma.test.findMany({
      where: {
        clientId: { in: memberIds },
        testDate: { gte: hockeySince },
        status: 'COMPLETED',
        ...usableTestQualityReviewWhere,
      },
      orderBy: { testDate: 'desc' },
      select: LAB_TEST_SELECT,
    }),
    prisma.hockeyNormReference.findMany({
      where: { teamId, coachId: coachUserId },
      orderBy: [{ level: 'asc' }, { metricKey: 'asc' }, { position: 'asc' }],
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

  return buildSeasonAnalyses({
    members,
    hockeyTests,
    oneRepMaxRows,
    norms: mergeHockeyNormReferences(savedNormReferences),
    teamLevel: inferTeamLevel(teamName),
    locale,
  })
}
