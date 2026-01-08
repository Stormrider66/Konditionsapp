/**
 * Ergometer Test Progression API
 *
 * GET /api/ergometer-tests/progression/[clientId] - Get test history and progression trends
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client'
import { logError } from '@/lib/logger-console'

// Query params schema
const querySchema = z.object({
  ergometerType: z.nativeEnum(ErgometerType).optional(),
  testProtocol: z.nativeEnum(ErgometerTestProtocol).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await requireAuth()
    const { clientId } = await params
    const { searchParams } = new URL(request.url)
    const queryResult = querySchema.safeParse(Object.fromEntries(searchParams))

    if (!queryResult.success) {
      return errorResponse(
        'Invalid query parameters',
        400,
        queryResult.error.flatten()
      )
    }

    const { ergometerType, testProtocol, startDate, endDate, limit } = queryResult.data

    // Verify client exists and user has access
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!client) {
      return errorResponse('Client not found or access denied', 404)
    }

    // Build where clause
    const where: Record<string, unknown> = {
      clientId,
    }

    if (ergometerType) {
      where.ergometerType = ergometerType
    }
    if (testProtocol) {
      where.testProtocol = testProtocol
    }
    if (startDate || endDate) {
      where.testDate = {}
      if (startDate) {
        (where.testDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.testDate as Record<string, Date>).lte = new Date(endDate)
      }
    }

    // Fetch tests
    const tests = await prisma.ergometerFieldTest.findMany({
      where,
      orderBy: { testDate: 'asc' }, // Chronological for trend analysis
      take: limit,
      select: {
        id: true,
        ergometerType: true,
        testProtocol: true,
        testDate: true,
        avgPower: true,
        peakPower: true,
        criticalPower: true,
        wPrime: true,
        avgPace: true,
        totalTime: true,
        totalCalories: true,
        confidence: true,
        valid: true,
      },
    })

    // Group tests by ergometer type and protocol
    const groupedTests = groupTestsByType(tests)

    // Calculate progression metrics for each group
    const progressionData = calculateProgressionMetrics(groupedTests)

    // Calculate personal records
    const personalRecords = calculatePersonalRecords(tests)

    // Get summary statistics
    const summary = generateSummary(tests, progressionData)

    return successResponse({
      client,
      tests,
      groupedTests,
      progressionData,
      personalRecords,
      summary,
    })
  } catch (error) {
    logError('Error fetching progression data:', error)
    return errorResponse('Failed to fetch progression data', 500)
  }
}

// ==================== HELPER FUNCTIONS ====================

interface TestRecord {
  id: string
  ergometerType: ErgometerType
  testProtocol: ErgometerTestProtocol
  testDate: Date
  avgPower: number | null
  peakPower: number | null
  criticalPower: number | null
  wPrime: number | null
  avgPace: number | null
  totalTime: number | null
  totalCalories: number | null
  confidence: string | null
  valid: boolean
}

type GroupedTests = Map<string, TestRecord[]>

function groupTestsByType(tests: TestRecord[]): Record<string, TestRecord[]> {
  const grouped: Record<string, TestRecord[]> = {}

  for (const test of tests) {
    const key = `${test.ergometerType}_${test.testProtocol}`
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(test)
  }

  return grouped
}

interface ProgressionMetric {
  ergometerType: ErgometerType
  testProtocol: ErgometerTestProtocol
  testCount: number
  dateRange: {
    first: Date
    last: Date
    daysBetween: number
  }
  metrics: {
    avgPower?: {
      first: number
      last: number
      change: number
      changePercent: number
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
      values: Array<{ date: Date; value: number }>
    }
    peakPower?: {
      first: number
      last: number
      change: number
      changePercent: number
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
      values: Array<{ date: Date; value: number }>
    }
    criticalPower?: {
      first: number
      last: number
      change: number
      changePercent: number
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
      values: Array<{ date: Date; value: number }>
    }
    wPrime?: {
      first: number
      last: number
      change: number
      changePercent: number
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
      values: Array<{ date: Date; value: number }>
    }
    avgPace?: {
      first: number
      last: number
      change: number
      changePercent: number
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
      values: Array<{ date: Date; value: number }>
    }
    totalTime?: {
      first: number
      last: number
      change: number
      changePercent: number
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
      values: Array<{ date: Date; value: number }>
    }
    totalCalories?: {
      first: number
      last: number
      change: number
      changePercent: number
      trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
      values: Array<{ date: Date; value: number }>
    }
  }
}

function calculateProgressionMetrics(
  groupedTests: Record<string, TestRecord[]>
): ProgressionMetric[] {
  const results: ProgressionMetric[] = []

  for (const [key, tests] of Object.entries(groupedTests)) {
    if (tests.length < 2) continue

    const [ergometerType, testProtocol] = key.split('_') as [ErgometerType, ErgometerTestProtocol]
    const validTests = tests.filter(t => t.valid)

    if (validTests.length < 2) continue

    const firstDate = new Date(validTests[0].testDate)
    const lastDate = new Date(validTests[validTests.length - 1].testDate)
    const daysBetween = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))

    const metric: ProgressionMetric = {
      ergometerType,
      testProtocol,
      testCount: validTests.length,
      dateRange: {
        first: firstDate,
        last: lastDate,
        daysBetween,
      },
      metrics: {},
    }

    // Calculate progression for each metric
    const metricConfigs: Array<{
      key: keyof ProgressionMetric['metrics']
      getter: (t: TestRecord) => number | null
      lowerIsBetter?: boolean
    }> = [
      { key: 'avgPower', getter: t => t.avgPower },
      { key: 'peakPower', getter: t => t.peakPower },
      { key: 'criticalPower', getter: t => t.criticalPower },
      { key: 'wPrime', getter: t => t.wPrime },
      { key: 'avgPace', getter: t => t.avgPace, lowerIsBetter: true },
      { key: 'totalTime', getter: t => t.totalTime, lowerIsBetter: true },
      { key: 'totalCalories', getter: t => t.totalCalories },
    ]

    for (const config of metricConfigs) {
      const values = validTests
        .map(t => ({ date: t.testDate, value: config.getter(t) }))
        .filter((v): v is { date: Date; value: number } => v.value !== null)

      if (values.length >= 2) {
        const first = values[0].value
        const last = values[values.length - 1].value
        const change = last - first
        const changePercent = (change / first) * 100

        let trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
        const improvementThreshold = 2 // 2% change threshold

        if (Math.abs(changePercent) < improvementThreshold) {
          trend = 'STABLE'
        } else if (config.lowerIsBetter) {
          trend = change < 0 ? 'IMPROVING' : 'DECLINING'
        } else {
          trend = change > 0 ? 'IMPROVING' : 'DECLINING'
        }

        metric.metrics[config.key] = {
          first,
          last,
          change: Math.round(change * 10) / 10,
          changePercent: Math.round(changePercent * 10) / 10,
          trend,
          values,
        }
      }
    }

    results.push(metric)
  }

  return results
}

interface PersonalRecord {
  metric: string
  value: number
  unit: string
  testId: string
  testDate: Date
  ergometerType: ErgometerType
  testProtocol: ErgometerTestProtocol
}

function calculatePersonalRecords(tests: TestRecord[]): PersonalRecord[] {
  const records: PersonalRecord[] = []
  const validTests = tests.filter(t => t.valid)

  // Group by ergometer type for type-specific records
  const byErgometer = new Map<ErgometerType, TestRecord[]>()
  for (const test of validTests) {
    const existing = byErgometer.get(test.ergometerType) || []
    existing.push(test)
    byErgometer.set(test.ergometerType, existing)
  }

  for (const [ergometerType, ergTests] of byErgometer) {
    // Best avg power
    const bestAvgPower = ergTests
      .filter(t => t.avgPower !== null)
      .sort((a, b) => (b.avgPower || 0) - (a.avgPower || 0))[0]

    if (bestAvgPower?.avgPower) {
      records.push({
        metric: 'Best Average Power',
        value: bestAvgPower.avgPower,
        unit: 'W',
        testId: bestAvgPower.id,
        testDate: bestAvgPower.testDate,
        ergometerType,
        testProtocol: bestAvgPower.testProtocol,
      })
    }

    // Best peak power
    const bestPeakPower = ergTests
      .filter(t => t.peakPower !== null)
      .sort((a, b) => (b.peakPower || 0) - (a.peakPower || 0))[0]

    if (bestPeakPower?.peakPower) {
      records.push({
        metric: 'Best Peak Power',
        value: bestPeakPower.peakPower,
        unit: 'W',
        testId: bestPeakPower.id,
        testDate: bestPeakPower.testDate,
        ergometerType,
        testProtocol: bestPeakPower.testProtocol,
      })
    }

    // Best CP
    const bestCP = ergTests
      .filter(t => t.criticalPower !== null)
      .sort((a, b) => (b.criticalPower || 0) - (a.criticalPower || 0))[0]

    if (bestCP?.criticalPower) {
      records.push({
        metric: 'Best Critical Power',
        value: bestCP.criticalPower,
        unit: 'W',
        testId: bestCP.id,
        testDate: bestCP.testDate,
        ergometerType,
        testProtocol: bestCP.testProtocol,
      })
    }

    // Best pace (lowest)
    const bestPace = ergTests
      .filter(t => t.avgPace !== null)
      .sort((a, b) => (a.avgPace || 999) - (b.avgPace || 999))[0]

    if (bestPace?.avgPace) {
      records.push({
        metric: 'Best Pace',
        value: bestPace.avgPace,
        unit: 'sec/500m',
        testId: bestPace.id,
        testDate: bestPace.testDate,
        ergometerType,
        testProtocol: bestPace.testProtocol,
      })
    }

    // Best time (lowest)
    const bestTime = ergTests
      .filter(t => t.totalTime !== null)
      .sort((a, b) => (a.totalTime || 9999) - (b.totalTime || 9999))[0]

    if (bestTime?.totalTime) {
      records.push({
        metric: 'Best Time',
        value: bestTime.totalTime,
        unit: 'sec',
        testId: bestTime.id,
        testDate: bestTime.testDate,
        ergometerType,
        testProtocol: bestTime.testProtocol,
      })
    }

    // Best calories (highest)
    const bestCals = ergTests
      .filter(t => t.totalCalories !== null)
      .sort((a, b) => (b.totalCalories || 0) - (a.totalCalories || 0))[0]

    if (bestCals?.totalCalories) {
      records.push({
        metric: 'Best Calories (10 min)',
        value: bestCals.totalCalories,
        unit: 'cal',
        testId: bestCals.id,
        testDate: bestCals.testDate,
        ergometerType,
        testProtocol: bestCals.testProtocol,
      })
    }
  }

  return records
}

interface ProgressionSummary {
  totalTests: number
  validTests: number
  ergometerTypesCovered: ErgometerType[]
  protocolsCovered: ErgometerTestProtocol[]
  overallTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'MIXED' | 'INSUFFICIENT_DATA'
  recommendations: string[]
}

function generateSummary(
  tests: TestRecord[],
  progressionData: ProgressionMetric[]
): ProgressionSummary {
  const validTests = tests.filter(t => t.valid)
  const ergometerTypes = [...new Set(tests.map(t => t.ergometerType))]
  const protocols = [...new Set(tests.map(t => t.testProtocol))]

  // Determine overall trend
  let overallTrend: ProgressionSummary['overallTrend']
  const trends = progressionData.flatMap(p =>
    Object.values(p.metrics)
      .filter((m): m is NonNullable<typeof m> => m !== undefined)
      .map(m => m.trend)
  )

  if (trends.length === 0) {
    overallTrend = 'INSUFFICIENT_DATA'
  } else {
    const improvingCount = trends.filter(t => t === 'IMPROVING').length
    const decliningCount = trends.filter(t => t === 'DECLINING').length
    const stableCount = trends.filter(t => t === 'STABLE').length

    if (improvingCount > decliningCount && improvingCount > stableCount) {
      overallTrend = 'IMPROVING'
    } else if (decliningCount > improvingCount && decliningCount > stableCount) {
      overallTrend = 'DECLINING'
    } else if (stableCount >= improvingCount && stableCount >= decliningCount) {
      overallTrend = 'STABLE'
    } else {
      overallTrend = 'MIXED'
    }
  }

  // Generate recommendations
  const recommendations: string[] = []

  if (tests.length < 3) {
    recommendations.push('Complete more tests to establish reliable progression trends')
  }

  if (ergometerTypes.length === 1) {
    recommendations.push(`Consider testing on additional ergometer types for cross-training insights`)
  }

  if (overallTrend === 'IMPROVING') {
    recommendations.push('Training adaptations are positive. Continue current approach.')
  } else if (overallTrend === 'DECLINING') {
    recommendations.push('Performance may be declining. Consider rest, nutrition, or program adjustments.')
  } else if (overallTrend === 'STABLE') {
    recommendations.push('Performance is stable. Consider progressive overload to stimulate adaptation.')
  }

  // Check test frequency
  if (validTests.length >= 2) {
    const firstDate = new Date(validTests[0].testDate)
    const lastDate = new Date(validTests[validTests.length - 1].testDate)
    const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    const avgDaysBetweenTests = daysBetween / (validTests.length - 1)

    if (avgDaysBetweenTests > 60) {
      recommendations.push('Consider more frequent testing (every 4-8 weeks) for better tracking')
    } else if (avgDaysBetweenTests < 14) {
      recommendations.push('Testing frequency is high. Allow adequate recovery between tests.')
    }
  }

  return {
    totalTests: tests.length,
    validTests: validTests.length,
    ergometerTypesCovered: ergometerTypes,
    protocolsCovered: protocols,
    overallTrend,
    recommendations,
  }
}
