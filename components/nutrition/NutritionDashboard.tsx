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
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
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
    return <NutritionDashboardSkeleton variant="glass" />
  }

  if (error) {
    return (
      <GlassCard className="bg-red-950/20 border-red-500/20">
        <GlassCardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-red-200">{error}</p>
            <Button variant="outline" onClick={fetchGuidance} className="gap-2 border-red-500/30 hover:bg-red-500/20 text-red-200">
              <RefreshCw className="h-4 w-4" />
              Försök igen
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (!guidance) {
    return (
      <GlassCard>
        <GlassCardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Utensils className="h-10 w-10 text-slate-400" />
            <p className="text-slate-200">Ingen kostdata tillgänglig</p>
            <p className="text-sm text-slate-400">
              Ställ in dina kostpreferenser för att få personliga rekommendationer
            </p>
            <Button asChild variant="outline" className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white">
              <Link href="/athlete/settings/nutrition">
                <Settings className="h-4 w-4" />
                Inställningar
              </Link>
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const formattedDate = format(new Date(guidance.date), 'EEEE d MMMM', { locale: sv })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Kost & Näring</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 capitalize">{formattedDate}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchGuidance}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
            title="Uppdatera"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" title="Inställningar">
            <Link href="/athlete/settings/nutrition">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Double day or race week alert */}
      {guidance.isDoubleDay && (
        <Alert className="bg-amber-950/40 border-amber-500/30">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-200">
            <span className="font-medium text-amber-100">Dubbeldag!</span> Du har två pass idag.
            Fokusera på snabb återhämtning mellan passen.
          </AlertDescription>
        </Alert>
      )}

      {guidance.isRaceWeek && (
        <Alert className="bg-purple-950/40 border-purple-500/30">
          <Calendar className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-purple-200">
            <span className="font-medium text-purple-100">Tävlingsvecka!</span> Öka kolhydratintaget
            och minska fiberrik mat de sista dagarna.
          </AlertDescription>
        </Alert>
      )}

      {/* Main grid layout */}
      <div className="grid grid-cols-1 gap-4">
        {/* Targets */}
        <NutritionTargets
          targets={guidance.targets}
          isRestDay={guidance.isRestDay}
          variant="glass"
        />

        {/* Meal structure if available */}
        {guidance.mealSuggestions && (
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-base text-cyan-400">Måltidsstruktur</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
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
            </GlassCardContent>
          </GlassCard>
        )}

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
              variant="glass"
            />
          ))
        ) : (
          <GlassCard>
            <GlassCardContent className="p-6">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 bg-slate-800/50 rounded-full">
                  <Calendar className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-medium text-white">Vilodag</p>
                <p className="text-sm text-slate-400">
                  Inga träningspass schemalagda idag.
                  Perfekt dag för fiberrik mat och mikronäringsämnen!
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Tomorrow preview if any workouts */}
        {guidance.tomorrowsWorkouts.length > 0 && (
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Imorgon
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-2">
                {guidance.tomorrowsWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-300">{workout.name}</span>
                    <span className="text-slate-500">
                      {workout.duration && `${workout.duration} min`}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-orange-400 pt-2">
                  Tip: Tänk på att fylla på glykogenlagren ikväll!
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Tips */}
        {guidance.tips && guidance.tips.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-400">Tips för idag</h3>
            {guidance.tips.slice(0, 3).map((tip, index) => (
              <NutritionTipCard
                key={index}
                tip={tip}
                compact
                showDismiss={false}
                variant="glass"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MealRow({ label, suggestion }: { label: string; suggestion: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs font-medium text-slate-400 w-32 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-300">{suggestion}</span>
    </div>
  )
}

/**
 * Loading skeleton for NutritionDashboard
 */
export function NutritionDashboardSkeleton({ variant = 'default' }: { variant?: 'default' | 'glass' }) {
  const isGlass = variant === 'glass'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded bg-slate-800" />
          <Skeleton className="h-6 w-32 bg-slate-800" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 bg-slate-800" />
          <Skeleton className="h-8 w-8 rounded bg-slate-800" />
          <Skeleton className="h-8 w-8 rounded bg-slate-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-4">
          <NutritionTargetsSkeleton variant={variant} />
          <div className={isGlass ? "border border-white/10 rounded-xl p-6 bg-slate-900/50" : "bg-white shadow-sm p-6 rounded-lg"}>
            <div className="space-y-3">
              <Skeleton className="h-5 w-28 mb-4 bg-slate-700" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-4 w-32 bg-slate-800" />
                  <Skeleton className="h-4 flex-1 bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
