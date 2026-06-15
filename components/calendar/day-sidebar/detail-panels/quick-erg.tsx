'use client'

import { Activity, Battery, CheckCircle2, Clock, Heart, MapPin, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { UnifiedCalendarItem } from '../../types'
import { cn } from '@/lib/utils'
import { formatDistanceValue } from '../formatters'
import { useTranslations } from '@/i18n/client'

function numberMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function MetricCard({
  label,
  value,
  icon,
  isGlass,
}: {
  label: string
  value: string
  icon: ReactNode
  isGlass: boolean
}) {
  return (
    <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
      <p className="text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}

export function QuickErgDetailPanel({ session, isGlass = false }: { session: UnifiedCalendarItem; isGlass?: boolean }) {
  const t = useTranslations('components.daySidebar')
  const meta = session.metadata
  const distance = formatDistanceValue(meta.distance)
  const duration = numberMetric(meta.duration)
  const avgPower = numberMetric(meta.avgPower)
  const maxPower = numberMetric(meta.maxPower)
  const avgHeartRate = numberMetric(meta.avgHR)
  const maxHeartRate = numberMetric(meta.maxHR)
  const calories = numberMetric(meta.calories)
  const rpe = numberMetric(meta.rpe)
  const deviceName = typeof meta.deviceName === 'string' && meta.deviceName.trim()
    ? meta.deviceName.trim()
    : null

  return (
    <div className={cn(
      'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      isGlass
        ? 'bg-lime-500/5 border-lime-500/20 shadow-[0_4px_20px_rgba(132,204,22,0.12)]'
        : 'bg-lime-50 dark:bg-lime-950/20 border-lime-200 dark:border-lime-800'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-lime-600 dark:text-lime-400">
          <Activity className="h-4 w-4" />
          {t('quickErg.title')}
        </h4>
        <Badge variant="secondary" className={cn(
          'text-[10px] uppercase font-bold tracking-tight',
          isGlass ? 'bg-emerald-500/20 text-emerald-400 border-none px-2' : 'bg-green-100 text-green-700'
        )}>
          {t('quickErg.completed')}
        </Badge>
      </div>

      <div className="space-y-3">
        <div>
          <p className={cn('font-black text-lg tracking-tight', isGlass ? 'text-white' : '')}>{session.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className={cn(
              'text-[10px] uppercase font-bold border-none px-2',
              isGlass ? 'bg-white/5 text-slate-400' : 'text-xs'
            )}>
              {String(meta.workoutType || t('quickErg.workoutTypeFallback')).replace(/_/g, ' ')}
            </Badge>
            {deviceName ? (
              <span className={cn(
                'text-[10px] uppercase tracking-widest font-bold',
                isGlass ? 'text-slate-500' : 'text-muted-foreground'
              )}>
                {deviceName}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {duration ? (
            <MetricCard
              label={t('quickErg.time')}
              value={`${duration} ${t('units.minutes')}`}
              icon={<Clock className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
          {distance.label ? (
            <MetricCard
              label={t('quickErg.distance')}
              value={distance.label}
              icon={<MapPin className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
          {avgPower ? (
            <MetricCard
              label={t('quickErg.avgPower')}
              value={`${avgPower} W`}
              icon={<Zap className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
          {maxPower ? (
            <MetricCard
              label={t('quickErg.maxPower')}
              value={`${maxPower} W`}
              icon={<Zap className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
          {avgHeartRate ? (
            <MetricCard
              label={t('quickErg.heartRate')}
              value={`${avgHeartRate} bpm`}
              icon={<Heart className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
          {maxHeartRate ? (
            <MetricCard
              label={t('quickErg.maxHeartRate')}
              value={`${maxHeartRate} bpm`}
              icon={<Heart className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
          {calories ? (
            <MetricCard
              label={t('quickErg.calories')}
              value={`${calories}`}
              icon={<Battery className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
          {rpe ? (
            <MetricCard
              label={t('quickErg.rpe')}
              value={`${rpe}/10`}
              icon={<CheckCircle2 className="h-3 w-3" />}
              isGlass={isGlass}
            />
          ) : null}
        </div>

        {session.description ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              {t('quickErg.notes')}
            </p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>
              {session.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
