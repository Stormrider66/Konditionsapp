'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ScatterChart, ReferenceLine } from 'recharts'
import { TestStage } from '@/types'

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
  }
  intensityUnit: 'km/h' | 'watt' | 'min/km'
}

/**
 * D-max Curve Visualization Component
 *
 * Shows:
 * - Actual test data points (scatter)
 * - Fitted polynomial curve
 * - D-max threshold point
 */
export function DmaxCurveChart({ stages, dmaxResult, intensityUnit }: DmaxCurveChartProps) {
  if (!dmaxResult || !dmaxResult.coefficients) {
    return null
  }

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
  }).filter(p => p.intensity > 0)

  if (dataPoints.length === 0) {
    return null
  }

  // Calculate polynomial curve points
  const { a, b, c, d } = dmaxResult.coefficients
  const minIntensity = Math.min(...dataPoints.map(p => p.intensity))
  const maxIntensity = Math.max(...dataPoints.map(p => p.intensity))
  const step = (maxIntensity - minIntensity) / 100

  const polynomialCurve = []
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

  const baseline = []
  for (let intensity = minIntensity; intensity <= maxIntensity; intensity += step) {
    const lactate = baselineSlope * intensity + baselineIntercept
    baseline.push({
      intensity: Number(intensity.toFixed(2)),
      lactate: Number(lactate.toFixed(2))
    })
  }

  // Combine data for chart
  const chartData = polynomialCurve.map((point, index) => ({
    intensity: point.intensity,
    polynomial: point.lactate,
    baseline: baseline[index]?.lactate || 0
  }))

  // Determine axis label
  const intensityLabel = intensityUnit === 'km/h' ? 'Hastighet (km/h)' :
                        intensityUnit === 'watt' ? 'Effekt (watt)' :
                        'Tempo (min/km)'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">D-max Laktatkurva</h4>
        {dmaxResult.r2 && (
          <span className="text-sm text-gray-600">
            R² = {(dmaxResult.r2 * 100).toFixed(1)}%
            {dmaxResult.confidence && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                dmaxResult.confidence === 'HIGH' ? 'bg-green-100 text-green-800' :
                dmaxResult.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {dmaxResult.confidence}
              </span>
            )}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="intensity"
            label={{ value: intensityLabel, position: 'insideBottom', offset: -10 }}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            label={{ value: 'Laktat (mmol/L)', angle: -90, position: 'insideLeft' }}
            domain={[0, 'auto']}
          />
          <Tooltip
            formatter={(value: number) => value.toFixed(2)}
            labelFormatter={(label) => `${intensityLabel.split('(')[0]}: ${label}`}
          />
          <Legend />

          {/* Baseline */}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="5 5"
            name="Baslinje"
            dot={false}
          />

          {/* Polynomial curve */}
          <Line
            type="monotone"
            dataKey="polynomial"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Polynomisk kurva"
            dot={false}
          />

          {/* D-max threshold point */}
          <ReferenceLine
            x={dmaxResult.intensity}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{
              value: `D-max: ${dmaxResult.intensity} ${intensityUnit}`,
              position: 'top',
              fill: '#f59e0b',
              fontSize: 12
            }}
          />
          <ReferenceLine
            y={dmaxResult.lactate}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{
              value: `${dmaxResult.lactate} mmol/L`,
              position: 'right',
              fill: '#f59e0b',
              fontSize: 12
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Actual test data points overlay */}
      <ResponsiveContainer width="100%" height={400} style={{ marginTop: '-400px' }}>
        <ScatterChart
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis
            dataKey="intensity"
            type="number"
            domain={['dataMin', 'dataMax']}
            hide
          />
          <YAxis domain={[0, 'auto']} hide />
          <Scatter
            data={dataPoints}
            fill="#ef4444"
            name="Uppmätta värden"
          />
          {/* D-max point */}
          <Scatter
            data={[{ intensity: dmaxResult.intensity, lactate: dmaxResult.lactate }]}
            fill="#f59e0b"
            shape="star"
            name="D-max tröskel"
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Explanation */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <strong>Blå kurva:</strong> Polynomisk anpassning (grad 3) av dina laktatdata
        </p>
        <p>
          <strong>Streckad grå linje:</strong> Baslinje från första till sista mätpunkten
        </p>
        <p>
          <strong>Orange stjärna:</strong> D-max punkten - maximalt avstånd mellan kurvan och baslinjen
        </p>
        <p>
          <strong>Röda punkter:</strong> Dina uppmätta laktatvärden från testet
        </p>
      </div>
    </div>
  )
}
