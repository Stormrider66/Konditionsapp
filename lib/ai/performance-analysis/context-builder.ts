/**
 * Performance Analysis Context Builder
 *
 * Gathers and formats all relevant data for AI-powered performance analysis.
 * This includes test data, training history, athlete profile, and race results.
 */

import { prisma } from '@/lib/prisma'
import {
  TestDataForAnalysis,
  TrainingContextForAnalysis,
  AthleteProfileForAnalysis,
  PerformanceAnalysisContext,
} from './types'
import { calculateEconomy } from '@/lib/calculations/economy'
import { generateLactateCurveInterpretation, classifyAthleteType } from '@/lib/calculations/interpretations'

/**
 * Build complete context for AI analysis of a test
 */
export async function buildAnalysisContext(
  testId: string,
  options: {
    includePreviousTests?: number // how many previous tests to include (default 3)
    trainingLookbackWeeks?: number // weeks of training to analyze (default 12)
  } = {}
): Promise<PerformanceAnalysisContext | null> {
  const { includePreviousTests = 3, trainingLookbackWeeks = 12 } = options

  // Fetch the test with all related data
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      client: {
        include: {
          user: { select: { id: true, name: true } },
          sportProfile: true,
          athleteAccount: {
            include: {
              dailyReadiness: {
                orderBy: { date: 'desc' },
                take: 7,
              },
            },
          },
        },
      },
      stages: {
        orderBy: { sequence: 'asc' },
      },
    },
  })

  if (!test) return null

  // Build test data for analysis
  const testData = await buildTestData(test)

  // Fetch previous tests of same type
  const previousTests = await fetchPreviousTests(
    test.clientId,
    test.testType,
    test.testDate,
    includePreviousTests
  )

  // Build training context
  const trainingContext = await buildTrainingContext(
    test.clientId,
    test.testDate,
    trainingLookbackWeeks
  )

  // Build athlete profile
  const athleteProfile = buildAthleteProfile(test.client)

  // Fetch race results for context
  const races = await fetchRaceResults(test.clientId)

  return {
    test: testData,
    previousTests,
    trainingContext,
    athlete: athleteProfile,
    races,
  }
}

/**
 * Transform database test to analysis format
 */
async function buildTestData(test: {
  id: string
  testDate: Date
  testType: string
  vo2max: number | null
  maxHR: number | null
  maxLactate: number | null
  aerobicThreshold: unknown
  anaerobicThreshold: unknown
  stages: Array<{
    sequence: number
    duration: number
    heartRate: number | null
    lactate: number | null
    vo2: number | null
    speed: number | null
    power: number | null
    pace: number | null
    economy: number | null
    wattsPerKg: number | null
  }>
  client: {
    weight: number | null
  }
}): Promise<TestDataForAnalysis> {
  // Parse thresholds
  const aerobicThreshold = test.aerobicThreshold as {
    hr?: number
    speed?: number
    power?: number
    pace?: number
    lactate?: number
    percentOfMax?: number
  } | null

  const anaerobicThreshold = test.anaerobicThreshold as {
    hr?: number
    speed?: number
    power?: number
    pace?: number
    lactate?: number
    percentOfMax?: number
  } | null

  // Calculate economy data for running tests
  const economyData: Array<{ speed: number; vo2: number; economy: number }> = []
  if (test.testType === 'RUNNING') {
    for (const stage of test.stages) {
      if (stage.speed && stage.vo2) {
        const economy = calculateEconomy(stage.vo2, stage.speed)
        if (economy) {
          economyData.push({
            speed: stage.speed,
            vo2: stage.vo2,
            economy,
          })
        }
      }
    }
  }

  // Build cycling data
  let cyclingData: { ftp: number; wattsPerKg: number; maxPower: number } | undefined
  if (test.testType === 'CYCLING' && test.stages.length > 0) {
    const maxPower = Math.max(...test.stages.filter(s => s.power).map(s => s.power!))
    const atPower = anaerobicThreshold?.power
    if (atPower && test.client.weight) {
      cyclingData = {
        ftp: atPower,
        wattsPerKg: atPower / test.client.weight,
        maxPower,
      }
    }
  }

  // Get intensity value based on test type
  const getIntensity = (stage: { speed?: number | null; power?: number | null; pace?: number | null }) => {
    if (test.testType === 'RUNNING') return stage.speed ?? 0
    if (test.testType === 'CYCLING') return stage.power ?? 0
    if (test.testType === 'SKIING') return stage.pace ?? 0
    return 0
  }

  // Classify lactate curve and athlete type
  // Create stages in the format expected by generateLactateCurveInterpretation
  const stagesForCurve = test.stages.map(s => ({
    id: '',
    testId: test.id,
    sequence: s.sequence,
    duration: s.duration,
    heartRate: s.heartRate ?? 0,
    lactate: s.lactate ?? 0,
    speed: s.speed ?? undefined,
    power: s.power ?? undefined,
    pace: s.pace ?? undefined,
  }))

  const lactateCurveInfo = generateLactateCurveInterpretation(
    stagesForCurve,
    test.maxLactate ?? 0
  )
  const lactateCurveType = lactateCurveInfo.curveType

  // Get athlete type based on thresholds
  let athleteType: 'UTHALLIGHET' | 'SNABBHET' | 'ALLROUND' | undefined
  if (aerobicThreshold && anaerobicThreshold && test.maxHR) {
    const lt1Percent = (aerobicThreshold.hr ?? 0) / test.maxHR * 100
    const lt2Percent = (anaerobicThreshold.hr ?? 0) / test.maxHR * 100
    athleteType = classifyAthleteType(lt1Percent, lt2Percent)
  }

  return {
    id: test.id,
    date: test.testDate.toISOString(),
    testType: test.testType as 'RUNNING' | 'CYCLING' | 'SKIING',
    vo2max: test.vo2max,
    maxHR: test.maxHR ?? 0,
    maxLactate: test.maxLactate ?? 0,
    aerobicThreshold: aerobicThreshold ? {
      hr: aerobicThreshold.hr ?? 0,
      intensity: getIntensity(aerobicThreshold),
      lactate: aerobicThreshold.lactate ?? 0,
      percentOfMax: aerobicThreshold.percentOfMax ?? 0,
    } : null,
    anaerobicThreshold: anaerobicThreshold ? {
      hr: anaerobicThreshold.hr ?? 0,
      intensity: getIntensity(anaerobicThreshold),
      lactate: anaerobicThreshold.lactate ?? 0,
      percentOfMax: anaerobicThreshold.percentOfMax ?? 0,
    } : null,
    economyData,
    cyclingData,
    stages: test.stages.map(s => ({
      sequence: s.sequence,
      duration: s.duration,
      heartRate: s.heartRate ?? 0,
      lactate: s.lactate ?? 0,
      vo2: s.vo2 ?? undefined,
      speed: s.speed ?? undefined,
      power: s.power ?? undefined,
      pace: s.pace ?? undefined,
    })),
    lactateCurveType,
    athleteType,
  }
}

/**
 * Fetch previous tests for comparison
 */
async function fetchPreviousTests(
  clientId: string,
  testType: string,
  beforeDate: Date,
  limit: number
): Promise<TestDataForAnalysis[]> {
  const tests = await prisma.test.findMany({
    where: {
      clientId,
      testType,
      testDate: { lt: beforeDate },
    },
    include: {
      client: { select: { weight: true } },
      stages: { orderBy: { sequence: 'asc' } },
    },
    orderBy: { testDate: 'desc' },
    take: limit,
  })

  const results: TestDataForAnalysis[] = []
  for (const test of tests) {
    results.push(await buildTestData(test))
  }
  return results
}

/**
 * Build training context from workout data
 */
async function buildTrainingContext(
  clientId: string,
  testDate: Date,
  weeks: number
): Promise<TrainingContextForAnalysis | null> {
  const periodEnd = testDate
  const periodStart = new Date(testDate)
  periodStart.setDate(periodStart.getDate() - weeks * 7)

  // Fetch workouts in the period
  const workouts = await prisma.workoutSession.findMany({
    where: {
      clientId,
      date: {
        gte: periodStart,
        lt: periodEnd,
      },
      status: 'COMPLETED',
    },
    include: {
      workout: true,
    },
  })

  if (workouts.length === 0) return null

  // Calculate volume metrics
  const totalSessions = workouts.length
  const totalDistanceKm = workouts.reduce((sum, w) => sum + (w.distance ?? 0), 0)
  const totalDurationHours = workouts.reduce((sum, w) => sum + (w.duration ?? 0), 0) / 60

  // Calculate weekly averages
  const avgWeeklyDistance = totalDistanceKm / weeks

  // Calculate TSS if available
  const tssValues = workouts.filter(w => w.tss !== null).map(w => w.tss!)
  const avgWeeklyTSS = tssValues.length > 0
    ? tssValues.reduce((a, b) => a + b, 0) / weeks
    : 0

  // Calculate zone distribution (simplified - would need more detailed data)
  // This is a placeholder - actual implementation depends on workout data structure
  const zoneDistribution = {
    zone1Percent: 0,
    zone2Percent: 0,
    zone3Percent: 0,
    zone4Percent: 0,
    zone5Percent: 0,
  }

  // Count training types based on workout category/type
  const trainingTypeDistribution = {
    easyRuns: 0,
    longRuns: 0,
    tempoRuns: 0,
    intervals: 0,
    recovery: 0,
  }

  for (const session of workouts) {
    const workout = session.workout
    if (!workout) continue

    // Categorize based on workout type
    const type = workout.type?.toUpperCase() ?? ''
    if (type.includes('EASY') || type.includes('RECOVERY')) {
      trainingTypeDistribution.easyRuns++
    } else if (type.includes('LONG')) {
      trainingTypeDistribution.longRuns++
    } else if (type.includes('TEMPO') || type.includes('THRESHOLD')) {
      trainingTypeDistribution.tempoRuns++
    } else if (type.includes('INTERVAL') || type.includes('VO2')) {
      trainingTypeDistribution.intervals++
    } else {
      trainingTypeDistribution.recovery++
    }
  }

  // Fetch strength sessions
  const strengthSessions = await prisma.strengthWorkoutResult.count({
    where: {
      clientId,
      completedAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  })

  // Fetch readiness data
  const readinessData = await prisma.dailyReadiness.findMany({
    where: {
      athleteAccount: { clientId },
      date: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  })

  const avgReadiness = readinessData.length > 0
    ? readinessData.reduce((sum, r) => sum + (r.overallReadiness ?? 5), 0) / readinessData.length
    : 5

  const avgSleepHours = readinessData.length > 0
    ? readinessData.reduce((sum, r) => sum + (r.sleepDuration ?? 7), 0) / readinessData.length
    : 7

  const avgSleepQuality = readinessData.length > 0
    ? readinessData.reduce((sum, r) => sum + (r.sleepQuality ?? 3), 0) / readinessData.length
    : 3

  // Fetch ACWR data
  const acwrData = await prisma.aCWRHistory.findMany({
    where: {
      clientId,
      date: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  })

  const avgACWR = acwrData.length > 0
    ? acwrData.reduce((sum, a) => sum + a.acwr, 0) / acwrData.length
    : 1

  const peakACWR = acwrData.length > 0
    ? Math.max(...acwrData.map(a => a.acwr))
    : 1

  const daysInDangerZone = acwrData.filter(a => a.acwr > 1.5).length

  // Calculate completion rate (simplified)
  const plannedWorkouts = await prisma.workoutSession.count({
    where: {
      clientId,
      date: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  })

  const completionRate = plannedWorkouts > 0
    ? (totalSessions / plannedWorkouts) * 100
    : 100

  // Calculate longest training streak
  const sortedDates = workouts
    .map(w => w.date.toISOString().split('T')[0])
    .sort()

  let longestStreak = 0
  let currentStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays === 1) {
      currentStreak++
    } else {
      longestStreak = Math.max(longestStreak, currentStreak)
      currentStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak)

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    weekCount: weeks,
    totalSessions,
    totalDistanceKm,
    totalDurationHours,
    avgWeeklyTSS,
    avgWeeklyDistance,
    zoneDistribution,
    trainingTypeDistribution,
    strengthSessions,
    avgReadiness,
    avgSleepHours,
    avgSleepQuality,
    avgACWR,
    peakACWR,
    daysInDangerZone,
    completionRate,
    longestStreak,
  }
}

/**
 * Build athlete profile from client data
 */
function buildAthleteProfile(client: {
  id: string
  name: string
  birthDate: Date | null
  gender: string | null
  sportProfile: {
    sport: string
    experienceYears: number | null
    weeklyTrainingHours: number | null
    primaryGoal: string | null
  } | null
  athleteAccount: {
    id: string
    dailyReadiness: Array<{
      overallReadiness: number | null
    }>
  } | null
  user: { id: string; name: string | null } | null
}): AthleteProfileForAnalysis {
  const now = new Date()
  const age = client.birthDate
    ? Math.floor((now.getTime() - client.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 30 // default if unknown

  const recentReadiness = client.athleteAccount?.dailyReadiness?.[0]?.overallReadiness ?? null

  return {
    id: client.id,
    name: client.name,
    age,
    gender: (client.gender as 'MALE' | 'FEMALE') ?? 'MALE',
    sport: client.sportProfile?.sport ?? 'Running',
    experienceYears: client.sportProfile?.experienceYears ?? 0,
    weeklyTrainingHours: client.sportProfile?.weeklyTrainingHours ?? 0,
    primaryGoal: client.sportProfile?.primaryGoal ?? null,
    targetRaces: [], // Would need to fetch from calendar events
    trainingAgeMonths: 0, // Would need to calculate from first workout
    totalTestsCompleted: 0, // Will be set later if needed
    currentACWR: null, // Will be fetched separately if needed
    currentChronicLoad: null,
    recentReadiness,
    activeInjury: null, // Would need to check injury records
  }
}

/**
 * Fetch race results for context
 */
async function fetchRaceResults(
  clientId: string
): Promise<Array<{ date: string; distance: string; time: string; vdot: number | null }>> {
  const races = await prisma.raceResult.findMany({
    where: { clientId },
    orderBy: { raceDate: 'desc' },
    take: 10,
    select: {
      raceDate: true,
      distance: true,
      time: true,
      vdot: true,
    },
  })

  return races.map(r => ({
    date: r.raceDate.toISOString(),
    distance: r.distance,
    time: r.time,
    vdot: r.vdot,
  }))
}

/**
 * Build context for test comparison
 */
export async function buildComparisonContext(
  currentTestId: string,
  previousTestId: string
): Promise<{
  current: TestDataForAnalysis
  previous: TestDataForAnalysis
  trainingBetween: TrainingContextForAnalysis | null
  athlete: AthleteProfileForAnalysis
} | null> {
  // Fetch both tests
  const [currentTest, previousTest] = await Promise.all([
    prisma.test.findUnique({
      where: { id: currentTestId },
      include: {
        client: {
          include: {
            user: { select: { id: true, name: true } },
            sportProfile: true,
            athleteAccount: {
              include: {
                dailyReadiness: { orderBy: { date: 'desc' }, take: 7 },
              },
            },
          },
        },
        stages: { orderBy: { sequence: 'asc' } },
      },
    }),
    prisma.test.findUnique({
      where: { id: previousTestId },
      include: {
        client: { select: { weight: true } },
        stages: { orderBy: { sequence: 'asc' } },
      },
    }),
  ])

  if (!currentTest || !previousTest) return null

  const current = await buildTestData(currentTest)
  const previous = await buildTestData(previousTest)

  // Calculate weeks between tests
  const daysBetween = Math.floor(
    (currentTest.testDate.getTime() - previousTest.testDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const weeksBetween = Math.ceil(daysBetween / 7)

  // Build training context for period between tests
  const trainingBetween = await buildTrainingContext(
    currentTest.clientId,
    currentTest.testDate,
    weeksBetween
  )

  const athlete = buildAthleteProfile(currentTest.client)

  return {
    current,
    previous,
    trainingBetween,
    athlete,
  }
}

/**
 * Build context for trend analysis
 */
export async function buildTrendContext(
  clientId: string,
  months: number = 12
): Promise<{
  tests: TestDataForAnalysis[]
  athlete: AthleteProfileForAnalysis
  overallTraining: TrainingContextForAnalysis | null
} | null> {
  const since = new Date()
  since.setMonth(since.getMonth() - months)

  // Fetch all tests in period
  const tests = await prisma.test.findMany({
    where: {
      clientId,
      testDate: { gte: since },
    },
    include: {
      client: {
        include: {
          user: { select: { id: true, name: true } },
          sportProfile: true,
          athleteAccount: {
            include: {
              dailyReadiness: { orderBy: { date: 'desc' }, take: 7 },
            },
          },
        },
      },
      stages: { orderBy: { sequence: 'asc' } },
    },
    orderBy: { testDate: 'asc' },
  })

  if (tests.length === 0) return null

  const testData: TestDataForAnalysis[] = []
  for (const test of tests) {
    testData.push(await buildTestData(test))
  }

  const athlete = buildAthleteProfile(tests[0].client)
  athlete.totalTestsCompleted = tests.length

  // Build overall training context
  const weeks = Math.ceil(months * 4.33) // approximate weeks in months
  const overallTraining = await buildTrainingContext(clientId, new Date(), weeks)

  return {
    tests: testData,
    athlete,
    overallTraining,
  }
}
