// app/api/physio/rehab-programs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, getCurrentUser, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'

const updateProgramSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  currentPhase: z.enum(['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  estimatedEndDate: z.string().datetime().optional().nullable(),
  shortTermGoals: z.array(z.string()).optional(),
  longTermGoals: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  precautions: z.array(z.string()).optional(),
  acceptablePainDuring: z.number().int().min(0).max(10).optional(),
  acceptablePainAfter: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/physio/rehab-programs/[id]
 * Get a specific rehab program with exercises and milestones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const program = await prisma.rehabProgram.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            birthDate: true,
            gender: true,
          },
        },
        physio: {
          select: {
            id: true,
            name: true,
          },
        },
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
            painLevel: true,
            phase: true,
          },
        },
        exercises: {
          where: { isActive: true },
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                nameSv: true,
                description: true,
                videoUrl: true,
                instructions: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        milestones: {
          orderBy: { order: 'asc' },
        },
        progressLogs: {
          orderBy: { loggedAt: 'desc' },
          take: 10,
          include: {
            loggedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Rehab program not found' }, { status: 404 })
    }

    // Check access
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = program.physioUserId === user.id || await canAccessAthleteAsPhysio(user.id, program.clientId)
    } else if (user.role === 'COACH') {
      // Coach can view programs for their athletes
      const client = await prisma.client.findUnique({
        where: { id: program.clientId },
        select: { userId: true },
      })
      hasAccess = client?.userId === user.id
    } else if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })
      hasAccess = athleteAccount?.clientId === program.clientId
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(program)
  } catch (error) {
    console.error('Error fetching rehab program:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rehab program' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/physio/rehab-programs/[id]
 * Update a rehab program
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id } = await params
    const body = await request.json()
    const validatedData = updateProgramSchema.parse(body)

    // Check if program exists and belongs to this physio
    const existingProgram = await prisma.rehabProgram.findUnique({
      where: { id },
    })

    if (!existingProgram) {
      return NextResponse.json({ error: 'Rehab program not found' }, { status: 404 })
    }

    if (existingProgram.physioUserId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const program = await prisma.rehabProgram.update({
      where: { id },
      data: {
        ...validatedData,
        estimatedEndDate: validatedData.estimatedEndDate
          ? new Date(validatedData.estimatedEndDate)
          : validatedData.estimatedEndDate === null
            ? null
            : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
          },
        },
      },
    })

    return NextResponse.json(program)
  } catch (error) {
    console.error('Error updating rehab program:', error)
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
      { error: 'Failed to update rehab program' },
      { status: 500 }
    )
  }
}
