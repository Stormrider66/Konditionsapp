/**
 * GET /api/data-moat/cohorts/benchmark
 *
 * Data Moat Phase 3: "Athletes Like You" Benchmarking
 * Compares an athlete's metrics against their matched cohort.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  athleteId: z.string().cuid(),
  sport: z.string().optional(),
})

interface BenchmarkResult {
  athleteMetrics: {
    vo2max: number | null
    threshold: number | null
    weeklyVolume: number | null
    recentInjuries: number
  }
  cohort: {
    id: string
    sport: string
    ageRange: string
    experienceLevel: string
    goalType: string | null
    athleteCount: number
  } | null
  comparison: {
    vo2maxPercentile: number | null
    thresholdPercentile: number | null
    volumePercentile: number | null
    overallRanking: string
  } | null
  insights: string[]
  recommendations: string[]
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = querySchema.parse({
      athleteId: searchParams.get('athleteId'),
      sport: searchParams.get('sport') || undefined,
    })

    // Verify coach has access to this athlete
    const athlete = await prisma.client.findFirst({
      where: {
        id: query.athleteId,
        userId: user.id,
      },
      include: {
        sportProfile: true,
        athleteProfile: true,
        tests: {
          orderBy: { testDate: 'desc' },
          take: 1,
          select: {
            vo2max: true,
            anaerobicThreshold: true,
          },
        },
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found or access denied' }, { status: 404 })
    }

    // Calculate athlete age
    const athleteAge = athlete.birthDate
      ? Math.floor((Date.now() - athlete.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    // Determine sport to use for comparison
    const sportProfile = athlete.sportProfile
    const sport = query.sport || sportProfile?.primarySport

    if (!sportProfile) {
      return NextResponse.json({
        error: 'No sport profile found',
        details: 'Athlete needs a sport profile for benchmarking',
      }, { status: 400 })
    }

    // Get athlete's recent training volume
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const workoutStats = await prisma.workoutLog.aggregate({
      where: {
        athleteId: athlete.id,
        completedAt: { gte: threeMonthsAgo },
      },
      _sum: { duration: true },
      _count: true,
    })

    const weeklyVolume = workoutStats._sum.duration
      ? workoutStats._sum.duration / 12 / 60 // Convert to hours per week
      : null

    // Get recent injury count
    const recentInjuries = await prisma.injuryAssessment.count({
      where: {
        clientId: athlete.id,
        date: { gte: threeMonthsAgo },
      },
    })

    const latestTest = athlete.tests[0]
    // anaerobicThreshold is Json { hr: number, value: number, unit: string } - extract the value
    const thresholdData = latestTest?.anaerobicThreshold as { value?: number } | null
    const athleteMetrics = {
      vo2max: latestTest?.vo2max ?? null,
      threshold: thresholdData?.value ?? null,
      weeklyVolume,
      recentInjuries,
    }

    // Find matching cohort
    const matchingCohort = await findMatchingCohort(
      sport!,
      athleteAge,
      athlete.athleteProfile?.category ?? undefined,
      sportProfile.currentGoal ?? undefined,
      athlete.gender ?? undefined
    )

    if (!matchingCohort) {
      return NextResponse.json({
        athleteMetrics,
        cohort: null,
        comparison: null,
        insights: ['Not enough similar athletes to generate benchmarks yet.'],
        recommendations: ['Continue training and logging workouts to build comparison data.'],
      })
    }

    // Transform database cohort to the expected format
    const cohortData = transformCohortData(matchingCohort)

    // Calculate percentiles and comparison
    const comparison = calculateComparison(athleteMetrics, cohortData)
    const insights = generateInsights(athleteMetrics, cohortData, comparison)
    const recommendations = generateRecommendations(athleteMetrics, cohortData, comparison)

    // Save the benchmark comparison for future reference
    await saveBenchmarkComparison(athlete.id, matchingCohort.id, athleteMetrics, comparison)

    const result: BenchmarkResult = {
      athleteMetrics,
      cohort: {
        id: matchingCohort.id,
        sport: matchingCohort.sport,
        ageRange: `${matchingCohort.ageRangeLower}-${matchingCohort.ageRangeUpper}`,
        experienceLevel: matchingCohort.experienceLevel,
        goalType: matchingCohort.primaryGoal,
        athleteCount: matchingCohort.sampleSize,
      },
      comparison,
      insights,
      recommendations,
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error generating benchmark:', error)
    return NextResponse.json({ error: 'Failed to generate benchmark' }, { status: 500 })
  }
}

async function findMatchingCohort(
  sport: string,
  age: number | null,
  experienceLevel: string | undefined,
  goalType: string | undefined,
  gender: string | null | undefined
) {
  // Find the best matching cohort with sufficient members
  const cohorts = await prisma.athleteCohort.findMany({
    where: {
      sport,
      sampleSize: { gte: 10 }, // Privacy threshold
      ...(age ? {
        ageRangeLower: { lte: age },
        ageRangeUpper: { gte: age },
      } : {}),
      ...(experienceLevel ? { experienceLevel: experienceLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' } : {}),
      ...(goalType ? { primaryGoal: goalType as 'GENERAL_FITNESS' | 'WEIGHT_LOSS' | 'ENDURANCE_PERFORMANCE' | 'STRENGTH_GAIN' | 'SPORT_SPECIFIC' | 'COMPETITION' | 'HEALTH_MAINTENANCE' } : {}),
      ...(gender ? { gender } : {}),
    },
    orderBy: { sampleSize: 'desc' },
    take: 1,
  })

  if (cohorts.length > 0) return cohorts[0]

  // Fallback: Try without gender filter
  const fallbackCohorts = await prisma.athleteCohort.findMany({
    where: {
      sport,
      sampleSize: { gte: 10 },
      ...(age ? {
        ageRangeLower: { lte: age },
        ageRangeUpper: { gte: age },
      } : {}),
      ...(experienceLevel ? { experienceLevel: experienceLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' } : {}),
    },
    orderBy: { sampleSize: 'desc' },
    take: 1,
  })

  return fallbackCohorts[0] || null
}

// Transform database AthleteCohort to the expected CohortData format
function transformCohortData(cohort: {
  id: string
  benchmarks: unknown
  avgWeeklyHours?: number | null
  avgInjuryRate?: number | null
}): CohortData {
  // The database stores benchmarks as JSON with percentiles
  const benchmarks = cohort.benchmarks as Record<string, { p10?: number; p25?: number; p50?: number; p75?: number; p90?: number }> | null

  return {
    id: cohort.id,
    // Map available fields - these may not be directly in the model
    avgVO2max: null, // Not directly stored in AthleteCohort
    avgThreshold: null, // Not directly stored
    avgWeeklyVolume: cohort.avgWeeklyHours ?? null,
    avgInjuryRate: cohort.avgInjuryRate ?? null,
    // Transform benchmarks JSON to percentiles format
    percentiles: benchmarks ? {
      vo2max: benchmarks.vo2max ? {
        p25: benchmarks.vo2max.p25 ?? 0,
        p50: benchmarks.vo2max.p50 ?? 0,
        p75: benchmarks.vo2max.p75 ?? 0,
        p90: benchmarks.vo2max.p90 ?? 0,
      } : undefined,
      threshold: benchmarks.threshold ? {
        p25: benchmarks.threshold.p25 ?? 0,
        p50: benchmarks.threshold.p50 ?? 0,
        p75: benchmarks.threshold.p75 ?? 0,
        p90: benchmarks.threshold.p90 ?? 0,
      } : undefined,
      weeklyVolume: benchmarks.weeklyHours ? {
        p25: benchmarks.weeklyHours.p25 ?? 0,
        p50: benchmarks.weeklyHours.p50 ?? 0,
        p75: benchmarks.weeklyHours.p75 ?? 0,
        p90: benchmarks.weeklyHours.p90 ?? 0,
      } : undefined,
    } : null,
  }
}

interface CohortData {
  id: string
  avgVO2max: number | null
  avgThreshold: number | null
  avgWeeklyVolume: number | null
  avgInjuryRate: number | null
  percentiles: {
    vo2max?: { p25: number; p50: number; p75: number; p90: number }
    threshold?: { p25: number; p50: number; p75: number; p90: number }
    weeklyVolume?: { p25: number; p50: number; p75: number; p90: number }
  } | null
}

function calculateComparison(
  athleteMetrics: { vo2max: number | null; threshold: number | null; weeklyVolume: number | null },
  cohort: CohortData
) {
  const percentiles = cohort.percentiles as CohortData['percentiles']

  // Calculate percentile for each metric
  const vo2maxPercentile = calculatePercentileRank(
    athleteMetrics.vo2max,
    percentiles?.vo2max
  )
  const thresholdPercentile = calculatePercentileRank(
    athleteMetrics.threshold,
    percentiles?.threshold
  )
  const volumePercentile = calculatePercentileRank(
    athleteMetrics.weeklyVolume,
    percentiles?.weeklyVolume
  )

  // Calculate overall ranking
  const validPercentiles = [vo2maxPercentile, thresholdPercentile, volumePercentile].filter(
    (p) => p !== null
  ) as number[]

  let overallRanking = 'Unknown'
  if (validPercentiles.length > 0) {
    const avgPercentile = validPercentiles.reduce((a, b) => a + b, 0) / validPercentiles.length
    if (avgPercentile >= 90) overallRanking = 'Elite (Top 10%)'
    else if (avgPercentile >= 75) overallRanking = 'Advanced (Top 25%)'
    else if (avgPercentile >= 50) overallRanking = 'Above Average'
    else if (avgPercentile >= 25) overallRanking = 'Developing'
    else overallRanking = 'Building Foundation'
  }

  return {
    vo2maxPercentile,
    thresholdPercentile,
    volumePercentile,
    overallRanking,
  }
}

function calculatePercentileRank(
  value: number | null,
  percentiles: { p25: number; p50: number; p75: number; p90: number } | undefined
): number | null {
  if (value === null || !percentiles) return null

  if (value >= percentiles.p90) return 90 + ((value - percentiles.p90) / (percentiles.p90 * 0.2)) * 10
  if (value >= percentiles.p75) return 75 + ((value - percentiles.p75) / (percentiles.p90 - percentiles.p75)) * 15
  if (value >= percentiles.p50) return 50 + ((value - percentiles.p50) / (percentiles.p75 - percentiles.p50)) * 25
  if (value >= percentiles.p25) return 25 + ((value - percentiles.p25) / (percentiles.p50 - percentiles.p25)) * 25
  return Math.max(0, 25 * (value / percentiles.p25))
}

function generateInsights(
  athleteMetrics: { vo2max: number | null; threshold: number | null; weeklyVolume: number | null; recentInjuries: number },
  cohort: CohortData,
  comparison: { vo2maxPercentile: number | null; thresholdPercentile: number | null; volumePercentile: number | null }
): string[] {
  const insights: string[] = []

  // VO2max insights
  if (comparison.vo2maxPercentile !== null) {
    if (comparison.vo2maxPercentile >= 75) {
      insights.push(`Your VO2max is in the top ${100 - Math.round(comparison.vo2maxPercentile)}% of athletes like you.`)
    } else if (comparison.vo2maxPercentile < 25) {
      insights.push('Your aerobic capacity has room for improvement compared to similar athletes.')
    }
  }

  // Volume insights
  if (comparison.volumePercentile !== null && cohort.avgWeeklyVolume) {
    const volumeDiff = athleteMetrics.weeklyVolume! - cohort.avgWeeklyVolume
    if (volumeDiff > 2) {
      insights.push(`You train ${volumeDiff.toFixed(1)} hours more per week than average for your cohort.`)
    } else if (volumeDiff < -2) {
      insights.push(`You train ${Math.abs(volumeDiff).toFixed(1)} hours less per week than average for your cohort.`)
    }
  }

  // Injury rate insights
  if (athleteMetrics.recentInjuries > 0 && cohort.avgInjuryRate !== null) {
    const athleteInjuryRate = athleteMetrics.recentInjuries > 0 ? 1 : 0
    if (athleteInjuryRate > cohort.avgInjuryRate * 1.5) {
      insights.push('Your injury frequency is higher than average. Consider reviewing training load progression.')
    }
  }

  // Threshold-VO2max relationship
  if (athleteMetrics.vo2max && athleteMetrics.threshold) {
    const thresholdPct = (athleteMetrics.threshold / athleteMetrics.vo2max) * 100
    if (thresholdPct >= 85) {
      insights.push('Your threshold is a high percentage of VO2max - excellent endurance efficiency.')
    } else if (thresholdPct < 70) {
      insights.push('Your threshold-to-VO2max ratio suggests potential for threshold training gains.')
    }
  }

  if (insights.length === 0) {
    insights.push('Keep training consistently to generate more comparison insights.')
  }

  return insights
}

function generateRecommendations(
  athleteMetrics: { vo2max: number | null; threshold: number | null; weeklyVolume: number | null; recentInjuries: number },
  cohort: CohortData,
  comparison: { vo2maxPercentile: number | null; thresholdPercentile: number | null; volumePercentile: number | null }
): string[] {
  const recommendations: string[] = []

  // Volume recommendations
  if (comparison.volumePercentile !== null) {
    if (comparison.volumePercentile < 25 && cohort.avgWeeklyVolume) {
      recommendations.push(
        `Consider gradually increasing training volume toward ${cohort.avgWeeklyVolume.toFixed(1)} hours/week (cohort average).`
      )
    } else if (comparison.volumePercentile > 90) {
      recommendations.push('Your volume is very high - ensure adequate recovery to prevent overtraining.')
    }
  }

  // VO2max recommendations
  if (comparison.vo2maxPercentile !== null && comparison.vo2maxPercentile < 50) {
    recommendations.push('High-intensity interval training (HIIT) could help improve your aerobic capacity.')
  }

  // Threshold recommendations
  if (comparison.thresholdPercentile !== null && comparison.thresholdPercentile < 50) {
    recommendations.push('Tempo runs and threshold intervals can help raise your lactate threshold.')
  }

  // Injury prevention
  if (athleteMetrics.recentInjuries >= 2) {
    recommendations.push('Multiple recent injuries suggest reviewing training periodization and recovery protocols.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue your current training approach - your metrics align well with similar athletes.')
  }

  return recommendations
}

async function saveBenchmarkComparison(
  athleteId: string,
  cohortId: string,
  athleteMetrics: { vo2max: number | null; threshold: number | null; weeklyVolume: number | null },
  comparison: { vo2maxPercentile: number | null; thresholdPercentile: number | null; volumePercentile: number | null; overallRanking: string }
) {
  try {
    // Create individual records for each metric (as per BenchmarkComparison model)
    const comparisons: { metricName: string; athleteValue: number; cohortPercentile: number; interpretation: string }[] = []

    if (athleteMetrics.vo2max !== null && comparison.vo2maxPercentile !== null) {
      comparisons.push({
        metricName: 'vo2max',
        athleteValue: athleteMetrics.vo2max,
        cohortPercentile: comparison.vo2maxPercentile,
        interpretation: getInterpretation(comparison.vo2maxPercentile),
      })
    }

    if (athleteMetrics.threshold !== null && comparison.thresholdPercentile !== null) {
      comparisons.push({
        metricName: 'threshold',
        athleteValue: athleteMetrics.threshold,
        cohortPercentile: comparison.thresholdPercentile,
        interpretation: getInterpretation(comparison.thresholdPercentile),
      })
    }

    if (athleteMetrics.weeklyVolume !== null && comparison.volumePercentile !== null) {
      comparisons.push({
        metricName: 'weekly_volume',
        athleteValue: athleteMetrics.weeklyVolume,
        cohortPercentile: comparison.volumePercentile,
        interpretation: getInterpretation(comparison.volumePercentile),
      })
    }

    if (comparisons.length > 0) {
      await prisma.benchmarkComparison.createMany({
        data: comparisons.map((c) => ({
          athleteId,
          cohortId,
          ...c,
        })),
      })
    }
  } catch (error) {
    // Non-critical - log and continue
    console.error('Failed to save benchmark comparison:', error)
  }
}

function getInterpretation(percentile: number): string {
  if (percentile >= 90) return 'Top 10%'
  if (percentile >= 75) return 'Above average'
  if (percentile >= 50) return 'Average'
  if (percentile >= 25) return 'Below average'
  return 'Building foundation'
}
