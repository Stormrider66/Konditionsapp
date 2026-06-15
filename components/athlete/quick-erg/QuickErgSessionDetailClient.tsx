'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  Bike,
  Calendar,
  Clock,
  Gauge,
  Heart,
  MapPin,
  MessageSquare,
  RotateCcw,
  Ship,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  QuickErgBestEffort,
  QuickErgDetectedInterval,
  QuickErgMachineType,
  QuickErgSample,
  QuickErgSessionSummary,
  QuickErgSource,
} from '@/lib/quick-erg/session-summary'
import { formatMachineName } from '@/lib/quick-erg/session-summary'

interface QuickErgTrainingLoadDetail {
  dailyLoad: number
  loadType: string
  duration: number
  distance?: number | null
  avgHR?: number | null
  maxHR?: number | null
  intensity: string
  workoutType?: string | null
}

export interface QuickErgSessionDetailData {
  id: string
  machineType: QuickErgMachineType
  machineKind?: string | null
  source: QuickErgSource
  deviceName?: string | null
  startedAt: string
  completedAt: string
  durationSec: number
  distanceMeters?: number | null
  calories?: number | null
  avgPower?: number | null
  maxPower?: number | null
  normalizedPower?: number | null
  avgHeartRate?: number | null
  maxHeartRate?: number | null
  avgCadence?: number | null
  maxCadence?: number | null
  avgStrokeRate?: number | null
  maxStrokeRate?: number | null
  avgPace500m?: number | null
  rpe?: number | null
  notes?: string | null
  samples: QuickErgSample[]
  summary?: QuickErgSessionSummary | null
  bestEfforts: QuickErgBestEffort[]
  detectedIntervals: QuickErgDetectedInterval[]
  trainingLoad?: QuickErgTrainingLoadDetail | null
}

interface QuickErgSessionDetailClientProps {
  session: QuickErgSessionDetailData
  basePath?: string
  locale: string
}

interface ChartPoint {
  elapsedSec: number
  time: string
  power?: number
  heartRate?: number
  cadence?: number
  strokeRate?: number
  pace500m?: number
  distanceMeters?: number
}

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDuration(sec: number): string {
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = Math.floor(sec % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatPace(sec?: number | null): string {
  if (!sec || !Number.isFinite(sec)) return '--'
  const minutes = Math.floor(sec / 60)
  const seconds = Math.round(sec % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatDistance(meters?: number | null): string {
  if (!meters) return '--'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function sourceLabel(source: QuickErgSource): string {
  switch (source) {
    case 'BLUETOOTH_PM5':
      return 'PM5'
    case 'BLUETOOTH_CPS':
      return 'Cycling power'
    case 'MANUAL_IMPORT':
      return 'Manual import'
    default:
      return 'FTMS'
  }
}

function machineIcon(machineType: QuickErgMachineType) {
  if (machineType === 'CONCEPT2_ROW' || machineType === 'CONCEPT2_SKIERG') return <Ship className="h-5 w-5" />
  if (machineType === 'CONCEPT2_BIKEERG' || machineType === 'WATTBIKE' || machineType.includes('BIKE')) return <Bike className="h-5 w-5" />
  return <Activity className="h-5 w-5" />
}

function buildChartData(samples: QuickErgSample[]): ChartPoint[] {
  return samples.map((sample) => ({
    elapsedSec: sample.elapsedSec,
    time: formatDuration(sample.elapsedSec),
    power: sample.power,
    heartRate: sample.heartRate,
    cadence: sample.cadence,
    strokeRate: sample.strokeRate,
    pace500m: sample.pace500m,
    distanceMeters: sample.distanceMeters,
  }))
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; unit?: string; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-semibold">{label}</div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="font-medium">{item.value}{item.unit ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuickErgSessionDetailClient({
  session,
  basePath = '',
  locale,
}: QuickErgSessionDetailClientProps) {
  const chartData = buildChartData(session.samples)
  const isRower = session.machineType === 'CONCEPT2_ROW' || session.machineType === 'CONCEPT2_SKIERG'
  const rhythmLabel = isRower ? 'spm' : 'rpm'
  const rhythmValue = isRower ? session.avgStrokeRate : session.avgCadence
  const rhythmMax = isRower ? session.maxStrokeRate : session.maxCadence
  const hasChartData = chartData.length > 1

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild className="px-2">
          <Link href={`${basePath}/athlete/dashboard`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {text(locale, 'Back to dashboard', 'Tillbaka till dashboard')}
          </Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href={`${basePath}/athlete/log-workout/erg`}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {text(locale, 'Record another', 'Spela in igen')}
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              {machineIcon(session.machineType)}
              {formatMachineName(session.machineType)}
            </Badge>
            <Badge variant="secondary">{sourceLabel(session.source)}</Badge>
            {session.deviceName && <Badge variant="secondary">{session.deviceName}</Badge>}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {formatMachineName(session.machineType)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(session.startedAt, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(session.durationSec)}
              </span>
              {session.trainingLoad && (
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  {Math.round(session.trainingLoad.dailyLoad)} TSS
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MetricCard icon={<Clock className="h-4 w-4" />} label={text(locale, 'Time', 'Tid')} value={formatDuration(session.durationSec)} />
        <MetricCard icon={<MapPin className="h-4 w-4" />} label={text(locale, 'Distance', 'Distans')} value={formatDistance(session.distanceMeters)} />
        <MetricCard icon={<Zap className="h-4 w-4" />} label={text(locale, 'Avg power', 'Snitteffekt')} value={session.avgPower ? `${session.avgPower} W` : '--'} sub={session.maxPower ? `Max ${session.maxPower} W` : undefined} />
        <MetricCard icon={<Gauge className="h-4 w-4" />} label="NP" value={session.normalizedPower ? `${session.normalizedPower} W` : '--'} />
        <MetricCard icon={<Heart className="h-4 w-4" />} label={text(locale, 'Heart rate', 'Puls')} value={session.avgHeartRate ? `${session.avgHeartRate} bpm` : '--'} sub={session.maxHeartRate ? `Max ${session.maxHeartRate}` : undefined} />
        <MetricCard icon={isRower ? <Ship className="h-4 w-4" /> : <Bike className="h-4 w-4" />} label={rhythmLabel} value={rhythmValue ? `${Math.round(rhythmValue)} ${rhythmLabel}` : '--'} sub={rhythmMax ? `Max ${Math.round(rhythmMax)}` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Session charts', 'Passgrafer')}</CardTitle>
            </CardHeader>
            <CardContent>
              {hasChartData ? (
                <Tabs defaultValue="power" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="power">{text(locale, 'Power + HR', 'Effekt + puls')}</TabsTrigger>
                    <TabsTrigger value="rhythm">{text(locale, 'Rhythm', 'Rytm')}</TabsTrigger>
                    <TabsTrigger value="distance">{text(locale, 'Distance', 'Distans')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="power">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" minTickGap={24} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="power" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="hr" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line yAxisId="power" type="monotone" dataKey="power" name="W" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
                          <Line yAxisId="hr" type="monotone" dataKey="heartRate" name="HR" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="rhythm">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" minTickGap={24} tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="rhythm" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="pace" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line yAxisId="rhythm" type="monotone" dataKey={isRower ? 'strokeRate' : 'cadence'} name={rhythmLabel} stroke="#059669" strokeWidth={2} dot={false} connectNulls />
                          <Line yAxisId="pace" type="monotone" dataKey="pace500m" name="/500m" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="distance">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" minTickGap={24} tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="distanceMeters" name="m" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.18} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text(locale, 'No time-series samples were stored for this session.', 'Inga tidsserier sparades for detta pass.')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Best efforts', 'Basta insatser')}</CardTitle>
            </CardHeader>
            <CardContent>
              {session.bestEfforts.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {session.bestEfforts.map((effort) => (
                    <div key={`${effort.type}-${effort.label}-${effort.startSec}`} className="rounded-md border p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{effort.label}</div>
                      <div className="mt-1 text-2xl font-bold">
                        {effort.unit === 'W' ? `${effort.value} W` : formatDuration(effort.value)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDuration(effort.startSec)} - {formatDuration(effort.endSec)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{text(locale, 'No best efforts detected yet.', 'Inga basta insatser hittades an.')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Review', 'Utvardering')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="RPE" value={session.rpe ? `${session.rpe}/10` : '--'} />
                <MiniStat label="kcal" value={session.calories ? String(session.calories) : '--'} />
                <MiniStat label="/500m" value={formatPace(session.avgPace500m)} />
                <MiniStat label="Samples" value={String(session.samples.length)} />
              </div>

              {session.trainingLoad && (
                <div className="rounded-md border p-3">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {text(locale, 'Training load', 'Traningbelastning')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{Math.round(session.trainingLoad.dailyLoad)} TSS</Badge>
                    <Badge variant="outline">{session.trainingLoad.intensity}</Badge>
                    {session.trainingLoad.workoutType && <Badge variant="outline">{session.trainingLoad.workoutType}</Badge>}
                  </div>
                </div>
              )}

              {session.notes && (
                <div className="rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {text(locale, 'Notes', 'Anteckningar')}
                  </div>
                  <p className="text-sm leading-relaxed">{session.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Detected intervals', 'Upptackta intervaller')}</CardTitle>
            </CardHeader>
            <CardContent>
              {session.detectedIntervals.length > 0 ? (
                <div className="space-y-2">
                  {session.detectedIntervals.map((interval) => (
                    <div key={interval.index} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">
                          {text(locale, 'Interval', 'Intervall')} {interval.index}
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <Timer className="h-3 w-3" />
                          {formatDuration(interval.durationSec)}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>{formatDuration(interval.startSec)} - {formatDuration(interval.endSec)}</span>
                        {interval.avgPower && <span>{interval.avgPower} W avg</span>}
                        {interval.distanceMeters && <span>{formatDistance(interval.distanceMeters)}</span>}
                        {interval.restAfterSec && <span>{text(locale, 'Rest', 'Vila')} {formatDuration(interval.restAfterSec)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text(locale, 'No interval structure detected in this free session.', 'Ingen intervallstruktur hittades i detta fria pass.')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  )
}
