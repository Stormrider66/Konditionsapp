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

import { useCallback, useEffect, useRef, useState } from 'react'
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
  Camera,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, subDays, addDays as addDaysFn } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { NutritionTargets, NutritionTargetsSkeleton } from './NutritionTargets'
import { NutritionTrendChart } from './NutritionTrendChart'
import { WorkoutNutritionCard } from './WorkoutNutritionCard'
import { NutritionTipCard } from './NutritionTipCard'
import { NutritionScore } from '@/components/athlete/nutrition/NutritionScore'
import { DeficitSurplusTracker } from '@/components/athlete/nutrition/DeficitSurplusTracker'
import type { DailyNutritionGuidance } from '@/lib/nutrition-timing'
import { useLocale, useTranslations } from '@/i18n/client'

interface DailyAggregate {
  date: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  mealCount: number
}

interface DailyTargetRow {
  date: string
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

interface NutritionGoal {
  goalType: 'WEIGHT_LOSS' | 'WEIGHT_GAIN' | 'MAINTAIN' | 'BODY_RECOMP'
  targetWeightKg?: number | null
  weeklyChangeKg?: number | null
}

interface NutritionDashboardProps {
  clientId: string
}

const HISTORY_DAYS = 14

function toISODate(d: Date): string {
  // Use local date components so the date string matches what the athlete sees
  // on their device, not the server's UTC day (avoids off-by-one near midnight).
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function NutritionDashboard({ clientId }: NutritionDashboardProps) {
  const t = useTranslations('components.nutritionDashboard')
  const locale = useLocale()
  const basePath = useBasePath()

  // Compute "today" lazily and only on the client — avoids SSR/client hydration
  // mismatch (React error #418) when the two clocks disagree on the date.
  const [dates, setDates] = useState<{ todayStr: string; oldestStr: string } | null>(null)
  useEffect(() => {
    const now = new Date()
    setDates({ todayStr: toISODate(now), oldestStr: toISODate(subDays(now, HISTORY_DAYS - 1)) })
  }, [])
  const todayStr = dates?.todayStr ?? ''
  const oldestStr = dates?.oldestStr ?? ''

  const [selectedDate, setSelectedDate] = useState<string>('')
  useEffect(() => {
    if (dates && !selectedDate) setSelectedDate(dates.todayStr)
  }, [dates, selectedDate])

  const [guidance, setGuidance] = useState<DailyNutritionGuidance | null>(null)
  const [dailyHistory, setDailyHistory] = useState<DailyAggregate[]>([])
  const [dailyTargets, setDailyTargets] = useState<DailyTargetRow[]>([])
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Guard against stale guidance responses: when the user clicks chevrons
  // rapidly, in-flight requests for older dates must not overwrite a newer one.
  const guidanceRequestIdRef = useRef(0)

  const fetchRangeData = useCallback(async () => {
    if (!oldestStr || !todayStr) return
    const [mealsRes, goalsRes, targetsRes] = await Promise.all([
      fetch(`/api/meals?startDate=${oldestStr}&endDate=${todayStr}`),
      fetch('/api/nutrition/goals'),
      fetch(`/api/nutrition/daily-targets?startDate=${oldestStr}&endDate=${todayStr}`),
    ])

    if (mealsRes.ok) {
      const mealsData = await mealsRes.json()
      setDailyHistory(mealsData.data?.dailyAggregates ?? [])
    }
    if (goalsRes.ok) {
      const goalsData = await goalsRes.json()
      setNutritionGoal(goalsData.goal ?? null)
    }
    if (targetsRes.ok) {
      const targetsData = await targetsRes.json()
      setDailyTargets(targetsData.targets ?? [])
    }
  }, [oldestStr, todayStr])

  const fetchGuidance = useCallback(async (date: string) => {
    if (!date || !todayStr) return
    const reqId = ++guidanceRequestIdRef.current
    const qs = date === todayStr ? '' : `?date=${date}`
    const res = await fetch(`/api/nutrition/guidance${qs}`)
    if (!res.ok) throw new Error(t('errors.fetchGuidance'))
    const data = await res.json()
    // Drop this response if a newer request has been dispatched in the meantime.
    if (reqId === guidanceRequestIdRef.current) setGuidance(data.guidance)
  }, [todayStr, t])

  const fetchAll = useCallback(async () => {
    if (!selectedDate || !todayStr) return
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([fetchGuidance(selectedDate), fetchRangeData()])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchGuidance, fetchRangeData, selectedDate, todayStr, t])

  useEffect(() => {
    if (selectedDate && todayStr) void fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, selectedDate && todayStr ? 'ready' : 'pending'])

  // Refetch guidance when the selected date changes (range data stays the same).
  useEffect(() => {
    if (!selectedDate || !todayStr) return
    fetchGuidance(selectedDate).catch((err) => {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    })
  }, [selectedDate, todayStr, fetchGuidance, t])

  // Re-fetch when a meal or workout changes — bumps today's macro targets.
  useEffect(() => {
    const handler = () => fetchAll()
    window.addEventListener('meal-logged', handler)
    window.addEventListener('workout-logged', handler)
    return () => {
      window.removeEventListener('meal-logged', handler)
      window.removeEventListener('workout-logged', handler)
    }
  }, [fetchAll])

  const canGoBack = Boolean(selectedDate) && Boolean(oldestStr) && selectedDate > oldestStr
  const canGoForward = Boolean(selectedDate) && Boolean(todayStr) && selectedDate < todayStr
  const isToday = Boolean(selectedDate) && selectedDate === todayStr

  const goPrev = useCallback(() => {
    setSelectedDate((prev) => {
      if (!prev || !oldestStr || prev <= oldestStr) return prev
      return toISODate(subDays(parseISO(prev), 1))
    })
  }, [oldestStr])

  const goNext = useCallback(() => {
    setSelectedDate((prev) => {
      if (!prev || !todayStr || prev >= todayStr) return prev
      return toISODate(addDaysFn(parseISO(prev), 1))
    })
  }, [todayStr])

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
            <Button variant="outline" onClick={fetchAll} className="gap-2 border-red-500/30 hover:bg-red-500/20 text-red-200">
              <RefreshCw className="h-4 w-4" />
              {t('actions.retry')}
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
            <p className="text-slate-200">{t('empty.title')}</p>
            <p className="text-sm text-slate-400">
              {t('empty.description')}
            </p>
            <Button asChild variant="outline" className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white">
              <Link href={`${basePath}/athlete/settings#nutrition-settings`}>
                <Settings className="h-4 w-4" />
                {t('actions.settings')}
              </Link>
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  const formattedDate = format(parseISO(selectedDate), 'EEEE d MMMM', { locale: locale === 'en' ? enUS : sv })

  // Consumed intake for the selected day (may be empty on past days with no logs)
  const selectedData = dailyHistory.find(d => d.date === selectedDate)
  const selectedConsumed = selectedData
    ? { calories: selectedData.calories, proteinGrams: selectedData.proteinGrams, carbsGrams: selectedData.carbsGrams, fatGrams: selectedData.fatGrams }
    : undefined

  // Macro goals from guidance targets (already anchored on selectedDate server-side)
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors">{t('title')}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            disabled={!canGoBack}
            className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
            title={t('actions.previousDay')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            disabled={isToday}
            className="text-sm text-slate-500 dark:text-slate-400 capitalize transition-colors min-w-[110px] text-center hover:text-slate-900 dark:hover:text-white disabled:hover:text-slate-500 dark:disabled:hover:text-slate-400"
            title={isToday ? formattedDate : t('actions.jumpToToday')}
          >
            {formattedDate}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            disabled={!canGoForward}
            className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
            title={t('actions.nextDay')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all" title={t('actions.nutritionStats')}>
            <Link href={`${basePath}/athlete/nutrition`}>
              <TrendingUp className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all" title={t('actions.scanMeal')}>
            <Link href={`${basePath}/athlete/nutrition/scan?returnTo=nutrition`}>
              <Camera className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchAll}
            className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
            title={t('actions.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all" title={t('actions.settings')}>
            <Link href={`${basePath}/athlete/settings#nutrition-settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Double day or race week alert — only on today (copy references "idag"). */}
      {isToday && guidance.isDoubleDay && (
        <Alert className="bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <span className="font-medium text-amber-900 dark:text-amber-100">{t('alerts.doubleDay.title')}</span> {t('alerts.doubleDay.description')}
          </AlertDescription>
        </Alert>
      )}

      {isToday && guidance.isRaceWeek && (
        <Alert className="bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-500/30">
          <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-purple-800 dark:text-purple-200">
            <span className="font-medium text-purple-900 dark:text-purple-100">{t('alerts.raceWeek.title')}</span> {t('alerts.raceWeek.description')}
          </AlertDescription>
        </Alert>
      )}

      {/* Main grid layout */}
      <div className="grid grid-cols-1 gap-4">
        {/* Targets with consumed progress */}
        <NutritionTargets
          targets={guidance.targets}
          consumed={selectedConsumed}
          isRestDay={guidance.isRestDay}
          variant="glass"
        />

        {/* Trend chart - only when there's logged data */}
        {dailyHistory.length > 0 && (
          <NutritionTrendChart
            dailyData={dailyHistory}
            goals={macroGoals}
            dailyTargets={dailyTargets}
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

        {/* Meal structure — only relevant for today (references pre/post-workout timing). */}
        {isToday && guidance.mealSuggestions && (
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400 transition-colors">{t('mealStructure.title')}</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-2">
                {guidance.mealSuggestions.breakfast && (
                  <MealRow label={t('mealStructure.meals.breakfast')} suggestion={guidance.mealSuggestions.breakfast} />
                )}
                {guidance.mealSuggestions.morningSnack && (
                  <MealRow label={t('mealStructure.meals.morningSnack')} suggestion={guidance.mealSuggestions.morningSnack} />
                )}
                {guidance.mealSuggestions.lunch && (
                  <MealRow label={t('mealStructure.meals.lunch')} suggestion={guidance.mealSuggestions.lunch} />
                )}
                {guidance.mealSuggestions.afternoonSnack && (
                  <MealRow label={t('mealStructure.meals.afternoonSnack')} suggestion={guidance.mealSuggestions.afternoonSnack} />
                )}
                {guidance.mealSuggestions.dinner && (
                  <MealRow label={t('mealStructure.meals.dinner')} suggestion={guidance.mealSuggestions.dinner} />
                )}
                {guidance.mealSuggestions.eveningSnack && (
                  <MealRow label={t('mealStructure.meals.eveningSnack')} suggestion={guidance.mealSuggestions.eveningSnack} />
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Workout-specific guidance — pre/during cards only make sense on today. */}
        {guidance.todaysWorkouts.length > 0 ? (
          guidance.todaysWorkouts.map((workout, index) => (
            <WorkoutNutritionCard
              key={workout.id}
              workout={workout}
              preWorkout={isToday ? guidance.preWorkoutGuidance?.[index] : undefined}
              duringWorkout={isToday ? guidance.duringWorkoutGuidance?.find(
                (g) => g.timingLabel?.includes(workout.name)
              ) : undefined}
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
                <p className="font-medium text-slate-900 dark:text-white transition-colors">{t('restDay.title')}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">
                  {isToday
                    ? t('restDay.todayDescription')
                    : t('restDay.pastDescription')}
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Tomorrow preview only on today — "imorgon" is a date-relative label. */}
        {isToday && guidance.tomorrowsWorkouts.length > 0 && (
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 transition-colors">
                <Calendar className="h-4 w-4" />
                {t('tomorrow.title')}
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
                  {t('tomorrow.tip')}
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Tips — contain "idag/imorgon" references; only show on today. */}
        {isToday && guidance.tips && guidance.tips.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">{t('tipsTitle')}</h3>
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
