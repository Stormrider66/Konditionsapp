'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TestBenchmarkBadge, type BenchmarkTier } from './TestBenchmarkBadge'
import { cn } from '@/lib/utils'

interface TestResultDisplayProps {
  title: string
  primaryValue: number | string
  primaryUnit: string
  secondaryValue?: number | string
  secondaryUnit?: string
  secondaryLabel?: string
  tier?: BenchmarkTier
  additionalMetrics?: Array<{
    label: string
    value: number | string
    unit?: string
  }>
  className?: string
}

export function TestResultDisplay({
  title,
  primaryValue,
  primaryUnit,
  secondaryValue,
  secondaryUnit,
  secondaryLabel,
  tier,
  additionalMetrics,
  className,
}: TestResultDisplayProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {tier && <TestBenchmarkBadge tier={tier} />}
        </div>
      </CardHeader>
      <CardContent>
        {/* Primary Result */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-bold text-primary">
            {typeof primaryValue === 'number' ? primaryValue.toFixed(1) : primaryValue}
          </span>
          <span className="text-xl text-muted-foreground">{primaryUnit}</span>
        </div>

        {/* Secondary Result */}
        {secondaryValue !== undefined && (
          <div className="flex items-baseline gap-2 mb-4 text-muted-foreground">
            {secondaryLabel && <span className="text-sm">{secondaryLabel}:</span>}
            <span className="text-2xl font-semibold">
              {typeof secondaryValue === 'number' ? secondaryValue.toFixed(2) : secondaryValue}
            </span>
            {secondaryUnit && <span className="text-lg">{secondaryUnit}</span>}
          </div>
        )}

        {/* Additional Metrics */}
        {additionalMetrics && additionalMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            {additionalMetrics.map((metric, index) => (
              <div key={index} className="text-sm">
                <span className="text-muted-foreground">{metric.label}: </span>
                <span className="font-medium">
                  {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
                  {metric.unit && ` ${metric.unit}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CompactResultProps {
  label: string
  value: number | string
  unit?: string
  tier?: BenchmarkTier
  className?: string
}

export function CompactResult({ label, value, unit, tier, className }: CompactResultProps) {
  return (
    <div className={cn('flex items-center justify-between p-3 rounded-lg bg-muted/50', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {typeof value === 'number' ? value.toFixed(1) : value}
          {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
        </span>
        {tier && <TestBenchmarkBadge tier={tier} size="sm" />}
      </div>
    </div>
  )
}
