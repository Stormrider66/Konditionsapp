// app/api/physio/rehab-programs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'
import { createRehabProgramThread } from '@/lib/notifications/care-team'
import { logger } from '@/lib/logger'

// Validation schema for creating a rehab program
const createRehabProgramSchema = z.object({
  clientId: z.string().uuid(),
  injuryId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  currentPhase: z.enum(['ACUTE', 'SUBACUTE', 'REMODELING', 'FUNCTIONAL', 'RETURN_TO_SPORT']).default('ACUTE'),
  estimatedEndDate: z.string().datetime().optional(),
  shortTermGoals: z.array(z.string()).default([]),
  longTermGoals: z.array(z.string()).default([]),
  contraindications: z.array(z.string()).default([]),
  precautions: z.array(z.string()).default([]),
  acceptablePainDuring: z.number().int().min(0).max(10).default(3),
  acceptablePainAfter: z.number().int().min(0).max(10).default(5),
  notes: z.string().optional(),
})

/**
 * GET /api/physio/rehab-programs
 * List rehab programs for the current physio
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const phase = searchParams.get('phase')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: Record<string, unknown> = {
      physioUserId: user.id,
    }

    if (clientId) {
      // Verify access to this client
      const hasAccess = await canAccessAthleteAsPhysio(user.id, clientId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this athlete' },
          { status: 403 }
        )
      }
      where.clientId = clientId
    }

    if (status) {
      where.status = status
    }

    if (phase) {
      where.currentPhase = phase
    }

    const [programs, total] = await Promise.all([
      prisma.rehabProgram.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          injury: {
            select: {
              id: true,
              injuryType: true,
              bodyPart: true,
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
                  videoUrl: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          milestones: {
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              exercises: true,
              milestones: true,
              progressLogs: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.rehabProgram.count({ where }),
    ])

    return NextResponse.json({
      programs,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching rehab programs:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch rehab programs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/physio/rehab-programs
 * Create a new rehab program
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const body = await request.json()
    const validatedData = createRehabProgramSchema.parse(body)

    // Verify access to this client
    const hasAccess = await canAccessAthleteAsPhysio(user.id, validatedData.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this athlete' },
        { status: 403 }
      )
    }

    // If injuryId is provided, verify it belongs to this client
    if (validatedData.injuryId) {
      const injury = await prisma.injuryAssessment.findFirst({
        where: {
          id: validatedData.injuryId,
          clientId: validatedData.clientId,
        },
      })
      if (!injury) {
        return NextResponse.json(
          { error: 'Injury not found or does not belong to this client' },
          { status: 404 }
        )
      }
    }

    const program = await prisma.rehabProgram.create({
      data: {
        physioUserId: user.id,
        clientId: validatedData.clientId,
        injuryId: validatedData.injuryId,
        name: validatedData.name,
        description: validatedData.description,
        currentPhase: validatedData.currentPhase,
        estimatedEndDate: validatedData.estimatedEndDate ? new Date(validatedData.estimatedEndDate) : undefined,
        shortTermGoals: validatedData.shortTermGoals,
        longTermGoals: validatedData.longTermGoals,
        contraindications: validatedData.contraindications,
        precautions: validatedData.precautions,
        acceptablePainDuring: validatedData.acceptablePainDuring,
        acceptablePainAfter: validatedData.acceptablePainAfter,
        notes: validatedData.notes,
        status: 'ACTIVE',
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

    // Auto-create care team thread for coordination (Phase 8)
    try {
      await createRehabProgramThread(
        program.id,
        user.id,
        validatedData.clientId,
        validatedData.name
      )
      logger.info('Care team thread created for rehab program', {
        programId: program.id,
        clientId: validatedData.clientId,
      })
    } catch (threadError) {
      // Don't fail the program creation if thread creation fails
      logger.error('Failed to create care team thread for rehab program', {
        programId: program.id,
      }, threadError)
    }

    return NextResponse.json(program, { status: 201 })
  } catch (error) {
    console.error('Error creating rehab program:', error)
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
      { error: 'Failed to create rehab program' },
      { status: 500 }
    )
  }
}
