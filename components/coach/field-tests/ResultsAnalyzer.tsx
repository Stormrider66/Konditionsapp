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
  LineChart,
  Line,
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
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react'
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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ResultsAnalyzerProps {
  initialTestId?: string
}

export default function ResultsAnalyzer({ initialTestId }: ResultsAnalyzerProps) {
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
          <CardTitle>Fälttestanalys</CardTitle>
          <CardDescription>Välj ett fälttest för att visa detaljerad analys</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleTestChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj fälttest..." />
            </SelectTrigger>
            <SelectContent>
              {tests?.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.athleteName} - {test.testType} ({new Date(test.testDate).toLocaleDateString('sv-SE')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Laddar testanalys...</div>
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Kunde inte ladda testanalys.</AlertDescription>
      </Alert>
    )
  }

  const { analysis, athleteName, testDate, testType } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Fälttestanalys</h2>
          <p className="text-sm text-muted-foreground">
            {athleteName} - {new Date(testDate).toLocaleDateString('sv-SE', { dateStyle: 'long' })}
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
            {analysis.confidence === 'VERY_HIGH'
              ? 'Mycket hög tillförlitlighet'
              : analysis.confidence === 'HIGH'
              ? 'Hög tillförlitlighet'
              : analysis.confidence === 'MEDIUM'
              ? 'Medel tillförlitlighet'
              : 'Låg tillförlitlighet'}
          </Badge>

          {/* AI Analysis Button */}
          <AIContextButton
            athleteName={athleteName}
            buttonText="Analysera"
            quickActions={[
              { label: 'Förklara testresultat', prompt: `Förklara dessa fälttestresultat för ${athleteName} och vad de betyder för träningen` },
              { label: 'Rekommendera träningszoner', prompt: `Baserat på fälttestresultaten för ${athleteName}, rekommendera optimala träningszoner` },
              { label: 'Jämför med normvärden', prompt: `Jämför ${athleteName}s fälttestresultat med typiska normvärden för deras nivå` },
              { label: 'Föreslå nästa steg', prompt: `Baserat på fälttestresultaten, vad bör ${athleteName} fokusera på i sin träning framöver?` },
            ]}
          />

          {/* Test selector */}
          <Select value={selectedTest} onValueChange={handleTestChange}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tests?.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.athleteName} - {test.testType} ({new Date(test.testDate).toLocaleDateString('sv-SE')})
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
            <strong>Valideringsvarningar:</strong>
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
                  <CardTitle>Beräknade resultat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {analysis.calculated.lt2Pace}
                      </div>
                      <div className="text-sm text-muted-foreground">LT2-tempo</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.calculated.lt2HR}</div>
                      <div className="text-sm text-muted-foreground">LT2-puls</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.calculated.avgPace}</div>
                      <div className="text-sm text-muted-foreground">Genomsnittstempo</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">
                        {(analysis.calculated.distance / 1000).toFixed(2)} km
                      </div>
                      <div className="text-sm text-muted-foreground">Total distans</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pacing Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Tempojämnhet (10-minutersintervaller)</CardTitle>
                  <CardDescription>
                    CV: {analysis.pacing.consistency}% -{' '}
                    {analysis.pacing.quality === 'EXCELLENT'
                      ? 'Utmärkt'
                      : analysis.pacing.quality === 'GOOD'
                      ? 'Bra'
                      : analysis.pacing.quality === 'FAIR'
                      ? 'Okej'
                      : 'Dålig'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analysis.splits}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="split" />
                      <YAxis label={{ value: 'Puls', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgHR" name="Genomsnittspuls" fill="#3b82f6" />
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
                          Negativt split (snabbare i slutet)
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Positivt split (långsammare i slutet)
                        </>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* HR Drift Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Pulsdrift</CardTitle>
                  <CardDescription>
                    Drift: {analysis.hrDrift.drift}% -{' '}
                    {analysis.hrDrift.quality === 'LOW'
                      ? 'Låg (bra)'
                      : analysis.hrDrift.quality === 'MODERATE'
                      ? 'Måttlig'
                      : 'Hög (för högt tempo)'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {analysis.hrDrift.firstHalf}
                      </div>
                      <div className="text-sm text-muted-foreground">Första halvan</div>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {analysis.hrDrift.secondHalf}
                      </div>
                      <div className="text-sm text-muted-foreground">Andra halvan</div>
                    </div>
                  </div>

                  {analysis.hrDrift.quality === 'LOW' && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Låg pulsdrift (&lt;5%) indikerar bra kontrollerat tempo vid eller strax under LT2.
                      </AlertDescription>
                    </Alert>
                  )}

                  {analysis.hrDrift.quality === 'HIGH' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Hög pulsdrift (&gt;10%) indikerar för högt tempo eller otillräcklig återhämtning.
                        Överväg omtest med lägre tempo.
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
                  <CardTitle>Critical Velocity Resultat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {analysis.regression.criticalVelocity}
                      </div>
                      <div className="text-sm text-muted-foreground">Critical Velocity (≈ LT2)</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.regression.rSquared}</div>
                      <div className="text-sm text-muted-foreground">R² (godhet)</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.trials.length}</div>
                      <div className="text-sm text-muted-foreground">Antal försök</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Regression Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distans vs Tid (Regressionslinje)</CardTitle>
                  <CardDescription>
                    R² = {analysis.regression.rSquared} (
                    {analysis.regression.rSquared >= 0.95
                      ? 'Utmärkt'
                      : analysis.regression.rSquared >= 0.90
                      ? 'Bra'
                      : 'För låg - lägg till fler försök'}
                    )
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        name="Tid"
                        unit=" s"
                        label={{ value: 'Tid (sekunder)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis
                        dataKey="distance"
                        name="Distans"
                        unit=" m"
                        label={{ value: 'Distans (meter)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter
                        name="Försök"
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
                        label="Regressionslinje"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>

                  {analysis.regression.rSquared < 0.90 && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        R² &lt;0.90 indikerar dålig linjäritet. Rekommendation: Lägg till minst 1 försök till eller kontrollera att försöken utfördes korrekt.
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
                  <CardTitle>HR Drift Test Resultat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">
                        {analysis.drift.percentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">Pulsdrift</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.pace}</div>
                      <div className="text-sm text-muted-foreground">Testtempo</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{analysis.duration} min</div>
                      <div className="text-sm text-muted-foreground">Testtid</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* HR Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Pulsfördelning (Första vs Andra halvan)</CardTitle>
                  <CardDescription>
                    Bedömning:{' '}
                    {analysis.drift.assessment === 'BELOW_LT1'
                      ? 'Under LT1'
                      : analysis.drift.assessment === 'AT_LT1'
                      ? 'Vid LT1'
                      : analysis.drift.assessment === 'ABOVE_LT1'
                      ? 'Över LT1'
                      : 'Väl över LT1'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { period: 'Första halvan', puls: analysis.hrData.firstHalf.avgHR },
                        { period: 'Andra halvan', puls: analysis.hrData.secondHalf.avgHR },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis label={{ value: 'Puls', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="puls" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-2">
                    {analysis.drift.assessment === 'BELOW_LT1' && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Drift &lt;3%:</strong> Tempot är under LT1 (aerob tröskel).
                          Estimerat LT1-tempo: {analysis.calculated.estimatedLT1Pace || analysis.pace}
                        </AlertDescription>
                      </Alert>
                    )}

                    {analysis.drift.assessment === 'AT_LT1' && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Drift 3-5%:</strong> Tempot är vid LT1 (aerob tröskel).
                          Estimerat LT1-tempo: {analysis.calculated.estimatedLT1Pace || analysis.pace}
                        </AlertDescription>
                      </Alert>
                    )}

                    {(analysis.drift.assessment === 'ABOVE_LT1' ||
                      analysis.drift.assessment === 'WELL_ABOVE_LT1') && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Drift &gt;{analysis.drift.assessment === 'WELL_ABOVE_LT1' ? '10' : '5'}%:</strong> Tempot är över LT1. Sänk tempo och kör om testet för att hitta LT1.
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
