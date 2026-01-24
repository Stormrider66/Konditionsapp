// app/api/physio/restrictions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessAthleteAsPhysio, canCreateRestrictions } from '@/lib/auth-utils'
import { z } from 'zod'

const updateRestrictionSchema = z.object({
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
  ]).optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'COMPLETE']).optional(),
  bodyParts: z.array(z.string()).optional(),
  affectedWorkoutTypes: z.array(z.string()).optional(),
  affectedExerciseIds: z.array(z.string().uuid()).optional(),
  endDate: z.string().datetime().optional().nullable(),
  volumeReductionPercent: z.number().int().min(0).max(100).optional().nullable(),
  maxIntensityZone: z.number().int().min(1).max(5).optional().nullable(),
  description: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/physio/restrictions/[id]
 * Get a specific training restriction
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

    const restriction = await prisma.trainingRestriction.findUnique({
      where: { id },
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
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    if (!restriction) {
      return NextResponse.json({ error: 'Restriction not found' }, { status: 404 })
    }

    // Check access
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = restriction.createdById === user.id || await canAccessAthleteAsPhysio(user.id, restriction.clientId)
    } else if (user.role === 'COACH') {
      const client = await prisma.client.findUnique({
        where: { id: restriction.clientId },
        select: { userId: true },
      })
      hasAccess = client?.userId === user.id
    } else if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })
      hasAccess = athleteAccount?.clientId === restriction.clientId
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(restriction)
  } catch (error) {
    console.error('Error fetching restriction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restriction' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/physio/restrictions/[id]
 * Update or deactivate a training restriction
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateRestrictionSchema.parse(body)

    // Check if restriction exists
    const existingRestriction = await prisma.trainingRestriction.findUnique({
      where: { id },
    })

    if (!existingRestriction) {
      return NextResponse.json({ error: 'Restriction not found' }, { status: 404 })
    }

    // Check permission to update
    const canUpdate = await canCreateRestrictions(user.id, existingRestriction.clientId)
    if (!canUpdate && existingRestriction.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this restriction' },
        { status: 403 }
      )
    }

    const restriction = await prisma.trainingRestriction.update({
      where: { id },
      data: {
        ...validatedData,
        endDate: validatedData.endDate
          ? new Date(validatedData.endDate)
          : validatedData.endDate === null
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
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(restriction)
  } catch (error) {
    console.error('Error updating restriction:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update restriction' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/physio/restrictions/[id]
 * Delete a training restriction
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if restriction exists
    const existingRestriction = await prisma.trainingRestriction.findUnique({
      where: { id },
    })

    if (!existingRestriction) {
      return NextResponse.json({ error: 'Restriction not found' }, { status: 404 })
    }

    // Only creator or admin can delete
    if (user.role !== 'ADMIN' && existingRestriction.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this restriction' },
        { status: 403 }
      )
    }

    await prisma.trainingRestriction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting restriction:', error)
    return NextResponse.json(
      { error: 'Failed to delete restriction' },
      { status: 500 }
    )
  }
}
