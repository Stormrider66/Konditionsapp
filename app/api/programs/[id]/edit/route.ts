// app/api/programs/[id]/edit/route.ts
/**
 * Universal Program Editor API
 *
 * Endpoints for full program editing capabilities:
 * - PUT /api/programs/:id/edit - Edit program metadata
 * - PUT /api/programs/:id/edit?type=day - Edit training day
 * - POST /api/programs/:id/edit?type=workout - Add workout to day
 * - DELETE /api/programs/:id/edit?type=workout - Remove workout
 * - PUT /api/programs/:id/edit?type=reorder - Reorder workouts
 * - PUT /api/programs/:id/edit?type=segments - Edit workout exercises
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

/**
 * PUT - Edit program, day, workout, or segments
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params
    const searchParams = request.nextUrl.searchParams
    const editType = searchParams.get('type') // 'day', 'workout', 'reorder', 'segments'

    const body = await request.json()

    // Route to appropriate handler
    switch (editType) {
      case 'day':
        return await editDay(programId, body)
      case 'workout':
        return await editWorkout(body)
      case 'reorder':
        return await reorderWorkouts(body)
      case 'segments':
        return await editSegments(body)
      default:
        return await editProgramMetadata(programId, body)
    }
  } catch (error: unknown) {
    logger.error('Error editing program', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Add new workout to a day
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: programId } = await params
    const searchParams = request.nextUrl.searchParams
    const addType = searchParams.get('type') // 'workout'

    const body = await request.json()

    if (addType === 'workout') {
      return await addWorkout(programId, body)
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error: unknown) {
    logger.error('Error adding to program', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Remove workout from day
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params // Consume params even if not used directly
    const searchParams = request.nextUrl.searchParams
    const workoutId = searchParams.get('workoutId')

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
    }

    return await removeWorkout(workoutId)
  } catch (error: unknown) {
    logger.error('Error removing workout', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Edit program metadata
 */
async function editProgramMetadata(programId: string, body: any) {
  const { name, description, goalType } = body

  const updated = await prisma.trainingProgram.update({
    where: { id: programId },
    data: {
      ...(name && { name }),
      ...(description && { description }),
      ...(goalType && { goalType }),
    },
  })

  return NextResponse.json(updated, { status: 200 })
}

/**
 * Edit training day
 */
async function editDay(programId: string, body: any) {
  const { weekId, dayId, notes } = body

  if (!weekId || !dayId) {
    return NextResponse.json({ error: 'weekId and dayId required' }, { status: 400 })
  }

  const updated = await prisma.trainingDay.update({
    where: { id: dayId },
    data: {
      ...(notes !== undefined && { notes }),
    },
  })

  return NextResponse.json(updated, { status: 200 })
}

/**
 * Add new workout to a day
 */
async function addWorkout(programId: string, body: any) {
  const { dayId, name, type, intensity, duration, description, segments } = body

  if (!dayId || !type) {
    return NextResponse.json({ error: 'dayId and type required' }, { status: 400 })
  }

  // Get current workout count for this day (for ordering)
  const existingWorkouts = await prisma.workout.findMany({
    where: { dayId: dayId },
  })

  const workout = await prisma.workout.create({
    data: {
      dayId: dayId,
      name: name || `${type} Workout`,
      type,
      intensity: intensity || 'MODERATE',
      duration: duration || 60,
      description,
      order: existingWorkouts.length, // Add at end
      isCustom: true, // User-added workout
      segments: segments
        ? {
            create: segments.map((seg: any, idx: number) => ({
              order: idx,
              type: seg.type,
              duration: seg.duration,
              distance: seg.distance,
              pace: seg.pace,
              heartRate: seg.heartRate,
              sets: seg.sets,
              reps: seg.reps,
              exerciseId: seg.exerciseId,
              notes: seg.notes,
            })),
          }
        : undefined,
    },
    include: {
      segments: {
        include: {
          exercise: true,
        },
      },
    },
  })

  return NextResponse.json(workout, { status: 201 })
}

/**
 * Edit existing workout
 */
async function editWorkout(body: any) {
  const { workoutId, type, intensity, duration, description } = body

  if (!workoutId) {
    return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
  }

  const updated = await prisma.workout.update({
    where: { id: workoutId },
    data: {
      ...(type && { type }),
      ...(intensity && { intensity }),
      ...(duration !== undefined && { duration }),
      ...(description !== undefined && { description }),
    },
    include: {
      segments: {
        include: {
          exercise: true,
        },
      },
    },
  })

  return NextResponse.json(updated, { status: 200 })
}

/**
 * Remove workout from day
 */
async function removeWorkout(workoutId: string) {
  // Delete workout (cascade will delete segments)
  await prisma.workout.delete({
    where: { id: workoutId },
  })

  return NextResponse.json({ message: 'Workout removed successfully' }, { status: 200 })
}

/**
 * Reorder workouts within a day
 */
async function reorderWorkouts(body: any) {
  const { workoutOrders } = body // Array of {workoutId, newOrder}

  if (!workoutOrders || !Array.isArray(workoutOrders)) {
    return NextResponse.json({ error: 'workoutOrders array required' }, { status: 400 })
  }

  // Update all workout orders in transaction
  await prisma.$transaction(
    workoutOrders.map((item: { workoutId: string; newOrder: number }) =>
      prisma.workout.update({
        where: { id: item.workoutId },
        data: { order: item.newOrder },
      })
    )
  )

  return NextResponse.json({ message: 'Workouts reordered successfully' }, { status: 200 })
}

/**
 * Edit workout segments (exercises)
 */
async function editSegments(body: any) {
  const { workoutId, segments } = body

  if (!workoutId || !segments) {
    return NextResponse.json({ error: 'workoutId and segments required' }, { status: 400 })
  }

  // Delete existing segments and create new ones (simpler than update)
  await prisma.workoutSegment.deleteMany({
    where: { workoutId },
  })

  // Create new segments
  await prisma.workoutSegment.createMany({
    data: segments.map((seg: any, idx: number) => ({
      workoutId,
      order: idx,
      type: seg.type,
      duration: seg.duration,
      distance: seg.distance,
      pace: seg.pace,
      heartRate: seg.heartRate,
      sets: seg.sets,
      reps: seg.reps,
      exerciseId: seg.exerciseId,
      notes: seg.notes,
    })),
  })

  // Return updated workout with segments
  const updated = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      segments: {
        include: {
          exercise: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  })

  return NextResponse.json(updated, { status: 200 })
}
