'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { CANONICAL_MUSCLE_GROUPS, type CanonicalMuscleGroup } from '@/lib/muscle-group-normalizer'

interface MuscleGroupSummary {
  muscleGroups: Record<CanonicalMuscleGroup, { volume: number; sets: number }>
  totalVolume: number
  totalSets: number
}

interface MuscleGroupRadarChartProps {
  summary: MuscleGroupSummary
}

export function MuscleGroupRadarChart({ summary }: MuscleGroupRadarChartProps) {
  const data = CANONICAL_MUSCLE_GROUPS.filter((g) => g !== 'Helkropp').map((group) => {
    const groupData = summary.muscleGroups[group]
    const pct = summary.totalVolume > 0 ? (groupData.volume / summary.totalVolume) * 100 : 0
    return {
      group,
      volume: Math.round(pct * 10) / 10,
      rawVolume: Math.round(groupData.volume),
      sets: groupData.sets,
    }
  })

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="group"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <PolarRadiusAxis
            angle={90}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="bg-popover border rounded-lg p-2 shadow-md text-sm">
                  <p className="font-medium">{d.group}</p>
                  <p className="text-muted-foreground">
                    {d.rawVolume.toLocaleString('sv-SE')} kg ({d.volume}%)
                  </p>
                  <p className="text-muted-foreground">{d.sets} set</p>
                </div>
              )
            }}
          />
          <Radar
            dataKey="volume"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Summary list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-sm">
        {data
          .filter((d) => d.rawVolume > 0)
          .sort((a, b) => b.rawVolume - a.rawVolume)
          .map((d) => (
            <div key={d.group} className="flex justify-between">
              <span className="text-muted-foreground">{d.group}</span>
              <span className="font-medium">{d.rawVolume.toLocaleString('sv-SE')} kg</span>
            </div>
          ))}
      </div>
    </div>
  )
}
