'use client'

import { useState, useEffect } from 'react'
import { GlassCard, GlassCardHeader, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    <GlassCard
      glow="emerald"
      gradient
      className="group border-emerald-200/30 dark:border-emerald-800/20 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300"
    >
      <GlassCardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20 rounded-full shadow-inner transition-all duration-300 group-hover:bg-emerald-500/20">
              <Utensils className="h-5 w-5 text-emerald-600 dark:text-emerald-400 transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                {t('title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
            className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/50 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* Workout info */}
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {workout.name}
          {workout.duration && ` • ${workout.duration} min`}
          {workout.intensity && ` • ${getIntensityLabel(workout.intensity)}`}
        </p>

        {/* Main timing message */}
        <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/30 bg-emerald-500/5 hover:shadow-sm transition-all duration-300">
          <Clock className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isPostWorkoutMode
                ? (postWorkout?.timingLabel || t('timing.eatWithinRecoveryWindow'))
                : mealDeadline !== null
                  ? t('timing.eatBy', { time: formatHour(mealDeadline) })
                  : t('timing.eatBeforeWorkout')}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
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
        <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/30 bg-cyan-500/5 hover:shadow-sm transition-all duration-300">
          <Droplets className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
            {isPostWorkoutMode
              ? t('hydration.afterWorkout', { amount: postWorkout?.hydrationMl || 500 })
              : t('hydration.beforeWorkout', { amount: preWorkout?.hydrationMl || 500 })}
          </p>
        </div>

        {/* Expandable details */}
        {isExpanded && (isPostWorkoutMode ? postWorkout : preWorkout) && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/60 space-y-3">
            {(isPostWorkoutMode ? postWorkout : preWorkout)?.timingLabel && (
              <Badge variant="outline" className="bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] font-medium uppercase tracking-wider">
                {(isPostWorkoutMode ? postWorkout : preWorkout)?.timingLabel}
              </Badge>
            )}
            {(isPostWorkoutMode ? postWorkout : preWorkout)?.foodSuggestions && ((isPostWorkoutMode ? postWorkout : preWorkout)?.foodSuggestions.length || 0) > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5 text-emerald-500" />
                  {t('suggestions')}
                </p>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pl-1">
                  {(isPostWorkoutMode ? postWorkout : preWorkout)!.foodSuggestions.slice(0, 4).map((food, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-emerald-500">•</span>
                      <span>{locale === 'en' ? food.nameEn : food.nameSv} ({food.portion})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(isPostWorkoutMode ? postWorkout : preWorkout)?.reasoning && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/20 p-2.5 rounded-lg border border-slate-100/50 dark:border-slate-800/20">
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
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100
                         dark:text-slate-400 dark:hover:text-white
                         dark:hover:bg-slate-800/50 gap-1 px-2.5 rounded-full text-xs font-semibold"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-250 ${isExpanded ? 'rotate-180' : ''}`}
              />
              {isExpanded ? t('showLess') : t('showMore')}
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60
                       hover:bg-slate-50 dark:hover:bg-slate-800
                       text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
                       rounded-full shadow-sm hover:shadow text-xs font-medium ml-auto"
          >
            <Link href={`${basePath}/athlete/settings/nutrition`}>{t('nutritionSettings')}</Link>
          </Button>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
