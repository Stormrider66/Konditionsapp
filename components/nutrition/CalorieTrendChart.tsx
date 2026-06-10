'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'
import { TrendingUp } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'

interface DailyTotal {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface CalorieTrendChartProps {
  dailyTotals: DailyTotal[]
}

function formatDateLabel(dateStr: string, locale: string): string {
  // Day keys are UTC midnights — format in UTC so the label can't shift a day.
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function CalorieTrendChart({ dailyTotals }: CalorieTrendChartProps) {
  const t = useTranslations('components.calorieTrendChart')
  const locale = useLocale()
  const axisColor = 'hsl(var(--muted-foreground))'
  const gridColor = 'hsl(var(--border))'
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  }
  const chartData = useMemo(() => {
    // Calculate 7-day moving average
    return dailyTotals.map((day, i) => {
      const windowStart = Math.max(0, i - 6)
      const window = dailyTotals.slice(windowStart, i + 1)
      const movingAvg = Math.round(
        window.reduce((s, d) => s + d.calories, 0) / window.length
      )

      return {
        date: formatDateLabel(day.date, locale),
        calories: Math.round(day.calories),
        movingAvg,
      }
    })
  }, [dailyTotals, locale])

  const avgCalories = dailyTotals.length > 0
    ? Math.round(dailyTotals.reduce((s, d) => s + d.calories, 0) / dailyTotals.length)
    : 0

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('title')}
          </GlassCardTitle>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('average')} <span className="text-slate-900 dark:text-white font-medium">{avgCalories} kcal</span>
          </span>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.7} />
              <XAxis
                dataKey="date"
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="calories"
                fill="rgba(6,182,212,0.4)"
                radius={[3, 3, 0, 0]}
                name={t('series.calories')}
              />
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                name={t('series.movingAvg')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
