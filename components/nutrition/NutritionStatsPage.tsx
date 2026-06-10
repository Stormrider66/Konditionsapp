'use client'

import { useCallback, useEffect, useState } from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, Apple, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { CalorieTrendChart } from './CalorieTrendChart'
import { MacroPieChart } from './MacroPieChart'
import { MealFrequencyChart } from './MealFrequencyChart'
import { ProteinTimingCard } from './ProteinTimingCard'
import { GoalAdherenceCard } from './GoalAdherenceCard'
import { NutritionQualityCard, type NutritionQuality } from './NutritionQualityCard'
import { useTranslations } from '@/i18n/client'

interface DailyTotal {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  mealCount: number
}

interface WeeklyAverage {
  week: string
  avgCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  daysLogged: number
}

interface MealTypeDist {
  mealType: string
  count: number
  avgCalories: number
}

interface ProteinTiming {
  avgWorkoutDayProtein: number | null
  avgRestDayProtein: number | null
  workoutDays: number
  restDays: number
}

interface GoalAdherence {
  calories: number
  protein: number
  carbs: number
  fat: number
  daysEvaluated?: number
}

interface MacroRatio {
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
}

interface StatsData {
  dailyTotals: DailyTotal[]
  weeklyAverages: WeeklyAverage[]
  mealTypeDistribution: MealTypeDist[]
  proteinTiming: ProteinTiming
  goalAdherence: GoalAdherence | null
  overallMacroRatio: MacroRatio | null
  nutritionQuality: NutritionQuality
  summary: {
    totalDaysLogged: number
    avgMealsPerDay: number
    totalMeals: number
  }
}

interface NutritionStatsPageProps {
  clientId: string
  basePath?: string
}

const RANGE_OPTIONS = [
  { value: '1d', labelKey: 'ranges.oneDay' },
  { value: '7d', labelKey: 'ranges.sevenDays' },
  { value: '30d', labelKey: 'ranges.thirtyDays' },
  { value: '90d', labelKey: 'ranges.ninetyDays' },
] as const

function getDateValue(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function shiftDateValue(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + days)
  return getDateValue(next)
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function NutritionStatsPage({ clientId, basePath }: NutritionStatsPageProps) {
  const t = useTranslations('components.nutritionStatsPage')
  const [range, setRange] = useState<string>('30d')
  const [selectedDate, setSelectedDate] = useState(() => getDateValue(new Date()))
  const [data, setData] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (selectedRange: string, date: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ range: selectedRange })
      if (selectedRange === '1d') params.set('date', date)
      const res = await fetch(`/api/nutrition/stats?${params}`)
      if (!res.ok) throw new Error(t('errors.fetchFailed'))
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void fetchStats(range, selectedDate)
  }, [fetchStats, range, selectedDate, clientId])

  const isSingleDay = range === '1d'
  const todayValue = getDateValue(new Date())
  const isTodaySelected = selectedDate >= todayValue
  const hasData = data !== null && data.dailyTotals.length > 0

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 justify-end">
          {RANGE_OPTIONS.map((opt) => (
            <Skeleton key={opt.value} className="h-9 w-20 bg-slate-800 rounded-lg" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 bg-slate-800 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <GlassCard className="bg-red-950/20 border-red-500/20">
        <GlassCardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-red-200">{error}</p>
            <Button variant="outline" onClick={() => fetchStats(range, selectedDate)} className="gap-2 border-red-500/30 hover:bg-red-500/20 text-red-200">
              <RefreshCw className="h-4 w-4" />
              {t('actions.retry')}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {data ? t('summary', { days: data.summary.totalDaysLogged, meals: data.summary.totalMeals }) : t('empty.title')}
        </p>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap justify-end gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                className={`text-xs px-3 h-7 rounded-md ${
                  range === opt.value
                    ? 'bg-cyan-500/20 text-cyan-700 hover:bg-cyan-500/30 dark:text-cyan-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
                onClick={() => setRange(opt.value)}
              >
                {t(opt.labelKey)}
              </Button>
            ))}
          </div>
          {isSingleDay && (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={t('dayNavigation.previous')}
                onClick={() => setSelectedDate((current) => shiftDateValue(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[128px] rounded-md border bg-background px-3 py-1.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200">
                {formatDateLabel(selectedDate)}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={t('dayNavigation.next')}
                disabled={isTodaySelected}
                onClick={() => setSelectedDate((current) => shiftDateValue(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {!hasData && (
        <GlassCard>
          <GlassCardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <p className="text-slate-700 dark:text-slate-300 font-medium">{t('empty.title')}</p>
              <p className="text-sm text-slate-500">
                {t('empty.description')}
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {hasData && data && (
        <>

      {/* Food history link */}
      <Link href={`${basePath || ''}/athlete/nutrition/food-history`}>
        <GlassCard className="hover:border-emerald-500/30 transition-colors cursor-pointer">
          <GlassCardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Apple className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{t('foodHistory.title')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('foodHistory.description')}</p>
            </div>
            <span className="text-xs text-slate-500">&rarr;</span>
          </GlassCardContent>
        </GlassCard>
      </Link>

      {/* Wrapped summary link */}
      <Link href={`${basePath || ''}/athlete/nutrition/wrapped`}>
        <GlassCard className="hover:border-cyan-500/30 transition-colors cursor-pointer">
          <GlassCardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{t('wrapped.title')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('wrapped.description')}</p>
            </div>
            <span className="text-xs text-slate-500">&rarr;</span>
          </GlassCardContent>
        </GlassCard>
      </Link>

      {/* Calorie trend chart */}
      <CalorieTrendChart dailyTotals={data.dailyTotals} />

      <NutritionQualityCard quality={data.nutritionQuality} />

      {/* Macro pie + Goal adherence side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.overallMacroRatio && (
          <MacroPieChart macroRatio={data.overallMacroRatio} />
        )}
        {data.goalAdherence && (
          <GoalAdherenceCard adherence={data.goalAdherence} />
        )}
      </div>

      {/* Meal frequency + Protein timing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.mealTypeDistribution.length > 0 && (
          <MealFrequencyChart distribution={data.mealTypeDistribution} />
        )}
        <ProteinTimingCard timing={data.proteinTiming} />
      </div>
        </>
      )}
    </div>
  )
}
