/**
 * /api/data-moat/cohorts
 *
 * Data Moat Phase 3: Cross-Athlete Intelligence - Cohort Management
 * Handles anonymized cohort creation and management for benchmarking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { SportType, Gender } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
const createCohortSchema = z.object({
  sport: z.string().min(1),
  ageRangeLower: z.number().int().min(10).max(100),
  ageRangeUpper: z.number().int().min(10).max(100),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']),
  primaryGoal: z.enum([
    'GENERAL_FITNESS',
    'WEIGHT_LOSS',
    'ENDURANCE_PERFORMANCE',
    'STRENGTH_GAIN',
    'SPORT_SPECIFIC',
    'COMPETITION',
    'HEALTH_MAINTENANCE',
  ]).optional(),
  gender: z.string().optional(),
  minAthletes: z.number().int().min(5).default(10), // Privacy threshold
})

const listQuerySchema = z.object({
  sport: z.string().optional(),
  experienceLevel: z.string().optional(),
  primaryGoal: z.string().optional(),
  minAthletes: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List available cohorts for benchmarking
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      sport: searchParams.get('sport') || undefined,
      experienceLevel: searchParams.get('experienceLevel') || undefined,
      primaryGoal: searchParams.get('primaryGoal') || undefined,
      minAthletes: searchParams.get('minAthletes') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit
    const minAthletes = parseInt(query.minAthletes || '10', 10)

    // Build where clause
    const where: Record<string, unknown> = {
      sampleSize: { gte: minAthletes }, // Privacy: Only show cohorts with enough members
    }

    if (query.sport) {
      where.sport = query.sport
    }

    if (query.experienceLevel) {
      where.experienceLevel = query.experienceLevel
    }

    if (query.primaryGoal) {
      where.primaryGoal = query.primaryGoal
    }

    const [cohorts, total] = await Promise.all([
      prisma.athleteCohort.findMany({
        where,
        orderBy: { sampleSize: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          sport: true,
          ageRangeLower: true,
          ageRangeUpper: true,
          experienceLevel: true,
          primaryGoal: true,
          gender: true,
          sampleSize: true,
          avgWeeklyHours: true,
          avgZone2Percent: true,
          avgHighIntensityPercent: true,
          avgStrengthSessionsPerWeek: true,
          avgRestDaysPerWeek: true,
          avgSuccessRate: true,
          avgInjuryRate: true,
          avgImprovement: true,
          confidenceLevel: true,
          benchmarks: true,
          lastCalculated: true,
          // Never expose memberIds - privacy critical
        },
      }),
      prisma.athleteCohort.count({ where }),
    ])

    return NextResponse.json({
      cohorts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching cohorts:', error)
    return NextResponse.json({ error: 'Failed to fetch cohorts' }, { status: 500 })
  }
}

// POST: Create or update a cohort (admin/system use - aggregates anonymized data)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify coach role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Coach access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createCohortSchema.parse(body)

    // Find matching athletes (anonymized - we only count and aggregate)
    const matchingAthletes = await findMatchingAthletes(validatedData)

    if (matchingAthletes.count < validatedData.minAthletes) {
      return NextResponse.json(
        {
          error: 'Insufficient athletes for privacy threshold',
          details: `Found ${matchingAthletes.count} athletes, minimum ${validatedData.minAthletes} required`,
        },
        { status: 400 }
      )
    }

    // Create or update the cohort with aggregated (anonymized) metrics
    const genderValue = validatedData.gender || 'ALL' // Use 'ALL' for unspecified gender
    const cohort = await prisma.athleteCohort.upsert({
      where: {
        sport_ageRangeLower_ageRangeUpper_experienceLevel_gender: {
          sport: validatedData.sport,
          ageRangeLower: validatedData.ageRangeLower,
          ageRangeUpper: validatedData.ageRangeUpper,
          experienceLevel: validatedData.experienceLevel,
          gender: genderValue,
        },
      },
      create: {
        sport: validatedData.sport,
        ageRangeLower: validatedData.ageRangeLower,
        ageRangeUpper: validatedData.ageRangeUpper,
        experienceLevel: validatedData.experienceLevel,
        primaryGoal: validatedData.primaryGoal,
        gender: genderValue,
        sampleSize: matchingAthletes.count,
        avgWeeklyHours: matchingAthletes.avgWeeklyHours,
        avgInjuryRate: matchingAthletes.avgInjuryRate,
        benchmarks: matchingAthletes.benchmarks,
        confidenceLevel: matchingAthletes.confidenceLevel,
        lastCalculated: new Date(),
      },
      update: {
        sampleSize: matchingAthletes.count,
        avgWeeklyHours: matchingAthletes.avgWeeklyHours,
        avgInjuryRate: matchingAthletes.avgInjuryRate,
        benchmarks: matchingAthletes.benchmarks,
        confidenceLevel: matchingAthletes.confidenceLevel,
        lastCalculated: new Date(),
      },
      select: {
        id: true,
        sport: true,
        ageRangeLower: true,
        ageRangeUpper: true,
        experienceLevel: true,
        primaryGoal: true,
        sampleSize: true,
        avgWeeklyHours: true,
        benchmarks: true,
        lastCalculated: true,
        // Never expose memberIds
      },
    })

    return NextResponse.json(cohort, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating cohort:', error)
    return NextResponse.json({ error: 'Failed to create cohort' }, { status: 500 })
  }
}

interface MatchingAthletesResult {
  count: number
  avgWeeklyHours: number | null
  avgInjuryRate: number | null
  benchmarks: Record<string, { p10?: number; p25?: number; p50?: number; p75?: number; p90?: number }>
  confidenceLevel: number
}

async function findMatchingAthletes(criteria: z.infer<typeof createCohortSchema>): Promise<MatchingAthletesResult> {
  // Find athletes matching criteria
  const athletes = await prisma.client.findMany({
    where: {
      sportProfile: {
        primarySport: criteria.sport as SportType,
      },
      athleteProfile: criteria.experienceLevel ? {
        category: criteria.experienceLevel,
      } : undefined,
      birthDate: {
        gte: new Date(new Date().getFullYear() - criteria.ageRangeUpper, 0, 1),
        lte: new Date(new Date().getFullYear() - criteria.ageRangeLower, 11, 31),
      },
      ...(criteria.gender ? { gender: criteria.gender as Gender } : {}),
    },
    select: {
      id: true,
      tests: {
        orderBy: { testDate: 'desc' },
        take: 1,
        select: { vo2max: true },
      },
    },
  })

  if (athletes.length === 0) {
    return {
      count: 0,
      avgWeeklyHours: null,
      avgInjuryRate: null,
      benchmarks: {},
      confidenceLevel: 0,
    }
  }

  const athleteIds = athletes.map((a) => a.id)

  // Get weekly volume from recent workouts
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const workoutStats = await prisma.workoutLog.groupBy({
    by: ['athleteId'],
    where: {
      athleteId: { in: athleteIds },
      completedAt: { gte: threeMonthsAgo },
    },
    _sum: { duration: true },
    _count: true,
  })

  const weeklyHours = workoutStats.map((s) => {
    const totalMinutes = s._sum.duration || 0
    const weeks = 12 // 3 months
    return totalMinutes / weeks / 60 // Convert to hours per week
  })

  // Get injury data
  const injuryStats = await prisma.injuryAssessment.groupBy({
    by: ['clientId'],
    where: {
      clientId: { in: athleteIds },
      date: { gte: threeMonthsAgo },
    },
    _count: true,
  })

  const injuredCount = injuryStats.length
  const injuryRate = athletes.length > 0 ? injuredCount / athletes.length : null

  // Extract VO2max values for benchmarks
  const vo2maxValues = athletes
    .filter((a) => a.tests[0]?.vo2max)
    .map((a) => a.tests[0]!.vo2max!)

  return {
    count: athletes.length,
    avgWeeklyHours: calculateAverage(weeklyHours),
    avgInjuryRate: injuryRate,
    benchmarks: {
      vo2max: calculatePercentiles(vo2maxValues) || {},
      weeklyHours: calculatePercentiles(weeklyHours) || {},
    },
    confidenceLevel: Math.min(athletes.length / 50, 1), // 0-1 scale, higher with more data
  }
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function calculatePercentiles(values: number[]): { p10?: number; p25?: number; p50?: number; p75?: number; p90?: number } | null {
  if (values.length < 4) return null

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  return {
    p10: sorted[Math.floor(n * 0.1)],
    p25: sorted[Math.floor(n * 0.25)],
    p50: sorted[Math.floor(n * 0.5)],
    p75: sorted[Math.floor(n * 0.75)],
    p90: sorted[Math.floor(n * 0.9)],
  }
}
