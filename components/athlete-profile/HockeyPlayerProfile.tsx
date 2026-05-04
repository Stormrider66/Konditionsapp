'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Calendar,
  Gauge,
  Medal,
  Shield,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'
import { cn } from '@/lib/utils'

interface HockeyPlayerProfileProps {
  clientId: string
  clientName: string
  settings?: Record<string, unknown>
  basePath?: string
}

interface HockeyTestSummary {
  id: string
  testDate: string
  sourceType: string
  season: string
  ageAtTest: number | null
  developmentLevel: string
  teamName: string | null
  metrics: Record<string, number | null>
  qualityFlags: Array<{
    key: string
    severity: 'info' | 'warning'
    label: string
    detail: string
  }>
}

interface HockeyTrend {
  key: string
  delta: number
  percentChange: number | null
  direction: 'up' | 'down'
  isImprovement: boolean
}

interface HockeyBest {
  key: string
  value: number
  testDate: string
  testId: string
}

interface HockeySummaryResponse {
  latest: HockeyTestSummary | null
  previous: HockeyTestSummary | null
  bests: Record<string, HockeyBest | null>
  trends: HockeyTrend[]
  history: HockeyTestSummary[]
  pathway: {
    seasons: Array<{
      season: string
      level: string
      testCount: number
      firstDate: string
      lastDate: string
      ageRange: string | null
      teamNames: string[]
      endMetrics: Record<string, number | null>
      changes: Record<string, number | null>
    }>
    milestones: Array<{
      id: string
      date: string
      label: string
      detail: string
      tone: 'info' | 'positive'
    }>
    readiness: Array<{
      level: string
      score: number | null
      targetHits: number
      targetCount: number
      eliteHits: number
      primaryGap: {
        metricKey: string
        label: string
        value: number | null
        target: number
        elite: number
        gapToTarget: number
        unit: string
        lowerIsBetter: boolean
        status: 'missing' | 'below-target' | 'target' | 'elite'
      } | null
    }>
    nextLevel: {
      level: string
      score: number | null
      targetHits: number
      targetCount: number
      eliteHits: number
      primaryGap: {
        metricKey: string
        label: string
        value: number | null
        target: number
        gapToTarget: number
        unit: string
        lowerIsBetter: boolean
      } | null
    } | null
  }
  interpretations: Array<{
    id: string
    tone: 'priority' | 'watch' | 'maintain' | 'quality' | 'positive'
    title: string
    summary: string
    action: string
    evidence: string[]
  }>
  comparison: {
    teamId: string
    teamName: string
    athleteCount: number
    position: string
    positionLabel: string
    mode: 'TEAM_CONTEXT' | 'POSITION_CONTEXT' | 'FULL_RANKING'
    sensitiveMetricsVisible: boolean
    metrics: Array<{
      key: string
      label: string
      unit: string
      decimals: number
      lowerIsBetter: boolean
      value: number
      teamPercentile: number | null
      positionPercentile: number | null
      teamMedian: number | null
      positionMedian: number | null
      teamRank: number | null
      positionRank: number | null
      gapToTeamMedian: number | null
      gapToPositionMedian: number | null
      gapToLeader: number | null
      gapToLeaderMeters: number | null
      leaderValue: number | null
      coverage: number
      positionCoverage: number
      band: 'top' | 'above' | 'team' | 'watch' | 'priority'
    }>
  } | null
  playerVisibility: {
    comparisonMode: 'OWN_PROGRESS' | 'TEAM_CONTEXT' | 'POSITION_CONTEXT' | 'FULL_RANKING'
    sensitiveMetricsVisible: boolean
  }
  count: number
}

const POSITION_LABELS: Record<string, string> = {
  center: 'Center',
  wing: 'Forward',
  defense: 'Back',
  goalie: 'Målvakt',
}

const PHASE_LABELS: Record<string, string> = {
  off_season: 'Off-season',
  pre_season: 'Försäsong',
  in_season: 'Säsong',
  playoffs: 'Slutspel',
}

const METRICS = {
  muscleLabWkg: { label: 'MuscleLab', unit: 'W/kg', decimals: 1, lowerIsBetter: false },
  standingLongJump: { label: 'Längdhopp', unit: 'cm', decimals: 0, lowerIsBetter: false },
  threeJumpBest: { label: '3-steg', unit: 'cm', decimals: 0, lowerIsBetter: false },
  backSquat1RM: { label: 'Knäböj', unit: 'kg', decimals: 0, lowerIsBetter: false },
  backSquatRelative: { label: 'Knäböj', unit: 'xBW', decimals: 2, lowerIsBetter: false },
  powerClean1RM: { label: 'Power clean', unit: 'kg', decimals: 0, lowerIsBetter: false },
  benchPress1RM: { label: 'Bänkpress', unit: 'kg', decimals: 0, lowerIsBetter: false },
  gripMax: { label: 'Grepp', unit: 'kg', decimals: 0, lowerIsBetter: false },
  sprint10m: { label: '10m is', unit: 's', decimals: 2, lowerIsBetter: true },
  sprint30m: { label: '30m is', unit: 's', decimals: 2, lowerIsBetter: true },
  sprint0to10Kmh: { label: '0-10 fart', unit: 'km/h', decimals: 1, lowerIsBetter: false },
  sprint20to30Kmh: { label: '20-30 fart', unit: 'km/h', decimals: 1, lowerIsBetter: false },
  agilityBest: { label: '5-10-5', unit: 's', decimals: 2, lowerIsBetter: true },
  endurance7x40AverageKmh: { label: '7x40 snitt', unit: 'km/h', decimals: 1, lowerIsBetter: false },
  endurance7x40Resistance: { label: '7x40 resistance', unit: '%', decimals: 0, lowerIsBetter: false },
  enduranceFatigueDrop: { label: '7x40 drop', unit: '%', decimals: 1, lowerIsBetter: true },
  vo2max: { label: 'VO2max', unit: 'ml/kg/min', decimals: 1, lowerIsBetter: false },
  lt2SpeedKmh: { label: 'LT2 fart', unit: 'km/h', decimals: 1, lowerIsBetter: false },
  lt2HeartRate: { label: 'LT2 HR', unit: 'bpm', decimals: 0, lowerIsBetter: false },
  maxLactate: { label: 'Max laktat', unit: 'mmol/L', decimals: 1, lowerIsBetter: false },
  maxHeartRate: { label: 'Max HR', unit: 'bpm', decimals: 0, lowerIsBetter: false },
  rampDurationMin: { label: 'Ramp tid', unit: 'min', decimals: 1, lowerIsBetter: false },
} as const

const PILLARS = [
  {
    id: 'power',
    title: 'Explosivitet',
    description: 'Power, hopp och acceleration från underkroppen.',
    icon: Zap,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    metrics: ['muscleLabWkg', 'standingLongJump', 'threeJumpBest'],
  },
  {
    id: 'strength',
    title: 'Styrka',
    description: 'Basstyrka och robusthet för kampmoment.',
    icon: Medal,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
    metrics: ['backSquatRelative', 'powerClean1RM', 'benchPress1RM', 'gripMax'],
  },
  {
    id: 'ice-speed',
    title: 'Isfart',
    description: 'Acceleration, toppfart och riktningsförändring.',
    icon: Timer,
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
    metrics: ['sprint10m', 'sprint0to10Kmh', 'sprint20to30Kmh', 'agilityBest'],
  },
  {
    id: 'engine',
    title: 'Motor',
    description: 'VO2, tröskel och upprepad sprintförmåga.',
    icon: Gauge,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    metrics: ['vo2max', 'lt2SpeedKmh', 'endurance7x40AverageKmh', 'endurance7x40Resistance'],
  },
] as const

const CHART_METRICS = [
  { key: 'muscleLabWkg', label: 'Power W/kg', color: '#f97316' },
  { key: 'sprint10m', label: '10m', color: '#06b6d4' },
  { key: 'endurance7x40AverageKmh', label: '7x40 km/h', color: '#10b981' },
  { key: 'vo2max', label: 'VO2max', color: '#2563eb' },
] as const

type ChartMetricKey = (typeof CHART_METRICS)[number]['key']
type ChartPoint = {
  date: string
  fullDate: string
} & Record<ChartMetricKey, number | null>

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    month: 'short',
    year: '2-digit',
  })
}

function formatMetric(key: string, value: number | null | undefined): string {
  const metric = METRICS[key as keyof typeof METRICS]
  if (value == null || !metric) return '-'
  return `${value.toFixed(metric.decimals)}${metric.unit ? ` ${metric.unit}` : ''}`
}

function trendText(metricKey: string, trend: HockeyTrend | undefined): string | null {
  if (!trend) return null
  const metric = METRICS[metricKey as keyof typeof METRICS]
  if (!metric) return null
  const sign = trend.delta > 0 ? '+' : ''
  const percent = trend.percentChange == null ? '' : ` (${sign}${trend.percentChange.toFixed(1)}%)`
  return `${sign}${trend.delta.toFixed(metric.decimals)} ${metric.unit}${percent}`
}

function readinessGapText(gap: NonNullable<HockeySummaryResponse['pathway']['nextLevel']>['primaryGap']): string {
  if (!gap) return 'Alla tillgängliga mål är uppnådda.'
  if (gap.value == null) return `${gap.label} saknas för nästa nivå.`
  const action = gap.lowerIsBetter ? 'sänk' : 'höj'
  const decimals = gap.unit === 's' ? 2 : 1
  return `${action} ${gap.label.toLowerCase()} med ${Math.abs(gap.gapToTarget).toFixed(decimals)} ${gap.unit} för nästa mål.`
}

function interpretationClasses(tone: HockeySummaryResponse['interpretations'][number]['tone']): string {
  if (tone === 'priority') return 'border-red-500/30 bg-red-500/10'
  if (tone === 'quality' || tone === 'watch') return 'border-amber-500/30 bg-amber-500/10'
  if (tone === 'positive') return 'border-emerald-500/30 bg-emerald-500/10'
  return 'border-blue-500/30 bg-blue-500/10'
}

function comparisonBandLabel(band: NonNullable<HockeySummaryResponse['comparison']>['metrics'][number]['band']): string {
  if (band === 'top') return 'Toppnivå'
  if (band === 'above') return 'Över snitt'
  if (band === 'watch') return 'Följ upp'
  if (band === 'priority') return 'Prioritet'
  return 'Lagzon'
}

function comparisonBandClasses(band: NonNullable<HockeySummaryResponse['comparison']>['metrics'][number]['band']): string {
  if (band === 'top') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (band === 'above') return 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
  if (band === 'watch') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  if (band === 'priority') return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300'
}

function formatComparisonValue(value: number | null | undefined, unit: string, decimals: number): string {
  if (value == null) return '-'
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function formatSignedGap(value: number | null | undefined, unit: string, decimals: number): string {
  if (value == null) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`
}

function comparisonInsight(metric: NonNullable<HockeySummaryResponse['comparison']>['metrics'][number]): string {
  if (metric.teamRank != null) {
    const rankText = metric.positionRank != null
      ? `Rank ${metric.positionRank}/${metric.positionCoverage} i position`
      : `Rank ${metric.teamRank}/${metric.coverage} i laget`
    return `${rankText} · ${metric.teamPercentile == null ? 'percentil saknas' : `P${metric.teamPercentile.toFixed(0)} i laget`}`
  }

  const percentileValue = metric.positionPercentile ?? metric.teamPercentile
  const group = metric.positionPercentile != null ? 'positionen' : 'laget'
  const percentileText = percentileValue == null ? 'saknar percentil' : `P${percentileValue.toFixed(0)} i ${group}`
  const medianGap = metric.gapToPositionMedian ?? metric.gapToTeamMedian
  const medianText = medianGap == null
    ? 'median saknas'
    : medianGap >= 0
      ? `${formatSignedGap(medianGap, metric.unit, metric.decimals)} bättre än median`
      : `${formatSignedGap(Math.abs(medianGap), metric.unit, metric.decimals)} till median`
  return `${percentileText} · ${medianText}`
}

function comparisonModeDescription(comparison: NonNullable<HockeySummaryResponse['comparison']>): string {
  if (comparison.mode === 'FULL_RANKING') {
    return `Ranking och jämförelse mot ${comparison.teamName}.`
  }
  if (comparison.mode === 'TEAM_CONTEXT') {
    return `Mjuk jämförelse mot ${comparison.teamName}, utan positionsrankning.`
  }
  return `Mjuk jämförelse mot ${comparison.teamName} och ${comparison.positionLabel.toLowerCase()} utan offentlig ranking.`
}

function comparisonReferenceLabel(comparison: NonNullable<HockeySummaryResponse['comparison']>): string {
  if (comparison.mode === 'TEAM_CONTEXT') return 'Lagmedian'
  if (comparison.mode === 'FULL_RANKING') return 'Referens'
  return 'Positionsmedian'
}

function comparisonReferenceValue(
  comparison: NonNullable<HockeySummaryResponse['comparison']>,
  metric: NonNullable<HockeySummaryResponse['comparison']>['metrics'][number],
): number | null {
  if (comparison.mode === 'TEAM_CONTEXT') return metric.teamMedian
  return metric.positionMedian ?? metric.teamMedian
}

function comparisonProgressValue(
  comparison: NonNullable<HockeySummaryResponse['comparison']>,
  metric: NonNullable<HockeySummaryResponse['comparison']>['metrics'][number],
): number {
  if (comparison.mode === 'TEAM_CONTEXT') return metric.teamPercentile ?? 0
  return metric.positionPercentile ?? metric.teamPercentile ?? 0
}

function comparisonProgressLabel(comparison: NonNullable<HockeySummaryResponse['comparison']>): string {
  if (comparison.mode === 'TEAM_CONTEXT') return 'Lagpercentil'
  if (comparison.mode === 'FULL_RANKING') return 'Percentil'
  return 'Positionspercentil'
}

function comparisonLeaderLabel(comparison: NonNullable<HockeySummaryResponse['comparison']>): string {
  return comparison.mode === 'FULL_RANKING' ? 'Till ledare' : 'Utvecklingsgap'
}

export function HockeyPlayerProfile({ clientId, clientName, settings, basePath = '' }: HockeyPlayerProfileProps) {
  const [summary, setSummary] = useState<HockeySummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hockeySettings = settings as HockeySettings | undefined

  useEffect(() => {
    let cancelled = false

    async function loadSummary() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/clients/${clientId}/hockey-tests/summary`)
        if (!res.ok) return
        const body = await res.json()
        if (!cancelled && body.success) {
          setSummary(body.data)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadSummary()
    return () => {
      cancelled = true
    }
  }, [clientId])

  const trendByKey = useMemo(
    () => new Map(summary?.trends.map((trend) => [trend.key, trend]) ?? []),
    [summary?.trends],
  )

  const chartData = useMemo<ChartPoint[]>(() => (
    [...(summary?.history ?? [])]
      .reverse()
      .map((test) => ({
        date: formatShortDate(test.testDate),
        fullDate: formatDate(test.testDate),
        ...CHART_METRICS.reduce<Record<ChartMetricKey, number | null>>((acc, metric) => {
          acc[metric.key] = test.metrics[metric.key] ?? null
          return acc
        }, {
          muscleLabWkg: null,
          sprint10m: null,
          endurance7x40AverageKmh: null,
          vo2max: null,
        }),
      }))
  ), [summary?.history])

  if (!hockeySettings) {
    return (
      <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Shield className="h-5 w-5 text-blue-500" />
            Hockeyprofil
          </GlassCardTitle>
          <GlassCardDescription>Ingen hockeyprofil är kopplad ännu.</GlassCardDescription>
        </GlassCardHeader>
      </GlassCard>
    )
  }

  const latest = summary?.latest ?? null
  const latestMetrics = latest?.metrics ?? {}
  const nextLevel = summary?.pathway.nextLevel
  const latestReadiness = nextLevel?.score ?? summary?.pathway.readiness.find((level) => level.score != null)?.score ?? null

  return (
    <div className="space-y-6">
      <GlassCard className="overflow-hidden border-slate-200 shadow-sm dark:border-white/5 dark:shadow-xl dark:shadow-black/40">
        <GlassCardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-600 text-white">Hockeyprofil</Badge>
                <Badge variant="outline" className="border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5">
                  {POSITION_LABELS[hockeySettings.position] ?? hockeySettings.position}
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5">
                  {PHASE_LABELS[hockeySettings.seasonPhase] ?? hockeySettings.seasonPhase}
                </Badge>
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {hockeySettings.teamName || 'Hockey'} performance
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
                Samlad spelarvy för {clientName}: testresultat, utveckling och nästa fysiska fokus.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Senaste test</p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {latest ? formatDate(latest.testDate) : '-'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tester</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{summary?.count ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nivå</p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{latest?.developmentLevel ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Readiness</p>
                  <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">
                    {latestReadiness == null ? '-' : `${latestReadiness}%`}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/[0.03] lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nästa nivå</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    {nextLevel?.level ?? latest?.developmentLevel ?? 'Baseline'}
                  </h3>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(nextLevel?.score ?? 0, 100)}%` }}
                />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                {readinessGapText(nextLevel?.primaryGap ?? null)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="secondary">{nextLevel?.targetHits ?? 0}/{nextLevel?.targetCount ?? 0} mål</Badge>
                <Badge variant="outline">{nextLevel?.eliteHits ?? 0} elitträffar</Badge>
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {isLoading && (
        <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
          <GlassCardContent className="flex items-center gap-3 p-6 text-sm font-medium text-slate-500">
            <Activity className="h-4 w-4 animate-pulse" />
            Laddar hockeyresultat...
          </GlassCardContent>
        </GlassCard>
      )}

      {!isLoading && !latest && (
        <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
          <GlassCardContent className="p-8 text-center">
            <Shield className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">Inga hockeytester ännu</h3>
            <p className="mt-1 text-sm text-slate-500">När ett hockeybatteri sparas visas spelarprofil, historik och mål här.</p>
          </GlassCardContent>
        </GlassCard>
      )}

      {latest && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon
              const presentMetrics = pillar.metrics.filter((key) => latestMetrics[key] != null)
              return (
                <GlassCard key={pillar.id} className="border-slate-200 shadow-sm dark:border-white/5">
                  <GlassCardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <GlassCardTitle className="text-base font-black text-slate-900 dark:text-white">{pillar.title}</GlassCardTitle>
                        <GlassCardDescription className="mt-1 text-xs">{pillar.description}</GlassCardDescription>
                      </div>
                      <div className={cn('rounded-xl p-2', pillar.bg)}>
                        <Icon className={cn('h-5 w-5', pillar.color)} />
                      </div>
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent>
                    {presentMetrics.length === 0 ? (
                      <p className="text-sm text-slate-500">Saknar data i senaste testet.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {presentMetrics.map((key) => {
                          const metric = METRICS[key as keyof typeof METRICS]
                          const trend = trendByKey.get(key)
                          const TrendIcon = trend?.direction === 'up' ? ArrowUp : ArrowDown
                          const best = summary?.bests[key]
                          const isBest = best?.testId === latest.id
                          return (
                            <div key={key} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{metric.label}</p>
                                {isBest && <Medal className="h-3.5 w-3.5 text-amber-500" />}
                              </div>
                              <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                                {formatMetric(key, latestMetrics[key])}
                              </p>
                              {trend && (
                                <p className={cn(
                                  'mt-1 flex items-center gap-1 text-[11px] font-bold',
                                  trend.isImprovement ? 'text-emerald-600' : 'text-amber-600',
                                )}>
                                  <TrendIcon className="h-3 w-3" />
                                  {trendText(key, trend)}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </GlassCardContent>
                </GlassCard>
              )
            })}
          </div>

          {chartData.length > 1 && (
            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Utveckling över tid
                </GlassCardTitle>
                <GlassCardDescription>
                  Följ nyckelvärden genom J18, J20 och A-lag över flera säsonger.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ left: -14, right: 10, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={42} />
                      <Tooltip
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                        formatter={(value, name) => [
                          typeof value === 'number' ? value.toFixed(1) : '-',
                          name,
                        ]}
                      />
                      {CHART_METRICS.map((metric) => (
                        chartData.some((point) => point[metric.key] != null) && (
                          <Line
                            key={metric.key}
                            type="monotone"
                            dataKey={metric.key}
                            name={metric.label}
                            stroke={metric.color}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        )
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}

          {summary?.comparison && summary.comparison.metrics.length > 0 && (
            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Lagkontext
                </GlassCardTitle>
                <GlassCardDescription>{comparisonModeDescription(summary.comparison)}</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {summary.comparison.metrics.slice(0, 9).map((metric) => {
                    const referenceValue = comparisonReferenceValue(summary.comparison!, metric)
                    const progressValue = comparisonProgressValue(summary.comparison!, metric)
                    return (
                      <div key={metric.key} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{metric.label}</p>
                            <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                              {formatComparisonValue(metric.value, metric.unit, metric.decimals)}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn('shrink-0 text-[10px]', comparisonBandClasses(metric.band))}>
                            {comparisonBandLabel(metric.band)}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {comparisonInsight(metric)}
                        </p>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            <span>{comparisonProgressLabel(summary.comparison!)}</span>
                            <span>{progressValue > 0 ? `P${progressValue.toFixed(0)}` : '-'}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${Math.min(progressValue, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <p className="font-black uppercase tracking-widest text-slate-500">{comparisonReferenceLabel(summary.comparison!)}</p>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">
                              {formatComparisonValue(referenceValue, metric.unit, metric.decimals)}
                            </p>
                          </div>
                          <div>
                            <p className="font-black uppercase tracking-widest text-slate-500">{comparisonLeaderLabel(summary.comparison!)}</p>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">
                              {metric.gapToLeaderMeters != null
                                ? `${metric.gapToLeaderMeters.toFixed(2)} m`
                                : formatComparisonValue(metric.gapToLeader, metric.unit, metric.decimals)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] font-medium text-slate-500">
                          Underlag: {metric.coverage} spelare{summary.comparison!.mode !== 'TEAM_CONTEXT' && metric.positionCoverage >= 2 ? ` · ${metric.positionCoverage} i position` : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </GlassCardContent>
            </GlassCard>
          )}

          {!summary?.comparison && summary?.playerVisibility.comparisonMode === 'OWN_PROGRESS' && (
            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Egen utveckling
                </GlassCardTitle>
                <GlassCardDescription>
                  Den här spelarvyn är inställd för att fokusera på personliga tester, trender och nästa steg.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Synligt</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Historik och personbästan</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fokus</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Nästa fysiska steg</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dolt</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Lag- och positionsranking</p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5 lg:col-span-2">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                  <Target className="h-5 w-5 text-emerald-500" />
                  Nästa fokus
                </GlassCardTitle>
                <GlassCardDescription>Kort tolkning från senaste testet och trenden.</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {(summary?.interpretations ?? []).slice(0, 4).map((item) => (
                    <div key={item.id} className={cn('rounded-xl border p-3', interpretationClasses(item.tone))}>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{item.summary}</p>
                      <p className="mt-2 text-xs font-black text-slate-900 dark:text-white">{item.action}</p>
                    </div>
                  ))}
                  {(summary?.interpretations ?? []).length === 0 && (
                    <p className="text-sm text-slate-500">Mer data behövs för automatisk tolkning.</p>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Säsonger
                </GlassCardTitle>
                <GlassCardDescription>År för år.</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-2">
                {(summary?.pathway.seasons ?? []).slice(-4).reverse().map((season) => (
                  <div key={season.season} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{season.season}</p>
                        <p className="text-xs text-slate-500">{season.teamNames[0] ?? season.level}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{season.testCount} test</Badge>
                    </div>
                  </div>
                ))}
                {(summary?.pathway.seasons ?? []).length === 0 && (
                  <p className="text-sm text-slate-500">Ingen säsongshistorik ännu.</p>
                )}
              </GlassCardContent>
            </GlassCard>
          </div>

          <GlassCard className="border-slate-200 shadow-sm dark:border-white/5">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg font-black text-slate-900 dark:text-white">Senaste hockeytester</GlassCardTitle>
              <GlassCardDescription>Snabb historik för spelarens egna resultat.</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
                {(summary?.history ?? []).slice(0, 6).map((test) => (
                  <div key={test.id} className="grid grid-cols-2 gap-3 border-b border-slate-100 p-3 text-sm last:border-b-0 dark:border-white/5 md:grid-cols-5">
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{formatDate(test.testDate)}</p>
                      <p className="text-xs text-slate-500">{test.teamName ?? test.developmentLevel}</p>
                    </div>
                    <MetricListItem label="Power" value={formatMetric('muscleLabWkg', test.metrics.muscleLabWkg)} />
                    <MetricListItem label="10m" value={formatMetric('sprint10m', test.metrics.sprint10m)} />
                    <MetricListItem label="7x40" value={formatMetric('endurance7x40AverageKmh', test.metrics.endurance7x40AverageKmh)} />
                    <MetricListItem label="VO2" value={formatMetric('vo2max', test.metrics.vo2max)} />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`${basePath}/athlete/tests`}>Visa hela testarkivet</Link>
                </Button>
              </div>
            </GlassCardContent>
          </GlassCard>
        </>
      )}
    </div>
  )
}

function MetricListItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="font-mono text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
