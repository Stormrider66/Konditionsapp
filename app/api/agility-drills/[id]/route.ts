// app/api/agility-drills/[id]/route.ts
// API routes for individual agility drill operations

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { AgilityDrillCategory, DevelopmentStage, SportType } from '@prisma/client'
import { z } from 'zod'

const updateDrillSchema = z.object({
  name: z.string().min(1).optional(),
  nameSv: z.string().optional(),
  description: z.string().optional(),
  descriptionSv: z.string().optional(),
  category: z.nativeEnum(AgilityDrillCategory).optional(),
  requiredEquipment: z.array(z.string()).optional(),
  optionalEquipment: z.array(z.string()).optional(),
  distanceMeters: z.number().optional().nullable(),
  durationSeconds: z.number().optional().nullable(),
  defaultReps: z.number().optional().nullable(),
  defaultSets: z.number().optional().nullable(),
  restSeconds: z.number().optional().nullable(),
  minDevelopmentStage: z.nativeEnum(DevelopmentStage).optional(),
  maxDevelopmentStage: z.nativeEnum(DevelopmentStage).optional(),
  primarySports: z.array(z.nativeEnum(SportType)).optional(),
  difficultyLevel: z.number().min(1).max(5).optional(),
  videoUrl: z.string().url().optional().nullable(),
  animationUrl: z.string().url().optional().nullable(),
  diagramUrl: z.string().url().optional().nullable(),
  setupInstructions: z.string().optional(),
  executionCues: z.array(z.string()).optional(),
  progressionDrillId: z.string().uuid().optional().nullable(),
  regressionDrillId: z.string().uuid().optional().nullable()
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/agility-drills/[id] - Get single drill details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const drill = await prisma.agilityDrill.findUnique({
      where: { id },
      include: {
        progressionDrill: {
          select: { id: true, name: true, nameSv: true, category: true, difficultyLevel: true }
        },
        regressionDrill: {
          select: { id: true, name: true, nameSv: true, category: true, difficultyLevel: true }
        },
        coach: {
          select: { id: true, name: true }
        },
        _count: {
          select: { workoutDrills: true }
        }
      }
    })

    if (!drill) {
      return NextResponse.json({ error: 'Drill not found' }, { status: 404 })
    }

    return NextResponse.json(drill)
  } catch (error) {
    console.error('Error fetching agility drill:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agility drill' },
      { status: 500 }
    )
  }
}

// PUT /api/agility-drills/[id] - Update custom drill (owner only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if drill exists and user owns it
    const existingDrill = await prisma.agilityDrill.findUnique({
      where: { id },
      select: { coachId: true, isSystemDrill: true }
    })

    if (!existingDrill) {
      return NextResponse.json({ error: 'Drill not found' }, { status: 404 })
    }

    if (existingDrill.isSystemDrill) {
      return NextResponse.json({ error: 'Cannot modify system drills' }, { status: 403 })
    }

    if (existingDrill.coachId !== user.id) {
      // Check if admin
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'You can only edit your own drills' }, { status: 403 })
      }
    }

    const body = await request.json()
    const validatedData = updateDrillSchema.parse(body)

    const drill = await prisma.agilityDrill.update({
      where: { id },
      data: validatedData
    })

    return NextResponse.json(drill)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating agility drill:', error)
    return NextResponse.json(
      { error: 'Failed to update agility drill' },
      { status: 500 }
    )
  }
}

// DELETE /api/agility-drills/[id] - Delete custom drill (owner only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if drill exists and user owns it
    const existingDrill = await prisma.agilityDrill.findUnique({
      where: { id },
      select: { coachId: true, isSystemDrill: true }
    })

    if (!existingDrill) {
      return NextResponse.json({ error: 'Drill not found' }, { status: 404 })
    }

    if (existingDrill.isSystemDrill) {
      return NextResponse.json({ error: 'Cannot delete system drills' }, { status: 403 })
    }

    if (existingDrill.coachId !== user.id) {
      // Check if admin
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
      })

      if (!dbUser || dbUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'You can only delete your own drills' }, { status: 403 })
      }
    }

    await prisma.agilityDrill.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting agility drill:', error)
    return NextResponse.json(
      { error: 'Failed to delete agility drill' },
      { status: 500 }
    )
  }
}
