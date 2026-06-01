'use client'

// "Min testprofil" — the player's own hockey test profile for the hockey
// dashboard. Position-adjusted composite score, per-test value vs their
// position target/elite, latest→previous delta, their own percentile/rank,
// estimated-1RM badge, and a multi-season trail.
// Fed by GET /api/athlete/hockey-profile (player slice only).

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { Gauge, Loader2, TrendingUp, Trophy, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Locale = 'en' | 'sv'
type Category = 'hockey' | 'strength'
type Pos = 'C' | 'W' | 'D' | 'G'

interface ProfileMetric {
  key: string
  label: string
  unit: string
  lowerIsBetter: boolean
  target: number | null
  elite: number | null
  teamCount: number
  latest: number | null
  previous: number | null
  delta: number | null
  targetGap: number | null
  percentile: number | null
  rank: number | null
  score: number | null
  estimated: boolean
}

interface ProfileGroup {
  id: Category
  label: string
  metrics: ProfileMetric[]
}

interface ProfileSeason {
  key: string
  label: string
  composite: number | null
  groups: ProfileGroup[]
}

interface ProfileData {
  hasTeam: boolean
  position: Pos | null
  seasons: ProfileSeason[]
}

const copy = (locale: Locale, en: string, sv: string) => (locale === 'sv' ? sv : en)

function formatNumber(value: number, locale: Locale, decimals: number): string {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function formatMetricValue(value: number | null, unit: string, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return '–'
  const u = unit.toLowerCase()
  const decimals = u === 's' || u.includes('km/h') || u.includes('mmol') || u.includes('w/kg') || u === 'nivå'
    ? 1
    : Number.isInteger(value)
      ? 0
      : 1
  return `${formatNumber(value, locale, decimals)} ${unit}`
}

function formatDelta(value: number | null, unit: string, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return '–'
  return `${value > 0 ? '+' : ''}${formatMetricValue(value, unit, locale)}`
}

function scoreColor(s: number): string {
  if (s >= 80) return 'bg-emerald-500 text-white'
  if (s >= 70) return 'bg-emerald-100 text-emerald-900'
  if (s >= 55) return 'bg-amber-100 text-amber-900'
  return 'bg-orange-100 text-orange-900'
}

function improved(delta: number | null, lowerIsBetter: boolean): boolean | null {
  if (delta == null || delta === 0) return null
  return lowerIsBetter ? delta < 0 : delta > 0
}

function MetricRow({ metric, seasons, locale }: { metric: ProfileMetric; seasons: ProfileSeason[]; locale: Locale }) {
  // Multi-season trail of the player's own value for this metric (oldest → newest).
  const trail = seasons
    .map((s) => {
      for (const g of s.groups) {
        const m = g.metrics.find((x) => x.key === metric.key)
        if (m?.latest != null) return m.latest
      }
      return null
    })
    .filter((v): v is number => v != null)
    .reverse()

  const imp = improved(metric.delta, metric.lowerIsBetter)
  const gapTone = metric.targetGap == null ? 'neutral' : metric.targetGap >= 0 ? 'good' : 'risk'

  return (
    <div className="grid gap-1.5 py-3 sm:grid-cols-[minmax(120px,1.1fr)_auto_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{metric.label}</span>
          {metric.estimated && (
            <span className="rounded bg-muted px-1 text-[9px] font-semibold uppercase text-muted-foreground" title={copy(locale, 'Estimated 1RM from a rep-max set', 'Beräknat 1RM från ett rep-max')}>
              {copy(locale, 'est.', 'ber.')}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {metric.target != null && <>{copy(locale, 'Target', 'Mål')} {formatMetricValue(metric.target, metric.unit, locale)}</>}
          {metric.elite != null && <> · {copy(locale, 'Elite', 'Elit')} {formatMetricValue(metric.elite, metric.unit, locale)}</>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">{formatMetricValue(metric.latest, metric.unit, locale)}</span>
        {metric.delta != null && metric.delta !== 0 && (
          <span className={cn('text-xs tabular-nums', imp ? 'text-emerald-600' : 'text-orange-600')}>
            {imp ? '▲' : '▼'} {formatDelta(metric.delta, metric.unit, locale)}
          </span>
        )}
        {metric.targetGap != null && (
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', gapTone === 'good' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-orange-200 text-orange-700 bg-orange-50')}>
            {formatDelta(metric.targetGap, metric.unit, locale)}
          </Badge>
        )}
        {metric.score != null && (
          <span className={cn('inline-flex h-5 min-w-[26px] items-center justify-center rounded px-1 text-[10px] font-bold tabular-nums', scoreColor(metric.score))}>{metric.score}</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums sm:justify-end">
        {metric.percentile != null && (
          <span>{copy(locale, `${metric.percentile}th pct`, `Percentil ${metric.percentile}`)}</span>
        )}
        {metric.rank != null && (
          <span className="font-medium text-foreground">#{metric.rank}/{metric.teamCount}</span>
        )}
        {trail.length > 1 && (
          <span className="hidden md:inline opacity-70">
            {trail.map((v, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-0.5 opacity-50">→</span>}
                {formatNumber(v, locale, metric.unit.toLowerCase() === 's' ? 2 : Number.isInteger(v) ? 0 : 1)}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

function ProfileBody({ data, locale }: { data: ProfileData; locale: Locale }) {
  const current = data.seasons[0]
  const compositeTrail = useMemo(
    () => data.seasons.map((s) => s.composite).filter((c): c is number => c != null).reverse(),
    [data.seasons]
  )

  if (!current) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {copy(locale, 'No hockey test data yet. Your results will appear here after testing.', 'Ingen hockeytestdata ännu. Dina resultat visas här efter test.')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold leading-none tabular-nums">
            {current.composite ?? '–'}<span className="text-sm text-muted-foreground">/100</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-1 font-medium uppercase tracking-wide">
              <Gauge className="h-3.5 w-3.5" /> {copy(locale, 'Physical profile', 'Fysprofil')}
            </div>
            {data.position && <div className="mt-0.5">{copy(locale, 'Position', 'Position')}: {data.position} · {current.label}</div>}
          </div>
        </div>
        {compositeTrail.length > 1 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            {compositeTrail.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="opacity-50">→</span>}
                <span className={cn('inline-flex h-6 min-w-[28px] items-center justify-center rounded px-1 font-bold tabular-nums', scoreColor(c))}>{c}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {current.groups.map((group) => (
        <div key={group.id} className="rounded-lg border bg-background p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            {group.id === 'strength' ? <Trophy className="h-4 w-4 text-yellow-600" /> : <Zap className="h-4 w-4 text-blue-600" />}
            {group.label}
          </div>
          <div className="divide-y">
            {group.metrics.map((m) => (
              <MetricRow key={m.key} metric={m} seasons={data.seasons} locale={locale} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AthleteTestProfileCard() {
  const locale: Locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [data, setData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/athlete/hockey-profile')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!cancelled && body.success) setData(body.data as ProfileData)
        else if (!cancelled) setError(true)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Hide entirely when the player isn't on a team (nothing to show).
  if (!isLoading && (error || !data || !data.hasTeam)) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-blue-600" />
          {copy(locale, 'My test profile', 'Min testprofil')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : data ? (
          <ProfileBody data={data} locale={locale} />
        ) : null}
      </CardContent>
    </Card>
  )
}
