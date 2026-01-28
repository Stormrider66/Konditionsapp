/**
 * /api/data-moat/exercise-effectiveness
 *
 * Data Moat Phase 2: Track which exercises improve specific metrics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const createEffectivenessSchema = z.object({
  exerciseId: z.string().uuid(),
  athleteId: z.string().cuid(),
  targetMetric: z.string().min(1), // "vertical_jump", "5k_time", "1rm_squat"
  baselineMeasure: z.number(),
  baselineDate: z.string().datetime(),
  trainingWeeks: z.number().int().positive(),
  volumeDescription: z.string().optional(),
  avgIntensity: z.number().min(0).max(1).optional(),
  postMeasure: z.number().optional(),
  postDate: z.string().datetime().optional(),
  confoundingFactors: z.record(z.any()).optional(),
  notes: z.string().optional(),
})

const updateEffectivenessSchema = z.object({
  postMeasure: z.number(),
  postDate: z.string().datetime(),
  confoundingFactors: z.record(z.any()).optional(),
  notes: z.string().optional(),
})

const listQuerySchema = z.object({
  athleteId: z.string().optional(),
  exerciseId: z.string().optional(),
  targetMetric: z.string().optional(),
  hasResults: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List exercise effectiveness records
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
      athleteId: searchParams.get('athleteId') || undefined,
      exerciseId: searchParams.get('exerciseId') || undefined,
      targetMetric: searchParams.get('targetMetric') || undefined,
      hasResults: searchParams.get('hasResults') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit

    // Build where clause - filter by athletes the coach owns
    const where: Record<string, unknown> = {
      athlete: {
        userId: user.id,
      },
    }

    if (query.athleteId) {
      where.athleteId = query.athleteId
    }

    if (query.exerciseId) {
      where.exerciseId = query.exerciseId
    }

    if (query.targetMetric) {
      where.targetMetric = query.targetMetric
    }

    if (query.hasResults === 'true') {
      where.postMeasure = { not: null }
    } else if (query.hasResults === 'false') {
      where.postMeasure = null
    }

    const [records, total] = await Promise.all([
      prisma.exerciseEffectiveness.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          exercise: {
            select: {
              id: true,
              name: true,
              nameSv: true,
              category: true,
            },
          },
          athlete: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.exerciseEffectiveness.count({ where }),
    ])

    return NextResponse.json({
      records,
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
    console.error('Error fetching exercise effectiveness:', error)
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
  }
}

// POST: Create new effectiveness tracking record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createEffectivenessSchema.parse(body)

    // Verify coach has access to athlete
    const athlete = await prisma.client.findFirst({
      where: {
        id: validatedData.athleteId,
        userId: user.id,
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found or access denied' }, { status: 404 })
    }

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: validatedData.exerciseId },
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Calculate improvements if post-measure provided
    let absoluteImprovement: number | null = null
    let percentImprovement: number | null = null
    let effectivenessScore: number | null = null

    if (validatedData.postMeasure !== undefined) {
      absoluteImprovement = validatedData.postMeasure - validatedData.baselineMeasure
      percentImprovement =
        validatedData.baselineMeasure !== 0
          ? (absoluteImprovement / Math.abs(validatedData.baselineMeasure)) * 100
          : 0

      // Normalize to 0-1 score (assuming typical improvement range of -20% to +30%)
      effectivenessScore = Math.max(0, Math.min(1, (percentImprovement + 20) / 50))
    }

    const record = await prisma.exerciseEffectiveness.create({
      data: {
        exerciseId: validatedData.exerciseId,
        athleteId: validatedData.athleteId,
        targetMetric: validatedData.targetMetric,
        baselineMeasure: validatedData.baselineMeasure,
        baselineDate: new Date(validatedData.baselineDate),
        trainingWeeks: validatedData.trainingWeeks,
        volumeDescription: validatedData.volumeDescription,
        avgIntensity: validatedData.avgIntensity,
        postMeasure: validatedData.postMeasure,
        postDate: validatedData.postDate ? new Date(validatedData.postDate) : null,
        absoluteImprovement,
        percentImprovement,
        effectivenessScore,
        confoundingFactors: validatedData.confoundingFactors,
        notes: validatedData.notes,
      },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true },
        },
        athlete: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating exercise effectiveness record:', error)
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
}

// PATCH: Update effectiveness record with results
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const recordId = searchParams.get('id')

    if (!recordId) {
      return NextResponse.json({ error: 'Record ID required' }, { status: 400 })
    }

    // Verify access
    const existing = await prisma.exerciseEffectiveness.findUnique({
      where: { id: recordId },
      include: {
        athlete: { select: { userId: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    if (existing.athlete.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateEffectivenessSchema.parse(body)

    // Calculate improvements
    const absoluteImprovement = validatedData.postMeasure - existing.baselineMeasure
    const percentImprovement =
      existing.baselineMeasure !== 0
        ? (absoluteImprovement / Math.abs(existing.baselineMeasure)) * 100
        : 0
    const effectivenessScore = Math.max(0, Math.min(1, (percentImprovement + 20) / 50))

    const updated = await prisma.exerciseEffectiveness.update({
      where: { id: recordId },
      data: {
        postMeasure: validatedData.postMeasure,
        postDate: new Date(validatedData.postDate),
        absoluteImprovement,
        percentImprovement,
        effectivenessScore,
        confoundingFactors: validatedData.confoundingFactors ?? existing.confoundingFactors ?? undefined,
        notes: validatedData.notes ?? existing.notes ?? undefined,
      },
      include: {
        exercise: {
          select: { id: true, name: true, nameSv: true },
        },
        athlete: {
          select: { id: true, name: true },
        },
      },
    })

    // Check if we should update aggregated patterns
    await updateExerciseOutcomePattern(existing.exerciseId, existing.targetMetric)

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating exercise effectiveness record:', error)
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

/**
 * Update aggregated outcome patterns for an exercise/metric combination.
 */
async function updateExerciseOutcomePattern(exerciseId: string, targetMetric: string) {
  try {
    // Get all completed records for this exercise/metric
    const records = await prisma.exerciseEffectiveness.findMany({
      where: {
        exerciseId,
        targetMetric,
        postMeasure: { not: null },
        percentImprovement: { not: null },
      },
    })

    if (records.length < 3) {
      // Not enough data for statistical analysis
      return
    }

    const improvements = records.map((r) => r.percentImprovement!)

    // Calculate statistics
    const n = improvements.length
    const mean = improvements.reduce((a, b) => a + b, 0) / n
    const variance = improvements.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)

    // Standard error and confidence interval (95%)
    const standardError = stdDev / Math.sqrt(n)
    const confidenceMultiplier = 1.96 // 95% CI
    const ciLower = mean - confidenceMultiplier * standardError
    const ciUpper = mean + confidenceMultiplier * standardError

    // Confidence level based on sample size and variance
    const confidenceLevel = Math.min(1, n / 30) * Math.max(0.5, 1 - stdDev / 50)

    // Statistical significance (simple check: CI doesn't include 0)
    const isSignificant = ciLower > 0 || ciUpper < 0

    // Upsert the pattern
    await prisma.exerciseOutcomePattern.upsert({
      where: {
        exerciseId_targetMetric: { exerciseId, targetMetric },
      },
      create: {
        exerciseId,
        targetMetric,
        sampleSize: n,
        avgImprovement: mean,
        stdDeviation: stdDev,
        confidenceLevel,
        confidenceInterval: { lower: ciLower, upper: ciUpper },
        lastCalculated: new Date(),
        isSignificant,
      },
      update: {
        sampleSize: n,
        avgImprovement: mean,
        stdDeviation: stdDev,
        confidenceLevel,
        confidenceInterval: { lower: ciLower, upper: ciUpper },
        lastCalculated: new Date(),
        isSignificant,
      },
    })
  } catch (error) {
    console.error('Error updating exercise outcome pattern:', error)
  }
}
