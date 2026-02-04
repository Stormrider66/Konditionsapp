/**
 * AI Program Generation API
 *
 * POST /api/athlete/generate-program - Generate an AI training program for the athlete
 *
 * Requires:
 * - Authenticated athlete
 * - STANDARD or PRO subscription
 * - No assigned coach (self-coached athletes only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { generateAIProgram } from '@/lib/agent/program-generator'
import { z } from 'zod'

const generateProgramSchema = z.object({
  clientId: z.string().uuid(),
  sport: z.string(),
  experience: z.string(),
  goal: z.string().optional(),
  targetDate: z.string().optional(),
  weeklyAvailability: z.record(z.object({
    available: z.boolean(),
    maxHours: z.number().optional(),
  })).optional(),
  preferredSessionLength: z.number().optional(),
  equipment: z.record(z.boolean()).optional(),
})

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
    const validationResult = generateProgramSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const {
      clientId,
      sport,
      experience,
      goal,
      targetDate,
      weeklyAvailability,
      preferredSessionLength,
      equipment,
    } = validationResult.data

    // Verify the athlete owns this client
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: {
        userId: user.id,
        clientId,
      },
      include: {
        client: {
          include: {
            athleteSubscription: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { success: false, error: 'Client not found or not owned by user' },
        { status: 404 }
      )
    }

    const subscription = athleteAccount.client.athleteSubscription

    // Check subscription tier
    if (!subscription || subscription.tier === 'FREE') {
      return NextResponse.json(
        { success: false, error: 'AI program generation requires STANDARD or PRO subscription' },
        { status: 403 }
      )
    }

    // Check if athlete has an assigned coach
    if (subscription.assignedCoachId) {
      return NextResponse.json(
        { success: false, error: 'Athletes with an assigned coach cannot generate AI programs' },
        { status: 403 }
      )
    }

    // Calculate training parameters from availability
    const trainingDaysPerWeek = weeklyAvailability
      ? Object.values(weeklyAvailability).filter((day) => day.available).length
      : 4

    const weeklyHours = weeklyAvailability
      ? Object.values(weeklyAvailability)
          .filter((day) => day.available)
          .reduce((sum, day) => sum + (day.maxHours || (preferredSessionLength || 60) / 60), 0)
      : 6

    // Check equipment
    const hasGymAccess = equipment?.gym || false
    const hasPoolAccess = equipment?.pool || false

    // Map training goal
    let trainingGoal = 'GENERAL_FITNESS'
    if (goal) {
      // Try to extract goal type from the text
      const goalLower = goal.toLowerCase()
      if (goalLower.includes('race') || goalLower.includes('tävl') || goalLower.includes('lopp')) {
        trainingGoal = 'RACE_PREP'
      } else if (goalLower.includes('speed') || goalLower.includes('snabb') || goalLower.includes('tempo')) {
        trainingGoal = 'SPEED'
      } else if (goalLower.includes('endurance') || goalLower.includes('uthållighet') || goalLower.includes('kondition')) {
        trainingGoal = 'ENDURANCE'
      } else if (goalLower.includes('weight') || goalLower.includes('vikt') || goalLower.includes('gå ner')) {
        trainingGoal = 'WEIGHT_LOSS'
      } else if (goalLower.includes('strength') || goalLower.includes('styrka') || goalLower.includes('stark')) {
        trainingGoal = 'STRENGTH_GAIN'
      }
    }

    // Generate the program
    const program = await generateAIProgram({
      clientId,
      primarySport: sport,
      experienceLevel: experience,
      trainingGoal,
      weeklyHours,
      trainingDaysPerWeek,
      targetEvent: goal,
      targetEventDate: targetDate ? new Date(targetDate) : null,
      hasGymAccess,
      hasPoolAccess,
    })

    logger.info('AI program generated via onboarding', {
      userId: user.id,
      clientId,
      programId: program.id,
      sport,
    })

    return NextResponse.json({
      success: true,
      data: {
        programId: program.id,
        name: program.name,
        methodology: program.methodology,
        totalWeeks: program.totalWeeks,
        startDate: program.startDate,
      },
    })
  } catch (error) {
    logger.error('Failed to generate AI program', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate program' },
      { status: 500 }
    )
  }
}
