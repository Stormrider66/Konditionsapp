// app/api/physio/rehab-programs/[id]/milestones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio } from '@/lib/auth-utils'
import { z } from 'zod'

const addMilestoneSchema = z.object({
  phase: z.enum(['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT']),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  criteria: z.array(z.string()).default([]),
  targetDate: z.string().datetime().optional(),
  order: z.number().int().optional(),
})

const updateMilestoneSchema = z.object({
  achieved: z.boolean(),
  achievedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
})

/**
 * POST /api/physio/rehab-programs/[id]/milestones
 * Add a milestone to a rehab program
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id: programId } = await params
    const body = await request.json()
    const validatedData = addMilestoneSchema.parse(body)

    // Check if program exists and belongs to this physio
    const program = await prisma.rehabProgram.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: 'Rehab program not found' }, { status: 404 })
    }

    if (program.physioUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get next order if not provided
    let order = validatedData.order
    if (order === undefined) {
      const lastMilestone = await prisma.rehabMilestone.findFirst({
        where: { programId },
        orderBy: { order: 'desc' },
      })
      order = (lastMilestone?.order ?? 0) + 1
    }

    const milestone = await prisma.rehabMilestone.create({
      data: {
        programId,
        phase: validatedData.phase,
        name: validatedData.name,
        description: validatedData.description,
        criteriaJson: validatedData.criteria.length > 0 ? validatedData.criteria : undefined,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : undefined,
        order,
        isAchieved: false,
      },
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    console.error('Error adding milestone to rehab program:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to add milestone to rehab program' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/physio/rehab-programs/[id]/milestones
 * Update a milestone (mark as achieved)
 * Query param: milestoneId
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id: programId } = await params
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId query parameter required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateMilestoneSchema.parse(body)

    // Check if program exists and belongs to this physio
    const program = await prisma.rehabProgram.findUnique({
      where: { id: programId },
    })

    if (!program) {
      return NextResponse.json({ error: 'Rehab program not found' }, { status: 404 })
    }

    if (program.physioUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify milestone belongs to this program
    const existingMilestone = await prisma.rehabMilestone.findFirst({
      where: {
        id: milestoneId,
        programId,
      },
    })

    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const milestone = await prisma.rehabMilestone.update({
      where: { id: milestoneId },
      data: {
        isAchieved: validatedData.achieved,
        achievedDate: validatedData.achieved
          ? (validatedData.achievedAt ? new Date(validatedData.achievedAt) : new Date())
          : null,
        notes: validatedData.notes,
      },
    })

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('Error updating milestone:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}
