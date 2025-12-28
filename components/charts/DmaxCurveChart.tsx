'use client'

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ReferenceLine } from 'recharts'
import { TestStage } from '@/types'
import { fitPolynomial3 } from '@/lib/training-engine/utils/polynomial-fit'

interface ThresholdValue {
  intensity: number
  lactate: number
  method?: string
}

interface DmaxCurveChartProps {
  stages: TestStage[]
  dmaxResult?: {
    intensity: number
    lactate: number
    coefficients?: {
      a: number
      b: number
      c: number
      d: number
    }
    r2?: number
    confidence?: string
    hrBasedMethod?: boolean
  }
  intensityUnit: 'km/h' | 'watt' | 'min/km'
  aerobicThreshold?: ThresholdValue
  anaerobicThreshold?: ThresholdValue
}

/**
 * D-max Curve Visualization Component
 *
 * Shows:
 * - Actual test data points (scatter)
 * - Fitted polynomial curve (always fitted to intensity vs lactate)
 * - LT1 (aerobic threshold) marker
 * - LT2 (anaerobic threshold) marker
 */
export function DmaxCurveChart({ stages, dmaxResult, intensityUnit, aerobicThreshold, anaerobicThreshold }: DmaxCurveChartProps) {
  // Extract intensity values based on test type
  const dataPoints = stages.map(stage => {
    let intensity = 0
    if (stage.speed !== null && stage.speed !== undefined) {
      intensity = stage.speed
    } else if (stage.power !== null && stage.power !== undefined) {
      intensity = stage.power
    } else if (stage.pace !== null && stage.pace !== undefined) {
      intensity = stage.pace
    }

    return {
      intensity,
      lactate: stage.lactate,
      heartRate: stage.heartRate
    }
  }).filter(p => p.intensity > 0).sort((a, b) => a.intensity - b.intensity)

  if (dataPoints.length < 3) {
    return null
  }

  // Always fit polynomial to intensity vs lactate for this chart
  // (dmaxResult.coefficients might be HR-based if hrBasedMethod is true)
  const intensityValues = dataPoints.map(p => p.intensity)
  const lactateValues = dataPoints.map(p => p.lactate)

  const regression = fitPolynomial3(intensityValues, lactateValues)
  const { coefficients, r2 } = regression
  const { a, b, c, d } = coefficients

  const minIntensity = Math.min(...intensityValues)
  const maxIntensity = Math.max(...intensityValues)
  const step = (maxIntensity - minIntensity) / 100

  const polynomialCurve: { intensity: number; lactate: number }[] = []
  for (let intensity = minIntensity; intensity <= maxIntensity; intensity += step) {
    const lactate = a * Math.pow(intensity, 3) + b * Math.pow(intensity, 2) + c * intensity + d
    polynomialCurve.push({
      intensity: Number(intensity.toFixed(2)),
      lactate: Number(lactate.toFixed(2))
    })
  }

  // Calculate baseline (straight line from first to last point)
  const firstPoint = dataPoints[0]
  const lastPoint = dataPoints[dataPoints.length - 1]
  const baselineSlope = (lastPoint.lactate - firstPoint.lactate) / (lastPoint.intensity - firstPoint.intensity)
  const baselineIntercept = firstPoint.lactate - baselineSlope * firstPoint.intensity

  const baseline: { intensity: number; lactate: number }[] = []
  for (let intensity = minIntensity; intensity <= maxIntensity; intensity += step) {
    const lactate = baselineSlope * intensity + baselineIntercept
    baseline.push({
      intensity: Number(intensity.toFixed(2)),
      lactate: Number(lactate.toFixed(2))
    })
  }

  // Build chart data: polynomial curve + baseline (no measured points yet)
  const chartData = polynomialCurve.map((point, index) => ({
    intensity: point.intensity,
    polynomial: point.lactate,
    baseline: baseline[index]?.lactate || 0,
    measuredLactate: null as number | null
  }))

  // Add each measured data point EXACTLY ONCE at its exact intensity
  dataPoints.forEach(dp => {
    const polyLactate = a * Math.pow(dp.intensity, 3) + b * Math.pow(dp.intensity, 2) + c * dp.intensity + d
    const baseLactate = baselineSlope * dp.intensity + baselineIntercept
    chartData.push({
      intensity: dp.intensity,
      polynomial: polyLactate,
      baseline: baseLactate,
      measuredLactate: dp.lactate
    })
  })

  // Sort by intensity
  chartData.sort((a, b) => a.intensity - b.intensity)

  // Prepare threshold points for visualization
  const lt1Point = aerobicThreshold ? {
    intensity: aerobicThreshold.intensity,
    lt1Lactate: aerobicThreshold.lactate
  } : null

  const lt2Point = anaerobicThreshold ? {
    intensity: anaerobicThreshold.intensity,
    lt2Lactate: anaerobicThreshold.lactate
  } : null

  // Legacy D-max point (for fallback if no thresholds provided)
  const dmaxPoint = (!aerobicThreshold && !anaerobicThreshold && dmaxResult) ? {
    intensity: dmaxResult.intensity,
    dmaxLactate: dmaxResult.lactate
  } : null

  // Determine axis label
  const intensityLabel = intensityUnit === 'km/h' ? 'Hastighet (km/h)' :
                        intensityUnit === 'watt' ? 'Effekt (watt)' :
                        'Tempo (min/km)'

  // Calculate Y-domain manually to ensure rendering
  const maxLactate = Math.max(
    ...dataPoints.map(p => p.lactate),
    ...(dmaxResult ? [dmaxResult.lactate] : []),
    ...chartData.map(c => c.polynomial)
  )
  const yDomain = [0, Math.ceil(maxLactate * 1.1)]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Laktatkurva med tröskelvärden</h4>
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
            dataKey="intensity"
            label={{ value: intensityLabel, position: 'bottom', offset: 0 }}
            type="number"
            domain={[minIntensity - 0.5, maxIntensity + 0.5]}
            allowDataOverflow={false}
            tick={{ dy: 5 }}
          />
          <YAxis
            label={{ value: 'Laktat (mmol/L)', angle: -90, position: 'insideLeft' }}
            domain={yDomain}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'D-max tröskel') return [`${value.toFixed(2)} mmol/L`, name]
              return [value.toFixed(2), name]
            }}
            labelFormatter={(label) => `${intensityLabel.split('(')[0]}: ${label}`}
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

          {/* Actual test data points - use Line with dots only where data exists */}
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
                x={lt1Point.intensity}
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `LT1: ${lt1Point.intensity}`,
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
                x={lt2Point.intensity}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `LT2: ${lt2Point.intensity}`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 11
                }}
              />
            </>
          )}

          {/* Legacy D-max point (only shown if no thresholds provided) */}
          {dmaxPoint && dmaxResult && (
            <>
              <Scatter
                data={[dmaxPoint]}
                dataKey="dmaxLactate"
                name="D-max tröskel"
                fill="#f59e0b"
                shape="star"
                line={false}
                legendType="star"
              />
              <ReferenceLine
                x={dmaxResult.intensity}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `D-max: ${dmaxResult.intensity}`,
                  position: 'top',
                  fill: '#f59e0b',
                  fontSize: 12
                }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Explanation */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <strong>Blå kurva:</strong> Polynomisk anpassning (grad 3) av dina laktatdata
        </p>
        <p>
          <strong>Streckad grå linje:</strong> Baslinje från första till sista mätpunkten
        </p>
        {lt1Point && (
          <p>
            <strong className="text-green-600">Grön cirkel (LT1):</strong> Aerob tröskel vid {lt1Point.intensity} {intensityUnit} ({aerobicThreshold?.lactate?.toFixed(2)} mmol/L)
          </p>
        )}
        {lt2Point && (
          <p>
            <strong className="text-orange-500">Orange stjärna (LT2):</strong> Anaerob tröskel vid {lt2Point.intensity} {intensityUnit} ({anaerobicThreshold?.lactate?.toFixed(2)} mmol/L)
          </p>
        )}
        <p>
          <strong>Röda punkter:</strong> Dina uppmätta laktatvärden från testet
        </p>
      </div>
    </div>
  )
}
