'use client'

import { AlertTriangle } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface TeamAttentionStripProps {
  /** Members with an active restriction but no active injury. */
  limited: number
  /** Members with an active injury. */
  injured: number
  /** Athletes with no session assigned on the viewed day. */
  withoutWorkout: number
  /** Members in the DANGER/CRITICAL ACWR zones (elevated injury risk). */
  highAcwr: number
}

/**
 * Triage line above the cockpit panes — surfaces the day's exceptions so the
 * coach acts on them instead of scanning the whole roster. Renders nothing
 * when there's nothing to flag. (Click-to-filter the rail arrives in Phase 4.)
 */
export function TeamAttentionStrip({ limited, injured, withoutWorkout, highAcwr }: TeamAttentionStripProps) {
  const t = useTranslations('coach.pages.teamDetail')

  const chips: string[] = []
  if (injured > 0) chips.push(t('cockpit.attention.injured', { count: injured }))
  if (limited > 0) chips.push(t('cockpit.attention.limited', { count: limited }))
  if (withoutWorkout > 0) chips.push(t('cockpit.attention.withoutWorkout', { count: withoutWorkout }))
  if (highAcwr > 0) chips.push(t('cockpit.attention.highAcwr', { count: highAcwr }))

  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {chips.map((chip, index) => (
        <span key={chip} className="flex items-center gap-2">
          {index > 0 && <span className="text-amber-400" aria-hidden>·</span>}
          <span>{chip}</span>
        </span>
      ))}
    </div>
  )
}
