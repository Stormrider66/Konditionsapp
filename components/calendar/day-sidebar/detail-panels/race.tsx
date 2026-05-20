'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Heart, Loader2, Trophy, Timer, TrendingUp } from 'lucide-react'
import { UnifiedCalendarItem } from '../../types'
import { cn } from '@/lib/utils'
import { formatConfidenceLabel, formatRaceDistanceLabel } from '../formatters'
import type { SidebarRaceResult } from './workout'
import { useLocale, useTranslations } from '@/i18n/client'

export function RaceDetailPanel({ race, isGlass = false }: { race: UnifiedCalendarItem; isGlass?: boolean }) {
  const [detail, setDetail] = useState<SidebarRaceResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const t = useTranslations('components.daySidebar')
  const locale = useLocale()

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/race-results/${race.id}`)
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
  }, [race.id])

  const meta = race.metadata
  const targetTime = detail?.goalTime || (typeof meta.targetTime === 'string' ? meta.targetTime : null)
  const actualPace = detail?.avgPace || (typeof meta.actualPace === 'string' ? meta.actualPace : null)
  const completed = (meta.isCompleted as boolean) || !!detail?.timeFormatted
  const confidence = formatConfidenceLabel(detail?.confidence, t)
  const dateLabel = detail?.raceDate
    ? new Date(detail.raceDate).toLocaleDateString(locale?.startsWith('sv') ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className={cn(
      'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      isGlass
        ? 'bg-red-500/5 border-red-500/20 shadow-[0_4px_20px_rgba(239,68,68,0.12)]'
        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-red-500">
          <Trophy className="h-4 w-4" />
          {t('race.title')}
        </h4>
        {completed && (
          <Badge variant="secondary" className={cn(
            'text-[10px] uppercase font-bold tracking-tight',
            isGlass ? 'bg-emerald-500/20 text-emerald-400 border-none px-2' : 'bg-green-100 text-green-700'
          )}>
            {t('race.completed')}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className={cn('flex items-center gap-2 text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('race.loading')}
          </div>
        )}

        <div>
          <p className={cn('font-black text-lg tracking-tight', isGlass ? 'text-white' : '')}>{race.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className="text-xs bg-red-500 text-white">
              {formatRaceDistanceLabel(detail?.distance || (meta.distance as string | undefined), t)}
            </Badge>
            {typeof meta.classification === 'string' && (
              <Badge variant="outline" className={cn(
                'text-[10px] uppercase font-bold border-none px-2',
                isGlass ? 'bg-white/5 text-slate-400' : 'text-xs'
              )}>
                {t('race.classification', { value: meta.classification })}
              </Badge>
            )}
            {dateLabel && (
              <span className={cn('text-[10px] uppercase tracking-widest font-bold', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                {dateLabel}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {detail?.timeFormatted && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> {t('race.result')}</p>
              <p className="font-semibold">{detail.timeFormatted}</p>
            </div>
          )}
          {targetTime && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground">{t('race.targetTime')}</p>
              <p className="font-semibold">{targetTime}</p>
            </div>
          )}
          {actualPace && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {t('race.pace')}</p>
              <p className="font-semibold">{actualPace}</p>
            </div>
          )}
          {detail?.avgHeartRate && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> {t('race.averagePulse')}</p>
              <p className="font-semibold">{detail.avgHeartRate} bpm</p>
            </div>
          )}
        </div>

        {(detail?.terrain || detail?.temperature || detail?.windSpeed || detail?.elevation || confidence) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {detail?.terrain && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">{t('race.terrain')}</p>
                <p className="font-semibold">{detail.terrain}</p>
              </div>
            )}
            {detail?.temperature != null && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">{t('race.temperature')}</p>
                <p className="font-semibold">{detail.temperature}°C</p>
              </div>
            )}
            {detail?.windSpeed != null && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">{t('race.wind')}</p>
                <p className="font-semibold">{detail.windSpeed} m/s</p>
              </div>
            )}
            {confidence && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">{t('race.dataQuality')}</p>
                <p className="font-semibold">{confidence}</p>
              </div>
            )}
          </div>
        )}

        {detail?.conditions && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              {t('race.conditions')}
            </p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>
              {detail.conditions}
            </p>
          </div>
        )}

        {detail?.athleteNotes && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              {t('race.athleteNotes')}
            </p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{detail.athleteNotes}</p>
          </div>
        )}

        {detail?.coachNotes && (
          <div className={cn('rounded-lg border p-2.5', isGlass ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200')}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
              {t('race.coachAnalysis')}
            </p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{detail.coachNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
