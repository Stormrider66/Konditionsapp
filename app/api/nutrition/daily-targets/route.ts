/**
 * Per-Day Nutrition Targets
 *
 * GET /api/nutrition/daily-targets?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns the athlete's daily macro targets for each day in the range, taking
 * that day's workouts (planned + completed for today/future, completed only
 * for past days) into account. Used by the nutrition trend chart to draw a
 * per-day target line instead of a flat week-average line.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { startOfDay, endOfDay, eachDayOfInterval, isValid, parseISO } from 'date-fns'
import { calculateDailyTargets } from '@/lib/nutrition-timing'
import { getCompletedWorkoutContextsForDay } from '@/lib/nutrition-timing/completed-workouts'
import type { NutritionGoalInput, WorkoutContext } from '@/lib/nutrition-timing'
import type { WorkoutIntensity, WorkoutType } from '@prisma/client'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

const MAX_RANGE_DAYS = 31

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function mapAdHocTypeToWorkoutType(parsed: ParsedWorkout | null): WorkoutType {
  if (!parsed) return 'OTHER'
  if (parsed.type === 'STRENGTH') return 'STRENGTH'
  if (parsed.type === 'CARDIO') {
    switch (parsed.sport) {
      case 'RUNNING': return 'RUNNING'
      case 'CYCLING': return 'CYCLING'
      case 'SKIING': return 'SKIING'
      case 'SWIMMING': return 'SWIMMING'
      case 'TRIATHLON': return 'TRIATHLON'
      case 'HYROX': return 'HYROX'
      default: return 'OTHER'
    }
  }
  return parsed.sport === 'HYROX' ? 'HYROX' : 'OTHER'
}

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
    const startParam = searchParams.get('startDate')
    const endParam = searchParams.get('endDate')
    if (!startParam || !endParam) {
      return NextResponse.json({ error: t(locale, 'startDate and endDate required', 'startDate och endDate krävs') }, { status: 400 })
    }
    const start = parseISO(startParam)
    const end = parseISO(endParam)
    if (!isValid(start) || !isValid(end) || end < start) {
      return NextResponse.json({ error: t(locale, 'Invalid date range', 'Ogiltigt datumintervall') }, { status: 400 })
    }

    const days = eachDayOfInterval({ start, end })
    if (days.length > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: t(locale, `Range capped at ${MAX_RANGE_DAYS} days`, `Intervallet är begränsat till ${MAX_RANGE_DAYS} dagar`) }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        athleteAccount: {
          select: {
            userId: true,
            user: { select: { language: true } },
          },
        },
        nutritionGoal: true,
        sportProfile: { select: { lifestyleActivity: true, primarySport: true } },
      },
    })
    if (!client?.athleteAccount?.userId) {
      return NextResponse.json({ error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') }, { status: 404 })
    }

    const athleteUserId = client.athleteAccount.userId
    const weightKg = client.weight ?? 70
    const nutritionGoal: Pick<
      NutritionGoalInput,
      | 'goalType'
      | 'macroProfile'
      | 'activityLevel'
      | 'customProteinPerKg'
      | 'customProteinPercent'
      | 'customCarbsPercent'
      | 'customFatPercent'
    > | undefined = client.nutritionGoal
      ? {
          goalType: client.nutritionGoal.goalType as NutritionGoalInput['goalType'],
          macroProfile: client.nutritionGoal.macroProfile as NutritionGoalInput['macroProfile'],
          activityLevel: client.nutritionGoal.activityLevel as NutritionGoalInput['activityLevel'],
          customProteinPerKg: client.nutritionGoal.customProteinPerKg ?? undefined,
          customProteinPercent: client.nutritionGoal.customProteinPercent ?? undefined,
          customCarbsPercent: client.nutritionGoal.customCarbsPercent ?? undefined,
          customFatPercent: client.nutritionGoal.customFatPercent ?? undefined,
        }
      : undefined

    const bodyComposition = await prisma.bodyComposition.findFirst({
      where: { clientId: client.id },
      orderBy: { measurementDate: 'desc' },
      select: { bmrKcal: true },
    })
    const bmrKcal = client.nutritionGoal?.customBmrKcal ?? bodyComposition?.bmrKcal ?? undefined

    const rangeStart = startOfDay(days[0])
    const rangeEnd = endOfDay(days[days.length - 1])
    const todayStart = startOfDay(new Date())

    // Range-scoped fetches (one query each, bucketed by date in JS).
    const [programWorkoutsRaw, aiWods, adHocWorkouts] = await Promise.all([
      prisma.workout.findMany({
        where: {
          day: {
            date: { gte: rangeStart, lte: rangeEnd },
            week: { program: { clientId: client.id, isActive: true } },
          },
        },
        include: {
          day: { select: { date: true } },
          logs: {
            where: { athleteId: athleteUserId },
            select: { completed: true },
            take: 1,
          },
        },
      }),
      prisma.aIGeneratedWOD.findMany({
        where: {
          clientId: client.id,
          OR: [
            { completedAt: { gte: rangeStart, lte: rangeEnd } },
            { startedAt: { gte: rangeStart, lte: rangeEnd } },
            { createdAt: { gte: rangeStart, lte: rangeEnd }, status: { in: ['GENERATED', 'STARTED', 'COMPLETED'] } },
          ],
        },
      }),
      prisma.adHocWorkout.findMany({
        where: {
          athleteId: client.id,
          status: 'CONFIRMED',
          workoutDate: { gte: rangeStart, lte: rangeEnd },
        },
        select: {
          id: true,
          workoutDate: true,
          workoutName: true,
          parsedType: true,
          parsedStructure: true,
        },
      }),
    ])

    const keyOf = (d: Date) => startOfDay(d).toISOString().slice(0, 10)

    // Bucket planned workouts into per-day maps (only for today/future).
    const plannedByDay: Record<string, WorkoutContext[]> = {}

    for (const w of programWorkoutsRaw) {
      const key = keyOf(w.day.date)
      const completed = w.logs?.[0]?.completed ?? false
      if (!plannedByDay[key]) plannedByDay[key] = []
      plannedByDay[key].push({
        id: w.id,
        name: w.name,
        type: w.type,
        intensity: w.intensity,
        duration: w.duration,
        distance: w.distance,
        source: 'PROGRAM',
        status: completed ? 'COMPLETED' : 'PLANNED',
        isToday: false,
        isTomorrow: false,
        daysUntil: 0,
      })
    }

    for (const wod of aiWods) {
      if (wod.status === 'COMPLETED') continue
      const anchor = wod.startedAt ?? wod.createdAt
      const key = keyOf(anchor)
      if (!plannedByDay[key]) plannedByDay[key] = []
      plannedByDay[key].push({
        id: wod.id,
        name: `${t(locale, 'AI workout', 'AI-pass')}: ${wod.title}`,
        type: (wod.primarySport as WorkoutType) || 'STRENGTH',
        intensity:
          wod.intensityAdjusted === 'RECOVERY' ? 'RECOVERY' :
          wod.intensityAdjusted === 'EASY' ? 'EASY' :
          wod.intensityAdjusted === 'HARD' ? 'THRESHOLD' :
          'MODERATE' as WorkoutIntensity,
        duration: wod.actualDuration || wod.requestedDuration,
        distance: null,
        source: 'AI_WOD',
        status: wod.status === 'STARTED' ? 'IN_PROGRESS' : 'PLANNED',
        isToday: false,
        isTomorrow: false,
        daysUntil: 0,
      })
    }

    for (const workout of adHocWorkouts) {
      const parsed = workout.parsedStructure as ParsedWorkout | null
      const key = keyOf(workout.workoutDate)
      if (!plannedByDay[key]) plannedByDay[key] = []
      plannedByDay[key].push({
        id: workout.id,
        name: workout.workoutName || parsed?.name || t(locale, 'Logged workout', 'Loggat pass'),
        type: mapAdHocTypeToWorkoutType(parsed),
        intensity: parsed?.intensity || 'MODERATE',
        duration: parsed?.duration ?? null,
        distance: getParsedWorkoutDistanceKm(parsed),
        source: 'AD_HOC',
        status: 'COMPLETED',
        estimatedCaloriesKcal: parsed?.estimatedCalories ?? null,
        isToday: false,
        isTomorrow: false,
        daysUntil: 0,
      })
    }

    // Completed workouts (WorkoutLog + Strava + Garmin) — per-day dedup.
    // Wrap each day so a single bad day doesn't 500 the whole range.
    const completedByDay = await Promise.all(
      days.map(async (day) => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        try {
          const contexts = await getCompletedWorkoutContextsForDay({
            clientId: client.id,
            athleteUserId,
            dayStart,
            dayEnd,
          })
          return { key: keyOf(dayStart), contexts }
        } catch (err) {
          logger.warn('daily-targets: completed lookup failed for day', {
            clientId: client.id,
            day: dayStart.toISOString(),
            error: err instanceof Error ? err.message : String(err),
          })
          return { key: keyOf(dayStart), contexts: [] as WorkoutContext[] }
        }
      })
    )
    const completedMap: Record<string, WorkoutContext[]> = {}
    for (const { key, contexts } of completedByDay) {
      completedMap[key] = contexts
    }

    const targets = days.map((day) => {
      const key = keyOf(day)
      const dayStart = startOfDay(day)
      const isTodayOrFuture = dayStart.getTime() >= todayStart.getTime()

      const workoutsForDay: WorkoutContext[] = []
      if (isTodayOrFuture) {
        workoutsForDay.push(...(plannedByDay[key] || []))
      }
      workoutsForDay.push(...(completedMap[key] || []))

      const daily = calculateDailyTargets(
        weightKg,
        workoutsForDay,
        nutritionGoal,
        bmrKcal,
        client.sportProfile?.lifestyleActivity,
        {
          birthDate: client.birthDate,
          gender: client.gender,
          primarySport: client.sportProfile?.primarySport,
          currentDate: dayStart,
        }
      )
      return {
        date: key,
        caloriesKcal: daily.caloriesKcal,
        proteinG: daily.proteinG,
        carbsG: daily.carbsG,
        fatG: daily.fatG,
        proteinGPerKg: daily.proteinGPerKg,
        carbsGPerKg: daily.carbsGPerKg,
        carbLoadCategory: daily.carbLoadCategory,
        highCarbReason: daily.highCarbReason,
        macroWarnings: daily.macroWarnings,
        baselineKcal: daily.baselineKcal,
        workoutAdjustmentKcal: daily.workoutAdjustmentKcal,
        workoutEnergyKcal: daily.workoutEnergyKcal,
        fuelingAdjustmentKcal: daily.fuelingAdjustmentKcal,
      }
    })

    return NextResponse.json({ targets })
  } catch (error) {
    logger.error('daily-targets route failed', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
