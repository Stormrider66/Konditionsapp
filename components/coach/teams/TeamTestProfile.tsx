'use client'

// Team test profile — the "Adaptiva teststaplar" experience extracted from the
// decision dashboard into its own home on the team Test page. Two views:
// "Väljare" (sticky test selector) and "Matris" (heatmap + position-adjusted
// 0-100 composite score + team-average footer + season comparison).
//
// Self-fetching from /api/teams/[id]/analysis-summary (the `seasons` payload).

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { BarChart3, Gauge, Grid3x3, LayoutList, Loader2, Trophy, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types (mirror lib/hockey/team-analysis-engine.ts)
// ---------------------------------------------------------------------------

type Locale = 'en' | 'sv'
type MetricCategory = 'hockey' | 'strength'
type HockeyPosition = 'C' | 'W' | 'D' | 'G'

interface AdaptiveMetricAthlete {
  clientId: string
  name: string
  latest: number | null
  previous: number | null
  delta: number | null
  percentChange: number | null
  latestDate: string | null
  previousDate: string | null
  rank: number | null
  percentile: number | null
  targetGap: number | null
  score: number | null
  missing: boolean
}

interface AdaptiveMetricRow {
  key: string
  label: string
  unit: string
  category: MetricCategory
  lowerIsBetter: boolean
  coverage: number
  teamAverage: number | null
  target: number | null
  elite: number | null
  leader: { clientId: string; name: string; value: number } | null
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
  position: string | null
  pos: HockeyPosition | null
  total: number | null
  count: number
}

interface SeasonAnalysis {
  key: string
  label: string
  metricGroups: MetricGroup[]
  scores: PlayerScore[]
}

interface TeamTestProfileProps {
  teamId: string
  businessSlug?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const copy = (locale: Locale, en: string, sv: string) => (locale === 'sv' ? sv : en)

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatNumber(value: number, locale: Locale, decimals: number): string {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function formatMetricValue(value: number | null, unit: string, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return '–'
  const u = unit.toLowerCase()
  const decimals =
    u === 's' || u.includes('km/h') || u.includes('mmol') || u.includes('w/kg') || u === 'nivå'
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

function signedNum(raw: number, dec: number, locale: Locale): string {
  return (raw > 0 ? '+' : '') + formatNumber(raw, locale, dec)
}

function avgDecimals(unit: string, value: number): number {
  return unit.toLowerCase() === 's' ? 2 : Number.isInteger(value) ? 0 : 1
}

function buildMetricDomain(metric: AdaptiveMetricRow): { min: number; max: number } {
  const values = [
    ...metric.athletes.map((a) => a.latest),
    metric.teamAverage,
    metric.target,
    metric.elite,
  ].filter((v): v is number => v != null && Number.isFinite(v))
  if (values.length === 0) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, Math.abs(max) * 0.1, 1)
  const padding = span * 0.12
  return { min: min - padding, max: max + padding }
}

function markerPosition(value: number | null, metric: Pick<AdaptiveMetricRow, 'lowerIsBetter'>, domain: { min: number; max: number }): number | null {
  if (value == null || !Number.isFinite(value) || domain.max === domain.min) return null
  const raw = metric.lowerIsBetter
    ? ((domain.max - value) / (domain.max - domain.min)) * 100
    : ((value - domain.min) / (domain.max - domain.min)) * 100
  return clamp(raw)
}

type AthleteStatus = 'over' | 'near' | 'under' | 'missing'

function athleteStatus(a: AdaptiveMetricAthlete, m: AdaptiveMetricRow): AthleteStatus {
  if (a.latest == null) return 'missing'
  if (a.targetGap != null) {
    if (a.targetGap >= 0) return 'over'
    const tol = m.target ? Math.abs(m.target) * 0.05 : 0
    if (Math.abs(a.targetGap) <= tol) return 'near'
    return 'under'
  }
  if (a.percentile != null) {
    if (a.percentile >= 66) return 'over'
    if (a.percentile >= 33) return 'near'
    return 'under'
  }
  return 'missing'
}

function metricCounts(m: AdaptiveMetricRow, membersTotal: number) {
  let over = 0
  let near = 0
  let under = 0
  for (const a of m.athletes) {
    const s = athleteStatus(a, m)
    if (s === 'over') over++
    else if (s === 'near') near++
    else if (s === 'under') under++
  }
  const measured = m.athletes.filter((a) => a.latest != null).length
  return { over, near, under, missing: membersTotal - measured, measured }
}

function coveragePct(m: AdaptiveMetricRow, membersTotal: number): number {
  const measured = m.athletes.filter((a) => a.latest != null).length
  return membersTotal > 0 ? Math.round((measured / membersTotal) * 100) : 0
}

function scoreColor(s: number): string {
  if (s >= 80) return 'bg-emerald-500 text-white'
  if (s >= 70) return 'bg-emerald-100 text-emerald-900'
  if (s >= 55) return 'bg-amber-100 text-amber-900'
  return 'bg-orange-100 text-orange-900'
}

const POS_BADGE: Record<HockeyPosition, string> = {
  C: 'bg-blue-100 text-blue-700 border-blue-200',
  W: 'bg-teal-100 text-teal-700 border-teal-200',
  D: 'bg-violet-100 text-violet-700 border-violet-200',
  G: 'bg-slate-200 text-slate-700 border-slate-300',
}

function posBadgeClass(pos: HockeyPosition | null): string {
  return pos ? POS_BADGE[pos] : 'bg-muted text-muted-foreground'
}

function cellBg(status: AthleteStatus): string {
  switch (status) {
    case 'over':
      return 'bg-emerald-100 text-emerald-900'
    case 'near':
      return 'bg-amber-100 text-amber-900'
    case 'under':
      return 'bg-orange-100 text-orange-900'
    default:
      return 'bg-muted/30 text-muted-foreground'
  }
}

function teamAvgScore(scores: PlayerScore[]): number | null {
  const t = scores.filter((s) => s.total != null).map((s) => s.total as number)
  return t.length ? Math.round(t.reduce((s, v) => s + v, 0) / t.length) : null
}

function miniBg(tone: 'good' | 'watch' | 'risk' | 'neutral'): string {
  if (tone === 'good') return 'bg-emerald-50'
  if (tone === 'watch') return 'bg-amber-50'
  if (tone === 'risk') return 'bg-orange-50'
  return 'bg-muted/40'
}

// ---------------------------------------------------------------------------
// Presentational sub-components
// ---------------------------------------------------------------------------

function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'good' | 'watch' | 'risk' | 'neutral' }) {
  return (
    <div className={cn('rounded-md px-2 py-1.5', miniBg(tone))}>
      <div className="font-semibold tabular-nums text-sm">{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{label}</div>
    </div>
  )
}

function MetricMarker({ left, label, className }: { left: number; label: string; className: string }) {
  return (
    <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1" style={{ left: `${left}%` }}>
      <span className="text-[10px] leading-none text-muted-foreground whitespace-nowrap">{label}</span>
      <span className={cn('h-4 w-0.5 rounded-full', className)} />
    </div>
  )
}

function MarkerBar({ metric, domain, locale }: { metric: AdaptiveMetricRow; domain: { min: number; max: number }; locale: Locale }) {
  const avg = markerPosition(metric.teamAverage, metric, domain)
  const tgt = markerPosition(metric.target, metric, domain)
  const elite = markerPosition(metric.elite, metric, domain)
  return (
    <div className="relative h-7">
      <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-muted" />
      {avg != null && <MetricMarker left={avg} label={copy(locale, 'Avg', 'Snitt')} className="bg-blue-500" />}
      {tgt != null && <MetricMarker left={tgt} label={copy(locale, 'Target', 'Mål')} className="bg-emerald-500" />}
      {elite != null && <MetricMarker left={elite} label={copy(locale, 'Elite', 'Elit')} className="bg-amber-500" />}
    </div>
  )
}

function MetricAthleteRow({ athlete, metric, domain, locale }: { athlete: AdaptiveMetricAthlete; metric: AdaptiveMetricRow; domain: { min: number; max: number }; locale: Locale }) {
  const score = markerPosition(athlete.latest, metric, domain)
  const gapTone = athlete.targetGap == null ? 'neutral' : athlete.targetGap >= 0 ? 'good' : 'risk'
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(130px,1fr)_minmax(160px,2fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{athlete.name}</span>
          {athlete.rank != null && <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">#{athlete.rank}</Badge>}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {athlete.percentile != null
            ? copy(locale, `${athlete.percentile}th percentile`, `Percentil ${athlete.percentile}`)
            : copy(locale, 'Missing data', 'Saknar data')}
        </div>
      </div>
      <div className="min-w-0">
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          {score != null ? (
            <div className={cn('h-full rounded-full', athlete.targetGap != null && athlete.targetGap < 0 ? 'bg-orange-400' : 'bg-blue-500')} style={{ width: `${score}%` }} />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="text-sm font-medium tabular-nums">{formatMetricValue(athlete.latest, metric.unit, locale)}</div>
        <div className={cn('text-xs tabular-nums min-w-[54px] text-right', athlete.delta == null ? 'text-muted-foreground' : (metric.lowerIsBetter ? athlete.delta < 0 : athlete.delta > 0) ? 'text-emerald-600' : 'text-muted-foreground')}>
          {formatDelta(athlete.delta, metric.unit, locale)}
        </div>
        {athlete.targetGap != null && (
          <Badge variant="outline" className={cn('h-6 px-2 text-[10px]', gapTone === 'good' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-orange-200 text-orange-700 bg-orange-50')}>
            {formatDelta(athlete.targetGap, metric.unit, locale)}
          </Badge>
        )}
      </div>
    </div>
  )
}

function MetricBarCard({ metric, membersTotal, locale }: { metric: AdaptiveMetricRow; membersTotal: number; locale: Locale }) {
  const sorted = metric.athletes
    .slice()
    .sort((a, b) => {
      if (a.rank == null && b.rank == null) return a.name.localeCompare(b.name, locale)
      if (a.rank == null) return 1
      if (b.rank == null) return -1
      return a.rank - b.rank
    })
  const domain = buildMetricDomain(metric)
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold leading-tight">{metric.label}</h3>
            <Badge variant="secondary" className="text-[11px]">{coveragePct(metric, membersTotal)}% {copy(locale, 'coverage', 'täckning')}</Badge>
            {metric.lowerIsBetter && <Badge variant="outline" className="text-[11px]">{copy(locale, 'lower is better', 'lägre är bättre')}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {copy(locale, 'Average', 'Snitt')} {formatMetricValue(metric.teamAverage, metric.unit, locale)}
            {metric.target != null && <> · {copy(locale, 'Target', 'Mål')} {formatMetricValue(metric.target, metric.unit, locale)}</>}
            {metric.elite != null && <> · {copy(locale, 'Elite', 'Elit')} {formatMetricValue(metric.elite, metric.unit, locale)}</>}
          </p>
        </div>
        {metric.leader && (
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">{copy(locale, 'Leader', 'Leder')}</div>
            <div className="text-sm font-medium">{metric.leader.name}</div>
            <div className="text-xs text-muted-foreground tabular-nums">{formatMetricValue(metric.leader.value, metric.unit, locale)}</div>
          </div>
        )}
      </div>
      <div className="mt-4">
        <MarkerBar metric={metric} domain={domain} locale={locale} />
      </div>
      <div className="mt-2 divide-y">
        {sorted.map((a) => (
          <MetricAthleteRow key={a.clientId} athlete={a} metric={metric} domain={domain} locale={locale} />
        ))}
      </div>
    </div>
  )
}

function MiniCounts({ metric, membersTotal, locale }: { metric: AdaptiveMetricRow; membersTotal: number; locale: Locale }) {
  const c = metricCounts(metric, membersTotal)
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <MiniStat label={copy(locale, 'Above', 'Över')} value={c.over} tone="good" />
      <MiniStat label={copy(locale, 'Close', 'Nära')} value={c.near} tone="watch" />
      <MiniStat label={copy(locale, 'Below', 'Under')} value={c.under} tone="risk" />
      <MiniStat label={copy(locale, 'Missing', 'Saknar')} value={c.missing} tone="neutral" />
    </div>
  )
}

function Seg({ label, options, value, onChange }: { label: string; options: Array<{ key: number; label: string }>; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.key} onClick={() => onChange(o.key)} className={cn('rounded-md border px-2.5 py-1 text-sm font-medium', value === o.key ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ScoreChip({ score, name, pos }: { score: number; name: string; pos: HockeyPosition | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-flex h-6 w-8 items-center justify-center rounded text-xs font-bold tabular-nums', scoreColor(score))}>{score}</span>
      <span className="truncate">{name}</span>
      <Badge variant="outline" className={cn('h-4 px-1 text-[9px]', posBadgeClass(pos))}>{pos ?? '—'}</Badge>
    </span>
  )
}

function ProfileSummary({ scores, compareScores, compareLabel, locale }: { scores: PlayerScore[]; compareScores: PlayerScore[] | null; compareLabel: string | null; locale: Locale }) {
  const scored = scores.filter((s) => s.total != null) as Array<PlayerScore & { total: number }>
  const teamAvg = teamAvgScore(scores)
  const cmpAvg = compareScores ? teamAvgScore(compareScores) : null
  const teamDelta = teamAvg != null && cmpAvg != null ? teamAvg - cmpAvg : null
  const ranked = scored.slice().sort((a, b) => b.total - a.total)
  const top = ranked.slice(0, 3)
  const bottom = ranked.slice(-3).reverse()
  const byPos = (['C', 'W', 'D', 'G'] as HockeyPosition[]).map((pos) => {
    const list = scored.filter((s) => s.pos === pos)
    const avg = list.length ? Math.round(list.reduce((s, p) => s + p.total, 0) / list.length) : null
    return { pos, avg, n: list.length }
  })
  return (
    <Card>
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-[auto_1fr_1fr]">
        <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 px-6 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Gauge className="h-3.5 w-3.5" /> {copy(locale, 'Team profile', 'Lagets fysprofil')}</div>
          <div className="mt-1 text-4xl font-bold leading-none tabular-nums">{teamAvg ?? '–'}<span className="text-base text-muted-foreground">/100</span></div>
          {teamDelta != null && (
            <div className={cn('mt-1 text-xs font-medium tabular-nums', teamDelta > 0 ? 'text-emerald-600' : teamDelta < 0 ? 'text-orange-600' : 'text-muted-foreground')}>
              {teamDelta > 0 ? '▲' : teamDelta < 0 ? '▼' : ''} {signedNum(teamDelta, 0, locale)} {copy(locale, `vs ${compareLabel}`, `mot ${compareLabel}`)}
            </div>
          )}
          <div className="mt-2 flex gap-1.5 text-[11px]">
            {byPos.map((b) => (
              <span key={b.pos} className="flex items-center gap-1">
                <Badge variant="outline" className={cn('h-4 px-1 text-[9px]', posBadgeClass(b.pos))}>{b.pos}</Badge>
                <span className="font-medium tabular-nums">{b.avg ?? '–'}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-1.5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy(locale, 'Top profiles', 'Toppar')}</div>
          {top.length === 0 ? <p className="text-xs text-muted-foreground">–</p> : top.map((p) => <div key={p.clientId} className="min-w-0"><ScoreChip score={p.total} name={p.name} pos={p.pos} /></div>)}
        </div>
        <div className="min-w-0 space-y-1.5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy(locale, 'Needs work', 'Störst potential')}</div>
          {bottom.length === 0 ? <p className="text-xs text-muted-foreground">–</p> : bottom.map((p) => <div key={p.clientId} className="min-w-0"><ScoreChip score={p.total} name={p.name} pos={p.pos} /></div>)}
        </div>
      </CardContent>
    </Card>
  )
}

function TestSelectorView({ groups, membersTotal, locale }: { groups: MetricGroup[]; membersTotal: number; locale: Locale }) {
  const allMetrics = groups.flatMap((g) => g.metrics)
  const [sel, setSel] = useState(allMetrics[0]?.key ?? '')
  const detailRef = useRef<HTMLDivElement>(null)
  const metric = allMetrics.find((m) => m.key === sel) ?? allMetrics[0]
  const pick = (key: string) => {
    setSel(key)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-1 border-b bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {groups.map((g) => (
          <div key={g.id} className="flex items-start gap-3 py-1">
            <span className="mt-1.5 flex w-20 shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.id === 'strength' ? <Trophy className="h-3.5 w-3.5 text-yellow-600" /> : <Zap className="h-3.5 w-3.5 text-blue-600" />} {g.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {g.metrics.map((m) => {
                const active = m.key === sel
                return (
                  <button key={m.key} onClick={() => pick(m.key)} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors', active ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}>
                    <span>{m.label}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{coveragePct(m, membersTotal)}%</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div ref={detailRef} className="scroll-mt-28 space-y-4">
        {metric && (
          <>
            <MiniCounts metric={metric} membersTotal={membersTotal} locale={locale} />
            <MetricBarCard metric={metric} membersTotal={membersTotal} locale={locale} />
          </>
        )}
      </div>
    </div>
  )
}

function MatrixView({ groups, membersTotal, scores, seasonLabel, compare, locale }: { groups: MetricGroup[]; membersTotal: number; scores: PlayerScore[]; seasonLabel: string; compare: { label: string; groups: MetricGroup[]; scores: PlayerScore[] } | null; locale: Locale }) {
  const metrics = groups.flatMap((g) => g.metrics)
  const [sel, setSel] = useState<string | null>(null)
  const [posFilter, setPosFilter] = useState<'ALL' | HockeyPosition>('ALL')
  const selMetric = sel ? metrics.find((m) => m.key === sel) ?? null : null

  const lookups = useMemo(() => metrics.map((m) => new Map(m.athletes.map((a) => [a.clientId, a]))), [metrics])
  const scoreByClient = useMemo(() => new Map(scores.map((s) => [s.clientId, s])), [scores])
  const cmpByKey = useMemo(() => (compare ? new Map(compare.groups.flatMap((g) => g.metrics).map((m) => [m.key, new Map(m.athletes.map((a) => [a.clientId, a]))])) : null), [compare])
  const cmpScoreByClient = useMemo(() => (compare ? new Map(compare.scores.map((s) => [s.clientId, s])) : null), [compare])

  const rows = useMemo(() => scores.filter((s) => posFilter === 'ALL' || s.pos === posFilter).slice().sort((a, b) => (b.total ?? -1) - (a.total ?? -1)), [scores, posFilter])

  const avgOver = (getter: (clientId: string) => number | null | undefined): number | null => {
    const vals = rows.map((r) => getter(r.clientId)).filter((v): v is number => v != null && Number.isFinite(v))
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }
  const curAvg = metrics.map((_, ci) => avgOver((cid) => lookups[ci].get(cid)?.latest))
  const cmpAvg = metrics.map((m) => {
    if (!cmpByKey) return null
    const lk = cmpByKey.get(m.key)
    if (!lk) return null
    return avgOver((cid) => lk.get(cid)?.latest)
  })
  const curTotalAvg = avgOver((cid) => scoreByClient.get(cid)?.total)
  const cmpTotalAvg = cmpScoreByClient ? avgOver((cid) => cmpScoreByClient.get(cid)?.total) : null

  const POS_OPTS: Array<{ key: 'ALL' | HockeyPosition; label: string }> = [
    { key: 'ALL', label: copy(locale, 'All', 'Alla') },
    { key: 'C', label: 'C' },
    { key: 'W', label: 'W' },
    { key: 'D', label: 'D' },
    { key: 'G', label: 'G' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {POS_OPTS.map((o) => (
            <button key={o.key} onClick={() => setPosFilter(o.key)} className={cn('rounded-md border px-2.5 py-1 text-sm font-medium', posFilter === o.key ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}>{o.label}</button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {copy(locale, 'Profile avg', 'Snittprofil')}:{' '}
          <span className={cn('ml-1 inline-flex h-6 items-center rounded px-2 font-bold tabular-nums', curTotalAvg != null ? scoreColor(Math.round(curTotalAvg)) : 'bg-muted')}>{curTotalAvg != null ? Math.round(curTotalAvg) : '–'}</span>
          <span className="ml-2 text-xs">({rows.length} {copy(locale, 'players', 'spelare')})</span>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/60 px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{copy(locale, 'Player', 'Spelare')}</th>
              <th className="px-2 py-2 text-center text-[11px] font-semibold">{copy(locale, 'Total', 'Total')}</th>
              {metrics.map((m) => (
                <th key={m.key} onClick={() => setSel(m.key === sel ? null : m.key)} className={cn('cursor-pointer whitespace-nowrap px-2 py-2 text-center align-bottom hover:bg-muted', m.key === sel && 'bg-blue-50')} title={m.label}>
                  <div className="text-[11px] font-semibold">{m.label}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">{coveragePct(m, membersTotal)}%</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const ps = scoreByClient.get(p.clientId)
              return (
                <tr key={p.clientId} className="border-b">
                  <td className="sticky left-0 z-10 bg-background px-3 py-1.5 text-left">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', posBadgeClass(p.pos))}>{p.pos ?? '—'}</Badge>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={cn('inline-flex h-6 w-9 items-center justify-center rounded text-xs font-bold tabular-nums', ps?.total != null ? scoreColor(ps.total) : 'bg-muted text-muted-foreground')}>{ps?.total ?? '·'}</span>
                  </td>
                  {metrics.map((m, ci) => {
                    const a = lookups[ci].get(p.clientId)
                    const status: AthleteStatus = a ? athleteStatus(a, m) : 'missing'
                    return (
                      <td key={m.key} onClick={() => setSel(m.key === sel ? null : m.key)} className={cn('cursor-pointer px-2 py-1.5 text-center text-[12px] tabular-nums', cellBg(status))}>
                        {a?.latest != null ? formatNumber(a.latest, locale, m.unit.toLowerCase() === 's' ? 2 : a.latest % 1 === 0 ? 0 : 1) : '·'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-medium">
              <td className="sticky left-0 z-10 bg-muted/60 px-3 py-2 text-left text-xs">{copy(locale, 'Team avg', 'Lagsnitt')} {seasonLabel}</td>
              <td className="px-2 py-2 text-center">
                <span className={cn('inline-flex h-6 w-9 items-center justify-center rounded text-xs font-bold tabular-nums', curTotalAvg != null ? scoreColor(Math.round(curTotalAvg)) : 'bg-muted text-muted-foreground')}>{curTotalAvg != null ? Math.round(curTotalAvg) : '–'}</span>
              </td>
              {metrics.map((m, ci) => (
                <td key={m.key} className="px-2 py-2 text-center text-[12px] tabular-nums">{curAvg[ci] != null ? formatNumber(curAvg[ci] as number, locale, avgDecimals(m.unit, curAvg[ci] as number)) : '–'}</td>
              ))}
            </tr>
            {compare && (
              <tr className="bg-muted/20 text-xs">
                <td className="sticky left-0 z-10 bg-muted/40 px-3 py-1.5 text-left text-muted-foreground">Δ {copy(locale, 'vs', 'mot')} {compare.label}</td>
                <td className="px-2 py-1.5 text-center">
                  {curTotalAvg != null && cmpTotalAvg != null ? (
                    <span className={cn('font-semibold tabular-nums', curTotalAvg - cmpTotalAvg > 0 ? 'text-emerald-600' : curTotalAvg - cmpTotalAvg < 0 ? 'text-orange-600' : 'text-muted-foreground')}>{signedNum(Math.round(curTotalAvg - cmpTotalAvg), 0, locale)}</span>
                  ) : <span className="text-muted-foreground">–</span>}
                </td>
                {metrics.map((m, ci) => {
                  const cur = curAvg[ci]
                  const cmp = cmpAvg[ci]
                  if (cur == null || cmp == null) return <td key={m.key} className="px-2 py-1.5 text-center text-muted-foreground">–</td>
                  const dec = m.unit.toLowerCase() === 's' ? 2 : 1
                  const factor = Math.pow(10, dec)
                  const raw = Math.round((cur - cmp) * factor) / factor
                  const improvement = m.lowerIsBetter ? raw < 0 : raw > 0
                  return <td key={m.key} className={cn('px-2 py-1.5 text-center tabular-nums', raw === 0 ? 'text-muted-foreground' : improvement ? 'text-emerald-600' : 'text-orange-600')}>{raw === 0 ? '0' : signedNum(raw, dec, locale)}</td>
                })}
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100" /> {copy(locale, 'Above target', 'Över mål')}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" /> {copy(locale, 'Near', 'Nära')}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-orange-300 bg-orange-100" /> {copy(locale, 'Below', 'Under')}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border bg-muted/40" /> {copy(locale, 'Missing', 'Saknar')}</span>
        <span className="ml-auto">{copy(locale, 'Total = 70 meets position target, 100 = elite. Click a column to open the test.', 'Total = 70 når positionsmålet, 100 = elit. Klicka en kolumn för att öppna testet.')}</span>
      </div>
      {selMetric && <MetricBarCard metric={selMetric} membersTotal={membersTotal} locale={locale} />}
    </div>
  )
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        <BarChart3 className="h-9 w-9 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm mt-1 max-w-md mx-auto">{text}</p>
      </CardContent>
    </Card>
  )
}

function TestAnalysisSection({ seasons, membersTotal, locale }: { seasons: SeasonAnalysis[]; membersTotal: number; locale: Locale }) {
  const [seasonIdx, setSeasonIdx] = useState(0)
  const [compareIdx, setCompareIdx] = useState<number | null>(null)
  const [view, setView] = useState<'selector' | 'matrix'>('selector')

  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        <BarChart3 className="h-4 w-4" /> {copy(locale, 'Adaptive test bars', 'Adaptiva teststaplar')}
      </h2>
      <p className="text-xs text-muted-foreground">{copy(locale, 'Only metrics with team data are shown.', 'Endast mätvärden med lagdata visas.')}</p>
    </div>
  )

  if (!seasons || seasons.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState title={copy(locale, 'No team test data yet', 'Ingen lagtestdata ännu')} text={copy(locale, 'Import tests or PRs and this section becomes the team comparison board.', 'Importera tester eller PR så blir den här delen lagets jämförelsetavla.')} />
      </div>
    )
  }

  const safeSeasonIdx = Math.min(seasonIdx, seasons.length - 1)
  const selected = seasons[safeSeasonIdx]
  const effectiveCompareIdx = compareIdx != null && compareIdx !== safeSeasonIdx ? compareIdx : null
  const compareSeason = effectiveCompareIdx != null ? seasons[effectiveCompareIdx] : null

  return (
    <div className="space-y-4">
      {header}

      {seasons.length > 1 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border bg-muted/20 px-4 py-3">
          <Seg label={copy(locale, 'Season', 'Säsong')} options={seasons.map((s, i) => ({ key: i, label: s.label }))} value={safeSeasonIdx} onChange={(v) => setSeasonIdx(v)} />
          <Seg label={copy(locale, 'Compare', 'Jämför')} options={[{ key: -1, label: copy(locale, 'Off', 'Av') }, ...seasons.map((s, i) => ({ key: i, label: s.label })).filter((o) => o.key !== safeSeasonIdx)]} value={effectiveCompareIdx ?? -1} onChange={(v) => setCompareIdx(v === -1 ? null : v)} />
        </div>
      )}

      <ProfileSummary scores={selected.scores} compareScores={compareSeason?.scores ?? null} compareLabel={compareSeason?.label ?? null} locale={locale} />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView('selector')} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', view === 'selector' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}><LayoutList className="h-4 w-4" /> {copy(locale, 'Selector', 'Väljare')}</button>
        <button onClick={() => setView('matrix')} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', view === 'matrix' ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}><Grid3x3 className="h-4 w-4" /> {copy(locale, 'Matrix', 'Matris')}</button>
      </div>

      {selected.metricGroups.length === 0 ? (
        <EmptyState title={copy(locale, 'No data for this season', 'Ingen data för säsongen')} text={copy(locale, 'Pick another season above.', 'Välj en annan säsong ovan.')} />
      ) : view === 'selector' ? (
        <TestSelectorView groups={selected.metricGroups} membersTotal={membersTotal} locale={locale} />
      ) : (
        <MatrixView groups={selected.metricGroups} membersTotal={membersTotal} scores={selected.scores} seasonLabel={selected.label} compare={compareSeason ? { label: compareSeason.label, groups: compareSeason.metricGroups, scores: compareSeason.scores } : null} locale={locale} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exported self-fetching wrapper
// ---------------------------------------------------------------------------

interface SummaryData {
  seasons: SeasonAnalysis[]
  members: Array<{ clientId: string }>
}

export function TeamTestProfile({ teamId, businessSlug }: TeamTestProfileProps) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return <div className="py-12 text-center text-destructive">{error ?? copy(locale, 'No data available', 'Inget data tillgängligt')}</div>
  }

  return <TestAnalysisSection seasons={data.seasons} membersTotal={data.members.length} locale={locale} />
}
