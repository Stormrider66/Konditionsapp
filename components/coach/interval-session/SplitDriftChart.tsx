'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisData } from '@/lib/interval-session/analysis-service'

interface SplitDriftChartProps {
  data: AnalysisData
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function SplitDriftChart({ data }: SplitDriftChartProps) {
  // Build chart data: one point per interval per participant
  const chartData = data.intervals.map((interval) => {
    const point: Record<string, unknown> = { interval: `Int ${interval}` }
    for (const p of data.participants) {
      const split = p.splits.find((s) => s.interval === interval)
      if (split) {
        point[p.clientName] = split.splitTimeMs
      }
    }
    return point
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Splitdrift per intervall</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="interval" />
            <YAxis
              tickFormatter={(v) => formatSplit(v)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(value: number) => formatSplit(value)}
              labelFormatter={(label) => label}
            />
            <Legend />
            {data.participants.map((p) => (
              <Line
                key={p.clientId}
                type="monotone"
                dataKey={p.clientName}
                stroke={p.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
