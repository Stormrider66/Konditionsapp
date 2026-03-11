'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UtensilsCrossed, TrendingUp, PieChart } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

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
  { value: '7d', label: 'Senaste 7 dagarna' },
  { value: '30d', label: 'Senaste 30 dagarna' },
  { value: '90d', label: 'Senaste 3 månaderna' },
  { value: '365d', label: 'Senaste året' },
  { value: 'all', label: 'Alla tider' },
]

const VIEWS: { value: View; label: string; icon: typeof UtensilsCrossed }[] = [
  { value: 'top-foods', label: 'Topplivsmedel', icon: TrendingUp },
  { value: 'nutrient-sources', label: 'Näringskällor', icon: PieChart },
  { value: 'timeline', label: 'Historik', icon: UtensilsCrossed },
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

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Frukost',
  MORNING_SNACK: 'Fm-mellis',
  LUNCH: 'Lunch',
  AFTERNOON_SNACK: 'Em-mellis',
  PRE_WORKOUT: 'Före träning',
  POST_WORKOUT: 'Efter träning',
  DINNER: 'Middag',
  EVENING_SNACK: 'Kvällsmellis',
}

const BAR_COLORS = [
  '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#3b82f6', '#14b8a6', '#f97316', '#a855f7', '#ef4444',
  '#22d3ee', '#34d399', '#fbbf24', '#c084fc', '#fb7185',
  '#60a5fa', '#2dd4bf', '#fb923c', '#a78bfa', '#f87171',
]

export function FoodHistoryPage() {
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
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 flex-1">
          {VIEWS.map((v) => {
            const Icon = v.icon
            return (
              <button
                key={v.value}
                onClick={() => setView(v.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  view === v.value
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            )
          })}
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{topFoodsData.totalUniqueItems}</p>
                    <p className="text-xs text-slate-400">Unika livsmedel</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-white">{topFoodsData.totalItemCount}</p>
                    <p className="text-xs text-slate-400">Totalt loggade</p>
                  </CardContent>
                </Card>
              </div>

              {topFoodsData.topFoods.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-8 text-center">
                    <UtensilsCrossed className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">Ingen mathistorik ännu</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Skanna din mat med fotofunktionen så börjar vi spara vad du äter
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300">
                      Mest ätna livsmedel
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
                              backgroundColor: '#1e293b',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#e2e8f0',
                            }}
                            formatter={(value: number, _name: string, entry: { payload?: TopFood }) => {
                              const item = entry.payload
                              if (!item) return [`${value}`, 'Antal']
                              return [
                                `${value} gånger (${Math.round(item.totalGrams)}g totalt)`,
                                'Antal',
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
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
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
                            <p className="text-sm text-white truncate">{food.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {food.category || 'Okategoriserad'} · {Math.round(food.totalGrams)}g totalt
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
                title="Proteinkällor"
                color="text-blue-400"
                totalGrams={nutrientData.totals.proteinGrams}
                sources={nutrientData.proteinSources}
                barColor="#60a5fa"
              />
              <NutrientSourceCard
                title="Kolhydratkällor"
                color="text-amber-400"
                totalGrams={nutrientData.totals.carbsGrams}
                sources={nutrientData.carbSources}
                barColor="#fbbf24"
              />
              <NutrientSourceCard
                title="Fettkällor"
                color="text-rose-400"
                totalGrams={nutrientData.totals.fatGrams}
                sources={nutrientData.fatSources}
                barColor="#f87171"
              />
            </div>
          )}

          {/* Timeline View */}
          {view === 'timeline' && (
            <div className="space-y-3">
              {timelineData.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-8 text-center">
                    <UtensilsCrossed className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">Ingen mathistorik ännu</p>
                  </CardContent>
                </Card>
              ) : (
                timelineData.map((meal) => (
                  <Card key={meal.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-cyan-400">
                            {MEAL_TYPE_LABELS[meal.mealType] || meal.mealType}
                          </span>
                          {meal.time && (
                            <span className="text-xs text-slate-500">{meal.time}</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(meal.date).toLocaleDateString('sv-SE')}
                        </span>
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
                                <span className="text-slate-300">{item.name}</span>
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
                        <div className="mt-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                          Totalt: {meal.calories} kcal
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NutrientSourceCard({
  title,
  color,
  totalGrams,
  sources,
  barColor,
}: {
  title: string
  color: string
  totalGrams: number
  sources: NutrientSource[]
  barColor: string
}) {
  if (sources.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm ${color}`}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">Ingen data ännu</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm ${color}`}>
          {title}
          <span className="text-slate-500 font-normal ml-2">
            ({totalGrams}g totalt)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{source.name}</span>
                <span className="text-slate-400">
                  {source.totalGrams}g ({source.percent}%)
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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
