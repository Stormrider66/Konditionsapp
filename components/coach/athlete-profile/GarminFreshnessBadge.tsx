'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Watch } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { type GarminStatus, garminFreshness } from '@/lib/coach/garmin-status'

interface GarminFreshnessBadgeProps {
  clientId: string
}

const DOT: Record<string, string> = {
  fresh: 'bg-emerald-500',
  stale: 'bg-amber-500',
  error: 'bg-red-500',
  never: 'bg-gray-400',
}

export function GarminFreshnessBadge({ clientId }: GarminFreshnessBadgeProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()
  const dateFnsLocale = locale === 'sv' ? sv : enUS

  const [status, setStatus] = useState<GarminStatus | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/integrations/garmin?clientId=${clientId}`)
      const result = await response.json()
      setStatus(result)
    } catch {
      setStatus(null)
    }
  }, [clientId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  // Hide entirely until we know the integration is configured.
  if (!status || status.configured === false) return null

  if (!status.connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Watch className="h-3.5 w-3.5" />
        {t('garmin.notConnected')}
      </div>
    )
  }

  const freshness = garminFreshness(status)
  const synced = status.lastSyncAt
    ? formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true, locale: dateFnsLocale })
    : null

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn('h-2 w-2 rounded-full', DOT[freshness])} />
      <Watch className="h-3.5 w-3.5" />
      <span>
        Garmin · {freshness === 'error'
          ? t('garmin.syncError')
          : synced
            ? `${t('garmin.synced')} ${synced}`
            : t('garmin.never')}
      </span>
    </div>
  )
}
