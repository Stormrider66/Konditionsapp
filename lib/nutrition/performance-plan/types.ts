import type { MealType, WorkoutIntensity, WorkoutType } from '@prisma/client'
import type { DailyMacroTargets, WorkoutContext } from '@/lib/nutrition-timing'

export type PerformancePlanDayType =
  | 'GAME'
  | 'PRACTICE'
  | 'HARD_PRACTICE'
  | 'DOUBLE'
  | 'REST'
  | 'RECOVERY'
  | 'TRAVEL'

export type PerformanceMealTimingRole =
  | 'REGULAR'
  | 'PRE_WORKOUT'
  | 'POST_WORKOUT'
  | 'GAME_FUEL'
  | 'RECOVERY'

export interface BodyMetricSource {
  weightKg: number
  bmrKcal?: number
  source: 'BIA' | 'PROFILE'
  biaSnapshot?: {
    id: string
    measurementDate: string
    weightKg?: number | null
    bodyFatPercent?: number | null
    muscleMassKg?: number | null
    bmrKcal?: number | null
    deviceBrand?: string | null
  }
}

export interface ScheduleSignal {
  id: string
  source: 'WORKOUT' | 'TEAM_EVENT' | 'MATCH' | 'CALENDAR'
  type: string
  title: string
  startDate: string
  endDate?: string | null
  durationMinutes?: number | null
  intensity?: WorkoutIntensity | null
}

export interface DayPlanningContext {
  dateKey: string
  date: Date
  workouts: WorkoutContext[]
  scheduleSignals: ScheduleSignal[]
  garminSnapshot?: {
    activityCount: number
    calories: number
    tss: number
    maxIntensity?: string | null
  }
}

export interface MealPortionItem {
  name: string
  amount: string
  note?: string
}

export interface MealPortionSummary {
  items: MealPortionItem[]
  note?: string
}

export interface PlannedMealOptionDraft {
  title: string
  description?: string
  portionSummary: MealPortionSummary
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number
  sortOrder: number
}

export interface PlannedMealRecipeIngredient {
  name: string
  amount: string
  note?: string
}

export interface PlannedMealRecipe {
  title: string
  summary?: string
  servings: number
  prepMinutes?: number
  cookMinutes?: number
  ingredients: PlannedMealRecipeIngredient[]
  steps: string[]
  tips?: string[]
  source: 'TEMPLATE' | 'AI'
  prompt?: string
}

export interface PlannedMealDraft {
  mealType: MealType
  time?: string
  title: string
  description?: string
  timingRole: PerformanceMealTimingRole
  explanation?: string
  portionSummary: MealPortionSummary
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number
  sortOrder: number
  options: PlannedMealOptionDraft[]
  recipe: PlannedMealRecipe
}

export interface PlanDayDraft {
  date: Date
  dateKey: string
  dayType: PerformancePlanDayType
  targets: DailyMacroTargets
  weightKg: number
  bmrKcal?: number
  scheduleSnapshot: ScheduleSignal[]
  garminSnapshot?: DayPlanningContext['garminSnapshot']
  biaSnapshot?: BodyMetricSource['biaSnapshot']
  adaptationNotes?: string
  meals: PlannedMealDraft[]
}

export interface PerformancePlanDraft {
  title: string
  startDate: Date
  endDate: Date
  goalSnapshot: Record<string, unknown>
  contextSnapshot: Record<string, unknown>
  generatedSnapshot: Record<string, unknown>
  days: PlanDayDraft[]
}

export interface WorkoutLikeSignal {
  id: string
  name: string
  type: WorkoutType
  intensity: WorkoutIntensity
  duration: number | null
  scheduledTime?: Date
}
