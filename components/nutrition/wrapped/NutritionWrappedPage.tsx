'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useTranslations } from '@/i18n/client'

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
  '', 'months.january', 'months.february', 'months.march', 'months.april', 'months.may', 'months.june',
  'months.july', 'months.august', 'months.september', 'months.october', 'months.november', 'months.december',
]

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'mealTypes.breakfast',
  MORNING_SNACK: 'mealTypes.morningSnack',
  LUNCH: 'mealTypes.lunch',
  AFTERNOON_SNACK: 'mealTypes.afternoonSnack',
  PRE_WORKOUT: 'mealTypes.preWorkout',
  POST_WORKOUT: 'mealTypes.postWorkout',
  DINNER: 'mealTypes.dinner',
  EVENING_SNACK: 'mealTypes.eveningSnack',
}

const CATEGORY_LABELS: Record<string, string> = {
  PROTEIN: 'categories.protein',
  CARB: 'categories.carb',
  FAT: 'categories.fat',
  VEGETABLE: 'categories.vegetable',
  FRUIT: 'categories.fruit',
  DAIRY: 'categories.dairy',
  GRAIN: 'categories.grain',
  BEVERAGE: 'categories.beverage',
  OTHER: 'categories.other',
}

export function NutritionWrappedPage() {
  const t = useTranslations('components.nutritionWrappedPage')
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
    void loadLatest()
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
      <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-10 w-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-700 font-medium dark:text-slate-300">{t('empty.title')}</p>
          <p className="text-xs text-slate-500 mt-1">
            {t('empty.description')}
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
          <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
            <SelectValue placeholder={t('period.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {availablePeriods.map((p) => {
              const value = `${p.periodType}-${p.year}-${p.month ?? 0}`
              const label = p.periodType === 'YEARLY'
                ? t('period.yearly', { year: p.year })
                : t('period.monthly', { month: t(MONTH_NAMES[p.month ?? 0]), year: p.year })
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
          label={t('stats.meals')}
          bg="bg-cyan-500/10 border-cyan-500/20"
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-emerald-400" />}
          value={stats.daysLogged}
          label={t('stats.daysLogged')}
          bg="bg-emerald-500/10 border-emerald-500/20"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-400" />}
          value={stats.averageDailyCalories}
          label={t('stats.avgKcalPerDay')}
          bg="bg-orange-500/10 border-orange-500/20"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-blue-400" />}
          value={`${stats.averageDailyProtein}g`}
          label={t('stats.avgProteinPerDay')}
          bg="bg-blue-500/10 border-blue-500/20"
        />
      </div>

      {/* Streaks & variety */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.longestStreak}</p>
            <p className="text-xs text-slate-400">{t('stats.longestStreakDays')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <Sparkles className="h-6 w-6 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.uniqueFoodItems}</p>
            <p className="text-xs text-slate-400">{t('stats.uniqueFoods')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Foods */}
      {stats.topFoods.length > 0 && (
        <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700 flex items-center gap-2 dark:text-slate-300">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              {t('sections.favoriteFoods')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topFoods.slice(0, 5).map((food, i) => (
                <div key={food.name} className="flex items-center gap-3">
                  <span className={`text-lg font-black ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-500 dark:text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 dark:text-white">{food.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {t('totalKg', { kg: Math.round(food.totalGrams / 1000 * 10) / 10 })}
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
        <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-400">
              {t('sections.proteinSources')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.proteinSources.map((source) => (
                <div key={source.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300">{source.name}</span>
                    <span className="text-slate-400">{source.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-white/5">
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
        <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700 dark:text-slate-300">{t('sections.mealDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {stats.mealTypeDistribution.map((mt) => (
                <div key={mt.mealType} className="flex items-center justify-between p-2 bg-slate-100 rounded-lg dark:bg-white/5">
                  <span className="text-xs text-slate-400">
                    {MEAL_TYPE_LABELS[mt.mealType] ? t(MEAL_TYPE_LABELS[mt.mealType]) : mt.mealType}
                  </span>
                  <span className="text-xs font-medium text-slate-900 dark:text-white">{mt.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      {stats.categoryBreakdown.length > 0 && (
        <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-700 dark:text-slate-300">{t('sections.foodCategories')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.categoryBreakdown.map((cat) => (
                <span
                  key={cat.category}
                  className="px-2.5 py-1 bg-slate-100 rounded-full text-xs text-slate-700 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
                >
                  {CATEGORY_LABELS[cat.category] ? t(CATEGORY_LABELS[cat.category]) : cat.category} ({cat.count})
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
            <CardTitle className="text-sm text-cyan-700 flex items-center gap-2 dark:text-cyan-300">
              <Sparkles className="h-4 w-4" />
              {t('sections.didYouKnow')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.funFacts.map((fact, i) => (
                <p key={i} className="text-sm text-slate-700 dark:text-slate-300">
                  {fact}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Macro totals */}
      <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-700 dark:text-slate-300">{t('sections.totalConsumed')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {(stats.totalCalories / 1000).toFixed(0)}k
              </p>
              <p className="text-[10px] text-slate-500">kcal</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-400">{stats.totalProtein}g</p>
              <p className="text-[10px] text-slate-500">{t('macros.protein')}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">{stats.totalCarbs}g</p>
              <p className="text-[10px] text-slate-500">{t('macros.carbsShort')}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-rose-400">{stats.totalFat}g</p>
              <p className="text-[10px] text-slate-500">{t('macros.fat')}</p>
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
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </CardContent>
    </Card>
  )
}
