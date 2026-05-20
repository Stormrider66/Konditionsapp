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
import { useLocale, useTranslations } from '@/i18n/client'

interface GoalProjectionProps {
  measurements: BodyCompositionMeasurement[]
  options: AnalysisOptions
  className?: string
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
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
  locale,
  currentLabel,
  targetLabel,
  weeksRemainingLabel,
  unavailableLabel,
}: {
  icon: typeof Target
  title: string
  current: number
  target: number
  unit: string
  weeks: number | null
  targetDate: Date | null
  color: string
  locale: string
  currentLabel: string
  targetLabel: string
  weeksRemainingLabel: (values: { weeks: number; date: string }) => string
  unavailableLabel: string
}) {
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
        <span className="text-muted-foreground">{currentLabel}</span>
        <span className="font-semibold">{current.toFixed(1)} {unit}</span>
      </div>

      <Progress value={progressPercent} className="h-2" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{targetLabel}</span>
        <span className="font-semibold">{target.toFixed(1)} {unit}</span>
      </div>

      {weeks !== null && targetDate !== null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
          <Calendar className="h-4 w-4" />
          <span>
            {weeksRemainingLabel({ weeks, date: formatDate(targetDate, locale) })}
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground pt-2 border-t">
          {unavailableLabel}
        </div>
      )}
    </div>
  )
}

export function GoalProjection({ measurements, options, className }: GoalProjectionProps) {
  const t = useTranslations('components.goalProjection')
  const locale = useLocale()
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
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('emptyDescription')}
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
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weight Goal */}
        {options.targetWeight && latestMeasurement.weightKg && (
          <ProjectionCard
            icon={Scale}
            title={t('goals.weight')}
            current={latestMeasurement.weightKg}
            target={options.targetWeight}
            unit="kg"
            weeks={analysis.projections.targetWeight?.weeks ?? null}
            targetDate={analysis.projections.targetWeight?.date ?? null}
            color="bg-blue-500"
            locale={locale}
            currentLabel={t('current')}
            targetLabel={t('target')}
            weeksRemainingLabel={(values) => t('weeksRemaining', values)}
            unavailableLabel={t('unavailable')}
          />
        )}

        {/* Body Fat Goal */}
        {options.targetBodyFatPercent && latestMeasurement.bodyFatPercent && (
          <ProjectionCard
            icon={TrendingDown}
            title={t('goals.bodyFat')}
            current={latestMeasurement.bodyFatPercent}
            target={options.targetBodyFatPercent}
            unit="%"
            weeks={analysis.projections.targetFatPercent?.weeks ?? null}
            targetDate={analysis.projections.targetFatPercent?.date ?? null}
            color="bg-orange-500"
            locale={locale}
            currentLabel={t('current')}
            targetLabel={t('target')}
            weeksRemainingLabel={(values) => t('weeksRemaining', values)}
            unavailableLabel={t('unavailable')}
          />
        )}

        {/* Muscle Mass Goal */}
        {options.targetMuscleMass && latestMeasurement.muscleMassKg && (
          <ProjectionCard
            icon={Dumbbell}
            title={t('goals.muscleMass')}
            current={latestMeasurement.muscleMassKg}
            target={options.targetMuscleMass}
            unit="kg"
            weeks={analysis.projections.targetMuscleMass?.weeks ?? null}
            targetDate={analysis.projections.targetMuscleMass?.date ?? null}
            color="bg-purple-500"
            locale={locale}
            currentLabel={t('current')}
            targetLabel={t('target')}
            weeksRemainingLabel={(values) => t('weeksRemaining', values)}
            unavailableLabel={t('unavailable')}
          />
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          {t('disclaimer')}
        </p>
      </CardContent>
    </Card>
  )
}
