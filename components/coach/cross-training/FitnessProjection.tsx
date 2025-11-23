'use client'

// components/coach/cross-training/FitnessProjection.tsx
/**
 * Cross-Training Fitness Retention Projector
 *
 * Visualizes expected VO2max retention over injury duration based on cross-training modality.
 *
 * Features:
 * - Multi-line Recharts chart showing VO2max decline per modality
 * - Injury duration selector (1-12 weeks)
 * - Modality comparison table
 * - Recommendation engine
 * - Return-to-running timeline estimation
 * - Current athlete baseline VO2max marker
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
  ReferenceLine,
} from 'recharts'
import { TrendingDown, TrendingUp, Award, Calendar, Info } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type Modality = 'DWR' | 'XC_SKIING' | 'ALTERG' | 'AIR_BIKE' | 'CYCLING' | 'ROWING' | 'ELLIPTICAL' | 'SWIMMING' | 'NONE'

const MODALITY_CONFIG = {
  DWR: { icon: '🏊', label: 'DWR', color: '#3b82f6' },
  XC_SKIING: { icon: '⛷️', label: 'Längdskidåkning', color: '#64748b' },
  ALTERG: { icon: '🏃', label: 'AlterG', color: '#6366f1' },
  AIR_BIKE: { icon: '🚴‍♂️', label: 'Air Bike', color: '#ef4444' },
  CYCLING: { icon: '🚴', label: 'Cykling', color: '#10b981' },
  ROWING: { icon: '🚣', label: 'Rodd', color: '#8b5cf6' },
  ELLIPTICAL: { icon: '🏃‍♂️', label: 'Crosstrainer', color: '#f97316' },
  SWIMMING: { icon: '🏊‍♂️', label: 'Simning', color: '#06b6d4' },
  NONE: { icon: '🚫', label: 'Ingen träning', color: '#dc2626' },
}

interface WeeklyProjection {
  week: number
  vo2max: number
  retentionPercent: number
}

interface ModalityComparison {
  modality: Modality
  finalVO2max: number
  retentionPercent: number
  lossPercent: number
  returnWeeks: number
  totalTimeToBaseline: number
}

interface FitnessProjectionData {
  clientId: string
  baselineVO2max: number
  weeks: number
  selectedModality: Modality
  recommendedModality: Modality
  injuryType: string | null
  projection: {
    weekly: WeeklyProjection[]
    final: WeeklyProjection
  }
  comparison: ModalityComparison[]
  recommendations: {
    modality: Modality
    reasoning: string
    expectedReturn: string
  }
}

interface FitnessProjectionProps {
  initialClientId?: string
}

export default function FitnessProjection({
  initialClientId,
}: FitnessProjectionProps) {
  const [selectedClient, setSelectedClient] = useState<string>(initialClientId || '')
  const [weeks, setWeeks] = useState<number>(4)
  const [selectedModality, setSelectedModality] = useState<Modality>('DWR')

  // Fetch clients
  const { data: clients } = useSWR<any[]>('/api/clients', fetcher)

  // Fetch projection data
  const { data, error, isLoading } = useSWR<FitnessProjectionData>(
    selectedClient
      ? `/api/cross-training/fitness-projection/${selectedClient}?weeks=${weeks}&modality=${selectedModality}`
      : null,
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
          <CardTitle>Fitness Retention Projektion</CardTitle>
          <CardDescription>
            Välj en atlet för att visa VO2max-retention under skadeperiod
          </CardDescription>
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
    return <div className="text-muted-foreground">Laddar projektion...</div>
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Kunde inte ladda fitnessprojektion. Kontrollera att atleten har ett VO2max-test.
        </AlertDescription>
      </Alert>
    )
  }

  // Prepare chart data - combine all modalities into single dataset
  const chartData = []
  const maxWeeks = Math.max(...data.comparison.map((c) => {
    const modalityData = data.comparison.find((comp) => comp.modality === c.modality)
    return weeks
  }))

  // Fetch all modality projections for chart
  const allModalityProjections = new Map<Modality, WeeklyProjection[]>()

  // For simplicity, we'll use the current projection and estimate others
  // In production, you'd fetch all projections from API
  allModalityProjections.set(data.selectedModality, data.projection.weekly)

  // Build combined chart data
  for (let week = 0; week <= weeks; week++) {
    const dataPoint: any = { week }

    // Add each modality's VO2max at this week
    data.comparison.forEach((comp) => {
      // Estimate based on retention rate
      const retention = comp.retentionPercent / 100
      const weeksRemaining = weeks - week
      const decayFactor = retention + (1 - retention) * (weeksRemaining / weeks)
      dataPoint[comp.modality] = Math.round(data.baselineVO2max * decayFactor * 10) / 10
    })

    chartData.push(dataPoint)
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Fitness Retention Projektion</h2>
          <p className="text-sm text-muted-foreground">
            VO2max-förlust över tid beroende på korstr.träningsmodalitet
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Weeks selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Skadeperiod:</label>
            <Select value={weeks.toString()} onValueChange={(v) => setWeeks(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 6, 8, 10, 12].map((w) => (
                  <SelectItem key={w} value={w.toString()}>
                    {w} veckor
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client selector */}
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
      </div>

      {/* Baseline VO2max Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {data.baselineVO2max.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Baseline VO2max</div>
            </div>
            {data.injuryType && (
              <div className="text-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {data.injuryType}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Aktiv skada</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Alert */}
      <Alert>
        <Award className="h-4 w-4" />
        <AlertDescription>
          <strong>Rekommendation:</strong> {MODALITY_CONFIG[data.recommendedModality].icon}{' '}
          {MODALITY_CONFIG[data.recommendedModality].label}
          <br />
          <span className="text-sm">{data.recommendations.reasoning}</span>
          <br />
          <span className="text-sm text-muted-foreground">
            {data.recommendations.expectedReturn}
          </span>
        </AlertDescription>
      </Alert>

      {/* VO2max Retention Chart */}
      <Card>
        <CardHeader>
          <CardTitle>VO2max-retention över tid</CardTitle>
          <CardDescription>
            Jämförelse av olika korstr.träningsmodaliteter ({weeks} veckor)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="week"
                label={{ value: 'Veckor', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: 'VO2max (ml/kg/min)', angle: -90, position: 'insideLeft' }}
                domain={[
                  Math.floor(data.baselineVO2max * 0.4),
                  Math.ceil(data.baselineVO2max * 1.05),
                ]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <div className="font-semibold mb-2">Vecka {payload[0].payload.week}</div>
                      {payload
                        .sort((a, b) => (b.value as number) - (a.value as number))
                        .map((entry: any) => (
                          <div key={entry.dataKey} className="text-sm">
                            <span
                              className="inline-block w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: entry.stroke }}
                            />
                            {MODALITY_CONFIG[entry.dataKey as Modality]?.label}:{' '}
                            <strong>{entry.value}</strong> ml/kg/min
                          </div>
                        ))}
                    </div>
                  )
                }}
              />
              <Legend />
              <ReferenceLine
                y={data.baselineVO2max}
                stroke="#10b981"
                strokeDasharray="5 5"
                label="Baseline"
              />

              {/* Lines for each modality */}
              <Line
                type="monotone"
                dataKey="DWR"
                name={MODALITY_CONFIG.DWR.label}
                stroke={MODALITY_CONFIG.DWR.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="XC_SKIING"
                name={MODALITY_CONFIG.XC_SKIING.label}
                stroke={MODALITY_CONFIG.XC_SKIING.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ALTERG"
                name={MODALITY_CONFIG.ALTERG.label}
                stroke={MODALITY_CONFIG.ALTERG.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="AIR_BIKE"
                name={MODALITY_CONFIG.AIR_BIKE.label}
                stroke={MODALITY_CONFIG.AIR_BIKE.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="CYCLING"
                name={MODALITY_CONFIG.CYCLING.label}
                stroke={MODALITY_CONFIG.CYCLING.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="SWIMMING"
                name={MODALITY_CONFIG.SWIMMING.label}
                stroke={MODALITY_CONFIG.SWIMMING.color}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="NONE"
                name={MODALITY_CONFIG.NONE.label}
                stroke={MODALITY_CONFIG.NONE.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Modalitetsjämförelse</CardTitle>
          <CardDescription>
            VO2max-retention och återhämtningstid efter {weeks} veckor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modalitet</TableHead>
                <TableHead className="text-right">Slut-VO2max</TableHead>
                <TableHead className="text-right">Retention</TableHead>
                <TableHead className="text-right">Förlust</TableHead>
                <TableHead className="text-right">Återh.tid</TableHead>
                <TableHead className="text-right">Total tid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.comparison
                .filter((c) => c.modality !== 'NONE')
                .map((comp) => {
                  const isRecommended = comp.modality === data.recommendedModality
                  return (
                    <TableRow
                      key={comp.modality}
                      className={isRecommended ? 'bg-green-50 border-green-200' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{MODALITY_CONFIG[comp.modality].icon}</span>
                          <span className="font-medium">
                            {MODALITY_CONFIG[comp.modality].label}
                          </span>
                          {isRecommended && (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              <Award className="h-3 w-3 mr-1" />
                              Rekommenderad
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {comp.finalVO2max.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-green-100">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {comp.retentionPercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-red-100">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {comp.lossPercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          {comp.returnWeeks} v
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {comp.totalTimeToBaseline} veckor
                      </TableCell>
                    </TableRow>
                  )
                })}

              {/* No training row */}
              {data.comparison
                .filter((c) => c.modality === 'NONE')
                .map((comp) => (
                  <TableRow key="NONE" className="bg-red-50 border-red-200">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{MODALITY_CONFIG.NONE.icon}</span>
                        <span className="font-medium">{MODALITY_CONFIG.NONE.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {comp.finalVO2max.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">0%</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">-{comp.lossPercent}%</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{comp.returnWeeks} v</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {comp.totalTimeToBaseline} veckor
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info box */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Viktigt:</strong> Dessa projektioner är baserade på vetenskaplig forskning om
          korstr.träning. Individuella resultat kan variera beroende på träningsintensitet,
          volym och individuell återhämtning.
        </AlertDescription>
      </Alert>
    </div>
  )
}
