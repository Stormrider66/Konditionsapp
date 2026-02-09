// app/api/sport-profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { SportType } from '@prisma/client'

// Validation schema for creating sport profile
// Using z.any() for JSON fields as they're stored as Prisma Json type
const createSportProfileSchema = z.object({
  clientId: z.string().uuid(),
  primarySport: z.nativeEnum(SportType),
  secondarySports: z.array(z.nativeEnum(SportType)).optional().default([]),
  equipment: z.any().optional(),
  weeklyAvailability: z.any().optional(),
  preferredSessionLength: z.number().min(15).max(300).optional(),
  currentGoal: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  runningExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  cyclingExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  swimmingExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  strengthExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
})

// POST /api/sport-profile - Create a new sport profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createSportProfileSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    if (user.role !== 'COACH') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const hasAccess = await canAccessClient(user.id, data.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Client not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if profile already exists
    const existingProfile = await prisma.sportProfile.findUnique({
      where: { clientId: data.clientId },
    })

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: 'Sport profile already exists for this client' },
        { status: 409 }
      )
    }

    // Create the sport profile
    const sportProfile = await prisma.sportProfile.create({
      data: {
        clientId: data.clientId,
        primarySport: data.primarySport,
        secondarySports: data.secondarySports,
        equipment: data.equipment,
        weeklyAvailability: data.weeklyAvailability,
        preferredSessionLength: data.preferredSessionLength,
        currentGoal: data.currentGoal,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        runningExperience: data.runningExperience,
        cyclingExperience: data.cyclingExperience,
        swimmingExperience: data.swimmingExperience,
        strengthExperience: data.strengthExperience,
        onboardingStep: 1,
      },
    })

    return NextResponse.json({
      success: true,
      data: sportProfile,
      message: 'Sport profile created successfully',
    })
  } catch (error) {
    logger.error('Error creating sport profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to create sport profile' },
      { status: 500 }
    )
  }
}
