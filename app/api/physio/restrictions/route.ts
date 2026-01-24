// app/api/physio/restrictions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, canAccessAthleteAsPhysio, canCreateRestrictions, getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { notifyCoachOfRestriction } from '@/lib/notifications/care-team'
import { logger } from '@/lib/logger'

// Validation schema for creating a training restriction
const createRestrictionSchema = z.object({
  clientId: z.string().uuid(),
  injuryId: z.string().uuid().optional(),
  type: z.enum([
    'NO_RUNNING',
    'NO_JUMPING',
    'NO_IMPACT',
    'NO_UPPER_BODY',
    'NO_LOWER_BODY',
    'REDUCED_VOLUME',
    'REDUCED_INTENSITY',
    'MODIFIED_ONLY',
    'SPECIFIC_EXERCISES',
    'CUSTOM',
  ]),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'COMPLETE']).default('MODERATE'),
  bodyParts: z.array(z.string()).default([]),
  affectedWorkoutTypes: z.array(z.string()).default([]),
  affectedExerciseIds: z.array(z.string().uuid()).default([]),
  endDate: z.string().datetime().optional(),
  volumeReductionPercent: z.number().int().min(0).max(100).optional(),
  maxIntensityZone: z.number().int().min(1).max(5).optional(),
  description: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/physio/restrictions
 * List active training restrictions
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const clientId = searchParams.get('clientId')
    const activeOnly = searchParams.get('activeOnly') !== 'false' // Default to active only
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: Record<string, unknown> = {
      createdById: user.id,
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

    if (activeOnly) {
      where.isActive = true
    }

    const [restrictions, total] = await Promise.all([
      prisma.trainingRestriction.findMany({
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
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.trainingRestriction.count({ where }),
    ])

    return NextResponse.json({
      restrictions,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching training restrictions:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch training restrictions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/physio/restrictions
 * Create a new training restriction
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createRestrictionSchema.parse(body)

    // Verify permission to create restrictions for this client
    const canCreate = await canCreateRestrictions(user.id, validatedData.clientId)
    if (!canCreate) {
      return NextResponse.json(
        { error: 'You do not have permission to create restrictions for this athlete' },
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

    // Determine source based on user role
    const source = user.role === 'PHYSIO' ? 'PHYSIO_MANUAL' : 'COACH_MANUAL'

    const restriction = await prisma.trainingRestriction.create({
      data: {
        clientId: validatedData.clientId,
        createdById: user.id,
        injuryId: validatedData.injuryId,
        type: validatedData.type,
        severity: validatedData.severity,
        source,
        bodyParts: validatedData.bodyParts,
        affectedWorkoutTypes: validatedData.affectedWorkoutTypes,
        affectedExerciseIds: validatedData.affectedExerciseIds,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        volumeReductionPercent: validatedData.volumeReductionPercent,
        maxIntensityZone: validatedData.maxIntensityZone,
        description: validatedData.description,
        reason: validatedData.reason,
        notes: validatedData.notes,
        isActive: true,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // Notify coach of new restriction (Phase 8)
    if (user.role === 'PHYSIO') {
      try {
        await notifyCoachOfRestriction(
          restriction.id,
          user.id,
          validatedData.clientId
        )
        logger.info('Coach notified of new restriction', {
          restrictionId: restriction.id,
          clientId: validatedData.clientId,
        })
      } catch (notifyError) {
        // Don't fail the restriction creation if notification fails
        logger.error('Failed to notify coach of restriction', {
          restrictionId: restriction.id,
        }, notifyError)
      }
    }

    return NextResponse.json(restriction, { status: 201 })
  } catch (error) {
    console.error('Error creating training restriction:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create training restriction' },
      { status: 500 }
    )
  }
}
