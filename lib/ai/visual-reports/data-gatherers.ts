/**
 * Visual Report Data Gatherers
 *
 * DB queries that collect data for each report type.
 */

import { prisma } from '@/lib/prisma'
import { reconstructProgramForInfographic } from '@/lib/ai/program-infographic'
import type {
  ProgressionReportData,
  TrainingSummaryReportData,
  TestReportData,
  ProgramReportData,
} from './types'

export async function gatherProgressionData(
  clientId: string,
  start?: Date,
  end?: Date
): Promise<ProgressionReportData | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      sportProfile: { select: { primarySport: true } },
    },
  })
  if (!client) return null

  const dateFilter: Record<string, unknown> = {}
  if (start) dateFilter.gte = start
  if (end) dateFilter.lte = end

  const tests = await prisma.test.findMany({
    where: {
      clientId,
      ...(start || end ? { testDate: dateFilter } : {}),
    },
    select: {
      testDate: true,
      testType: true,
      vo2max: true,
      anaerobicThreshold: true,
      aerobicThreshold: true,
      maxHR: true,
    },
    orderBy: { testDate: 'asc' },
    take: 20,
  })

  const fieldTests = await prisma.fieldTest.findMany({
    where: {
      clientId,
      ...(start || end ? { date: dateFilter } : {}),
    },
    select: {
      date: true,
      testType: true,
      results: true,
    },
    orderBy: { date: 'asc' },
    take: 20,
  })

  const raceResults = await prisma.raceResult.findMany({
    where: {
      clientId,
      ...(start || end ? { raceDate: dateFilter } : {}),
    },
    select: {
      raceDate: true,
      raceName: true,
      distance: true,
      finishTime: true,
      avgPace: true,
    },
    orderBy: { raceDate: 'asc' },
    take: 20,
  })

  return {
    clientName: client.name,
    sportType: client.sportProfile?.primarySport || null,
    tests: tests.map((t) => ({
      date: t.testDate.toISOString(),
      testType: t.testType,
      vo2max: t.vo2max,
      anaerobicThreshold: t.anaerobicThreshold as ProgressionReportData['tests'][0]['anaerobicThreshold'],
      aerobicThreshold: t.aerobicThreshold as ProgressionReportData['tests'][0]['aerobicThreshold'],
      maxHR: t.maxHR,
    })),
    fieldTests: fieldTests.map((ft) => ({
      date: ft.date.toISOString(),
      testType: ft.testType,
      results: (ft.results as Record<string, unknown>) || {},
    })),
    raceResults: raceResults.map((r) => ({
      date: r.raceDate.toISOString(),
      raceName: r.raceName,
      distance: r.distance,
      finishTime: r.finishTime,
      paceOrSpeed: r.avgPace,
    })),
  }
}

export async function gatherTrainingSummaryData(
  clientId: string,
  start?: Date,
  end?: Date
): Promise<TrainingSummaryReportData | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      sportProfile: { select: { primarySport: true } },
    },
  })
  if (!client) return null

  // Get the most recent weekly summary (or within date range)
  const dateFilter: Record<string, unknown> = {}
  if (start) dateFilter.gte = start
  if (end) dateFilter.lte = end

  const summary = await prisma.weeklyTrainingSummary.findFirst({
    where: {
      clientId,
      ...(start || end ? { weekStart: dateFilter } : {}),
    },
    orderBy: { weekStart: 'desc' },
  })

  if (!summary) return null

  // Get ACWR data from training loads
  const latestLoad = await prisma.trainingLoad.findFirst({
    where: { clientId },
    orderBy: { date: 'desc' },
    select: { acuteLoad: true, chronicLoad: true, acwr: true },
  })

  return {
    clientName: client.name,
    sportType: client.sportProfile?.primarySport || null,
    weekStart: summary.weekStart.toISOString(),
    weekEnd: summary.weekEnd.toISOString(),
    totalTSS: summary.totalTSS,
    totalDistance: summary.totalDistance,
    totalDuration: summary.totalDuration,
    workoutCount: summary.workoutCount,
    compliancePercent: summary.compliancePercent,
    easyMinutes: summary.easyMinutes,
    moderateMinutes: summary.moderateMinutes,
    hardMinutes: summary.hardMinutes,
    zone1Minutes: summary.zone1Minutes,
    zone2Minutes: summary.zone2Minutes,
    zone3Minutes: summary.zone3Minutes,
    zone4Minutes: summary.zone4Minutes,
    zone5Minutes: summary.zone5Minutes,
    acuteLoad: latestLoad?.acuteLoad ?? null,
    chronicLoad: latestLoad?.chronicLoad ?? null,
    acwr: latestLoad?.acwr ?? null,
  }
}

export async function gatherTestReportData(
  testId: string
): Promise<TestReportData | null> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: {
      testDate: true,
      testType: true,
      vo2max: true,
      maxHR: true,
      maxLactate: true,
      aerobicThreshold: true,
      anaerobicThreshold: true,
      trainingZones: true,
      clientId: true,
      client: {
        select: {
          name: true,
          sportProfile: { select: { primarySport: true } },
        },
      },
    },
  })

  if (!test) return null

  // Find previous test for delta comparison
  const previousTest = await prisma.test.findFirst({
    where: {
      clientId: test.clientId,
      testType: test.testType,
      testDate: { lt: test.testDate },
    },
    orderBy: { testDate: 'desc' },
    select: {
      testDate: true,
      vo2max: true,
      anaerobicThreshold: true,
    },
  })

  const zones = (test.trainingZones as { zone: number; name: string; min: number; max: number; unit: string }[]) || []

  return {
    clientName: test.client.name,
    sportType: test.client.sportProfile?.primarySport || null,
    testDate: test.testDate.toISOString(),
    testType: test.testType,
    vo2max: test.vo2max,
    maxHR: test.maxHR,
    maxLactate: test.maxLactate,
    aerobicThreshold: test.aerobicThreshold as TestReportData['aerobicThreshold'],
    anaerobicThreshold: test.anaerobicThreshold as TestReportData['anaerobicThreshold'],
    trainingZones: zones,
    previousTest: previousTest
      ? {
          testDate: previousTest.testDate.toISOString(),
          vo2max: previousTest.vo2max,
          anaerobicThreshold: previousTest.anaerobicThreshold as TestReportData['previousTest'] extends infer T ? T extends null ? never : NonNullable<T>['anaerobicThreshold'] : never,
        }
      : null,
  }
}

export async function gatherProgramData(
  programId: string
): Promise<ProgramReportData | null> {
  return reconstructProgramForInfographic(programId)
}
