'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UtensilsCrossed, TrendingUp, PieChart, Pencil, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuickMealLog, type EditMealData } from '@/components/athlete/nutrition/QuickMealLog'
import { exportMealsToCSV } from '@/lib/utils/csv-export'
import { localDayKey } from '@/lib/nutrition/day-key'
import { MealType } from '@prisma/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useLocale, useTranslations } from '@/i18n/client'

interface TopFood {
  name: string
  normalizedName: string
  category: string | null
  count: number
  totalGrams: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

interface NutrientSource {
  name: string
  totalGrams: number
  percent: number
}

interface TimelineMeal {
  id: string
  date: string
  mealType: string
  time: string | null
  description: string
  calories: number | null
  items: {
    name: string
    category: string | null
    estimatedGrams: number
    portionDescription: string | null
    calories: number
    proteinGrams: number
    carbsGrams: number
    fatGrams: number
  }[]
}

type View = 'top-foods' | 'nutrient-sources' | 'timeline'

const RANGES = [
  { value: '7d', labelKey: 'ranges.sevenDays' },
  { value: '30d', labelKey: 'ranges.thirtyDays' },
  { value: '90d', labelKey: 'ranges.ninetyDays' },
  { value: '365d', labelKey: 'ranges.oneYear' },
  { value: 'all', labelKey: 'ranges.allTime' },
]

const VIEWS: { value: View; labelKey: string; icon: typeof UtensilsCrossed }[] = [
  { value: 'top-foods', labelKey: 'views.topFoods', icon: TrendingUp },
  { value: 'nutrient-sources', labelKey: 'views.nutrientSources', icon: PieChart },
  { value: 'timeline', labelKey: 'views.timeline', icon: UtensilsCrossed },
]

const CATEGORY_COLORS: Record<string, string> = {
  PROTEIN: '#60a5fa',
  CARB: '#fbbf24',
  FAT: '#f87171',
  VEGETABLE: '#34d399',
  FRUIT: '#a78bfa',
  DAIRY: '#f0abfc',
  GRAIN: '#fb923c',
  BEVERAGE: '#67e8f9',
  OTHER: '#94a3b8',
}

const MEAL_TYPE_LABEL_KEYS: Record<string, string> = {
  BREAKFAST: 'mealTypes.breakfast',
  MORNING_SNACK: 'mealTypes.morningSnack',
  LUNCH: 'mealTypes.lunch',
  AFTERNOON_SNACK: 'mealTypes.afternoonSnack',
  PRE_WORKOUT: 'mealTypes.preWorkout',
  POST_WORKOUT: 'mealTypes.postWorkout',
  DINNER: 'mealTypes.dinner',
  EVENING_SNACK: 'mealTypes.eveningSnack',
}

const BAR_COLORS = [
  '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#3b82f6', '#14b8a6', '#f97316', '#a855f7', '#ef4444',
  '#22d3ee', '#34d399', '#fbbf24', '#c084fc', '#fb7185',
  '#60a5fa', '#2dd4bf', '#fb923c', '#a78bfa', '#f87171',
]

export function FoodHistoryPage() {
  const t = useTranslations('components.foodHistoryPage')
  const locale = useLocale()
  const [view, setView] = useState<View>('top-foods')
  const [range, setRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [topFoodsData, setTopFoodsData] = useState<{
    topFoods: TopFood[]
    totalUniqueItems: number
    totalItemCount: number
  } | null>(null)
  const [nutrientData, setNutrientData] = useState<{
    proteinSources: NutrientSource[]
    carbSources: NutrientSource[]
    fatSources: NutrientSource[]
    totals: { proteinGrams: number; carbsGrams: number; fatGrams: number }
  } | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineMeal[]>([])
  const [editingMeal, setEditingMeal] = useState<EditMealData | null>(null)
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const rangeDays: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }
      const endKey = localDayKey()
      const startKey = range === 'all'
        ? '2000-01-01'
        : localDayKey(new Date(Date.now() - (rangeDays[range] ?? 30) * 24 * 60 * 60 * 1000))
      const res = await fetch(`/api/meals?startDate=${startKey}&endDate=${endKey}`)
      if (!res.ok) return
      const json = await res.json()
      const meals = (json.data?.meals ?? []) as Array<{
        date: string
        mealType: string
        time: string | null
        description: string
        calories: number | null
        proteinGrams: number | null
        carbsGrams: number | null
        fatGrams: number | null
        fiberGrams: number | null
      }>
      exportMealsToCSV(meals, locale)
    } catch {
      // Silently fail, consistent with fetchData
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm(t('confirmDeleteMeal'))) return
    setDeletingMealId(mealId)
    try {
      const res = await fetch(`/api/meals/${mealId}`, { method: 'DELETE' })
      if (res.ok) {
        setTimelineData(prev => prev.filter(m => m.id !== mealId))
      }
    } finally {
      setDeletingMealId(null)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/nutrition/food-history?range=${range}&view=${view}`)
      if (!response.ok) return
      const data = await response.json()

      if (view === 'top-foods') {
        setTopFoodsData({
          topFoods: data.topFoods,
          totalUniqueItems: data.totalUniqueItems,
          totalItemCount: data.totalItemCount,
        })
      } else if (view === 'nutrient-sources') {
        setNutrientData({
          proteinSources: data.proteinSources,
          carbSources: data.carbSources,
          fatSources: data.fatSources,
          totals: data.totals,
        })
      } else if (view === 'timeline') {
        setTimelineData(data.meals)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [view, range])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-1 flex-1">
          {VIEWS.map((v) => {
            const Icon = v.icon
            return (
              <button
                key={v.value}
                onClick={() => setView(v.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  view === v.value
                    ? 'bg-cyan-500/20 text-cyan-700 border border-cyan-500/30 dark:text-cyan-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(v.labelKey)}
              </button>
            )
          })}
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[200px] bg-white border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {t(r.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {t('export.csv')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : (
        <>
          {/* Top Foods View */}
          {view === 'top-foods' && topFoodsData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{topFoodsData.totalUniqueItems}</p>
                    <p className="text-xs text-slate-400">{t('stats.uniqueFoods')}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{topFoodsData.totalItemCount}</p>
                    <p className="text-xs text-slate-400">{t('stats.totalLogged')}</p>
                  </CardContent>
                </Card>
              </div>

              {topFoodsData.topFoods.length === 0 ? (
                <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
                  <CardContent className="p-8 text-center">
                    <UtensilsCrossed className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">{t('empty.title')}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('empty.description')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-700 dark:text-slate-300">
                      {t('topFoods.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topFoodsData.topFoods.slice(0, 10)}
                          layout="vertical"
                          margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={120}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--popover-foreground))',
                            }}
                            formatter={(value: number, _name: string, entry: { payload?: TopFood }) => {
                              const item = entry.payload
                              if (!item) return [`${value}`, t('topFoods.countLabel')]
                              return [
                                t('topFoods.tooltipCountTotal', {
                                  count: value,
                                  grams: Math.round(item.totalGrams),
                                }),
                                t('topFoods.countLabel'),
                              ]
                            }}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {topFoodsData.topFoods.slice(0, 10).map((_entry, index) => (
                              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detailed list */}
                    <div className="mt-4 space-y-2">
                      {topFoodsData.topFoods.map((food, i) => (
                        <div
                          key={food.normalizedName}
                          className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-white/5"
                        >
                          <span className="text-xs font-bold text-slate-500 w-6 text-right">
                            {i + 1}
                          </span>
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: food.category
                                ? CATEGORY_COLORS[food.category] || CATEGORY_COLORS.OTHER
                                : CATEGORY_COLORS.OTHER,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 truncate dark:text-white">{food.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {food.category || t('categoryFallback')} · {t('totalGrams', { grams: Math.round(food.totalGrams) })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-cyan-400">{food.count}x</p>
                            <p className="text-[10px] text-slate-500">
                              {Math.round(food.totalCalories)} kcal
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Nutrient Sources View */}
          {view === 'nutrient-sources' && nutrientData && (
            <div className="space-y-4">
              <NutrientSourceCard
                title={t('nutrientSources.protein')}
                color="text-blue-400"
                sources={nutrientData.proteinSources}
                barColor="#60a5fa"
                emptyLabel={t('empty.noData')}
                totalLabel={t('totalGrams', { grams: nutrientData.totals.proteinGrams })}
              />
              <NutrientSourceCard
                title={t('nutrientSources.carbs')}
                color="text-amber-400"
                sources={nutrientData.carbSources}
                barColor="#fbbf24"
                emptyLabel={t('empty.noData')}
                totalLabel={t('totalGrams', { grams: nutrientData.totals.carbsGrams })}
              />
              <NutrientSourceCard
                title={t('nutrientSources.fat')}
                color="text-rose-400"
                sources={nutrientData.fatSources}
                barColor="#f87171"
                emptyLabel={t('empty.noData')}
                totalLabel={t('totalGrams', { grams: nutrientData.totals.fatGrams })}
              />
            </div>
          )}

          {/* Timeline View */}
          {view === 'timeline' && (
            <>
            <div className="space-y-3">
              {timelineData.length === 0 ? (
                <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
                  <CardContent className="p-8 text-center">
                    <UtensilsCrossed className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">{t('empty.title')}</p>
                  </CardContent>
                </Card>
              ) : (
                timelineData.map((meal) => (
                  <Card key={meal.id} className="bg-white border-slate-200 group dark:bg-white/5 dark:border-white/10">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-cyan-400">
                            {MEAL_TYPE_LABEL_KEYS[meal.mealType] ? t(MEAL_TYPE_LABEL_KEYS[meal.mealType]) : meal.mealType}
                          </span>
                          {meal.time && (
                            <span className="text-xs text-slate-500">{meal.time}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingMeal({
                              id: meal.id,
                              mealType: meal.mealType as MealType,
                              time: meal.time,
                              description: meal.description,
                              calories: meal.calories,
                              proteinGrams: meal.items.length > 0
                                ? meal.items.reduce((s, i) => s + i.proteinGrams, 0)
                                : null,
                              carbsGrams: meal.items.length > 0
                                ? meal.items.reduce((s, i) => s + i.carbsGrams, 0)
                                : null,
                              fatGrams: meal.items.length > 0
                                ? meal.items.reduce((s, i) => s + i.fatGrams, 0)
                                : null,
                            })}
                            className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity dark:hover:bg-white/10"
                            title={t('actions.edit')}
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-cyan-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            disabled={deletingMealId === meal.id}
                            className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity dark:hover:bg-white/10"
                            title={t('actions.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-400" />
                          </button>
                          <span className="text-xs text-slate-500">
                            {new Date(meal.date).toLocaleDateString(locale)}
                          </span>
                        </div>
                      </div>
                      {meal.items.length > 0 ? (
                        <div className="space-y-1">
                          {meal.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs py-1"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: item.category
                                      ? CATEGORY_COLORS[item.category] || CATEGORY_COLORS.OTHER
                                      : CATEGORY_COLORS.OTHER,
                                  }}
                                />
                                <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                                <span className="text-slate-600">
                                  {item.portionDescription || `${Math.round(item.estimatedGrams)}g`}
                                </span>
                              </div>
                              <span className="text-slate-500">
                                {Math.round(item.calories)} kcal
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">{meal.description}</p>
                      )}
                      {meal.calories != null && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600 dark:border-white/5 dark:text-slate-400">
                          {t('timeline.totalCalories', { calories: meal.calories })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            {editingMeal && (
              <QuickMealLog
                open={!!editingMeal}
                onClose={() => setEditingMeal(null)}
                onMealSaved={() => {
                  setEditingMeal(null)
                  void fetchData()
                }}
                editMeal={editingMeal}
                date={new Date()}
              />
            )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function NutrientSourceCard({
  title,
  color,
  sources,
  barColor,
  emptyLabel,
  totalLabel,
}: {
  title: string
  color: string
  sources: NutrientSource[]
  barColor: string
  emptyLabel: string
  totalLabel: string
}) {
  if (sources.length === 0) {
    return (
      <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm ${color}`}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">{emptyLabel}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 dark:bg-white/5 dark:border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm ${color}`}>
          {title}
          <span className="text-slate-500 font-normal ml-2">
            ({totalLabel})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300">{source.name}</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {source.totalGrams}g ({source.percent}%)
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(source.percent, 100)}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
