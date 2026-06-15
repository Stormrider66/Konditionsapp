'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  Bike,
  Calendar,
  Clock,
  Gauge,
  MapPin,
  RotateCcw,
  Ship,
  Trophy,
  Zap,
} from 'lucide-react'
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  buildQuickErgPersonalBests,
  type QuickErgPersonalBest,
  type QuickErgProgressSession,
} from '@/lib/quick-erg/progress'
import {
  formatMachineName,
  type QuickErgBestEffort,
  type QuickErgMachineType,
} from '@/lib/quick-erg/session-summary'

interface QuickErgTrainingLoadSummary {
  dailyLoad: number
  intensity: string
  workoutType?: string | null
}

export interface QuickErgHistorySessionData extends QuickErgProgressSession {
  startedAt: string
  deviceName?: string | null
  completedAt: string
  calories?: number | null
  avgHeartRate?: number | null
  maxHeartRate?: number | null
  avgCadence?: number | null
  maxCadence?: number | null
  avgStrokeRate?: number | null
  maxStrokeRate?: number | null
  avgPace500m?: number | null
  rpe?: number | null
  notes?: string | null
  bestEfforts: QuickErgBestEffort[]
  trainingLoad?: QuickErgTrainingLoadSummary | null
}

interface QuickErgHistoryClientProps {
  sessions: QuickErgHistorySessionData[]
  basePath?: string
  locale: string
}

interface TrendPoint {
  id: string
  date: string
  machineType: QuickErgMachineType
  avgPower?: number | null
  normalizedPower?: number | null
  avgHeartRate?: number | null
  trainingLoad?: number | null
  distanceKm?: number | null
  durationMin: number
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

function formatLongDuration(sec: number, locale: string): string {
  const hours = Math.floor(sec / 3600)
  const minutes = Math.round((sec % 3600) / 60)

  if (hours > 0) {
    return `${hours} h ${minutes} min`
  }

  return text(locale, `${minutes} min`, `${minutes} min`)
}

function formatDistance(meters?: number | null): string {
  if (!meters) return '--'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatTrendDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function formatRecordValue(record: QuickErgPersonalBest): string {
  if (record.unit === 'W') return `${Math.round(record.value)} W`
  if (record.unit === 'm') return formatDistance(record.value)
  if (record.unit === 'sec') return formatDuration(record.value)
  return String(record.value)
}

function localizedRecordLabel(record: QuickErgPersonalBest, locale: string): string {
  if (record.key === 'first_session') {
    return text(locale, `First ${record.machineName} session`, `Forsta ${record.machineName}-passet`)
  }
  if (record.key.startsWith('power_')) {
    const seconds = record.key.replace('power_', '').replace('s', '')
    const duration = Number(seconds)
    if (duration < 60) return text(locale, `${duration} sec power`, `${duration} sek effekt`)
    return text(locale, `${duration / 60} min power`, `${duration / 60} min effekt`)
  }
  if (record.key.startsWith('pace_')) {
    const meters = record.key.replace('pace_', '').replace('m', '')
    const distance = Number(meters)
    const label = distance >= 1000 ? `${distance / 1000}k` : `${distance}m`
    return text(locale, `${label} pace`, `${label} tempo`)
  }

  switch (record.key) {
    case 'avg_power':
      return text(locale, 'Avg power', 'Snitteffekt')
    case 'normalized_power':
      return text(locale, 'Normalized power', 'Normalized power')
    case 'max_power':
      return text(locale, 'Max power', 'Maxeffekt')
    case 'longest_duration':
      return text(locale, 'Longest session', 'Langsta pass')
    case 'longest_distance':
      return text(locale, 'Longest distance', 'Langsta distans')
    default:
      return record.label
  }
}

function machineIcon(machineType: QuickErgMachineType) {
  if (machineType === 'CONCEPT2_ROW' || machineType === 'CONCEPT2_SKIERG') return <Ship className="h-4 w-4" />
  if (machineType === 'CONCEPT2_BIKEERG' || machineType === 'WATTBIKE' || machineType.includes('BIKE')) return <Bike className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

function buildTrendPoints(sessions: QuickErgHistorySessionData[], locale: string): TrendPoint[] {
  return [...sessions]
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((session) => ({
      id: session.id,
      date: formatTrendDate(session.startedAt, locale),
      machineType: session.machineType,
      avgPower: session.avgPower,
      normalizedPower: session.normalizedPower,
      avgHeartRate: session.avgHeartRate,
      trainingLoad: session.trainingLoad?.dailyLoad,
      distanceKm: session.distanceMeters ? Math.round((session.distanceMeters / 1000) * 100) / 100 : null,
      durationMin: Math.round((session.durationSec / 60) * 10) / 10,
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

export function QuickErgHistoryClient({
  sessions,
  basePath = '',
  locale,
}: QuickErgHistoryClientProps) {
  const [machineFilter, setMachineFilter] = useState<string>('all')

  const machineOptions = useMemo(() => {
    const unique = [...new Set(sessions.map((session) => session.machineType))]
    return unique.sort((a, b) => formatMachineName(a).localeCompare(formatMachineName(b)))
  }, [sessions])

  const filteredSessions = useMemo(() => (
    machineFilter === 'all'
      ? sessions
      : sessions.filter((session) => session.machineType === machineFilter)
  ), [machineFilter, sessions])

  const personalBests = useMemo(() => {
    const bests = buildQuickErgPersonalBests(sessions)
    return machineFilter === 'all'
      ? bests
      : bests.filter((record) => record.machineType === machineFilter)
  }, [machineFilter, sessions])

  const trendPoints = useMemo(() => buildTrendPoints(filteredSessions, locale), [filteredSessions, locale])

  const totals = useMemo(() => {
    const durationSec = filteredSessions.reduce((sum, session) => sum + session.durationSec, 0)
    const distanceMeters = filteredSessions.reduce((sum, session) => sum + (session.distanceMeters ?? 0), 0)
    const load = filteredSessions.reduce((sum, session) => sum + (session.trainingLoad?.dailyLoad ?? 0), 0)
    const powers = filteredSessions
      .map((session) => session.avgPower)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    const avgPower = powers.length > 0
      ? Math.round(powers.reduce((sum, value) => sum + value, 0) / powers.length)
      : null

    return {
      durationSec,
      distanceMeters,
      load,
      avgPower,
    }
  }, [filteredSessions])

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild className="px-2">
          <Link href={`${basePath}/athlete/dashboard`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {text(locale, 'Back to dashboard', 'Tillbaka till dashboard')}
          </Link>
        </Button>

        <Button asChild>
          <Link href={`${basePath}/athlete/log-workout/erg`}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {text(locale, 'Record erg', 'Spela in erg')}
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              <Trophy className="h-4 w-4" />
              {text(locale, 'Quick Erg', 'Quick Erg')}
            </Badge>
            <Badge variant="secondary">
              {text(locale, 'Bluetooth sessions', 'Bluetoothpass')}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {text(locale, 'Erg history', 'Erghistorik')}
          </h1>
        </div>

        <div className="w-full sm:w-64">
          <Select value={machineFilter} onValueChange={setMachineFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{text(locale, 'All machines', 'Alla maskiner')}</SelectItem>
              {machineOptions.map((machineType) => (
                <SelectItem key={machineType} value={machineType}>
                  {formatMachineName(machineType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{text(locale, 'No erg sessions yet', 'Inga ergpass an')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {text(locale, 'Your saved Bluetooth erg sessions will appear here.', 'Dina sparade Bluetooth-ergpass visas har.')}
              </p>
            </div>
            <Button asChild>
              <Link href={`${basePath}/athlete/log-workout/erg`}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {text(locale, 'Record erg', 'Spela in erg')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard icon={<Calendar className="h-4 w-4" />} label={text(locale, 'Sessions', 'Pass')} value={String(filteredSessions.length)} />
            <MetricCard icon={<Clock className="h-4 w-4" />} label={text(locale, 'Time', 'Tid')} value={formatLongDuration(totals.durationSec, locale)} />
            <MetricCard icon={<MapPin className="h-4 w-4" />} label={text(locale, 'Distance', 'Distans')} value={formatDistance(totals.distanceMeters)} />
            <MetricCard icon={<Zap className="h-4 w-4" />} label={text(locale, 'Avg power', 'Snitteffekt')} value={totals.avgPower ? `${totals.avgPower} W` : '--'} />
            <MetricCard icon={<Gauge className="h-4 w-4" />} label="TSS" value={totals.load > 0 ? String(Math.round(totals.load)) : '--'} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {text(locale, 'Personal bests', 'Personbasta')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personalBests.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {personalBests.map((record) => (
                    <div key={`${record.machineType}-${record.key}`} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge variant="outline" className="gap-1">
                          {machineIcon(record.machineType)}
                          {record.machineName}
                        </Badge>
                        <Badge variant={record.category === 'pace' ? 'secondary' : 'default'}>
                          {record.category === 'pace' ? '/500m' : record.category}
                        </Badge>
                      </div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{localizedRecordLabel(record, locale)}</div>
                      <div className="mt-1 text-2xl font-bold tabular-nums">{formatRecordValue(record)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(record.startedAt, locale)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text(locale, 'No records for this filter yet.', 'Inga rekord for detta filter an.')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Trends', 'Trender')}</CardTitle>
            </CardHeader>
            <CardContent>
              {trendPoints.length > 1 ? (
                <Tabs defaultValue="power" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="power">{text(locale, 'Power', 'Effekt')}</TabsTrigger>
                    <TabsTrigger value="load">{text(locale, 'Load + HR', 'Belastning + puls')}</TabsTrigger>
                    <TabsTrigger value="distance">{text(locale, 'Distance', 'Distans')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="power">
                    <TrendChart data={trendPoints}>
                      <Line yAxisId="left" type="monotone" dataKey="avgPower" name="Avg W" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line yAxisId="left" type="monotone" dataKey="normalizedPower" name="NP" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </TrendChart>
                  </TabsContent>

                  <TabsContent value="load">
                    <TrendChart data={trendPoints} rightAxis>
                      <Line yAxisId="left" type="monotone" dataKey="trainingLoad" name="TSS" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line yAxisId="right" type="monotone" dataKey="avgHeartRate" name="HR" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </TrendChart>
                  </TabsContent>

                  <TabsContent value="distance">
                    <TrendChart data={trendPoints} rightAxis>
                      <Line yAxisId="left" type="monotone" dataKey="distanceKm" name="km" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line yAxisId="right" type="monotone" dataKey="durationMin" name="min" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    </TrendChart>
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text(locale, 'Trends appear after two sessions with this filter.', 'Trender visas efter tva pass med detta filter.')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{text(locale, 'Sessions', 'Pass')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{text(locale, 'Date', 'Datum')}</TableHead>
                    <TableHead>{text(locale, 'Machine', 'Maskin')}</TableHead>
                    <TableHead>{text(locale, 'Time', 'Tid')}</TableHead>
                    <TableHead>{text(locale, 'Distance', 'Distans')}</TableHead>
                    <TableHead>{text(locale, 'Power', 'Effekt')}</TableHead>
                    <TableHead>{text(locale, 'Heart rate', 'Puls')}</TableHead>
                    <TableHead>RPE</TableHead>
                    <TableHead>TSS</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(session.startedAt, locale)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {machineIcon(session.machineType)}
                          <span className="font-medium">{formatMachineName(session.machineType)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatDuration(session.durationSec)}</TableCell>
                      <TableCell className="tabular-nums">{formatDistance(session.distanceMeters)}</TableCell>
                      <TableCell className="tabular-nums">
                        {session.avgPower ? `${session.avgPower} W` : '--'}
                        {session.normalizedPower && session.normalizedPower !== session.avgPower && (
                          <span className="ml-2 text-xs text-muted-foreground">NP {session.normalizedPower}</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {session.avgHeartRate ? `${session.avgHeartRate}` : '--'}
                        {session.maxHeartRate && <span className="ml-2 text-xs text-muted-foreground">max {session.maxHeartRate}</span>}
                      </TableCell>
                      <TableCell>{session.rpe ? `${session.rpe}/10` : '--'}</TableCell>
                      <TableCell>{session.trainingLoad ? Math.round(session.trainingLoad.dailyLoad) : '--'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`${basePath}/athlete/quick-erg/${session.id}`}>
                            {text(locale, 'Open', 'Oppna')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function TrendChart({
  data,
  rightAxis = false,
  children,
}: {
  data: TrendPoint[]
  rightAxis?: boolean
  children: ReactNode
}) {
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          {rightAxis && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />}
          <Tooltip content={<CustomTooltip />} />
          {children}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
