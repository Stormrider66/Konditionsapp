/**
 * /api/data-moat/feedback
 *
 * Data Moat Phase 4: AI Feedback Loop Management
 * Captures lessons learned from predictions and decisions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createFeedbackSchema = z.object({
  feedbackCategory: z.enum([
    'PREDICTION_ERROR',
    'DECISION_OVERRIDE',
    'PATTERN_DISCOVERED',
    'ACCURACY_IMPROVEMENT',
    'USER_FEEDBACK',
    'OUTCOME_MISMATCH',
  ]),
  // Source references (at least one should be provided)
  coachDecisionId: z.string().optional(),
  predictionId: z.string().optional(),
  trainingOutcomeId: z.string().optional(),
  patternId: z.string().optional(),
  // Lesson details
  lessonTitle: z.string().min(1).max(200),
  lessonDescription: z.string().min(10),
  lessonCategory: z.string().min(1), // "recovery", "intensity", "periodization"
  lessonConfidence: z.number().min(0).max(1),
  // Evidence
  evidenceData: z.record(z.any()).optional(),
  // Prompt adjustment
  promptAdjustment: z.string().optional(),
  affectedPrompts: z.array(z.string()).optional(),
})

const listQuerySchema = z.object({
  feedbackCategory: z.string().optional(),
  lessonStatus: z.string().optional(),
  lessonCategory: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET: List feedback loops
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin or coach role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'COACH')) {
      return NextResponse.json({ error: 'Admin or coach access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = listQuerySchema.parse({
      feedbackCategory: searchParams.get('feedbackCategory') || undefined,
      lessonStatus: searchParams.get('lessonStatus') || undefined,
      lessonCategory: searchParams.get('lessonCategory') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    })

    const page = parseInt(query.page || '1', 10)
    const limit = Math.min(parseInt(query.limit || '20', 10), 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (query.feedbackCategory) {
      where.feedbackCategory = query.feedbackCategory
    }

    if (query.lessonStatus) {
      where.lessonStatus = query.lessonStatus
    }

    if (query.lessonCategory) {
      where.lessonCategory = query.lessonCategory
    }

    const [feedbackLoops, total] = await Promise.all([
      prisma.aIFeedbackLoop.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          coachDecision: {
            select: {
              id: true,
              aiSuggestionType: true,
              reasonCategory: true,
              outcomeAssessment: true,
            },
          },
          prediction: {
            select: {
              id: true,
              predictionType: true,
              validated: true,
            },
          },
          trainingOutcome: {
            select: {
              id: true,
              periodName: true,
              outcomeClass: true,
            },
          },
          pattern: {
            select: {
              id: true,
              patternName: true,
              confidenceLevel: true,
            },
          },
          modelVersion: {
            select: {
              id: true,
              versionName: true,
              modelType: true,
            },
          },
        },
      }),
      prisma.aIFeedbackLoop.count({ where }),
    ])

    return NextResponse.json({
      feedbackLoops,
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
    console.error('Error fetching feedback loops:', error)
    return NextResponse.json({ error: 'Failed to fetch feedback loops' }, { status: 500 })
  }
}

// POST: Create new feedback loop entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin or coach role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'COACH')) {
      return NextResponse.json({ error: 'Admin or coach access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createFeedbackSchema.parse(body)

    // Ensure at least one source reference is provided
    if (
      !validatedData.coachDecisionId &&
      !validatedData.predictionId &&
      !validatedData.trainingOutcomeId &&
      !validatedData.patternId
    ) {
      return NextResponse.json(
        { error: 'At least one source reference (coachDecisionId, predictionId, trainingOutcomeId, or patternId) is required' },
        { status: 400 }
      )
    }

    const feedbackLoop = await prisma.aIFeedbackLoop.create({
      data: {
        feedbackCategory: validatedData.feedbackCategory,
        coachDecisionId: validatedData.coachDecisionId,
        predictionId: validatedData.predictionId,
        trainingOutcomeId: validatedData.trainingOutcomeId,
        patternId: validatedData.patternId,
        lessonTitle: validatedData.lessonTitle,
        lessonDescription: validatedData.lessonDescription,
        lessonCategory: validatedData.lessonCategory,
        lessonConfidence: validatedData.lessonConfidence,
        evidenceData: validatedData.evidenceData,
        promptAdjustment: validatedData.promptAdjustment,
        affectedPrompts: validatedData.affectedPrompts || [],
      },
      include: {
        coachDecision: { select: { id: true, aiSuggestionType: true } },
        prediction: { select: { id: true, predictionType: true } },
      },
    })

    return NextResponse.json(feedbackLoop, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error creating feedback loop:', error)
    return NextResponse.json({ error: 'Failed to create feedback loop' }, { status: 500 })
  }
}
