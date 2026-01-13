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
  ChevronRight,
  Sparkles,
  Trash2,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Apple,
  UtensilsCrossed,
} from 'lucide-react'
import { QuickMealLog } from './QuickMealLog'
import { MealType } from '@prisma/client'
import { cn } from '@/lib/utils'

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
}

interface DailyNutritionCardProps {
  date?: Date
  goals?: NutritionGoals
  workoutInfo?: WorkoutInfo
  className?: string
}

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2200,
  proteinGrams: 140,
  carbsGrams: 250,
  fatGrams: 75,
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
  BREAKFAST: 'Frukost',
  MORNING_SNACK: 'Fika',
  LUNCH: 'Lunch',
  AFTERNOON_SNACK: 'Mellanmål',
  PRE_WORKOUT: 'Pre-workout',
  POST_WORKOUT: 'Post-workout',
  DINNER: 'Middag',
  EVENING_SNACK: 'Kvällssnack',
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
        {remaining > 0 ? `${remaining.toFixed(0)} ${unit} kvar` : 'Mål nått!'}
      </p>
    </div>
  )
}

export function DailyNutritionCard({
  date = new Date(),
  goals = DEFAULT_GOALS,
  workoutInfo,
  className,
}: DailyNutritionCardProps) {
  const [meals, setMeals] = useState<MealLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
  })

  const dateStr = date.toISOString().split('T')[0]

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
    fetchMeals()
  }, [fetchMeals])

  const handleAddMeal = async (data: {
    date: string
    mealType: MealType
    time?: string
    description: string
    calories?: number
    proteinGrams?: number
    carbsGrams?: number
    fatGrams?: number
    isPreWorkout?: boolean
    isPostWorkout?: boolean
  }) => {
    const response = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      await fetchMeals()
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Ta bort denna måltid?')) return

    const response = await fetch(`/api/meals/${mealId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      await fetchMeals()
    }
  }

  // Adjust goals for training day
  const adjustedGoals = workoutInfo?.hasWorkout
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
        return `Ät en lätt måltid ~${workoutHour - 2}:00 med 40-50g kolhydrater och 20g protein. Undvik fett nära träningen.`
      }

      if (now >= workoutHour && now <= workoutHour + 1) {
        return 'Efter träningen: Ät 20-40g protein och 50-100g kolhydrater inom 2 timmar för optimal återhämtning.'
      }
    }

    if (remainingProtein > 60) {
      return `Du har ${remainingProtein.toFixed(0)}g protein kvar - fokusera på proteinrika måltider resten av dagen.`
    }

    if (remainingCalories < 0) {
      return 'Du har överskridit kalorimålet idag. Det är okej, fokusera på balans över veckan.'
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
            <CardTitle>Nutrition idag</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {date.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}
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
            Logga
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Macro Progress */}
        <div className="space-y-4">
          <MacroBar
            label="Kalorier"
            current={dailyTotals.calories}
            target={adjustedGoals.calories}
            color="text-orange-500"
            icon={Flame}
            unit="kcal"
          />
          <MacroBar
            label="Protein"
            current={dailyTotals.proteinGrams}
            target={adjustedGoals.proteinGrams}
            color="text-red-500"
            icon={Beef}
          />
          <MacroBar
            label="Kolhydrater"
            current={dailyTotals.carbsGrams}
            target={adjustedGoals.carbsGrams}
            color="text-yellow-500"
            icon={Wheat}
          />
          <MacroBar
            label="Fett"
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
          <h4 className="font-medium text-sm text-muted-foreground">Loggade måltider</h4>
          {meals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Inga måltider loggade än idag
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
                        <span>{MEAL_TYPE_LABELS[meal.mealType]}</span>
                        {meal.time && <span>• {meal.time}</span>}
                        {meal.calories && <span>• {meal.calories} kcal</span>}
                        {meal.proteinGrams && <span>• {meal.proteinGrams}g protein</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMeal(meal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
        onSubmit={handleAddMeal}
        date={date}
      />
    </Card>
  )
}
