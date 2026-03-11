'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Trophy,
  Flame,
  Target,
  TrendingUp,
  Sparkles,
  UtensilsCrossed,
  Calendar,
} from 'lucide-react'

interface WrappedStats {
  totalMeals: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  daysLogged: number
  averageMealsPerDay: number
  averageDailyCalories: number
  averageDailyProtein: number
  topFoods: { name: string; count: number; totalGrams: number }[]
  proteinSources: { name: string; totalGrams: number; percent: number }[]
  carbSources: { name: string; totalGrams: number; percent: number }[]
  fatSources: { name: string; totalGrams: number; percent: number }[]
  categoryBreakdown: { category: string; count: number }[]
  mostLoggedMealType: string | null
  mealTypeDistribution: { mealType: string; count: number }[]
  varietyScore: number
  longestStreak: number
  highestCalorieDay: { date: string; calories: number } | null
  lowestCalorieDay: { date: string; calories: number } | null
  totalFoodItems: number
  uniqueFoodItems: number
  funFacts: string[]
}

interface AvailablePeriod {
  periodType: string
  year: number
  month: number | null
}

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
]

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Frukost',
  MORNING_SNACK: 'Fm-mellanmål',
  LUNCH: 'Lunch',
  AFTERNOON_SNACK: 'Em-mellanmål',
  PRE_WORKOUT: 'Före träning',
  POST_WORKOUT: 'Efter träning',
  DINNER: 'Middag',
  EVENING_SNACK: 'Kvällsmellanmål',
}

const CATEGORY_LABELS: Record<string, string> = {
  PROTEIN: 'Protein',
  CARB: 'Kolhydrater',
  FAT: 'Fett',
  VEGETABLE: 'Grönsaker',
  FRUIT: 'Frukt',
  DAIRY: 'Mejeri',
  GRAIN: 'Spannmål',
  BEVERAGE: 'Dryck',
  OTHER: 'Övrigt',
}

export function NutritionWrappedPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<WrappedStats | null>(null)
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

  // Load initial data
  useEffect(() => {
    async function loadLatest() {
      try {
        // Try current month on-demand
        const now = new Date()
        const response = await fetch(
          `/api/nutrition/wrapped?type=MONTHLY&year=${now.getFullYear()}&month=${now.getMonth() + 1}`
        )
        if (!response.ok) return
        const data = await response.json()
        if (data.wrapped) {
          setStats(data.wrapped.stats)
          setSelectedPeriod(`MONTHLY-${data.wrapped.year}-${data.wrapped.month}`)
        }
        if (data.availablePeriods) {
          setAvailablePeriods(data.availablePeriods)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    loadLatest()
  }, [])

  const handlePeriodChange = async (value: string) => {
    setSelectedPeriod(value)
    setLoading(true)
    try {
      const [type, year, month] = value.split('-')
      const url = type === 'YEARLY'
        ? `/api/nutrition/wrapped?type=YEARLY&year=${year}`
        : `/api/nutrition/wrapped?type=MONTHLY&year=${year}&month=${month}`
      const response = await fetch(url)
      if (!response.ok) return
      const data = await response.json()
      setStats(data.wrapped?.stats ?? null)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Ingen kostsammanfattning ännu</p>
          <p className="text-xs text-slate-500 mt-1">
            Börja logga mat med fotoskannern så skapar vi din första sammanfattning
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      {availablePeriods.length > 0 && (
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Välj period" />
          </SelectTrigger>
          <SelectContent>
            {availablePeriods.map((p) => {
              const value = `${p.periodType}-${p.year}-${p.month ?? 0}`
              const label = p.periodType === 'YEARLY'
                ? `${p.year} (Helår)`
                : `${MONTH_NAMES[p.month ?? 0]} ${p.year}`
              return (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )}

      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<UtensilsCrossed className="h-5 w-5 text-cyan-400" />}
          value={stats.totalMeals}
          label="Måltider"
          bg="bg-cyan-500/10 border-cyan-500/20"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-emerald-400" />}
          value={stats.daysLogged}
          label="Dagar loggade"
          bg="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          value={stats.averageDailyCalories}
          label="Snitt kcal/dag"
          bg="bg-orange-500/10 border-orange-500/20"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-blue-400" />}
          value={`${stats.averageDailyProtein}g`}
          label="Snitt protein/dag"
          bg="bg-blue-500/10 border-blue-500/20"
        />
      </div>

      {/* Streaks & variety */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{stats.longestStreak}</p>
            <p className="text-xs text-slate-400">Längsta svit (dagar)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <Sparkles className="h-6 w-6 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-white">{stats.uniqueFoodItems}</p>
            <p className="text-xs text-slate-400">Unika livsmedel</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Foods */}
      {stats.topFoods.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Dina favoritmat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topFoods.slice(0, 5).map((food, i) => (
                <div key={food.name} className="flex items-center gap-3">
                  <span className={`text-lg font-black ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-white">{food.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {Math.round(food.totalGrams / 1000 * 10) / 10} kg totalt
                    </p>
                  </div>
                  <span className="text-sm font-medium text-cyan-400">{food.count}x</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protein sources */}
      {stats.proteinSources.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-400">
              Dina proteinkällor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.proteinSources.map((source) => (
                <div key={source.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{source.name}</span>
                    <span className="text-slate-400">{source.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400 transition-all duration-700"
                      style={{ width: `${source.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meal type distribution */}
      {stats.mealTypeDistribution.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Måltidsfördelning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {stats.mealTypeDistribution.map((mt) => (
                <div key={mt.mealType} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-xs text-slate-400">
                    {MEAL_TYPE_LABELS[mt.mealType] || mt.mealType}
                  </span>
                  <span className="text-xs font-medium text-white">{mt.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      {stats.categoryBreakdown.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Livsmedelskategorier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.categoryBreakdown.map((cat) => (
                <span
                  key={cat.category}
                  className="px-2.5 py-1 bg-white/5 rounded-full text-xs text-slate-300 border border-white/10"
                >
                  {CATEGORY_LABELS[cat.category] || cat.category} ({cat.count})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fun facts */}
      {stats.funFacts.length > 0 && (
        <Card className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Visste du att...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.funFacts.map((fact, i) => (
                <p key={i} className="text-sm text-slate-300">
                  {fact}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Macro totals */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Totalt konsumerat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-white">
                {(stats.totalCalories / 1000).toFixed(0)}k
              </p>
              <p className="text-[10px] text-slate-500">kcal</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-400">{stats.totalProtein}g</p>
              <p className="text-[10px] text-slate-500">Protein</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">{stats.totalCarbs}g</p>
              <p className="text-[10px] text-slate-500">Kolhydr.</p>
            </div>
            <div>
              <p className="text-lg font-bold text-rose-400">{stats.totalFat}g</p>
              <p className="text-[10px] text-slate-500">Fett</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  bg,
}: {
  icon: React.ReactNode
  value: number | string
  label: string
  bg: string
}) {
  return (
    <Card className={`${bg} border`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">{icon}</div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </CardContent>
    </Card>
  )
}
