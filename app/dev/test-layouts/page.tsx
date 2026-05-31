'use client'

// app/dev/test-layouts/page.tsx
// Throwaway prototype for the team "Adaptiva teststaplar" (test analysis) view.
// Two views: (1) Väljare — persistent/sticky test selector, detail resets to top
// on each pick; (2) Matris — heatmap + position-adjusted 0-100 composite score,
// a team-average footer row per test, and previous-season comparison.
//
// Fed by deterministic MOCK hockey data (no auth/DB). Matches the real
// AdaptiveMetricRow/MetricGroup shape from components/coach/teams/
// TeamAnalysisClient.tsx, so the chosen view drops onto live `metricGroups`.
//
// Visit /dev/test-layouts (log in first — middleware gates all routes).

import { useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BarChart3, Gauge, Grid3x3, LayoutList, Trophy, Zap } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types (mirror TeamAnalysisClient.tsx)
// ---------------------------------------------------------------------------

type Locale = 'en' | 'sv'
type MetricCategory = 'hockey' | 'strength'
type Pos = 'C' | 'W' | 'D' | 'G'
type Quality = 'strength' | 'speed' | 'endurance' | 'jump' | 'power'

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
  missing: boolean
}

interface AdaptiveMetricRow {
  key: string
  label: string
  short: string
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

interface Season {
  label: string
  groups: MetricGroup[]
  scores: PlayerScore[]
}

// ---------------------------------------------------------------------------
// Shared formatting helpers (copied from the real component so the look matches)
// ---------------------------------------------------------------------------

function copy(locale: Locale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

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
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatMetricValue(value, unit, locale)}`
}

function signedNum(raw: number, dec: number, locale: Locale): string {
  const sign = raw > 0 ? '+' : ''
  return sign + formatNumber(raw, locale, dec)
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

function markerPosition(
  value: number | null,
  metric: Pick<AdaptiveMetricRow, 'lowerIsBetter'>,
  domain: { min: number; max: number }
): number | null {
  if (value == null || !Number.isFinite(value) || domain.max === domain.min) return null
  const raw = metric.lowerIsBetter
    ? ((domain.max - value) / (domain.max - domain.min)) * 100
    : ((value - domain.min) / (domain.max - domain.min)) * 100
  return clamp(raw)
}

function percentileFromRank(rank: number, coverage: number): number {
  if (coverage <= 1) return 100
  return Math.round(((coverage - rank) / (coverage - 1)) * 100)
}

type Status = 'over' | 'near' | 'under' | 'missing'

function athleteStatus(a: AdaptiveMetricAthlete, m: AdaptiveMetricRow): Status {
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

// ---------------------------------------------------------------------------
// Composite 0-100 score, position-adjusted
// ---------------------------------------------------------------------------
//
// Scale: 70 = meets position target, 100 = elite, 0 = a "floor" symmetric below
// target. Each player is graded against THEIR position's norm (target/elite),
// then the sub-scores are averaged over the tests they have data for.
// In production the per-position target/elite come from HockeyNormReference;
// here we synthesize them by applying a position×quality factor to each test.

const POSITION_FACTORS: Record<Pos, Record<Quality, number>> = {
  // >1 = a tougher standard for that position/quality
  C: { strength: 1.0, speed: 1.02, endurance: 1.02, jump: 1.0, power: 1.0 },
  W: { strength: 0.97, speed: 1.04, endurance: 1.0, jump: 1.02, power: 1.0 },
  D: { strength: 1.05, speed: 0.99, endurance: 1.0, jump: 1.0, power: 1.02 },
  G: { strength: 0.92, speed: 0.95, endurance: 0.95, jump: 0.95, power: 0.95 },
}

function normScore(v: number, target: number, elite: number, lowerIsBetter: boolean): number {
  if (lowerIsBetter) {
    const span = target - elite
    if (span <= 0) return v <= target ? 100 : 0
    if (v <= elite) return 100
    if (v <= target) return clamp(70 + (30 * (target - v)) / span)
    const floor = target + span
    if (v >= floor) return 0
    return clamp((70 * (floor - v)) / (floor - target))
  }
  const span = elite - target
  if (span <= 0) return v >= target ? 100 : 0
  if (v >= elite) return 100
  if (v >= target) return clamp(70 + (30 * (v - target)) / span)
  const floor = target - span
  if (v <= floor) return 0
  return clamp((70 * (v - floor)) / (target - floor))
}

function positionNorm(def: TestDef, pos: Pos): { target: number; elite: number } | null {
  if (def.target == null || def.elite == null) return null
  const f = POSITION_FACTORS[pos][def.quality] ?? 1
  return def.lowerIsBetter
    ? { target: def.target / f, elite: def.elite / f }
    : { target: def.target * f, elite: def.elite * f }
}

interface PlayerScore {
  clientId: string
  name: string
  pos: Pos
  total: number | null
  count: number
}

function scoreColor(s: number): string {
  if (s >= 80) return 'bg-emerald-500 text-white'
  if (s >= 70) return 'bg-emerald-100 text-emerald-900'
  if (s >= 55) return 'bg-amber-100 text-amber-900'
  return 'bg-orange-100 text-orange-900'
}

const POS_BADGE: Record<Pos, string> = {
  C: 'bg-blue-100 text-blue-700 border-blue-200',
  W: 'bg-teal-100 text-teal-700 border-teal-200',
  D: 'bg-violet-100 text-violet-700 border-violet-200',
  G: 'bg-slate-200 text-slate-700 border-slate-300',
}

// ---------------------------------------------------------------------------
// Mock data — deterministic so SSR/CSR match (no Date/Math.random at module init)
// ---------------------------------------------------------------------------

const PLAYERS = [
  'Nils Bolin', 'Edward Björk', 'Leo Bergström', 'Oscar Lind', 'Hugo Sandberg',
  'Liam Ek', 'Elias Holm', 'William Falk', 'Lucas Ström', 'Theo Wikander',
  'Adam Sjögren', 'Filip Nyström', 'Viktor Åkerlund', 'Melker Dahl', 'Ludvig Forsberg',
  'Albin Häll', 'Anton Ros', 'Noah Engström', 'Isak Lundqvist', 'Gustav Berg',
  'Vincent Norén', 'Måns Ahlberg', 'Sixten Ek', 'Felix Brandt', 'Arvid Sundin',
]

const POSITIONS: Pos[] = [
  'C', 'W', 'W', 'D', 'D', 'C', 'W', 'W', 'D', 'D',
  'C', 'W', 'W', 'D', 'D', 'D', 'D', 'G', 'C', 'W',
  'W', 'D', 'D', 'G', 'W',
]

interface TestDef {
  key: string
  label: string
  short: string
  unit: string
  category: MetricCategory
  quality: Quality
  lowerIsBetter: boolean
  base: number
  spread: number
  target: number | null
  elite: number | null
  coverage: number
  dec: number
}

// 12 hockey + 3 strength tests, varied coverage so "only tests in use" is visible.
const HOCKEY_DEFS: TestDef[] = [
  { key: 'beepTestLevel', label: 'Beep test', short: 'Beep', unit: 'nivå', category: 'hockey', quality: 'endurance', lowerIsBetter: false, base: 11.5, spread: 3, target: 12, elite: 14, coverage: 0.84, dec: 1 },
  { key: 'standingLongJump', label: 'Stående längdhopp', short: 'Längd', unit: 'cm', category: 'hockey', quality: 'jump', lowerIsBetter: false, base: 250, spread: 35, target: 260, elite: 285, coverage: 0.72, dec: 0 },
  { key: 'sprint10m', label: '10 m is', short: '10m', unit: 's', category: 'hockey', quality: 'speed', lowerIsBetter: true, base: 1.85, spread: 0.15, target: 1.82, elite: 1.7, coverage: 0.68, dec: 2 },
  { key: 'benchPress1RM', label: 'Bänkpress 1RM', short: 'Bänk', unit: 'kg', category: 'hockey', quality: 'strength', lowerIsBetter: false, base: 95, spread: 30, target: 100, elite: 120, coverage: 0.64, dec: 0 },
  { key: 'sprint20m', label: '20 m is', short: '20m', unit: 's', category: 'hockey', quality: 'speed', lowerIsBetter: true, base: 3.05, spread: 0.22, target: 3.0, elite: 2.8, coverage: 0.6, dec: 2 },
  { key: 'sprint30m', label: '30 m is', short: '30m', unit: 's', category: 'hockey', quality: 'speed', lowerIsBetter: true, base: 4.25, spread: 0.3, target: 4.2, elite: 3.95, coverage: 0.56, dec: 2 },
  { key: 'backSquat1RM', label: 'Knäböj', short: 'Knäböj', unit: 'kg', category: 'hockey', quality: 'strength', lowerIsBetter: false, base: 150, spread: 50, target: 158, elite: 183, coverage: 0.52, dec: 0 },
  { key: 'vo2Max', label: 'VO2max', short: 'VO2', unit: 'ml/kg/min', category: 'hockey', quality: 'endurance', lowerIsBetter: false, base: 54, spread: 8, target: 56, elite: 62, coverage: 0.48, dec: 1 },
  { key: 'agilityBest', label: '5-10-5 bäst', short: '5-10-5', unit: 's', category: 'hockey', quality: 'speed', lowerIsBetter: true, base: 4.6, spread: 0.3, target: 4.5, elite: 4.2, coverage: 0.44, dec: 2 },
  { key: 'powerClean1RM', label: 'Power clean 1RM', short: 'Clean', unit: 'kg', category: 'hockey', quality: 'power', lowerIsBetter: false, base: 85, spread: 25, target: 90, elite: 110, coverage: 0.4, dec: 0 },
  { key: 'threeJumpLeft', label: '3-steg vänster', short: '3-steg V', unit: 'cm', category: 'hockey', quality: 'jump', lowerIsBetter: false, base: 720, spread: 90, target: 760, elite: 830, coverage: 0.36, dec: 0 },
  { key: 'wingate30s', label: 'Wingate 30 s', short: 'Wingate', unit: 'W', category: 'hockey', quality: 'power', lowerIsBetter: false, base: 750, spread: 180, target: 800, elite: 950, coverage: 0.32, dec: 0 },
]

const STRENGTH_DEFS: TestDef[] = [
  { key: 'deadlift', label: 'Marklyft', short: 'Marklyft', unit: 'kg', category: 'strength', quality: 'strength', lowerIsBetter: false, base: 180, spread: 55, target: 190, elite: 220, coverage: 0.52, dec: 0 },
  { key: 'frontSquat', label: 'Frontböj', short: 'Frontböj', unit: 'kg', category: 'strength', quality: 'strength', lowerIsBetter: false, base: 110, spread: 35, target: 120, elite: 140, coverage: 0.4, dec: 0 },
  { key: 'weightedChin', label: 'Chins + vikt', short: 'Chins', unit: 'kg', category: 'strength', quality: 'strength', lowerIsBetter: false, base: 25, spread: 18, target: 30, elite: 45, coverage: 0.36, dec: 0 },
]

const DEF_MAP = new Map<string, TestDef>([...HOCKEY_DEFS, ...STRENGTH_DEFS].map((d) => [d.key, d]))

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function roundTo(v: number, dec: number): number {
  const f = Math.pow(10, dec)
  return Math.round(v * f) / f
}

// Build one season. `yearsAgo` shifts the team's level (the team improves over
// time) and slightly lowers coverage for older seasons. Player abilities are
// fixed across seasons (same roster), so deltas reflect a real year trend.
function buildSeason(seedSalt: number, yearsAgo: number): MetricGroup[] {
  const abilityRng = mulberry32(777)
  const abilities = PLAYERS.map(() => abilityRng())
  const rng = mulberry32(20260531 + seedSalt)

  function buildRow(def: TestDef): AdaptiveMetricRow {
    const shift = yearsAgo * def.spread * 0.12
    const baseEff = def.lowerIsBetter ? def.base + shift : def.base - shift
    const cov = Math.max(0.12, Math.min(0.95, def.coverage - yearsAgo * 0.04))

    const raw = PLAYERS.map((name, i) => {
      const measured = rng() < cov
      const noise = (rng() - 0.5) * def.spread * 0.3
      const improveRng = rng()
      if (!measured) return { name, i, latest: null as number | null, previous: null as number | null }
      const center = def.lowerIsBetter
        ? baseEff - (abilities[i] - 0.5) * def.spread + noise
        : baseEff + (abilities[i] - 0.5) * def.spread + noise
      const latest = roundTo(center, def.dec)
      const improveMag = def.spread * 0.06 * improveRng
      const previous = roundTo(def.lowerIsBetter ? latest + improveMag : latest - improveMag, def.dec)
      return { name, i, latest, previous }
    })

    const measured = raw.filter((r) => r.latest != null) as Array<{ name: string; i: number; latest: number; previous: number }>
    const ranked = measured.slice().sort((a, b) => (def.lowerIsBetter ? a.latest - b.latest : b.latest - a.latest))
    const rankMap = new Map<number, { rank: number; percentile: number }>()
    ranked.forEach((r, idx) => rankMap.set(r.i, { rank: idx + 1, percentile: percentileFromRank(idx + 1, ranked.length) }))

    const athletes: AdaptiveMetricAthlete[] = raw.map((r) => {
      if (r.latest == null) {
        return {
          clientId: `p${r.i}`, name: r.name, latest: null, previous: null, delta: null,
          percentChange: null, latestDate: null, previousDate: null, rank: null,
          percentile: null, targetGap: null, missing: true,
        }
      }
      const delta = roundTo(r.latest - (r.previous as number), def.dec)
      const rk = rankMap.get(r.i)!
      const targetGap = def.target == null
        ? null
        : roundTo(def.lowerIsBetter ? def.target - r.latest : r.latest - def.target, def.dec)
      return {
        clientId: `p${r.i}`, name: r.name, latest: r.latest, previous: r.previous, delta,
        percentChange: null, latestDate: '2026-05-20', previousDate: '2026-03-10',
        rank: rk.rank, percentile: rk.percentile, targetGap, missing: false,
      }
    })

    const vals = measured.map((r) => r.latest)
    const teamAverage = vals.length ? roundTo(vals.reduce((s, v) => s + v, 0) / vals.length, def.dec) : null
    const leaderEntry = ranked[0]
    const leader = leaderEntry ? { clientId: `p${leaderEntry.i}`, name: leaderEntry.name, value: leaderEntry.latest } : null

    return {
      key: def.key, label: def.label, short: def.short, unit: def.unit, category: def.category,
      lowerIsBetter: def.lowerIsBetter, coverage: measured.length, teamAverage,
      target: def.target, elite: def.elite, leader, athletes,
    }
  }

  const hockey = HOCKEY_DEFS.map(buildRow).filter((m) => m.coverage > 0).sort((a, b) => b.coverage - a.coverage)
  const strength = STRENGTH_DEFS.map(buildRow).filter((m) => m.coverage > 0).sort((a, b) => b.coverage - a.coverage)
  return [
    { id: 'hockey' as const, label: 'Tester', metrics: hockey },
    { id: 'strength' as const, label: 'Styrke-PRs', metrics: strength },
  ].filter((g) => g.metrics.length > 0)
}

function computeScores(metrics: AdaptiveMetricRow[]): PlayerScore[] {
  return PLAYERS.map((name, i) => {
    const clientId = `p${i}`
    const pos = POSITIONS[i]
    const subs: number[] = []
    for (const m of metrics) {
      const def = DEF_MAP.get(m.key)
      if (!def) continue
      const a = m.athletes.find((x) => x.clientId === clientId)
      if (!a || a.latest == null) continue
      const norm = positionNorm(def, pos)
      if (!norm) continue
      subs.push(normScore(a.latest, norm.target, norm.elite, def.lowerIsBetter))
    }
    const total = subs.length ? Math.round(subs.reduce((s, v) => s + v, 0) / subs.length) : null
    return { clientId, name, pos, total, count: subs.length }
  })
}

const SEASON_DEFS = [
  { label: '2025/26', yearsAgo: 0 },
  { label: '2024/25', yearsAgo: 1 },
  { label: '2023/24', yearsAgo: 2 },
]

// ---------------------------------------------------------------------------
// Shared presentational sub-components
// ---------------------------------------------------------------------------

function GroupIcon({ id }: { id: MetricCategory }) {
  return id === 'strength' ? <Trophy className="h-4 w-4 text-yellow-600" /> : <Zap className="h-4 w-4 text-blue-600" />
}

function Seg({ label, options, value, onChange }: { label: string; options: Array<{ key: number; label: string }>; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={cn('rounded-md border px-2.5 py-1 text-sm font-medium', value === o.key ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}
          >
            {o.label}
          </button>
        ))}
      </div>
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

function AthleteRow({ athlete, metric, domain, locale }: { athlete: AdaptiveMetricAthlete; metric: AdaptiveMetricRow; domain: { min: number; max: number }; locale: Locale }) {
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
            <div
              className={cn('h-full rounded-full', athlete.targetGap != null && athlete.targetGap < 0 ? 'bg-orange-400' : 'bg-blue-500')}
              style={{ width: `${score}%` }}
            />
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

function CountStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn('rounded-md px-2 py-1.5 text-center', tone)}>
      <div className="font-semibold tabular-nums text-sm">{value}</div>
      <div className="text-[10px] text-muted-foreground truncate">{label}</div>
    </div>
  )
}

function MiniCounts({ metric, membersTotal, locale }: { metric: AdaptiveMetricRow; membersTotal: number; locale: Locale }) {
  const c = metricCounts(metric, membersTotal)
  return (
    <div className="grid grid-cols-4 gap-2">
      <CountStat label={copy(locale, 'Above', 'Över')} value={c.over} tone="bg-emerald-50" />
      <CountStat label={copy(locale, 'Close', 'Nära')} value={c.near} tone="bg-amber-50" />
      <CountStat label={copy(locale, 'Below', 'Under')} value={c.under} tone="bg-orange-50" />
      <CountStat label={copy(locale, 'Missing', 'Saknar')} value={c.missing} tone="bg-muted/40" />
    </div>
  )
}

function TestBarCard({ metric, membersTotal, locale }: { metric: AdaptiveMetricRow; membersTotal: number; locale: Locale }) {
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
          <AthleteRow key={a.clientId} athlete={a} metric={metric} domain={domain} locale={locale} />
        ))}
      </div>
    </div>
  )
}

function teamAvgScore(scores: PlayerScore[]): number | null {
  const t = scores.filter((s) => s.total != null).map((s) => s.total as number)
  return t.length ? Math.round(t.reduce((s, v) => s + v, 0) / t.length) : null
}

function ScoreChip({ p }: { p: PlayerScore & { total: number } }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-flex h-6 w-8 items-center justify-center rounded text-xs font-bold tabular-nums', scoreColor(p.total))}>{p.total}</span>
      <span className="truncate">{p.name}</span>
      <Badge variant="outline" className={cn('h-4 px-1 text-[9px]', POS_BADGE[p.pos])}>{p.pos}</Badge>
    </span>
  )
}

// Team physical-profile summary (the composite 0-100 score) — shown above both views.
function ProfileSummary({ scores, compareScores, compareLabel, locale }: { scores: PlayerScore[]; compareScores: PlayerScore[] | null; compareLabel: string | null; locale: Locale }) {
  const scored = scores.filter((s) => s.total != null) as Array<PlayerScore & { total: number }>
  const teamAvg = teamAvgScore(scores)
  const cmpAvg = compareScores ? teamAvgScore(compareScores) : null
  const teamDelta = teamAvg != null && cmpAvg != null ? teamAvg - cmpAvg : null
  const ranked = scored.slice().sort((a, b) => b.total - a.total)
  const top = ranked.slice(0, 3)
  const bottom = ranked.slice(-3).reverse()
  const byPos = (['C', 'W', 'D', 'G'] as Pos[]).map((pos) => {
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
                <Badge variant="outline" className={cn('h-4 px-1 text-[9px]', POS_BADGE[b.pos])}>{b.pos}</Badge>
                <span className="font-medium tabular-nums">{b.avg ?? '–'}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 space-y-1.5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy(locale, 'Top profiles', 'Toppar')}</div>
          {top.map((p) => <div key={p.clientId} className="min-w-0"><ScoreChip p={p} /></div>)}
        </div>
        <div className="min-w-0 space-y-1.5 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy(locale, 'Needs work', 'Störst potential')}</div>
          {bottom.map((p) => <div key={p.clientId} className="min-w-0"><ScoreChip p={p} /></div>)}
        </div>
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// VIEW 1 — Väljare (persistent sticky selector, detail resets to top on pick)
// ===========================================================================

function ViewSelector({ groups, membersTotal, locale }: { groups: MetricGroup[]; membersTotal: number; locale: Locale }) {
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
              <GroupIcon id={g.id} /> {g.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {g.metrics.map((m) => {
                const active = m.key === sel
                return (
                  <button
                    key={m.key}
                    onClick={() => pick(m.key)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted'
                    )}
                  >
                    <span>{m.label}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] tabular-nums', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{coveragePct(m, membersTotal)}%</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div ref={detailRef} className="scroll-mt-28">
        {metric && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <MiniCounts metric={metric} membersTotal={membersTotal} locale={locale} />
              <TestBarCard metric={metric} membersTotal={membersTotal} locale={locale} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ===========================================================================
// VIEW 2 — Matris (heatmap + composite Total + team-average footer + compare)
// ===========================================================================

function cellBg(status: Status): string {
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

function ViewMatrix({
  groups,
  membersTotal,
  scores,
  seasonLabel,
  compare,
  locale,
}: {
  groups: MetricGroup[]
  membersTotal: number
  scores: PlayerScore[]
  seasonLabel: string
  compare: { label: string; groups: MetricGroup[]; scores: PlayerScore[] } | null
  locale: Locale
}) {
  const metrics = groups.flatMap((g) => g.metrics)
  const [sel, setSel] = useState<string | null>(null)
  const [posFilter, setPosFilter] = useState<'ALL' | Pos>('ALL')
  const selMetric = sel ? metrics.find((m) => m.key === sel) ?? null : null

  const lookups = useMemo(() => metrics.map((m) => new Map(m.athletes.map((a) => [a.clientId, a]))), [metrics])
  const scoreByClient = useMemo(() => new Map(scores.map((s) => [s.clientId, s])), [scores])
  const cmpByKey = useMemo(
    () => (compare ? new Map(compare.groups.flatMap((g) => g.metrics).map((m) => [m.key, new Map(m.athletes.map((a) => [a.clientId, a]))])) : null),
    [compare]
  )
  const cmpScoreByClient = useMemo(() => (compare ? new Map(compare.scores.map((s) => [s.clientId, s])) : null), [compare])

  const rows = useMemo(
    () =>
      scores
        .filter((s) => posFilter === 'ALL' || s.pos === posFilter)
        .slice()
        .sort((a, b) => (b.total ?? -1) - (a.total ?? -1)),
    [scores, posFilter]
  )

  // Footer: team average per metric over the currently filtered rows.
  const avgOver = (getter: (clientId: string) => number | null | undefined, dec: number): number | null => {
    const vals = rows.map((r) => getter(r.clientId)).filter((v): v is number => v != null && Number.isFinite(v))
    return vals.length ? roundTo(vals.reduce((s, v) => s + v, 0) / vals.length, dec) : null
  }
  const curAvg = metrics.map((m, ci) => avgOver((cid) => lookups[ci].get(cid)?.latest, DEF_MAP.get(m.key)?.dec ?? 1))
  const cmpAvg = metrics.map((m) => {
    if (!cmpByKey) return null
    const lk = cmpByKey.get(m.key)
    if (!lk) return null
    return avgOver((cid) => lk.get(cid)?.latest, DEF_MAP.get(m.key)?.dec ?? 1)
  })
  const curTotalAvg = avgOver((cid) => scoreByClient.get(cid)?.total, 0)
  const cmpTotalAvg = cmpScoreByClient ? avgOver((cid) => cmpScoreByClient.get(cid)?.total, 0) : null

  const POS_OPTS: Array<{ key: 'ALL' | Pos; label: string }> = [
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
            <button
              key={o.key}
              onClick={() => setPosFilter(o.key)}
              className={cn('rounded-md border px-2.5 py-1 text-sm font-medium', posFilter === o.key ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {copy(locale, 'Profile avg', 'Snittprofil')}:{' '}
          <span className={cn('ml-1 inline-flex h-6 items-center rounded px-2 font-bold tabular-nums', curTotalAvg != null ? scoreColor(curTotalAvg) : 'bg-muted')}>{curTotalAvg ?? '–'}</span>
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
                <th
                  key={m.key}
                  onClick={() => setSel(m.key === sel ? null : m.key)}
                  className={cn('cursor-pointer whitespace-nowrap px-2 py-2 text-center align-bottom hover:bg-muted', m.key === sel && 'bg-blue-50')}
                  title={m.label}
                >
                  <div className="text-[11px] font-semibold">{m.short}</div>
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
                      <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', POS_BADGE[p.pos])}>{p.pos}</Badge>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={cn('inline-flex h-6 w-9 items-center justify-center rounded text-xs font-bold tabular-nums', ps?.total != null ? scoreColor(ps.total) : 'bg-muted text-muted-foreground')}>
                      {ps?.total ?? '·'}
                    </span>
                  </td>
                  {metrics.map((m, ci) => {
                    const a = lookups[ci].get(p.clientId)
                    const status: Status = a ? athleteStatus(a, m) : 'missing'
                    return (
                      <td
                        key={m.key}
                        onClick={() => setSel(m.key === sel ? null : m.key)}
                        className={cn('cursor-pointer px-2 py-1.5 text-center text-[12px] tabular-nums', cellBg(status))}
                      >
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
                <span className={cn('inline-flex h-6 w-9 items-center justify-center rounded text-xs font-bold tabular-nums', curTotalAvg != null ? scoreColor(curTotalAvg) : 'bg-muted text-muted-foreground')}>{curTotalAvg ?? '–'}</span>
              </td>
              {metrics.map((m, ci) => (
                <td key={m.key} className="px-2 py-2 text-center text-[12px] tabular-nums">{curAvg[ci] != null ? formatNumber(curAvg[ci] as number, locale, DEF_MAP.get(m.key)?.dec ?? 1) : '–'}</td>
              ))}
            </tr>
            {compare && (
              <tr className="bg-muted/20 text-xs">
                <td className="sticky left-0 z-10 bg-muted/40 px-3 py-1.5 text-left text-muted-foreground">Δ {copy(locale, 'vs', 'mot')} {compare.label}</td>
                <td className="px-2 py-1.5 text-center">
                  {curTotalAvg != null && cmpTotalAvg != null ? (
                    <span className={cn('font-semibold tabular-nums', curTotalAvg - cmpTotalAvg > 0 ? 'text-emerald-600' : curTotalAvg - cmpTotalAvg < 0 ? 'text-orange-600' : 'text-muted-foreground')}>
                      {signedNum(curTotalAvg - cmpTotalAvg, 0, locale)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </td>
                {metrics.map((m, ci) => {
                  const cur = curAvg[ci]
                  const cmp = cmpAvg[ci]
                  const dec = DEF_MAP.get(m.key)?.dec ?? 1
                  if (cur == null || cmp == null) return <td key={m.key} className="px-2 py-1.5 text-center text-muted-foreground">–</td>
                  const raw = roundTo(cur - cmp, dec)
                  const improvement = m.lowerIsBetter ? raw < 0 : raw > 0
                  return (
                    <td key={m.key} className={cn('px-2 py-1.5 text-center tabular-nums', raw === 0 ? 'text-muted-foreground' : improvement ? 'text-emerald-600' : 'text-orange-600')}>
                      {raw === 0 ? '0' : signedNum(raw, dec, locale)}
                    </td>
                  )
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

      {selMetric && (
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <TestBarCard metric={selMetric} membersTotal={membersTotal} locale={locale} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===========================================================================
// Page shell + view switcher + season controls
// ===========================================================================

const VIEWS = [
  { key: 'selector', label: 'Väljare', icon: LayoutList },
  { key: 'matrix', label: 'Matris', icon: Grid3x3 },
] as const

export default function TestLayoutsPrototypePage() {
  const locale: Locale = 'sv'
  const seasons = useMemo<Season[]>(
    () =>
      SEASON_DEFS.map((s, i) => {
        const groups = buildSeason(i * 1000, s.yearsAgo)
        return { label: s.label, groups, scores: computeScores(groups.flatMap((g) => g.metrics)) }
      }),
    []
  )
  const membersTotal = PLAYERS.length
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('selector')
  const [seasonIdx, setSeasonIdx] = useState(0)
  const [compareIdx, setCompareIdx] = useState<number | null>(null)

  const selected = seasons[seasonIdx]
  const effectiveCompareIdx = compareIdx != null && compareIdx !== seasonIdx ? compareIdx : null
  const compareSeason = effectiveCompareIdx != null ? seasons[effectiveCompareIdx] : null
  const totalTests = selected.groups.reduce((s, g) => s + g.metrics.length, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4" /> Adaptiva teststaplar — prototyp
        </div>
        <h1 className="text-2xl font-bold">Test-analys</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Mockdata: {membersTotal} spelare, {totalTests} test med data ({selected.label}).
          Endast test där minst en spelare har mätvärde visas (<code className="text-xs">coverage &gt; 0</code>).
          Totalpoängen är positionsjusterad (C/W/D/G).
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border bg-muted/20 px-4 py-3">
        <Seg label={copy(locale, 'Season', 'Säsong')} options={seasons.map((s, i) => ({ key: i, label: s.label }))} value={seasonIdx} onChange={setSeasonIdx} />
        <Seg
          label={copy(locale, 'Compare', 'Jämför')}
          options={[{ key: -1, label: copy(locale, 'Off', 'Av') }, ...seasons.map((s, i) => ({ key: i, label: s.label })).filter((o) => o.key !== seasonIdx)]}
          value={effectiveCompareIdx ?? -1}
          onChange={(v) => setCompareIdx(v === -1 ? null : v)}
        />
      </div>

      <ProfileSummary scores={selected.scores} compareScores={compareSeason?.scores ?? null} compareLabel={compareSeason?.label ?? null} locale={locale} />

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const Icon = v.icon
          const isActive = v.key === view
          return (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', isActive ? 'border-blue-600 bg-blue-600 text-white' : 'bg-background hover:bg-muted')}
            >
              <Icon className="h-4 w-4" /> {v.label}
            </button>
          )
        })}
      </div>

      {view === 'selector' && <ViewSelector groups={selected.groups} membersTotal={membersTotal} locale={locale} />}
      {view === 'matrix' && (
        <ViewMatrix
          groups={selected.groups}
          membersTotal={membersTotal}
          scores={selected.scores}
          seasonLabel={selected.label}
          compare={compareSeason ? { label: compareSeason.label, groups: compareSeason.groups, scores: compareSeason.scores } : null}
          locale={locale}
        />
      )}
    </div>
  )
}
