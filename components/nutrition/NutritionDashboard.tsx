/**
 * Nutrition Dashboard Component
 *
 * Main nutrition section for the athlete dashboard.
 * Fetches and displays:
 * - Daily macro targets
 * - Workout-specific nutrition guidance
 * - Tips and recommendations
 * - Meal structure suggestions
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Utensils,
  Settings,
  RefreshCw,
  AlertCircle,
  Calendar,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { NutritionTargets, NutritionTargetsSkeleton } from './NutritionTargets'
import { WorkoutNutritionCard, WorkoutNutritionCardSkeleton } from './WorkoutNutritionCard'
import { NutritionTipCard } from './NutritionTipCard'
import type { DailyNutritionGuidance, NutritionTip } from '@/lib/nutrition-timing'

interface NutritionDashboardProps {
  clientId: string
}

export function NutritionDashboard({ clientId }: NutritionDashboardProps) {
  const [guidance, setGuidance] = useState<DailyNutritionGuidance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGuidance = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/nutrition/guidance')
      if (!response.ok) {
        throw new Error('Kunde inte hämta kostråd')
      }
      const data = await response.json()
      setGuidance(data.guidance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGuidance()
  }, [clientId])

  if (isLoading) {
    return <NutritionDashboardSkeleton />
  }

  if (error) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-slate-400" />
            <p className="text-slate-600">{error}</p>
            <Button variant="outline" onClick={fetchGuidance} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Försök igen
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!guidance) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Utensils className="h-10 w-10 text-slate-400" />
            <p className="text-slate-600">Ingen kostdata tillgänglig</p>
            <p className="text-sm text-slate-500">
              Ställ in dina kostpreferenser för att få personliga rekommendationer
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/athlete/settings/nutrition">
                <Settings className="h-4 w-4" />
                Inställningar
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formattedDate = format(new Date(guidance.date), 'EEEE d MMMM', { locale: sv })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Kost & Näring</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 capitalize">{formattedDate}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchGuidance}
            className="h-8 w-8"
            title="Uppdatera"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Inställningar">
            <Link href="/athlete/settings/nutrition">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Double day or race week alert */}
      {guidance.isDoubleDay && (
        <Alert className="bg-amber-50 border-amber-200">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <span className="font-medium">Dubbeldag!</span> Du har två pass idag.
            Fokusera på snabb återhämtning mellan passen.
          </AlertDescription>
        </Alert>
      )}

      {guidance.isRaceWeek && (
        <Alert className="bg-purple-50 border-purple-200">
          <Calendar className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            <span className="font-medium">Tävlingsvecka!</span> Öka kolhydratintaget
            och minska fiberrik mat de sista dagarna.
          </AlertDescription>
        </Alert>
      )}

      {/* Main grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Targets */}
        <div className="space-y-4">
          <NutritionTargets
            targets={guidance.targets}
            isRestDay={guidance.isRestDay}
          />

          {/* Meal structure if available */}
          {guidance.mealSuggestions && (
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Måltidsstruktur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {guidance.mealSuggestions.breakfast && (
                    <MealRow label="Frukost" suggestion={guidance.mealSuggestions.breakfast} />
                  )}
                  {guidance.mealSuggestions.morningSnack && (
                    <MealRow label="Förmiddagsmellanmål" suggestion={guidance.mealSuggestions.morningSnack} />
                  )}
                  {guidance.mealSuggestions.lunch && (
                    <MealRow label="Lunch" suggestion={guidance.mealSuggestions.lunch} />
                  )}
                  {guidance.mealSuggestions.afternoonSnack && (
                    <MealRow label="Eftermiddagsmellanmål" suggestion={guidance.mealSuggestions.afternoonSnack} />
                  )}
                  {guidance.mealSuggestions.dinner && (
                    <MealRow label="Middag" suggestion={guidance.mealSuggestions.dinner} />
                  )}
                  {guidance.mealSuggestions.eveningSnack && (
                    <MealRow label="Kvällsmellanmål" suggestion={guidance.mealSuggestions.eveningSnack} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Workout guidance & tips */}
        <div className="space-y-4">
          {/* Workout-specific guidance */}
          {guidance.todaysWorkouts.length > 0 ? (
            guidance.todaysWorkouts.map((workout, index) => (
              <WorkoutNutritionCard
                key={workout.id}
                workout={workout}
                preWorkout={guidance.preWorkoutGuidance?.[index]}
                duringWorkout={guidance.duringWorkoutGuidance?.find(
                  (g) => g.timingLabel?.includes(workout.name)
                )}
                postWorkout={guidance.postWorkoutGuidance?.[index]}
              />
            ))
          ) : (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-slate-100 rounded-full">
                    <Calendar className="h-6 w-6 text-slate-500" />
                  </div>
                  <p className="font-medium text-slate-900">Vilodag</p>
                  <p className="text-sm text-slate-600">
                    Inga träningspass schemalagda idag.
                    Perfekt dag för fiberrik mat och mikronäringsämnen!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tomorrow preview if any workouts */}
          {guidance.tomorrowsWorkouts.length > 0 && (
            <Card className="bg-slate-50 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Imorgon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {guidance.tomorrowsWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-700">{workout.name}</span>
                      <span className="text-slate-500">
                        {workout.duration && `${workout.duration} min`}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 pt-2">
                    Tänk på att fylla på glykogenlagren ikväll!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {guidance.tips && guidance.tips.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-700">Tips för idag</h3>
              {guidance.tips.slice(0, 3).map((tip, index) => (
                <NutritionTipCard
                  key={index}
                  tip={tip}
                  compact
                  showDismiss={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MealRow({ label, suggestion }: { label: string; suggestion: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <span className="text-xs font-medium text-slate-500 w-32 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-700">{suggestion}</span>
    </div>
  )
}

/**
 * Loading skeleton for NutritionDashboard
 */
export function NutritionDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <NutritionTargetsSkeleton />
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <WorkoutNutritionCardSkeleton />
          <Card className="bg-slate-50 border-dashed">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
