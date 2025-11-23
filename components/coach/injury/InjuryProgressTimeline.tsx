'use client'

/**
 * Injury Progress Timeline Component
 *
 * Visualizes return-to-running protocol progress with:
 * - 5-phase timeline (Walking → Walk/Run → Progressive → Continuous → Full Training)
 * - Daily pain trend charts
 * - Phase completion criteria
 * - Estimated return date predictions
 * - Progress indicators per phase
 */

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertCircle,
  Target,
} from 'lucide-react'
import { format, addDays, differenceInDays } from 'date-fns'
import { sv } from 'date-fns/locale'

interface InjuryWithProgress {
  id: string
  clientId: string
  clientName: string
  injuryType: string
  painLevel: number
  detectedAt: Date
  status: 'ACTIVE' | 'MONITORING' | 'RESOLVED'
  phase: number | null
  estimatedReturnWeeks: number
  daysInCurrentPhase?: number
}

interface PainDataPoint {
  date: string
  pain: number
  soreness: number
}

interface PhaseInfo {
  phase: number
  name: string
  weeks: number
  description: string
  criteria: string[]
  runWalkRatio: string
  frequency: number
  duration: number
}

const RETURN_TO_RUNNING_PHASES: PhaseInfo[] = [
  {
    phase: 1,
    name: 'Gång',
    weeks: 1,
    description: 'Endast gång, ingen löpning',
    criteria: [
      '7 dagar smärtfri gång',
      'Ingen morgonstelhet',
      'Full rörlighet',
      'Coach/fysio godkännande',
    ],
    runWalkRatio: '0:1 (endast gång)',
    frequency: 5,
    duration: 20,
  },
  {
    phase: 2,
    name: 'Gång/Löp Introduktion',
    weeks: 2,
    description: 'Försiktig introduktion av löpning',
    criteria: [
      '6 pass utan smärta',
      'Ingen smärta 24h efter',
      'HRV inom 5% av baslinjen',
      'Sömnkvalitet bibehållen',
    ],
    runWalkRatio: '1:4 (1 min löp, 4 min gång)',
    frequency: 3,
    duration: 30,
  },
  {
    phase: 3,
    name: 'Progressiv Gång/Löp',
    weeks: 2,
    description: 'Gradvis ökning av löpning',
    criteria: [
      '8 pass utan smärta',
      'ACWR <1.3',
      'Funktionstest godkänt',
      'Styrkeövningar smärtfria',
    ],
    runWalkRatio: '2:3 → 3:2 (gradvis progression)',
    frequency: 4,
    duration: 35,
  },
  {
    phase: 4,
    name: 'Kontinuerlig Löpning',
    weeks: 2,
    description: 'Hel löpning utan gångpauser',
    criteria: [
      '8 kontinuerliga löpningar',
      '50% av volym före skada',
      'Inga symptom på 2 veckor',
      'Redo för 10% veckoökning',
    ],
    runWalkRatio: '1:0 (kontinuerlig löpning)',
    frequency: 4,
    duration: 40,
  },
  {
    phase: 5,
    name: 'Återgång till Full Träning',
    weeks: 4,
    description: 'Gradvis återgång till normal träning',
    criteria: [
      '80% av volym före skada',
      'Intensitetsprogression återinförd',
      'Inga symptom på 4 veckor',
      'Tävlingsredo enligt coach',
    ],
    runWalkRatio: '1:0',
    frequency: 5,
    duration: 60,
  },
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function InjuryProgressTimeline() {
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [dateRange, setDateRange] = useState<'7' | '30' | 'all'>('30')

  // Fetch all active injuries
  const { data: injuriesData } = useSWR('/api/injury/alerts?status=ACTIVE', fetcher, {
    refreshInterval: 60000,
  })

  // Fetch pain data for selected client
  const { data: painData } = useSWR(
    selectedClientId ? `/api/daily-metrics?clientId=${selectedClientId}&days=${dateRange === 'all' ? 90 : dateRange}` : null,
    fetcher
  )

  const injuries: InjuryWithProgress[] = injuriesData?.alerts || []
  const selectedInjury = injuries.find(i => i.clientId === selectedClientId)

  // Transform pain data for chart
  const painChartData: PainDataPoint[] =
    painData?.metrics?.map((m: any) => ({
      date: format(new Date(m.date), 'dd MMM', { locale: sv }),
      pain: m.injuryPain ? 11 - m.injuryPain : 0, // Convert back to athlete-facing scale
      soreness: m.muscleSoreness ? 11 - m.muscleSoreness : 0,
    })) || []

  // Calculate progress metrics
  const currentPhase = selectedInjury?.phase || 1
  const phaseInfo = RETURN_TO_RUNNING_PHASES[currentPhase - 1]
  const daysInPhase = selectedInjury?.daysInCurrentPhase || 0
  const expectedDaysInPhase = (phaseInfo?.weeks || 1) * 7
  const phaseProgress = Math.min((daysInPhase / expectedDaysInPhase) * 100, 100)

  // Calculate estimated completion dates
  const detectedDate = selectedInjury ? new Date(selectedInjury.detectedAt) : new Date()
  const estimatedReturnDate = addDays(detectedDate, (selectedInjury?.estimatedReturnWeeks || 0) * 7)
  const daysUntilReturn = differenceInDays(estimatedReturnDate, new Date())

  // Calculate pain trend
  const recentPain = painChartData.slice(-7)
  const painTrend =
    recentPain.length >= 2
      ? recentPain[recentPain.length - 1].pain - recentPain[0].pain
      : 0

  if (injuries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">Inga aktiva skador</p>
            <p className="text-sm text-muted-foreground">
              Det finns inga skador att följa upp just nu
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Athlete Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Skadeåterhämtning</h3>
          <p className="text-sm text-muted-foreground">
            Följ progressionen tillbaka till full träning
          </p>
        </div>

        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Välj atleet" />
          </SelectTrigger>
          <SelectContent>
            {injuries.map(injury => (
              <SelectItem key={injury.clientId} value={injury.clientId}>
                {injury.clientName} - {injury.injuryType.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedInjury ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Välj en atleet för att se återhämtningsprogress</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nuvarande Fas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Fas {currentPhase}/5</div>
                <p className="text-xs text-muted-foreground">{phaseInfo.name}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fasens Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(phaseProgress)}%</div>
                <p className="text-xs text-muted-foreground">
                  {daysInPhase} av {expectedDaysInPhase} dagar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Smärttrend</CardTitle>
                {painTrend < 0 ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {painTrend < 0 ? '↓' : painTrend > 0 ? '↑' : '→'}{' '}
                  {Math.abs(painTrend).toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {painTrend < 0 ? 'Förbättring' : painTrend > 0 ? 'Försämring' : 'Stabilt'} (7 dagar)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Beräknad Återgång</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{daysUntilReturn}d</div>
                <p className="text-xs text-muted-foreground">
                  {format(estimatedReturnDate, 'd MMM', { locale: sv })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Phase Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Återhämtningsfaser</CardTitle>
              <CardDescription>
                5-fas protokoll för säker återgång till full träning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {RETURN_TO_RUNNING_PHASES.map((phase, idx) => {
                  const isCompleted = currentPhase > phase.phase
                  const isCurrent = currentPhase === phase.phase
                  const isFuture = currentPhase < phase.phase

                  return (
                    <div key={phase.phase} className="relative">
                      {/* Connector Line */}
                      {idx < RETURN_TO_RUNNING_PHASES.length - 1 && (
                        <div
                          className={`absolute left-4 top-12 w-0.5 h-full ${
                            isCompleted ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                      )}

                      <div className="flex gap-4">
                        {/* Phase Number Circle */}
                        <div
                          className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                            isCompleted
                              ? 'border-green-500 bg-green-500 text-white'
                              : isCurrent
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-muted bg-background text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">{phase.phase}</span>
                          )}
                        </div>

                        {/* Phase Details */}
                        <div
                          className={`flex-1 pb-6 ${isCurrent ? 'bg-blue-50/50 p-4 rounded-lg' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-lg">{phase.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {phase.description} · {phase.weeks}{' '}
                                {phase.weeks === 1 ? 'vecka' : 'veckor'}
                              </p>
                            </div>
                            {isCurrent && (
                              <Badge variant="default">Pågående</Badge>
                            )}
                            {isCompleted && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Slutförd
                              </Badge>
                            )}
                          </div>

                          {isCurrent && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>Progress</span>
                                <span className="font-medium">{Math.round(phaseProgress)}%</span>
                              </div>
                              <Progress value={phaseProgress} className="h-2" />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Gång/Löp:</span>
                              <span className="ml-2 font-medium">{phase.runWalkRatio}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Frekvens:</span>
                              <span className="ml-2 font-medium">
                                {phase.frequency}x/vecka, {phase.duration} min
                              </span>
                            </div>
                          </div>

                          {(isCurrent || !isCompleted) && (
                            <div>
                              <p className="text-sm font-medium mb-1">Kriterier för nästa fas:</p>
                              <ul className="text-sm space-y-1">
                                {phase.criteria.map((criterion, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">•</span>
                                    <span>{criterion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pain Trend Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Smärttrend</CardTitle>
                  <CardDescription>
                    Daglig smärta från check-ins (0 = ingen smärta, 10 = extrem smärta)
                  </CardDescription>
                </div>
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dagar</SelectItem>
                    <SelectItem value="30">30 dagar</SelectItem>
                    <SelectItem value="all">90 dagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {painChartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Ingen smärtdata tillgänglig
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={painChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 10]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                      }}
                    />
                    <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="3 3" label="Tröskelvärde" />
                    <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="pain"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      name="Smärta"
                    />
                    <Line
                      type="monotone"
                      dataKey="soreness"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      name="Ömhet"
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
