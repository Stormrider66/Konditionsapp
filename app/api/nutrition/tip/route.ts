/**
 * Nutrition Tip API
 *
 * POST /api/nutrition/tip - Generate a nutrition tip after check-in
 *
 * This endpoint generates a contextual nutrition tip based on:
 * - Today's and tomorrow's workouts
 * - Current readiness score
 * - Athlete's dietary preferences
 * - Body weight for calculations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { generatePostCheckInTip } from '@/lib/nutrition-timing'
import type { WorkoutContext } from '@/lib/nutrition-timing'
import type { WorkoutIntensity, WorkoutType } from '@prisma/client'

// Request validation schema
const requestSchema = z.object({
  readinessScore: z.number().min(0).max(100).optional(),
})

/**
 * POST /api/nutrition/tip
 * Generate a nutrition tip after daily check-in
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { readinessScore } = requestSchema.parse(body)

    // Get athlete data with preferences
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: {
        user: { email: user.email },
      },
      include: {
        client: {
          include: {
            dietaryPreferences: true,
            nutritionGoal: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    const client = athleteAccount.client
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const tomorrowStart = addDays(todayStart, 1)
    const tomorrowEnd = addDays(todayEnd, 1)

    // Fetch today's and tomorrow's workouts
    const [todaysWorkoutsRaw, tomorrowsWorkoutsRaw] = await Promise.all([
      prisma.workout.findMany({
        where: {
          day: {
            date: { gte: todayStart, lte: todayEnd },
            week: {
              program: {
                clientId: client.id,
                isActive: true,
              },
            },
          },
        },
        include: { day: true },
        orderBy: { order: 'asc' },
      }),
      prisma.workout.findMany({
        where: {
          day: {
            date: { gte: tomorrowStart, lte: tomorrowEnd },
            week: {
              program: {
                clientId: client.id,
                isActive: true,
              },
            },
          },
        },
        include: { day: true },
        orderBy: { order: 'asc' },
      }),
    ])

    // Map to WorkoutContext type
    const mapToContext = (
      w: {
        id: string
        name: string
        type: WorkoutType
        intensity: WorkoutIntensity
        duration: number | null
        distance: number | null
        day: { date: Date }
      },
      isToday: boolean
    ): WorkoutContext => ({
      id: w.id,
      name: w.name,
      type: w.type,
      intensity: w.intensity,
      duration: w.duration,
      distance: w.distance,
      scheduledTime: w.day.date,
      isToday,
      isTomorrow: !isToday,
      daysUntil: isToday ? 0 : 1,
    })

    const todaysWorkouts = todaysWorkoutsRaw.map((w) => mapToContext(w, true))
    const tomorrowsWorkouts = tomorrowsWorkoutsRaw.map((w) => mapToContext(w, false))

    // Map dietary preferences to the expected input type
    const preferences = client.dietaryPreferences
      ? {
          dietaryStyle: client.dietaryPreferences.dietaryStyle as
            | 'OMNIVORE'
            | 'VEGETARIAN'
            | 'VEGAN'
            | 'PESCATARIAN'
            | 'FLEXITARIAN'
            | undefined,
          allergies: (client.dietaryPreferences.allergies as string[]) || [],
          intolerances: (client.dietaryPreferences.intolerances as string[]) || [],
          dislikedFoods: (client.dietaryPreferences.dislikedFoods as string[]) || [],
          preferLowFODMAP: client.dietaryPreferences.preferLowFODMAP,
          preferWholeGrain: client.dietaryPreferences.preferWholeGrain,
          preferSwedishFoods: client.dietaryPreferences.preferSwedishFoods,
        }
      : undefined

    // Generate tip
    const tip = generatePostCheckInTip({
      todaysWorkouts,
      tomorrowsWorkouts,
      completedCheckIn: true,
      readinessScore,
      preferences,
      goal: client.nutritionGoal
        ? {
            goalType: client.nutritionGoal.goalType as
              | 'WEIGHT_LOSS'
              | 'WEIGHT_GAIN'
              | 'MAINTAIN'
              | 'BODY_RECOMP',
            targetWeightKg: client.nutritionGoal.targetWeightKg ?? undefined,
            weeklyChangeKg: client.nutritionGoal.weeklyChangeKg ?? undefined,
            macroProfile: client.nutritionGoal.macroProfile as
              | 'BALANCED'
              | 'HIGH_PROTEIN'
              | 'LOW_CARB'
              | 'ENDURANCE'
              | 'STRENGTH'
              | undefined,
            activityLevel: client.nutritionGoal.activityLevel as
              | 'SEDENTARY'
              | 'LIGHTLY_ACTIVE'
              | 'ACTIVE'
              | 'VERY_ACTIVE'
              | 'ATHLETE'
              | undefined,
          }
        : undefined,
      weightKg: client.weight,
      currentTime: now,
    })

    logger.info('Generated nutrition tip', {
      clientId: client.id,
      tipType: tip.type,
      tipPriority: tip.priority,
      todaysWorkoutsCount: todaysWorkouts.length,
    })

    return NextResponse.json({ success: true, tip })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    logger.error('Error generating nutrition tip', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
