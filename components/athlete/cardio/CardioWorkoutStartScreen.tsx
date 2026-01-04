'use client'

/**
 * CardioWorkoutStartScreen Component
 *
 * Pre-workout screen showing session overview before starting Focus Mode.
 */


import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle
} from '@/components/ui/GlassCard'
import {
  Clock,
  Route,
  Heart,
  Zap,
  Play,
  X,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

interface Segment {
  type: SegmentType
  plannedDuration?: number
  plannedDistance?: number
  plannedZone?: number
}

interface CardioWorkoutStartScreenProps {
  sessionName: string
  description?: string
  sport: string
  totalDuration?: number
  totalDistance?: number
  segments: Segment[]
  segmentsByType: Record<string, { count: number; totalDuration: number }>
  onStart: () => void
  onCancel: () => void
}

const SEGMENT_COLORS: Record<SegmentType, string> = {
  WARMUP: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  COOLDOWN: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  INTERVAL: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  STEADY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  RECOVERY: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
  HILL: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  DRILLS: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
}

const SEGMENT_NAMES: Record<SegmentType, string> = {
  WARMUP: 'Uppvärmning',
  COOLDOWN: 'Nedvarvning',
  INTERVAL: 'Intervall',
  STEADY: 'Jämnt tempo',
  RECOVERY: 'Återhämtning',
  HILL: 'Backar',
  DRILLS: 'Övningar',
}

const SPORT_NAMES: Record<string, string> = {
  RUNNING: 'Löpning',
  CYCLING: 'Cykling',
  SWIMMING: 'Simning',
  SKIING: 'Längdskidor',
}

export function CardioWorkoutStartScreen({
  sessionName,
  description,
  sport,
  totalDuration,
  totalDistance,
  segments,
  segmentsByType,
  onStart,
  onCancel,
}: CardioWorkoutStartScreenProps) {
  // Format duration in minutes
  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainingMins = mins % 60
      return `${hours}h ${remainingMins}min`
    }
    return `${mins} min`
  }

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${meters} m`
  }

  // Calculate zone distribution
  const zoneCounts = segments.reduce((acc, seg) => {
    if (seg.plannedZone) {
      acc[seg.plannedZone] = (acc[seg.plannedZone] || 0) + (seg.plannedDuration || 0)
    }
    return acc
  }, {} as Record<number, number>)

  const totalZoneTime = Object.values(zoneCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onCancel} className="hover:bg-slate-100 dark:hover:bg-white/10">
          <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        </Button>
        <h1 className="font-black tracking-tight text-slate-900 dark:text-white uppercase">Förbered dig</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {/* Session info */}
        <div className="text-center space-y-3 pt-4">
          <Badge variant="outline" className="text-xs font-bold border-slate-200 dark:border-white/10 px-3 py-1">
            {SPORT_NAMES[sport] || sport}
          </Badge>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter leading-none">{sessionName}</h2>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">{description}</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/5">
            <GlassCardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-blue-500 mb-2" />
              <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {totalDuration ? formatDuration(totalDuration) : '-'}
              </p>
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Tid</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/5">
            <GlassCardContent className="p-4 text-center">
              <Route className="h-5 w-5 mx-auto text-emerald-500 mb-2" />
              <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {totalDistance ? formatDistance(totalDistance) : '-'}
              </p>
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Distans</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/5">
            <GlassCardContent className="p-4 text-center">
              <Layers className="h-5 w-5 mx-auto text-purple-500 mb-2" />
              <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{segments.length}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Segment</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Segment breakdown */}
        <GlassCard>
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-lg font-black flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Segmentöversikt
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="pt-2">
            <div className="space-y-1">
              {Object.entries(segmentsByType).map(([type, data]) => (
                <div
                  key={type}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-[10px] font-bold uppercase tracking-wider border-0', SEGMENT_COLORS[type as SegmentType])}>
                      {SEGMENT_NAMES[type as SegmentType] || type}
                    </Badge>
                    <span className="text-xs font-bold text-slate-400">×{data.count}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {formatDuration(data.totalDuration)}
                  </span>
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Zone distribution */}
        {totalZoneTime > 0 && (
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-lg font-black flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-500" />
                Zonfördelning
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="pt-2">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((zone) => {
                  const zoneTime = zoneCounts[zone] || 0
                  const percentage = totalZoneTime > 0 ? (zoneTime / totalZoneTime) * 100 : 0
                  if (zoneTime === 0) return null
                  return (
                    <div key={zone} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-600 dark:text-slate-300 font-bold">Zon {zone}</span>
                        <span className="text-slate-400">
                          {formatDuration(zoneTime)} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            zone === 1 && 'bg-slate-400',
                            zone === 2 && 'bg-blue-400',
                            zone === 3 && 'bg-emerald-400',
                            zone === 4 && 'bg-amber-400',
                            zone === 5 && 'bg-red-500'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Segment list preview */}
        <GlassCard>
          <GlassCardHeader className="pb-2">
            <GlassCardTitle className="text-lg font-black">Segment i ordning</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="pt-2">
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {segments.slice(0, 10).map((segment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4 text-right">
                      {index + 1}.
                    </span>
                    <Badge
                      className={cn('text-[10px] font-bold uppercase tracking-wider border-0', SEGMENT_COLORS[segment.type])}
                    >
                      {SEGMENT_NAMES[segment.type] || segment.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {segment.plannedDuration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(segment.plannedDuration)}
                      </span>
                    )}
                    {segment.plannedZone && (
                      <Badge variant="outline" className="text-[10px] h-5 border-slate-200 dark:border-white/10">
                        Z{segment.plannedZone}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {segments.length > 10 && (
                <p className="text-xs font-medium text-slate-400 text-center py-2">
                  +{segments.length - 10} fler segment
                </p>
              )}
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Footer with start button */}
      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10">
        <Button
          size="lg"
          className="w-full h-14 text-lg font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]"
          onClick={onStart}
        >
          <Play className="h-5 w-5 mr-2 fill-current" />
          Starta träningspass
        </Button>
      </div>
    </div>
  )
}

export default CardioWorkoutStartScreen
