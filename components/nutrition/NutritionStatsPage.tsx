'use client'

import { useEffect, useState } from 'react'
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { CalorieTrendChart } from './CalorieTrendChart'
import { MacroPieChart } from './MacroPieChart'
import { MealFrequencyChart } from './MealFrequencyChart'
import { ProteinTimingCard } from './ProteinTimingCard'
import { GoalAdherenceCard } from './GoalAdherenceCard'

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
  { value: '7d', label: '7 dagar' },
  { value: '30d', label: '30 dagar' },
  { value: '90d', label: '90 dagar' },
] as const

export function NutritionStatsPage({ clientId }: NutritionStatsPageProps) {
  const [range, setRange] = useState<string>('30d')
  const [data, setData] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async (selectedRange: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/nutrition/stats?range=${selectedRange}`)
      if (!res.ok) throw new Error('Kunde inte hämta statistik')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats(range)
  }, [range, clientId])

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
            <Button variant="outline" onClick={() => fetchStats(range)} className="gap-2 border-red-500/30 hover:bg-red-500/20 text-red-200">
              <RefreshCw className="h-4 w-4" />
              Försök igen
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  if (!data || data.dailyTotals.length === 0) {
    return (
      <GlassCard>
        <GlassCardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <p className="text-slate-300 font-medium">Ingen kostdata hittades</p>
            <p className="text-sm text-slate-500">
              Logga måltider för att se statistik och trender.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {data.summary.totalDaysLogged} dagar loggade &middot; {data.summary.totalMeals} måltider
        </p>
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant="ghost"
              size="sm"
              className={`text-xs px-3 h-7 rounded-md ${
                range === opt.value
                  ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Calorie trend chart */}
      <CalorieTrendChart dailyTotals={data.dailyTotals} />

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
    </div>
  )
}
