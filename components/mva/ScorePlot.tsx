'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

interface AthleteScore {
  clientId: string
  clientName: string
  scores: number[]
  hotellingT2: number
  isOutlierT2: boolean
}

interface ScorePlotProps {
  athleteScores: AthleteScore[]
  explainedVariance: number[]
  t2Limit95: number
}

const POSITION_COLORS: Record<string, string> = {
  TEAM_FOOTBALL: '#2563eb',
  TEAM_ICE_HOCKEY: '#7c3aed',
  TEAM_HANDBALL: '#db2777',
  TEAM_FLOORBALL: '#ea580c',
  TEAM_BASKETBALL: '#d97706',
  TEAM_VOLLEYBALL: '#059669',
  default: '#6b7280',
}

function getColor(isOutlier: boolean): string {
  return isOutlier ? '#ef4444' : '#2563eb'
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { payload: { name: string; pc1: number; pc2: number; t2: number; outlier: boolean } }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium dark:text-white">{d.name}</p>
      <p className="text-muted-foreground">PC1: {d.pc1.toFixed(2)}</p>
      <p className="text-muted-foreground">PC2: {d.pc2.toFixed(2)}</p>
      <p className="text-muted-foreground">T²: {d.t2.toFixed(2)}</p>
      {d.outlier && <p className="text-red-500 font-medium">Avvikande (T²)</p>}
    </div>
  )
}

export function ScorePlot({ athleteScores, explainedVariance }: ScorePlotProps) {
  const data = athleteScores.map((a) => ({
    name: a.clientName,
    pc1: a.scores[0] ?? 0,
    pc2: a.scores[1] ?? 0,
    t2: a.hotellingT2,
    outlier: a.isOutlierT2,
    fill: getColor(a.isOutlierT2),
  }))

  const pc1Pct = ((explainedVariance[0] ?? 0) * 100).toFixed(1)
  const pc2Pct = ((explainedVariance[1] ?? 0) * 100).toFixed(1)

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        Poängdiagram (Score Plot)
      </h3>
      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
          <XAxis
            dataKey="pc1"
            type="number"
            name="PC1"
            label={{
              value: `PC1 (${pc1Pct}%)`,
              position: 'insideBottom',
              offset: -10,
            }}
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            dataKey="pc2"
            type="number"
            name="PC2"
            label={{
              value: `PC2 (${pc2Pct}%)`,
              angle: -90,
              position: 'insideLeft',
              offset: 0,
            }}
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={data} fill="#2563eb">
            <LabelList
              dataKey="name"
              position="top"
              offset={8}
              style={{ fontSize: 11, fill: 'currentColor' }}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          Normal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Avvikande (T²)
        </span>
      </div>
    </div>
  )
}
