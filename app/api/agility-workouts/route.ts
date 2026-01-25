// app/api/agility-workouts/route.ts
// API routes for agility workouts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AgilityWorkoutFormat, AgilityDrillCategory, DevelopmentStage, SportType, WorkoutSectionType } from '@prisma/client'
import { z } from 'zod'

const workoutDrillSchema = z.object({
  drillId: z.string().uuid(),
  order: z.number().int().min(0),
  sectionType: z.nativeEnum(WorkoutSectionType).optional().default('MAIN'),
  sets: z.number().int().min(1).optional(),
  reps: z.number().int().min(1).optional(),
  duration: z.number().int().min(1).optional(),
  restSeconds: z.number().int().min(0).optional(),
  notes: z.string().optional()
})

const createWorkoutSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.nativeEnum(AgilityWorkoutFormat),
  totalDuration: z.number().int().min(1).optional(),
  restBetweenDrills: z.number().int().min(0).optional(),
  developmentStage: z.nativeEnum(DevelopmentStage).optional(),
  targetSports: z.array(z.nativeEnum(SportType)).optional().default([]),
  primaryFocus: z.nativeEnum(AgilityDrillCategory).optional(),
  isTemplate: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  drills: z.array(workoutDrillSchema).min(1)
})

// GET /api/agility-workouts - List workouts with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as AgilityWorkoutFormat | null
    const developmentStage = searchParams.get('developmentStage') as DevelopmentStage | null
    const sport = searchParams.get('sport') as SportType | null
    const coachId = searchParams.get('coachId')
    const templatesOnly = searchParams.get('templatesOnly') === 'true'
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (format) {
      where.format = format
    }

    if (developmentStage) {
      where.developmentStage = developmentStage
    }

    if (sport) {
      where.targetSports = {
        has: sport
      }
    }

    if (coachId) {
      where.coachId = coachId
    } else {
      // Default: show user's workouts and public workouts
      where.OR = [
        { coachId: user.id },
        { isPublic: true }
      ]
    }

    if (templatesOnly) {
      where.isTemplate = true
    }

    if (search) {
      where.AND = [
        ...(where.AND as unknown[] || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }

    const workouts = await prisma.agilityWorkout.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        coach: {
          select: { id: true, name: true }
        },
        drills: {
          orderBy: { order: 'asc' },
          include: {
            drill: {
              select: { id: true, name: true, nameSv: true, category: true, difficultyLevel: true }
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

    return NextResponse.json(workouts)
  } catch (error) {
    console.error('Error fetching agility workouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agility workouts' },
      { status: 500 }
    )
  }
}

// POST /api/agility-workouts - Create workout with drills
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only coaches can create workouts' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createWorkoutSchema.parse(body)

    const { drills, ...workoutData } = validatedData

    // Verify all drills exist
    const drillIds = drills.map(d => d.drillId)
    const existingDrills = await prisma.agilityDrill.findMany({
      where: { id: { in: drillIds } },
      select: { id: true }
    })

    if (existingDrills.length !== drillIds.length) {
      return NextResponse.json(
        { error: 'One or more drills not found' },
        { status: 400 }
      )
    }

    const workout = await prisma.agilityWorkout.create({
      data: {
        ...workoutData,
        coachId: user.id,
        drills: {
          create: drills.map(drill => ({
            drillId: drill.drillId,
            order: drill.order,
            sectionType: drill.sectionType || 'MAIN',
            sets: drill.sets,
            reps: drill.reps,
            duration: drill.duration,
            restSeconds: drill.restSeconds,
            notes: drill.notes
          }))
        }
      },
      include: {
        drills: {
          orderBy: { order: 'asc' },
          include: {
            drill: true
          }
        }
      }
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating agility workout:', error)
    return NextResponse.json(
      { error: 'Failed to create agility workout' },
      { status: 500 }
    )
  }
}
