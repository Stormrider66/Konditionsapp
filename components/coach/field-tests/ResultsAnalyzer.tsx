'use client'

// components/coach/field-tests/ResultsAnalyzer.tsx
/**
 * Field Test Results Analyzer
 *
 * Comprehensive analysis display for three field test types:
 * - 30-Minute Time Trial: Split pacing + HR drift charts
 * - Critical Velocity: Scatter plot + regression line
 * - HR Drift: First vs second half HR comparison
 *
 * Features:
 * - Tab-based navigation per test type
 * - Recharts visualizations
 * - Calculated results cards
 * - Validation warnings
 * - Confidence level badges
 * - Recommendations
 */

import React, { useState } from 'react'
import useSWR from 'swr'
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { useLocale } from '@/i18n/client'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type AppLocale = 'en' | 'sv'

const copy = {
  en: {
    title: 'Field Test Analysis',
    selectDescription: 'Select a field test to view detailed analysis',
    selectPlaceholder: 'Select field test...',
    loading: 'Loading test analysis...',
    loadError: 'Could not load test analysis.',
    confidence: {
      VERY_HIGH: 'Very high confidence',
      HIGH: 'High confidence',
      MEDIUM: 'Medium confidence',
      LOW: 'Low confidence',
    },
    ai: {
      button: 'Analyze',
      actions: (athleteName: string) => [
        {
          label: 'Explain test results',
          prompt: `Explain these field test results for ${athleteName} and what they mean for training`,
        },
        {
          label: 'Recommend training zones',
          prompt: `Based on the field test results for ${athleteName}, recommend optimal training zones`,
        },
        {
          label: 'Compare with norms',
          prompt: `Compare ${athleteName}'s field test results with typical norms for their level`,
        },
        {
          label: 'Suggest next steps',
          prompt: `Based on the field test results, what should ${athleteName} focus on in training going forward?`,
        },
      ],
    },
    validationWarnings: 'Validation warnings:',
    calculatedResults: 'Calculated results',
    labels: {
      lt2Pace: 'LT2 pace',
      lt2HR: 'LT2 heart rate',
      avgPace: 'Average pace',
      totalDistance: 'Total distance',
      avgHR: 'Average heart rate',
      heartRate: 'Heart rate',
      firstHalf: 'First half',
      secondHalf: 'Second half',
      attempts: 'Attempts',
      distance: 'Distance',
      time: 'Time',
      testPace: 'Test pace',
      testDuration: 'Test duration',
      goodness: 'fit quality',
      regressionLine: 'Regression line',
      assessment: 'Assessment:',
      heartRateDrift: 'Heart rate drift',
      seconds: 'seconds',
      meters: 'meters',
    },
    pacing: {
      title: 'Pacing consistency (10-minute intervals)',
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      negative: 'Negative split (faster at the end)',
      positive: 'Positive split (slower at the end)',
    },
    hrDrift: {
      title: 'Heart rate drift',
      lowGood: 'Low (good)',
      moderate: 'Moderate',
      highTooFast: 'High (pace too high)',
      lowAlert: 'Low heart rate drift (<5%) indicates well-controlled pacing at or just below LT2.',
      highAlert:
        'High heart rate drift (>10%) indicates the pace was too high or recovery was insufficient. Consider retesting at a lower pace.',
    },
    criticalVelocity: {
      title: 'Critical Velocity Results',
      chartTitle: 'Distance vs Time (Regression Line)',
      criticalVelocity: 'Critical Velocity (≈ LT2)',
      lowRSquared:
        'R² <0.90 indicates poor linearity. Recommendation: add at least one more attempt or check that the attempts were performed correctly.',
      tooLow: 'Too low - add more attempts',
    },
    hrDriftTest: {
      title: 'HR Drift Test Results',
      chartTitle: 'Heart Rate Distribution (First vs Second Half)',
      belowLT1: 'Below LT1',
      atLT1: 'At LT1',
      aboveLT1: 'Above LT1',
      wellAboveLT1: 'Well above LT1',
      belowAlert: 'The pace is below LT1 (aerobic threshold). Estimated LT1 pace:',
      atAlert: 'The pace is at LT1 (aerobic threshold). Estimated LT1 pace:',
      aboveAlert: 'The pace is above LT1. Lower the pace and repeat the test to find LT1.',
    },
  },
  sv: {
    title: 'Fälttestanalys',
    selectDescription: 'Välj ett fälttest för att visa detaljerad analys',
    selectPlaceholder: 'Välj fälttest...',
    loading: 'Laddar testanalys...',
    loadError: 'Kunde inte ladda testanalys.',
    confidence: {
      VERY_HIGH: 'Mycket hög tillförlitlighet',
      HIGH: 'Hög tillförlitlighet',
      MEDIUM: 'Medel tillförlitlighet',
      LOW: 'Låg tillförlitlighet',
    },
    ai: {
      button: 'Analysera',
      actions: (athleteName: string) => [
        {
          label: 'Förklara testresultat',
          prompt: `Förklara dessa fälttestresultat för ${athleteName} och vad de betyder för träningen`,
        },
        {
          label: 'Rekommendera träningszoner',
          prompt: `Baserat på fälttestresultaten för ${athleteName}, rekommendera optimala träningszoner`,
        },
        {
          label: 'Jämför med normvärden',
          prompt: `Jämför ${athleteName}s fälttestresultat med typiska normvärden för deras nivå`,
        },
        {
          label: 'Föreslå nästa steg',
          prompt: `Baserat på fälttestresultaten, vad bör ${athleteName} fokusera på i sin träning framöver?`,
        },
      ],
    },
    validationWarnings: 'Valideringsvarningar:',
    calculatedResults: 'Beräknade resultat',
    labels: {
      lt2Pace: 'LT2-tempo',
      lt2HR: 'LT2-puls',
      avgPace: 'Genomsnittstempo',
      totalDistance: 'Total distans',
      avgHR: 'Genomsnittspuls',
      heartRate: 'Puls',
      firstHalf: 'Första halvan',
      secondHalf: 'Andra halvan',
      attempts: 'Antal försök',
      distance: 'Distans',
      time: 'Tid',
      testPace: 'Testtempo',
      testDuration: 'Testtid',
      goodness: 'godhet',
      regressionLine: 'Regressionslinje',
      assessment: 'Bedömning:',
      heartRateDrift: 'Pulsdrift',
      seconds: 'sekunder',
      meters: 'meter',
    },
    pacing: {
      title: 'Tempojämnhet (10-minutersintervaller)',
      excellent: 'Utmärkt',
      good: 'Bra',
      fair: 'Okej',
      poor: 'Dålig',
      negative: 'Negativt split (snabbare i slutet)',
      positive: 'Positivt split (långsammare i slutet)',
    },
    hrDrift: {
      title: 'Pulsdrift',
      lowGood: 'Låg (bra)',
      moderate: 'Måttlig',
      highTooFast: 'Hög (för högt tempo)',
      lowAlert: 'Låg pulsdrift (<5%) indikerar bra kontrollerat tempo vid eller strax under LT2.',
      highAlert:
        'Hög pulsdrift (>10%) indikerar för högt tempo eller otillräcklig återhämtning. Överväg omtest med lägre tempo.',
    },
    criticalVelocity: {
      title: 'Critical Velocity Resultat',
      chartTitle: 'Distans vs Tid (Regressionslinje)',
      criticalVelocity: 'Critical Velocity (≈ LT2)',
      lowRSquared:
        'R² <0.90 indikerar dålig linjäritet. Rekommendation: Lägg till minst 1 försök till eller kontrollera att försöken utfördes korrekt.',
      tooLow: 'För låg - lägg till fler försök',
    },
    hrDriftTest: {
      title: 'HR Drift Test Resultat',
      chartTitle: 'Pulsfördelning (Första vs Andra halvan)',
      belowLT1: 'Under LT1',
      atLT1: 'Vid LT1',
      aboveLT1: 'Över LT1',
      wellAboveLT1: 'Väl över LT1',
      belowAlert: 'Tempot är under LT1 (aerob tröskel). Estimerat LT1-tempo:',
      atAlert: 'Tempot är vid LT1 (aerob tröskel). Estimerat LT1-tempo:',
      aboveAlert: 'Tempot är över LT1. Sänk tempo och kör om testet för att hitta LT1.',
    },
  },
} as const

function formatDate(date: Date | string, locale: AppLocale, options?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', options)
}

interface ResultsAnalyzerProps {
  initialTestId?: string
}

export default function ResultsAnalyzer({ initialTestId }: ResultsAnalyzerProps) {
  const locale = useLocale() as AppLocale
  const t = copy[locale] ?? copy.en
  const [selectedTest, setSelectedTest] = useState<string>(initialTestId || '')

  // Fetch field tests list
  const { data: tests } = useSWR<any[]>('/api/field-tests', fetcher)

  // Fetch test analysis
  const { data, error, isLoading } = useSWR<any>(
    selectedTest ? `/api/field-tests/${selectedTest}/analysis` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleTestChange = (testId: string) => {
    setSelectedTest(testId)
  }

  if (!selectedTest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.selectDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleTestChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t.selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {tests?.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.athleteName} - {test.testType} ({formatDate(test.testDate, locale)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <div className="text-muted-foreground">{t.loading}</div>
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t.loadError}</AlertDescription>
      </Alert>
    )
  }

  const { analysis, athleteName, testDate, testType } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">
            {athleteName} - {formatDate(testDate, locale, { dateStyle: 'long' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Confidence badge */}
          <Badge
            variant={
              analysis.confidence === 'VERY_HIGH' || analysis.confidence === 'HIGH'
                ? 'default'
                : analysis.confidence === 'MEDIUM'
                ? 'outline'
                : 'destructive'
            }
            className="text-lg px-4 py-2"
          >
            {t.confidence[analysis.confidence as keyof typeof t.confidence] ?? t.confidence.LOW}
          </Badge>

          {/* AI Analysis Button */}
          <AIContextButton
            athleteName={athleteName}
            buttonText={t.ai.button}
            quickActions={t.ai.actions(athleteName)}
          />

          {/* Test selector */}
          <Select value={selectedTest} onValueChange={handleTestChange}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tests?.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.athleteName} - {test.testType} ({formatDate(test.testDate, locale)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Validation warnings */}
      {analysis.validationWarnings && analysis.validationWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t.validationWarnings}</strong>
            <ul className="list-disc list-inside mt-2">
              {analysis.validationWarnings.map((warning: string, index: number) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Test-specific content */}
      <Tabs defaultValue={testType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="30_MIN_TT">30-Min TT</TabsTrigger>
          <TabsTrigger value="CRITICAL_VELOCITY">Critical Velocity</TabsTrigger>
          <TabsTrigger value="HR_DRIFT">HR Drift</TabsTrigger>
        </TabsList>

        {/* 30-Minute Time Trial */}
        <TabsContent value="30_MIN_TT" className="space-y-6">
          {testType === '30_MIN_TT' && (
            <>
              {/* Calculated Results Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.calculatedResults}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {analysis.calculated.lt2Pace}
                      </div>
                      <div className="text-sm text-muted-foreground">{t.labels.lt2Pace}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.calculated.lt2HR}</div>
                      <div className="text-sm text-muted-foreground">{t.labels.lt2HR}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.calculated.avgPace}</div>
                      <div className="text-sm text-muted-foreground">{t.labels.avgPace}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">
                        {(analysis.calculated.distance / 1000).toFixed(2)} km
                      </div>
                      <div className="text-sm text-muted-foreground">{t.labels.totalDistance}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pacing Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.pacing.title}</CardTitle>
                  <CardDescription>
                    CV: {analysis.pacing.consistency}% -{' '}
                    {analysis.pacing.quality === 'EXCELLENT'
                      ? t.pacing.excellent
                      : analysis.pacing.quality === 'GOOD'
                      ? t.pacing.good
                      : analysis.pacing.quality === 'FAIR'
                      ? t.pacing.fair
                      : t.pacing.poor}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analysis.splits}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="split" />
                      <YAxis label={{ value: t.labels.heartRate, angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgHR" name={t.labels.avgHR} fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4">
                    <Badge
                      variant={analysis.pacing.negative ? 'default' : 'outline'}
                      className="mr-2"
                    >
                      {analysis.pacing.negative ? (
                        <>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {t.pacing.negative}
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {t.pacing.positive}
                        </>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* HR Drift Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.hrDrift.title}</CardTitle>
                  <CardDescription>
                    Drift: {analysis.hrDrift.drift}% -{' '}
                    {analysis.hrDrift.quality === 'LOW'
                      ? t.hrDrift.lowGood
                      : analysis.hrDrift.quality === 'MODERATE'
                      ? t.hrDrift.moderate
                      : t.hrDrift.highTooFast}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {analysis.hrDrift.firstHalf}
                      </div>
                      <div className="text-sm text-muted-foreground">{t.labels.firstHalf}</div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {analysis.hrDrift.secondHalf}
                      </div>
                      <div className="text-sm text-muted-foreground">{t.labels.secondHalf}</div>
                    </div>
                  </div>

                  {analysis.hrDrift.quality === 'LOW' && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t.hrDrift.lowAlert}
                      </AlertDescription>
                    </Alert>
                  )}

                  {analysis.hrDrift.quality === 'HIGH' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {t.hrDrift.highAlert}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Critical Velocity */}
        <TabsContent value="CRITICAL_VELOCITY" className="space-y-6">
          {testType === 'CRITICAL_VELOCITY' && (
            <>
              {/* Calculated Results */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.criticalVelocity.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {analysis.regression.criticalVelocity}
                      </div>
                      <div className="text-sm text-muted-foreground">{t.criticalVelocity.criticalVelocity}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.regression.rSquared}</div>
                      <div className="text-sm text-muted-foreground">R² ({t.labels.goodness})</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.trials.length}</div>
                      <div className="text-sm text-muted-foreground">{t.labels.attempts}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Regression Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.criticalVelocity.chartTitle}</CardTitle>
                  <CardDescription>
                    R² = {analysis.regression.rSquared} (
                    {analysis.regression.rSquared >= 0.95
                      ? t.pacing.excellent
                      : analysis.regression.rSquared >= 0.90
                      ? t.pacing.good
                      : t.criticalVelocity.tooLow}
                    )
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        name={t.labels.time}
                        unit=" s"
                        label={{ value: `${t.labels.time} (${t.labels.seconds})`, position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        dataKey="distance"
                        name={t.labels.distance}
                        unit=" m"
                        label={{ value: `${t.labels.distance} (${t.labels.meters})`, angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter
                        name={t.labels.attempts}
                        data={analysis.trials}
                        fill="#3b82f6"
                        shape="circle"
                      />
                      <ReferenceLine
                        stroke="#10b981"
                        strokeWidth={2}
                        segment={[
                          {
                            x: Math.min(...analysis.trials.map((t: any) => t.time)),
                            y:
                              analysis.regression.slope *
                                Math.min(...analysis.trials.map((t: any) => t.time)) +
                              analysis.regression.intercept,
                          },
                          {
                            x: Math.max(...analysis.trials.map((t: any) => t.time)),
                            y:
                              analysis.regression.slope *
                                Math.max(...analysis.trials.map((t: any) => t.time)) +
                              analysis.regression.intercept,
                          },
                        ]}
                        label={t.labels.regressionLine}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>

                  {analysis.regression.rSquared < 0.90 && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                        {t.criticalVelocity.lowRSquared}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* HR Drift */}
        <TabsContent value="HR_DRIFT" className="space-y-6">
          {testType === 'HR_DRIFT' && (
            <>
              {/* Results Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.hrDriftTest.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {analysis.drift.percentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">{t.labels.heartRateDrift}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.pace}</div>
                      <div className="text-sm text-muted-foreground">{t.labels.testPace}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.duration} min</div>
                      <div className="text-sm text-muted-foreground">{t.labels.testDuration}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* HR Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>{t.hrDriftTest.chartTitle}</CardTitle>
                  <CardDescription>
                    {t.labels.assessment}{' '}
                    {analysis.drift.assessment === 'BELOW_LT1'
                      ? t.hrDriftTest.belowLT1
                      : analysis.drift.assessment === 'AT_LT1'
                      ? t.hrDriftTest.atLT1
                      : analysis.drift.assessment === 'ABOVE_LT1'
                      ? t.hrDriftTest.aboveLT1
                      : t.hrDriftTest.wellAboveLT1}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { period: t.labels.firstHalf, heartRate: analysis.hrData.firstHalf.avgHR },
                        { period: t.labels.secondHalf, heartRate: analysis.hrData.secondHalf.avgHR },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis label={{ value: t.labels.heartRate, angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="heartRate" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-2">
                    {analysis.drift.assessment === 'BELOW_LT1' && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Drift &lt;3%:</strong> {t.hrDriftTest.belowAlert}{' '}
                          {analysis.calculated.estimatedLT1Pace || analysis.pace}
                        </AlertDescription>
                      </Alert>
                    )}

                    {analysis.drift.assessment === 'AT_LT1' && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Drift 3-5%:</strong> {t.hrDriftTest.atAlert}{' '}
                          {analysis.calculated.estimatedLT1Pace || analysis.pace}
                        </AlertDescription>
                      </Alert>
                    )}

                    {(analysis.drift.assessment === 'ABOVE_LT1' ||
                      analysis.drift.assessment === 'WELL_ABOVE_LT1') && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Drift &gt;{analysis.drift.assessment === 'WELL_ABOVE_LT1' ? '10' : '5'}%:</strong> {t.hrDriftTest.aboveAlert}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
