'use client'

// Per-athlete development drill-down for the team Test → Utveckling tab.
// Pick a player → every test they have, current value + Δ since last test,
// graded against their own position target/elite, with a multi-season trail.
// Self-fetching from /api/teams/[id]/analysis-summary (the `seasons` payload).

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { Loader2, TrendingUp, Trophy, User, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'

type Locale = 'en' | 'sv'
type MetricCategory = 'hockey' | 'strength'
type HockeyPosition = 'C' | 'W' | 'D' | 'G'

interface AdaptiveMetricAthlete {
  clientId: string
  name: string
  latest: number | null
  previous: number | null
  delta: number | null
  latestDate: string | null
  targetGap: number | null
  score: number | null
  estimated: boolean
}

interface AdaptiveMetricRow {
  key: string
  label: string
  unit: string
  category: MetricCategory
  lowerIsBetter: boolean
  target: number | null
  elite: number | null
  athletes: AdaptiveMetricAthlete[]
}

interface MetricGroup {
  id: MetricCategory
  label: string
  metrics: AdaptiveMetricRow[]
}

interface PlayerScore {
  clientId: string
  name: string
  pos: HockeyPosition | null
  total: number | null
}

interface SeasonAnalysis {
  key: string
  label: string
  metricGroups: MetricGroup[]
  scores: PlayerScore[]
}

interface SummaryData {
  seasons: SeasonAnalysis[]
}

interface TeamPlayerDevelopmentProps {
  teamId: string
  businessSlug?: string
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
  return 'bg-red-100 text-red-900'
}

const POS_BADGE: Record<HockeyPosition, string> = {
  C: 'bg-blue-100 text-blue-700 border-blue-200',
  W: 'bg-slate-100 text-slate-700 border-slate-200',
  D: 'bg-slate-200 text-slate-700 border-slate-300',
  G: 'bg-slate-200 text-slate-700 border-slate-300',
}

function improved(delta: number | null, lowerIsBetter: boolean): boolean | null {
  if (delta == null || delta === 0) return null
  return lowerIsBetter ? delta < 0 : delta > 0
}

function MetricDevRow({ metricKey, label, unit, lowerIsBetter, target, elite, seasons, clientId, locale }: {
  metricKey: string
  label: string
  unit: string
  lowerIsBetter: boolean
  target: number | null
  elite: number | null
  seasons: SeasonAnalysis[]
  clientId: string
  locale: Locale
}) {
  // Newest season first → reverse for an oldest→newest trail.
  const trail = seasons
    .map((s) => {
      for (const g of s.metricGroups) {
        const m = g.metrics.find((x) => x.key === metricKey)
        const a = m?.athletes.find((x) => x.clientId === clientId)
        if (a?.latest != null) return { label: s.label, value: a.latest }
      }
      return null
    })
    .filter((x): x is { label: string; value: number } => x != null)
    .reverse()

  const current = seasons[0]?.metricGroups.flatMap((g) => g.metrics).find((m) => m.key === metricKey)
  const athlete = current?.athletes.find((a) => a.clientId === clientId) ?? null
  if (!athlete || athlete.latest == null) return null

  const imp = improved(athlete.delta, lowerIsBetter)
  const gapTone = athlete.targetGap == null ? 'neutral' : athlete.targetGap >= 0 ? 'good' : 'risk'

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(120px,1.2fr)_auto_1fr] sm:items-center">
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{label}</div>
        <div className="text-[11px] text-muted-foreground">
          {target != null && <>{copy(locale, 'Target', 'Mål')} {formatMetricValue(target, unit, locale)}</>}
          {elite != null && <> · {copy(locale, 'Elite', 'Elit')} {formatMetricValue(elite, unit, locale)}</>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">{formatMetricValue(athlete.latest, unit, locale)}</span>
        {athlete.estimated && (
          <span className="rounded bg-muted px-1 text-[9px] font-semibold uppercase text-muted-foreground" title={copy(locale, 'Estimated 1RM from a rep-max set', 'Beräknat 1RM från ett rep-max')}>
            {copy(locale, 'est.', 'ber.')}
          </span>
        )}
        {athlete.delta != null && athlete.delta !== 0 && (
          <span className={cn('text-xs tabular-nums', imp ? 'text-emerald-600' : 'text-amber-600')}>
            {imp ? '▲' : '▼'} {formatDelta(athlete.delta, unit, locale)}
          </span>
        )}
        {athlete.targetGap != null && (
          <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', gapTone === 'good' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 bg-amber-50')}>
            {formatDelta(athlete.targetGap, unit, locale)}
          </Badge>
        )}
        {athlete.score != null && (
          <span className={cn('inline-flex h-5 min-w-[26px] items-center justify-center rounded px-1 text-[10px] font-bold tabular-nums', scoreColor(athlete.score))}>{athlete.score}</span>
        )}
      </div>

      <div className="text-xs text-muted-foreground tabular-nums truncate sm:text-right">
        {trail.length > 1
          ? trail.map((t, i) => (
              <span key={t.label}>
                {i > 0 && <span className="mx-1 opacity-50">→</span>}
                <span title={t.label}>{formatNumber(t.value, locale, unit.toLowerCase() === 's' ? 2 : Number.isInteger(t.value) ? 0 : 1)}</span>
              </span>
            ))
          : <span className="opacity-50">{copy(locale, 'one season', 'en säsong')}</span>}
      </div>
    </div>
  )
}

function PlayerDevelopment({ seasons, locale }: { seasons: SeasonAnalysis[]; locale: Locale }) {
  // Players present in the most recent season, with data.
  const players = useMemo(() => {
    const current = seasons[0]
    if (!current) return [] as PlayerScore[]
    return current.scores
      .filter((s) => s.total != null)
      .slice()
      .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
  }, [seasons])

  const [clientId, setClientId] = useState(players[0]?.clientId ?? '')
  const selected = players.find((p) => p.clientId === clientId) ?? players[0]

  if (!selected) {
    return <p className="text-sm text-muted-foreground">{copy(locale, 'No scored players yet.', 'Inga spelare med poäng ännu.')}</p>
  }

  // Composite trail oldest→newest.
  const compositeTrail = seasons
    .map((s) => ({ label: s.label, total: s.scores.find((x) => x.clientId === selected.clientId)?.total ?? null }))
    .reverse()
    .filter((x) => x.total != null) as Array<{ label: string; total: number }>

  const currentGroups = seasons[0]?.metricGroups ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <select
            value={selected.clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm font-medium"
          >
            {players.map((p) => (
              <option key={p.clientId} value={p.clientId}>{p.name}{p.pos ? ` (${p.pos})` : ''}</option>
            ))}
          </select>
          {selected.pos && <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', POS_BADGE[selected.pos])}>{selected.pos}</Badge>}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          {copy(locale, 'Profile', 'Profil')}:
          {compositeTrail.length
            ? compositeTrail.map((t, i) => (
                <span key={t.label} className="flex items-center gap-1">
                  {i > 0 && <span className="opacity-50">→</span>}
                  <span className={cn('inline-flex h-6 min-w-[28px] items-center justify-center rounded px-1 text-xs font-bold tabular-nums', scoreColor(t.total))} title={t.label}>{t.total}</span>
                </span>
              ))
            : <span>–</span>}
        </div>
      </div>

      {currentGroups.map((group) => {
        const rows = group.metrics
          .map((m) => (
            <MetricDevRow
              key={m.key}
              metricKey={m.key}
              label={m.label}
              unit={m.unit}
              lowerIsBetter={m.lowerIsBetter}
              target={m.target}
              elite={m.elite}
              seasons={seasons}
              clientId={selected.clientId}
              locale={locale}
            />
          ))
        // Only render groups where the player actually has at least one value.
        const hasAny = group.metrics.some((m) => m.athletes.find((a) => a.clientId === selected.clientId)?.latest != null)
        if (!hasAny) return null
        return (
          <div key={group.id} className="rounded-lg border bg-background p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
              {group.id === 'strength' ? <Trophy className="h-4 w-4 text-amber-600" /> : <Zap className="h-4 w-4 text-blue-600" />}
              {group.label}
            </div>
            <div className="divide-y">{rows}</div>
          </div>
        )
      })}
    </div>
  )
}

export function TeamPlayerDevelopment({ teamId, businessSlug }: TeamPlayerDevelopmentProps) {
  const locale: Locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [data, setData] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const query = businessSlug ? `?businessSlug=${encodeURIComponent(businessSlug)}` : ''
        const res = await fetch(`/api/teams/${teamId}/analysis-summary${query}`, {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : undefined,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!cancelled && body.success) setData(body.data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : copy(locale, 'Could not fetch data', 'Kunde inte hämta data'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [businessSlug, locale, teamId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          {copy(locale, 'Player development', 'Spelarutveckling')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : error || !data ? (
          <p className="py-8 text-center text-destructive">{error ?? copy(locale, 'No data available', 'Inget data tillgängligt')}</p>
        ) : data.seasons.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{copy(locale, 'No test data yet.', 'Ingen testdata ännu.')}</p>
        ) : (
          <PlayerDevelopment seasons={data.seasons} locale={locale} />
        )}
      </CardContent>
    </Card>
  )
}
