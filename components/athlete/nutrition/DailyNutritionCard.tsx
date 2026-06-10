'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Flame,
  Beef,
  Wheat,
  Droplet as OilIcon,
  Dumbbell,
  Sparkles,
  Trash2,
  Pencil,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Apple,
  UtensilsCrossed,
} from 'lucide-react'
import { QuickMealLog, type EditMealData } from './QuickMealLog'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

interface MealLog {
  id: string
  date: string
  mealType: MealType
  time?: string | null
  description: string
  calories?: number | null
  proteinGrams?: number | null
  carbsGrams?: number | null
  fatGrams?: number | null
  saturatedFatGrams?: number | null
  monounsaturatedFatGrams?: number | null
  polyunsaturatedFatGrams?: number | null
  sugarGrams?: number | null
  complexCarbsGrams?: number | null
  isCompleteProtein?: boolean | null
  isPreWorkout: boolean
  isPostWorkout: boolean
}

interface NutritionGoals {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

interface WorkoutInfo {
  time?: string
  type?: string
  hasWorkout: boolean
  isCompleted?: boolean
}

interface DailyNutritionCardProps {
  date?: Date
  /** Explicit goal override. When omitted, the card fetches the athlete's
   * computed daily targets (training-aware) from /api/nutrition/daily-targets. */
  goals?: NutritionGoals
  workoutInfo?: WorkoutInfo
  className?: string
}

// Last-resort fallback when no goals prop is given and the targets fetch
// fails — generic adult values, not personalized.
const FALLBACK_GOALS: NutritionGoals = {
  calories: 2200,
  proteinGrams: 140,
  carbsGrams: 250,
  fatGrams: 75,
}

function localDateValue(date: Date): string {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

const MEAL_TYPE_ICONS: Record<MealType, typeof Sunrise> = {
  BREAKFAST: Sunrise,
  MORNING_SNACK: Coffee,
  LUNCH: Sun,
  AFTERNOON_SNACK: Apple,
  PRE_WORKOUT: Dumbbell,
  POST_WORKOUT: Dumbbell,
  DINNER: Moon,
  EVENING_SNACK: UtensilsCrossed,
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'mealTypes.breakfast',
  MORNING_SNACK: 'mealTypes.morningSnack',
  LUNCH: 'mealTypes.lunch',
  AFTERNOON_SNACK: 'mealTypes.afternoonSnack',
  PRE_WORKOUT: 'mealTypes.preWorkout',
  POST_WORKOUT: 'mealTypes.postWorkout',
  DINNER: 'mealTypes.dinner',
  EVENING_SNACK: 'mealTypes.eveningSnack',
}

function MacroBar({
  label,
  current,
  target,
  color,
  icon: Icon,
  unit = 'g',
}: {
  label: string
  current: number
  target: number
  color: string
  icon: typeof Flame
  unit?: string
}) {
  const t = useTranslations('components.dailyNutritionCard')
  const percentage = Math.min(100, (current / target) * 100)
  const remaining = Math.max(0, target - current)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground">
          {current.toFixed(0)} / {target} {unit}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {remaining > 0 ? t('macro.remaining', { amount: remaining.toFixed(0), unit }) : t('macro.targetReached')}
      </p>
    </div>
  )
}

export function DailyNutritionCard({
  date = new Date(),
  goals: goalsProp,
  workoutInfo,
  className,
}: DailyNutritionCardProps) {
  const t = useTranslations('components.dailyNutritionCard')
  const locale = useLocale()
  const [meals, setMeals] = useState<MealLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [editingMeal, setEditingMeal] = useState<EditMealData | null>(null)
  const [fetchedGoals, setFetchedGoals] = useState<NutritionGoals | null>(null)
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
    saturatedFatGrams: 0,
    monounsaturatedFatGrams: 0,
    polyunsaturatedFatGrams: 0,
    sugarGrams: 0,
    complexCarbsGrams: 0,
  })

  const dateStr = localDateValue(date)

  // Personalized daily target (training-aware) when no explicit goals prop.
  useEffect(() => {
    if (goalsProp) return
    let cancelled = false
    const fetchTargets = async () => {
      try {
        const res = await fetch(`/api/nutrition/daily-targets?startDate=${dateStr}&endDate=${dateStr}`)
        if (!res.ok) return
        const json = await res.json()
        const target = json.targets?.[0]
        if (!cancelled && target) {
          setFetchedGoals({
            calories: target.caloriesKcal,
            proteinGrams: target.proteinG,
            carbsGrams: target.carbsG,
            fatGrams: target.fatG,
          })
        }
      } catch {
        // fall back to FALLBACK_GOALS below
      }
    }
    void fetchTargets()
    return () => {
      cancelled = true
    }
  }, [goalsProp, dateStr])

  const fetchMeals = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/meals?date=${dateStr}`)
      const result = await response.json()

      if (result.success) {
        setMeals(result.data.meals)
        if (result.data.dailyTotals) {
          setDailyTotals({
            calories: result.data.dailyTotals.calories,
            proteinGrams: result.data.dailyTotals.proteinGrams,
            carbsGrams: result.data.dailyTotals.carbsGrams,
            fatGrams: result.data.dailyTotals.fatGrams,
            saturatedFatGrams: result.data.dailyTotals.saturatedFatGrams ?? 0,
            monounsaturatedFatGrams: result.data.dailyTotals.monounsaturatedFatGrams ?? 0,
            polyunsaturatedFatGrams: result.data.dailyTotals.polyunsaturatedFatGrams ?? 0,
            sugarGrams: result.data.dailyTotals.sugarGrams ?? 0,
            complexCarbsGrams: result.data.dailyTotals.complexCarbsGrams ?? 0,
          })
        }
      }
    } catch (err) {
      console.error('Error fetching meals:', err)
    } finally {
      setIsLoading(false)
    }
  }, [dateStr])

  useEffect(() => {
    void fetchMeals()
  }, [fetchMeals])

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm(t('confirmDelete'))) return

    const response = await fetch(`/api/meals/${mealId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      await fetchMeals()
    }
  }

  // Fetched targets are already workout-aware (the timing engine adds the
  // day's completed workouts), so the flat workout bump only applies to
  // prop/fallback goals. Bump only when the workout is completed — scheduled
  // but undone workouts shouldn't raise calories.
  const goals = goalsProp ?? fetchedGoals ?? FALLBACK_GOALS
  const applyWorkoutBump = !fetchedGoals || goalsProp != null
  const adjustedGoals = applyWorkoutBump && workoutInfo?.hasWorkout && workoutInfo.isCompleted
    ? {
        calories: goals.calories + 300,
        proteinGrams: goals.proteinGrams,
        carbsGrams: goals.carbsGrams + 50,
        fatGrams: goals.fatGrams,
      }
    : goals

  // Generate AI tip based on current intake and workout
  const generateTip = (): string | null => {
    const remainingProtein = adjustedGoals.proteinGrams - dailyTotals.proteinGrams
    const remainingCalories = adjustedGoals.calories - dailyTotals.calories

    if (workoutInfo?.hasWorkout && workoutInfo.time) {
      const workoutHour = parseInt(workoutInfo.time.split(':')[0])
      const now = new Date().getHours()

      if (now < workoutHour - 2) {
        return t('tips.preWorkout', { hour: workoutHour - 2 })
      }

      if (now >= workoutHour && now <= workoutHour + 1) {
        return t('tips.postWorkout')
      }
    }

    if (remainingProtein > 60) {
      return t('tips.remainingProtein', { grams: remainingProtein.toFixed(0) })
    }

    if (remainingCalories < 0) {
      return t('tips.overCalories')
    }

    return null
  }

  const tip = generateTip()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
              {workoutInfo?.hasWorkout && (
                <Badge variant="secondary" className="text-xs">
                  <Dumbbell className="h-3 w-3 mr-1" />
                  {workoutInfo.time} {workoutInfo.type}
                </Badge>
              )}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddMeal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('actions.log')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Macro Progress */}
        <div className="space-y-4">
          <MacroBar
            label={t('macros.calories')}
            current={dailyTotals.calories}
            target={adjustedGoals.calories}
            color="text-orange-500"
            icon={Flame}
            unit="kcal"
          />
          <MacroBar
            label={t('macros.protein')}
            current={dailyTotals.proteinGrams}
            target={adjustedGoals.proteinGrams}
            color="text-red-500"
            icon={Beef}
          />
          <MacroBar
            label={t('macros.carbs')}
            current={dailyTotals.carbsGrams}
            target={adjustedGoals.carbsGrams}
            color="text-yellow-500"
            icon={Wheat}
          />
          <MacroBar
            label={t('macros.fat')}
            current={dailyTotals.fatGrams}
            target={adjustedGoals.fatGrams}
            color="text-blue-500"
            icon={OilIcon}
          />
        </div>

        {/* AI Tip */}
        {tip && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{tip}</p>
            </div>
          </div>
        )}

        {/* Meal List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">{t('loggedMeals')}</h4>
          {meals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('emptyMeals')}
            </p>
          ) : (
            <div className="space-y-2">
              {meals.map((meal) => {
                const Icon = MEAL_TYPE_ICONS[meal.mealType]
                return (
                  <div
                    key={meal.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {meal.description}
                        </span>
                        {meal.isPreWorkout && (
                          <Badge variant="outline" className="text-xs">Pre</Badge>
                        )}
                        {meal.isPostWorkout && (
                          <Badge variant="outline" className="text-xs">Post</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t(MEAL_TYPE_LABELS[meal.mealType])}</span>
                        {meal.time && <span>• {meal.time}</span>}
                        {meal.calories && <span>• {meal.calories} kcal</span>}
                        {meal.proteinGrams && <span>• {t('meal.protein', { grams: meal.proteinGrams })}</span>}
                      </div>
                      {meal.saturatedFatGrams != null && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{t('meal.saturatedFat', { grams: meal.saturatedFatGrams })}</span>
                          {meal.sugarGrams != null && <span>• {t('meal.sugar', { grams: meal.sugarGrams })}</span>}
                          {meal.isCompleteProtein && <span>• {t('meal.completeProtein')}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingMeal({
                          id: meal.id,
                          mealType: meal.mealType,
                          time: meal.time,
                          description: meal.description,
                          calories: meal.calories,
                          proteinGrams: meal.proteinGrams,
                          carbsGrams: meal.carbsGrams,
                          fatGrams: meal.fatGrams,
                          isPreWorkout: meal.isPreWorkout,
                          isPostWorkout: meal.isPostWorkout,
                        })}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteMeal(meal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>

      <QuickMealLog
        open={showAddMeal}
        onClose={() => setShowAddMeal(false)}
        onMealSaved={() => {
          setShowAddMeal(false)
          void fetchMeals()
        }}
        date={date}
      />

      {editingMeal && (
        <QuickMealLog
          open={!!editingMeal}
          onClose={() => setEditingMeal(null)}
          onMealSaved={() => {
            setEditingMeal(null)
            void fetchMeals()
          }}
          editMeal={editingMeal}
          date={date}
        />
      )}
    </Card>
  )
}
