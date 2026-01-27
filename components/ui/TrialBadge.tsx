'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getTrialWarningLevel,
  formatTrialDaysRemaining,
} from '@/lib/subscription/trial-utils'

interface TrialBadgeProps {
  daysRemaining: number
  upgradeUrl?: string
  className?: string
  locale?: 'sv' | 'en'
}

export function TrialBadge({
  daysRemaining,
  upgradeUrl = '/subscription',
  className,
  locale = 'sv',
}: TrialBadgeProps) {
  const warningLevel = getTrialWarningLevel(daysRemaining)

  const getVariant = () => {
    switch (warningLevel) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'destructive'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getText = () => {
    if (locale === 'en') {
      if (daysRemaining === 0) return 'Trial expires today'
      if (daysRemaining === 1) return '1 day left in trial'
      return `${daysRemaining} days left in trial`
    }
    return formatTrialDaysRemaining(daysRemaining)
  }

  const badgeContent = (
    <Badge
      variant={getVariant()}
      className={cn(
        'cursor-pointer',
        warningLevel === 'high' && 'animate-pulse',
        warningLevel === 'medium' && 'bg-amber-500 hover:bg-amber-600 text-white border-transparent',
        className
      )}
    >
      {getText()}
    </Badge>
  )

  if (upgradeUrl) {
    return <Link href={upgradeUrl}>{badgeContent}</Link>
  }

  return badgeContent
}
