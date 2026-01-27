'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface AIChatUsageMeterProps {
  used: number
  limit: number | undefined // undefined means unlimited
  className?: string
  showLabel?: boolean
  locale?: 'sv' | 'en'
}

export function AIChatUsageMeter({
  used,
  limit,
  className,
  showLabel = true,
  locale = 'sv',
}: AIChatUsageMeterProps) {
  // Unlimited usage
  if (limit === undefined || limit === -1) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <span className="text-muted-foreground">
          {locale === 'sv' ? 'Obegränsad AI-chatt' : 'Unlimited AI chat'}
        </span>
      </div>
    )
  }

  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  const getProgressColor = () => {
    if (isAtLimit) return 'bg-destructive'
    if (isNearLimit) return 'bg-amber-500'
    return ''
  }

  const getStatusText = () => {
    if (locale === 'sv') {
      if (isAtLimit) return 'Månadsgräns nådd'
      if (isNearLimit) return 'Nästan slut'
      return `${used}/${limit} meddelanden`
    }
    if (isAtLimit) return 'Monthly limit reached'
    if (isNearLimit) return 'Almost at limit'
    return `${used}/${limit} messages`
  }

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {locale === 'sv' ? 'AI-chatt' : 'AI Chat'}
          </span>
          <span
            className={cn(
              'font-medium',
              isAtLimit && 'text-destructive',
              isNearLimit && !isAtLimit && 'text-amber-600'
            )}
          >
            {getStatusText()}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Progress
          value={percentage}
          className={cn('h-2 flex-1', getProgressColor())}
        />
        {!showLabel && (
          <span className="text-xs text-muted-foreground">
            {used}/{limit}
          </span>
        )}
      </div>
    </div>
  )
}

// Compact version for inline display
export function AIChatUsageCompact({
  used,
  limit,
  className,
  locale = 'sv',
}: Omit<AIChatUsageMeterProps, 'showLabel'>) {
  if (limit === undefined || limit === -1) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {locale === 'sv' ? 'Obegränsad' : 'Unlimited'}
      </span>
    )
  }

  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100

  return (
    <span
      className={cn(
        'text-xs',
        isAtLimit && 'text-destructive font-medium',
        isNearLimit && !isAtLimit && 'text-amber-600',
        !isNearLimit && 'text-muted-foreground',
        className
      )}
    >
      {used}/{limit}
    </span>
  )
}
