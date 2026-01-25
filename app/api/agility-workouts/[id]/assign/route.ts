// app/api/agility-workouts/[id]/assign/route.ts
// API route for assigning agility workouts to athletes

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const assignWorkoutSchema = z.object({
  athleteIds: z.array(z.string().uuid()).min(1),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/agility-workouts/[id]/assign - Assign workout to athletes
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a coach
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!dbUser || (dbUser.role !== 'COACH' && dbUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only coaches can assign workouts' }, { status: 403 })
    }

    // Verify workout exists
    const workout = await prisma.agilityWorkout.findUnique({
      where: { id },
      select: { id: true, coachId: true, isPublic: true }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Check access to workout
    if (workout.coachId !== user.id && !workout.isPublic) {
      return NextResponse.json({ error: 'Access denied to this workout' }, { status: 403 })
    }

    const body = await request.json()
    const { athleteIds, assignedDate, notes } = assignWorkoutSchema.parse(body)

    // Verify all athletes exist and belong to the coach
    const athletes = await prisma.client.findMany({
      where: {
        id: { in: athleteIds },
        userId: user.id
      },
      select: { id: true, name: true }
    })

    if (athletes.length !== athleteIds.length) {
      return NextResponse.json(
        { error: 'One or more athletes not found or do not belong to you' },
        { status: 400 }
      )
    }

    const parsedDate = new Date(assignedDate)

    // Create assignments (upsert to handle duplicates)
    const assignments = await Promise.all(
      athleteIds.map(async (athleteId) => {
        return prisma.agilityWorkoutAssignment.upsert({
          where: {
            workoutId_athleteId_assignedDate: {
              workoutId: id,
              athleteId,
              assignedDate: parsedDate
            }
          },
          create: {
            workoutId: id,
            athleteId,
            assignedDate: parsedDate,
            assignedBy: user.id,
            notes,
            status: 'ASSIGNED'
          },
          update: {
            notes,
            status: 'ASSIGNED'
          },
          include: {
            athlete: {
              select: { id: true, name: true }
            }
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      assignedCount: assignments.length,
      assignments
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error assigning agility workout:', error)
    return NextResponse.json(
      { error: 'Failed to assign agility workout' },
      { status: 500 }
    )
  }
}
