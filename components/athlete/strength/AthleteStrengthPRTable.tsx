'use client'

/**
 * AthleteStrengthPRTable
 *
 * Read-only variant of the coach-side StrengthPRTable for athletes
 * viewing their own PR history outside a workout. Closes the gap
 * where the % of 1RM workout system depends on data the athlete
 * couldn't actually see.
 *
 * Differences from the coach version:
 *  - Fetches /api/athlete/one-rep-maxes (session-scoped) instead of
 *    /api/clients/[id]/one-rep-maxes
 *  - No Lägg till PR / Importera flera buttons
 *  - No pencil / trash icons on history rows — coach owns
 *    confirmations and edits
 *  - Auto-detected ESTIMATED entries get a "väntar på bekräftelse"
 *    badge so the athlete knows the value isn't final yet
 */

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronRight, Trophy, Info } from 'lucide-react'
import { PR_UNIT_LABELS, isPrUnit, type PrUnit } from '@/lib/strength/units'
import { useLocale, useTranslations } from '@/i18n/client'

interface OneRepMaxEntry {
  id: string
  date: string
  oneRepMax: number
  source: string
  unit: string
  bodyWeight: number | null
  notes: string | null
}

interface OneRepMaxGroup {
  exerciseId: string
  exerciseName: string
  exerciseNameSv: string | null
  category: string
  current: OneRepMaxEntry
  history: OneRepMaxEntry[]
}

const SOURCE_META: Record<
  string,
  { labelKey: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  TESTED: { labelKey: 'sources.tested', variant: 'default' },
  CALCULATED: { labelKey: 'sources.calculated', variant: 'secondary' },
  ESTIMATED: { labelKey: 'sources.estimated', variant: 'outline' },
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function AthleteStrengthPRTable() {
  const t = useTranslations('components.athleteStrengthPrTable')
  const locale = useLocale()
  const [groups, setGroups] = useState<OneRepMaxGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/athlete/one-rep-maxes')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (!cancelled && body.success) setGroups(body.data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('errors.fetchFailed'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [t])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="text-sm text-destructive py-4">{error}</div>
  }

  if (groups.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-6 text-center text-muted-foreground space-y-2">
        <Trophy className="h-10 w-10 mx-auto opacity-30" />
        <p className="text-sm">{t('emptyTitle')}</p>
        <p className="text-xs">
          {t('emptyDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {t('title')}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t('description')}
        </p>
      </div>

      <div className="rounded-md border divide-y">
        {groups.map((g) => {
          const isOpen = expanded.has(g.exerciseId)
          const sourceMeta = SOURCE_META[g.current.source] ?? {
            labelKey: '',
            variant: 'outline' as const,
          }
          const displayName = locale === 'sv'
            ? g.exerciseNameSv || g.exerciseName
            : g.exerciseName || g.exerciseNameSv
          const unit = isPrUnit(g.current.unit) ? g.current.unit : ('KG' as PrUnit)

          return (
            <div key={g.exerciseId}>
              <button
                type="button"
                onClick={() => toggle(g.exerciseId)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{displayName}</span>
                    <Badge variant={sourceMeta.variant} className="text-[10px] py-0">
                      {sourceMeta.labelKey ? t(sourceMeta.labelKey) : g.current.source}
                    </Badge>
                    {g.current.source === 'ESTIMATED' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 text-orange-600 border-orange-300"
                      >
                        {t('pendingConfirmation')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(g.current.date, locale)}
                    {g.history.length > 1 && ` · ${t('measurementCount', { count: g.history.length })}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold tabular-nums">
                    {g.current.oneRepMax}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      {PR_UNIT_LABELS[unit]}
                    </span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="bg-muted/20 px-3 py-2 space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('history')}
                  </p>
                  {g.history.map((h, idx) => {
                    const prev = g.history[idx + 1]
                    const delta = prev ? h.oneRepMax - prev.oneRepMax : null
                    const meta = SOURCE_META[h.source] ?? {
                      labelKey: '',
                      variant: 'outline' as const,
                    }
                    const hUnit = isPrUnit(h.unit) ? h.unit : ('KG' as PrUnit)
                    return (
                      <div key={h.id} className="flex items-center gap-2 text-xs">
                        <span className="w-24 text-muted-foreground tabular-nums">
                          {formatDate(h.date, locale)}
                        </span>
                        <Badge variant={meta.variant} className="text-[10px] py-0 shrink-0">
                          {meta.labelKey ? t(meta.labelKey) : h.source}
                        </Badge>
                        <span className="font-mono ml-auto">
                          {h.oneRepMax} {PR_UNIT_LABELS[hUnit]}
                        </span>
                        {delta != null && delta !== 0 ? (
                          <span
                            className={`text-[10px] tabular-nums w-10 text-right ${
                              delta > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {delta > 0 ? '+' : ''}
                            {delta}
                          </span>
                        ) : (
                          <span className="w-10" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          {t('estimatedInfo')}
        </span>
      </div>
    </div>
  )
}
