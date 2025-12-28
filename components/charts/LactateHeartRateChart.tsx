'use client'

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ReferenceLine } from 'recharts'
import { TestStage } from '@/types'
import { fitPolynomial3 } from '@/lib/training-engine/utils/polynomial-fit'

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
 * - Actual test data points
 * - Fitted polynomial curve
 * - Baseline (first to last point)
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

  // Fit polynomial curve: lactate = f(heartRate)
  const hrValues = dataPoints.map(p => p.heartRate)
  const lactateValues = dataPoints.map(p => p.lactate)
  const regression = fitPolynomial3(hrValues, lactateValues)
  const { coefficients, r2 } = regression
  const { a, b, c, d } = coefficients

  // Generate polynomial curve points
  const minHR = Math.min(...hrValues)
  const maxHR = Math.max(...hrValues)
  const step = (maxHR - minHR) / 100

  const polynomialCurve: { heartRate: number; lactate: number }[] = []
  for (let hr = minHR; hr <= maxHR; hr += step) {
    const lactate = a * Math.pow(hr, 3) + b * Math.pow(hr, 2) + c * hr + d
    polynomialCurve.push({
      heartRate: Number(hr.toFixed(1)),
      lactate: Number(lactate.toFixed(2))
    })
  }

  // Calculate baseline (straight line from first to last point)
  const firstPoint = dataPoints[0]
  const lastPoint = dataPoints[dataPoints.length - 1]
  const baselineSlope = (lastPoint.lactate - firstPoint.lactate) / (lastPoint.heartRate - firstPoint.heartRate)
  const baselineIntercept = firstPoint.lactate - baselineSlope * firstPoint.heartRate

  // Build chart data: polynomial curve + baseline (no measured points yet)
  const chartData = polynomialCurve.map((point) => {
    const baseLactate = baselineSlope * point.heartRate + baselineIntercept
    return {
      heartRate: point.heartRate,
      polynomial: point.lactate,
      baseline: baseLactate,
      measuredLactate: null as number | null
    }
  })

  // Add each measured data point EXACTLY ONCE at its exact heart rate
  dataPoints.forEach(dp => {
    const polyLactate = a * Math.pow(dp.heartRate, 3) + b * Math.pow(dp.heartRate, 2) + c * dp.heartRate + d
    const baseLactate = baselineSlope * dp.heartRate + baselineIntercept
    chartData.push({
      heartRate: dp.heartRate,
      polynomial: polyLactate,
      baseline: baseLactate,
      measuredLactate: dp.lactate
    })
  })

  // Sort by heartRate
  chartData.sort((a, b) => a.heartRate - b.heartRate)

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
  const maxLactate = Math.max(
    ...dataPoints.map(p => p.lactate),
    ...chartData.map(c => c.polynomial)
  )
  const yDomain = [0, Math.ceil(maxLactate * 1.1)]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Laktat vs Puls</h4>
        <span className="text-sm text-gray-600">
          R² = {(r2 * 100).toFixed(1)}%
        </span>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
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
              if (value === null) return ['-', name]
              return [`${value.toFixed(2)} mmol/L`, name]
            }}
            labelFormatter={(label) => `Puls: ${label} slag/min`}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: '20px' }}
          />

          {/* Baseline */}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="5 5"
            name="Baslinje"
            dot={false}
            isAnimationActive={false}
          />

          {/* Polynomial curve */}
          <Line
            type="monotone"
            dataKey="polynomial"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Polynomisk kurva"
            dot={false}
            isAnimationActive={false}
          />

          {/* Actual test data points */}
          <Line
            type="monotone"
            dataKey="measuredLactate"
            stroke="transparent"
            strokeWidth={0}
            name="Uppmätta värden"
            dot={{ fill: '#ef4444', r: 6, stroke: '#ef4444', strokeWidth: 2 }}
            activeDot={{ r: 8 }}
            isAnimationActive={false}
            connectNulls={false}
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
          <strong>Blå kurva:</strong> Polynomisk anpassning (grad 3) av laktat vs puls
        </p>
        <p>
          <strong>Streckad grå linje:</strong> Baslinje från första till sista mätpunkten
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
        <p>
          <strong>Röda punkter:</strong> Dina uppmätta laktatvärden från testet
        </p>
      </div>
    </div>
  )
}
