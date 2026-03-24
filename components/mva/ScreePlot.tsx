'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  ReferenceLine,
} from 'recharts'

interface ScreePlotProps {
  explainedVariance: number[]
  cumulativeVariance: number[]
}

export function ScreePlot({ explainedVariance, cumulativeVariance }: ScreePlotProps) {
  const data = explainedVariance.map((ev, i) => ({
    component: `PC${i + 1}`,
    variance: +(ev * 100).toFixed(1),
    cumulative: +((cumulativeVariance[i] ?? 0) * 100).toFixed(1),
  }))

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        Förklarad varians (Scree Plot)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
          <XAxis dataKey="component" tick={{ fill: 'currentColor' }} />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            label={{ value: '%', angle: -90, position: 'insideLeft' }}
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background, #fff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number, name: string) => [
              `${value}%`,
              name === 'variance' ? 'Förklarad varians' : 'Kumulativ',
            ]}
          />
          <ReferenceLine
            yAxisId="left"
            y={80}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: '80%', position: 'right', fill: '#ef4444', fontSize: 12 }}
          />
          <Bar yAxisId="left" dataKey="variance" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cumulative"
            stroke="#059669"
            strokeWidth={2}
            dot={{ fill: '#059669', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
          Förklarad varians per komponent
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
          Kumulativ
        </span>
      </div>
    </div>
  )
}
