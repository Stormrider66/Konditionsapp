'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  CANONICAL_MUSCLE_GROUPS,
  MUSCLE_GROUP_COLORS,
  type CanonicalMuscleGroup,
} from '@/lib/muscle-group-normalizer'

interface PeriodData {
  label: string
  muscleGroups: Record<CanonicalMuscleGroup, { volume: number; sets: number }>
}

interface MuscleGroupStackedBarChartProps {
  periods: PeriodData[]
}

export function MuscleGroupStackedBarChart({ periods }: MuscleGroupStackedBarChartProps) {
  // Transform data for Recharts: each period becomes a row with keys per muscle group
  const chartData = periods.map((p) => {
    const row: Record<string, string | number> = { period: p.label }
    for (const group of CANONICAL_MUSCLE_GROUPS) {
      row[group] = Math.round(p.muscleGroups[group].volume)
    }
    return row
  })

  // Only show muscle groups that have data
  const activeGroups = CANONICAL_MUSCLE_GROUPS.filter((group) =>
    periods.some((p) => p.muscleGroups[group].volume > 0)
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}t` : `${v}`
          }
          label={{
            value: 'Volym (kg)',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
          }}
        />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload?.length) return null
            const items = payload.filter((p) => (p.value as number) > 0)
            return (
              <div className="bg-popover border rounded-lg p-3 shadow-md text-sm">
                <p className="font-medium mb-1">{label}</p>
                {items.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium ml-auto">
                      {(item.value as number).toLocaleString('sv-SE')} kg
                    </span>
                  </div>
                ))}
              </div>
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          iconSize={10}
        />
        {activeGroups.map((group, i) => (
          <Bar
            key={group}
            dataKey={group}
            stackId="muscles"
            fill={MUSCLE_GROUP_COLORS[group]}
            name={group}
            radius={i === activeGroups.length - 1 ? [4, 4, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
