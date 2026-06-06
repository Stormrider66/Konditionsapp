'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, BarChart3 } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import type { WeeklyStat, TrainingStatsTotals } from '@/lib/coach/training-stats'

interface TrainingStatsProps {
  clientId: string
  weeks?: number
}

export function TrainingStats({ clientId, weeks = 12 }: TrainingStatsProps) {
  const t = useTranslations('coach.pages.clientDetail')

  const [data, setData] = useState<WeeklyStat[]>([])
  const [totals, setTotals] = useState<TrainingStatsTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const response = await fetch(`/api/clients/${clientId}/training-stats?weeks=${weeks}`)
      const result = await response.json()
      if (result.success) {
        setData(result.data ?? [])
        setTotals(result.totals ?? null)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [clientId, weeks])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  const easy = data.reduce((s, w) => s + w.easyMin, 0)
  const moderate = data.reduce((s, w) => s + w.moderateMin, 0)
  const hard = data.reduce((s, w) => s + w.hardMin, 0)
  const intensityTotal = easy + moderate + hard
  const pct = (value: number) => (intensityTotal > 0 ? Math.round((value / intensityTotal) * 100) : 0)

  const maxTss = Math.max(1, ...data.map((w) => w.tss))

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-blue-500" />
        <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('trainingStats.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{t('trainingStats.description', { weeks })}</p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          {t('trainingStats.loading')}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('trainingStats.error')}</div>
      ) : !totals || data.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('trainingStats.empty')}</div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi label={t('trainingStats.kpi.tss')} value={Math.round(totals.tss).toLocaleString()} />
            <Kpi label={t('trainingStats.kpi.distance')} value={`${Math.round(totals.distanceKm)} km`} />
            <Kpi label={t('trainingStats.kpi.duration')} value={`${Math.round(totals.durationMin / 60)} h`} />
            <Kpi label={t('trainingStats.kpi.sessions')} value={String(totals.sessions)} />
            <Kpi
              label={t('trainingStats.kpi.compliance')}
              value={totals.avgCompliance != null ? `${Math.round(totals.avgCompliance)}%` : '–'}
            />
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{t('trainingStats.weeklyLoad')}</p>
            <div className="flex items-end gap-1 h-24">
              {data.map((w) => (
                <div
                  key={w.weekStart}
                  className="flex-1 rounded-t bg-blue-500/70 dark:bg-blue-400/60 min-h-[2px]"
                  style={{ height: `${Math.max(2, (w.tss / maxTss) * 100)}%` }}
                  title={`${Math.round(w.tss)} TSS`}
                />
              ))}
            </div>
          </div>

          {intensityTotal > 0 && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{t('trainingStats.intensity')}</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                <div className="bg-emerald-500" style={{ width: `${pct(easy)}%` }} />
                <div className="bg-amber-500" style={{ width: `${pct(moderate)}%` }} />
                <div className="bg-rose-500" style={{ width: `${pct(hard)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <LegendDot className="bg-emerald-500" label={`${t('trainingStats.intensityEasy')} ${pct(easy)}%`} />
                <LegendDot className="bg-amber-500" label={`${t('trainingStats.intensityModerate')} ${pct(moderate)}%`} />
                <LegendDot className="bg-rose-500" label={`${t('trainingStats.intensityHard')} ${pct(hard)}%`} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', className)} />
      {label}
    </span>
  )
}
