/**
 * /api/data-moat/training-outcomes
 *
 * Data Moat Phase 2: Training Period Outcome tracking
 * Records effectiveness of training programs and periods.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schemas
const createOutcomeSchema = z.object({
  athleteId: z.string().cuid(),
  programId: z.string().uuid().optional(),
  periodName: z.string().min(1),
  periodType: z.enum(['BASE', 'BUILD', 'PEAK', 'TAPER', 'RECOVERY']).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  durationWeeks: z.number().int().positive(),
  goalMetrics: z.record(z.any()),
  goalDescription: z.string().optional(),
  actualMetrics: z.record(z.any()).optional(),
  outcomeClass: z.enum([
    'EXCEEDED_GOALS',
    'MET_GOALS',
    'PARTIALLY_MET',
    'MISSED_GOALS',
    'ABANDONED',
    'INJURED',
  ]),
  totalVolume: z.number().optional(),
  avgWeeklyVolume: z.number().optional(),
  compliance: z.number().min(0).max(1).optional(),
  missedSessions: z.number().int().optional(),
  contributingFactors: z.record(z.any()).optional(),
  coachAssessment: z.string().optional(),
  athleteFeedback: z.string().optional(),
  lessonsLearned: z.string().optional(),
})

const listQuerySchema = z.object({
  athleteId: z.string().optional(),
  programId: z.string().optional(),
  outcomeClass: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List training period outcomes
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      athleteId: searchParams.get('athleteId') || undefined,
      programId: searchParams.get('programId') || undefined,
      outcomeClass: searchParams.get('outcomeClass') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
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

    if (query.programId) {
      where.programId = query.programId
    }

    if (query.outcomeClass) {
      where.outcomeClass = query.outcomeClass
    }

    if (query.startDate || query.endDate) {
      where.startDate = {}
      if (query.startDate) {
        ;(where.startDate as Record<string, Date>).gte = new Date(query.startDate)
      }
      if (query.endDate) {
        ;(where.startDate as Record<string, Date>).lte = new Date(query.endDate)
      }
    }

    // Query outcomes
    const [outcomes, total] = await Promise.all([
      prisma.trainingPeriodOutcome.findMany({
        where,
        orderBy: { endDate: 'desc' },
        skip,
        take: limit,
        include: {
          athlete: {
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
          fingerprint: true,
        },
      }),
      prisma.trainingPeriodOutcome.count({ where }),
    ])

    return NextResponse.json({
      outcomes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Coach access required')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error fetching training outcomes:', error)
    return NextResponse.json({ error: 'Failed to fetch training outcomes' }, { status: 500 })
  }
}

// POST: Create a new training period outcome
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()
    const validatedData = createOutcomeSchema.parse(body)

    const hasAccess = await canAccessClient(user.id, validatedData.athleteId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Athlete not found or access denied' }, { status: 404 })
    }

    // Verify program if provided
    if (validatedData.programId) {
      const program = await prisma.trainingProgram.findFirst({
        where: {
          id: validatedData.programId,
          clientId: validatedData.athleteId,
        },
      })

      if (!program) {
        return NextResponse.json({ error: 'Program not found' }, { status: 404 })
      }
    }

    // Create the outcome
    const outcome = await prisma.trainingPeriodOutcome.create({
      data: {
        coachId: user.id,
        athleteId: validatedData.athleteId,
        programId: validatedData.programId,
        periodName: validatedData.periodName,
        periodType: validatedData.periodType,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        durationWeeks: validatedData.durationWeeks,
        goalMetrics: validatedData.goalMetrics,
        goalDescription: validatedData.goalDescription,
        actualMetrics: validatedData.actualMetrics,
        outcomeClass: validatedData.outcomeClass,
        totalVolume: validatedData.totalVolume,
        avgWeeklyVolume: validatedData.avgWeeklyVolume,
        compliance: validatedData.compliance,
        missedSessions: validatedData.missedSessions,
        contributingFactors: validatedData.contributingFactors,
        coachAssessment: validatedData.coachAssessment,
        athleteFeedback: validatedData.athleteFeedback,
        lessonsLearned: validatedData.lessonsLearned,
      },
      include: {
        athlete: {
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
    })

    return NextResponse.json(outcome, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Coach access required')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating training outcome:', error)
    return NextResponse.json({ error: 'Failed to create training outcome' }, { status: 500 })
  }
}
