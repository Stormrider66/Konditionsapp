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
import type { DailyNutritionGuidance } from '@/lib/nutrition-timing'

const DISMISS_KEY = 'nutritionTimingDismissed'

export function NutritionTimingCard() {
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

  const workout = guidance.todaysWorkouts[0]
  const preWorkout = guidance.preWorkoutGuidance?.[0]

  // Calculate workout hour and meal deadline
  const workoutHour = workout.scheduledTime
    ? new Date(workout.scheduledTime).getHours()
    : 16 // default assumption if no time set
  const mealDeadline = Math.max(workoutHour - 2, 10) // At least 10:00

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
                Träning kl {formatHour(workoutHour)}
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
              Ät senast kl {formatHour(mealDeadline)}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {preWorkout?.recommendation ||
                `${preWorkout?.carbsTargetG ? `${preWorkout.carbsTargetG}g` : '60-80g'} kolhydrater (pasta, ris, potatis)`}
            </p>
          </div>
        </div>

        {/* Hydration tip */}
        <div className="flex items-start gap-2">
          <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Drick {preWorkout?.hydrationMl || 500}ml vatten innan passet
          </p>
        </div>

        {/* Expandable details */}
        {isExpanded && preWorkout && (
          <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 space-y-2">
            {preWorkout.timingLabel && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {preWorkout.timingLabel}
              </p>
            )}
            {preWorkout.foodSuggestions && preWorkout.foodSuggestions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  Förslag:
                </p>
                <ul className="text-xs text-emerald-700 dark:text-emerald-300 space-y-0.5">
                  {preWorkout.foodSuggestions.slice(0, 4).map((food, i) => (
                    <li key={i}>
                      • {food.nameSv} ({food.portion})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preWorkout.reasoning && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                {preWorkout.reasoning}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {preWorkout && (
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
            <Link href="/athlete/settings/nutrition">Kostinställningar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
