/**
 * Nutrition Guidance API
 *
 * GET /api/nutrition/guidance - Get comprehensive daily nutrition guidance
 *
 * Returns daily targets, workout-specific guidance, tips, and meal suggestions
 * based on the athlete's training schedule, preferences, and goals.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { startOfDay, endOfDay, addDays } from 'date-fns'
import { logger } from '@/lib/logger'
import { generateDailyGuidance } from '@/lib/nutrition-timing'
import type { WorkoutContext, GuidanceGeneratorInput } from '@/lib/nutrition-timing'
import type { WorkoutIntensity, WorkoutType } from '@prisma/client'

/**
 * GET /api/nutrition/guidance
 * Get comprehensive daily nutrition guidance for the athlete dashboard
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get athlete account with all related data
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: {
        user: { email: user.email },
      },
      include: {
        client: {
          include: {
            dietaryPreferences: true,
            nutritionGoal: true,
            sportProfile: true,
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

    // Fetch today's and tomorrow's workouts in parallel
    const [todaysWorkoutsRaw, tomorrowsWorkoutsRaw, bodyComposition] = await Promise.all([
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
      // Get latest body composition if available
      prisma.bodyComposition.findFirst({
        where: { clientId: client.id },
        orderBy: { measurementDate: 'desc' },
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

    // Build generator input
    const input: GuidanceGeneratorInput = {
      client: {
        id: client.id,
        weightKg: client.weight || 70, // Default if not set
        heightCm: client.height || 175,
      },
      preferences: client.dietaryPreferences
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
        : null,
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
        : null,
      sportProfile: client.sportProfile
        ? {
            primarySport: client.sportProfile.primarySport,
            secondarySports: client.sportProfile.secondarySports || [],
          }
        : null,
      todaysWorkouts,
      tomorrowsWorkouts,
      currentTime: now,
      bodyComposition: bodyComposition
        ? {
            bmrKcal: bodyComposition.bmrKcal ?? undefined,
            bodyFatPercent: bodyComposition.bodyFatPercent ?? undefined,
            muscleMassKg: bodyComposition.muscleMassKg ?? undefined,
          }
        : undefined,
    }

    // Generate guidance
    const guidance = generateDailyGuidance(input)

    logger.info('Generated daily nutrition guidance', {
      clientId: client.id,
      isRestDay: guidance.isRestDay,
      todaysWorkoutsCount: todaysWorkouts.length,
      tipsCount: guidance.tips.length,
    })

    return NextResponse.json({
      success: true,
      guidance,
    })
  } catch (error) {
    logger.error('Error generating nutrition guidance', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
