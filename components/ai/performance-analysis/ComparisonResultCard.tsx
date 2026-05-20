'use client'

/**
 * Comparison Result Card
 *
 * Displays AI-generated test comparison results with delta visualization.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocale, useTranslations } from '@/i18n/client'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  GitCompare,
} from 'lucide-react'
import type {
  TestComparisonResult,
  DeltaValue,
} from '@/lib/ai/performance-analysis/types'
import { cn } from '@/lib/utils'
import { AnalysisResultCard } from './AnalysisResultCard'

interface ComparisonResultCardProps {
  result: TestComparisonResult
  className?: string
}

type AppLocale = 'en' | 'sv'

export function ComparisonResultCard({ result, className }: ComparisonResultCardProps) {
  const t = useTranslations('components.comparisonResultCard')
  const locale = useLocale() as AppLocale

  return (
    <div className={cn('space-y-4', className)}>
      {/* Comparison Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-600" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
          <CardDescription>
            {formatDate(result.comparison.testDates.previous, locale)} → {formatDate(result.comparison.testDates.current, locale)}
            <span className="ml-2 text-muted-foreground">
              ({result.comparison.testDates.daysBetween} {t('days')})
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deltas">
            <TabsList>
              <TabsTrigger value="deltas">{t('tabs.deltas')}</TabsTrigger>
              <TabsTrigger value="training">{t('tabs.training')}</TabsTrigger>
              {result.correlationAnalysis && (
                <TabsTrigger value="correlation">{t('tabs.correlation')}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="deltas" className="mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <DeltaCard label={t('deltaLabels.vo2max')} unit="ml/kg/min" delta={result.comparison.deltas.vo2max} />
                <DeltaCard label={t('deltaLabels.maxHR')} unit="bpm" delta={result.comparison.deltas.maxHR} />
                <DeltaCard label={t('deltaLabels.aerobicThresholdHR')} unit="bpm" delta={result.comparison.deltas.aerobicThresholdHR} />
                <DeltaCard label={t('deltaLabels.aerobicThresholdIntensity')} delta={result.comparison.deltas.aerobicThresholdIntensity} />
                <DeltaCard label={t('deltaLabels.anaerobicThresholdHR')} unit="bpm" delta={result.comparison.deltas.anaerobicThresholdHR} />
                <DeltaCard label={t('deltaLabels.anaerobicThresholdIntensity')} delta={result.comparison.deltas.anaerobicThresholdIntensity} />
                <DeltaCard label={t('deltaLabels.economy')} unit="ml/kg/km" delta={result.comparison.deltas.economy} inverted />
                <DeltaCard label={t('deltaLabels.maxLactate')} unit="mmol/L" delta={result.comparison.deltas.maxLactate} />
              </div>
            </TabsContent>

            <TabsContent value="training" className="mt-4">
              {result.comparison.trainingBetweenTests ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label={t('stats.weeks')}
                    value={result.comparison.trainingBetweenTests.weeks.toString()}
                  />
                  <StatCard
                    label={t('stats.totalSessions')}
                    value={result.comparison.trainingBetweenTests.totalSessions.toString()}
                  />
                  <StatCard
                    label={t('stats.avgWeeklyVolume')}
                    value={result.comparison.trainingBetweenTests.avgWeeklyVolume}
                  />
                  <StatCard
                    label={t('stats.dominantTrainingType')}
                    value={result.comparison.trainingBetweenTests.dominantTrainingType}
                  />
                  <div className="md:col-span-2 lg:col-span-4">
                    <StatCard
                      label={t('stats.zoneDistribution')}
                      value={result.comparison.trainingBetweenTests.zoneDistributionSummary}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {t('noTrainingData')}
                </p>
              )}
            </TabsContent>

            {result.correlationAnalysis && (
              <TabsContent value="correlation" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{t('correlation.likelyContributors')}</h4>
                    <div className="space-y-2">
                      {result.correlationAnalysis.likelyContributors.map((contributor, i) => (
                        <div
                          key={i}
                          className={cn(
                            'p-3 rounded-lg',
                            contributor.impact === 'POSITIVE' && 'bg-green-50 dark:bg-green-950/30',
                            contributor.impact === 'NEGATIVE' && 'bg-red-50 dark:bg-red-950/30',
                            contributor.impact === 'NEUTRAL' && 'bg-slate-50 dark:bg-slate-950/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{contributor.factor}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {contributor.impact === 'POSITIVE' && t('trend.positive')}
                                {contributor.impact === 'NEGATIVE' && t('trend.negative')}
                                {contributor.impact === 'NEUTRAL' && t('trend.neutral')}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {(contributor.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {contributor.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.correlationAnalysis.unexplainedVariance && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <h4 className="font-medium text-amber-800 dark:text-amber-400">
                        {t('correlation.unexplainedVarianceTitle')}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.correlationAnalysis.unexplainedVariance}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Full Analysis */}
      <AnalysisResultCard result={result} />
    </div>
  )
}

interface DeltaCardProps {
  label: string
  unit?: string
  delta: DeltaValue | null
  inverted?: boolean // For metrics where lower is better
}

function DeltaCard({ label, unit, delta, inverted }: DeltaCardProps) {
  if (!delta) {
    return (
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-lg font-medium text-muted-foreground">N/A</div>
      </div>
    )
  }

  // Determine if this is actually an improvement considering the metric type
  const isImproved = inverted ? delta.trend === 'DECLINED' : delta.trend === 'IMPROVED'
  const isDeclined = inverted ? delta.trend === 'IMPROVED' : delta.trend === 'DECLINED'

  const TrendIcon = delta.trend === 'IMPROVED' ? TrendingUp :
                    delta.trend === 'DECLINED' ? TrendingDown : Minus

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isImproved && 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900',
      isDeclined && 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
      delta.trend === 'STABLE' && 'bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-900'
    )}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{delta.previous.toFixed(1)}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-lg font-medium">{delta.current.toFixed(1)}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        <div className={cn(
          'flex items-center gap-1',
          isImproved && 'text-green-600',
          isDeclined && 'text-red-600',
          delta.trend === 'STABLE' && 'text-slate-500'
        )}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {delta.absoluteChange > 0 ? '+' : ''}{delta.absoluteChange.toFixed(1)}
            <span className="text-xs ml-1">({delta.percentChange > 0 ? '+' : ''}{delta.percentChange.toFixed(1)}%)</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  )
}

function formatDate(dateStr: string, locale: AppLocale): string {
  return new Date(dateStr).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
