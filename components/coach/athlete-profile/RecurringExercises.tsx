'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Dumbbell } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import type { ExerciseFrequencyEntry } from '@/lib/coach/exercise-frequency'

interface RecurringExercisesProps {
  clientId: string
  limit?: number
}

const STATUS_BADGE: Record<string, string> = {
  ON_TRACK: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  PLATEAU: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  REGRESSING: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  DELOAD_NEEDED: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
}

export function RecurringExercises({ clientId, limit = 6 }: RecurringExercisesProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()

  const [data, setData] = useState<ExerciseFrequencyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const response = await fetch(`/api/clients/${clientId}/exercise-frequency?limit=${limit}`)
      const result = await response.json()
      if (result.success) {
        setData(result.data ?? [])
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [clientId, limit])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  const displayName = (entry: ExerciseFrequencyEntry): string => {
    if (locale === 'sv') return entry.nameSv || entry.name
    return entry.nameEn || entry.name
  }

  const statusLabel = (status: string | null): string | null => {
    if (!status) return null
    return t(`recurringExercises.status.${status}`)
  }

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-violet-500" />
        <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('recurringExercises.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{t('recurringExercises.description')}</p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          {t('recurringExercises.loading')}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('recurringExercises.error')}</div>
      ) : data.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('recurringExercises.empty')}</div>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 dark:divide-white/5">
          {data.map((entry) => {
            const label = statusLabel(entry.status)
            return (
              <li key={entry.exerciseId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName(entry)}</p>
                  <p className="text-xs text-muted-foreground">{t('recurringExercises.sessions', { count: entry.sessions })}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {entry.current1RM != null && (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.current1RM.toFixed(0)} kg
                    </span>
                  )}
                  {label && entry.status && (
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', STATUS_BADGE[entry.status] ?? STATUS_BADGE.ON_TRACK)}>
                      {label}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
