'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from '@/i18n/client'

interface TeamAttentionStripProps {
  teamBasePath: string
  /** Members with an active restriction but no active injury. */
  limitedPlayers: string[]
  /** Members with an active injury. */
  injuredPlayers: string[]
  /** Athletes with no session assigned on the viewed day. */
  withoutWorkoutPlayers: string[]
  /** Members in the DANGER/CRITICAL ACWR zones (elevated injury risk). */
  highAcwrPlayers: string[]
}

interface AttentionChip {
  key: string
  label: string
  href: string
  names: string[]
}

/**
 * Triage line above the cockpit panes — surfaces the day's exceptions so the
 * coach acts on them instead of scanning the whole roster. Renders nothing
 * when there's nothing to flag.
 */
export function TeamAttentionStrip({
  teamBasePath,
  limitedPlayers,
  injuredPlayers,
  withoutWorkoutPlayers,
  highAcwrPlayers,
}: TeamAttentionStripProps) {
  const t = useTranslations('coach.pages.teamDetail')

  const chips: AttentionChip[] = []
  if (injuredPlayers.length > 0) {
    chips.push({
      key: 'injured',
      label: injuredPlayers.length === 1
        ? t('cockpit.attention.injuredNamed', { name: injuredPlayers[0] })
        : t('cockpit.attention.injured', { count: injuredPlayers.length }),
      href: `${teamBasePath}/medical`,
      names: injuredPlayers,
    })
  }
  if (limitedPlayers.length > 0) {
    chips.push({
      key: 'limited',
      label: limitedPlayers.length === 1
        ? t('cockpit.attention.limitedNamed', { name: limitedPlayers[0] })
        : t('cockpit.attention.limited', { count: limitedPlayers.length }),
      href: `${teamBasePath}/medical`,
      names: limitedPlayers,
    })
  }
  if (withoutWorkoutPlayers.length > 0) {
    chips.push({
      key: 'without-workout',
      label: withoutWorkoutPlayers.length === 1
        ? t('cockpit.attention.withoutWorkoutNamed', { name: withoutWorkoutPlayers[0] })
        : t('cockpit.attention.withoutWorkout', { count: withoutWorkoutPlayers.length }),
      href: `${teamBasePath}/trupp`,
      names: withoutWorkoutPlayers,
    })
  }
  if (highAcwrPlayers.length > 0) {
    chips.push({
      key: 'high-acwr',
      label: highAcwrPlayers.length === 1
        ? t('cockpit.attention.highAcwrNamed', { name: highAcwrPlayers[0] })
        : t('cockpit.attention.highAcwr', { count: highAcwrPlayers.length }),
      href: `${teamBasePath}/medical`,
      names: highAcwrPlayers,
    })
  }

  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {chips.map((chip) => {
        const title = formatChipTitle(chip.label, chip.names, (names, count) =>
          t('cockpit.attention.nameListWithMore', { names, count })
        )
        return (
          <Link
            key={chip.key}
            href={chip.href}
            title={title}
            aria-label={title}
            className="inline-flex min-h-7 items-center rounded-md px-2 font-medium transition-colors hover:bg-amber-100 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-amber-500/20 dark:hover:text-amber-100"
          >
            {chip.label}
          </Link>
        )
      })}
    </div>
  )
}

function formatChipTitle(
  label: string,
  names: string[],
  formatMore: (names: string, count: number) => string
) {
  if (names.length === 0) return label
  const visibleNames = names.slice(0, 3).join(', ')
  if (names.length <= 3) return `${label}: ${visibleNames}`
  return `${label}: ${formatMore(visibleNames, names.length - 3)}`
}
