/**
 * Per-day nutrition targets for a set of calendar days.
 *
 * Canonical target computation for any surface that needs "what should this
 * athlete eat on day X" — the daily-targets API route, nutrition stats
 * (goal adherence), and dashboard cards all go through here so targets can
 * never diverge between surfaces. Takes each day's workouts into account
 * (planned + completed for today/future, completed only for past days).
 */

import 'server-only'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, format, parseISO, isValid } from 'date-fns'
import { calculateDailyTargets } from './generators/guidance-generator'
import { getCompletedWorkoutContextsForRange } from './completed-workouts'
import type { NutritionGoalInput, WorkoutContext } from './types'
import type { WorkoutIntensity, WorkoutType } from '@prisma/client'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import { logger } from '@/lib/logger'
import type { AppLocale } from '@/lib/i18n/request-locale'

export interface DailyTargetsForDay {
  /** Calendar day key, 'yyyy-MM-dd'. */
  date: string
  targets: ReturnType<typeof calculateDailyTargets>
}

export interface DailyTargetsRangeInput {
  clientId: string
  /** Calendar days ('yyyy-MM-dd') to compute targets for. Need not be contiguous. */
  dayKeys: string[]
  locale?: AppLocale
}

/** Local-time day key. Round-trips parseISO('yyyy-MM-dd') in any server timezone. */
export function targetDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
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

/**
 * Computes daily macro targets for each requested day.
 *
 * Returns null when the client has no athlete account (caller decides how to
 * surface that). Invalid day keys are skipped.
 */
export async function getDailyTargetsForDays({
  clientId,
  dayKeys,
  locale = 'sv',
}: DailyTargetsRangeInput): Promise<DailyTargetsForDay[] | null> {
  const days = [...new Set(dayKeys)]
    .map((key) => parseISO(key))
    .filter((d) => isValid(d))
    .sort((a, b) => a.getTime() - b.getTime())
  if (days.length === 0) return []

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      athleteAccount: { select: { userId: true } },
      nutritionGoal: true,
      sportProfile: { select: { lifestyleActivity: true, primarySport: true } },
    },
  })
  if (!client?.athleteAccount?.userId) return null

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
  const requestedKeys = new Set(days.map((d) => targetDayKey(d)))

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

  // Bucket planned workouts into per-day maps (only consumed for today/future).
  const plannedByDay: Record<string, WorkoutContext[]> = {}

  for (const w of programWorkoutsRaw) {
    const key = targetDayKey(w.day.date)
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
    const key = targetDayKey(anchor)
    if (!plannedByDay[key]) plannedByDay[key] = []
    plannedByDay[key].push({
      id: wod.id,
      name: `${locale === 'sv' ? 'AI-pass' : 'AI workout'}: ${wod.title}`,
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
    const key = targetDayKey(workout.workoutDate)
    if (!plannedByDay[key]) plannedByDay[key] = []
    plannedByDay[key].push({
      id: workout.id,
      name: workout.workoutName || parsed?.name || (locale === 'sv' ? 'Loggat pass' : 'Logged workout'),
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

  // Completed workouts (WorkoutLog + Strava + Garmin), one fetch for the
  // whole range. A failure here degrades to rest-day targets rather than
  // failing the whole request.
  let completedMap: Record<string, WorkoutContext[]> = {}
  try {
    completedMap = await getCompletedWorkoutContextsForRange({
      clientId: client.id,
      athleteUserId,
      rangeStart,
      rangeEnd,
      dayKeyOf: targetDayKey,
    })
  } catch (err) {
    logger.warn('daily-targets-range: completed lookup failed', {
      clientId: client.id,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return days
    .filter((day) => requestedKeys.has(targetDayKey(day)))
    .map((day) => {
      const key = targetDayKey(day)
      const dayStart = startOfDay(day)
      const isTodayOrFuture = dayStart.getTime() >= todayStart.getTime()

      const workoutsForDay: WorkoutContext[] = []
      if (isTodayOrFuture) {
        workoutsForDay.push(...(plannedByDay[key] || []))
      }
      workoutsForDay.push(...(completedMap[key] || []))

      const targets = calculateDailyTargets(
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
      return { date: key, targets }
    })
}
