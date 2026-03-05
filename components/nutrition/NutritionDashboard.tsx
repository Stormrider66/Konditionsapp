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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Utensils,
  Settings,
  RefreshCw,
  AlertCircle,
  Calendar,
  Sparkles,
  Camera,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { NutritionTargets, NutritionTargetsSkeleton } from './NutritionTargets'
import { NutritionTrendChart } from './NutritionTrendChart'
import { WorkoutNutritionCard, WorkoutNutritionCardSkeleton } from './WorkoutNutritionCard'
import { NutritionTipCard } from './NutritionTipCard'
import { FoodPhotoScanner } from './FoodPhotoScanner'
import { NutritionScore } from '@/components/athlete/nutrition/NutritionScore'
import { DeficitSurplusTracker } from '@/components/athlete/nutrition/DeficitSurplusTracker'
import type { DailyNutritionGuidance, NutritionTip } from '@/lib/nutrition-timing'

interface DailyAggregate {
  date: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  mealCount: number
}

interface NutritionGoal {
  goalType: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP'
  targetWeightKg?: number | null
  weeklyChangeKg?: number | null
}

interface NutritionDashboardProps {
  clientId: string
}

export function NutritionDashboard({ clientId }: NutritionDashboardProps) {
  const basePath = useBasePath()
  const [guidance, setGuidance] = useState<DailyNutritionGuidance | null>(null)
  const [dailyHistory, setDailyHistory] = useState<DailyAggregate[]>([])
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const fetchAllData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const today = new Date()
      const fourteenDaysAgo = new Date(today)
      fourteenDaysAgo.setDate(today.getDate() - 13)
      const startDate = fourteenDaysAgo.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      const [guidanceRes, mealsRes, goalsRes] = await Promise.all([
        fetch('/api/nutrition/guidance'),
        fetch(`/api/meals?startDate=${startDate}&endDate=${endDate}`),
        fetch('/api/nutrition/goals'),
      ])

      if (!guidanceRes.ok) {
        throw new Error('Kunde inte hämta kostråd')
      }
      const guidanceData = await guidanceRes.json()
      setGuidance(guidanceData.guidance)

      if (mealsRes.ok) {
        const mealsData = await mealsRes.json()
        setDailyHistory(mealsData.data?.dailyAggregates ?? [])
      }

      if (goalsRes.ok) {
        const goalsData = await goalsRes.json()
        setNutritionGoal(goalsData.goal ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
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
            <Button variant="outline" onClick={fetchAllData} className="gap-2 border-red-500/30 hover:bg-red-500/20 text-red-200">
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
              <Link href={`${basePath}/athlete/settings/nutrition`}>
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

  // Derive today's consumed totals from dailyHistory
  const todayStr = new Date().toISOString().split('T')[0]
  const todayData = dailyHistory.find(d => d.date === todayStr)
  const todayConsumed = todayData
    ? { calories: todayData.calories, proteinGrams: todayData.proteinGrams, carbsGrams: todayData.carbsGrams, fatGrams: todayData.fatGrams }
    : undefined

  // Macro goals from guidance targets
  const macroGoals = {
    calories: guidance.targets.caloriesKcal,
    proteinGrams: guidance.targets.proteinG,
    carbsGrams: guidance.targets.carbsG,
    fatGrams: guidance.targets.fatG,
  }

  // Map goalType to deficit/surplus/maintenance
  const goalMapping: 'deficit' | 'surplus' | 'maintenance' =
    nutritionGoal?.goalType === 'WEIGHT_LOSS' ? 'deficit'
    : nutritionGoal?.goalType === 'WEIGHT_GAIN' ? 'surplus'
    : 'maintenance'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors">Kost & Näring</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400 capitalize transition-colors">{formattedDate}</span>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all" title="Koststatistik">
            <Link href={`${basePath}/athlete/nutrition`}>
              <TrendingUp className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScannerOpen(true)}
            className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
            title="Skanna måltid"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAllData}
            className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
            title="Uppdatera"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all" title="Inställningar">
            <Link href={`${basePath}/athlete/settings/nutrition`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Double day or race week alert */}
      {guidance.isDoubleDay && (
        <Alert className="bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <span className="font-medium text-amber-900 dark:text-amber-100">Dubbeldag!</span> Du har två pass idag.
            Fokusera på snabb återhämtning mellan passen.
          </AlertDescription>
        </Alert>
      )}

      {guidance.isRaceWeek && (
        <Alert className="bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-500/30">
          <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-purple-800 dark:text-purple-200">
            <span className="font-medium text-purple-900 dark:text-purple-100">Tävlingsvecka!</span> Öka kolhydratintaget
            och minska fiberrik mat de sista dagarna.
          </AlertDescription>
        </Alert>
      )}

      {/* Main grid layout */}
      <div className="grid grid-cols-1 gap-4">
        {/* Targets with consumed progress */}
        <NutritionTargets
          targets={guidance.targets}
          consumed={todayConsumed}
          isRestDay={guidance.isRestDay}
          variant="glass"
        />

        {/* Trend chart - only when there's logged data */}
        {dailyHistory.length > 0 && (
          <NutritionTrendChart
            dailyData={dailyHistory}
            goals={macroGoals}
            variant="glass"
          />
        )}

        {/* Score + Deficit/Surplus side by side - only when there's logged data */}
        {dailyHistory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NutritionScore
              dailyData={dailyHistory}
              goals={macroGoals}
              variant="glass"
            />
            <DeficitSurplusTracker
              dailyData={dailyHistory.map(d => ({
                date: d.date,
                calories: d.calories,
                tdee: guidance.targets.caloriesKcal,
              }))}
              goal={goalMapping}
              targetWeeklyChange={nutritionGoal?.weeklyChangeKg ?? 0}
              targetWeight={nutritionGoal?.targetWeightKg ?? undefined}
              variant="glass"
            />
          </div>
        )}

        {/* Meal structure if available */}
        {guidance.mealSuggestions && (
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400 transition-colors">Måltidsstruktur</GlassCardTitle>
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
                <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-full transition-colors">
                  <Calendar className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                </div>
                <p className="font-medium text-slate-900 dark:text-white transition-colors">Vilodag</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">
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
              <GlassCardTitle className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 transition-colors">
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
                    <span className="text-slate-700 dark:text-slate-300 transition-colors">{workout.name}</span>
                    <span className="text-slate-500 transition-colors">
                      {workout.duration && `${workout.duration} min`}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-orange-600 dark:text-orange-400 pt-2 transition-colors">
                  Tip: Tänk på att fylla på glykogenlagren ikväll!
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Tips */}
        {guidance.tips && guidance.tips.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">Tips för idag</h3>
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

      {/* Food Photo Scanner Sheet */}
      <Sheet open={scannerOpen} onOpenChange={setScannerOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-slate-950 border-white/10">
          <SheetHeader>
            <SheetTitle className="text-white">Skanna måltid</SheetTitle>
            <SheetDescription className="text-slate-400">
              Ta en bild av din mat för att automatiskt beräkna kalorier och makros
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <FoodPhotoScanner
              onMealSaved={() => {
                fetchAllData()
              }}
              onClose={() => setScannerOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function MealRow({ label, suggestion }: { label: string; suggestion: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-200 dark:border-white/5 last:border-0 transition-colors">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-32 flex-shrink-0 transition-colors">
        {label}
      </span>
      <span className="text-sm text-slate-700 dark:text-slate-300 transition-colors">{suggestion}</span>
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
