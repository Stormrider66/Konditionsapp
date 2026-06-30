'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Watch, CheckCircle2, CircleAlert } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { type GarminStatus, garminFreshness } from '@/lib/coach/garmin-status'

interface GarminConnectionCardProps {
  clientId: string
}

export function GarminConnectionCard({ clientId }: GarminConnectionCardProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()
  const dateFnsLocale = locale === 'sv' ? sv : enUS

  const [status, setStatus] = useState<GarminStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/integrations/garmin?clientId=${clientId}`)
      const result = await response.json()
      setStatus(result)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  // Don't clutter the profile until we know the integration exists.
  if (loading || !status || status.configured === false) return null

  const connected = !!status.connected
  const freshness = garminFreshness(status)

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Watch className="h-4 w-4 text-blue-500" />
        <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('garmin.title')}</h2>
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
          connected && status.syncEnabled !== false
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
            : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
        )}>
          {connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
          {connected
            ? (status.syncEnabled === false ? t('garmin.statusPaused') : t('garmin.statusConnected'))
            : t('garmin.notConnected')}
        </span>
      </div>

      {!connected ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('garmin.connectedNote')}</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field
              label={t('garmin.lastSync')}
              value={status.lastSyncAt
                ? formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true, locale: dateFnsLocale })
                : t('garmin.never')}
              tone={freshness === 'stale' ? 'warn' : freshness === 'error' ? 'bad' : 'default'}
            />
            <Field label={t('garmin.dataPoints')} value={String(status.metricsCount ?? 0)} />
            <Field
              label={t('garmin.connectedSince')}
              value={status.connectedAt
                ? format(new Date(status.connectedAt), 'PP', { locale: dateFnsLocale })
                : '–'}
            />
          </dl>

          {status.lastSyncError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <span className="font-medium">{t('garmin.syncError')}:</span> {status.lastSyncError}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">{t('garmin.connectedNote')}</p>
        </>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'warn' | 'bad'
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn(
        'mt-1 text-sm font-semibold',
        tone === 'warn' && 'text-amber-600 dark:text-amber-300',
        tone === 'bad' && 'text-red-600 dark:text-red-300',
        tone === 'default' && 'text-gray-900 dark:text-white',
      )}>
        {value}
      </dd>
    </div>
  )
}
