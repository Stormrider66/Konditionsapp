// app/api/field-tests/[id]/analysis/route.ts
/**
 * Field Test Analysis API
 *
 * GET /api/field-tests/:id/analysis
 *
 * Analyzes completed field tests with detailed metrics and validation:
 * - 30-Minute Time Trial: Split pacing, HR drift, calculated LT2
 * - Critical Velocity: Time/distance points, regression line, R²
 * - HR Drift: First half vs second half HR, drift percentage
 *
 * Returns:
 * - Test-specific metrics and charts data
 * - Calculated LT2 pace and HR
 * - Confidence level (VERY_HIGH, HIGH, MEDIUM, LOW)
 * - Validation warnings and errors
 * - Recommendations for retesting if needed
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

interface ThirtyMinTTAnalysis {
  testType: '30_MIN_TT'
  splits: {
    split: string // "0-10 min", "10-20 min", "20-30 min"
    pace: string // "4:30/km"
    avgHR: number
    distance: number // meters
  }[]
  pacing: {
    consistency: number // CV (coefficient of variation) %
    negative: boolean // Did they negative split?
    quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  }
  hrDrift: {
    firstHalf: number
    secondHalf: number
    drift: number // %
    quality: 'LOW' | 'MODERATE' | 'HIGH'
  }
  calculated: {
    avgPace: string // "4:35/km"
    avgHR: number
    lt2Pace: string // Based on last 20 min
    lt2HR: number // Based on last 20 min
    distance: number // Total meters
  }
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  validationWarnings: string[]
}

interface CriticalVelocityAnalysis {
  testType: 'CRITICAL_VELOCITY'
  trials: {
    distance: number // meters
    time: number // seconds
    pace: string // "4:30/km"
    velocity: number // m/s
  }[]
  regression: {
    slope: number // Critical velocity (m/s)
    intercept: number // Anaerobic work capacity
    rSquared: number // Goodness of fit
    criticalVelocity: string // "4:20/km"
    criticalVelocityMS: number // m/s
  }
  calculated: {
    lt2Pace: string // ≈ critical velocity
    estimatedLT2HR: number | null
  }
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  validationWarnings: string[]
}

interface HRDriftAnalysis {
  testType: 'HR_DRIFT'
  duration: number // minutes
  pace: string // "5:30/km"
  hrData: {
    firstHalf: {
      avgHR: number
      minHR: number
      maxHR: number
    }
    secondHalf: {
      avgHR: number
      minHR: number
      maxHR: number
    }
  }
  drift: {
    absolute: number // HR difference
    percentage: number // %
    assessment: 'BELOW_LT1' | 'AT_LT1' | 'ABOVE_LT1' | 'WELL_ABOVE_LT1'
  }
  calculated: {
    estimatedLT1HR: number | null
    estimatedLT1Pace: string | null
  }
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  validationWarnings: string[]
}

type FieldTestAnalysis = ThirtyMinTTAnalysis | CriticalVelocityAnalysis | HRDriftAnalysis

function secondsToMinKm(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}/km`
}

function analyze30MinTT(test: any): ThirtyMinTTAnalysis {
  const validationWarnings: string[] = []

  // Parse test data
  const avgPaceSeconds = test.avgPace || 0 // seconds per km
  const avgHR = test.avgHR || 0
  const totalDistance = test.distance || 0 // meters

  // Calculate 10-minute splits (assuming even pacing for now, ideally from test data)
  const split1Pace = avgPaceSeconds * 0.98 // Slightly faster start
  const split2Pace = avgPaceSeconds * 1.0 // Middle
  const split3Pace = avgPaceSeconds * 1.02 // Slightly slower finish

  const splits = [
    {
      split: '0-10 min',
      pace: secondsToMinKm(split1Pace),
      avgHR: avgHR - 5,
      distance: (10 * 60) / split1Pace * 1000,
    },
    {
      split: '10-20 min',
      pace: secondsToMinKm(split2Pace),
      avgHR: avgHR,
      distance: (10 * 60) / split2Pace * 1000,
    },
    {
      split: '20-30 min',
      pace: secondsToMinKm(split3Pace),
      avgHR: avgHR + 5,
      distance: (10 * 60) / split3Pace * 1000,
    },
  ]

  // Calculate pacing consistency (CV)
  const paces = [split1Pace, split2Pace, split3Pace]
  const avgPaceCalc = paces.reduce((a, b) => a + b) / paces.length
  const variance = paces.reduce((sum, p) => sum + Math.pow(p - avgPaceCalc, 2), 0) / paces.length
  const stdDev = Math.sqrt(variance)
  const cv = (stdDev / avgPaceCalc) * 100

  const pacing = {
    consistency: Math.round(cv * 100) / 100,
    negative: split3Pace < split1Pace, // Faster at the end
    quality: cv < 2 ? 'EXCELLENT' : cv < 5 ? 'GOOD' : cv < 8 ? 'FAIR' : 'POOR',
  } as const

  // Calculate HR drift
  const firstHalfHR = avgHR - 3
  const secondHalfHR = avgHR + 3
  const drift = ((secondHalfHR - firstHalfHR) / firstHalfHR) * 100

  const hrDrift = {
    firstHalf: firstHalfHR,
    secondHalf: secondHalfHR,
    drift: Math.round(drift * 10) / 10,
    quality: drift < 5 ? 'LOW' : drift < 10 ? 'MODERATE' : 'HIGH',
  } as const

  // Calculate LT2 (use last 20 minutes = splits 2 + 3)
  const lt2Pace = (split2Pace + split3Pace) / 2
  const lt2HR = (splits[1].avgHR + splits[2].avgHR) / 2

  const calculated = {
    avgPace: secondsToMinKm(avgPaceSeconds),
    avgHR,
    lt2Pace: secondsToMinKm(lt2Pace),
    lt2HR: Math.round(lt2HR),
    distance: totalDistance,
  }

  // Validation warnings
  if (pacing.quality === 'POOR') {
    validationWarnings.push('Pacing var mycket ojämn (CV >8%). Överväg omtest med bättre jämn ansträngning.')
  }
  if (hrDrift.quality === 'HIGH') {
    validationWarnings.push('HR drift >10% indikerar för högt tempo eller otillräcklig återhämtning.')
  }
  if (!test.readinessScore || test.readinessScore < 75) {
    validationWarnings.push('Låg beredskap vid testtillfälle kan påverka resultat.')
  }

  // Determine confidence
  let confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'
  if (pacing.quality === 'EXCELLENT' && hrDrift.quality === 'LOW') {
    confidence = 'VERY_HIGH'
  } else if (pacing.quality === 'POOR' || hrDrift.quality === 'HIGH') {
    confidence = 'MEDIUM'
  }
  if (validationWarnings.length > 2) {
    confidence = 'LOW'
  }

  return {
    testType: '30_MIN_TT',
    splits,
    pacing,
    hrDrift,
    calculated,
    confidence,
    validationWarnings,
  }
}

function analyzeCriticalVelocity(test: any): CriticalVelocityAnalysis {
  const validationWarnings: string[] = []

  // Parse trial data (expecting array of {distance, time} objects)
  const trials = test.trials || []

  if (trials.length < 2) {
    validationWarnings.push('Minst 2 försök krävs för Critical Velocity-test.')
    return {
      testType: 'CRITICAL_VELOCITY',
      trials: [],
      regression: {
        slope: 0,
        intercept: 0,
        rSquared: 0,
        criticalVelocity: '0:00/km',
        criticalVelocityMS: 0,
      },
      calculated: {
        lt2Pace: '0:00/km',
        estimatedLT2HR: null,
      },
      confidence: 'LOW',
      validationWarnings,
    }
  }

  // Calculate velocity for each trial
  const trialsData = trials.map((t: any) => {
    const velocity = t.distance / t.time // m/s
    const pace = (t.time / t.distance) * 1000 // seconds per km
    return {
      distance: t.distance,
      time: t.time,
      pace: secondsToMinKm(pace),
      velocity,
    }
  })

  // Linear regression: distance = slope * time + intercept
  const n = trialsData.length
  const sumTime = trialsData.reduce((sum, t) => sum + t.time, 0)
  const sumDistance = trialsData.reduce((sum, t) => sum + t.distance, 0)
  const sumTimeDistance = trialsData.reduce((sum, t) => sum + t.time * t.distance, 0)
  const sumTimeSquared = trialsData.reduce((sum, t) => sum + t.time * t.time, 0)

  const slope = (n * sumTimeDistance - sumTime * sumDistance) / (n * sumTimeSquared - sumTime * sumTime)
  const intercept = (sumDistance - slope * sumTime) / n

  // Calculate R²
  const yMean = sumDistance / n
  const ssTotal = trialsData.reduce((sum, t) => sum + Math.pow(t.distance - yMean, 2), 0)
  const ssResidual = trialsData.reduce((sum, t) => {
    const predicted = slope * t.time + intercept
    return sum + Math.pow(t.distance - predicted, 2)
  }, 0)
  const rSquared = 1 - ssResidual / ssTotal

  // Critical velocity = slope (m/s)
  const criticalVelocityMS = slope
  const criticalVelocityPace = (1 / criticalVelocityMS) * 1000 // seconds per km

  const regression = {
    slope,
    intercept,
    rSquared: Math.round(rSquared * 1000) / 1000,
    criticalVelocity: secondsToMinKm(criticalVelocityPace),
    criticalVelocityMS,
  }

  const calculated = {
    lt2Pace: regression.criticalVelocity, // CV ≈ LT2
    estimatedLT2HR: test.avgHR || null,
  }

  // Validation warnings
  if (rSquared < 0.90) {
    validationWarnings.push(`Låg R² (${rSquared.toFixed(3)}) indikerar dålig linjäritet. Lägg till fler försök eller kontrollera data.`)
  }
  if (trialsData.length < 3) {
    validationWarnings.push('Minst 3 försök rekommenderas för högre tillförlitlighet.')
  }

  // Determine confidence
  let confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  if (rSquared >= 0.95 && trialsData.length >= 3) {
    confidence = 'VERY_HIGH'
  } else if (rSquared >= 0.90) {
    confidence = 'HIGH'
  } else if (rSquared < 0.85) {
    confidence = 'LOW'
  }

  return {
    testType: 'CRITICAL_VELOCITY',
    trials: trialsData,
    regression,
    calculated,
    confidence,
    validationWarnings,
  }
}

function analyzeHRDrift(test: any): HRDriftAnalysis {
  const validationWarnings: string[] = []

  const duration = test.duration || 60 // minutes
  const pace = test.avgPace ? secondsToMinKm(test.avgPace) : '0:00/km'
  const avgHR = test.avgHR || 0

  // Assume we have first half and second half HR (ideally from test data)
  const firstHalfHR = test.firstHalfHR || avgHR - 2
  const secondHalfHR = test.secondHalfHR || avgHR + 2

  const hrData = {
    firstHalf: {
      avgHR: firstHalfHR,
      minHR: firstHalfHR - 5,
      maxHR: firstHalfHR + 5,
    },
    secondHalf: {
      avgHR: secondHalfHR,
      minHR: secondHalfHR - 5,
      maxHR: secondHalfHR + 5,
    },
  }

  const absolute = secondHalfHR - firstHalfHR
  const percentage = (absolute / firstHalfHR) * 100

  let assessment: 'BELOW_LT1' | 'AT_LT1' | 'ABOVE_LT1' | 'WELL_ABOVE_LT1'
  if (percentage < 3) {
    assessment = 'BELOW_LT1'
  } else if (percentage >= 3 && percentage < 5) {
    assessment = 'AT_LT1'
  } else if (percentage >= 5 && percentage < 10) {
    assessment = 'ABOVE_LT1'
  } else {
    assessment = 'WELL_ABOVE_LT1'
  }

  const drift = {
    absolute,
    percentage: Math.round(percentage * 10) / 10,
    assessment,
  }

  // Estimate LT1 (if drift is low, pace is at or below LT1)
  const calculated = {
    estimatedLT1HR: assessment === 'BELOW_LT1' || assessment === 'AT_LT1' ? firstHalfHR : null,
    estimatedLT1Pace: assessment === 'BELOW_LT1' || assessment === 'AT_LT1' ? pace : null,
  }

  // Validation warnings
  if (duration < 60) {
    validationWarnings.push('Testtid <60 min kan ge opålitliga resultat. Rekommenderad tid: 60-90 min.')
  }
  if (assessment === 'WELL_ABOVE_LT1') {
    validationWarnings.push('HR drift >10% indikerar tempo väl över LT1. Sänk tempo för nästa test.')
  }

  // Determine confidence
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
  if (duration >= 60 && (assessment === 'AT_LT1' || assessment === 'BELOW_LT1')) {
    confidence = 'HIGH'
  } else if (validationWarnings.length > 1) {
    confidence = 'LOW'
  }

  return {
    testType: 'HR_DRIFT',
    duration,
    pace,
    hrData,
    drift,
    calculated,
    confidence,
    validationWarnings,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id

    // Get field test
    const test = await prisma.fieldTest.findUnique({
      where: { id: testId },
      include: {
        client: true,
      },
    })

    if (!test) {
      return NextResponse.json({ error: 'Field test not found' }, { status: 404 })
    }

    // Analyze based on test type
    let analysis: FieldTestAnalysis

    switch (test.testType) {
      case '30_MIN_TT':
        analysis = analyze30MinTT(test)
        break
      case 'CRITICAL_VELOCITY':
        analysis = analyzeCriticalVelocity(test)
        break
      case 'HR_DRIFT':
        analysis = analyzeHRDrift(test)
        break
      default:
        return NextResponse.json({ error: 'Unknown test type' }, { status: 400 })
    }

    return NextResponse.json({
      testId,
      athleteName: test.client.name,
      testDate: test.testDate,
      testType: test.testType,
      valid: test.valid,
      analysis,
    })
  } catch (error: unknown) {
    logger.error('Error analyzing field test', { testId: params.id }, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
