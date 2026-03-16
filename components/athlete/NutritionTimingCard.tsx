/**
 * Nutrition Timing Card
 *
 * Proactive notification-style card that surfaces key meal timing information
 * before workouts. Shows when to eat, what to eat, and hydration reminders.
 *
 * Features:
 * - Workout-aware timing (meal deadline based on workout time)
 * - Intensity-based carb recommendations
 * - Hydration reminders
 * - Expandable food suggestions
 * - Session-based dismissal (resets daily)
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Utensils, Clock, Droplets, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import type { DailyNutritionGuidance } from '@/lib/nutrition-timing'

const DISMISS_KEY = 'nutritionTimingDismissed'

export function NutritionTimingCard() {
  const basePath = useBasePath()
  const [guidance, setGuidance] = useState<DailyNutritionGuidance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    // Check sessionStorage for dismissed state (resets daily)
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem(DISMISS_KEY)
      if (dismissed === new Date().toDateString()) {
        setIsDismissed(true)
        setIsLoading(false)
        return
      }
    }

    async function fetchGuidance() {
      try {
        const response = await fetch('/api/nutrition/guidance')
        if (response.ok) {
          const data = await response.json()
          setGuidance(data.guidance)
        }
      } catch (error) {
        console.error('Error fetching nutrition guidance:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGuidance()
  }, [])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISS_KEY, new Date().toDateString())
    }
    setIsDismissed(true)
  }

  // Don't show if loading, dismissed, rest day, or no workouts
  if (isLoading || isDismissed) return null
  if (!guidance || guidance.isRestDay || guidance.todaysWorkouts.length === 0) return null

  const upcomingWorkout = guidance.todaysWorkouts.find((workout) => workout.status !== 'COMPLETED')
  const completedWorkout = [...guidance.todaysWorkouts]
    .filter((workout) => workout.status === 'COMPLETED')
    .sort((a, b) => {
      const aTime = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0
      const bTime = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0
      return bTime - aTime
    })[0]

  const isPostWorkoutMode = !upcomingWorkout && !!completedWorkout
  const workout = upcomingWorkout || completedWorkout

  if (!workout) return null

  const workoutIndex = guidance.todaysWorkouts.findIndex((item) => item.id === workout.id)
  const preWorkout = workoutIndex >= 0 ? guidance.preWorkoutGuidance?.[workoutIndex] : undefined
  const postWorkout = workoutIndex >= 0 ? guidance.postWorkoutGuidance?.[workoutIndex] : undefined

  // Calculate workout hour and meal deadline (only when actual time is known)
  const hasScheduledTime = !!workout.scheduledTime
  const workoutHour = hasScheduledTime
    ? new Date(workout.scheduledTime!).getHours()
    : null
  const mealDeadline = workoutHour !== null
    ? Math.max(workoutHour - 2, 10) // At least 10:00
    : null

  // Format workout hour
  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`

  // Get intensity label
  const getIntensityLabel = (intensity: string) => {
    const labels: Record<string, string> = {
      RECOVERY: 'Återhämtning',
      EASY: 'Lätt',
      MODERATE: 'Medel',
      THRESHOLD: 'Tröskel',
      INTERVAL: 'Intervall',
      MAX: 'Maximal',
    }
    return labels[intensity] || intensity
  }

  return (
    <Card
      className="bg-gradient-to-br from-emerald-50 to-teal-50
                 dark:from-emerald-950/30 dark:to-teal-950/30
                 border-emerald-200 dark:border-emerald-800"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
              <Utensils className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                Nutrition Timing
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {isPostWorkoutMode
                  ? 'Återhämtning efter dagens pass'
                  : hasScheduledTime
                    ? `Träning kl ${formatHour(workoutHour!)}`
                    : 'Dagens träning'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 text-emerald-600 hover:text-emerald-800
                       hover:bg-emerald-100
                       dark:text-emerald-400 dark:hover:text-emerald-200
                       dark:hover:bg-emerald-900/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Workout info */}
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {workout.name}
          {workout.duration && ` ${workout.duration} min`}
          {workout.intensity && ` (${getIntensityLabel(workout.intensity)})`}
        </p>

        {/* Main timing message */}
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {isPostWorkoutMode
                ? (postWorkout?.timingLabel || 'Ät inom 30-60 minuter efter passet')
                : mealDeadline !== null
                  ? `Ät senast kl ${formatHour(mealDeadline)}`
                  : 'Ät 2-3 timmar före passet'}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {isPostWorkoutMode
                ? (postWorkout?.recommendation ||
                  `${postWorkout?.carbsTargetG ? `${postWorkout.carbsTargetG}g` : '60-80g'} kolhydrater och ${postWorkout?.proteinTargetG ? `${postWorkout.proteinTargetG}g` : '20-30g'} protein för återhämtning`)
                : (preWorkout?.recommendation ||
                  `${preWorkout?.carbsTargetG ? `${preWorkout.carbsTargetG}g` : '60-80g'} kolhydrater (pasta, ris, potatis)`)}
            </p>
          </div>
        </div>

        {/* Hydration tip */}
        <div className="flex items-start gap-2">
          <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {isPostWorkoutMode
              ? `Drick ${postWorkout?.hydrationMl || 500}ml vätska efter passet och fortsätt fylla på under eftermiddagen`
              : `Drick ${preWorkout?.hydrationMl || 500}ml vatten innan passet`}
          </p>
        </div>

        {/* Expandable details */}
        {isExpanded && (isPostWorkoutMode ? postWorkout : preWorkout) && (
          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 space-y-2">
            {(isPostWorkoutMode ? postWorkout : preWorkout)?.timingLabel && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {(isPostWorkoutMode ? postWorkout : preWorkout)?.timingLabel}
              </p>
            )}
            {(isPostWorkoutMode ? postWorkout : preWorkout)?.foodSuggestions && ((isPostWorkoutMode ? postWorkout : preWorkout)?.foodSuggestions.length || 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  Förslag:
                </p>
                <ul className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
                  {(isPostWorkoutMode ? postWorkout : preWorkout)!.foodSuggestions.slice(0, 4).map((food, i) => (
                    <li key={i}>
                      • {food.nameSv} ({food.portion})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(isPostWorkoutMode ? postWorkout : preWorkout)?.reasoning && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                {(isPostWorkoutMode ? postWorkout : preWorkout)?.reasoning}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {(isPostWorkoutMode ? postWorkout : preWorkout) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100
                         dark:text-emerald-400 dark:hover:text-emerald-200
                         dark:hover:bg-emerald-900/50 gap-1 px-2"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
              {isExpanded ? 'Visa mindre' : 'Visa mer'}
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-emerald-300 hover:bg-emerald-100
                       dark:border-emerald-700 dark:hover:bg-emerald-900/50
                       text-emerald-700 dark:text-emerald-300 ml-auto"
          >
            <Link href={`${basePath}/athlete/settings/nutrition`}>Kostinställningar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
