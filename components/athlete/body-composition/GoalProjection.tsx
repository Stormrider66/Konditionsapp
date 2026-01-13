'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  Calendar,
  TrendingDown,
  Dumbbell,
  Scale
} from 'lucide-react'
import {
  analyzeBodyComposition,
  type BodyCompositionMeasurement,
  type AnalysisOptions
} from '@/lib/ai/body-composition-analyzer'
import { cn } from '@/lib/utils'

interface GoalProjectionProps {
  measurements: BodyCompositionMeasurement[]
  options: AnalysisOptions
  className?: string
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ProjectionCard({
  icon: Icon,
  title,
  current,
  target,
  unit,
  weeks,
  targetDate,
  color,
}: {
  icon: typeof Target
  title: string
  current: number
  target: number
  unit: string
  weeks: number | null
  targetDate: Date | null
  color: string
}) {
  const progress = Math.min(100, Math.max(0,
    ((current - target) / (current - target + (target - current))) * 100
  ))

  // Calculate actual progress based on direction
  const isDecreasing = target < current
  const progressPercent = isDecreasing
    ? Math.min(100, Math.max(0, 100 - ((current - target) / current) * 100))
    : Math.min(100, Math.max(0, (current / target) * 100))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="font-medium">{title}</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Nuvarande</span>
        <span className="font-semibold">{current.toFixed(1)} {unit}</span>
      </div>

      <Progress value={progressPercent} className="h-2" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Mål</span>
        <span className="font-semibold">{target.toFixed(1)} {unit}</span>
      </div>

      {weeks !== null && targetDate !== null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
          <Calendar className="h-4 w-4" />
          <span>
            ~{weeks} veckor kvar ({formatDate(targetDate)})
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground pt-2 border-t">
          Kan inte beräkna - behöver mer data eller justera mål
        </div>
      )}
    </div>
  )
}

export function GoalProjection({ measurements, options, className }: GoalProjectionProps) {
  const analysis = useMemo(
    () => analyzeBodyComposition(measurements, options),
    [measurements, options]
  )

  const latestMeasurement = measurements
    .filter(m => m.measurementDate)
    .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime())[0]

  if (!latestMeasurement) {
    return null
  }

  const hasAnyGoal = options.targetWeight || options.targetBodyFatPercent || options.targetMuscleMass
  if (!hasAnyGoal) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Målprojektion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sätt upp mål för vikt, kroppsfett eller muskelmassa för att se projektioner.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Målprojektion
        </CardTitle>
        <CardDescription>
          Baserat på nuvarande trender
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weight Goal */}
        {options.targetWeight && latestMeasurement.weightKg && (
          <ProjectionCard
            icon={Scale}
            title="Målvikt"
            current={latestMeasurement.weightKg}
            target={options.targetWeight}
            unit="kg"
            weeks={analysis.projections.targetWeight?.weeks ?? null}
            targetDate={analysis.projections.targetWeight?.date ?? null}
            color="bg-blue-500"
          />
        )}

        {/* Body Fat Goal */}
        {options.targetBodyFatPercent && latestMeasurement.bodyFatPercent && (
          <ProjectionCard
            icon={TrendingDown}
            title="Mål kroppsfett"
            current={latestMeasurement.bodyFatPercent}
            target={options.targetBodyFatPercent}
            unit="%"
            weeks={analysis.projections.targetFatPercent?.weeks ?? null}
            targetDate={analysis.projections.targetFatPercent?.date ?? null}
            color="bg-orange-500"
          />
        )}

        {/* Muscle Mass Goal */}
        {options.targetMuscleMass && latestMeasurement.muscleMassKg && (
          <ProjectionCard
            icon={Dumbbell}
            title="Mål muskelmassa"
            current={latestMeasurement.muscleMassKg}
            target={options.targetMuscleMass}
            unit="kg"
            weeks={analysis.projections.targetMuscleMass?.weeks ?? null}
            targetDate={analysis.projections.targetMuscleMass?.date ?? null}
            color="bg-purple-500"
          />
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          * Projektioner baseras på nuvarande trend och förutsätter konstant utveckling.
          Faktiska resultat kan variera.
        </p>
      </CardContent>
    </Card>
  )
}
