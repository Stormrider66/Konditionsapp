import 'server-only'

import { addDays, eachDayOfInterval, endOfDay, format, startOfDay } from 'date-fns'
import type { MealType, NutritionGoal, Prisma, WorkoutIntensity, WorkoutType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { calculateDailyTargets } from '@/lib/nutrition-timing'
import type { NutritionGoalInput, WorkoutContext } from '@/lib/nutrition-timing'
import { getCompletedWorkoutContextsForRange } from '@/lib/nutrition-timing/completed-workouts'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { createModelInstance } from '@/lib/ai/create-model'
import { withAiContext } from '@/lib/ai/usage-logger'
import { generateText } from 'ai'
import { z } from 'zod'
import {
  classifyPerformanceDay,
  estimateWeeklyWeightChangeKg,
  goalTypeForPerformanceDay,
  resolveNutritionBodyMetrics,
  scorePlannedMealMatch,
} from './logic'
import { buildPlannedMealsForDay } from './templates'
import type {
  DayPlanningContext,
  PerformancePlanDraft,
  PlanDayDraft,
  PlannedMealDraft,
} from './types'

type AppLocale = 'en' | 'sv'
type NutritionGoalForPlanning = Pick<
  NutritionGoal,
  | 'targetWeightKg'
  | 'weeklyChangeKg'
  | 'macroProfile'
  | 'activityLevel'
  | 'customProteinPerKg'
  | 'customBmrKcal'
  | 'customProteinPercent'
  | 'customCarbsPercent'
  | 'customFatPercent'
>

interface GeneratePerformanceMealGuideInput {
  clientId: string
  userId?: string
  locale?: AppLocale
  startDate?: Date
  useAi?: boolean
}

const AI_MEAL_RESPONSE_SCHEMA = z.object({
  days: z.array(z.object({
    date: z.string(),
    meals: z.array(z.object({
      sortOrder: z.number().int(),
      title: z.string().min(1).max(120).optional(),
      description: z.string().max(240).optional(),
      explanation: z.string().max(320).optional(),
      portionSummary: z.object({
        items: z.array(z.object({
          name: z.string().min(1).max(100),
          amount: z.string().min(1).max(80),
          note: z.string().max(160).optional(),
        })).min(1).max(6),
        note: z.string().max(240).optional(),
      }).optional(),
      options: z.array(z.object({
        sortOrder: z.number().int(),
        title: z.string().min(1).max(120),
        description: z.string().max(240).optional(),
        portionSummary: z.object({
          items: z.array(z.object({
            name: z.string().min(1).max(100),
            amount: z.string().min(1).max(80),
            note: z.string().max(160).optional(),
          })).min(1).max(6),
          note: z.string().max(240).optional(),
        }),
      })).max(3).optional(),
    })),
  })),
})

function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function utcDateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function toOptionalJson(value: unknown | null | undefined): Prisma.InputJsonValue | undefined {
  return value == null ? undefined : toJson(value)
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

function mapGarminIntensity(intensity: string | null | undefined): WorkoutIntensity | undefined {
  if (!intensity) return undefined
  if (intensity === 'HARD') return 'THRESHOLD'
  if (
    intensity === 'RECOVERY' ||
    intensity === 'EASY' ||
    intensity === 'MODERATE' ||
    intensity === 'THRESHOLD' ||
    intensity === 'INTERVAL' ||
    intensity === 'MAX'
  ) {
    return intensity
  }
  return undefined
}

function eventDurationMinutes(start: Date, end?: Date | null): number | null {
  if (!end) return null
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
}

async function getPlanningContexts(input: {
  clientId: string
  athleteUserId: string
  rangeStart: Date
  rangeEnd: Date
  locale: AppLocale
}): Promise<Record<string, DayPlanningContext>> {
  const days = eachDayOfInterval({ start: input.rangeStart, end: input.rangeEnd })
  const contexts: Record<string, DayPlanningContext> = Object.fromEntries(
    days.map((date) => [
      dayKey(date),
      {
        dateKey: dayKey(date),
        date,
        workouts: [],
        scheduleSignals: [],
      } satisfies DayPlanningContext,
    ])
  )

  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { teamId: true },
  })

  const [
    programWorkouts,
    aiWods,
    adHocWorkouts,
    completedMap,
    teamEvents,
    matches,
    calendarEvents,
    garminActivities,
  ] = await Promise.all([
    prisma.workout.findMany({
      where: {
        day: {
          date: { gte: input.rangeStart, lte: input.rangeEnd },
          week: { program: { clientId: input.clientId, isActive: true } },
        },
      },
      include: {
        day: { select: { date: true } },
        logs: {
          where: { athleteId: input.athleteUserId },
          select: { completed: true, completedAt: true },
          take: 1,
        },
      },
      orderBy: { order: 'asc' },
    }),
    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId: input.clientId,
        OR: [
          { completedAt: { gte: input.rangeStart, lte: input.rangeEnd } },
          { startedAt: { gte: input.rangeStart, lte: input.rangeEnd } },
          { createdAt: { gte: input.rangeStart, lte: input.rangeEnd }, status: { in: ['GENERATED', 'STARTED', 'COMPLETED'] } },
        ],
      },
    }),
    prisma.adHocWorkout.findMany({
      where: {
        athleteId: input.clientId,
        status: 'CONFIRMED',
        workoutDate: { gte: input.rangeStart, lte: input.rangeEnd },
      },
      select: {
        id: true,
        workoutDate: true,
        workoutName: true,
        parsedType: true,
        parsedStructure: true,
      },
    }),
    getCompletedWorkoutContextsForRange({
      clientId: input.clientId,
      athleteUserId: input.athleteUserId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      dayKeyOf: dayKey,
    }).catch((error) => {
      logger.warn('performance meal guide completed workout lookup failed', { clientId: input.clientId }, error)
      return {} as Record<string, WorkoutContext[]>
    }),
    client?.teamId
      ? prisma.teamEvent.findMany({
          where: {
            teamId: client.teamId,
            startDate: { gte: input.rangeStart, lte: input.rangeEnd },
          },
          orderBy: { startDate: 'asc' },
        })
      : Promise.resolve([]),
    prisma.externalMatchSchedule.findMany({
      where: {
        clientId: input.clientId,
        scheduledDate: { gte: input.rangeStart, lte: input.rangeEnd },
      },
      orderBy: { scheduledDate: 'asc' },
    }),
    prisma.calendarEvent.findMany({
      where: {
        clientId: input.clientId,
        type: 'TRAVEL',
        startDate: { lte: input.rangeEnd },
        endDate: { gte: input.rangeStart },
      },
      orderBy: { startDate: 'asc' },
    }),
    prisma.garminActivity.findMany({
      where: {
        clientId: input.clientId,
        startDate: { gte: input.rangeStart, lte: input.rangeEnd },
      },
      select: {
        startDate: true,
        calories: true,
        tss: true,
        mappedIntensity: true,
      },
    }),
  ])

  for (const workout of programWorkouts) {
    const key = dayKey(workout.day.date)
    const ctx = contexts[key]
    if (!ctx) continue
    const log = workout.logs?.[0]
    const context: WorkoutContext = {
      id: workout.id,
      name: workout.name,
      type: workout.type,
      intensity: workout.intensity,
      duration: workout.duration,
      distance: workout.distance,
      scheduledTime: log?.completedAt ?? undefined,
      source: 'PROGRAM',
      status: log?.completed ? 'COMPLETED' : 'PLANNED',
      isToday: false,
      isTomorrow: false,
      daysUntil: 0,
    }
    ctx.workouts.push(context)
    ctx.scheduleSignals.push({
      id: workout.id,
      source: 'WORKOUT',
      type: workout.type,
      title: workout.name,
      startDate: workout.day.date.toISOString(),
      durationMinutes: workout.duration,
      intensity: workout.intensity,
    })
  }

  for (const wod of aiWods) {
    const anchor = wod.completedAt ?? wod.startedAt ?? wod.createdAt
    const key = dayKey(anchor)
    const ctx = contexts[key]
    if (!ctx) continue
    const intensity =
      wod.intensityAdjusted === 'RECOVERY' ? 'RECOVERY' :
      wod.intensityAdjusted === 'EASY' ? 'EASY' :
      wod.intensityAdjusted === 'HARD' ? 'THRESHOLD' :
      'MODERATE' as WorkoutIntensity
    const workout: WorkoutContext = {
      id: wod.id,
      name: `${input.locale === 'sv' ? 'AI-pass' : 'AI workout'}: ${wod.title}`,
      type: (wod.primarySport as WorkoutType) || 'STRENGTH',
      intensity,
      duration: wod.actualDuration || wod.requestedDuration,
      distance: null,
      scheduledTime: anchor,
      source: 'AI_WOD',
      status: wod.status === 'COMPLETED' ? 'COMPLETED' : wod.status === 'STARTED' ? 'IN_PROGRESS' : 'PLANNED',
      isToday: false,
      isTomorrow: false,
      daysUntil: 0,
    }
    ctx.workouts.push(workout)
    ctx.scheduleSignals.push({
      id: wod.id,
      source: 'WORKOUT',
      type: workout.type,
      title: workout.name,
      startDate: anchor.toISOString(),
      durationMinutes: workout.duration,
      intensity,
    })
  }

  for (const workout of adHocWorkouts) {
    const parsed = workout.parsedStructure as ParsedWorkout | null
    const key = dayKey(workout.workoutDate)
    const ctx = contexts[key]
    if (!ctx) continue
    const workoutType = mapAdHocTypeToWorkoutType(parsed)
    const intensity = parsed?.intensity || 'MODERATE'
    ctx.workouts.push({
      id: workout.id,
      name: workout.workoutName || parsed?.name || (input.locale === 'sv' ? 'Loggat pass' : 'Logged workout'),
      type: workoutType,
      intensity,
      duration: parsed?.duration ?? null,
      distance: getParsedWorkoutDistanceKm(parsed),
      scheduledTime: workout.workoutDate,
      source: 'AD_HOC',
      status: 'COMPLETED',
      estimatedCaloriesKcal: parsed?.estimatedCalories ?? null,
      isToday: false,
      isTomorrow: false,
      daysUntil: 0,
    })
    ctx.scheduleSignals.push({
      id: workout.id,
      source: 'WORKOUT',
      type: workoutType,
      title: workout.workoutName || parsed?.name || 'Logged workout',
      startDate: workout.workoutDate.toISOString(),
      durationMinutes: parsed?.duration ?? null,
      intensity,
    })
  }

  for (const [key, completed] of Object.entries(completedMap)) {
    const ctx = contexts[key]
    if (!ctx) continue
    const existingIds = new Set(ctx.workouts.map((workout) => workout.id))
    for (const workout of completed) {
      if (!existingIds.has(workout.id)) ctx.workouts.push(workout)
    }
  }

  for (const event of teamEvents) {
    const key = dayKey(event.startDate)
    const ctx = contexts[key]
    if (!ctx) continue
    const durationMinutes = eventDurationMinutes(event.startDate, event.endDate)
    ctx.scheduleSignals.push({
      id: event.id,
      source: 'TEAM_EVENT',
      type: event.type,
      title: event.title,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString() ?? null,
      durationMinutes,
      intensity: event.type === 'GAME' ? 'MAX' : durationMinutes && durationMinutes >= 75 ? 'THRESHOLD' : null,
    })
  }

  for (const match of matches) {
    const key = dayKey(match.scheduledDate)
    const ctx = contexts[key]
    if (!ctx) continue
    ctx.scheduleSignals.push({
      id: match.id,
      source: 'MATCH',
      type: 'GAME',
      title: match.opponent ? `${match.isHome ? 'Home' : 'Away'} vs ${match.opponent}` : 'Game',
      startDate: match.scheduledDate.toISOString(),
      durationMinutes: match.minutesPlayed ?? null,
      intensity: 'MAX',
    })
  }

  for (const event of calendarEvents) {
    for (const date of days) {
      if (date >= startOfDay(event.startDate) && date <= endOfDay(event.endDate)) {
        const key = dayKey(date)
        contexts[key]?.scheduleSignals.push({
          id: event.id,
          source: 'CALENDAR',
          type: event.type,
          title: event.title,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
        })
      }
    }
  }

  for (const activity of garminActivities) {
    const key = dayKey(activity.startDate)
    const ctx = contexts[key]
    if (!ctx) continue
    const current = ctx.garminSnapshot ?? { activityCount: 0, calories: 0, tss: 0, maxIntensity: null }
    const intensity = mapGarminIntensity(activity.mappedIntensity)
    ctx.garminSnapshot = {
      activityCount: current.activityCount + 1,
      calories: current.calories + Math.round(activity.calories ?? 0),
      tss: current.tss + Math.round(activity.tss ?? 0),
      maxIntensity: intensity ?? current.maxIntensity,
    }
  }

  return contexts
}

function buildNutritionGoal(input: {
  goal: NutritionGoalForPlanning | null | undefined
  dayGoalType: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP'
}): NutritionGoalInput {
  return {
    goalType: input.dayGoalType,
    targetWeightKg: input.goal?.targetWeightKg ?? 83,
    weeklyChangeKg: input.goal?.weeklyChangeKg ?? 0.25,
    macroProfile: (input.goal?.macroProfile ?? 'BALANCED') as NutritionGoalInput['macroProfile'],
    activityLevel: (input.goal?.activityLevel ?? 'ATHLETE') as NutritionGoalInput['activityLevel'],
    customProteinPerKg: input.goal?.customProteinPerKg ?? undefined,
    customProteinPercent: input.goal?.customProteinPercent ?? undefined,
    customCarbsPercent: input.goal?.customCarbsPercent ?? undefined,
    customFatPercent: input.goal?.customFatPercent ?? undefined,
  }
}

function buildAdaptationNotes(input: {
  dayType: string
  fastWeightLossRisk: boolean
  lowRecoveryRisk: boolean
  weeklyWeightChangeKg: number | null
  locale: AppLocale
}): string | undefined {
  const sv = input.locale === 'sv'
  const notes: string[] = []
  if (input.dayType === 'GAME') notes.push(sv ? 'Matchdag: underskottet stängs av för att skydda prestationen.' : 'Game day: deficit is disabled to protect performance.')
  if (input.dayType === 'DOUBLE' || input.dayType === 'HARD_PRACTICE') notes.push(sv ? 'Hög belastning: kalorierna hålls nära underhållsnivå.' : 'High-demand day: calories are held near maintenance.')
  if (input.fastWeightLossRisk && input.weeklyWeightChangeKg != null) {
    notes.push(sv
      ? `Vikten går ned ${Math.abs(input.weeklyWeightChangeKg)} kg/vecka, så underskottet mildras.`
      : `Weight is trending down ${Math.abs(input.weeklyWeightChangeKg)} kg/week, so the deficit is softened.`
    )
  }
  if (input.lowRecoveryRisk) notes.push(sv ? 'Återhämtningssignalen är låg, så energin skyddas på belastande dagar.' : 'Recovery signal is low, so hard-day fueling is protected.')
  return notes.length ? notes.join(' ') : undefined
}

async function maybeEnhanceWithAi(input: {
  draft: PerformancePlanDraft
  userId?: string
  clientName: string
  locale: AppLocale
  enabled: boolean
}): Promise<PerformancePlanDraft> {
  if (!input.enabled || !input.userId) return input.draft

  try {
    const keys = await getResolvedAiKeys(input.userId)
    const resolved = resolveModel(keys, 'balanced')
    if (!resolved) return input.draft

    const compact = input.draft.days.map((day) => ({
      date: day.dateKey,
      dayType: day.dayType,
      targets: {
        caloriesKcal: day.targets.caloriesKcal,
        proteinG: day.targets.proteinG,
        carbsG: day.targets.carbsG,
        fatG: day.targets.fatG,
      },
      meals: day.meals.map((meal) => ({
        sortOrder: meal.sortOrder,
        mealType: meal.mealType,
        time: meal.time,
        timingRole: meal.timingRole,
        lockedMacros: {
          caloriesKcal: meal.caloriesKcal,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
        },
      })),
    }))

    const prompt = `Create practical Swedish elite hockey meal wording for ${input.clientName}.
Return only JSON matching this shape: {"days":[{"date":"yyyy-MM-dd","meals":[{"sortOrder":0,"title":"...","description":"...","explanation":"...","portionSummary":{"items":[{"name":"...","amount":"..."}],"note":"..."},"options":[{"sortOrder":0,"title":"...","description":"...","portionSummary":{"items":[{"name":"...","amount":"..."}]}}]}]}]}.
Do not change macro numbers; the app will keep locked macros. Keep foods familiar, practical, performance-focused, and suitable for an elite hockey player trying to drift from 85-86 kg toward 83 kg without losing edge.
Language: ${input.locale === 'sv' ? 'Swedish' : 'English'}.
Plan: ${JSON.stringify(compact)}`

    const response = await withAiContext(
      { userId: input.userId, category: 'nutrition_performance_plan' },
      () => generateText({
        model: createModelInstance(resolved),
        prompt,
        maxOutputTokens: 5000,
      }),
    )

    const jsonText = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
    const parsed = AI_MEAL_RESPONSE_SCHEMA.parse(JSON.parse(jsonText))
    const byDate = new Map(parsed.days.map((day) => [day.date, day]))

    return {
      ...input.draft,
      days: input.draft.days.map((day) => {
        const aiDay = byDate.get(day.dateKey)
        if (!aiDay) return day
        return {
          ...day,
          meals: day.meals.map((meal) => {
            const aiMeal = aiDay.meals.find((candidate) => candidate.sortOrder === meal.sortOrder)
            if (!aiMeal) return meal
            return {
              ...meal,
              title: aiMeal.title ?? meal.title,
              description: aiMeal.description ?? meal.description,
              explanation: aiMeal.explanation ?? meal.explanation,
              portionSummary: aiMeal.portionSummary ?? meal.portionSummary,
              options: meal.options.map((option) => {
                const aiOption = aiMeal.options?.find((candidate) => candidate.sortOrder === option.sortOrder)
                return aiOption
                  ? {
                      ...option,
                      title: aiOption.title,
                      description: aiOption.description ?? option.description,
                      portionSummary: aiOption.portionSummary,
                    }
                  : option
              }),
            }
          }),
        }
      }),
      generatedSnapshot: {
        ...input.draft.generatedSnapshot,
        aiEnhanced: true,
        aiModel: resolved.modelId,
      },
    }
  } catch (error) {
    logger.warn('AI meal wording failed, using deterministic performance meal guide', {
      clientName: input.clientName,
      error: error instanceof Error ? error.message : String(error),
    })
    return input.draft
  }
}

export async function buildPerformanceMealGuideDraft({
  clientId,
  userId,
  locale = 'sv',
  startDate = new Date(),
  useAi = true,
}: GeneratePerformanceMealGuideInput): Promise<PerformancePlanDraft> {
  const start = startOfDay(startDate)
  const end = startOfDay(addDays(start, 6))
  const rangeEnd = endOfDay(end)

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      athleteAccount: { select: { userId: true } },
      nutritionGoal: true,
      sportProfile: true,
      bodyCompositions: {
        orderBy: { measurementDate: 'desc' },
        take: 8,
      },
      dailyMetrics: {
        where: { date: { gte: addDays(start, -7), lte: start } },
        orderBy: { date: 'desc' },
        take: 7,
        select: { readinessScore: true, sleepHours: true, sleepQuality: true },
      },
    },
  })

  if (!client?.athleteAccount?.userId) {
    throw new Error('Athlete account not found')
  }

  const bodyMetrics = resolveNutritionBodyMetrics({
    profileWeightKg: client.weight,
    latestBia: client.bodyCompositions[0] ?? null,
  })

  const contexts = await getPlanningContexts({
    clientId,
    athleteUserId: client.athleteAccount.userId,
    rangeStart: start,
    rangeEnd,
    locale,
  })

  const weeklyWeightChangeKg = estimateWeeklyWeightChangeKg(client.bodyCompositions)
  const fastWeightLossRisk =
    weeklyWeightChangeKg != null &&
    weeklyWeightChangeKg < -Math.max(0.35, bodyMetrics.weightKg * 0.005)
  const avgReadiness = client.dailyMetrics.length
    ? client.dailyMetrics.reduce((sum, metric) => sum + (metric.readinessScore ?? 65), 0) / client.dailyMetrics.length
    : null
  const avgSleep = client.dailyMetrics.length
    ? client.dailyMetrics.reduce((sum, metric) => sum + (metric.sleepHours ?? 7.5), 0) / client.dailyMetrics.length
    : null
  const lowRecoveryRisk = (avgReadiness != null && avgReadiness < 55) || (avgSleep != null && avgSleep < 6.5)

  const days: PlanDayDraft[] = []
  let previousDayType: PlanDayDraft['dayType'] | undefined
  for (const date of eachDayOfInterval({ start, end })) {
    const key = dayKey(date)
    const context = contexts[key] ?? { dateKey: key, date, workouts: [], scheduleSignals: [] }
    const dayType = classifyPerformanceDay(context, previousDayType)
    const dayGoalType = goalTypeForPerformanceDay({
      dayType,
      baseGoalType: client.nutritionGoal?.goalType,
      fastWeightLossRisk,
      lowRecoveryRisk,
    })
    const goal = buildNutritionGoal({ goal: client.nutritionGoal, dayGoalType })
    const targets = calculateDailyTargets(
      bodyMetrics.weightKg,
      context.workouts,
      goal,
      client.nutritionGoal?.customBmrKcal ?? bodyMetrics.bmrKcal,
      client.sportProfile?.lifestyleActivity ?? 'SEDENTARY',
      {
        birthDate: client.birthDate,
        currentDate: date,
        gender: client.gender,
        primarySport: client.sportProfile?.primarySport,
      }
    )
    const adaptationNotes = buildAdaptationNotes({
      dayType,
      fastWeightLossRisk,
      lowRecoveryRisk,
      weeklyWeightChangeKg,
      locale,
    })
    days.push({
      date: utcDateFromKey(key),
      dateKey: key,
      dayType,
      targets,
      weightKg: bodyMetrics.weightKg,
      bmrKcal: client.nutritionGoal?.customBmrKcal ?? bodyMetrics.bmrKcal,
      scheduleSnapshot: context.scheduleSignals,
      garminSnapshot: context.garminSnapshot,
      biaSnapshot: bodyMetrics.biaSnapshot,
      adaptationNotes,
      // Epoch-day seed so each calendar day rotates to different recipes.
      meals: buildPlannedMealsForDay({
        dayType,
        targets,
        scheduleSignals: context.scheduleSignals,
        locale,
        variantSeed: Math.floor(date.getTime() / 86_400_000),
      }),
    })
    previousDayType = dayType
  }

  const draft: PerformancePlanDraft = {
    title: locale === 'sv' ? 'Måltidsguide för prestation' : 'Performance Meal Guide',
    startDate: utcDateFromKey(dayKey(start)),
    endDate: utcDateFromKey(dayKey(end)),
    goalSnapshot: {
      goalType: client.nutritionGoal?.goalType ?? 'WEIGHT_LOSS',
      targetWeightKg: client.nutritionGoal?.targetWeightKg ?? 83,
      weeklyChangeKg: client.nutritionGoal?.weeklyChangeKg ?? 0.25,
      activityLevel: client.nutritionGoal?.activityLevel ?? 'ATHLETE',
      performanceFirst: true,
    },
    contextSnapshot: {
      bodyMetricSource: bodyMetrics.source,
      weeklyWeightChangeKg,
      avgReadiness,
      avgSleep,
      fastWeightLossRisk,
      lowRecoveryRisk,
      generatedForClientId: clientId,
    },
    generatedSnapshot: {
      version: 1,
      aiEnhanced: false,
      generatedAt: new Date().toISOString(),
    },
    days,
  }

  return maybeEnhanceWithAi({
    draft,
    userId,
    clientName: client.name,
    locale,
    enabled: useAi,
  })
}

export async function savePerformanceMealGuideDraft(clientId: string, draft: PerformancePlanDraft) {
  return prisma.$transaction(async (tx) => {
    await tx.nutritionPerformancePlan.updateMany({
      where: { clientId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    })

    const plan = await tx.nutritionPerformancePlan.create({
      data: {
        clientId,
        title: draft.title,
        status: 'ACTIVE',
        startDate: draft.startDate,
        endDate: draft.endDate,
        goalSnapshot: toJson(draft.goalSnapshot),
        contextSnapshot: toJson(draft.contextSnapshot),
        generatedSnapshot: toJson(draft.generatedSnapshot),
        days: {
          create: draft.days.map((day) => ({
            client: { connect: { id: clientId } },
            date: day.date,
            dayType: day.dayType,
            caloriesKcal: day.targets.caloriesKcal,
            proteinG: day.targets.proteinG,
            carbsG: day.targets.carbsG,
            fatG: day.targets.fatG,
            hydrationMl: day.targets.hydrationMl,
            weightKg: day.weightKg,
            bmrKcal: day.bmrKcal,
            scheduleSnapshot: toJson(day.scheduleSnapshot),
            garminSnapshot: toOptionalJson(day.garminSnapshot),
            biaSnapshot: toOptionalJson(day.biaSnapshot),
            adaptationNotes: day.adaptationNotes,
            meals: {
              create: day.meals.map((meal) => ({
                mealType: meal.mealType,
                time: meal.time,
                title: meal.title,
                description: meal.description,
                timingRole: meal.timingRole,
                explanation: meal.explanation,
                portionSummary: toJson(meal.portionSummary),
                caloriesKcal: meal.caloriesKcal,
                proteinG: meal.proteinG,
                carbsG: meal.carbsG,
                fatG: meal.fatG,
                fiberG: meal.fiberG,
                sortOrder: meal.sortOrder,
                recipeTitle: meal.recipe.title,
                recipeSummary: meal.recipe.summary,
                recipeServings: meal.recipe.servings,
                recipePrepMinutes: meal.recipe.prepMinutes,
                recipeCookMinutes: meal.recipe.cookMinutes,
                recipeIngredients: toJson(meal.recipe.ingredients),
                recipeSteps: toJson(meal.recipe.steps),
                recipeTips: toOptionalJson(meal.recipe.tips),
                recipeSource: meal.recipe.source,
                recipePrompt: meal.recipe.prompt,
                recipeUpdatedAt: new Date(),
                options: {
                  create: meal.options.map((option) => ({
                    title: option.title,
                    description: option.description,
                    portionSummary: toJson(option.portionSummary),
                    caloriesKcal: option.caloriesKcal,
                    proteinG: option.proteinG,
                    carbsG: option.carbsG,
                    fatG: option.fatG,
                    fiberG: option.fiberG,
                    sortOrder: option.sortOrder,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: performancePlanInclude,
    })

    return plan
  })
}

export const performancePlanInclude = {
  days: {
    orderBy: { date: 'asc' as const },
    include: {
      meals: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          options: { orderBy: { sortOrder: 'asc' as const } },
          mealLogs: true,
        },
      },
    },
  },
}

export async function generateAndSavePerformanceMealGuide(input: GeneratePerformanceMealGuideInput) {
  const draft = await buildPerformanceMealGuideDraft(input)
  const plan = await savePerformanceMealGuideDraft(input.clientId, draft)
  await rematchMealsForPlan(input.clientId, plan.id)
  return getPerformanceMealGuideForDate(input.clientId, dayKey(input.startDate ?? new Date()))
}

export async function refreshActivePerformanceMealGuideForClient(input: {
  clientId: string
  reason: 'bia_saved' | 'garmin_sync' | 'manual_refresh' | 'workout_logged'
}) {
  const activePlan = await prisma.nutritionPerformancePlan.findFirst({
    where: {
      clientId: input.clientId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      startDate: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!activePlan) return false

  try {
    await generateAndSavePerformanceMealGuide({
      clientId: input.clientId,
      startDate: activePlan.startDate,
      useAi: false,
    })
    logger.info('Refreshed active performance meal guide', {
      clientId: input.clientId,
      previousPlanId: activePlan.id,
      reason: input.reason,
    })
    return true
  } catch (error) {
    logger.warn('Failed to refresh active performance meal guide', {
      clientId: input.clientId,
      planId: activePlan.id,
      reason: input.reason,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

export async function getPerformanceMealGuideForDate(clientId: string, dateKey: string) {
  const date = utcDateFromKey(dateKey)
  const plan = await prisma.nutritionPerformancePlan.findFirst({
    where: {
      clientId,
      status: 'ACTIVE',
      startDate: { lte: date },
      endDate: { gte: date },
    },
    orderBy: { createdAt: 'desc' },
    include: performancePlanInclude,
  })
  if (!plan) return null

  const day = plan.days.find((candidate) => candidate.date.toISOString().slice(0, 10) === dateKey)
  if (!day) return null

  const loggedMeals = await prisma.mealLog.findMany({
    where: { clientId, date },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: [{ time: 'asc' }, { createdAt: 'asc' }],
  })

  return {
    plan,
    day,
    loggedMeals,
    chart: buildPlannedVsEatenChart(day.meals, loggedMeals),
  }
}

export function buildPlannedVsEatenChart(
  plannedMeals: Array<{
    id: string
    mealType: MealType
    time: string | null
    title: string
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }>,
  loggedMeals: Array<{
    plannedMealId: string | null
    mealType: MealType
    calories: number | null
    proteinGrams: number | null
    carbsGrams: number | null
    fatGrams: number | null
  }>
) {
  return plannedMeals.map((planned) => {
    const logs = loggedMeals.filter((meal) => meal.plannedMealId === planned.id)
    const eaten = {
      caloriesKcal: logs.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
      proteinG: logs.reduce((sum, meal) => sum + (meal.proteinGrams ?? 0), 0),
      carbsG: logs.reduce((sum, meal) => sum + (meal.carbsGrams ?? 0), 0),
      fatG: logs.reduce((sum, meal) => sum + (meal.fatGrams ?? 0), 0),
    }
    return {
      plannedMealId: planned.id,
      mealType: planned.mealType,
      time: planned.time,
      title: planned.title,
      planned: {
        caloriesKcal: planned.caloriesKcal,
        proteinG: planned.proteinG,
        carbsG: planned.carbsG,
        fatG: planned.fatG,
      },
      eaten,
      logCount: logs.length,
    }
  })
}

export async function findPlannedMealMatch(input: {
  clientId: string
  date: Date
  mealType: MealType
  time?: string | null
}) {
  const activePlan = await prisma.nutritionPerformancePlan.findFirst({
    where: {
      clientId: input.clientId,
      status: 'ACTIVE',
      startDate: { lte: input.date },
      endDate: { gte: input.date },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      days: {
        where: { date: input.date },
        include: {
          meals: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  })

  const meals = activePlan?.days[0]?.meals ?? []
  let best: { id: string; confidence: number } | null = null
  for (const meal of meals) {
    const confidence = scorePlannedMealMatch({
      mealType: input.mealType,
      time: input.time,
      plannedMeal: {
        mealType: meal.mealType,
        time: meal.time ?? undefined,
      } as PlannedMealDraft,
    })
    if (!best || confidence > best.confidence) best = { id: meal.id, confidence }
  }

  return best && best.confidence >= 0.45 ? best : null
}

export async function rematchMealsForPlan(clientId: string, planId: string): Promise<void> {
  const plan = await prisma.nutritionPerformancePlan.findFirst({
    where: { id: planId, clientId },
    include: {
      days: {
        include: { meals: true },
      },
    },
  })
  if (!plan) return

  for (const day of plan.days) {
    const meals = await prisma.mealLog.findMany({
      where: { clientId, date: day.date },
      select: { id: true, mealType: true, time: true },
    })
    for (const meal of meals) {
      let best: { id: string; confidence: number } | null = null
      for (const planned of day.meals) {
        const confidence = scorePlannedMealMatch({
          mealType: meal.mealType,
          time: meal.time,
          plannedMeal: {
            mealType: planned.mealType,
            time: planned.time ?? undefined,
          } as PlannedMealDraft,
        })
        if (!best || confidence > best.confidence) best = { id: planned.id, confidence }
      }
      if (best && best.confidence >= 0.45) {
        await prisma.mealLog.update({
          where: { id: meal.id },
          data: {
            plannedMealId: best.id,
            plannedMealMatchSource: 'AUTO',
            plannedMealMatchConfidence: best.confidence,
          },
        })
      }
    }
  }
}
