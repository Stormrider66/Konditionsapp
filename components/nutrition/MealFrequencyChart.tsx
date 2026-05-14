'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard'

interface MealTypeDist {
  mealType: string
  count: number
  avgCalories: number
}

interface MealFrequencyChartProps {
  distribution: MealTypeDist[]
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: 'Frukost',
  MORNING_SNACK: 'FM-mål',
  LUNCH: 'Lunch',
  AFTERNOON_SNACK: 'EM-mål',
  PRE_WORKOUT: 'Före trn.',
  POST_WORKOUT: 'Efter trn.',
  DINNER: 'Middag',
  EVENING_SNACK: 'Kväll',
}

export function MealFrequencyChart({ distribution }: MealFrequencyChartProps) {
  const axisColor = 'hsl(var(--muted-foreground))'
  const gridColor = 'hsl(var(--border))'
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  }
  const data = distribution.map((d) => ({
    name: MEAL_TYPE_LABELS[d.mealType] || d.mealType,
    count: d.count,
    avgCalories: d.avgCalories,
  }))

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-600 dark:text-cyan-400">Måltidstyper</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.7} />
              <XAxis
                type="number"
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={70}
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 10 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'count') return [value, 'Antal']
                  return [`${value} kcal`, 'Snitt kcal']
                }}
              />
              <Bar dataKey="count" fill="rgba(6,182,212,0.5)" radius={[0, 4, 4, 0]} name="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
