'use client'

import type { ReactNode } from 'react'
import { Activity, Clock, Flame, Gauge, Heart, MapPin, Timer, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { GarminAttribution } from '@/components/ui/GarminAttribution'
import { UnifiedCalendarItem, formatDistanceKm } from '../../types'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
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
    <div className={cn('rounded-lg border p-2.5', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="font-bold text-sm mt-0.5">{value}</p>
    </div>
  )
}

export function GarminDetailPanel({ activity, isGlass = false }: { activity: UnifiedCalendarItem; isGlass?: boolean }) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const meta = activity.metadata

  const distance = formatDistanceKm(meta.distance)
  const duration = num(meta.duration)
  const pace = str(meta.pace)
  const avgHR = num(meta.avgHR)
  const maxHR = num(meta.maxHR)
  const avgPower = num(meta.avgPower)
  const calories = num(meta.calories)
  const tss = num(meta.tss)
  const deviceName = str(meta.deviceName)
  const activityType = str(meta.garminType) || str(meta.workoutType)
  const indoor = meta.indoor === true

  const metrics: { label: string; value: string; icon: ReactNode }[] = []
  if (distance) metrics.push({ label: t('Distans', 'Distance'), value: distance, icon: <MapPin className="h-3 w-3" /> })
  if (duration) metrics.push({ label: t('Tid', 'Duration'), value: `${duration} min`, icon: <Clock className="h-3 w-3" /> })
  if (pace) metrics.push({ label: t('Tempo', 'Pace'), value: pace, icon: <Timer className="h-3 w-3" /> })
  if (avgHR) metrics.push({ label: t('Snittpuls', 'Avg HR'), value: `${avgHR} bpm`, icon: <Heart className="h-3 w-3" /> })
  if (maxHR) metrics.push({ label: t('Maxpuls', 'Max HR'), value: `${maxHR} bpm`, icon: <Heart className="h-3 w-3" /> })
  if (avgPower) metrics.push({ label: t('Snitteffekt', 'Avg power'), value: `${avgPower} W`, icon: <Zap className="h-3 w-3" /> })
  if (calories) metrics.push({ label: t('Kalorier', 'Calories'), value: `${calories} kcal`, icon: <Flame className="h-3 w-3" /> })
  if (tss) metrics.push({ label: 'TSS', value: `${tss}`, icon: <Gauge className="h-3 w-3" /> })

  return (
    <div
      className={cn(
        'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
        isGlass
          ? 'bg-cyan-500/5 border-cyan-500/20 shadow-[0_4px_20px_rgba(6,182,212,0.12)]'
          : 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800'
      )}
    >
      {/* Official Garmin branding: the Garmin tag logo + "Garmin [device
          model]" attribution, per Garmin API Brand Guidelines (v6.30.2025).
          Shared GarminAttribution component keeps it consistent + compliant. */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <GarminAttribution deviceModel={deviceName} size="md" />
        {(activityType || indoor) && (
          <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
            {[activityType?.replace(/_/g, ' ').toLowerCase(), indoor ? t('inomhus', 'indoor') : null]
              .filter(Boolean)
              .join(' · ')}
          </Badge>
        )}
      </div>

      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {metrics.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} isGlass={isGlass} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('Inga mätvärden registrerade.', 'No metrics recorded.')}
        </p>
      )}
    </div>
  )
}
