'use client'

import { useState } from 'react'
import {
  ComposedChart,
  Bar,
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

interface DailyData {
  date: string
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
}

interface NutritionTrendChartProps {
  dailyData: DailyData[]
  goals: {
    calories: number
    proteinGrams: number
    carbsGrams: number
    fatGrams: number
  }
  variant?: 'default' | 'glass'
}

type MetricKey = 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'

const TABS: { key: MetricKey; label: string; color: string; unit: string; goalKey: MetricKey }[] = [
  { key: 'calories', label: 'Kalorier', color: '#f97316', unit: 'kcal', goalKey: 'calories' },
  { key: 'proteinGrams', label: 'Protein', color: '#3b82f6', unit: 'g', goalKey: 'proteinGrams' },
  { key: 'carbsGrams', label: 'Kolhydrater', color: '#f59e0b', unit: 'g', goalKey: 'carbsGrams' },
  { key: 'fatGrams', label: 'Fett', color: '#10b981', unit: 'g', goalKey: 'fatGrams' },
]

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${day} ${months[d.getMonth()]}`
}

export function NutritionTrendChart({ dailyData, goals, variant = 'default' }: NutritionTrendChartProps) {
  const [selectedTab, setSelectedTab] = useState<MetricKey>('calories')
  const isGlass = variant === 'glass'

  const activeTab = TABS.find(t => t.key === selectedTab)!
  const goalValue = goals[activeTab.goalKey]

  const chartData = dailyData.map(d => ({
    date: formatDateLabel(d.date),
    value: d[selectedTab],
  }))

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
              Börja logga måltider för att se trender
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
          Näringstrender
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
              {tab.label}
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
                formatter={(value: number) => [`${Math.round(value)} ${activeTab.unit}`, activeTab.label]}
              />
              <ReferenceLine
                y={goalValue}
                stroke={activeTab.color}
                strokeDasharray="5 5"
                strokeOpacity={0.7}
                label={{
                  value: `Mål: ${goalValue}`,
                  position: 'right',
                  fill: isGlass ? '#94a3b8' : '#64748b',
                  fontSize: 10,
                }}
              />
              <Bar
                dataKey="value"
                fill={activeTab.color}
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        {chartData.length > 0 && (
          <div className={cn("mt-3 flex justify-between text-xs", isGlass ? "text-slate-400" : "text-muted-foreground")}>
            <span>
              Snitt: {Math.round(chartData.reduce((s, d) => s + d.value, 0) / chartData.length)} {activeTab.unit}/dag
            </span>
            <span>
              Mål: {goalValue} {activeTab.unit}/dag
            </span>
          </div>
        )}
      </Content>
    </Wrapper>
  )
}
