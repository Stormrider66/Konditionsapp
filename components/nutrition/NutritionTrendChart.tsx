'use client'

import { useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale, useTranslations } from '@/i18n/client'

interface DailyData {
  date: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

interface DailyTarget {
  date: string
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

interface NutritionTrendChartProps {
  dailyData: DailyData[]
  goals: {
    calories: number
    proteinGrams: number
    carbsGrams: number
    fatGrams: number
  }
  /** Per-day targets that scale with each day's workout load. Falls back to `goals` when absent. */
  dailyTargets?: DailyTarget[]
  variant?: 'default' | 'glass'
}

type MetricKey = 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'
type TargetKey = 'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG'

const TABS: { key: MetricKey; labelKey: string; color: string; unit: string; goalKey: MetricKey; targetKey: TargetKey }[] = [
  { key: 'calories', labelKey: 'metrics.calories', color: '#f97316', unit: 'kcal', goalKey: 'calories', targetKey: 'caloriesKcal' },
  { key: 'proteinGrams', labelKey: 'metrics.protein', color: '#3b82f6', unit: 'g', goalKey: 'proteinGrams', targetKey: 'proteinG' },
  { key: 'carbsGrams', labelKey: 'metrics.carbs', color: '#f59e0b', unit: 'g', goalKey: 'carbsGrams', targetKey: 'carbsG' },
  { key: 'fatGrams', labelKey: 'metrics.fat', color: '#10b981', unit: 'g', goalKey: 'fatGrams', targetKey: 'fatG' },
]

function formatDateLabel(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d)
}

export function NutritionTrendChart({ dailyData, goals, dailyTargets, variant = 'default' }: NutritionTrendChartProps) {
  const t = useTranslations('components.nutritionTrendChart')
  const locale = useLocale()
  const [selectedTab, setSelectedTab] = useState<MetricKey>('calories')
  const isGlass = variant === 'glass'

  const activeTab = TABS.find(t => t.key === selectedTab)!
  const goalValue = goals[activeTab.goalKey]

  const targetByDate = new Map<string, DailyTarget>()
  for (const t of dailyTargets ?? []) targetByDate.set(t.date, t)

  const chartData = dailyData.map(d => {
    const dayTarget = targetByDate.get(d.date)
    return {
      date: formatDateLabel(d.date, locale),
      value: d[selectedTab],
      target: dayTarget ? dayTarget[activeTab.targetKey] : goalValue,
    }
  })

  const hasPerDayTargets = (dailyTargets?.length ?? 0) > 0
  const avgTarget = hasPerDayTargets
    ? Math.round(chartData.reduce((s, d) => s + d.target, 0) / chartData.length)
    : goalValue

  const Wrapper = isGlass ? GlassCard : Card
  const Header = isGlass ? GlassCardHeader : CardHeader
  const Title = isGlass ? GlassCardTitle : CardTitle
  const Content = isGlass ? GlassCardContent : CardContent

  if (dailyData.length === 0) {
    return (
      <Wrapper>
        <Content className="p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-2 py-8">
            <Utensils className={cn("h-10 w-10", isGlass ? "text-slate-500" : "text-muted-foreground")} />
            <p className={cn("text-sm", isGlass ? "text-slate-400" : "text-muted-foreground")}>
              {t('empty')}
            </p>
          </div>
        </Content>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <Header className="pb-2">
        <Title className={cn("text-base", isGlass && "text-cyan-600 dark:text-cyan-400 transition-colors")}>
          {t('title')}
        </Title>
      </Header>
      <Content>
        {/* Tab switcher */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/50">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
                selectedTab === tab.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isGlass ? '#334155' : '#e2e8f0'} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: isGlass ? '#94a3b8' : '#64748b' }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: isGlass ? '#94a3b8' : '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isGlass ? '#1e293b' : '#fff',
                  border: isGlass ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: isGlass ? '#e2e8f0' : '#0f172a',
                }}
                formatter={(value: number, name: string) => {
                  const label = name === 'target' ? t('target') : t(activeTab.labelKey)
                  return [`${Math.round(value)} ${activeTab.unit}`, label]
                }}
              />
              {!hasPerDayTargets && (
                <ReferenceLine
                  y={goalValue}
                  stroke={activeTab.color}
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                  label={{
                    value: t('targetValue', { value: goalValue }),
                    position: 'right',
                    fill: isGlass ? '#94a3b8' : '#64748b',
                    fontSize: 10,
                  }}
                />
              )}
              <Bar
                dataKey="value"
                fill={activeTab.color}
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              {hasPerDayTargets && (
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke={activeTab.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeOpacity={0.9}
                  dot={{ r: 2, fill: activeTab.color }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        {chartData.length > 0 && (
          <div className={cn("mt-3 flex justify-between text-xs", isGlass ? "text-slate-400" : "text-muted-foreground")}>
            <span>
              {t('average', {
                value: Math.round(chartData.reduce((s, d) => s + d.value, 0) / chartData.length),
                unit: activeTab.unit,
              })}
            </span>
            <span>
              {hasPerDayTargets
                ? t('averageTarget', { value: avgTarget, unit: activeTab.unit })
                : t('goalPerDay', { value: goalValue, unit: activeTab.unit })}
            </span>
          </div>
        )}
      </Content>
    </Wrapper>
  )
}
