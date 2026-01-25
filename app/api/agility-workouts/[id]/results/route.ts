// app/api/agility-workouts/[id]/results/route.ts
// API routes for agility workout results

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const drillResultSchema = z.object({
  drillId: z.string().uuid(),
  completed: z.boolean(),
  timeSeconds: z.number().optional().nullable(),
  notes: z.string().optional().nullable()
})

const submitResultSchema = z.object({
  totalDuration: z.number().int().min(0).optional(),
  perceivedEffort: z.number().int().min(1).max(10).optional(),
  notes: z.string().optional(),
  drillResults: z.array(drillResultSchema).optional()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agility-workouts/[id]/results - List results for workout
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Verify workout exists
    const workout = await prisma.agilityWorkout.findUnique({
      where: { id },
      select: { coachId: true }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { workoutId: id }

    if (athleteId) {
      where.athleteId = athleteId
    }

    const results = await prisma.agilityWorkoutResult.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: {
        athlete: {
          select: { id: true, name: true }
        },
        workout: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching workout results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workout results' },
      { status: 500 }
    )
  }
}

// POST /api/agility-workouts/[id]/results - Submit workout result (athlete)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete account
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: user.id },
      select: { clientId: true }
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete account not found' }, { status: 404 })
    }

    // Verify workout exists
    const workout = await prisma.agilityWorkout.findUnique({
      where: { id },
      include: {
        drills: {
          select: { drillId: true }
        }
      }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = submitResultSchema.parse(body)

    // Create result
    const result = await prisma.agilityWorkoutResult.create({
      data: {
        workoutId: id,
        athleteId: athleteAccount.clientId,
        completedAt: new Date(),
        totalDuration: validatedData.totalDuration,
        perceivedEffort: validatedData.perceivedEffort,
        notes: validatedData.notes,
        drillResults: validatedData.drillResults || Prisma.JsonNull
      },
      include: {
        athlete: {
          select: { id: true, name: true }
        },
        workout: {
          select: { id: true, name: true }
        }
      }
    })

    // Update assignment status if exists
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.agilityWorkoutAssignment.updateMany({
      where: {
        workoutId: id,
        athleteId: athleteAccount.clientId,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error submitting workout result:', error)
    return NextResponse.json(
      { error: 'Failed to submit workout result' },
      { status: 500 }
    )
  }
}
