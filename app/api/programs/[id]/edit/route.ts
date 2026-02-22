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
import { prisma } from '@/lib/prisma'
import { canAccessProgram, getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

/**
 * PUT - Edit program, day, workout, or segments
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: programId } = await params
    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const editType = searchParams.get('type') // 'day', 'workout', 'reorder', 'segments'

    const body = await request.json()

    // Route to appropriate handler
    switch (editType) {
      case 'day':
        return await editDay(programId, body)
      case 'workout':
        return await editWorkout(programId, body)
      case 'reorder':
        return await reorderWorkouts(programId, body)
      case 'segments':
        return await editSegments(programId, body)
      default:
        return await editProgramMetadata(programId, body)
    }
  } catch (error: unknown) {
    logger.error('Error editing program', {}, error)
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: programId } = await params
    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const addType = searchParams.get('type') // 'workout'

    const body = await request.json()

    if (addType === 'workout') {
      return await addWorkout(programId, body)
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error: unknown) {
    logger.error('Error adding to program', {}, error)
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: programId } = await params
    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const workoutId = searchParams.get('workoutId')

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
    }

    return await removeWorkout(programId, workoutId)
  } catch (error: unknown) {
    logger.error('Error removing workout', {}, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Edit program metadata
 */
async function editProgramMetadata(programId: string, body: any) {
  const { name, description, goalType, startDate, endDate } = body

  const updated = await prisma.trainingProgram.update({
    where: { id: programId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(goalType && { goalType }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
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

  // Ensure the day belongs to the target program
  const day = await prisma.trainingDay.findFirst({
    where: {
      id: dayId,
      weekId,
      week: { programId },
    },
    select: { id: true },
  })
  if (!day) {
    return NextResponse.json({ error: 'Day not found' }, { status: 404 })
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

  // Ensure the day belongs to the target program
  const day = await prisma.trainingDay.findFirst({
    where: { id: dayId, week: { programId } },
    select: { id: true },
  })
  if (!day) {
    return NextResponse.json({ error: 'Day not found' }, { status: 404 })
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
async function editWorkout(programId: string, body: any) {
  const { workoutId, type, intensity, duration, description } = body

  if (!workoutId) {
    return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
  }

  // Ensure the workout belongs to the target program
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, day: { week: { programId } } },
    select: { id: true },
  })
  if (!workout) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
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
async function removeWorkout(programId: string, workoutId: string) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, day: { week: { programId } } },
    select: { id: true },
  })
  if (!workout) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
  }

  // Delete workout (cascade will delete segments)
  await prisma.workout.delete({
    where: { id: workoutId },
  })

  return NextResponse.json({ message: 'Workout removed successfully' }, { status: 200 })
}

/**
 * Reorder workouts within a day
 */
async function reorderWorkouts(programId: string, body: any) {
  const { workoutOrders } = body // Array of {workoutId, newOrder}

  if (!workoutOrders || !Array.isArray(workoutOrders)) {
    return NextResponse.json({ error: 'workoutOrders array required' }, { status: 400 })
  }

  const workoutIds = workoutOrders
    .map((item: { workoutId?: string }) => item.workoutId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)

  if (workoutIds.length !== workoutOrders.length) {
    return NextResponse.json({ error: 'Invalid workoutOrders' }, { status: 400 })
  }

  // Ensure all workouts belong to the target program
  const workouts = await prisma.workout.findMany({
    where: { id: { in: workoutIds }, day: { week: { programId } } },
    select: { id: true },
  })
  if (workouts.length !== workoutIds.length) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
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
async function editSegments(programId: string, body: any) {
  const { workoutId, segments } = body

  if (!workoutId || !segments) {
    return NextResponse.json({ error: 'workoutId and segments required' }, { status: 400 })
  }

  // Ensure the workout belongs to the target program
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, day: { week: { programId } } },
    select: { id: true },
  })
  if (!workout) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
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
