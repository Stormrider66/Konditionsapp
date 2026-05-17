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
import { useLocale, useTranslations } from '@/i18n/client'
import type { DailyNutritionGuidance } from '@/lib/nutrition-timing'

const DISMISS_KEY = 'nutritionTimingDismissed'

export function NutritionTimingCard() {
  const basePath = useBasePath()
  const t = useTranslations('components.nutritionTimingCard')
  const locale = useLocale()
  const [guidance, setGuidance] = useState<DailyNutritionGuidance | null>(null)
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(DISMISS_KEY) === new Date().toDateString()
  })
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (isDismissed) return

    async function fetchGuidance() {
      try {
        const response = await fetch('/api/nutrition/guidance')
        if (response.ok) {
          const data = await response.json()
          setGuidance(data.guidance)
        }
      } catch (error) {
        console.error('Error fetching nutrition guidance:', error)
      }
    }

    void fetchGuidance()
  }, [isDismissed])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISS_KEY, new Date().toDateString())
    }
    setIsDismissed(true)
  }

  // Don't show if dismissed, rest day, or no workouts
  if (isDismissed) return null
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
    switch (intensity) {
      case 'RECOVERY':
        return t('intensities.recovery')
      case 'EASY':
        return t('intensities.easy')
      case 'MODERATE':
        return t('intensities.moderate')
      case 'THRESHOLD':
        return t('intensities.threshold')
      case 'INTERVAL':
        return t('intensities.interval')
      case 'MAX':
        return t('intensities.max')
      default:
        return intensity
    }
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
                {t('title')}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {isPostWorkoutMode
                  ? t('subtitle.recovery')
                  : hasScheduledTime
                    ? t('subtitle.trainingAt', { time: formatHour(workoutHour!) })
                    : t('subtitle.todaysTraining')}
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
                ? (postWorkout?.timingLabel || t('timing.eatWithinRecoveryWindow'))
                : mealDeadline !== null
                  ? t('timing.eatBy', { time: formatHour(mealDeadline) })
                  : t('timing.eatBeforeWorkout')}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {isPostWorkoutMode
                ? (postWorkout?.recommendation ||
                  t('recommendations.recovery', {
                    carbs: postWorkout?.carbsTargetG ? `${postWorkout.carbsTargetG}g` : '60-80g',
                    protein: postWorkout?.proteinTargetG ? `${postWorkout.proteinTargetG}g` : '20-30g',
                  }))
                : (preWorkout?.recommendation ||
                  t('recommendations.preWorkout', {
                    carbs: preWorkout?.carbsTargetG ? `${preWorkout.carbsTargetG}g` : '60-80g',
                  }))}
            </p>
          </div>
        </div>

        {/* Hydration tip */}
        <div className="flex items-start gap-2">
          <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {isPostWorkoutMode
              ? t('hydration.afterWorkout', { amount: postWorkout?.hydrationMl || 500 })
              : t('hydration.beforeWorkout', { amount: preWorkout?.hydrationMl || 500 })}
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
                  {t('suggestions')}
                </p>
                <ul className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
                  {(isPostWorkoutMode ? postWorkout : preWorkout)!.foodSuggestions.slice(0, 4).map((food, i) => (
                    <li key={i}>
                      - {locale === 'en' ? food.nameEn : food.nameSv} ({food.portion})
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
              {isExpanded ? t('showLess') : t('showMore')}
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
            <Link href={`${basePath}/athlete/settings/nutrition`}>{t('nutritionSettings')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
