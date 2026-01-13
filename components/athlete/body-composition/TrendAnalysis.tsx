'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from 'lucide-react'
import {
  analyzeBodyComposition,
  type BodyCompositionMeasurement,
  type BodyCompAnalysis,
  type AnalysisOptions
} from '@/lib/ai/body-composition-analyzer'
import { cn } from '@/lib/utils'

interface TrendAnalysisProps {
  measurements: BodyCompositionMeasurement[]
  options?: AnalysisOptions
  className?: string
}

function TrendIcon({ direction }: { direction: string }) {
  switch (direction) {
    case 'increasing':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'decreasing':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    case 'fluctuating':
      return <Activity className="h-4 w-4 text-yellow-500" />
    default:
      return <Minus className="h-4 w-4 text-gray-500" />
  }
}

function StatusBadge({ status }: { status: BodyCompAnalysis['progressStatus'] }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    excellent: { label: 'Utmärkt', variant: 'default' },
    good: { label: 'Bra', variant: 'default' },
    on_track: { label: 'På rätt väg', variant: 'secondary' },
    slow: { label: 'Långsam progress', variant: 'outline' },
    concerning: { label: 'Behöver uppmärksamhet', variant: 'destructive' },
    unknown: { label: 'Behöver mer data', variant: 'outline' },
  }

  const { label, variant } = config[status] || config.unknown

  return <Badge variant={variant}>{label}</Badge>
}

function TrendCard({
  title,
  value,
  weeklyChange,
  direction,
  unit,
  isGood,
}: {
  title: string
  value: number | null | undefined
  weeklyChange: number | null
  direction?: string
  unit: string
  isGood?: boolean
}) {
  if (value == null) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {direction && <TrendIcon direction={direction} />}
      </div>
      <div className="text-2xl font-bold">
        {value.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </div>
      {weeklyChange != null && (
        <div className={cn(
          "text-sm mt-1",
          isGood ? "text-green-600" : weeklyChange > 0 ? "text-red-500" : "text-muted-foreground"
        )}>
          {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(2)} {unit}/vecka
        </div>
      )}
    </div>
  )
}

export function TrendAnalysis({ measurements, options, className }: TrendAnalysisProps) {
  const analysis = useMemo(
    () => analyzeBodyComposition(measurements, options),
    [measurements, options]
  )

  const latestMeasurement = measurements
    .filter(m => m.measurementDate)
    .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime())[0]

  if (!latestMeasurement) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-analys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Lägg till din första mätning för att få AI-driven analys.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI-analys
            </CardTitle>
            <CardDescription>
              Baserat på {measurements.length} mätningar
            </CardDescription>
          </div>
          <StatusBadge status={analysis.progressStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Narrative */}
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-sm leading-relaxed">{analysis.narrative}</p>
        </div>

        {/* Trend Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <TrendCard
            title="Vikt"
            value={latestMeasurement.weightKg}
            weeklyChange={analysis.weeklyWeightChange}
            direction={analysis.weightTrend?.direction}
            unit="kg"
            isGood={options?.goal === 'weight_loss' && (analysis.weeklyWeightChange ?? 0) < 0}
          />
          <TrendCard
            title="Kroppsfett"
            value={latestMeasurement.bodyFatPercent}
            weeklyChange={analysis.weeklyFatChange}
            direction={analysis.fatTrend?.direction}
            unit="%"
            isGood={(analysis.weeklyFatChange ?? 0) < 0}
          />
          <TrendCard
            title="Muskelmassa"
            value={latestMeasurement.muscleMassKg}
            weeklyChange={analysis.weeklyMuscleChange}
            direction={analysis.muscleTrend?.direction}
            unit="kg"
            isGood={(analysis.weeklyMuscleChange ?? 0) > 0}
          />
        </div>

        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <div className="space-y-2">
            {analysis.warnings.map((warning, i) => (
              <Alert key={i} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Rekommendationer</h4>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
