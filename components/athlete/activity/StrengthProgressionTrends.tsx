'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ActivityExerciseProgression } from '@/lib/activity-detail/types'

interface StrengthProgressionTrendsProps {
  progression: ActivityExerciseProgression[]
  locale: string
}

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatShortDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function trendMeta(trend: ActivityExerciseProgression['trend'], locale: string) {
  switch (trend) {
    case 'IMPROVING':
      return { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', label: text(locale, 'Improving', 'Förbättras') }
    case 'DECLINING':
      return { icon: TrendingDown, color: 'text-red-600 dark:text-red-400', label: text(locale, 'Declining', 'Minskar') }
    default:
      return { icon: Minus, color: 'text-muted-foreground', label: text(locale, 'Stable', 'Stabil') }
  }
}

/**
 * Cross-session strength progression — one estimated-1RM trend line per
 * exercise, with a direction badge and weekly progression rate. Reuses the
 * server-computed `getProgressionHistory` output.
 */
export function StrengthProgressionTrends({ progression, locale }: StrengthProgressionTrendsProps) {
  if (progression.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {text(locale, 'Strength progression', 'Styrkeutveckling')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {progression.map((exercise) => {
          const meta = trendMeta(exercise.trend, locale)
          const Icon = meta.icon
          const latest = exercise.points[exercise.points.length - 1]
          const chartData = exercise.points.map((p) => ({
            label: formatShortDate(p.date, locale),
            e1rm: p.estimated1RM,
          }))

          return (
            <div key={exercise.exerciseId} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{exercise.name}</div>
                <div className="flex items-center gap-2">
                  {latest && <Badge variant="secondary">e1RM {Math.round(latest.estimated1RM)} kg</Badge>}
                  <span className={`flex items-center gap-1 text-xs font-semibold ${meta.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                    {exercise.progressionRate !== 0 && (
                      <span className="tabular-nums">
                        {exercise.progressionRate > 0 ? '+' : ''}
                        {exercise.progressionRate} kg/{text(locale, 'wk', 'v')}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={16} />
                    <YAxis tick={{ fontSize: 11 }} width={36} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip formatter={(v: number) => [`${v} kg`, 'e1RM']} />
                    <Line type="monotone" dataKey="e1rm" stroke="#7c3aed" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
