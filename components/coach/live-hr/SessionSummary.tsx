'use client'

/**
 * Session Summary
 *
 * Displays summary stats for a live HR session.
 */

import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { ZONE_COLORS } from '@/lib/live-hr/types'
import { Heart, Users, Activity } from 'lucide-react'
import { useLocale } from '@/i18n/client'

interface SessionSummaryProps {
  totalParticipants: number
  activeParticipants: number
  avgHeartRate: number | null
  zoneDistribution: {
    zone1: number
    zone2: number
    zone3: number
    zone4: number
    zone5: number
  }
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  athletes: string
  activeSignal: string
  averageHeartRate: string
  zoneDistribution: string
}> = {
  en: {
    athletes: 'Athletes',
    activeSignal: 'Active signal',
    averageHeartRate: 'Avg heart rate',
    zoneDistribution: 'Zone distribution',
  },
  sv: {
    athletes: 'Atleter',
    activeSignal: 'Aktiv signal',
    averageHeartRate: 'Snitt puls',
    zoneDistribution: 'Zonfördelning',
  },
}

export function SessionSummary({
  totalParticipants,
  activeParticipants,
  avgHeartRate,
  zoneDistribution,
}: SessionSummaryProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const total = Object.values(zoneDistribution).reduce((sum, count) => sum + count, 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Total participants */}
      <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-sm">
        <GlassCardContent className="flex items-center gap-3 p-4">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalParticipants}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{copy.athletes}</p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Active (with signal) */}
      <GlassCard glow="emerald" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-sm">
        <GlassCardContent className="flex items-center gap-3 p-4">
          <Activity className="h-8 w-8 text-emerald-500 animate-pulse" />
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeParticipants}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{copy.activeSignal}</p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Average HR */}
      <GlassCard glow="red" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-sm">
        <GlassCardContent className="flex items-center gap-3 p-4">
          <Heart className="h-8 w-8 text-rose-500" />
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgHeartRate ?? '-'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{copy.averageHeartRate}</p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Zone distribution */}
      <GlassCard glow="blue" className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-sm">
        <GlassCardContent className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">{copy.zoneDistribution}</p>
          <div className="flex gap-1 h-6">
            {[1, 2, 3, 4, 5].map((zone) => {
              const count = zoneDistribution[`zone${zone}` as keyof typeof zoneDistribution]
              const width = total > 0 ? (count / total) * 100 : 0
              return (
                <div
                  key={zone}
                  className="h-full rounded-sm transition-all duration-300 flex items-center justify-center text-[10px] text-white font-semibold"
                  style={{
                    backgroundColor: ZONE_COLORS[zone as keyof typeof ZONE_COLORS],
                    width: `${Math.max(width, count > 0 ? 15 : 0)}%`,
                    minWidth: count > 0 ? '20px' : '0',
                  }}
                >
                  {count > 0 && count}
                </div>
              )
            })}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
