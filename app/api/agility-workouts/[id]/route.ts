// app/api/agility-workouts/[id]/route.ts
// API routes for individual agility workout operations

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AgilityWorkoutFormat, AgilityDrillCategory, DevelopmentStage, SportType, WorkoutSectionType } from '@prisma/client'
import { z } from 'zod'

const workoutDrillSchema = z.object({
  id: z.string().uuid().optional(),
  drillId: z.string().uuid(),
  order: z.number().int().min(0),
  sectionType: z.nativeEnum(WorkoutSectionType).optional().default('MAIN'),
  sets: z.number().int().min(1).optional().nullable(),
  reps: z.number().int().min(1).optional().nullable(),
  duration: z.number().int().min(1).optional().nullable(),
  restSeconds: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
})

const updateWorkoutSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  format: z.nativeEnum(AgilityWorkoutFormat).optional(),
  totalDuration: z.number().int().min(1).optional().nullable(),
  restBetweenDrills: z.number().int().min(0).optional().nullable(),
  developmentStage: z.nativeEnum(DevelopmentStage).optional().nullable(),
  targetSports: z.array(z.nativeEnum(SportType)).optional(),
  primaryFocus: z.nativeEnum(AgilityDrillCategory).optional().nullable(),
  isTemplate: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  drills: z.array(workoutDrillSchema).optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agility-workouts/[id] - Get single workout with drills
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workout = await prisma.agilityWorkout.findUnique({
      where: { id },
      include: {
        coach: {
          select: { id: true, name: true }
        },
        drills: {
          orderBy: { order: 'asc' },
          include: {
            drill: true
          }
        },
        assignments: {
          orderBy: { assignedDate: 'desc' },
          take: 10,
          include: {
            athlete: {
              select: { id: true, name: true }
            }
          }
        },
        results: {
          orderBy: { completedAt: 'desc' },
          take: 10,
          include: {
            athlete: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: {
            assignments: true,
            results: true
          }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Check access: own workout or public
    if (workout.coachId !== user.id && !workout.isPublic) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(workout)
  } catch (error) {
    console.error('Error fetching agility workout:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agility workout' },
      { status: 500 }
    )
  }
}

// PUT /api/agility-workouts/[id] - Update workout
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const existingWorkout = await prisma.agilityWorkout.findUnique({
      where: { id },
      select: { coachId: true }
    })

    if (!existingWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (existingWorkout.coachId !== user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'You can only edit your own workouts' }, { status: 403 })
      }
    }

    const body = await request.json()
    const validatedData = updateWorkoutSchema.parse(body)

    const { drills, ...workoutData } = validatedData

    // Start transaction to update workout and drills
    const workout = await prisma.$transaction(async (tx) => {
      // Update workout fields
      const updatedWorkout = await tx.agilityWorkout.update({
        where: { id },
        data: workoutData
      })

      // If drills provided, replace all drills
      if (drills !== undefined) {
        // Delete existing drills
        await tx.agilityWorkoutDrill.deleteMany({
          where: { workoutId: id }
        })

        // Create new drills
        if (drills.length > 0) {
          await tx.agilityWorkoutDrill.createMany({
            data: drills.map(drill => ({
              workoutId: id,
              drillId: drill.drillId,
              order: drill.order,
              sectionType: drill.sectionType || 'MAIN',
              sets: drill.sets,
              reps: drill.reps,
              duration: drill.duration,
              restSeconds: drill.restSeconds,
              notes: drill.notes
            }))
          })
        }
      }

      // Return updated workout with drills
      return tx.agilityWorkout.findUnique({
        where: { id },
        include: {
          drills: {
            orderBy: { order: 'asc' },
            include: { drill: true }
          }
        }
      })
    })

    return NextResponse.json(workout)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating agility workout:', error)
    return NextResponse.json(
      { error: 'Failed to update agility workout' },
      { status: 500 }
    )
  }
}

// DELETE /api/agility-workouts/[id] - Delete workout (cascade drills)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const existingWorkout = await prisma.agilityWorkout.findUnique({
      where: { id },
      select: { coachId: true }
    })

    if (!existingWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (existingWorkout.coachId !== user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'You can only delete your own workouts' }, { status: 403 })
      }
    }

    await prisma.agilityWorkout.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting agility workout:', error)
    return NextResponse.json(
      { error: 'Failed to delete agility workout' },
      { status: 500 }
    )
  }
}
