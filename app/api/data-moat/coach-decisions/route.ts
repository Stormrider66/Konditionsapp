import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const createCoachDecisionSchema = z.object({
  athleteId: z.string().cuid(),
  aiSuggestionType: z.enum([
    'WORKOUT',
    'ZONE_CALCULATION',
    'PROGRAM_PERIODIZATION',
    'RECOVERY_RECOMMENDATION',
    'LOAD_ADJUSTMENT',
    'EXERCISE_SELECTION',
    'INTENSITY_PRESCRIPTION',
    'VOLUME_PRESCRIPTION',
    'TAPER_PLAN',
    'OTHER',
  ]),
  aiSuggestionData: z.record(z.any()),
  aiConfidence: z.number().min(0).max(1).optional(),
  modificationData: z.record(z.any()),
  modificationMagnitude: z.number().min(0).max(1).optional(),
  reasonCategory: z.enum([
    'ATHLETE_FEEDBACK',
    'FATIGUE_OBSERVED',
    'HRV_LOW',
    'SLEEP_POOR',
    'INJURY_CONCERN',
    'SCHEDULE_CONFLICT',
    'PROGRESSION_ADJUSTMENT',
    'WEATHER_CONDITIONS',
    'EQUIPMENT_UNAVAILABLE',
    'COACH_INTUITION',
    'ATHLETE_PREFERENCE',
    'TECHNIQUE_FOCUS',
    'MENTAL_FRESHNESS',
    'TRAVEL_FATIGUE',
    'ILLNESS_RECOVERY',
    'COMPETITION_PROXIMITY',
    'OTHER',
  ]),
  reasonNotes: z.string().optional(),
  coachConfidence: z.number().min(0).max(1).optional(),
  athleteContext: z.record(z.any()).optional(),
  workoutId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
})

const listQuerySchema = z.object({
  athleteId: z.string().optional(),
  suggestionType: z.string().optional(),
  reasonCategory: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  validated: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List coach decisions
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      athleteId: searchParams.get('athleteId') || undefined,
      suggestionType: searchParams.get('suggestionType') || undefined,
      reasonCategory: searchParams.get('reasonCategory') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      validated: searchParams.get('validated') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit

    if (query.athleteId) {
      const hasAccess = await canAccessClient(user.id, query.athleteId)
      if (!hasAccess) {
        return NextResponse.json({ error: 'Athlete not found or access denied' }, { status: 404 })
      }
    }

    // Build where clause
    const where: Record<string, unknown> = {
      coachId: user.id,
    }

    if (query.athleteId) {
      where.athleteId = query.athleteId
    }

    if (query.suggestionType) {
      where.aiSuggestionType = query.suggestionType
    }

    if (query.reasonCategory) {
      where.reasonCategory = query.reasonCategory
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

    if (query.validated !== undefined) {
      where.validated = query.validated === 'true'
    }

    // Query decisions
    const [decisions, total] = await Promise.all([
      prisma.coachDecision.findMany({
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
          workout: {
            select: {
              id: true,
              name: true,
            },
          },
          program: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.coachDecision.count({ where }),
    ])

    return NextResponse.json({
      decisions,
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
    console.error('Error fetching coach decisions:', error)
    return NextResponse.json({ error: 'Failed to fetch coach decisions' }, { status: 500 })
  }
}

// POST: Create a new coach decision
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()
    const validatedData = createCoachDecisionSchema.parse(body)

    const hasAccess = await canAccessClient(user.id, validatedData.athleteId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Athlete not found or access denied' }, { status: 404 })
    }

    // Create the decision
    const decision = await prisma.coachDecision.create({
      data: {
        coachId: user.id,
        athleteId: validatedData.athleteId,
        aiSuggestionType: validatedData.aiSuggestionType,
        aiSuggestionData: validatedData.aiSuggestionData,
        aiConfidence: validatedData.aiConfidence,
        modificationData: validatedData.modificationData,
        modificationMagnitude: validatedData.modificationMagnitude,
        reasonCategory: validatedData.reasonCategory,
        reasonNotes: validatedData.reasonNotes,
        coachConfidence: validatedData.coachConfidence,
        athleteContext: validatedData.athleteContext,
        workoutId: validatedData.workoutId,
        programId: validatedData.programId,
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

    return NextResponse.json(decision, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating coach decision:', error)
    return NextResponse.json({ error: 'Failed to create coach decision' }, { status: 500 })
  }
}
