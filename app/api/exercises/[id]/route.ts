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
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET - Get single exercise by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id

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

    return NextResponse.json(exercise, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching exercise:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT - Update exercise
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id
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

    // Only allow updating custom exercises (not public library)
    if (existingExercise.isPublic) {
      return NextResponse.json(
        { error: 'Cannot modify public library exercises. Create a custom version instead.' },
        { status: 403 }
      )
    }

    // Update exercise
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
  } catch (error: any) {
    console.error('Error updating exercise:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Delete exercise
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        _count: {
          select: {
            progressionTracking: true,
            workoutSegments: true,
          },
        },
      },
    })

    if (!existingExercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Only allow deleting custom exercises (not public library)
    if (existingExercise.isPublic) {
      return NextResponse.json(
        { error: 'Cannot delete public library exercises' },
        { status: 403 }
      )
    }

    // Check if exercise is in use
    const inUse =
      existingExercise._count.progressionTracking > 0 ||
      existingExercise._count.workoutSegments > 0

    if (inUse) {
      return NextResponse.json(
        {
          error: 'Exercise is in use',
          message: `This exercise is used in ${existingExercise._count.workoutSegments} workouts and has ${existingExercise._count.progressionTracking} progression records. Archive it instead of deleting.`,
          inUse: {
            workouts: existingExercise._count.workoutSegments,
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
  } catch (error: any) {
    console.error('Error deleting exercise:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
