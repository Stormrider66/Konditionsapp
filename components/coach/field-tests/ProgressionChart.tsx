'use client'

// components/coach/field-tests/ProgressionChart.tsx
/**
 * Field Test Progression Chart
 *
 * Shows LT2 pace progression over time with:
 * - Field test line (blue) with confidence level sizing
 * - Lab test line (orange) for comparison
 * - Trend analysis
 * - Divergence analysis
 * - Recommendations
 *
 * Features:
 * - Recharts LineChart with dual lines
 * - Confidence level indicators (dot size)
 * - Trend analysis box
 * - Test frequency recommendations
 */

import React, { useState } from 'react'
import useSWR from 'swr'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ProgressionChartProps {
  initialClientId?: string
}

export default function ProgressionChart({ initialClientId }: ProgressionChartProps) {
  const [selectedClient, setSelectedClient] = useState<string>(initialClientId || '')

  // Fetch clients
  const { data: clients } = useSWR<any[]>('/api/clients', fetcher)

  // Fetch progression data
  const { data, error, isLoading } = useSWR<any>(
    selectedClient ? `/api/field-tests/progression/${selectedClient}` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
  }

  if (!selectedClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fälttest Progression</CardTitle>
          <CardDescription>Välj en atlet för att visa testprogression över tid</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleClientChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Välj atlet..." />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Laddar progression...</div>
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Kunde inte ladda testprogression.</AlertDescription>
      </Alert>
    )
  }

  const {
    fieldTests,
    labTests,
    trendAnalysis,
    divergenceAnalysis,
    recommendations,
    summary,
  } = data

  // Combine field and lab tests for chart
  const chartData: any[] = []

  // Add field tests
  fieldTests.forEach((ft: any) => {
    if (!ft.valid || !ft.lt2PaceSeconds) return

    chartData.push({
      date: ft.date,
      fieldTestPace: ft.lt2PaceSeconds,
      confidence: ft.confidence,
      testType: ft.testType,
      source: 'FIELD',
    })
  })

  // Add lab tests
  labTests.forEach((lt: any) => {
    if (!lt.lt2PaceSeconds) return

    chartData.push({
      date: lt.date,
      labTestPace: lt.lt2PaceSeconds,
      source: 'LAB',
    })
  })

  // Sort by date
  chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Fill missing values (for continuous line)
  const filledData = chartData.map((point) => ({
    ...point,
    fieldTestPace: point.fieldTestPace || null,
    labTestPace: point.labTestPace || null,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Fälttest Progression</h2>
          <p className="text-sm text-muted-foreground">
            Utveckling av LT2-tempo över tid (snabbare = lägre sekunder/km)
          </p>
        </div>

        <Select value={selectedClient} onValueChange={handleClientChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {trendAnalysis && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {trendAnalysis.improvement < 0
                      ? `${Math.abs(trendAnalysis.improvement)}s`
                      : `+${trendAnalysis.improvement}s`}
                  </div>
                  <div className="text-xs text-muted-foreground">Förändring (sek/km)</div>
                </div>
                {trendAnalysis.improvement < 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{trendAnalysis.testCount}</div>
              <div className="text-xs text-muted-foreground">Antal tester</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{trendAnalysis.averageInterval} d</div>
              <div className="text-xs text-muted-foreground">Genomsnitt mellan tester</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{trendAnalysis.consistency.score}%</div>
                  <div className="text-xs text-muted-foreground">Konsistens</div>
                </div>
                <Badge
                  variant={
                    trendAnalysis.consistency.quality === 'EXCELLENT' ||
                    trendAnalysis.consistency.quality === 'GOOD'
                      ? 'default'
                      : 'outline'
                  }
                >
                  {trendAnalysis.consistency.quality === 'EXCELLENT'
                    ? 'Utmärkt'
                    : trendAnalysis.consistency.quality === 'GOOD'
                    ? 'Bra'
                    : trendAnalysis.consistency.quality === 'FAIR'
                    ? 'Okej'
                    : 'Dålig'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progression Chart */}
      <Card>
        <CardHeader>
          <CardTitle>LT2-Tempo över tid</CardTitle>
          <CardDescription>
            {summary.totalFieldTests} fälttester • {summary.totalLabTests} labbtester
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={filledData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) =>
                  format(parseISO(date), 'd MMM yy', { locale: sv })
                }
                label={{ value: 'Datum', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{
                  value: 'LT2-tempo (sekunder/km)',
                  angle: -90,
                  position: 'insideLeft',
                }}
                reversed
                domain={[
                  (dataMin: number) => Math.floor(dataMin * 0.95),
                  (dataMax: number) => Math.ceil(dataMax * 1.05),
                ]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const data = payload[0].payload

                  const formatPace = (seconds: number) => {
                    const min = Math.floor(seconds / 60)
                    const sec = Math.round(seconds % 60)
                    return `${min}:${sec.toString().padStart(2, '0')}/km`
                  }

                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <div className="font-semibold mb-2">
                        {format(parseISO(data.date), 'd MMMM yyyy', { locale: sv })}
                      </div>
                      {data.fieldTestPace && (
                        <div className="text-sm">
                          <span className="text-blue-600">Fälttest:</span>{' '}
                          {formatPace(data.fieldTestPace)}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {data.testType} • {data.confidence}
                          </span>
                        </div>
                      )}
                      {data.labTestPace && (
                        <div className="text-sm mt-1">
                          <span className="text-orange-600">Labbtest:</span>{' '}
                          {formatPace(data.labTestPace)}
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="fieldTestPace"
                name="Fälttest LT2"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props
                  if (!payload.fieldTestPace) return null

                  // Size based on confidence
                  const size =
                    payload.confidence === 'VERY_HIGH' || payload.confidence === 'HIGH'
                      ? 8
                      : payload.confidence === 'MEDIUM'
                      ? 6
                      : 4

                  const fill =
                    payload.confidence === 'VERY_HIGH' || payload.confidence === 'HIGH'
                      ? '#10b981'
                      : payload.confidence === 'MEDIUM'
                      ? '#f59e0b'
                      : '#ef4444'

                  return <circle cx={cx} cy={cy} r={size} fill={fill} stroke="#fff" strokeWidth={2} />
                }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="labTestPace"
                name="Labbtest LT2"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Legend for confidence levels */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
              <span>Hög tillförlitlighet</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white" />
              <span>Medel tillförlitlighet</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
              <span>Låg tillförlitlighet</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Divergence Analysis */}
      {divergenceAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Fälttest vs Labbtest Jämförelse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold">
                  {divergenceAnalysis.averageDifference > 0 ? '+' : ''}
                  {divergenceAnalysis.averageDifference}s
                </div>
                <div className="text-sm text-muted-foreground">Genomsnittlig skillnad</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {divergenceAnalysis.percentDifference.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Procentuell skillnad</div>
              </div>
              <div>
                <Badge
                  variant={
                    divergenceAnalysis.alignment === 'EXCELLENT' ||
                    divergenceAnalysis.alignment === 'GOOD'
                      ? 'default'
                      : 'outline'
                  }
                  className="text-lg px-4 py-2"
                >
                  {divergenceAnalysis.alignment === 'EXCELLENT'
                    ? 'Utmärkt överensstämmelse'
                    : divergenceAnalysis.alignment === 'GOOD'
                    ? 'Bra överensstämmelse'
                    : divergenceAnalysis.alignment === 'FAIR'
                    ? 'Okej överensstämmelse'
                    : 'Dålig överensstämmelse'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rekommendationer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((rec: string, index: number) => {
              const isPositive = rec.includes('Bra') || rec.includes('stämmer')
              const isNegative = rec.includes('Negativ') || rec.includes('avviker')

              return (
                <Alert
                  key={index}
                  variant={isNegative ? 'destructive' : 'default'}
                >
                  {isPositive ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isNegative ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {fieldTests.length === 0 && labTests.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Inga fälttester eller labbtester ännu. Skapa ett fälttest för att börja spåra progression.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
