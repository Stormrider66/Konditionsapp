'use client'

/**
 * LoadTrendChart
 *
 * Mini chart showing 14-day acute vs chronic load trend
 * with trend indicator.
 */

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type LoadTrend = 'RISING' | 'FALLING' | 'STABLE'

interface LoadHistoryEntry {
  date: string
  acuteLoad: number
  chronicLoad: number
  acwr: number
}

interface LoadTrendChartProps {
  loadHistory: LoadHistoryEntry[]
  trend: LoadTrend
  className?: string
}

const TREND_CONFIG: Record<LoadTrend, { icon: typeof TrendingUp; label: string; color: string }> = {
  RISING: {
    icon: TrendingUp,
    label: 'Ökande',
    color: 'text-orange-500',
  },
  FALLING: {
    icon: TrendingDown,
    label: 'Minskande',
    color: 'text-blue-500',
  },
  STABLE: {
    icon: Minus,
    label: 'Stabil',
    color: 'text-green-500',
  },
}

export function LoadTrendChart({ loadHistory, trend, className }: LoadTrendChartProps) {
  const trendCfg = TREND_CONFIG[trend] || TREND_CONFIG.STABLE
  const TrendIcon = trendCfg.icon

  // Format date for display
  const formattedData = loadHistory.map((entry) => ({
    ...entry,
    displayDate: new Date(entry.date).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
    }),
  }))

  // Calculate max value for Y axis
  const maxLoad = Math.max(
    ...loadHistory.flatMap((entry) => [entry.acuteLoad, entry.chronicLoad])
  )

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header with trend indicator */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Belastningstrend (14 dagar)
        </h4>
        <div className={cn('flex items-center gap-1', trendCfg.color)}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{trendCfg.label}</span>
        </div>
      </div>

      {/* Chart */}
      {loadHistory.length > 0 ? (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="acuteGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="chronicGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, maxLoad * 1.1]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 'bold' }}
                formatter={(value: number, name: string) => [
                  value.toFixed(0),
                  name === 'acuteLoad' ? 'Akut (7d)' : 'Kronisk (28d)',
                ]}
              />
              {/* Reference lines for optimal ACWR range */}
              <ReferenceLine
                y={maxLoad * 0.8}
                stroke="hsl(142, 76%, 36%)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="chronicLoad"
                stroke="hsl(142, 76%, 36%)"
                fill="url(#chronicGradient)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="acuteLoad"
                stroke="hsl(var(--primary))"
                fill="url(#acuteGradient)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
          Ingen belastningsdata tillgänglig
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-primary" />
          <span>Akut (7d)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500" />
          <span>Kronisk (28d)</span>
        </div>
      </div>
    </div>
  )
}
