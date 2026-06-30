'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, ClipboardCheck } from 'lucide-react'
import { useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import type { WeeklyStat, TrainingStatsTotals } from '@/lib/coach/training-stats'

interface PlanComplianceProps {
  clientId: string
  weeks?: number
}

function barColor(compliance: number | null): string {
  if (compliance == null) return 'bg-gray-200 dark:bg-white/10'
  if (compliance >= 90) return 'bg-emerald-500'
  if (compliance >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

export function PlanCompliance({ clientId, weeks = 8 }: PlanComplianceProps) {
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

  const hasPlanned = data.some((w) => (w.planned ?? 0) > 0)

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-emerald-500" />
        <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('planCompliance.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{t('planCompliance.description', { weeks })}</p>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          {t('planCompliance.loading')}
        </div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t('planCompliance.error')}</div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t('planCompliance.empty')}</div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planCompliance.avgCompliance')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {hasPlanned && totals?.avgCompliance != null ? `${Math.round(totals.avgCompliance)}%` : '–'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planCompliance.completedSessions')}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totals?.sessions ?? 0}</p>
            </div>
          </div>

          {hasPlanned ? (
            <div className="mt-4">
              <div className="flex items-end gap-1.5 h-20">
                {data.map((w) => (
                  <div
                    key={w.weekStart}
                    className="flex-1 flex flex-col justify-end"
                    title={`${w.sessions}/${w.planned ?? 0}`}
                  >
                    <div
                      className={cn('rounded-t min-h-[2px]', barColor(w.compliance))}
                      style={{ height: `${Math.min(100, Math.max(2, w.compliance ?? 0))}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t('planCompliance.barCaption')}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('planCompliance.noPlanned')}</p>
          )}
        </>
      )}
    </div>
  )
}
