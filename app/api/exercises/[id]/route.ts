// app/api/exercises/[id]/route.ts
/**
 * Individual Exercise API
 *
 * Endpoints:
 * - GET /api/exercises/:id - Get exercise details
 * - PUT /api/exercises/:id - Update exercise
 * - DELETE /api/exercises/:id - Delete exercise
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessExercise } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * GET - Get single exercise by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: exerciseId } = await params

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        _count: {
          select: {
            progressionTracking: true, // How many athletes use this exercise
          },
        },
      },
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(exercise, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

/**
 * PUT - Update exercise
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: exerciseId } = await params
    const body = await request.json()

    const {
      name,
      nameSv,
      nameEn,
      category,
      muscleGroup,
      biomechanicalPillar,
      progressionLevel,
      description,
      instructions,
      equipment,
      difficulty,
      videoUrl,
      imageUrl,
      plyometricIntensity,
      contactsPerRep,
    } = body

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    })

    if (!existingExercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For public exercises, only admins may update videoUrl
    if (existingExercise.isPublic) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Cannot modify public library exercises' },
          { status: 403 }
        )
      }

      const allowedPublicFields = ['videoUrl']
      const attemptedFields = Object.keys(body).filter(key => body[key] !== undefined)
      const disallowedFields = attemptedFields.filter(field => !allowedPublicFields.includes(field))

      if (disallowedFields.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot modify public library exercises. Only video URL can be updated.',
            disallowedFields,
          },
          { status: 403 }
        )
      }

      // Update only videoUrl for public exercises
      const updated = await prisma.exercise.update({
        where: { id: exerciseId },
        data: {
          ...(videoUrl !== undefined && { videoUrl }),
        },
      })

      return NextResponse.json(updated, { status: 200 })
    }

    // Only the owning coach (or admin) can update custom exercises
    if (user.role !== 'ADMIN' && existingExercise.coachId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update exercise (custom exercises can update all fields)
    const updated = await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        ...(name && { name }),
        ...(nameSv && { nameSv }),
        ...(nameEn && { nameEn }),
        ...(category && { category }),
        ...(muscleGroup && { muscleGroup }),
        ...(biomechanicalPillar && { biomechanicalPillar }),
        ...(progressionLevel && { progressionLevel }),
        ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }),
        ...(equipment !== undefined && { equipment }),
        ...(difficulty && { difficulty }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(plyometricIntensity && { plyometricIntensity }),
        ...(contactsPerRep !== undefined && { contactsPerRep }),
      },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

/**
 * DELETE - Delete exercise
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: exerciseId } = await params

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        _count: {
          select: {
            progressionTracking: true,
            segments: true,
          },
        },
      },
    })

    if (!existingExercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow deleting custom exercises (not public library)
    if (existingExercise.isPublic) {
      return NextResponse.json(
        { error: 'Cannot delete public library exercises' },
        { status: 403 }
      )
    }

    // Only the owning coach (or admin) can delete custom exercises
    if (user.role !== 'ADMIN' && existingExercise.coachId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if exercise is in use
    const inUse =
      existingExercise._count.progressionTracking > 0 ||
      existingExercise._count.segments > 0

    if (inUse) {
      return NextResponse.json(
        {
          error: 'Exercise is in use',
          message: `This exercise is used in ${existingExercise._count.segments} workouts and has ${existingExercise._count.progressionTracking} progression records. Archive it instead of deleting.`,
          inUse: {
            workouts: existingExercise._count.segments,
            progressionRecords: existingExercise._count.progressionTracking,
          },
        },
        { status: 409 }
      )
    }

    // Delete exercise
    await prisma.exercise.delete({
      where: { id: exerciseId },
    })

    return NextResponse.json(
      { message: 'Exercise deleted successfully' },
      { status: 200 }
    )
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
