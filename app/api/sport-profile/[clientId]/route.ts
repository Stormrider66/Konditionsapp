// app/api/sport-profile/[clientId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { SportType } from '@prisma/client'

type RouteParams = {
  params: Promise<{
    clientId: string
  }>
}

// Validation schema for updating sport profile
// Using z.any() for JSON fields as they're stored as Prisma Json type
const updateSportProfileSchema = z.object({
  primarySport: z.nativeEnum(SportType).optional(),
  secondarySports: z.array(z.nativeEnum(SportType)).optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingStep: z.number().optional(),
  runningSettings: z.any().optional(),
  cyclingSettings: z.any().optional(),
  skiingSettings: z.any().optional(),
  triathlonSettings: z.any().optional(),
  hyroxSettings: z.any().optional(),
  generalFitnessSettings: z.any().optional(),
  swimmingSettings: z.any().optional(),
  equipment: z.any().optional(),
  weeklyAvailability: z.any().optional(),
  preferredSessionLength: z.number().min(15).max(300).optional(),
  currentGoal: z.string().optional(),
  targetDate: z.string().datetime().optional().nullable(),
  targetMetric: z.any().optional(),
  themePreferences: z.any().optional(), // { appTheme: 'FITAPP_DARK' | 'MINIMALIST_WHITE', pdfTheme: '...' }
  runningExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  cyclingExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  swimmingExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  strengthExperience: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']).optional(),
  activeStandardProgram: z.string().optional().nullable(),
  hasCustomProgram: z.boolean().optional(),
})

// GET /api/sport-profile/[clientId] - Get sport profile for a client
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { clientId } = await params

    // Verify the client belongs to this user (coach) or is the athlete themselves
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Allow access if coach owns the client OR user is the athlete
    const isCoach = client.userId === user.id
    const isAthlete = client.athleteAccount?.userId === user.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const sportProfile = await prisma.sportProfile.findUnique({
      where: { clientId },
    })

    if (!sportProfile) {
      return NextResponse.json(
        { success: false, error: 'Sport profile not found', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sportProfile,
    })
  } catch (error) {
    logger.error('Error fetching sport profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sport profile' },
      { status: 500 }
    )
  }
}

// PUT /api/sport-profile/[clientId] - Update sport profile
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { clientId } = await params
    const body = await request.json()

    const validation = updateSportProfileSchema.safeParse(body)
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

    // Verify the client belongs to this user (coach) or is the athlete themselves
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true, athleteAccount: { select: { userId: true } } },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Allow access if coach owns the client OR user is the athlete
    const isCoach = client.userId === user.id
    const isAthlete = client.athleteAccount?.userId === user.id

    if (!isCoach && !isAthlete) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if profile exists
    const existingProfile = await prisma.sportProfile.findUnique({
      where: { clientId },
    })

    if (!existingProfile) {
      // Create profile if it doesn't exist (upsert behavior)
      const sportProfile = await prisma.sportProfile.create({
        data: {
          clientId,
          primarySport: data.primarySport || 'RUNNING',
          secondarySports: data.secondarySports || [],
          onboardingCompleted: data.onboardingCompleted || false,
          onboardingStep: data.onboardingStep || 0,
          runningSettings: data.runningSettings,
          cyclingSettings: data.cyclingSettings,
          skiingSettings: data.skiingSettings,
          triathlonSettings: data.triathlonSettings,
          hyroxSettings: data.hyroxSettings,
          generalFitnessSettings: data.generalFitnessSettings,
          swimmingSettings: data.swimmingSettings,
          equipment: data.equipment,
          weeklyAvailability: data.weeklyAvailability,
          preferredSessionLength: data.preferredSessionLength,
          currentGoal: data.currentGoal,
          targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
          targetMetric: data.targetMetric,
          themePreferences: data.themePreferences,
          runningExperience: data.runningExperience,
          cyclingExperience: data.cyclingExperience,
          swimmingExperience: data.swimmingExperience,
          strengthExperience: data.strengthExperience,
          activeStandardProgram: data.activeStandardProgram,
          hasCustomProgram: data.hasCustomProgram,
        },
      })

      return NextResponse.json({
        success: true,
        data: sportProfile,
        message: 'Sport profile created successfully',
      })
    }

    // Update existing profile
    const sportProfile = await prisma.sportProfile.update({
      where: { clientId },
      data: {
        ...(data.primarySport && { primarySport: data.primarySport }),
        ...(data.secondarySports !== undefined && { secondarySports: data.secondarySports }),
        ...(data.onboardingCompleted !== undefined && { onboardingCompleted: data.onboardingCompleted }),
        ...(data.onboardingStep !== undefined && { onboardingStep: data.onboardingStep }),
        ...(data.runningSettings !== undefined && { runningSettings: data.runningSettings }),
        ...(data.cyclingSettings !== undefined && { cyclingSettings: data.cyclingSettings }),
        ...(data.skiingSettings !== undefined && { skiingSettings: data.skiingSettings }),
        ...(data.triathlonSettings !== undefined && { triathlonSettings: data.triathlonSettings }),
        ...(data.hyroxSettings !== undefined && { hyroxSettings: data.hyroxSettings }),
        ...(data.generalFitnessSettings !== undefined && { generalFitnessSettings: data.generalFitnessSettings }),
        ...(data.swimmingSettings !== undefined && { swimmingSettings: data.swimmingSettings }),
        ...(data.equipment !== undefined && { equipment: data.equipment }),
        ...(data.weeklyAvailability !== undefined && { weeklyAvailability: data.weeklyAvailability }),
        ...(data.preferredSessionLength !== undefined && { preferredSessionLength: data.preferredSessionLength }),
        ...(data.currentGoal !== undefined && { currentGoal: data.currentGoal }),
        ...(data.targetDate !== undefined && { targetDate: data.targetDate ? new Date(data.targetDate) : null }),
        ...(data.targetMetric !== undefined && { targetMetric: data.targetMetric }),
        ...(data.themePreferences !== undefined && { themePreferences: data.themePreferences }),
        ...(data.runningExperience !== undefined && { runningExperience: data.runningExperience }),
        ...(data.cyclingExperience !== undefined && { cyclingExperience: data.cyclingExperience }),
        ...(data.swimmingExperience !== undefined && { swimmingExperience: data.swimmingExperience }),
        ...(data.strengthExperience !== undefined && { strengthExperience: data.strengthExperience }),
        ...(data.activeStandardProgram !== undefined && { activeStandardProgram: data.activeStandardProgram }),
        ...(data.hasCustomProgram !== undefined && { hasCustomProgram: data.hasCustomProgram }),
      },
    })

    return NextResponse.json({
      success: true,
      data: sportProfile,
      message: 'Sport profile updated successfully',
    })
  } catch (error) {
    logger.error('Error updating sport profile', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update sport profile' },
      { status: 500 }
    )
  }
}
