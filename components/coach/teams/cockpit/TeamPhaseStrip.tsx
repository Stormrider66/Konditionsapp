'use client'

import Link from 'next/link'
import { Layers } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface TeamPhaseStripProps {
  /** Link to the Plan tab. */
  href: string
  blockTitle: string | null
  focus: string | null
  blockIndex: number
  blockTotal: number
  weekIndex: number
  weekTotal: number
  /** 0–1 progress through the blocks. */
  progress: number
}

/**
 * One-line phase-context strip on the Idag cockpit: where the team is in its
 * active block plan. Clicking it opens the full planner (Plan tab).
 */
export function TeamPhaseStrip({
  href,
  blockTitle,
  focus,
  blockIndex,
  blockTotal,
  weekIndex,
  weekTotal,
  progress,
}: TeamPhaseStripProps) {
  const t = useTranslations('coach.pages.teamDetail')

  return (
    <Link href={href} className="block">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-white px-4 py-2.5 text-sm shadow-sm transition-colors hover:border-blue-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-blue-500/40">
        <Layers className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="font-medium text-muted-foreground">{t('cockpit.phase.currentBlock')}:</span>
        <span className="font-semibold dark:text-white">{blockTitle ?? '—'}</span>
        {blockTotal > 0 && blockIndex > 0 && (
          <span className="text-muted-foreground">({blockIndex}/{blockTotal})</span>
        )}
        {blockTotal > 0 && (
          <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 sm:block dark:bg-white/10">
            <span
              className="block h-full rounded-full bg-blue-500"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
            />
          </span>
        )}
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          {t('cockpit.phase.week', { current: weekIndex, total: weekTotal })}
        </span>
        {focus && <span className="truncate text-muted-foreground">· {focus}</span>}
      </div>
    </Link>
  )
}
