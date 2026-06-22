'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  Bike,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  Gauge,
  Heart,
  MapPin,
  Mountain,
  PersonStanding,
  Ship,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { GarminAttribution } from '@/components/ui/GarminAttribution'
import type {
  ActivityDetailData,
  ActivityStrengthExercise,
  ActivityTrend,
  TrendMetricKey,
} from '@/lib/activity-detail/types'

interface ActivityDetailClientProps {
  activity: ActivityDetailData
  basePath?: string
  locale: string
}

const ZONE_COLORS = ['#64748b', '#22c55e', '#eab308', '#f97316', '#dc2626']

function text(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDuration(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return '--'
  const s = Math.round(sec)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatClock(sec?: number): string {
  if (sec === undefined || !Number.isFinite(sec)) return '--'
  const s = Math.round(sec)
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatDistance(meters?: number): string {
  if (!meters) return '--'
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${Math.round(meters)} m`
}

function formatTrendValue(metricKey: TrendMetricKey | null, v?: number): string {
  if (v === undefined) return '--'
  if (metricKey === 'speedKmh') return `${v.toFixed(1)} km/h`
  if (metricKey === 'pace500m') return `${formatClock(v)}/500m`
  if (metricKey === 'paceSecPerKm') return `${formatClock(v)}/km`
  return String(v)
}

function metricLabel(locale: string, metricKey: TrendMetricKey | null): string {
  if (metricKey === 'speedKmh') return text(locale, 'Speed', 'Hastighet')
  if (metricKey === 'pace500m') return text(locale, 'Pace /500m', 'Tempo /500m')
  if (metricKey === 'paceSecPerKm') return text(locale, 'Pace /km', 'Tempo /km')
  return text(locale, 'Value', 'Värde')
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

function formatShortDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function typeIcon(type: string): ReactNode {
  const t = type.toUpperCase()
  if (t.includes('RUN')) return <PersonStanding className="h-5 w-5" />
  if (t.includes('CYCL') || t.includes('RIDE') || t.includes('BIKE')) return <Bike className="h-5 w-5" />
  if (t.includes('ROW') || t.includes('SKI')) return <Ship className="h-5 w-5" />
  if (t.includes('STRENGTH')) return <Dumbbell className="h-5 w-5" />
  return <Activity className="h-5 w-5" />
}

const SOURCE_LABEL: Record<ActivityDetailData['source'], string> = {
  garmin: 'Garmin',
  strava: 'Strava',
  concept2: 'Concept2',
  phonerun: 'GPS',
  manual: 'Manual',
}

export function ActivityDetailClient({ activity, basePath = '', locale }: ActivityDetailClientProps) {
  const isGarmin = activity.source === 'garmin'
  const hasHrStream = activity.streams.some((p) => p.hr !== undefined)
  const hasSpeedStream = activity.streams.some((p) => p.speedKmh !== undefined)
  const showPace = activity.paceSecPerKm !== undefined
  const showSpeed = activity.speedKmh !== undefined

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="px-2">
          <Link href={`${basePath}/athlete/dashboard`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {text(locale, 'Back to dashboard', 'Tillbaka till dashboard')}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            {typeIcon(activity.type)}
            {activity.type}
          </Badge>
          {!isGarmin && <Badge variant="secondary">{SOURCE_LABEL[activity.source]}</Badge>}
          {(isGarmin || activity.deviceModel) && <GarminAttribution deviceModel={activity.deviceModel} />}
          {activity.indoor && <Badge variant="outline">{text(locale, 'Indoor', 'Inomhus')}</Badge>}
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{activity.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(activity.date, locale)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatDuration(activity.durationSec)}
            </span>
            {activity.tss !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                {Math.round(activity.tss)} TSS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metric grid */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard icon={<Clock className="h-4 w-4" />} label={text(locale, 'Time', 'Tid')} value={formatDuration(activity.durationSec)} />
        {activity.distanceMeters !== undefined && (
          <MetricCard icon={<MapPin className="h-4 w-4" />} label={text(locale, 'Distance', 'Distans')} value={formatDistance(activity.distanceMeters)} />
        )}
        {showPace && (
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label={text(locale, 'Pace', 'Tempo')} value={`${formatClock(activity.paceSecPerKm)}/km`} />
        )}
        {showSpeed && (
          <MetricCard icon={<Gauge className="h-4 w-4" />} label={text(locale, 'Speed', 'Hastighet')} value={`${activity.speedKmh?.toFixed(1)} km/h`} />
        )}
        {activity.pace500m !== undefined && (
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label={text(locale, 'Pace', 'Tempo')} value={`${formatClock(activity.pace500m)}/500m`} />
        )}
        {activity.avgHR !== undefined && (
          <MetricCard icon={<Heart className="h-4 w-4" />} label={text(locale, 'Avg HR', 'Snittpuls')} value={`${activity.avgHR} bpm`} sub={activity.maxHR ? `Max ${activity.maxHR}` : undefined} />
        )}
        {activity.avgPower !== undefined && (
          <MetricCard icon={<Zap className="h-4 w-4" />} label={text(locale, 'Avg power', 'Snitteffekt')} value={`${activity.avgPower} W`} sub={activity.normalizedPower ? `NP ${activity.normalizedPower}` : activity.maxPower ? `Max ${activity.maxPower}` : undefined} />
        )}
        {activity.calories !== undefined && (
          <MetricCard icon={<Flame className="h-4 w-4" />} label={text(locale, 'Calories', 'Kalorier')} value={`${activity.calories} kcal`} />
        )}
        {activity.elevationGainM !== undefined && activity.elevationGainM > 0 && (
          <MetricCard icon={<Mountain className="h-4 w-4" />} label={text(locale, 'Elevation', 'Höjdmeter')} value={`${Math.round(activity.elevationGainM)} m`} />
        )}
        {activity.strokeRate !== undefined && (
          <MetricCard icon={<Ship className="h-4 w-4" />} label="spm" value={`${activity.strokeRate}`} />
        )}
        {activity.cadence !== undefined && activity.strokeRate === undefined && (
          <MetricCard icon={<Bike className="h-4 w-4" />} label="rpm" value={`${activity.cadence}`} />
        )}
        {activity.trainingEffect !== undefined && (
          <MetricCard icon={<Activity className="h-4 w-4" />} label={text(locale, 'Training effect', 'Träningseffekt')} value={activity.trainingEffect.toFixed(1)} sub={activity.anaerobicEffect ? `${text(locale, 'Anaerobic', 'Anaerob')} ${activity.anaerobicEffect.toFixed(1)}` : undefined} />
        )}
        {activity.perceivedEffort !== undefined && (
          <MetricCard icon={<Gauge className="h-4 w-4" />} label="RPE" value={`${activity.perceivedEffort}/10`} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          {/* In-activity charts */}
          {(hasHrStream || activity.zones || activity.splits.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>{text(locale, 'During this session', 'Under passet')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={hasHrStream ? 'series' : activity.zones ? 'zones' : 'splits'} className="space-y-4">
                  <TabsList>
                    {hasHrStream && <TabsTrigger value="series">{text(locale, 'Over time', 'Över tid')}</TabsTrigger>}
                    {activity.zones && <TabsTrigger value="zones">{text(locale, 'HR zones', 'Pulszoner')}</TabsTrigger>}
                    {activity.splits.length > 0 && <TabsTrigger value="splits">{text(locale, 'Splits', 'Delsträckor')}</TabsTrigger>}
                  </TabsList>

                  {hasHrStream && (
                    <TabsContent value="series">
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={activity.streams.map((p) => ({ ...p, time: formatDuration(p.elapsedSec) }))}
                            margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="time" minTickGap={32} tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="hr" tick={{ fontSize: 12 }} domain={['dataMin - 10', 'dataMax + 10']} />
                            {hasSpeedStream && <YAxis yAxisId="speed" orientation="right" tick={{ fontSize: 12 }} />}
                            <Tooltip />
                            <Line yAxisId="hr" type="monotone" dataKey="hr" name={text(locale, 'HR', 'Puls')} stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
                            {hasSpeedStream && (
                              <Line yAxisId="speed" type="monotone" dataKey="speedKmh" name="km/h" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                  )}

                  {activity.zones && (
                    <TabsContent value="zones">
                      <ZoneChart zones={activity.zones} locale={locale} />
                    </TabsContent>
                  )}

                  {activity.splits.length > 0 && (
                    <TabsContent value="splits">
                      <SplitsTable activity={activity} locale={locale} />
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Strength breakdown */}
          {activity.isStrength && activity.strengthExercises.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  {text(locale, 'Exercises', 'Övningar')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activity.strengthExercises.map((exercise) => (
                  <StrengthExerciseRow key={exercise.exerciseId} exercise={exercise} locale={locale} />
                ))}
              </CardContent>
            </Card>
          )}

          {activity.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{text(locale, 'Notes', 'Anteckningar')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{activity.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cross-session trend */}
        <div className="space-y-6">
          <TrendCard trend={activity.trend} locale={locale} />
        </div>
      </div>
    </div>
  )
}

function ZoneChart({ zones, locale }: { zones: NonNullable<ActivityDetailData['zones']>; locale: string }) {
  const data = [
    { zone: 'Z1', label: text(locale, 'Recovery', 'Återhämtning'), seconds: zones.zone1 },
    { zone: 'Z2', label: text(locale, 'Aerobic', 'Aerob'), seconds: zones.zone2 },
    { zone: 'Z3', label: text(locale, 'Tempo', 'Tempo'), seconds: zones.zone3 },
    { zone: 'Z4', label: text(locale, 'Threshold', 'Tröskel'), seconds: zones.zone4 },
    { zone: 'Z5', label: text(locale, 'VO2max', 'VO2max'), seconds: zones.zone5 },
  ]
  const total = data.reduce((sum, d) => sum + d.seconds, 0) || 1

  return (
    <div className="space-y-3">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
            <XAxis type="number" tickFormatter={(v) => formatDuration(v)} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="zone" tick={{ fontSize: 12 }} width={32} />
            <Tooltip formatter={(v: number) => formatDuration(v)} />
            <Bar dataKey="seconds" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={ZONE_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center text-[11px]">
        {data.map((d, i) => (
          <div key={d.zone} className="rounded-md bg-muted/50 p-1.5">
            <div className="font-semibold" style={{ color: ZONE_COLORS[i] }}>{d.zone}</div>
            <div className="text-muted-foreground">{Math.round((d.seconds / total) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SplitsTable({ activity, locale }: { activity: ActivityDetailData; locale: string }) {
  const hasPace = activity.splits.some((s) => s.paceSecPerKm !== undefined)
  const hasPace500 = activity.splits.some((s) => s.pace500m !== undefined)
  const hasHR = activity.splits.some((s) => s.avgHR !== undefined)
  const hasRate = activity.splits.some((s) => s.strokeRate !== undefined)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">{text(locale, 'Distance', 'Distans')}</th>
            <th className="py-2 pr-3 font-medium">{text(locale, 'Time', 'Tid')}</th>
            {hasPace && <th className="py-2 pr-3 font-medium">{text(locale, 'Pace', 'Tempo')}</th>}
            {hasPace500 && <th className="py-2 pr-3 font-medium">/500m</th>}
            {hasHR && <th className="py-2 pr-3 font-medium">{text(locale, 'HR', 'Puls')}</th>}
            {hasRate && <th className="py-2 pr-3 font-medium">spm</th>}
          </tr>
        </thead>
        <tbody>
          {activity.splits.map((split, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-3 tabular-nums">{split.label}</td>
              <td className="py-2 pr-3 tabular-nums">{formatDistance(split.distanceMeters)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatDuration(split.durationSec)}</td>
              {hasPace && <td className="py-2 pr-3 tabular-nums">{split.paceSecPerKm ? `${formatClock(split.paceSecPerKm)}/km` : '--'}</td>}
              {hasPace500 && <td className="py-2 pr-3 tabular-nums">{split.pace500m ? `${formatClock(split.pace500m)}` : '--'}</td>}
              {hasHR && <td className="py-2 pr-3 tabular-nums">{split.avgHR ?? '--'}</td>}
              {hasRate && <td className="py-2 pr-3 tabular-nums">{split.strokeRate ?? '--'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StrengthExerciseRow({ exercise, locale }: { exercise: ActivityStrengthExercise; locale: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{exercise.name}</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{exercise.sets.length} {text(locale, 'sets', 'set')}</Badge>
          <Badge variant="outline">{exercise.totalVolume} kg {text(locale, 'volume', 'volym')}</Badge>
          {exercise.bestEstimated1RM ? (
            <Badge variant="secondary">e1RM {Math.round(exercise.bestEstimated1RM)} kg</Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
        {exercise.sets.map((set) => (
          <span key={set.setNumber} className="rounded bg-muted/60 px-2 py-1 tabular-nums">
            {set.weight}kg × {set.repsCompleted}
            {set.rpe ? ` @${set.rpe}` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function TrendCard({ trend, locale }: { trend: ActivityTrend; locale: string }) {
  const hasMetricSeries = trend.metricKey !== null && trend.points.some((p) => p.value !== undefined)
  const hasHRSeries = trend.points.some((p) => p.avgHR !== undefined)
  const enoughPoints = trend.points.length >= 2

  const chartData = trend.points.map((p) => ({
    label: formatShortDate(p.date, locale),
    value: p.value,
    avgHR: p.avgHR,
    isCurrent: p.isCurrent,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {text(locale, 'Trend vs recent', 'Trend mot senaste')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enoughPoints ? (
          <p className="text-sm text-muted-foreground">
            {text(locale, 'Not enough similar sessions yet to show a trend.', 'Inte tillräckligt med liknande pass än för att visa en trend.')}
          </p>
        ) : (
          <>
            {trend.comparison && (
              <div className="grid grid-cols-1 gap-2">
                {trend.comparison.metricDeltaPct !== undefined && (
                  <DeltaBadge
                    label={metricLabel(locale, trend.metricKey)}
                    deltaPct={trend.comparison.metricDeltaPct}
                    locale={locale}
                  />
                )}
                {trend.comparison.avgHRDelta !== undefined && (
                  <DeltaRow
                    label={text(locale, 'Avg HR vs avg', 'Snittpuls mot snitt')}
                    value={`${trend.comparison.avgHRDelta > 0 ? '+' : ''}${trend.comparison.avgHRDelta} bpm`}
                  />
                )}
                {trend.comparison.distanceKmDelta !== undefined && (
                  <DeltaRow
                    label={text(locale, 'Distance vs avg', 'Distans mot snitt')}
                    value={`${trend.comparison.distanceKmDelta > 0 ? '+' : ''}${trend.comparison.distanceKmDelta} km`}
                  />
                )}
                <p className="text-[11px] text-muted-foreground">
                  {text(locale, `vs your last ${trend.comparison.vsCount} similar sessions`, `mot dina senaste ${trend.comparison.vsCount} liknande pass`)}
                </p>
              </div>
            )}

            {(hasMetricSeries || hasHRSeries) && (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={16} />
                    {hasMetricSeries && (
                      <YAxis
                        yAxisId="metric"
                        tick={{ fontSize: 11 }}
                        reversed={trend.lowerIsBetter}
                        tickFormatter={(v) => formatTrendValue(trend.metricKey, v)}
                        width={48}
                      />
                    )}
                    {hasHRSeries && <YAxis yAxisId="hr" orientation="right" tick={{ fontSize: 11 }} width={32} />}
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'metric' ? formatTrendValue(trend.metricKey, value) : `${value} bpm`
                      }
                    />
                    {hasMetricSeries && (
                      <Line
                        yAxisId="metric"
                        type="monotone"
                        dataKey="value"
                        name="metric"
                        stroke="#2563eb"
                        strokeWidth={2}
                        connectNulls
                        dot={(props) => <CurrentDot {...props} color="#2563eb" />}
                      />
                    )}
                    {hasHRSeries && (
                      <Line
                        yAxisId="hr"
                        type="monotone"
                        dataKey="avgHR"
                        name="hr"
                        stroke="#dc2626"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        connectNulls
                        dot={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CurrentDot(props: {
  cx?: number
  cy?: number
  payload?: { isCurrent?: boolean }
  color: string
}) {
  const { cx, cy, payload, color } = props
  if (cx === undefined || cy === undefined) return <g />
  if (payload?.isCurrent) {
    return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
  }
  return <circle cx={cx} cy={cy} r={2} fill={color} />
}

function DeltaBadge({
  label,
  deltaPct,
  locale,
}: {
  label: string
  deltaPct: number
  locale: string
}) {
  const improved = deltaPct >= 0
  const Icon = improved ? TrendingUp : TrendingDown
  const color = improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${color}`}>
        <Icon className="h-4 w-4" />
        {improved ? '+' : ''}{deltaPct}% {improved ? text(locale, 'better', 'bättre') : text(locale, 'slower', 'långsammare')}
      </span>
    </div>
  )
}

function DeltaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
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
