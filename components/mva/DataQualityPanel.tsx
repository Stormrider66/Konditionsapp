'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ExcludedItem {
  name: string
  reason: string
}

const CATEGORY_COLORS: Record<string, string> = {
  PHYSIOLOGICAL: '#2563eb',
  BODY_COMPOSITION: '#059669',
  TRAINING_LOAD: '#d97706',
  DAILY_MONITORING: '#7c3aed',
  PERFORMANCE: '#dc2626',
  STRENGTH: '#ea580c',
  RECOVERY: '#0891b2',
  GAIT: '#4f46e5',
  INTEGRATION: '#0d9488',
  TEMPORAL: '#9333ea',
}

interface DataQualityPanelProps {
  nObservations: number
  nVariables: number
  excludedAthletes: ExcludedItem[]
  excludedVariables: ExcludedItem[]
  imputedCells: number
  variableIds?: string[]
  variableNames?: string[]
  variableCategories?: Record<string, string>
}

interface CoverageTooltipProps {
  active?: boolean
  payload?: { payload: { name: string; category: string } }[]
}

function CoverageTooltip({ active, payload }: CoverageTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-2 shadow-lg text-sm">
      <p className="font-medium dark:text-white">{d.name}</p>
      <p className="text-muted-foreground">{d.category}</p>
    </div>
  )
}

export function DataQualityPanel({
  nObservations,
  nVariables,
  excludedAthletes,
  excludedVariables,
  imputedCells,
  variableIds,
  variableNames,
  variableCategories,
}: DataQualityPanelProps) {
  // Build variable coverage bar data if categories are available
  const showCoverageChart = variableIds && variableNames && variableCategories && variableIds.length > 0

  const coverageData = showCoverageChart
    ? variableIds.map((id, i) => ({
        id,
        name: variableNames[i],
        category: variableCategories[id] ?? 'PHYSIOLOGICAL',
        included: 1, // included variables all have value 1
      }))
    : []

  return (
    <Card className="dark:bg-slate-900/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="dark:text-white">Datakvalitet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Inkluderade spelare</p>
            <p className="text-2xl font-bold dark:text-white">{nObservations}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Inkluderade variabler</p>
            <p className="text-2xl font-bold dark:text-white">{nVariables}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Imputerade datapunkter</p>
            <p className="text-2xl font-bold dark:text-white">{imputedCells}</p>
          </div>
        </div>

        {/* Variable coverage bar chart */}
        {showCoverageChart && coverageData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Inkluderade variabler per kategori
            </p>
            <ResponsiveContainer width="100%" height={Math.max(coverageData.length * 22, 100)}>
              <BarChart
                data={coverageData}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 120 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                />
                <Tooltip content={<CoverageTooltip />} />
                <Bar dataKey="included" maxBarSize={14} radius={[0, 4, 4, 0]}>
                  {coverageData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={CATEGORY_COLORS[entry.category] ?? '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {excludedAthletes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Exkluderade spelare ({excludedAthletes.length})
            </p>
            <div className="space-y-1">
              {excludedAthletes.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="dark:text-slate-300">{a.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {a.reason}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {excludedVariables.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Exkluderade variabler ({excludedVariables.length})
            </p>
            <div className="space-y-1">
              {excludedVariables.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="dark:text-slate-300">{v.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {v.reason}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
