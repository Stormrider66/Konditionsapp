// components/coach/athlete-profile/ui.tsx
//
// Small presentational building blocks for the coach-mode athlete profile.
// Extracted from the page component during Phase 0 of the IA redesign.

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, KeyRound, CircleAlert } from 'lucide-react'
import type { ClientWithTests } from './types'

export function ProfileField({
  label,
  value,
  className,
  compact = false,
}: {
  label: string
  value: string
  className?: string
  compact?: boolean
}) {
  return (
    <div className={className}>
      <p className={cn(
        'text-xs text-gray-500 dark:text-slate-400',
        compact ? 'sm:text-xs' : 'sm:text-sm',
      )}>
        {label}
      </p>
      <p className={cn(
        'font-medium dark:text-slate-200 truncate',
        compact ? 'text-sm' : 'text-base sm:text-lg',
      )}>
        {value}
      </p>
    </div>
  )
}

export function CoachCockpitCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export function AthletePortalStatusBadge({
  athleteAccount,
  labels,
}: {
  athleteAccount: ClientWithTests['athleteAccount']
  labels: {
    passwordReady: string
    active: string
    notLoggedIn: string
  }
}) {
  if (!athleteAccount) return null

  const status = athleteAccount.authStatus
  if (status?.hasSetPasswordAndLoggedIn) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        {labels.passwordReady}
      </Badge>
    )
  }

  if (status?.hasLoggedIn || status?.isActive) {
    return (
      <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-900/20">
        <KeyRound className="h-3.5 w-3.5 mr-1" />
        {labels.active}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-900/20">
      <CircleAlert className="h-3.5 w-3.5 mr-1" />
      {labels.notLoggedIn}
    </Badge>
  )
}
