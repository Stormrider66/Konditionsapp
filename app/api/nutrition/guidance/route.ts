/**
 * Nutrition Guidance API
 *
 * GET /api/nutrition/guidance - Get comprehensive daily nutrition guidance
 *
 * Returns daily targets, workout-specific guidance, tips, and meal suggestions
 * based on the athlete's training schedule, preferences, and goals.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { startOfDay, endOfDay, addDays, parseISO, isValid } from 'date-fns'
import { logger } from '@/lib/logger'
import { generateDailyGuidance } from '@/lib/nutrition-timing'
import type { WorkoutContext, GuidanceGeneratorInput } from '@/lib/nutrition-timing'
import type { WorkoutIntensity, WorkoutType } from '@prisma/client'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import { getCompletedWorkoutContextsForDay } from '@/lib/nutrition-timing/completed-workouts'
import { extractGarminDailyEnergy } from '@/lib/nutrition-timing/daily-targets-range'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { resolveNutritionBodyMetrics } from '@/lib/nutrition/performance-plan/logic'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/nutrition/guidance
 * Get comprehensive daily nutrition guidance for the athlete dashboard.
 * Accepts an optional `?date=YYYY-MM-DD` to anchor the guidance on a past
 * day (falls back to the current day when absent).
 */
export async function GET(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    const { clientId } = resolved
    locale = resolveRequestLocale(request, resolved.user.language)

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const anchor = dateParam ? parseISO(dateParam) : new Date()
    if (dateParam && !isValid(anchor)) {
      return NextResponse.json({ error: t(locale, 'Invalid date', 'Ogiltigt datum') }, { status: 400 })
    }

    // Get client with all related data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteAccount: {
          select: {
            userId: true,
            user: { select: { language: true } },
          },
        },
        dietaryPreferences: true,
        nutritionGoal: true,
        sportProfile: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: t(locale, 'Client not found', 'Klienten hittades inte') }, { status: 404 })
    }

    if (!client.athleteAccount?.userId) {
      return NextResponse.json({ error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') }, { status: 404 })
    }

    // `now` drives time-of-day logic in the generator (e.g. pre-workout
    // countdown). For historical dates we pin it to noon of the selected
    // day so meal cards don't read as "due in 8 hours" on Saturday night.
    const now = dateParam ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12, 0, 0) : new Date()
    const todayStart = startOfDay(anchor)
    const todayEnd = endOfDay(anchor)
    const tomorrowStart = addDays(todayStart, 1)
    const tomorrowEnd = addDays(todayEnd, 1)

    // Fetch today's and tomorrow's workouts in parallel (including AI WODs)
    const [todaysWorkoutsRaw, tomorrowsWorkoutsRaw, bodyComposition, todaysAiWods, todaysAdHocWorkouts, todaysCompletedWorkouts, dailyMetrics] = await Promise.all([
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
        include: {
          day: true,
          // Include logs to check completion status
          logs: {
            where: { athleteId: client.athleteAccount.userId },
            select: { completed: true, completedAt: true },
            take: 1,
          },
        },
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
      // Get today's AI-generated WODs (completed or in progress)
      prisma.aIGeneratedWOD.findMany({
        where: {
          clientId: client.id,
          OR: [
            { completedAt: { gte: todayStart, lte: todayEnd } },
            { startedAt: { gte: todayStart, lte: todayEnd } },
            {
              createdAt: { gte: todayStart, lte: todayEnd },
              status: { in: ['GENERATED', 'STARTED', 'COMPLETED'] }
            },
          ],
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.adHocWorkout.findMany({
        where: {
          athleteId: client.id,
          status: 'CONFIRMED',
          workoutDate: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { workoutDate: 'desc' },
        select: {
          id: true,
          workoutDate: true,
          workoutName: true,
          parsedType: true,
          parsedStructure: true,
        },
      }),
      getCompletedWorkoutContextsForDay({
        clientId: client.id,
        athleteUserId: client.athleteAccount.userId,
        dayStart: todayStart,
        dayEnd: todayEnd,
      }),
      prisma.dailyMetrics.findFirst({
        where: {
          clientId: client.id,
          date: { gte: todayStart, lte: todayEnd },
        },
        select: { factorScores: true },
      }),
    ])
    const garminEnergy = extractGarminDailyEnergy(dailyMetrics?.factorScores)

    // Races within the next 7 days drive race-week messaging and the
    // pre-race carb-load trigger in the generator.
    const upcomingRaces = await prisma.race.findMany({
      where: {
        clientId: client.id,
        date: { gte: todayStart, lte: addDays(todayEnd, 7) },
      },
      select: { date: true, name: true, distance: true, classification: true },
      orderBy: { date: 'asc' },
    })

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
        logs?: Array<{ completed: boolean; completedAt: Date | null }>
      },
      isToday: boolean
    ): WorkoutContext => {
      const log = w.logs?.[0]
      const status = log?.completed ? 'COMPLETED' : 'PLANNED'

      return {
        id: w.id,
        name: w.name,
        type: w.type,
        intensity: w.intensity,
        duration: w.duration,
        distance: w.distance,
        scheduledTime: log?.completedAt ?? undefined,
        source: 'PROGRAM',
        status,
        isToday,
        isTomorrow: !isToday,
        daysUntil: isToday ? 0 : 1,
      }
    }

    const mapAdHocTypeToWorkoutType = (parsed: ParsedWorkout | null): WorkoutType => {
      if (!parsed) return 'OTHER'
      if (parsed.type === 'STRENGTH') return 'STRENGTH'
      if (parsed.type === 'CARDIO') {
        switch (parsed.sport) {
          case 'RUNNING':
            return 'RUNNING'
          case 'CYCLING':
            return 'CYCLING'
          case 'SKIING':
            return 'SKIING'
          case 'SWIMMING':
            return 'SWIMMING'
          case 'TRIATHLON':
            return 'TRIATHLON'
          case 'HYROX':
            return 'HYROX'
          default:
            return 'OTHER'
        }
      }

      return parsed.sport === 'HYROX' ? 'HYROX' : 'OTHER'
    }

    const todaysWorkouts = todaysWorkoutsRaw.map((w) => mapToContext(w, true))
    const tomorrowsWorkouts = tomorrowsWorkoutsRaw.map((w) => mapToContext(w, false))

    // Map AI WODs to WorkoutContext and add to today's workouts (exclude completed ones)
    const incompleteAiWods = todaysAiWods.filter((wod) => wod.status !== 'COMPLETED')
    const aiWodContexts: WorkoutContext[] = incompleteAiWods.map((wod) => ({
      id: wod.id,
      name: `${t(locale, 'AI workout', 'AI-pass')}: ${wod.title}`,
      type: (wod.primarySport as WorkoutType) || 'STRENGTH',
      intensity: wod.intensityAdjusted === 'RECOVERY' ? 'RECOVERY' :
                 wod.intensityAdjusted === 'EASY' ? 'EASY' :
                 wod.intensityAdjusted === 'HARD' ? 'THRESHOLD' :
                 'MODERATE' as WorkoutIntensity,
      duration: wod.actualDuration || wod.requestedDuration,
      distance: null,
      scheduledTime: wod.completedAt || wod.startedAt || wod.createdAt,
      source: 'AI_WOD',
      status: wod.status === 'COMPLETED' ? 'COMPLETED' : wod.status === 'STARTED' ? 'IN_PROGRESS' : 'PLANNED',
      isToday: true,
      isTomorrow: false,
      daysUntil: 0,
    }))

    const adHocContexts: WorkoutContext[] = todaysAdHocWorkouts.map((workout) => {
      const parsed = workout.parsedStructure as ParsedWorkout | null

      return {
        id: workout.id,
        name: workout.workoutName || parsed?.name || t(locale, 'Logged workout', 'Loggat pass'),
        type: mapAdHocTypeToWorkoutType(parsed),
        intensity: parsed?.intensity || 'MODERATE',
        duration: parsed?.duration ?? null,
        distance: getParsedWorkoutDistanceKm(parsed),
        scheduledTime: workout.workoutDate,
        source: 'AD_HOC',
        status: 'COMPLETED',
        estimatedCaloriesKcal: parsed?.estimatedCalories ?? null,
        isToday: true,
        isTomorrow: false,
        daysUntil: 0,
      }
    })

    // Merge AI WODs with program workouts
    const allTodaysWorkouts = [...todaysWorkouts, ...aiWodContexts, ...adHocContexts, ...todaysCompletedWorkouts]

    const bodyMetrics = resolveNutritionBodyMetrics({
      profileWeightKg: client.weight,
      latestBia: bodyComposition,
    })

    // Build generator input
    const input: GuidanceGeneratorInput = {
      client: {
        id: client.id,
        weightKg: bodyMetrics.weightKg,
        heightCm: client.height || 175,
        gender: client.gender,
        birthDate: client.birthDate,
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
              | 'KETO'
              | 'CUSTOM'
              | undefined,
            activityLevel: client.nutritionGoal.activityLevel as
              | 'SEDENTARY'
              | 'LIGHTLY_ACTIVE'
              | 'ACTIVE'
              | 'VERY_ACTIVE'
              | 'ATHLETE'
              | undefined,
            customProteinPerKg: client.nutritionGoal.customProteinPerKg ?? undefined,
            customProteinPercent: client.nutritionGoal.customProteinPercent ?? undefined,
            customCarbsPercent: client.nutritionGoal.customCarbsPercent ?? undefined,
            customFatPercent: client.nutritionGoal.customFatPercent ?? undefined,
          }
        : null,
      sportProfile: client.sportProfile
        ? {
            primarySport: client.sportProfile.primarySport,
            secondarySports: client.sportProfile.secondarySports || [],
            lifestyleActivity: client.sportProfile.lifestyleActivity,
          }
        : null,
      todaysWorkouts: allTodaysWorkouts,
      tomorrowsWorkouts,
      currentTime: now,
      locale,
      bodyComposition: bodyComposition || client.nutritionGoal?.customBmrKcal
        ? {
            bmrKcal: client.nutritionGoal?.customBmrKcal ?? bodyMetrics.bmrKcal ?? undefined,
            bodyFatPercent: bodyComposition?.bodyFatPercent ?? undefined,
            muscleMassKg: bodyComposition?.muscleMassKg ?? undefined,
          }
        : undefined,
      measuredEnergy: garminEnergy
        ? {
            source: 'GARMIN',
            totalCaloriesKcal: garminEnergy.totalCaloriesKcal,
            allowReduction: todayStart.getTime() < startOfDay(new Date()).getTime(),
          }
        : null,
      upcomingRaces,
    }

    // Generate guidance
    const guidance = generateDailyGuidance(input)

    logger.info('Generated daily nutrition guidance', {
      clientId: client.id,
      isRestDay: guidance.isRestDay,
      todaysWorkoutsCount: allTodaysWorkouts.length,
      completedTodaysWorkoutsCount: allTodaysWorkouts.filter((workout) => workout.status === 'COMPLETED').length,
      programWorkouts: todaysWorkouts.length,
      aiWods: aiWodContexts.length,
      adHocWorkouts: adHocContexts.length,
      tipsCount: guidance.tips.length,
    })

    return NextResponse.json({
      success: true,
      guidance,
    })
  } catch (error) {
    logger.error('Error generating nutrition guidance', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
