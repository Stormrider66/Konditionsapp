'use client'

/**
 * Analysis Result Card
 *
 * Displays AI-generated performance analysis results.
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Brain,
} from 'lucide-react'
import type {
  PerformanceAnalysisResult,
  KeyFinding,
  PerformancePrediction,
  TrainingRecommendation,
} from '@/lib/ai/performance-analysis/types'
import { cn } from '@/lib/utils'

interface AnalysisResultCardProps {
  result: PerformanceAnalysisResult
  className?: string
}

export function AnalysisResultCard({ result, className }: AnalysisResultCardProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary'])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>AI-analys</CardTitle>
          </div>
          <div className="flex gap-2">
            <ConfidenceBadge confidence={result.confidence} />
            <DataQualityBadge quality={result.dataQuality} />
          </div>
        </div>
        <CardDescription>
          Genererad {new Date(result.generatedAt).toLocaleString('sv-SE')}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="summary"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Sammanfattning
            </TabsTrigger>
            <TabsTrigger
              value="findings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Fynd ({result.keyFindings.length})
            </TabsTrigger>
            <TabsTrigger
              value="predictions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Prediktioner
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              Rekommendationer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="p-4 space-y-4">
            {/* Executive Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Sammanfattning
              </p>
              <p className="text-base">{result.executiveSummary}</p>
            </div>

            {/* Full Narrative */}
            <Collapsible
              open={expandedSections.includes('narrative')}
              onOpenChange={() => toggleSection('narrative')}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Fullständig analys</span>
                  {expandedSections.includes('narrative') ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">{result.narrative}</div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Strengths & Development Areas */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Styrkor
                </h4>
                <ul className="space-y-1">
                  {result.strengths.map((strength, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 mt-1">+</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Utvecklingsområden
                </h4>
                <ul className="space-y-1">
                  {result.developmentAreas.map((area, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-amber-600 mt-1">•</span>
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="findings" className="p-4">
            <div className="space-y-3">
              {result.keyFindings.map((finding, i) => (
                <FindingCard key={i} finding={finding} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="p-4">
            {result.predictions.length > 0 ? (
              <div className="space-y-3">
                {result.predictions.map((prediction, i) => (
                  <PredictionCard key={i} prediction={prediction} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Inga prediktioner tillgängliga för denna analys.
              </p>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="p-4">
            {result.recommendations.length > 0 ? (
              <div className="space-y-3">
                {result.recommendations.map((rec, i) => (
                  <RecommendationCard key={i} recommendation={rec} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Inga rekommendationer tillgängliga för denna analys.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ConfidenceBadge({ confidence }: { confidence: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const variants = {
    HIGH: { label: 'Hög konfidens', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    MEDIUM: { label: 'Medelkonfidens', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    LOW: { label: 'Låg konfidens', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  }

  const variant = variants[confidence]

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  )
}

function DataQualityBadge({ quality }: { quality: 'EXCELLENT' | 'GOOD' | 'LIMITED' }) {
  const variants = {
    EXCELLENT: { label: 'Utmärkt data', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    GOOD: { label: 'Bra data', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
    LIMITED: { label: 'Begränsad data', className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400' },
  }

  const variant = variants[quality]

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  )
}

function FindingCard({ finding }: { finding: KeyFinding }) {
  const categoryConfig = {
    IMPROVEMENT: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    DECLINE: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
    STRENGTH: { icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    WEAKNESS: { icon: Target, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    INSIGHT: { icon: Lightbulb, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    WARNING: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  }

  const config = categoryConfig[finding.category]
  const Icon = config.icon

  return (
    <div className={cn('p-4 rounded-lg', config.bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', config.color)} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium">{finding.title}</h4>
            <SignificanceBadge significance={finding.significance} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
          {finding.metric && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{finding.metric}</span>
              {finding.value !== undefined && (
                <span className="font-mono">{finding.value}</span>
              )}
              {finding.change !== undefined && (
                <span
                  className={cn(
                    'font-mono',
                    finding.change > 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {finding.change > 0 ? '+' : ''}
                  {finding.change.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SignificanceBadge({ significance }: { significance: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const variants = {
    HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    LOW: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  }

  const labels = { HIGH: 'Hög', MEDIUM: 'Medel', LOW: 'Låg' }

  return (
    <Badge variant="outline" className={cn('text-xs', variants[significance])}>
      {labels[significance]}
    </Badge>
  )
}

function PredictionCard({ prediction }: { prediction: PerformancePrediction }) {
  const typeLabels = {
    RACE_TIME: 'Tävlingstid',
    THRESHOLD: 'Tröskel',
    VO2MAX: 'VO2max',
    FITNESS_PEAK: 'Toppform',
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge variant="secondary" className="mb-2">
            {typeLabels[prediction.type]}
          </Badge>
          <h4 className="font-medium">{prediction.title}</h4>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Konfidens</div>
          <div className="font-mono text-lg">{(prediction.confidence * 100).toFixed(0)}%</div>
        </div>
      </div>
      <p className="text-sm mt-2">{prediction.prediction}</p>
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Baserat på: {prediction.basis}</span>
          {prediction.timeframe && <span>Tidshorisont: {prediction.timeframe}</span>}
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation }: { recommendation: TrainingRecommendation }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const categoryLabels = {
    VOLUME: 'Volym',
    INTENSITY: 'Intensitet',
    RECOVERY: 'Återhämtning',
    TECHNIQUE: 'Teknik',
    STRENGTH: 'Styrka',
    NUTRITION: 'Kost',
  }

  const priorityColors = {
    1: 'border-red-300 bg-red-50 dark:bg-red-950/30',
    2: 'border-amber-300 bg-amber-50 dark:bg-amber-950/30',
    3: 'border-slate-300 bg-slate-50 dark:bg-slate-950/30',
  }

  return (
    <div className={cn('p-4 border-2 rounded-lg', priorityColors[recommendation.priority])}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {categoryLabels[recommendation.category]}
          </Badge>
          <Badge
            variant={recommendation.priority === 1 ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            Prioritet {recommendation.priority}
          </Badge>
        </div>
      </div>
      <h4 className="font-medium mt-2">{recommendation.title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{recommendation.description}</p>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
            {isExpanded ? 'Visa mindre' : 'Visa mer'}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 pt-3 border-t space-y-2 text-sm">
          <div>
            <span className="font-medium">Varför: </span>
            <span className="text-muted-foreground">{recommendation.rationale}</span>
          </div>
          <div>
            <span className="font-medium">Implementering: </span>
            <span className="text-muted-foreground">{recommendation.implementation}</span>
          </div>
          <div>
            <span className="font-medium">Förväntad effekt: </span>
            <span className="text-muted-foreground">{recommendation.expectedOutcome}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
