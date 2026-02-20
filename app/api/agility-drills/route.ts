// app/api/agility-drills/route.ts
// API routes for agility drill library

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AgilityDrillCategory, DevelopmentStage, SportType } from '@prisma/client'
import { z } from 'zod'

const createDrillSchema = z.object({
  name: z.string().min(1),
  nameSv: z.string().optional(),
  description: z.string().optional(),
  descriptionSv: z.string().optional(),
  category: z.nativeEnum(AgilityDrillCategory),
  requiredEquipment: z.array(z.string()).optional().default([]),
  optionalEquipment: z.array(z.string()).optional().default([]),
  distanceMeters: z.number().optional(),
  durationSeconds: z.number().optional(),
  defaultReps: z.number().optional(),
  defaultSets: z.number().optional(),
  restSeconds: z.number().optional(),
  minDevelopmentStage: z.nativeEnum(DevelopmentStage).optional().default('FUNDAMENTALS'),
  maxDevelopmentStage: z.nativeEnum(DevelopmentStage).optional().default('ELITE'),
  primarySports: z.array(z.nativeEnum(SportType)).optional().default([]),
  difficultyLevel: z.number().min(1).max(5).optional().default(3),
  videoUrl: z.string().url().optional(),
  animationUrl: z.string().url().optional(),
  diagramUrl: z.string().url().optional(),
  setupInstructions: z.string().optional(),
  executionCues: z.array(z.string()).optional().default([])
})

// GET /api/agility-drills - List drills with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as AgilityDrillCategory | null
    const developmentStage = searchParams.get('developmentStage') as DevelopmentStage | null
    const sport = searchParams.get('sport') as SportType | null
    const equipment = searchParams.get('equipment')
    const search = searchParams.get('search')
    const difficulty = searchParams.get('difficulty')
    const systemOnly = searchParams.get('systemOnly') === 'true'
    const coachId = searchParams.get('coachId')
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '200') || 200), 500)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)

    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }

    if (developmentStage) {
      // Filter drills where the requested stage is within the drill's min/max range
      where.AND = [
        ...(where.AND as unknown[] || []),
        {
          minDevelopmentStage: {
            in: getStagesUpTo(developmentStage)
          }
        },
        {
          maxDevelopmentStage: {
            in: getStagesFrom(developmentStage)
          }
        }
      ]
    }

    if (sport) {
      where.primarySports = {
        has: sport
      }
    }

    if (equipment) {
      const equipmentList = equipment.split(',')
      where.requiredEquipment = {
        hasSome: equipmentList
      }
    }

    if (difficulty) {
      where.difficultyLevel = parseInt(difficulty)
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameSv: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (systemOnly) {
      where.isSystemDrill = true
    } else if (coachId) {
      where.OR = [
        { isSystemDrill: true },
        { coachId: coachId }
      ]
    }

    const [drills, total] = await Promise.all([
      prisma.agilityDrill.findMany({
        where,
        orderBy: [
          { difficultyLevel: 'asc' },
          { name: 'asc' }
        ],
        include: {
          progressionDrill: {
            select: { id: true, name: true }
          },
          regressionDrill: {
            select: { id: true, name: true }
          }
        },
        take: limit,
        skip: offset,
      }),
      prisma.agilityDrill.count({ where }),
    ])

    return NextResponse.json({
      data: drills,
      pagination: { total, limit, offset, hasMore: offset + drills.length < total },
    })
  } catch (error) {
    console.error('Error fetching agility drills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agility drills' },
      { status: 500 }
    )
  }
}

// POST /api/agility-drills - Create custom drill
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
      return NextResponse.json({ error: 'Only coaches can create drills' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createDrillSchema.parse(body)

    const drill = await prisma.agilityDrill.create({
      data: {
        ...validatedData,
        coachId: user.id,
        isSystemDrill: false
      }
    })

    return NextResponse.json(drill, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating agility drill:', error)
    return NextResponse.json(
      { error: 'Failed to create agility drill' },
      { status: 500 }
    )
  }
}

// Helper functions for development stage filtering
function getStagesUpTo(stage: DevelopmentStage): DevelopmentStage[] {
  const order: DevelopmentStage[] = [
    'FUNDAMENTALS',
    'LEARNING_TO_TRAIN',
    'TRAINING_TO_TRAIN',
    'TRAINING_TO_COMPETE',
    'TRAINING_TO_WIN',
    'ELITE'
  ]
  const index = order.indexOf(stage)
  return order.slice(0, index + 1)
}

function getStagesFrom(stage: DevelopmentStage): DevelopmentStage[] {
  const order: DevelopmentStage[] = [
    'FUNDAMENTALS',
    'LEARNING_TO_TRAIN',
    'TRAINING_TO_TRAIN',
    'TRAINING_TO_COMPETE',
    'TRAINING_TO_WIN',
    'ELITE'
  ]
  const index = order.indexOf(stage)
  return order.slice(index)
}
