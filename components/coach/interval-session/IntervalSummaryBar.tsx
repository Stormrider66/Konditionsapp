'use client'

import type { IntervalParticipantData, RestMode } from '@/lib/interval-session/types'
import { useLocale } from '@/i18n/client'

interface IntervalSummaryBarProps {
  currentInterval: number
  totalParticipants: number
  tappedThisInterval: number
  avgSplitMs: number | null
  restMode?: RestMode
  participants?: IntervalParticipantData[]
}

function formatSplit(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

export function IntervalSummaryBar({
  currentInterval,
  totalParticipants,
  tappedThisInterval,
  avgSplitMs,
  restMode = 'NONE',
  participants,
}: IntervalSummaryBarProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'

  // In INDIVIDUAL mode, show per-athlete interval distribution
  if (restMode === 'INDIVIDUAL' && participants && participants.length > 0) {
    const completed = participants.filter((p) => p.allIntervalsCompleted).length
    const maxInterval = Math.max(...participants.map((p) => p.athleteCurrentInterval))

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 bg-slate-100/60 dark:bg-slate-950/45 border border-slate-200/50 dark:border-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 text-sm text-slate-800 dark:text-slate-200">
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">{copy(locale, 'Highest interval', 'Högsta intervall')}: {maxInterval - 1 > 0 ? maxInterval - 1 : 1}</span>
        </div>
        <div className="flex gap-4 sm:gap-6">
          <div>
            <span className="text-slate-500 dark:text-slate-400">{copy(locale, 'Done', 'Klara')}: </span>
            <span className="font-semibold text-slate-900 dark:text-white">{completed} / {totalParticipants}</span>
          </div>
          {avgSplitMs !== null && (
            <div>
              <span className="text-slate-500 dark:text-slate-400">{copy(locale, 'Avg', 'Snitt')}: </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatSplit(avgSplitMs)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 bg-slate-100/60 dark:bg-slate-950/45 border border-slate-200/50 dark:border-white/5 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 text-sm text-slate-800 dark:text-slate-200">
      <div>
        <span className="font-semibold text-slate-900 dark:text-white">{copy(locale, 'Interval', 'Intervall')} {currentInterval}</span>
      </div>
      <div className="flex gap-4 sm:gap-6">
        <div>
          <span className="text-slate-500 dark:text-slate-400">{copy(locale, 'Tapped', 'Tappade')}: </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {tappedThisInterval} / {totalParticipants}
          </span>
        </div>
        {avgSplitMs !== null && (
          <div>
            <span className="text-slate-500 dark:text-slate-400">{copy(locale, 'Avg', 'Snitt')}: </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatSplit(avgSplitMs)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
