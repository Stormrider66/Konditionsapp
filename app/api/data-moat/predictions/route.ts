import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const createPredictionSchema = z.object({
  athleteId: z.string().cuid(),
  predictionType: z.enum([
    'RACE_TIME',
    'THRESHOLD_POWER',
    'THRESHOLD_PACE',
    'THRESHOLD_HEART_RATE',
    'VO2MAX_ESTIMATE',
    'INJURY_RISK',
    'READINESS_SCORE',
    'RECOVERY_TIME',
    'IMPROVEMENT_RATE',
    'PEAK_TIMING',
    'OPTIMAL_TAPER',
    'FTP_ESTIMATE',
    'CRITICAL_POWER',
    'WEIGHT_PREDICTION',
    'BODY_COMPOSITION',
  ]),
  predictedValue: z.any(),
  confidenceScore: z.number().min(0).max(1),
  confidenceLower: z.number().optional(),
  confidenceUpper: z.number().optional(),
  modelVersion: z.string(),
  modelParameters: z.record(z.any()).optional(),
  inputDataSnapshot: z.record(z.any()),
  validUntil: z.string().datetime().optional(),
  displayedToUser: z.boolean().optional(),
})

const listQuerySchema = z.object({
  athleteId: z.string().optional(),
  predictionType: z.string().optional(),
  validated: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List predictions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      athleteId: searchParams.get('athleteId') || undefined,
      predictionType: searchParams.get('predictionType') || undefined,
      validated: searchParams.get('validated') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {
      coachId: user.id,
    }

    if (query.athleteId) {
      where.athleteId = query.athleteId
    }

    if (query.predictionType) {
      where.predictionType = query.predictionType
    }

    if (query.validated !== undefined) {
      where.validated = query.validated === 'true'
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) {
        ;(where.createdAt as Record<string, Date>).gte = new Date(query.startDate)
      }
      if (query.endDate) {
        ;(where.createdAt as Record<string, Date>).lte = new Date(query.endDate)
      }
    }

    // Query predictions
    const [predictions, total] = await Promise.all([
      prisma.aIPrediction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          athlete: {
            select: {
              id: true,
              name: true,
            },
          },
          validation: true,
        },
      }),
      prisma.aIPrediction.count({ where }),
    ])

    return NextResponse.json({
      predictions,
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
    console.error('Error fetching predictions:', error)
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }
}

// POST: Create a new prediction
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
    const validatedData = createPredictionSchema.parse(body)

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

    // Create the prediction
    const prediction = await prisma.aIPrediction.create({
      data: {
        athleteId: validatedData.athleteId,
        coachId: user.id,
        predictionType: validatedData.predictionType,
        predictedValue: validatedData.predictedValue,
        confidenceScore: validatedData.confidenceScore,
        confidenceLower: validatedData.confidenceLower,
        confidenceUpper: validatedData.confidenceUpper,
        modelVersion: validatedData.modelVersion,
        modelParameters: validatedData.modelParameters,
        inputDataSnapshot: validatedData.inputDataSnapshot,
        validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
        displayedToUser: validatedData.displayedToUser ?? false,
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(prediction, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating prediction:', error)
    return NextResponse.json({ error: 'Failed to create prediction' }, { status: 500 })
  }
}
