
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardFooter,
  GlassCardHeader,
  GlassCardTitle
} from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Route,
  Play,
  Calendar,
  Zap,
  CheckCircle2,
  SkipForward,
  MapPin,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'
type AssignmentStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'

interface CardioSessionCardProps {
  id: string
  sessionId: string
  sessionName: string
  description?: string
  sport: string
  assignedDate: string
  status: AssignmentStatus
  totalDuration?: number
  totalDistance?: number
  segmentCount: number
  completedSegments?: number
  segmentTypes?: SegmentType[]
  notes?: string
  // Scheduling fields
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
  location?: { id: string; name: string } | null
  onStartFocusMode: (assignmentId: string) => void
}

const STATUS_BADGES: Record<AssignmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Planerad', className: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300' },
  SCHEDULED: { label: 'Pågående', className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  COMPLETED: { label: 'Slutförd', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
  SKIPPED: { label: 'Hoppades över', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  MODIFIED: { label: 'Modifierad', className: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
}

const SPORT_NAMES: Record<string, string> = {
  RUNNING: 'Löpning',
  CYCLING: 'Cykling',
  SWIMMING: 'Simning',
  SKIING: 'Längdskidor',
}

const SEGMENT_COLORS: Record<SegmentType, string> = {
  WARMUP: 'bg-amber-500',
  COOLDOWN: 'bg-blue-500',
  INTERVAL: 'bg-red-500',
  STEADY: 'bg-emerald-500',
  RECOVERY: 'bg-sky-500',
  HILL: 'bg-orange-500',
  DRILLS: 'bg-purple-500',
}

export function CardioSessionCard({
  id,
  sessionId,
  sessionName,
  description,
  sport,
  assignedDate,
  status,
  totalDuration,
  totalDistance,
  segmentCount,
  completedSegments = 0,
  segmentTypes = [],
  notes,
  startTime,
  endTime,
  locationName,
  location,
  onStartFocusMode,
}: CardioSessionCardProps) {
  const isCompleted = status === 'COMPLETED'
  const isInProgress = status === 'SCHEDULED'
  const progressPercent = segmentCount > 0 ? (completedSegments / segmentCount) * 100 : 0

  // Format duration
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

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Idag'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Imorgon'
    }
    return date.toLocaleDateString('sv-SE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get unique segment types for display
  const uniqueSegmentTypes = [...new Set(segmentTypes)]

  return (
    <GlassCard className={cn(
      'transition-all duration-300 hover:shadow-md dark:border-white/5',
      isCompleted && 'opacity-75',
      isInProgress && 'ring-2 ring-blue-500 dark:ring-blue-500/50'
    )}>
      <GlassCardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10">
                {SPORT_NAMES[sport] || sport}
              </Badge>
              <Badge className={cn('text-[10px] font-black uppercase tracking-wider', STATUS_BADGES[status].className)}>
                {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {STATUS_BADGES[status].label}
              </Badge>
            </div>
            <GlassCardTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{sessionName}</GlassCardTitle>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Calendar className="h-3 w-3" />
              {formatDate(assignedDate)}
            </div>
          </div>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* Scheduled time and location */}
        {(startTime || locationName || location?.name) && (
          <div className="flex items-center gap-3 flex-wrap">
            {startTime && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <Timer className="h-3.5 w-3.5" />
                {startTime}{endTime && ` - ${endTime}`}
              </span>
            )}
            {(locationName || location?.name) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-bold">
                <MapPin className="h-3.5 w-3.5" />
                {locationName || location?.name}
              </span>
            )}
          </div>
        )}

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-xs font-medium flex-wrap">
          {totalDuration && (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              {formatDuration(totalDuration)}
            </div>
          )}
          {totalDistance && (
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <Route className="h-3.5 w-3.5 text-emerald-500" />
              {formatDistance(totalDistance)}
            </div>
          )}
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            {segmentCount} segment
          </div>
        </div>

        {/* Segment type indicators */}
        {uniqueSegmentTypes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {uniqueSegmentTypes.map((type) => (
              <div
                key={type}
                className={cn('h-1.5 w-6 rounded-full', SEGMENT_COLORS[type])}
                title={type}
              />
            ))}
          </div>
        )}

        {/* Progress for in-progress sessions */}
        {isInProgress && segmentCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              <span>Framsteg</span>
              <span>{completedSegments}/{segmentCount}</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Description or notes */}
        {(description || notes) && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {notes || description}
          </p>
        )}
      </GlassCardContent>

      <GlassCardFooter>
        {isCompleted ? (
          <Button variant="outline" className="w-full bg-slate-50 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Slutförd
          </Button>
        ) : isInProgress ? (
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" onClick={() => onStartFocusMode(id)}>
            <Play className="h-4 w-4 mr-2" />
            Fortsätt pass
          </Button>
        ) : (
          <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg transition-all" onClick={() => onStartFocusMode(id)}>
            <Play className="h-4 w-4 mr-2" />
            Starta Focus Mode
          </Button>
        )}
      </GlassCardFooter>
    </GlassCard>
  )
}

export default CardioSessionCard
