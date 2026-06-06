'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Trophy } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'

interface HockeyTeamRankProps {
  clientId: string
  teamId: string
}

// Defensive subset of the (large) /api/teams/[id]/test-sessions payload — we
// only read this athlete's per-metric benchmarks, tolerating shape drift.
interface MetricMeta { key: string; label: string }
interface Benchmark {
  percentile?: number | null
  positionPercentile?: number | null
  positionRank?: number | null
  band?: string | null
}
interface RankInfo { rank?: number | null; percentile?: number | null }
interface AthleteRanks {
  id: string
  benchmarks?: Record<string, Benchmark | null>
  ranks?: Record<string, RankInfo | null>
}

interface MetricRow {
  key: string
  label: string
  percentile: number | null
  rank: number | null
  positionRank: number | null
  band: string | null
}

const BAND_DOT: Record<string, string> = {
  ELITE: 'bg-violet-500',
  ADVANCED: 'bg-emerald-500',
  INTERMEDIATE: 'bg-amber-500',
  DEVELOPING: 'bg-rose-500',
  BEGINNER: 'bg-rose-500',
}

export function HockeyTeamRank({ clientId, teamId }: HockeyTeamRankProps) {
  const t = useTranslations('coach.pages.clientDetail')

  const [rows, setRows] = useState<MetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const response = await fetch(`/api/teams/${teamId}/test-sessions`)
      const result = await response.json()
      const hockey = result?.data?.hockey
      const metrics: MetricMeta[] = Array.isArray(hockey?.metrics) ? hockey.metrics : []
      const athletes: AthleteRanks[] = Array.isArray(hockey?.athletes) ? hockey.athletes : []
      const athlete = athletes.find((a) => a.id === clientId)

      if (!result?.success || !athlete) {
        setRows([])
        return
      }

      const built: MetricRow[] = metrics
        .map((metric) => {
          const benchmark = athlete.benchmarks?.[metric.key] ?? null
          const rankInfo = athlete.ranks?.[metric.key] ?? null
          const percentile = benchmark?.percentile ?? rankInfo?.percentile ?? null
          if (percentile == null && rankInfo?.rank == null) return null
          return {
            key: metric.key,
            label: metric.label,
            percentile,
            rank: rankInfo?.rank ?? null,
            positionRank: benchmark?.positionRank ?? null,
            band: benchmark?.band ?? null,
          }
        })
        .filter((row): row is MetricRow => row != null)

      setRows(built)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [clientId, teamId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-indigo-500" />
        <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('hockeyTeamRank.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{t('hockeyTeamRank.description')}</p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          {t('hockeyTeamRank.loading')}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('hockeyTeamRank.error')}</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('hockeyTeamRank.empty')}</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 text-left font-medium">{t('hockeyTeamRank.metric')}</th>
                <th className="py-2 px-3 text-right font-medium">{t('hockeyTeamRank.teamPercentile')}</th>
                <th className="py-2 px-3 text-right font-medium">{t('hockeyTeamRank.rank')}</th>
                <th className="py-2 pl-3 text-right font-medium">{t('hockeyTeamRank.positionRank')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="py-2 pr-3 text-left">
                    <span className="inline-flex items-center gap-2">
                      {row.band && <span className={cn('h-2 w-2 rounded-full', BAND_DOT[row.band] ?? 'bg-slate-400')} />}
                      <span className="font-medium text-gray-900 dark:text-white">{row.label}</span>
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                    {row.percentile != null ? `P${Math.round(row.percentile)}` : '–'}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground">
                    {row.rank != null ? `#${row.rank}` : '–'}
                  </td>
                  <td className="py-2 pl-3 text-right text-muted-foreground">
                    {row.positionRank != null ? `#${row.positionRank}` : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
