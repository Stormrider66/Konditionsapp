'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  Bike,
  Calendar,
  CheckCircle2,
  Clock,
  Gauge,
  Heart,
  Link2,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  RotateCcw,
  Save,
  Ship,
  Timer,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type {
  QuickErgBestEffort,
  QuickErgDetectedInterval,
  QuickErgMachineType,
  QuickErgSample,
  QuickErgSessionSummary,
  QuickErgSource,
} from '@/lib/quick-erg/session-summary'
import { formatMachineName } from '@/lib/quick-erg/session-summary'
import type { QuickErgPersonalBest } from '@/lib/quick-erg/progress'
import type { QuickErgPlannedMatchSuggestion } from '@/lib/quick-erg/planned-match'

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

interface QuickErgMatchedPlannedSession {
  assignmentId: string
  sessionId: string
  sessionName: string
  assignedDate: string
  status: string
  sport?: string | null
  plannedDurationSec?: number | null
  plannedDistanceMeters?: number | null
  matchedAt?: string | null
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
  prBadges: QuickErgPersonalBest[]
  plannedMatch?: QuickErgMatchedPlannedSession | null
  plannedMatchSuggestions: Array<Omit<QuickErgPlannedMatchSuggestion, 'assignedDate'> & { assignedDate: string }>
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
  const router = useRouter()
  const chartData = buildChartData(session.samples)
  const isRower = session.machineType === 'CONCEPT2_ROW' || session.machineType === 'CONCEPT2_SKIERG'
  const rhythmLabel = isRower ? 'spm' : 'rpm'
  const rhythmValue = isRower ? session.avgStrokeRate : session.avgCadence
  const rhythmMax = isRower ? session.maxStrokeRate : session.maxCadence
  const hasChartData = chartData.length > 1
  const [matchingAssignmentId, setMatchingAssignmentId] = useState<string | null>(null)
  const [isReviewEditing, setIsReviewEditing] = useState(false)
  const [savedReviewRpe, setSavedReviewRpe] = useState<number | null>(session.rpe ?? null)
  const [savedReviewNotes, setSavedReviewNotes] = useState(session.notes ?? '')
  const [reviewRpe, setReviewRpe] = useState<number | null>(savedReviewRpe)
  const [reviewNotes, setReviewNotes] = useState(savedReviewNotes)
  const [reviewTrainingLoad, setReviewTrainingLoad] = useState(session.trainingLoad)
  const [savingReview, setSavingReview] = useState(false)

  async function handleMatchAssignment(assignmentId: string) {
    setMatchingAssignmentId(assignmentId)

    try {
      const response = await fetch(`/api/athlete/quick-erg-sessions/${session.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || text(locale, 'Could not match planned session', 'Kunde inte matcha planerat pass'))
      }

      toast.success(text(locale, 'Planned session completed', 'Planerat pass markerat klart'))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Could not match planned session', 'Kunde inte matcha planerat pass'))
    } finally {
      setMatchingAssignmentId(null)
    }
  }

  async function handleSaveReview() {
    setSavingReview(true)

    try {
      const response = await fetch(`/api/athlete/quick-erg-sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rpe: reviewRpe,
          notes: reviewNotes.trim() || null,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || text(locale, 'Could not update review', 'Kunde inte uppdatera utvarderingen'))
      }

      const savedNotes = reviewNotes.trim()
      setSavedReviewRpe(reviewRpe)
      setSavedReviewNotes(savedNotes)
      setReviewNotes(savedNotes)

      if (payload?.data?.trainingLoad && reviewTrainingLoad) {
        setReviewTrainingLoad({
          ...reviewTrainingLoad,
          dailyLoad: payload.data.trainingLoad.dailyLoad,
          intensity: payload.data.trainingLoad.intensity,
        })
      }

      toast.success(text(locale, 'Review saved', 'Utvardering sparad'))
      setIsReviewEditing(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Could not update review', 'Kunde inte uppdatera utvarderingen'))
    } finally {
      setSavingReview(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild className="px-2">
          <Link href={`${basePath}/athlete/dashboard`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {text(locale, 'Back to dashboard', 'Tillbaka till dashboard')}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`${basePath}/athlete/quick-erg`}>
              <Trophy className="mr-2 h-4 w-4" />
              {text(locale, 'History', 'Historik')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${basePath}/athlete/log-workout/erg`}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {text(locale, 'Record another', 'Spela in igen')}
            </Link>
          </Button>
        </div>
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

      {session.prBadges.length > 0 && (
        <Card className="mb-8 border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
              <Trophy className="h-5 w-5" />
              {text(locale, 'Personal bests in this session', 'Personbasta i detta pass')}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {session.prBadges.map((record) => (
                <div key={`${record.key}-${record.value}`} className="rounded-md border border-amber-200 bg-background/80 p-3 dark:border-amber-500/20">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {localizedRecordLabel(record, locale)}
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums">{formatRecordValue(record)}</div>
                  {record.previousValue && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {text(locale, 'Previous', 'Tidigare')} {formatRecordValue({ ...record, value: record.previousValue })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <PlannedMatchCard
            session={session}
            locale={locale}
            matchingAssignmentId={matchingAssignmentId}
            onMatch={(assignmentId) => void handleMatchAssignment(assignmentId)}
          />

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
          <ReviewCard
            session={{
              ...session,
              rpe: savedReviewRpe,
              notes: savedReviewNotes || null,
              trainingLoad: reviewTrainingLoad,
            }}
            locale={locale}
            isEditing={isReviewEditing}
            reviewRpe={reviewRpe}
            reviewNotes={reviewNotes}
            savingReview={savingReview}
            onEdit={() => setIsReviewEditing(true)}
            onCancel={() => {
              setReviewRpe(savedReviewRpe)
              setReviewNotes(savedReviewNotes)
              setIsReviewEditing(false)
            }}
            onSave={() => void handleSaveReview()}
            onRpeChange={setReviewRpe}
            onNotesChange={setReviewNotes}
          />

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

function PlannedMatchCard({
  session,
  locale,
  matchingAssignmentId,
  onMatch,
}: {
  session: QuickErgSessionDetailData
  locale: string
  matchingAssignmentId: string | null
  onMatch: (assignmentId: string) => void
}) {
  const plannedMatch = session.plannedMatch
  const suggestions = session.plannedMatchSuggestions

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          {text(locale, 'Training plan match', 'Matcha traningsplan')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plannedMatch ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="mb-2 flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              {text(locale, 'Matched and completed', 'Matchat och klart')}
            </div>
            <div className="font-semibold">{plannedMatch.sessionName}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{formatShortDate(plannedMatch.assignedDate, locale)}</span>
              {plannedMatch.sport && <span>{plannedMatch.sport}</span>}
              {plannedMatch.plannedDurationSec && <span>{formatDuration(plannedMatch.plannedDurationSec)}</span>}
              {plannedMatch.plannedDistanceMeters && <span>{formatDistance(plannedMatch.plannedDistanceMeters)}</span>}
            </div>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{suggestion.sessionName}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{formatShortDate(suggestion.assignedDate, locale)}</span>
                      {suggestion.sport && <span>{suggestion.sport}</span>}
                      {suggestion.plannedDurationSec && <span>{formatDuration(suggestion.plannedDurationSec)}</span>}
                      {suggestion.plannedDistanceMeters && <span>{formatDistance(suggestion.plannedDistanceMeters)}</span>}
                    </div>
                  </div>
                  <Badge variant="secondary">{Math.round(suggestion.confidence * 100)}%</Badge>
                </div>

                {suggestion.reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {suggestion.reasons.slice(0, 3).map((reason) => (
                      <Badge key={reason} variant="outline" className="text-[11px]">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => onMatch(suggestion.id)}
                  disabled={matchingAssignmentId !== null}
                >
                  {matchingAssignmentId === suggestion.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {text(locale, 'Mark as this planned session', 'Markera som detta planerade pass')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {text(locale, 'No nearby planned cardio session found.', 'Inget naraliggande planerat konditionspass hittades.')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ReviewCard({
  session,
  locale,
  isEditing,
  reviewRpe,
  reviewNotes,
  savingReview,
  onEdit,
  onCancel,
  onSave,
  onRpeChange,
  onNotesChange,
}: {
  session: QuickErgSessionDetailData
  locale: string
  isEditing: boolean
  reviewRpe: number | null
  reviewNotes: string
  savingReview: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onRpeChange: (value: number | null) => void
  onNotesChange: (value: string) => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>{text(locale, 'Review', 'Utvardering')}</CardTitle>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={savingReview}>
              <X className="mr-2 h-4 w-4" />
              {text(locale, 'Cancel', 'Avbryt')}
            </Button>
            <Button size="sm" onClick={onSave} disabled={savingReview}>
              {savingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {text(locale, 'Save', 'Spara')}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {text(locale, 'Edit', 'Andra')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="RPE" value={session.rpe ? `${session.rpe}/10` : '--'} />
          <MiniStat label="kcal" value={session.calories ? String(session.calories) : '--'} />
          <MiniStat label="/500m" value={formatPace(session.avgPace500m)} />
          <MiniStat label="Samples" value={String(session.samples.length)} />
        </div>

        {isEditing && (
          <div className="rounded-md border p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Label htmlFor="quick-erg-review-rpe">RPE</Label>
              <div className="flex items-center gap-2">
                <Badge variant={reviewRpe ? 'secondary' : 'outline'}>
                  {reviewRpe ? `${reviewRpe}/10` : text(locale, 'Not set', 'Ej satt')}
                </Badge>
                {reviewRpe ? (
                  <Button variant="ghost" size="sm" onClick={() => onRpeChange(null)} disabled={savingReview}>
                    <X className="mr-2 h-4 w-4" />
                    {text(locale, 'Clear', 'Rensa')}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => onRpeChange(6)} disabled={savingReview}>
                    {text(locale, 'Add RPE', 'Lagg till RPE')}
                  </Button>
                )}
              </div>
            </div>
            <Slider
              id="quick-erg-review-rpe"
              min={1}
              max={10}
              step={1}
              value={[reviewRpe ?? 6]}
              disabled={!reviewRpe || savingReview}
              onValueChange={(value) => onRpeChange(value[0] ?? 6)}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{text(locale, 'Easy', 'Latt')}</span>
              <span>{text(locale, 'Hard', 'Hart')}</span>
            </div>
          </div>
        )}

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

        {isEditing ? (
          <div className="space-y-2">
            <Label htmlFor="quick-erg-review-notes">{text(locale, 'Notes', 'Anteckningar')}</Label>
            <Textarea
              id="quick-erg-review-notes"
              value={reviewNotes}
              maxLength={4000}
              rows={5}
              disabled={savingReview}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder={text(locale, 'How did it feel?', 'Hur kandes passet?')}
            />
          </div>
        ) : session.notes ? (
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              {text(locale, 'Notes', 'Anteckningar')}
            </div>
            <p className="text-sm leading-relaxed">{session.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
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
