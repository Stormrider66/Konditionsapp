'use client'

// components/athlete/AgilityResultsChart.tsx
// Chart showing agility test results over time

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react'
import { format, subDays, subMonths, subYears, isAfter } from 'date-fns'
import { useState } from 'react'
import type { TimingGateResult } from '@/types'

interface AgilityResultsChartProps {
  results: (TimingGateResult & {
    session: {
      sessionDate: Date
    }
  })[]
  testProtocol?: string
}

type Period = '30d' | '90d' | '1y' | 'all'

export function AgilityResultsChart({
  results,
  testProtocol
}: AgilityResultsChartProps) {
  const [period, setPeriod] = useState<Period>('90d')
  const [selectedProtocol, setSelectedProtocol] = useState<string>(
    testProtocol || results[0]?.testProtocol || ''
  )

  // Get unique protocols (filter out null/undefined)
  const protocols = useMemo(() => {
    const unique = new Set(results.map(r => r.testProtocol).filter((p): p is string => p != null))
    return Array.from(unique)
  }, [results])

  // Filter and format data
  const chartData = useMemo(() => {
    // Get cutoff date based on period
    const now = new Date()
    let cutoffDate: Date
    switch (period) {
      case '30d':
        cutoffDate = subDays(now, 30)
        break
      case '90d':
        cutoffDate = subMonths(now, 3)
        break
      case '1y':
        cutoffDate = subYears(now, 1)
        break
      default:
        cutoffDate = new Date(0)
    }

    // Filter by protocol and date
    const filtered = results
      .filter(r => r.testProtocol === selectedProtocol)
      .filter(r => isAfter(new Date(r.session.sessionDate), cutoffDate))
      .sort((a, b) => new Date(a.session.sessionDate).getTime() - new Date(b.session.sessionDate).getTime())

    // Format for chart
    return filtered.map(r => ({
      date: format(new Date(r.session.sessionDate), 'MMM d'),
      fullDate: format(new Date(r.session.sessionDate), 'PPP'),
      time: r.totalTime,
      valid: r.valid
    }))
  }, [results, selectedProtocol, period])

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null

    const times = chartData.map(d => d.time)
    const best = Math.min(...times)
    const latest = times[times.length - 1]
    const previous = times.length > 1 ? times[times.length - 2] : null
    const average = times.reduce((a, b) => a + b, 0) / times.length

    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (previous !== null) {
      const diff = latest - previous
      if (diff < -0.05) trend = 'improving'
      else if (diff > 0.05) trend = 'declining'
    }

    return { best, latest, previous, average, trend }
  }, [chartData])

  const TrendIcon = stats?.trend === 'improving' ? TrendingDown :
                    stats?.trend === 'declining' ? TrendingUp : Minus
  const trendColor = stats?.trend === 'improving' ? 'text-green-500' :
                     stats?.trend === 'declining' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Track your agility test times</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {protocols.map(p => (
                  <SelectItem key={p} value={p}>
                    {p.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No data for the selected period</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Best</p>
                  <p className="text-lg font-bold flex items-center justify-center gap-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    {stats.best.toFixed(2)}s
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Latest</p>
                  <p className="text-lg font-bold">{stats.latest.toFixed(2)}s</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Average</p>
                  <p className="text-lg font-bold">{stats.average.toFixed(2)}s</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Trend</p>
                  <div className={`flex items-center justify-center gap-1 ${trendColor}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="text-sm font-medium capitalize">{stats.trend}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis
                    domain={['dataMin - 0.1', 'dataMax + 0.1']}
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    tickFormatter={(v) => `${v.toFixed(1)}s`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-lg">
                            <p className="text-sm font-medium">{data.fullDate}</p>
                            <p className="text-lg font-bold">{data.time.toFixed(2)}s</p>
                            {!data.valid && (
                              <Badge variant="destructive" className="mt-1">Invalid</Badge>
                            )}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  {stats && (
                    <ReferenceLine
                      y={stats.best}
                      stroke="#eab308"
                      strokeDasharray="5 5"
                      label={{ value: 'PR', fill: '#eab308', fontSize: 12 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="time"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
