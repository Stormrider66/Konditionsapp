/**
 * Single Ergometer Field Test API
 *
 * GET /api/ergometer-tests/[id] - Get a single test with full analysis
 * DELETE /api/ergometer-tests/[id] - Delete a test
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse, successResponse } from '@/lib/api/utils'
import { ErgometerTestProtocol } from '@prisma/client'
import {
  analyze4x4IntervalTest,
  calculate3MinuteAllOut,
  calculateMultiTrialCP,
  analyze6SecondPeakPower,
  analyze7StrokeMaxPower,
  analyze30SecondSprint,
  analyzePacingStrategy,
  calculateFatigueIndex,
  analyzeHRPowerCoupling,
} from '@/lib/training-engine/ergometer'
import type {
  Interval4x4RawData,
  CP3MinRawData,
  CPMultiTrialRawData,
  PeakPowerRawData,
  SevenStrokeRawData,
} from '@/lib/training-engine/ergometer'

// ==================== GET HANDLER ====================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const test = await prisma.ergometerFieldTest.findFirst({
      where: {
        id,
        client: {
          userId: user.id,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!test) {
      return errorResponse('Test not found or access denied', 404)
    }

    // Generate detailed analysis based on protocol
    const detailedAnalysis = generateDetailedAnalysis(test)

    // Get previous tests for comparison
    const previousTests = await prisma.ergometerFieldTest.findMany({
      where: {
        clientId: test.clientId,
        ergometerType: test.ergometerType,
        testProtocol: test.testProtocol,
        testDate: {
          lt: test.testDate,
        },
      },
      orderBy: { testDate: 'desc' },
      take: 5,
      select: {
        id: true,
        testDate: true,
        avgPower: true,
        peakPower: true,
        criticalPower: true,
        wPrime: true,
        totalTime: true,
        avgPace: true,
        totalCalories: true,
      },
    })

    // Calculate progression if we have previous tests
    const progression = calculateProgression(test, previousTests)

    return successResponse({
      test,
      detailedAnalysis,
      previousTests,
      progression,
    })
  } catch (error) {
    console.error('Error fetching ergometer test:', error)
    return errorResponse('Failed to fetch ergometer test', 500)
  }
}

// ==================== DELETE HANDLER ====================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify test exists and user has access
    const test = await prisma.ergometerFieldTest.findFirst({
      where: {
        id,
        client: {
          userId: user.id,
        },
      },
    })

    if (!test) {
      return errorResponse('Test not found or access denied', 404)
    }

    await prisma.ergometerFieldTest.delete({
      where: { id },
    })

    return successResponse({ message: 'Test deleted successfully' })
  } catch (error) {
    console.error('Error deleting ergometer test:', error)
    return errorResponse('Failed to delete ergometer test', 500)
  }
}

// ==================== ANALYSIS HELPERS ====================

interface DetailedAnalysis {
  protocol: string
  summary: string
  metrics: Record<string, unknown>
  pacing?: {
    strategy: string
    description: string
    recommendations: string[]
  }
  fatigue?: {
    fatigueIndex: number
    rating: string
    description: string
  }
  hrPowerCoupling?: {
    coupling: string
    hrPerWatt: number
    driftRate: number
    description: string
  }
  recommendations: string[]
}

function generateDetailedAnalysis(test: {
  testProtocol: ErgometerTestProtocol
  rawData: unknown
  avgPower: number | null
  peakPower: number | null
  criticalPower: number | null
  wPrime: number | null
  confidence: string | null
  warnings: unknown
  intervalData: unknown
}): DetailedAnalysis {
  const analysis: DetailedAnalysis = {
    protocol: test.testProtocol,
    summary: '',
    metrics: {},
    recommendations: [],
  }

  const rawData = test.rawData as unknown

  switch (test.testProtocol) {
    case ErgometerTestProtocol.INTERVAL_4X4: {
      const intervalData = rawData as Interval4x4RawData
      const intervalAnalysis = analyze4x4IntervalTest(intervalData)

      analysis.summary = `4×4min interval test with ${intervalAnalysis.consistency.toLowerCase()} pacing consistency`
      analysis.metrics = {
        avgPower: intervalAnalysis.avgPower,
        intervalPowers: intervalAnalysis.intervalPowers,
        consistency: intervalAnalysis.consistency,
        decoupling: intervalAnalysis.decoupling,
        hrDrift: intervalAnalysis.hrDrift,
        estimatedCP: intervalAnalysis.estimatedCP,
        confidence: intervalAnalysis.confidence,
      }

      // Add pacing analysis
      analysis.pacing = analyzePacingStrategy(intervalAnalysis.intervalPowers)

      // Add fatigue index
      analysis.fatigue = calculateFatigueIndex(intervalAnalysis.intervalPowers)

      // Add HR/Power coupling if HR data available
      const intervals = intervalData.intervals
      if (intervals.every(i => i.avgHR)) {
        analysis.hrPowerCoupling = analyzeHRPowerCoupling(
          intervals.map(i => ({ avgPower: i.avgPower, avgHR: i.avgHR }))
        )
      }

      analysis.recommendations = intervalAnalysis.recommendations
      break
    }

    case ErgometerTestProtocol.CP_3MIN_ALL_OUT: {
      const cpData = rawData as CP3MinRawData
      const cpAnalysis = calculate3MinuteAllOut(cpData.powerSamples)

      analysis.summary = `3-minute all-out test: CP = ${cpAnalysis.criticalPower}W, W' = ${cpAnalysis.wPrimeKJ}kJ`
      analysis.metrics = {
        criticalPower: cpAnalysis.criticalPower,
        wPrime: cpAnalysis.wPrime,
        wPrimeKJ: cpAnalysis.wPrimeKJ,
        confidence: cpAnalysis.confidence,
        modelFit: cpAnalysis.modelFit,
      }
      analysis.recommendations = cpAnalysis.recommendations
      break
    }

    case ErgometerTestProtocol.CP_MULTI_TRIAL: {
      const trials = (rawData as CPMultiTrialRawData).trials
      const cpAnalysis = calculateMultiTrialCP(trials)

      analysis.summary = `Multi-trial CP test (${trials.length} trials): CP = ${cpAnalysis.criticalPower}W, W' = ${(cpAnalysis.wPrime / 1000).toFixed(1)}kJ`
      analysis.metrics = {
        criticalPower: cpAnalysis.criticalPower,
        wPrime: cpAnalysis.wPrime,
        wPrimeKJ: Math.round(cpAnalysis.wPrime / 100) / 10,
        r2: cpAnalysis.r2,
        trials: trials.map(t => ({
          duration: t.duration,
          avgPower: t.avgPower,
          totalWork: t.duration * t.avgPower,
        })),
        confidence: cpAnalysis.confidence,
        modelFit: cpAnalysis.modelFit,
      }
      analysis.recommendations = cpAnalysis.recommendations
      break
    }

    case ErgometerTestProtocol.PEAK_POWER_6S: {
      const ppData = rawData as PeakPowerRawData
      const ppAnalysis = analyze6SecondPeakPower(ppData)

      analysis.summary = `6-second peak power: ${ppAnalysis.peakPower}W`
      analysis.metrics = {
        peakPower: ppAnalysis.peakPower,
        avgPower: ppAnalysis.avgPower,
        peakToAvgRatio: ppAnalysis.peakToAvgRatio,
        powerDecay: ppAnalysis.powerDecay,
        quality: ppAnalysis.quality,
        confidence: ppAnalysis.confidence,
      }
      analysis.recommendations = ppAnalysis.recommendations
      break
    }

    case ErgometerTestProtocol.PEAK_POWER_7_STROKE: {
      const strokeData = rawData as SevenStrokeRawData
      const strokeAnalysis = analyze7StrokeMaxPower(strokeData)

      analysis.summary = `7-stroke max: Peak ${strokeAnalysis.peakPower}W, Avg ${strokeAnalysis.avgPower}W`
      analysis.metrics = {
        peakPower: strokeAnalysis.peakPower,
        avgPower: strokeAnalysis.avgPower,
        peakStroke: strokeAnalysis.peakStroke,
        strokes: strokeData.strokes,
        consistency: strokeAnalysis.consistency,
        powerProfile: strokeAnalysis.powerProfile,
        quality: strokeAnalysis.quality,
        confidence: strokeAnalysis.confidence,
      }
      analysis.recommendations = strokeAnalysis.recommendations
      break
    }

    case ErgometerTestProtocol.PEAK_POWER_30S: {
      const sprintData = rawData as (PeakPowerRawData & { minPower?: number })
      const sprintAnalysis = analyze30SecondSprint(sprintData)

      analysis.summary = `30-second sprint: Peak ${sprintAnalysis.peakPower}W, Avg ${sprintAnalysis.avgPower}W, FI ${sprintAnalysis.fatigueIndex.toFixed(1)}%`
      analysis.metrics = {
        peakPower: sprintAnalysis.peakPower,
        avgPower: sprintAnalysis.avgPower,
        minPower: sprintAnalysis.minPower,
        fatigueIndex: sprintAnalysis.fatigueIndex,
        fatigueRating: sprintAnalysis.fatigueRating,
        anaerobicCapacity: sprintAnalysis.anaerobicCapacity,
        totalWork: sprintAnalysis.totalWork,
        confidence: sprintAnalysis.confidence,
      }
      analysis.recommendations = sprintAnalysis.recommendations
      break
    }

    case ErgometerTestProtocol.TT_1K:
    case ErgometerTestProtocol.TT_2K: {
      const ttData = rawData as { totalTime: number; avgPower: number; avgPace: number; avgStrokeRate?: number }
      const distance = test.testProtocol === ErgometerTestProtocol.TT_1K ? 1000 : 2000

      const minutes = Math.floor(ttData.totalTime / 60)
      const seconds = (ttData.totalTime % 60).toFixed(1)
      const paceMin = Math.floor(ttData.avgPace / 60)
      const paceSec = Math.round(ttData.avgPace % 60)

      analysis.summary = `${distance / 1000}K time trial: ${minutes}:${seconds.padStart(4, '0')}, ${ttData.avgPower}W avg`
      analysis.metrics = {
        totalTime: ttData.totalTime,
        totalTimeFormatted: `${minutes}:${seconds.padStart(4, '0')}`,
        avgPower: ttData.avgPower,
        avgPace: ttData.avgPace,
        avgPaceFormatted: `${paceMin}:${paceSec.toString().padStart(2, '0')}/500m`,
        avgStrokeRate: ttData.avgStrokeRate,
        distance,
        estimatedThreshold: Math.round(ttData.avgPower * (test.testProtocol === ErgometerTestProtocol.TT_1K ? 0.86 : 0.92)),
      }
      break
    }

    case ErgometerTestProtocol.TT_10MIN: {
      const airbikeData = rawData as { totalCalories: number; totalDistance?: number; avgRPM?: number; avgPower?: number }

      analysis.summary = `10-minute air bike test: ${airbikeData.totalCalories} calories`
      analysis.metrics = {
        totalCalories: airbikeData.totalCalories,
        calsPerMinute: Math.round(airbikeData.totalCalories / 10 * 10) / 10,
        totalDistance: airbikeData.totalDistance,
        avgRPM: airbikeData.avgRPM,
        avgPower: airbikeData.avgPower,
      }
      break
    }

    case ErgometerTestProtocol.TT_20MIN: {
      const ftpData = rawData as { avgPower: number; normalizedPower?: number; correctionFactor: number }
      const ftp = Math.round(ftpData.avgPower * ftpData.correctionFactor)

      analysis.summary = `20-minute FTP test: ${ftpData.avgPower}W avg → FTP ${ftp}W`
      analysis.metrics = {
        avgPower: ftpData.avgPower,
        normalizedPower: ftpData.normalizedPower,
        correctionFactor: ftpData.correctionFactor,
        estimatedFTP: ftp,
        wattsPerKgNote: 'Calculate W/kg by dividing FTP by body weight in kg',
      }
      break
    }

    case ErgometerTestProtocol.MAP_RAMP: {
      const mapData = rawData as { mapWatts: number; peakPower: number; stages: unknown[] }

      analysis.summary = `MAP ramp test: MAP = ${mapData.mapWatts}W, Peak = ${mapData.peakPower}W`
      analysis.metrics = {
        mapWatts: mapData.mapWatts,
        peakPower: mapData.peakPower,
        completedStages: (mapData.stages as Array<{ completed: boolean }>).filter(s => s.completed).length,
        totalStages: mapData.stages.length,
      }
      break
    }
  }

  // Add warnings if present
  if (test.warnings && Array.isArray(test.warnings)) {
    analysis.metrics.warnings = test.warnings
  }

  return analysis
}

// ==================== PROGRESSION HELPERS ====================

interface ProgressionResult {
  hasHistory: boolean
  lastTest?: {
    date: Date
    daysSince: number
  }
  changes: {
    metric: string
    previous: number | null
    current: number | null
    change: number | null
    changePercent: number | null
    improved: boolean | null
  }[]
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA'
}

function calculateProgression(
  currentTest: {
    avgPower: number | null
    peakPower: number | null
    criticalPower: number | null
    wPrime: number | null
    totalTime: number | null
    avgPace: number | null
    totalCalories: number | null
  },
  previousTests: Array<{
    testDate: Date
    avgPower: number | null
    peakPower: number | null
    criticalPower: number | null
    wPrime: number | null
    totalTime: number | null
    avgPace: number | null
    totalCalories: number | null
  }>
): ProgressionResult {
  if (previousTests.length === 0) {
    return {
      hasHistory: false,
      trend: 'INSUFFICIENT_DATA',
      changes: [],
    }
  }

  const lastTest = previousTests[0]
  const daysSince = Math.round(
    (Date.now() - new Date(lastTest.testDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const changes: ProgressionResult['changes'] = []

  // Compare relevant metrics (higher is better except for pace/time)
  const metricsToCompare: Array<{
    metric: string
    current: number | null
    previous: number | null
    lowerIsBetter?: boolean
  }> = [
    { metric: 'avgPower', current: currentTest.avgPower, previous: lastTest.avgPower },
    { metric: 'peakPower', current: currentTest.peakPower, previous: lastTest.peakPower },
    { metric: 'criticalPower', current: currentTest.criticalPower, previous: lastTest.criticalPower },
    { metric: 'wPrime', current: currentTest.wPrime, previous: lastTest.wPrime },
    { metric: 'totalTime', current: currentTest.totalTime, previous: lastTest.totalTime, lowerIsBetter: true },
    { metric: 'avgPace', current: currentTest.avgPace, previous: lastTest.avgPace, lowerIsBetter: true },
    { metric: 'totalCalories', current: currentTest.totalCalories, previous: lastTest.totalCalories },
  ]

  let improvementCount = 0
  let declineCount = 0

  for (const { metric, current, previous, lowerIsBetter } of metricsToCompare) {
    if (current !== null && previous !== null) {
      const change = current - previous
      const changePercent = (change / previous) * 100
      const improved = lowerIsBetter ? change < 0 : change > 0

      changes.push({
        metric,
        previous,
        current,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
        improved,
      })

      if (improved) improvementCount++
      else if (change !== 0) declineCount++
    }
  }

  // Determine overall trend
  let trend: ProgressionResult['trend']
  if (changes.length < 2) {
    trend = 'INSUFFICIENT_DATA'
  } else if (improvementCount > declineCount) {
    trend = 'IMPROVING'
  } else if (declineCount > improvementCount) {
    trend = 'DECLINING'
  } else {
    trend = 'STABLE'
  }

  return {
    hasHistory: true,
    lastTest: {
      date: lastTest.testDate,
      daysSince,
    },
    changes,
    trend,
  }
}
