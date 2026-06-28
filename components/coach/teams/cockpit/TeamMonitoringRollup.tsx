'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { Activity, AlertTriangle, HeartPulse, Loader2, TrendingUp, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { roleSurfaceClass } from '@/components/layouts/role-shell/RolePage'
import { cn } from '@/lib/utils'
import type { Locale } from './TeamSchedulePane'

interface TeamMonitoringPlayer {
  id: string
  name: string
  jerseyNumber: number | null
  position: string | null
  readinessScore: number | null
  sleepHours: number | null
  hrvRMSSD: number | null
  restingHR: number | null
  stress: number | null
  weeklyLoad: number
  highIntensityMinutes: number
  loadSpike: boolean
  fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | null
  fatigueScore: number | null
  latestWorkout: {
    id: string
    startedAt: string
    z4z5Minutes: number
    avgRecoveryHrDrop: number | null
    powerDropPct: number | null
    paceDropPct: number | null
    complianceScore: number | null
  } | null
}

interface TeamMonitoringPayload {
  summary: {
    readinessAverage: number | null
    fatigueFlags: number
    loadSpikes: number
    highIntensityMinutes: number
  }
  needsAttention: TeamMonitoringPlayer[]
  players: TeamMonitoringPlayer[]
}

interface TeamMonitoringRollupProps {
  teamId: string
  businessSlug: string
  locale: Locale
}

type IntervalSortMode = 'z45' | 'recovery' | 'drop' | 'compliance' | 'fatigue'

function copy(locale: Locale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

function fatigueClass(level: TeamMonitoringPlayer['fatigueLevel']) {
  if (level === 'VERY_HIGH') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
  if (level === 'HIGH') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200'
  if (level === 'MODERATE') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
}

function fatigueLabel(locale: Locale, level: TeamMonitoringPlayer['fatigueLevel']) {
  if (!level) return '-'
  if (level === 'VERY_HIGH') return copy(locale, 'Mycket hog', 'Very high')
  if (level === 'HIGH') return copy(locale, 'Hog', 'High')
  if (level === 'MODERATE') return copy(locale, 'Mattan', 'Moderate')
  return copy(locale, 'Lag', 'Low')
}

function metric(value: number | null | undefined, suffix = '') {
  if (value === null || value === undefined) return '-'
  return `${Math.round(value)}${suffix}`
}

function dropValue(player: TeamMonitoringPlayer): number | null {
  return player.latestWorkout?.powerDropPct ?? player.latestWorkout?.paceDropPct ?? null
}

export function TeamMonitoringRollup({ teamId, businessSlug, locale }: TeamMonitoringRollupProps) {
  const [data, setData] = useState<TeamMonitoringPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sortMode, setSortMode] = useState<IntervalSortMode>('fatigue')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const response = await fetch(`/api/coach/teams/${teamId}/monitoring?days=7`, {
          headers: { 'x-business-slug': businessSlug },
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error('failed')
        setData(payload.data as TeamMonitoringPayload)
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return
        setError(true)
        setData(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [businessSlug, teamId])

  const intervalComparison = useMemo(() => {
    return (data?.players ?? [])
      .filter((player) => player.latestWorkout)
      .sort((a, b) => {
        if (sortMode === 'z45') return (b.latestWorkout?.z4z5Minutes ?? 0) - (a.latestWorkout?.z4z5Minutes ?? 0)
        if (sortMode === 'recovery') return (a.latestWorkout?.avgRecoveryHrDrop ?? 999) - (b.latestWorkout?.avgRecoveryHrDrop ?? 999)
        if (sortMode === 'drop') return (dropValue(b) ?? -999) - (dropValue(a) ?? -999)
        if (sortMode === 'compliance') return (a.latestWorkout?.complianceScore ?? 999) - (b.latestWorkout?.complianceScore ?? 999)
        return (b.fatigueScore ?? 0) - (a.fatigueScore ?? 0)
      })
      .slice(0, 12)
  }, [data?.players, sortMode])

  return (
    <div className={roleSurfaceClass('mb-4 p-4')}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Activity className="h-4 w-4 text-blue-600" />
            {copy(locale, 'Lagmonitoring', 'Team monitoring')}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy(locale, 'Readiness, load, hogintensiv tid och senaste passutvardering.', 'Readiness, load, high-intensity time and latest workout evaluation.')}
          </p>
        </div>
        <Link href={`/${businessSlug}/coach/teams/${teamId}/analysis`}>
          <Button variant="outline" size="sm">
            <TrendingUp className="mr-2 h-4 w-4" />
            {copy(locale, 'Analys', 'Analysis')}
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {copy(locale, 'Kunde inte lasa lagmonitoring.', 'Could not load team monitoring.')}
        </div>
      )}

      {!loading && data && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <RollupMetric icon={HeartPulse} label={copy(locale, 'Readiness snitt', 'Readiness avg')} value={metric(data.summary.readinessAverage)} />
              <RollupMetric icon={Zap} label={copy(locale, 'Hogintensiva min', 'High-intensity min')} value={metric(data.summary.highIntensityMinutes)} />
              <RollupMetric icon={AlertTriangle} label={copy(locale, 'Trotthetsflaggor', 'Fatigue flags')} value={metric(data.summary.fatigueFlags)} />
              <RollupMetric icon={TrendingUp} label={copy(locale, 'Load spikes', 'Load spikes')} value={metric(data.summary.loadSpikes)} />
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-white/10">
              <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground dark:border-white/10">
                {copy(locale, 'Behover uppmarksamhet', 'Needs attention')}
              </div>
              <div className="divide-y divide-gray-200 dark:divide-white/10">
                {data.needsAttention.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    {copy(locale, 'Inga tydliga avvikare just nu.', 'No clear outliers right now.')}
                  </div>
                ) : data.needsAttention.slice(0, 5).map((player) => (
                  <Link
                    key={player.id}
                    href={`/${businessSlug}/coach/clients/${player.id}?tab=monitoring`}
                    className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{player.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {copy(locale, 'Readiness', 'Readiness')} {metric(player.readinessScore)} | {copy(locale, 'Load', 'Load')} {metric(player.weeklyLoad)}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0', fatigueClass(player.fatigueLevel))}>
                      {fatigueLabel(locale, player.fatigueLevel)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-white/10">
            <div className="border-b px-3 py-2 dark:border-white/10">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {copy(locale, 'Intervalljamforelse', 'Interval comparison')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ['fatigue', copy(locale, 'Fatigue', 'Fatigue')],
                    ['z45', 'Z4/Z5'],
                    ['recovery', copy(locale, 'Recovery', 'Recovery')],
                    ['drop', copy(locale, 'Drop-off', 'Drop-off')],
                    ['compliance', copy(locale, 'Compliance', 'Compliance')],
                  ] as Array<[IntervalSortMode, string]>).map(([mode, label]) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={sortMode === mode ? 'default' : 'outline'}
                      className="h-7 px-2 text-xs"
                      onClick={() => setSortMode(mode)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(130px,1fr)_repeat(5,minmax(64px,0.55fr))] gap-2 border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground dark:border-white/10">
              <span>{copy(locale, 'Spelare', 'Player')}</span>
              <span>Z4/Z5</span>
              <span>{copy(locale, 'Recovery', 'Recovery')}</span>
              <span>{copy(locale, 'Drop', 'Drop')}</span>
              <span>{copy(locale, 'Score', 'Score')}</span>
              <span>{copy(locale, 'Fatigue', 'Fatigue')}</span>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {intervalComparison.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  {copy(locale, 'Inga utvarderade intervallpass an.', 'No evaluated interval sessions yet.')}
                </div>
              ) : intervalComparison.map((player) => {
                const workout = player.latestWorkout
                return (
                  <Link
                    key={player.id}
                    href={`/${businessSlug}/coach/clients/${player.id}?tab=monitoring`}
                    className="grid grid-cols-[minmax(130px,1fr)_repeat(5,minmax(64px,0.55fr))] gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <span className="truncate font-medium text-gray-900 dark:text-white">{player.name}</span>
                    <span>{metric(workout?.z4z5Minutes, 'm')}</span>
                    <span>{metric(workout?.avgRecoveryHrDrop)}</span>
                    <span>{dropValue(player) !== null ? `${Math.round(dropValue(player) ?? 0)}%` : '-'}</span>
                    <span>{metric(workout?.complianceScore)}</span>
                    <span>{metric(player.fatigueScore)}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RollupMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
