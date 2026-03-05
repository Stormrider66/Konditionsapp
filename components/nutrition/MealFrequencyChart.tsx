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
  const data = distribution.map((d) => ({
    name: MEAL_TYPE_LABELS[d.mealType] || d.mealType,
    count: d.count,
    avgCalories: d.avgCalories,
  }))

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-base text-cyan-400">Måltidstyper</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={70}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 12,
                }}
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
