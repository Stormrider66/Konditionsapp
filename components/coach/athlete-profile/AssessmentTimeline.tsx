'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Loader2, Users, User } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import {
  type AssessmentEntry,
  type AssessmentCounts,
  type AssessmentKind,
  ASSESSMENT_COUNT_KEY,
} from '@/lib/coach/assessment-feed'

interface AssessmentTimelineProps {
  clientId: string
  basePath: string
}

type Filter = AssessmentKind | 'ALL'

const FILTER_ORDER: AssessmentKind[] = ['ENDURANCE', 'HOCKEY_PHYSICAL', 'SPORT_TEST', 'ERGOMETER', 'CUSTOM']

const KIND_BADGE: Record<AssessmentKind, string> = {
  ENDURANCE: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
  HOCKEY_PHYSICAL: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200',
  SPORT_TEST: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  ERGOMETER: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  CUSTOM: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200',
}

export function AssessmentTimeline({ clientId, basePath }: AssessmentTimelineProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()
  const dateFnsLocale = locale === 'sv' ? sv : enUS

  const [entries, setEntries] = useState<AssessmentEntry[]>([])
  const [counts, setCounts] = useState<AssessmentCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<Filter>('ALL')

  const kindLabel = useCallback((kind: AssessmentKind): string => {
    switch (kind) {
      case 'ENDURANCE': return t('assessmentTimeline.filters.endurance')
      case 'HOCKEY_PHYSICAL': return t('assessmentTimeline.filters.hockey')
      case 'SPORT_TEST': return t('assessmentTimeline.filters.sport')
      case 'ERGOMETER': return t('assessmentTimeline.filters.ergometer')
      case 'CUSTOM': return t('assessmentTimeline.filters.custom')
    }
  }, [t])

  const fetchEntries = useCallback(async (activeFilter: Filter) => {
    try {
      setLoading(true)
      setError(false)
      const query = activeFilter === 'ALL' ? '' : `?kind=${activeFilter}`
      const response = await fetch(`/api/clients/${clientId}/assessments${query}`)
      const result = await response.json()
      if (result.success) {
        setEntries(result.data ?? [])
        setCounts(result.counts ?? null)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchEntries(filter)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchEntries, filter])

  const availableKinds = FILTER_ORDER.filter((kind) => (counts?.[ASSESSMENT_COUNT_KEY[kind]] ?? 0) > 0)

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('assessmentTimeline.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('assessmentTimeline.description')}</p>
        </div>
        {counts != null && (
          <span className="text-xs font-medium text-muted-foreground">
            {t('assessmentTimeline.totalCount', { count: counts.total })}
          </span>
        )}
      </div>

      {availableKinds.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            label={t('assessmentTimeline.filters.all')}
            count={counts?.total ?? 0}
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
          />
          {availableKinds.map((kind) => (
            <FilterChip
              key={kind}
              label={kindLabel(kind)}
              count={counts?.[ASSESSMENT_COUNT_KEY[kind]] ?? 0}
              active={filter === kind}
              onClick={() => setFilter(kind)}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            {t('assessmentTimeline.loading')}
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t('assessmentTimeline.error')}</div>
        ) : entries.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t('assessmentTimeline.empty')}</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5">
            {entries.map((entry) => (
              <li key={`${entry.kind}-${entry.id}`} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', KIND_BADGE[entry.kind])}>
                      {kindLabel(entry.kind)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{entry.label}</span>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                      title={entry.isTeamTest ? t('assessmentTimeline.team') : t('assessmentTimeline.individual')}
                    >
                      {entry.isTeamTest ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {entry.isTeamTest ? t('assessmentTimeline.team') : t('assessmentTimeline.individual')}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{format(new Date(entry.date), 'PPP', { locale: dateFnsLocale })}</span>
                    {entry.summary && <span className="truncate">· {entry.summary}</span>}
                  </div>
                </div>
                {entry.kind === 'ENDURANCE' && (
                  <Link
                    href={`${basePath}/tests/${entry.id}`}
                    className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {t('assessmentTimeline.view')}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition',
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5',
      )}
    >
      {label}
      <span className={cn('ml-1.5', active ? 'text-blue-100' : 'text-muted-foreground')}>{count}</span>
    </button>
  )
}
