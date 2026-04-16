'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  CheckCircle2,
  Clock,
  Dumbbell,
  Heart,
  ExternalLink,
  Loader2,
  MapPin,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { UnifiedCalendarItem, WORKOUT_TYPE_COLORS, INTENSITY_COLORS } from '../../types'
import { cn } from '@/lib/utils'
import {
  formatDistanceValue,
  formatDurationMinutes,
  formatAdHocInputType,
  formatAdHocTypeLabel,
  formatConfidenceLabel,
  formatFeelingLabel,
  formatIntensityLabel,
  getAdHocPreviewItems,
} from '../formatters'

export interface SidebarAdHocDetail {
  id: string
  inputType: string
  workoutName: string | null
  parsedType: string | null
  parsedStructure: Record<string, unknown> | null
  workoutDate: string
}

export function AdHocDetailPanel({ workout, isGlass = false }: { workout: UnifiedCalendarItem; isGlass?: boolean }) {
  const [detail, setDetail] = useState<SidebarAdHocDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/adhoc-workouts/${workout.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((response) => {
        if (!cancelled) {
          setDetail(response?.data || null)
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
  }, [workout.id])

  const parsed = detail?.parsedStructure || {}
  const distance = formatDistanceValue(parsed.distance)
  const duration = typeof parsed.duration === 'number' ? parsed.duration : null
  const avgPace = typeof parsed.avgPace === 'string' ? parsed.avgPace : null
  const avgHeartRate = typeof parsed.avgHeartRate === 'number' ? parsed.avgHeartRate : null
  const intensity = typeof parsed.intensity === 'string' ? parsed.intensity : (workout.metadata.intensity as string | undefined) || 'MODERATE'
  const feeling = typeof parsed.feeling === 'string' ? parsed.feeling : null
  const notes = typeof parsed.notes === 'string' ? parsed.notes : null
  const strengthCount = Array.isArray(parsed.strengthExercises) ? parsed.strengthExercises.length : 0
  const cardioCount = Array.isArray(parsed.cardioSegments) ? parsed.cardioSegments.length : 0
  const hybridCount = Array.isArray(parsed.hybridMovements) ? parsed.hybridMovements.length : 0
  const previewItems = getAdHocPreviewItems(parsed)

  return (
    <div className={cn(
      'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      isGlass
        ? 'bg-teal-500/5 border-teal-500/20 shadow-[0_4px_20px_rgba(20,184,166,0.12)]'
        : 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-teal-500">
          <CheckCircle2 className="h-4 w-4" />
          Ad-hoc detaljer
        </h4>
        <Badge variant="secondary" className={cn(
          'text-[10px] uppercase font-bold tracking-tight',
          isGlass ? 'bg-emerald-500/20 text-emerald-400 border-none px-2' : 'bg-green-100 text-green-700'
        )}>
          Genomfört
        </Badge>
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className={cn('flex items-center gap-2 text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Laddar ad-hoc-detaljer
          </div>
        )}

        <div>
          <p className={cn('font-black text-lg tracking-tight', isGlass ? 'text-white' : '')}>{workout.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={cn('text-xs', INTENSITY_COLORS[intensity] || 'bg-yellow-500', 'text-white')}>
              {formatIntensityLabel(intensity)}
            </Badge>
            <Badge variant="outline" className={cn(
              'text-[10px] uppercase font-bold border-none px-2',
              isGlass ? 'bg-white/5 text-slate-400' : 'text-xs'
            )}>
              {formatAdHocTypeLabel(detail?.parsedType)}
            </Badge>
            <span className={cn(
              'text-[10px] uppercase tracking-widest font-bold',
              isGlass ? 'text-slate-500' : 'text-muted-foreground'
            )}>
              {formatAdHocInputType(detail?.inputType)}
            </span>
          </div>
        </div>

        {(duration || distance.label || avgPace || avgHeartRate) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {duration ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tid</p>
                <p className="font-semibold">{duration} min</p>
              </div>
            ) : null}
            {distance.label ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Distans</p>
                <p className="font-semibold">{distance.label}</p>
              </div>
            ) : null}
            {avgPace ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tempo</p>
                <p className="font-semibold">{avgPace}</p>
              </div>
            ) : null}
            {avgHeartRate ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Puls</p>
                <p className="font-semibold">{avgHeartRate} bpm</p>
              </div>
            ) : null}
          </div>
        )}

        {(strengthCount > 0 || cardioCount > 0 || hybridCount > 0 || feeling) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {strengthCount > 0 ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Dumbbell className="h-3 w-3" /> Styrkeövningar</p>
                <p className="font-semibold">{strengthCount}</p>
              </div>
            ) : null}
            {cardioCount > 0 ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Konditionsblock</p>
                <p className="font-semibold">{cardioCount}</p>
              </div>
            ) : null}
            {hybridCount > 0 ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Hybridmoment</p>
                <p className="font-semibold">{hybridCount}</p>
              </div>
            ) : null}
            {feeling ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">Känsla</p>
                <p className="font-semibold">{formatFeelingLabel(feeling)}</p>
              </div>
            ) : null}
          </div>
        )}

        {previewItems.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Innehåll</p>
            <div className="flex flex-wrap gap-2">
              {previewItems.map((item) => (
                <span
                  key={item}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-semibold',
                    isGlass ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-background'
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {notes ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Anteckningar</p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{notes}</p>
          </div>
        ) : (
          !isLoading && (
            <p className={cn('text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
              Inga extra detaljer registrerade för detta ad-hoc-pass.
            </p>
          )
        )}
      </div>
    </div>
  )
}
