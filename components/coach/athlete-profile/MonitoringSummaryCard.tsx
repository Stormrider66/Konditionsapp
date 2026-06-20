'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, ChevronRight, Loader2, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/i18n/client'
import type { WorkoutEvaluationSummary, WorkoutFatigueSummary, WorkoutZoneSummary } from '@/lib/workout-evaluation'

interface EvaluationRow {
  id: string
  startedAt: string
  summary: WorkoutEvaluationSummary
  zoneSummary: WorkoutZoneSummary
  fatigueSummary: WorkoutFatigueSummary
  confidence: string
}

interface MonitoringSummaryCardProps {
  clientId: string
  href: string
}

function copy(locale: string, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function minutes(seconds?: number): number {
  return Math.round((seconds ?? 0) / 60)
}

function fatigueClass(level: WorkoutFatigueSummary['level']): string {
  if (level === 'VERY_HIGH') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
  if (level === 'HIGH') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200'
  if (level === 'MODERATE') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
}

function fatigueLabel(locale: string, level: WorkoutFatigueSummary['level']): string {
  if (level === 'VERY_HIGH') return copy(locale, 'Very high', 'Mycket hog')
  if (level === 'HIGH') return copy(locale, 'High', 'Hog')
  if (level === 'MODERATE') return copy(locale, 'Moderate', 'Mattan')
  return copy(locale, 'Low', 'Lag')
}

function formatDate(locale: string, value: string): string {
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function MonitoringSummaryCard({ clientId, href }: MonitoringSummaryCardProps) {
  const locale = useLocale()
  const [rows, setRows] = useState<EvaluationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setLoading(true)
      fetch(`/api/clients/${clientId}/workout-evaluations?days=7&limit=5`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json()
          if (!response.ok || !payload.success) throw new Error('failed')
          setRows(payload.data as EvaluationRow[])
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setRows([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 0)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [clientId])

  const latest = rows[0] ?? null
  const highIntensityMinutes = useMemo(
    () => rows.reduce((total, row) => total + minutes(row.zoneSummary.highIntensitySeconds), 0),
    [rows],
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-md dark:border-white/10 dark:bg-slate-900/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Activity className="h-4 w-4 text-blue-600" />
            {copy(locale, 'Monitoring', 'Monitoring')}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy(locale, 'Latest merged workout evaluation', 'Senaste sammanslagna passutvardering')}
          </p>
        </div>
        <Link href={href}>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : latest ? (
        <div className="mt-4 space-y-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{latest.summary.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(locale, latest.startedAt)} | {latest.confidence}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={fatigueClass(latest.fatigueSummary.level)}>
              {fatigueLabel(locale, latest.fatigueSummary.level)}
            </Badge>
            <Badge variant="outline" className="bg-white dark:bg-slate-950/40">
              <Zap className="mr-1 h-3.5 w-3.5" />
              {highIntensityMinutes} {copy(locale, 'Z4/Z5 min', 'Z4/Z5 min')}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-muted-foreground dark:border-white/10">
          {copy(locale, 'No evaluated workouts in the last 7 days.', 'Inga utvarderade pass senaste 7 dagarna.')}
        </div>
      )}
    </div>
  )
}
