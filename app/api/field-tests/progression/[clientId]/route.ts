// app/api/field-tests/progression/[clientId]/route.ts
/**
 * Field Test Progression API
 *
 * GET /api/field-tests/progression/:clientId
 *
 * Tracks field test progression over time with comparison to lab tests.
 *
 * Returns:
 * - Historical field tests with LT2 pace trends
 * - Confidence levels over time
 * - Comparison to lab tests (if available)
 * - Trend analysis (improvement/decline)
 * - Test frequency recommendations
 * - Consistency score
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

interface FieldTestPoint {
  id: string
  date: string
  testType: '30_MIN_TT' | 'CRITICAL_VELOCITY' | 'HR_DRIFT'
  lt2Pace: string | null // "4:30/km"
  lt2PaceSeconds: number | null // For calculations
  lt2HR: number | null
  confidence: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW'
  valid: boolean
  validationErrors: string[]
}

interface LabTestPoint {
  id: string
  date: string
  lt2Pace: string | null
  lt2PaceSeconds: number | null
  lt2HR: number | null
  source: 'LAB'
}

interface TrendAnalysis {
  improvement: number // seconds per km (negative = faster)
  improvementPercent: number
  testCount: number
  averageInterval: number // days between tests
  consistency: {
    score: number // 0-100
    quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  }
}

function secondsToMinKm(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}/km`
}

function minKmToSeconds(pace: string): number {
  const [min, sec] = pace.split(':').map((s) => parseInt(s.replace('/km', '')))
  return min * 60 + sec
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // Get all field tests for this client
    const fieldTests = await prisma.fieldTest.findMany({
      where: { clientId },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        testType: true,
        lt2Pace: true,
        lt2HR: true,
        confidence: true,
        valid: true,
        errors: true,
      },
    })

    // Get lab tests for comparison (filter in JS since Json filtering is complex)
    const allLabTests = await prisma.test.findMany({
      where: { clientId },
      orderBy: { testDate: 'asc' },
      select: {
        id: true,
        testDate: true,
        anaerobicThreshold: true,
      },
    })
    const labTests = allLabTests.filter(t => t.anaerobicThreshold !== null)

    // Transform field tests
    // lt2Pace in DB is stored as Float (seconds per km), convert to formatted string
    const fieldTestPoints: FieldTestPoint[] = fieldTests.map((test) => {
      const lt2PaceSeconds = test.lt2Pace // Already in seconds per km
      const lt2PaceFormatted = lt2PaceSeconds ? secondsToMinKm(lt2PaceSeconds) : null

      return {
        id: test.id,
        date: test.date.toISOString().split('T')[0],
        testType: test.testType as any,
        lt2Pace: lt2PaceFormatted,
        lt2PaceSeconds,
        lt2HR: test.lt2HR,
        confidence: test.confidence as any,
        valid: test.valid,
        validationErrors: (test.errors as string[]) || [],
      }
    })

    // Transform lab tests
    const labTestPoints: LabTestPoint[] = labTests.map((test) => {
      // anaerobicThreshold is stored as Json {hr: number, value: number, unit: string}
      // Value is speed in km/h, convert to min/km
      const threshold = test.anaerobicThreshold as { hr?: number; value?: number; unit?: string } | null
      const kmh = threshold?.value || 0
      const minPerKm = kmh > 0 ? 60 / kmh : 0
      const lt2PaceSeconds = minPerKm * 60

      return {
        id: test.id,
        date: test.testDate.toISOString().split('T')[0],
        lt2Pace: kmh > 0 ? secondsToMinKm(lt2PaceSeconds) : null,
        lt2PaceSeconds: kmh > 0 ? lt2PaceSeconds : null,
        lt2HR: threshold?.hr || null,
        source: 'LAB',
      }
    })

    // Calculate trend analysis (field tests only)
    let trendAnalysis: TrendAnalysis | null = null

    if (fieldTestPoints.length >= 2) {
      const validTests = fieldTestPoints.filter((t) => t.valid && t.lt2PaceSeconds)

      if (validTests.length >= 2) {
        const firstTest = validTests[0]
        const lastTest = validTests[validTests.length - 1]

        const improvement = (lastTest.lt2PaceSeconds || 0) - (firstTest.lt2PaceSeconds || 0)
        const improvementPercent =
          (improvement / (firstTest.lt2PaceSeconds || 1)) * 100

        // Calculate average interval
        const firstDate = new Date(firstTest.date)
        const lastDate = new Date(lastTest.date)
        const daysDiff = Math.floor(
          (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const averageInterval = validTests.length > 1 ? daysDiff / (validTests.length - 1) : 0

        // Calculate consistency score (based on confidence levels)
        const highConfidenceCount = validTests.filter(
          (t) => t.confidence === 'VERY_HIGH' || t.confidence === 'HIGH'
        ).length
        const consistencyScore = Math.round(
          (highConfidenceCount / validTests.length) * 100
        )

        let consistencyQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
        if (consistencyScore >= 90) {
          consistencyQuality = 'EXCELLENT'
        } else if (consistencyScore >= 75) {
          consistencyQuality = 'GOOD'
        } else if (consistencyScore >= 60) {
          consistencyQuality = 'FAIR'
        } else {
          consistencyQuality = 'POOR'
        }

        trendAnalysis = {
          improvement: Math.round(improvement),
          improvementPercent: Math.round(improvementPercent * 10) / 10,
          testCount: validTests.length,
          averageInterval: Math.round(averageInterval),
          consistency: {
            score: consistencyScore,
            quality: consistencyQuality,
          },
        }
      }
    }

    // Calculate divergence between field and lab tests
    let divergenceAnalysis: {
      averageDifference: number // seconds
      percentDifference: number
      alignment: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    } | null = null

    if (labTestPoints.length > 0 && fieldTestPoints.length > 0) {
      // Find nearest field test for each lab test
      const comparisons: number[] = []

      labTestPoints.forEach((labTest) => {
        if (!labTest.lt2PaceSeconds) return

        const labDate = new Date(labTest.date)

        // Find field test within ±30 days
        const nearbyFieldTest = fieldTestPoints.find((ft) => {
          if (!ft.valid || !ft.lt2PaceSeconds) return false
          const ftDate = new Date(ft.date)
          const daysDiff = Math.abs(
            (ftDate.getTime() - labDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          return daysDiff <= 30
        })

        if (nearbyFieldTest && nearbyFieldTest.lt2PaceSeconds) {
          const diff = nearbyFieldTest.lt2PaceSeconds - labTest.lt2PaceSeconds
          comparisons.push(diff)
        }
      })

      if (comparisons.length > 0) {
        const avgDiff = comparisons.reduce((a, b) => a + b, 0) / comparisons.length
        const avgLabPace =
          labTestPoints.reduce((sum, t) => sum + (t.lt2PaceSeconds || 0), 0) /
          labTestPoints.filter((t) => t.lt2PaceSeconds).length
        const percentDiff = (Math.abs(avgDiff) / avgLabPace) * 100

        let alignment: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
        if (percentDiff < 2) {
          alignment = 'EXCELLENT'
        } else if (percentDiff < 5) {
          alignment = 'GOOD'
        } else if (percentDiff < 10) {
          alignment = 'FAIR'
        } else {
          alignment = 'POOR'
        }

        divergenceAnalysis = {
          averageDifference: Math.round(avgDiff),
          percentDifference: Math.round(percentDiff * 10) / 10,
          alignment,
        }
      }
    }

    // Recommendations
    const recommendations: string[] = []

    if (trendAnalysis) {
      if (trendAnalysis.averageInterval < 40) {
        recommendations.push('Testfrekvens är bra (<6 veckor mellan tester).')
      } else if (trendAnalysis.averageInterval > 90) {
        recommendations.push(
          'Överväg att testa oftare. Rekommendation: var 8-12:e vecka.'
        )
      }

      if (trendAnalysis.consistency.quality === 'POOR') {
        recommendations.push(
          'Låg konsistens i testresultat. Fokusera på bättre jämnt tempo och tillräcklig återhämtning.'
        )
      }

      if (trendAnalysis.improvement < 0) {
        recommendations.push(
          `Bra framsteg! LT2-tempo förbättrat med ${Math.abs(
            trendAnalysis.improvement
          )} sek/km (${Math.abs(trendAnalysis.improvementPercent).toFixed(1)}%).`
        )
      } else if (trendAnalysis.improvement > 0) {
        recommendations.push(
          `Negativ trend: LT2-tempo försämrat med ${trendAnalysis.improvement} sek/km. Kontrollera träningsvolym och återhämtning.`
        )
      }
    }

    if (divergenceAnalysis) {
      if (divergenceAnalysis.alignment === 'EXCELLENT' || divergenceAnalysis.alignment === 'GOOD') {
        recommendations.push(
          `Fälttester stämmer bra överens med labbtester (±${divergenceAnalysis.percentDifference}%).`
        )
      } else {
        recommendations.push(
          `Fälttester avviker från labbtester (${divergenceAnalysis.percentDifference}%). Kontrollera testteknik.`
        )
      }
    }

    if (fieldTestPoints.length === 0) {
      recommendations.push('Inga fälttester ännu. Börja med ett 30-minuters tidstest.')
    }

    return NextResponse.json({
      clientId,
      fieldTests: fieldTestPoints,
      labTests: labTestPoints,
      trendAnalysis,
      divergenceAnalysis,
      recommendations,
      summary: {
        totalFieldTests: fieldTestPoints.length,
        validFieldTests: fieldTestPoints.filter((t) => t.valid).length,
        totalLabTests: labTestPoints.length,
        latestFieldTest:
          fieldTestPoints.length > 0
            ? fieldTestPoints[fieldTestPoints.length - 1]
            : null,
        latestLabTest:
          labTestPoints.length > 0 ? labTestPoints[labTestPoints.length - 1] : null,
      },
    })
  } catch (error: unknown) {
    logger.error('Error fetching field test progression', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
