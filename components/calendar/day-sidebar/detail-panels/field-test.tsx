'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Beaker, Loader2 } from 'lucide-react'
import { UnifiedCalendarItem } from '../../types'
import { cn } from '@/lib/utils'
import {
  formatConfidenceLabel,
  formatFieldTestType,
  formatPaceSeconds,
  getFieldTestMetrics,
  normalizeMessages,
} from '../formatters'
import type { SidebarFieldTestDetail } from './workout'
import { useLocale, useTranslations } from '@/i18n/client'

export function FieldTestDetailPanel({ test, isGlass = false }: { test: UnifiedCalendarItem; isGlass?: boolean }) {
  const [detail, setDetail] = useState<SidebarFieldTestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const t = useTranslations('components.daySidebar')
  const locale = useLocale()

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/field-tests/${test.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setDetail(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [test.id])

  const warnings = normalizeMessages(detail?.warnings)
  const errors = normalizeMessages(detail?.errors)
  const dateLabel = detail?.date
    ? new Date(detail.date).toLocaleDateString(locale?.startsWith('en') ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' })
    : null
  const metrics = getFieldTestMetrics(detail?.results || null, t)

  return (
    <div className={cn(
      'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      isGlass
        ? 'bg-green-500/5 border-green-500/20 shadow-[0_4px_20px_rgba(34,197,94,0.12)]'
        : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-green-500">
          <Beaker className="h-4 w-4" />
          {t('fieldTest.title')}
        </h4>
        {detail && (
          <Badge variant="secondary" className={cn(
            'text-[10px] uppercase font-bold tracking-tight',
            detail.valid
              ? (isGlass ? 'bg-emerald-500/20 text-emerald-400 border-none px-2' : 'bg-green-100 text-green-700')
              : (isGlass ? 'bg-yellow-500/20 text-yellow-300 border-none px-2' : 'bg-yellow-100 text-yellow-700')
          )}>
            {detail.valid ? t('fieldTest.valid') : t('fieldTest.needsReview')}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className={cn('flex items-center gap-2 text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('fieldTest.loading')}
          </div>
        )}

        <div>
          <p className={cn('font-black text-lg tracking-tight', isGlass ? 'text-white' : '')}>{test.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className="text-xs bg-green-500 text-white">
              {formatFieldTestType(detail?.testType || (test.metadata.testType as string | undefined), t)}
            </Badge>
            {dateLabel && (
              <span className={cn('text-[10px] uppercase tracking-widest font-bold', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                {dateLabel}
              </span>
            )}
            {detail?.confidence && (
              <span className={cn('text-[10px] uppercase tracking-widest font-bold', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                {formatConfidenceLabel(detail.confidence, t)}
              </span>
            )}
          </div>
        </div>

        {(detail?.lt1Pace || detail?.lt1HR || detail?.lt2Pace || detail?.lt2HR) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(detail?.lt1Pace || detail?.lt1HR) && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">LT1</p>
                <p className="font-semibold">
                  {detail?.lt1Pace ? `${formatPaceSeconds(detail.lt1Pace)}` : t('fieldTest.missingPace')}
                  {detail?.lt1HR ? ` • ${Math.round(detail.lt1HR)} bpm` : ''}
                </p>
              </div>
            )}
            {(detail?.lt2Pace || detail?.lt2HR) && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">LT2</p>
                <p className="font-semibold">
                  {detail?.lt2Pace ? `${formatPaceSeconds(detail.lt2Pace)}` : t('fieldTest.missingPace')}
                  {detail?.lt2HR ? ` • ${Math.round(detail.lt2HR)} bpm` : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {metrics.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{t('fieldTest.keyMetrics')}</p>
            <div className="flex flex-wrap gap-2">
              {metrics.map((metric) => (
                <span
                  key={metric}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-semibold',
                    isGlass ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-background'
                  )}
                >
                  {metric}
                </span>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className={cn('rounded-lg border p-2.5', isGlass ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200')}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-1">{t('fieldTest.warnings')}</p>
            <ul className={cn('space-y-1 text-xs', isGlass ? 'text-slate-300' : '')}>
              {warnings.slice(0, 3).map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div className={cn('rounded-lg border p-2.5', isGlass ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200')}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">{t('fieldTest.issues')}</p>
            <ul className={cn('space-y-1 text-xs', isGlass ? 'text-slate-300' : '')}>
              {errors.slice(0, 3).map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {detail?.notes && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t('fieldTest.notes')}</p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{detail.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
