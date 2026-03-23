'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PLSQualityMetricsProps {
  r2Y: number
  q2: number
  nComponents: number
  nObservations: number
  nXVariables: number
  yVariableName: string
}

function getColorClass(value: number): string {
  if (value >= 0.8) return 'bg-green-500'
  if (value >= 0.5) return 'bg-amber-500'
  return 'bg-red-500'
}

function getTextColorClass(value: number): string {
  if (value >= 0.8) return 'text-green-600 dark:text-green-400'
  if (value >= 0.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function PLSQualityMetrics({
  r2Y,
  q2,
  nComponents,
  nObservations,
  nXVariables,
  yVariableName,
}: PLSQualityMetricsProps) {
  return (
    <Card className="dark:bg-slate-900/50 dark:border-white/10">
      <CardHeader>
        <CardTitle className="dark:text-white">Modellkvalitet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">R²Y (Förklaringsgrad)</p>
            <p className={`text-2xl font-bold ${getTextColorClass(r2Y)}`}>
              {(r2Y * 100).toFixed(1)}%
            </p>
            <div className="mt-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getColorClass(r2Y)}`}
                style={{ width: `${Math.max(0, Math.min(100, r2Y * 100))}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Q² (Korsvaliderad)</p>
            <p className={`text-2xl font-bold ${getTextColorClass(q2)}`}>
              {(q2 * 100).toFixed(1)}%
            </p>
            <div className="mt-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getColorClass(q2)}`}
                style={{ width: `${Math.max(0, Math.min(100, q2 * 100))}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Komponenter</p>
            <p className="text-2xl font-bold dark:text-white">{nComponents}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Observationer</p>
            <p className="text-2xl font-bold dark:text-white">{nObservations}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">X-variabler</p>
            <p className="text-2xl font-bold dark:text-white">{nXVariables}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Y-variabel</p>
            <p className="text-lg font-semibold dark:text-white truncate" title={yVariableName}>
              {yVariableName}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
