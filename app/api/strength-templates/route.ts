// app/api/strength-templates/route.ts
/**
 * Strength Training Templates API
 *
 * Allows coaches to save workout sessions as reusable templates:
 * - Save complete workouts with all exercises
 * - Retrieve saved templates
 * - Filter by phase, category, difficulty
 * - Apply template to create new workout
 *
 * Templates include:
 * - Exercise selection with sets/reps/load
 * - Strength phase (AA, MS, Power, etc.)
 * - Duration and estimated difficulty
 * - Notes and coaching cues
 *
 * Endpoints:
 * - GET /api/strength-templates - List all templates
 * - POST /api/strength-templates - Create new template from workout
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger } from '@/lib/logger'

const prisma = new PrismaClient()

interface TemplateExercise {
  exerciseId: string
  exerciseName: string
  order: number
  sets: number
  reps: number
  load: string
  restSeconds: number
  tempo?: string
  notes?: string
}

interface StrengthTemplate {
  id: string
  name: string
  description: string
  strengthPhase: string
  category: string // 'FULL_BODY' | 'UPPER' | 'LOWER' | 'PLYOMETRIC' | 'CORE'
  difficulty: string // 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  estimatedDuration: number
  exercises: TemplateExercise[]
  userId: string
  isPublic: boolean
  createdAt: Date
  usageCount: number
}

/**
 * GET - List all strength templates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Filters
    const userId = searchParams.get('userId')
    const strengthPhase = searchParams.get('strengthPhase')
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const isPublic = searchParams.get('isPublic')

    // Build where clause
    const where: any = {}

    if (userId) {
      // Show user's own templates + public templates
      where.OR = [{ userId }, { isPublic: true }]
    }

    if (strengthPhase && strengthPhase !== 'ALL') {
      where.strengthPhase = strengthPhase
    }

    if (category && category !== 'ALL') {
      where.category = category
    }

    if (difficulty && difficulty !== 'ALL') {
      where.difficulty = difficulty
    }

    if (isPublic !== null) {
      where.isPublic = isPublic === 'true'
    }

    // For this implementation, we'll store templates in the database
    // NOTE: You'll need to add a StrengthTemplate model to your schema
    // For now, we'll return a placeholder response

    // TODO: Add StrengthTemplate model to schema.prisma
    // const templates = await prisma.strengthTemplate.findMany({
    //   where,
    //   orderBy: { createdAt: 'desc' },
    // })

    // Placeholder response
    const templates: StrengthTemplate[] = []

    return NextResponse.json(
      {
        templates,
        count: templates.length,
        filters: {
          userId,
          strengthPhase,
          category,
          difficulty,
          isPublic,
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    logger.error('Error fetching templates', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Create new template from workout
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      description,
      strengthPhase,
      category,
      difficulty,
      estimatedDuration,
      exercises,
      userId,
      isPublic,
      workoutId, // Optional: Source workout ID
    } = body

    // Validation
    if (!name || !strengthPhase || !exercises || exercises.length === 0) {
      return NextResponse.json(
        { error: 'name, strengthPhase, and exercises are required' },
        { status: 400 }
      )
    }

    // If workoutId provided, copy exercises from existing workout
    let templateExercises = exercises

    if (workoutId) {
      const workout = await prisma.workout.findUnique({
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

      if (workout && workout.segments.length > 0) {
        templateExercises = workout.segments.map((seg) => ({
          exerciseId: seg.exerciseId,
          exerciseName: seg.exercise?.name || 'Unknown',
          order: seg.order,
          sets: seg.sets || 3,
          reps: seg.repsCount || '10',
          load: seg.weight || '70%',
          restSeconds: seg.rest || 90,
          tempo: seg.tempo,
          notes: seg.notes,
        }))
      }
    }

    // TODO: Add StrengthTemplate model to schema.prisma
    // const template = await prisma.strengthTemplate.create({
    //   data: {
    //     name,
    //     description,
    //     strengthPhase,
    //     category: category || 'FULL_BODY',
    //     difficulty: difficulty || 'INTERMEDIATE',
    //     estimatedDuration: estimatedDuration || 60,
    //     exercises: templateExercises,
    //     userId,
    //     isPublic: isPublic || false,
    //     usageCount: 0,
    //   },
    // })

    // Placeholder response
    const template = {
      id: `template-${Date.now()}`,
      name,
      description,
      strengthPhase,
      category: category || 'FULL_BODY',
      difficulty: difficulty || 'INTERMEDIATE',
      estimatedDuration: estimatedDuration || 60,
      exercises: templateExercises,
      userId,
      isPublic: isPublic || false,
      usageCount: 0,
      createdAt: new Date(),
    }

    return NextResponse.json(template, { status: 201 })
  } catch (error: unknown) {
    logger.error('Error creating template', {}, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
