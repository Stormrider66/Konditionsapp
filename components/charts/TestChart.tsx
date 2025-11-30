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
import { TestStage, TestType } from '@/types'

interface TestChartProps {
  data: TestStage[]
  testType: TestType
  showLegend?: boolean
  height?: number
}

export function TestChart({ data, testType, showLegend = true, height = 400 }: TestChartProps) {
  const chartData = data.map((stage) => {
    let x: number | undefined
    if (testType === 'RUNNING') {
      x = stage.speed
    } else if (testType === 'SKIING') {
      x = stage.pace
    } else {
      x = stage.power
    }
    return {
      x,
      heartRate: stage.heartRate,
      lactate: stage.lactate,
      vo2: stage.vo2,
    }
  })

  const xAxisLabel = testType === 'RUNNING'
    ? 'Hastighet (km/h)'
    : testType === 'SKIING'
      ? 'Tempo (min/km)'
      : 'Effekt (watt)'

  return (
    <div className="w-full bg-gradient-to-br from-white to-gray-50 p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-md smooth-transition hover:shadow-lg overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="x"
            label={{
              value: xAxisLabel,
              position: 'insideBottom',
              offset: -15,
              style: { fontSize: '14px', fontWeight: 500, fill: '#374151' },
            }}
            stroke="#9ca3af"
          />
          <YAxis
            yAxisId="left"
            label={{
              value: 'Puls (slag/min)',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '14px', fontWeight: 500, fill: '#3b82f6' },
            }}
            stroke="#3b82f6"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{
              value: 'Laktat (mmol/L)',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: '14px', fontWeight: 500, fill: '#ef4444' },
            }}
            stroke="#ef4444"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            cursor={{ stroke: '#d1d5db', strokeWidth: 2 }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              verticalAlign="bottom"
              height={30}
            />
          )}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="heartRate"
            stroke="#3b82f6"
            name="Puls"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5 }}
            activeDot={{ r: 7, fill: '#1e40af' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="lactate"
            stroke="#ef4444"
            name="Laktat"
            strokeWidth={3}
            dot={{ fill: '#ef4444', r: 5 }}
            activeDot={{ r: 7, fill: '#dc2626' }}
          />
          {chartData.some((d) => d.vo2) && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="vo2"
              stroke="#10b981"
              name="VO₂"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
              activeDot={{ r: 7, fill: '#059669' }}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
