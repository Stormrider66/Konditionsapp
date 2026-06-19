'use client'

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  BatteryMedium,
  Gauge,
  HeartPulse,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Timer,
  Zap,
} from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import type {
  EvaluationConfidence,
  NormalizedSensorSample,
  SegmentEvaluation,
  WorkoutEvaluationSummary,
  WorkoutFatigueSummary,
  WorkoutReadinessContext,
  WorkoutSource,
  WorkoutSourceLink,
  WorkoutZoneSummary,
} from '@/lib/workout-evaluation'

interface WorkoutEvaluationListItem {
  id: string
  startedAt: string
  completedAt: string | null
  sourceLinks: WorkoutSourceLink[]
  summary: WorkoutEvaluationSummary
  zoneSummary: WorkoutZoneSummary
  fatigueSummary: WorkoutFatigueSummary
  readinessContext: WorkoutReadinessContext | null
  confidence: EvaluationConfidence
  primarySource: WorkoutSource
  updatedAt: string
}

interface WorkoutEvaluationDetail extends WorkoutEvaluationListItem {
  timelinePreview: NormalizedSensorSample[]
  segmentEvaluations: SegmentEvaluation[]
  createdAt: string
}

interface MonitoringTabProps {
  id: string
  basePath: string
  businessSlug: string
}

type ChartMode = 'hr' | 'hrPercent' | 'power' | 'pace'

const SOURCE_LABELS: Record<string, string> = {
  GARMIN: 'Garmin',
  CONCEPT2_LOGBOOK: 'Concept2',
  CONCEPT2_PM5_BLUETOOTH: 'PM5',
  WATTBIKE_BLUETOOTH: 'Wattbike',
  HR_BELT_BLUETOOTH: 'HR belt',
  APP_GPS: 'GPS',
  CARDIO_FOCUS: 'Focus',
  HYBRID_FOCUS: 'Hybrid',
  MANUAL: 'Manual',
  NATIVE_CAPTURE: 'Mobile',
}

const FATIGUE_LABELS: Record<WorkoutFatigueSummary['level'], { en: string; sv: string }> = {
  LOW: { en: 'Low', sv: 'Lag' },
  MODERATE: { en: 'Moderate', sv: 'Mattan' },
  HIGH: { en: 'High', sv: 'Hog' },
  VERY_HIGH: { en: 'Very high', sv: 'Mycket hog' },
}

function copy(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDateTime(locale: string, value: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

function formatDistance(meters?: number): string {
  if (!meters || meters <= 0) return '-'
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

function formatPace(seconds?: number): string {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

function minutes(seconds?: number): number {
  return Math.round((seconds ?? 0) / 60)
}

function fatigueClass(level: WorkoutFatigueSummary['level']): string {
  if (level === 'VERY_HIGH') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
  if (level === 'HIGH') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200'
  if (level === 'MODERATE') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
}

function confidenceClass(confidence: EvaluationConfidence): string {
  if (confidence === 'HIGH') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
  if (confidence === 'MEDIUM') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200'
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
}

function zoneColor(zone: number): string {
  if (zone === 5) return 'bg-red-500'
  if (zone === 4) return 'bg-orange-500'
  if (zone === 3) return 'bg-amber-500'
  if (zone === 2) return 'bg-sky-500'
  return 'bg-emerald-500'
}

function sourceBadges(sources: WorkoutSourceLink[] | WorkoutSource[]): string[] {
  const values = sources.map((source) => typeof source === 'string' ? source : source.source)
  return Array.from(new Set(values)).map((source) => SOURCE_LABELS[source] ?? source)
}

function zoneParts(zoneSummary: WorkoutZoneSummary): Array<{ zone: number; seconds: number; pct: number }> {
  const total = Math.max(1, zoneSummary.totalTrackedSeconds)
  return [1, 2, 3, 4, 5].map((zone) => {
    const seconds = zone === 1
      ? zoneSummary.zone1Seconds
      : zone === 2
        ? zoneSummary.zone2Seconds
        : zone === 3
          ? zoneSummary.zone3Seconds
          : zone === 4
            ? zoneSummary.zone4Seconds
            : zoneSummary.zone5Seconds
    return { zone, seconds, pct: Math.max(0, (seconds / total) * 100) }
  })
}

function metricDisplay(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return '-'
  return `${Math.round(value)}${suffix}`
}

function buildChartData(samples: NormalizedSensorSample[]) {
  return samples.map((sample) => ({
    timeMin: Math.round((sample.timeSec / 60) * 10) / 10,
    heartRate: sample.heartRate ?? null,
    hrPercentMax: sample.hrPercentMax ?? null,
    power: sample.power ?? null,
    pace: sample.paceSecPerKm ? Math.round((sample.paceSecPerKm / 60) * 100) / 100 : null,
    zone: sample.hrZone ?? null,
  }))
}

function segmentReferenceMinute(segment: SegmentEvaluation, workoutStartedAt: string): number | null {
  if (!segment.startedAt) return null
  const diffMs = new Date(segment.startedAt).getTime() - new Date(workoutStartedAt).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return null
  return Math.round((diffMs / 60_000) * 10) / 10
}

export function MonitoringTab({ id, basePath, businessSlug }: MonitoringTabProps) {
  const locale = useLocale()
  const [evaluations, setEvaluations] = useState<WorkoutEvaluationListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<WorkoutEvaluationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartMode, setChartMode] = useState<ChartMode>('hr')
  const [nowMs] = useState(() => Date.now())

  const loadEvaluations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${id}/workout-evaluations?days=30&limit=30`, {
        headers: { 'x-business-slug': businessSlug },
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to load')
      }
      const rows = payload.data as WorkoutEvaluationListItem[]
      setEvaluations(rows)
      setSelectedId((current) => current ?? rows[0]?.id ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy(locale, 'Could not load monitoring data', 'Kunde inte lasa monitoringdata'))
    } finally {
      setLoading(false)
    }
  }, [businessSlug, id, locale])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadEvaluations()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadEvaluations])

  useEffect(() => {
    if (!selectedId) {
      const timeout = window.setTimeout(() => setDetail(null), 0)
      return () => window.clearTimeout(timeout)
    }

    let cancelled = false
    const timeout = window.setTimeout(() => {
      setDetailLoading(true)
      fetch(`/api/clients/${id}/workout-evaluations/${selectedId}`, {
        headers: { 'x-business-slug': businessSlug },
      })
        .then(async (response) => {
          const payload = await response.json()
          if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Failed to load detail')
          if (!cancelled) setDetail(payload.data as WorkoutEvaluationDetail)
        })
        .catch((detailError) => {
          if (!cancelled) {
            setError(detailError instanceof Error ? detailError.message : copy(locale, 'Could not load workout detail', 'Kunde inte lasa passdetaljer'))
          }
        })
        .finally(() => {
          if (!cancelled) setDetailLoading(false)
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [businessSlug, id, locale, selectedId])

  const selected = useMemo(
    () => evaluations.find((evaluation) => evaluation.id === selectedId) ?? evaluations[0] ?? null,
    [evaluations, selectedId],
  )

  const last7 = useMemo(() => {
    const cutoff = nowMs - 7 * 24 * 60 * 60 * 1000
    const rows = evaluations.filter((evaluation) => new Date(evaluation.startedAt).getTime() >= cutoff)
    return {
      durationSec: rows.reduce((total, evaluation) => total + (evaluation.summary.durationSec ?? 0), 0),
      highIntensitySec: rows.reduce((total, evaluation) => total + evaluation.zoneSummary.highIntensitySeconds, 0),
      highFatigue: rows.filter((evaluation) => evaluation.fatigueSummary.level === 'HIGH' || evaluation.fatigueSummary.level === 'VERY_HIGH').length,
    }
  }, [evaluations, nowMs])

  const readiness = selected?.readinessContext ?? null
  const recoveryWarning = selected && (
    selected.fatigueSummary.level === 'HIGH' ||
    selected.fatigueSummary.level === 'VERY_HIGH' ||
    (typeof readiness?.readinessScore === 'number' && readiness.readinessScore < 45)
  )

  const chartData = useMemo(() => buildChartData(detail?.timelinePreview ?? []), [detail?.timelinePreview])
  const segmentMarkers = detail?.segmentEvaluations
    .map((segment) => ({
      minute: segmentReferenceMinute(segment, detail.startedAt),
      label: segment.label,
    }))
    .filter((marker): marker is { minute: number; label: string } => marker.minute !== null)
    .slice(0, 24) ?? []

  const handleRecalculate = async () => {
    setRecalculating(true)
    setError(null)
    try {
      const response = await fetch(`/api/clients/${id}/workout-evaluations/recalculate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-business-slug': businessSlug,
        },
        body: JSON.stringify({ days: 30 }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to recalculate')
      }
      setSelectedId(null)
      await loadEvaluations()
    } catch (recalculateError) {
      setError(recalculateError instanceof Error ? recalculateError.message : copy(locale, 'Could not rebuild evaluations', 'Kunde inte bygga om utvarderingar'))
    } finally {
      setRecalculating(false)
    }
  }

  const chartConfig = {
    hr: { key: 'heartRate', label: 'HR', color: '#ef4444', domain: ['auto', 'auto'] as const },
    hrPercent: { key: 'hrPercentMax', label: '%HR max', color: '#f97316', domain: [40, 105] as const },
    power: { key: 'power', label: 'Watts', color: '#2563eb', domain: ['auto', 'auto'] as const },
    pace: { key: 'pace', label: 'Pace min/km', color: '#0f766e', domain: ['auto', 'auto'] as const },
  }[chartMode]

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/50">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/50 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {copy(locale, 'Monitoring', 'Monitoring')}
              </h2>
              {recoveryWarning && (
                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
                  <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                  {copy(locale, 'Recovery check', 'Aterhamtningskoll')}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy(locale, 'Merged workout data, fatigue, readiness and source confidence.', 'Sammanslagen passdata, trotthet, readiness och kalltillit.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
              {recalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {copy(locale, 'Rebuild 30d', 'Bygg om 30d')}
            </Button>
            <Link href={`${basePath}/clients/${id}?tab=planning`}>
              <Button variant="outline" size="sm">
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                {copy(locale, 'Coach note', 'Ledarnotering')}
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MonitoringMetric
            icon={BatteryMedium}
            label={copy(locale, 'Readiness', 'Readiness')}
            value={metricDisplay(readiness?.readinessScore)}
            detail={readiness?.readinessLevel ?? copy(locale, 'No daily metric', 'Ingen daglig data')}
          />
          <MonitoringMetric
            icon={HeartPulse}
            label={copy(locale, 'Sleep / HRV', 'Somn / HRV')}
            value={`${readiness?.sleepHours ? readiness.sleepHours.toFixed(1) : '-'}h`}
            detail={`${metricDisplay(readiness?.hrvRMSSD, ' ms')} HRV | ${metricDisplay(readiness?.restingHR)} RHR`}
          />
          <MonitoringMetric
            icon={Activity}
            label={copy(locale, '7-day load', '7-dagars load')}
            value={formatDuration(last7.durationSec)}
            detail={`${minutes(last7.highIntensitySec)} ${copy(locale, 'high-intensity min', 'hogintensiva min')}`}
          />
          <MonitoringMetric
            icon={Zap}
            label={copy(locale, 'Fatigue', 'Trotthet')}
            value={selected ? copy(locale, FATIGUE_LABELS[selected.fatigueSummary.level].en, FATIGUE_LABELS[selected.fatigueSummary.level].sv) : '-'}
            detail={selected ? `${selected.fatigueSummary.score}/100 | ${last7.highFatigue} ${copy(locale, 'flags this week', 'flaggor denna vecka')}` : '-'}
          />
          <MonitoringMetric
            icon={Gauge}
            label={copy(locale, 'Latest workout', 'Senaste pass')}
            value={selected?.summary.name ?? '-'}
            detail={selected ? formatDateTime(locale, selected.startedAt) : copy(locale, 'No evaluated workout', 'Inget utvarderat pass')}
          />
        </div>
      </div>

      {evaluations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center dark:border-white/10 dark:bg-slate-900/50">
          <Timer className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {copy(locale, 'No evaluated workouts yet', 'Inga utvarderade pass an')}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {copy(locale, 'Completed Garmin, focus mode, quick erg, phone GPS and future mobile uploads will appear here as one merged workout list.', 'Genomforda Garmin-, focus mode-, erg-, GPS- och framtida mobilpass visas har som en sammanslagen lista.')}
          </p>
          <Button className="mt-4" onClick={handleRecalculate} disabled={recalculating}>
            {recalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {copy(locale, 'Build recent evaluations', 'Bygg senaste utvarderingar')}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.6fr)]">
          <div className="space-y-3">
            {evaluations.map((evaluation) => (
              <button
                key={evaluation.id}
                type="button"
                onClick={() => setSelectedId(evaluation.id)}
                className={cn(
                  'w-full rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 dark:bg-slate-900/50 dark:hover:bg-blue-500/10',
                  selectedId === evaluation.id
                    ? 'border-blue-400 ring-2 ring-blue-100 dark:border-blue-500 dark:ring-blue-500/20'
                    : 'border-gray-200 dark:border-white/10',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{evaluation.summary.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(locale, evaluation.startedAt)} | {formatDuration(evaluation.summary.durationSec)} | {formatDistance(evaluation.summary.distanceMeters)}
                    </p>
                  </div>
                  <Badge variant="outline" className={fatigueClass(evaluation.fatigueSummary.level)}>
                    {copy(locale, FATIGUE_LABELS[evaluation.fatigueSummary.level].en, FATIGUE_LABELS[evaluation.fatigueSummary.level].sv)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sourceBadges(evaluation.sourceLinks).map((source) => (
                    <Badge key={source} variant="outline" className="bg-white text-[11px] dark:bg-slate-950/40">
                      {source}
                    </Badge>
                  ))}
                  <Badge variant="outline" className={confidenceClass(evaluation.confidence)}>
                    {evaluation.confidence}
                  </Badge>
                </div>

                <ZoneBar zoneSummary={evaluation.zoneSummary} className="mt-3" />
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/50">
            {detailLoading && (
              <div className="flex min-h-72 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!detailLoading && detail && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">{detail.summary.name}</h3>
                      <Badge variant="outline" className={confidenceClass(detail.confidence)}>
                        {detail.confidence}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(locale, detail.startedAt)} | {detail.summary.type} | {sourceBadges(detail.sourceLinks).join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['hr', 'hrPercent', 'power', 'pace'] as ChartMode[]).map((mode) => (
                      <Button
                        key={mode}
                        variant={chartMode === mode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setChartMode(mode)}
                        className="h-8"
                      >
                        {mode === 'hr' ? 'HR' : mode === 'hrPercent' ? '%HR' : mode === 'power' ? 'W' : 'Pace'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailMetric label={copy(locale, 'Duration', 'Tid')} value={formatDuration(detail.summary.durationSec)} />
                  <DetailMetric label={copy(locale, 'Distance', 'Distans')} value={formatDistance(detail.summary.distanceMeters)} />
                  <DetailMetric label={copy(locale, 'Avg / max HR', 'Snitt / max puls')} value={`${metricDisplay(detail.summary.avgHr)} / ${metricDisplay(detail.summary.maxHr)}`} />
                  <DetailMetric label={copy(locale, 'Calories', 'Kalorier')} value={metricDisplay(detail.summary.calories)} />
                  <DetailMetric label={copy(locale, 'Power', 'Watt')} value={`${metricDisplay(detail.summary.avgPower)} / ${metricDisplay(detail.summary.maxPower)}`} />
                  <DetailMetric label={copy(locale, 'Pace', 'Tempo')} value={detail.summary.avgPaceSecPerKm ? `${formatPace(detail.summary.avgPaceSecPerKm)}/km` : detail.summary.avgPaceSecPer500m ? `${formatPace(detail.summary.avgPaceSecPer500m)}/500m` : '-'} />
                  <DetailMetric label={copy(locale, 'Recovery drop', 'Pulstapp vila')} value={metricDisplay(detail.fatigueSummary.avgRecoveryHrDrop)} />
                  <DetailMetric label={copy(locale, 'Fatigue score', 'Trotthetspoang')} value={`${detail.fatigueSummary.score}/100`} />
                </div>

                <ZoneBar zoneSummary={detail.zoneSummary} showLabels />

                <div className="h-72 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 6, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="timeMin" tick={{ fontSize: 11 }} unit="m" />
                        <YAxis domain={chartConfig.domain} tick={{ fontSize: 11 }} width={44} />
                        <ChartTooltip
                          formatter={(value: unknown) => [String(value ?? '-'), chartConfig.label]}
                          labelFormatter={(label) => `${label} min`}
                        />
                        <Legend />
                        {segmentMarkers.map((marker) => (
                          <ReferenceLine
                            key={`${marker.minute}-${marker.label}`}
                            x={marker.minute}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                          />
                        ))}
                        <Line
                          type="monotone"
                          dataKey={chartConfig.key}
                          name={chartConfig.label}
                          stroke={chartConfig.color}
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {copy(locale, 'No stream data available for this workout.', 'Ingen stromdata finns for passet.')}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-white/10">
                  <div className="grid grid-cols-[minmax(120px,1.2fr)_repeat(5,minmax(70px,0.7fr))] gap-2 border-b border-gray-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground dark:border-white/10">
                    <span>{copy(locale, 'Segment', 'Segment')}</span>
                    <span>{copy(locale, 'HR', 'Puls')}</span>
                    <span>%HR</span>
                    <span>{copy(locale, 'Power', 'Watt')}</span>
                    <span>{copy(locale, 'Pace', 'Tempo')}</span>
                    <span>{copy(locale, 'Score', 'Score')}</span>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-white/10">
                    {detail.segmentEvaluations.map((segment) => (
                      <div
                        key={`${segment.segmentIndex}-${segment.label}`}
                        className="grid grid-cols-[minmax(120px,1.2fr)_repeat(5,minmax(70px,0.7fr))] gap-2 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium text-gray-900 dark:text-white">{segment.label}</span>
                        <span>{metricDisplay(segment.actual.avgHr)} / {metricDisplay(segment.actual.maxHr)}</span>
                        <span>{metricDisplay(segment.actual.avgHrPercentMax, '%')}</span>
                        <span>{metricDisplay(segment.actual.avgPower)}</span>
                        <span>{segment.actual.avgPaceSecPerKm ? formatPace(segment.actual.avgPaceSecPerKm) : segment.actual.avgPaceSecPer500m ? formatPace(segment.actual.avgPaceSecPer500m) : '-'}</span>
                        <span>{segment.compliance.score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={fatigueClass(detail.fatigueSummary.level)}>
                      {copy(locale, FATIGUE_LABELS[detail.fatigueSummary.level].en, FATIGUE_LABELS[detail.fatigueSummary.level].sv)}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {copy(locale, 'Fatigue summary', 'Trotthetssammanfattning')}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {detail.fatigueSummary.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MonitoringMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ElementType
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 truncate text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function ZoneBar({
  zoneSummary,
  className,
  showLabels = false,
}: {
  zoneSummary: WorkoutZoneSummary
  className?: string
  showLabels?: boolean
}) {
  const parts = zoneParts(zoneSummary)

  return (
    <div className={className}>
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        {parts.map((part) => (
          <div
            key={part.zone}
            className={zoneColor(part.zone)}
            style={{ width: `${part.pct}%` }}
          />
        ))}
      </div>
      {showLabels && (
        <div className="mt-2 grid grid-cols-5 gap-2 text-xs text-muted-foreground">
          {parts.map((part) => (
            <div key={part.zone} className="min-w-0">
              <span className={cn('mr-1 inline-block h-2 w-2 rounded-full', zoneColor(part.zone))} />
              Z{part.zone} {minutes(part.seconds)}m
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
