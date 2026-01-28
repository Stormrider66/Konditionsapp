import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCoachDecisionSchema = z.object({
  reasonCategory: z
    .enum([
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
    ])
    .optional(),
  reasonNotes: z.string().optional(),
  coachConfidence: z.number().min(0).max(1).optional(),
  athleteContext: z.record(z.any()).optional(),
  modificationData: z.record(z.any()).optional(),
  modificationMagnitude: z.number().min(0).max(1).optional(),
})

// GET: Get a specific coach decision
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decision = await prisma.coachDecision.findUnique({
      where: { id },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        coach: {
          select: {
            id: true,
            name: true,
          },
        },
        workout: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    // Verify access
    if (decision.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(decision)
  } catch (error) {
    console.error('Error fetching coach decision:', error)
    return NextResponse.json({ error: 'Failed to fetch coach decision' }, { status: 500 })
  }
}

// PATCH: Update a coach decision
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify decision exists and belongs to user
    const existingDecision = await prisma.coachDecision.findUnique({
      where: { id },
    })

    if (!existingDecision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    if (existingDecision.coachId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Don't allow updates to validated decisions
    if (existingDecision.validated) {
      return NextResponse.json(
        { error: 'Cannot modify a validated decision' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateCoachDecisionSchema.parse(body)

    const updatedDecision = await prisma.coachDecision.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
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

    return NextResponse.json(updatedDecision)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Error updating coach decision:', error)
    return NextResponse.json({ error: 'Failed to update coach decision' }, { status: 500 })
  }
}
