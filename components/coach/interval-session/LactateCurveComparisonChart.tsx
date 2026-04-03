'use client'

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisData } from '@/lib/interval-session/analysis-service'

interface LactateCurveComparisonChartProps {
  data: AnalysisData
}

export function LactateCurveComparisonChart({ data }: LactateCurveComparisonChartProps) {
  // Build lactate points indexed by interval
  const allIntervals = new Set<number>()
  for (const p of data.participants) {
    for (const l of p.lactates) {
      allIntervals.add(l.interval)
    }
  }

  const intervals = Array.from(allIntervals).sort((a, b) => a - b)

  if (intervals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Laktatkurvor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Inga laktatvarden registrerade
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = intervals.map((interval) => {
    const point: Record<string, unknown> = {
      interval: interval === 0 ? 'Vila' : `Int ${interval}`,
    }
    for (const p of data.participants) {
      const lac = p.lactates.find((l) => l.interval === interval)
      if (lac) {
        point[p.displayName] = lac.lactate
      }
    }
    return point
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laktatkurvor</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280} className="sm:!h-[350px]">
          <ComposedChart data={chartData} margin={{ left: -10, right: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="interval" tick={{ fontSize: 12 }} />
            <YAxis
              label={{ value: 'mmol/L', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              domain={[0, 'auto']}
              tick={{ fontSize: 12 }}
              width={50}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {/* 4 mmol/L anaerobic threshold reference line */}
            <ReferenceLine
              y={4}
              stroke="#EF4444"
              strokeDasharray="3 3"
              label={{ value: '4 mmol/L', position: 'right', fill: '#EF4444' }}
            />
            {data.participants.map((p) => (
              <Line
                key={p.clientId}
                type="monotone"
                dataKey={p.displayName}
                stroke={p.color}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
