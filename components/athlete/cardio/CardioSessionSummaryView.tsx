'use client'

/**
 * CardioSessionSummaryView — post-workout summary for a cardio assignment.
 *
 * Full-screen overlay rendering what /api/cardio-sessions/[id]/summary
 * assembles: round splits, round fade, per-machine comparison and calorie
 * adherence. Shown right after focus-mode completion and from the history tab
 * (and reused by the coach results dialog). HR columns render only when HR
 * data exists (populated by the Garmin merge).
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Clock,
  Flame,
  Gauge,
  Heart,
  Loader2,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import { EQUIPMENT_OPTIONS, equipmentLabel } from '@/components/coach/cardio/cardio-session-model'
import type {
  CardioSessionSummaryData,
  RoundSummary,
  SummaryWindow,
} from '@/lib/cardio/session-summary'

type SummaryResponse = CardioSessionSummaryData & {
  athlete: { id: string; name: string }
  assignment: { id: string; assignedDate: string; status: string }
}

function fmtClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.round(totalSeconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function machineLabel(value: string | null, locale: 'en' | 'sv'): string {
  if (!value) return '—'
  const option = EQUIPMENT_OPTIONS.find((o) => o.value === value)
  return option ? equipmentLabel(option, locale) : value
}

/** Distinct equipment keys in first-appearance order across the work windows. */
function equipmentColumns(windows: SummaryWindow[]): Array<string | null> {
  const seen: Array<string | null> = []
  for (const w of windows) {
    if (!seen.includes(w.equipment)) seen.push(w.equipment)
  }
  return seen
}

function windowScoreText(w: SummaryWindow): string {
  if (w.skipped) return '–'
  if (w.scoreKind === 'time') {
    return w.actualDuration != null ? fmtClock(w.actualDuration) : '–'
  }
  return w.actualCalories != null ? `${w.actualCalories}` : '–'
}

interface CardioSessionSummaryViewProps {
  assignmentId: string
  onClose: () => void
  /** Shown above the session name in the coach context. */
  showAthleteName?: boolean
}

export function CardioSessionSummaryView({
  assignmentId,
  onClose,
  showAthleteName = false,
}: CardioSessionSummaryViewProps) {
  const locale = useLocale() as 'en' | 'sv'
  const tw = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const [data, setData] = useState<SummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/cardio-sessions/${assignmentId}/summary`)
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || 'failed')
        if (!cancelled) setData(json.data as SummaryResponse)
      } catch {
        if (!cancelled) {
          setError(tw('Kunde inte hämta sammanfattningen', 'Failed to load the summary'))
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-3xl p-4 pb-16 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {showAthleteName && data && (
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {data.athlete.name}
              </p>
            )}
            <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
              {data ? data.session.name : tw('Sammanfattning', 'Summary')}
            </h1>
            {data && (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {new Date(data.log.completedAt ?? data.log.startedAt).toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={tw('Stäng', 'Close')}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!data && !error && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={onClose}>{tw('Stäng', 'Close')}</Button>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <HeroStats data={data} tw={tw} />
            {data.calorieAdherence && <AdherenceCard data={data} tw={tw} />}
            {data.roundFade && <FadeCard data={data} tw={tw} />}
            {data.rounds.length > 1 && <RoundTable data={data} locale={locale} tw={tw} />}
            {data.equipment.length > 0 && (
              <EquipmentCards data={data} locale={locale} tw={tw} />
            )}
            {data.log.notes && (
              <div className="rounded-xl border bg-card p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {tw('Anteckningar', 'Notes')}
                </p>
                <p className="text-sm">{data.log.notes}</p>
              </div>
            )}
            <div className="pt-2">
              <Button className="w-full" size="lg" onClick={onClose}>
                {tw('Klar', 'Done')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type Tw = (sv: string, en: string) => string

function HeroStats({ data, tw }: { data: SummaryResponse; tw: Tw }) {
  const stats: Array<{ icon: typeof Clock; label: string; value: string }> = []
  if (data.log.actualDuration != null) {
    stats.push({ icon: Clock, label: tw('Total tid', 'Total time'), value: fmtClock(data.log.actualDuration) })
  }
  if (data.totals.calories != null) {
    stats.push({ icon: Flame, label: tw('Kalorier', 'Calories'), value: `${data.totals.calories}` })
  }
  if (data.totals.avgPower != null) {
    stats.push({ icon: Gauge, label: tw('Snittwatt', 'Avg power'), value: `${data.totals.avgPower} W` })
  }
  if (data.log.avgHeartRate != null) {
    stats.push({
      icon: Heart,
      label: tw('Puls snitt/max', 'HR avg/max'),
      value: `${data.log.avgHeartRate}${data.log.maxHeartRate != null ? ` / ${data.log.maxHeartRate}` : ''}`,
    })
  }
  if (data.log.sessionRPE != null) {
    stats.push({ icon: Activity, label: 'RPE', value: `${data.log.sessionRPE}/10` })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border bg-card p-3">
          <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
            <stat.icon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
          </div>
          <p className="text-xl font-black tabular-nums">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

function AdherenceCard({ data, tw }: { data: SummaryResponse; tw: Tw }) {
  const adherence = data.calorieAdherence!
  const pct = adherence.plannedTotal > 0
    ? Math.round((adherence.actualTotal / adherence.plannedTotal) * 100)
    : 0
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Target className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {tw('Kalorimål', 'Calorie target')}
          </span>
        </div>
        <Badge variant={pct >= 100 ? 'default' : 'secondary'} className="font-bold">
          {pct}%
        </Badge>
      </div>
      <p className="text-sm font-medium">
        {tw(
          `${adherence.actualTotal} av ${adherence.plannedTotal} kcal · målet nått i ${adherence.hitWindows} av ${adherence.scoredWindows} intervaller`,
          `${adherence.actualTotal} of ${adherence.plannedTotal} kcal · target hit in ${adherence.hitWindows} of ${adherence.scoredWindows} intervals`,
        )}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500')}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function FadeCard({ data, tw }: { data: SummaryResponse; tw: Tw }) {
  const fade = data.roundFade!
  const caloriesMetric = fade.metric === 'calories'
  // calories: less = decline; time: more seconds = decline
  const declined = caloriesMetric ? fade.percent < 0 : fade.percent > 0
  const fmtValue = (v: number) => (caloriesMetric ? `${v} kcal` : fmtClock(v))
  const Icon = declined ? TrendingDown : TrendingUp
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {tw('Tappet över rundorna', 'Fade across rounds')}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            'font-bold',
            declined
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
          )}
        >
          {fade.percent > 0 ? '+' : ''}
          {fade.percent.toFixed(1)}%
        </Badge>
      </div>
      <p className="text-sm font-medium">
        {tw(
          `Runda ${fade.firstRound}: ${fmtValue(fade.firstValue)} → runda ${fade.lastRound}: ${fmtValue(fade.lastValue)}`,
          `Round ${fade.firstRound}: ${fmtValue(fade.firstValue)} → round ${fade.lastRound}: ${fmtValue(fade.lastValue)}`,
        )}
        {' · '}
        {tw(
          `bäst runda ${fade.bestRound}, svagast runda ${fade.worstRound}`,
          `best round ${fade.bestRound}, weakest round ${fade.worstRound}`,
        )}
      </p>
    </div>
  )
}

function RoundTable({
  data,
  locale,
  tw,
}: {
  data: SummaryResponse
  locale: 'en' | 'sv'
  tw: Tw
}) {
  const columns = equipmentColumns(data.windows)
  const fade = data.roundFade
  const cellFor = (round: RoundSummary, equipment: string | null) =>
    round.windows.find((w) => w.equipment === equipment)

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {tw('Rundor', 'Round splits')}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2">#</th>
              {columns.map((col) => (
                <th key={col ?? 'none'} className="px-3 py-2">
                  {machineLabel(col, locale)}
                </th>
              ))}
              <th className="px-4 py-2 text-right">{tw('Totalt', 'Total')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rounds.map((round) => {
              const isBest = fade?.bestRound === round.round
              const isWorst = fade?.worstRound === round.round && !isBest
              return (
                <tr key={`${round.groupId}-${round.round}`} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-bold tabular-nums">
                    {round.round}
                    {isBest && (
                      <span className="ml-1 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        {tw('bäst', 'best')}
                      </span>
                    )}
                    {isWorst && (
                      <span className="ml-1 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                        {tw('svagast', 'low')}
                      </span>
                    )}
                  </td>
                  {columns.map((col) => {
                    const w = cellFor(round, col)
                    return (
                      <td key={col ?? 'none'} className="px-3 py-2 tabular-nums">
                        {w ? (
                          <div>
                            <span
                              className={cn(
                                'font-bold',
                                w.scoreKind === 'calories' &&
                                  w.plannedCalories != null &&
                                  w.actualCalories != null &&
                                  (w.actualCalories >= w.plannedCalories
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400'),
                              )}
                            >
                              {windowScoreText(w)}
                              {w.scoreKind === 'calories' && w.actualCalories != null && (
                                <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                                  kcal
                                </span>
                              )}
                            </span>
                            {(w.actualAvgPower != null || w.actualAvgHR != null) && (
                              <div className="text-[10px] font-medium text-muted-foreground">
                                {w.actualAvgPower != null && <span>{w.actualAvgPower} W</span>}
                                {w.actualAvgPower != null && w.actualAvgHR != null && ' · '}
                                {w.actualAvgHR != null && <span>{w.actualAvgHR} bpm</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right font-black tabular-nums">
                    {round.totalCalories != null
                      ? `${round.totalCalories} kcal`
                      : round.totalWorkSeconds != null
                        ? fmtClock(round.totalWorkSeconds)
                        : '–'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EquipmentCards({
  data,
  locale,
  tw,
}: {
  data: SummaryResponse
  locale: 'en' | 'sv'
  tw: Tw
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {tw('Per maskin', 'Per machine')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.equipment.map((eq) => {
          const declined = eq.fadePercent != null &&
            (eq.scoreKind === 'time' ? eq.fadePercent > 0 : eq.fadePercent < 0)
          return (
            <div key={eq.equipment ?? 'none'} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-black">{machineLabel(eq.equipment, locale)}</span>
                {eq.fadePercent != null && (
                  <span
                    className={cn(
                      'text-xs font-bold tabular-nums',
                      declined
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {eq.fadePercent > 0 ? '+' : ''}
                    {eq.fadePercent.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm font-medium">
                {eq.scoreKind === 'time' ? (
                  eq.avgWindowSeconds != null && (
                    <p>
                      {tw('Snitt-tid', 'Avg time')}:{' '}
                      <span className="font-bold tabular-nums">{fmtClock(eq.avgWindowSeconds)}</span>
                      {eq.bestWindowSeconds != null && eq.worstWindowSeconds != null && (
                        <span className="text-muted-foreground">
                          {' '}({fmtClock(eq.bestWindowSeconds)}–{fmtClock(eq.worstWindowSeconds)})
                        </span>
                      )}
                    </p>
                  )
                ) : (
                  eq.avgCalories != null && (
                    <p>
                      {tw('Snitt', 'Avg')}:{' '}
                      <span className="font-bold tabular-nums">{eq.avgCalories} kcal</span>
                      {eq.bestCalories != null && eq.worstCalories != null && (
                        <span className="text-muted-foreground">
                          {' '}({eq.worstCalories}–{eq.bestCalories})
                        </span>
                      )}
                    </p>
                  )
                )}
                {eq.targetCalories != null && eq.targetHitRate != null && (
                  <p>
                    {tw('Mål', 'Target')} {eq.targetCalories} kcal:{' '}
                    <span className="font-bold tabular-nums">
                      {Math.round(eq.targetHitRate * 100)}%
                    </span>{' '}
                    <span className="text-muted-foreground">
                      ({Math.round(eq.targetHitRate * eq.completedWindows)}/{eq.completedWindows})
                    </span>
                  </p>
                )}
                {eq.avgPower != null && (
                  <p>
                    {tw('Snittwatt', 'Avg power')}:{' '}
                    <span className="font-bold tabular-nums">{eq.avgPower} W</span>
                    {eq.maxPower != null && (
                      <span className="text-muted-foreground"> · max {eq.maxPower} W</span>
                    )}
                  </p>
                )}
                {eq.avgHR != null && (
                  <p>
                    {tw('Puls', 'HR')}:{' '}
                    <span className="font-bold tabular-nums">{eq.avgHR} bpm</span>
                    {eq.maxHR != null && (
                      <span className="text-muted-foreground"> · max {eq.maxHR}</span>
                    )}
                  </p>
                )}
                {eq.totalCalories != null && (
                  <p className="text-muted-foreground">
                    {tw('Totalt', 'Total')}: {eq.totalCalories} kcal · {eq.completedWindows}/{eq.windows}{' '}
                    {tw('intervaller', 'intervals')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
