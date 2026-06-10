'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/i18n/client'

interface CardLoadErrorProps {
  onRetry: () => void
}

/**
 * Compact inline error state for dashboard cards whose data fetch failed.
 * Replaces the old pattern of silently rendering an empty card, which made
 * outages indistinguishable from "no data".
 */
export function CardLoadError({ onRetry }: CardLoadErrorProps) {
  const t = useTranslations('components.cardLoadError')

  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <AlertTriangle className="h-6 w-6 text-amber-500" />
      <p className="text-sm text-muted-foreground">{t('message')}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        {t('retry')}
      </Button>
    </div>
  )
}
