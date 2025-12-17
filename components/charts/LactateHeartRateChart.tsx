'use client'

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ReferenceLine } from 'recharts'
import { TestStage } from '@/types'

interface ThresholdValue {
  heartRate: number
  lactate: number
  method?: string
}

interface LactateHeartRateChartProps {
  stages: TestStage[]
  aerobicThreshold?: ThresholdValue
  anaerobicThreshold?: ThresholdValue
}

/**
 * Lactate vs Heart Rate Chart
 *
 * Shows:
 * - Lactate values plotted against heart rate
 * - LT1 (aerobic threshold) marker
 * - LT2 (anaerobic threshold) marker
 */
export function LactateHeartRateChart({ stages, aerobicThreshold, anaerobicThreshold }: LactateHeartRateChartProps) {
  // Extract data points
  const dataPoints = stages.map(stage => ({
    heartRate: stage.heartRate,
    lactate: stage.lactate
  })).filter(p => p.heartRate > 0).sort((a, b) => a.heartRate - b.heartRate)

  if (dataPoints.length === 0) {
    return null
  }

  // Create line data for smooth curve
  const lineData = dataPoints.map(p => ({
    heartRate: p.heartRate,
    lactate: p.lactate
  }))

  // Prepare threshold points
  const lt1Point = aerobicThreshold ? {
    heartRate: aerobicThreshold.heartRate,
    lt1Lactate: aerobicThreshold.lactate
  } : null

  const lt2Point = anaerobicThreshold ? {
    heartRate: anaerobicThreshold.heartRate,
    lt2Lactate: anaerobicThreshold.lactate
  } : null

  // Calculate Y-domain
  const maxLactate = Math.max(...dataPoints.map(p => p.lactate))
  const yDomain = [0, Math.ceil(maxLactate * 1.1)]

  // Calculate X-domain
  const minHR = Math.min(...dataPoints.map(p => p.heartRate))
  const maxHR = Math.max(...dataPoints.map(p => p.heartRate))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Laktat vs Puls</h4>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={lineData}
          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="heartRate"
            label={{ value: 'Puls (slag/min)', position: 'bottom', offset: 0 }}
            type="number"
            domain={[Math.floor(minHR * 0.95), Math.ceil(maxHR * 1.02)]}
            tick={{ dy: 5 }}
          />
          <YAxis
            label={{ value: 'Laktat (mmol/L)', angle: -90, position: 'insideLeft' }}
            domain={yDomain}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              return [`${value.toFixed(2)} mmol/L`, name]
            }}
            labelFormatter={(label) => `Puls: ${label} slag/min`}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: '15px' }}
          />

          {/* Lactate curve */}
          <Line
            type="monotone"
            dataKey="lactate"
            stroke="#ef4444"
            strokeWidth={2}
            name="Laktat"
            dot={{ fill: '#ef4444', r: 4 }}
            isAnimationActive={false}
          />

          {/* LT1 (Aerobic Threshold) marker - green */}
          {lt1Point && (
            <>
              <Scatter
                data={[lt1Point]}
                dataKey="lt1Lactate"
                name="LT1 (Aerob)"
                fill="#22c55e"
                shape="circle"
                line={false}
              />
              <ReferenceLine
                x={lt1Point.heartRate}
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `LT1: ${lt1Point.heartRate}`,
                  position: 'top',
                  fill: '#22c55e',
                  fontSize: 11
                }}
              />
            </>
          )}

          {/* LT2 (Anaerobic Threshold) marker - orange */}
          {lt2Point && (
            <>
              <Scatter
                data={[lt2Point]}
                dataKey="lt2Lactate"
                name="LT2 (Anaerob)"
                fill="#f59e0b"
                shape="star"
                line={false}
                legendType="star"
              />
              <ReferenceLine
                x={lt2Point.heartRate}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `LT2: ${lt2Point.heartRate}`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 11
                }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Explanation */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <strong>Röd linje:</strong> Laktatvärden plottade mot puls
        </p>
        {lt1Point && (
          <p>
            <strong className="text-green-600">Grön cirkel (LT1):</strong> Aerob tröskel vid {lt1Point.heartRate} slag/min ({aerobicThreshold?.lactate?.toFixed(2)} mmol/L)
          </p>
        )}
        {lt2Point && (
          <p>
            <strong className="text-orange-500">Orange stjärna (LT2):</strong> Anaerob tröskel vid {lt2Point.heartRate} slag/min ({anaerobicThreshold?.lactate?.toFixed(2)} mmol/L)
          </p>
        )}
      </div>
    </div>
  )
}
