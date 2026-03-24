'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts'

interface ObservedVsPredictedProps {
  yObserved: number[]
  yPredicted: number[]
  athleteNames: string[]
  yVariableName: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { payload: { name: string; observed: number; predicted: number; residual: number } }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium dark:text-white">{d.name}</p>
      <p className="text-muted-foreground">Observerat: {d.observed.toFixed(2)}</p>
      <p className="text-muted-foreground">Predikterat: {d.predicted.toFixed(2)}</p>
      <p className="text-muted-foreground">Residual: {d.residual.toFixed(2)}</p>
    </div>
  )
}

export function ObservedVsPredicted({
  yObserved,
  yPredicted,
  athleteNames,
  yVariableName,
}: ObservedVsPredictedProps) {
  // Compute max residual for color scaling
  const residuals = yObserved.map((obs, i) => Math.abs(obs - yPredicted[i]))
  const maxResidual = Math.max(...residuals, 0.001)

  const data = yObserved.map((obs, i) => {
    const residual = obs - yPredicted[i]
    const absResidual = Math.abs(residual)
    // Interpolate from blue (low residual) to red (high residual)
    const ratio = absResidual / maxResidual
    const r = Math.round(37 + ratio * (239 - 37))
    const g = Math.round(99 + ratio * (68 - 99))
    const b = Math.round(235 + ratio * (68 - 235))
    return {
      name: athleteNames[i] ?? `Atlet ${i + 1}`,
      observed: +obs.toFixed(3),
      predicted: +yPredicted[i].toFixed(3),
      residual: +residual.toFixed(3),
      fill: `rgb(${r},${g},${b})`,
    }
  })

  // Compute diagonal line range
  const allValues = [...yObserved, ...yPredicted]
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const padding = (maxVal - minVal) * 0.1 || 1

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        Observerat vs. Predikterat — {yVariableName}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Punkter nära diagonalen indikerar god modellpassning. Färg visar residualens storlek.
      </p>
      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
          <XAxis
            dataKey="observed"
            type="number"
            name="Observerat"
            domain={[minVal - padding, maxVal + padding]}
            label={{
              value: `Observerat (${yVariableName})`,
              position: 'insideBottom',
              offset: -10,
            }}
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            dataKey="predicted"
            type="number"
            name="Predikterat"
            domain={[minVal - padding, maxVal + padding]}
            label={{
              value: `Predikterat (${yVariableName})`,
              angle: -90,
              position: 'insideLeft',
              offset: 0,
            }}
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            segment={[
              { x: minVal - padding, y: minVal - padding },
              { x: maxVal + padding, y: maxVal + padding },
            ]}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{ value: 'y = x', position: 'insideTopLeft', fill: '#9ca3af', fontSize: 11 }}
          />
          <Scatter data={data}>
            <LabelList
              dataKey="name"
              position="top"
              offset={8}
              style={{ fontSize: 10, fill: 'currentColor' }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#2563eb' }} />
          Låg residual
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#ef4444' }} />
          Hög residual
        </span>
      </div>
    </div>
  )
}
