'use client'

/**
 * HybridWorkoutCard Component
 *
 * Card for displaying hybrid workout on athlete dashboard.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Clock,
  Repeat,
  Dumbbell,
  Play,
  Calendar,
  CheckCircle2,
  Timer,
  Flame,
  Target,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type HybridFormat =
  | 'FOR_TIME'
  | 'AMRAP'
  | 'EMOM'
  | 'TABATA'
  | 'CHIPPER'
  | 'LADDER'
  | 'INTERVALS'
  | 'HYROX_SIM'

type AssignmentStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'MODIFIED'

interface HybridWorkoutCardProps {
  id: string
  workoutId: string
  workoutName: string
  description?: string
  format: HybridFormat
  assignedDate: string
  status: AssignmentStatus
  timeCap?: number
  totalRounds?: number
  repScheme?: string
  movementCount: number
  scalingLevel: string
  isBenchmark: boolean
  benchmarkSource?: string
  notes?: string
  // Scheduling fields
  startTime?: string | null
  endTime?: string | null
  locationName?: string | null
  location?: { id: string; name: string } | null
  onStartFocusMode: (assignmentId: string) => void
}

const STATUS_BADGES: Record<AssignmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Planerad', className: 'bg-gray-100 text-gray-700' },
  SCHEDULED: { label: 'Pågående', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Slutförd', className: 'bg-green-100 text-green-700' },
  SKIPPED: { label: 'Hoppades över', className: 'bg-yellow-100 text-yellow-700' },
  MODIFIED: { label: 'Modifierad', className: 'bg-purple-100 text-purple-700' },
}

const FORMAT_INFO: Record<HybridFormat, { label: string; badge: string; icon: React.ReactNode }> = {
  FOR_TIME: {
    label: 'For Time',
    badge: 'bg-blue-100 text-blue-700',
    icon: <Timer className="h-3 w-3" />,
  },
  AMRAP: {
    label: 'AMRAP',
    badge: 'bg-red-100 text-red-700',
    icon: <Repeat className="h-3 w-3" />,
  },
  EMOM: {
    label: 'EMOM',
    badge: 'bg-green-100 text-green-700',
    icon: <Clock className="h-3 w-3" />,
  },
  TABATA: {
    label: 'Tabata',
    badge: 'bg-orange-100 text-orange-700',
    icon: <Flame className="h-3 w-3" />,
  },
  CHIPPER: {
    label: 'Chipper',
    badge: 'bg-purple-100 text-purple-700',
    icon: <Target className="h-3 w-3" />,
  },
  LADDER: {
    label: 'Ladder',
    badge: 'bg-indigo-100 text-indigo-700',
    icon: <Target className="h-3 w-3" />,
  },
  INTERVALS: {
    label: 'Intervaller',
    badge: 'bg-teal-100 text-teal-700',
    icon: <Timer className="h-3 w-3" />,
  },
  HYROX_SIM: {
    label: 'HYROX',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: <Flame className="h-3 w-3" />,
  },
}

const SCALING_BADGES: Record<string, string> = {
  RX: 'bg-green-100 text-green-700',
  SCALED: 'bg-blue-100 text-blue-700',
  CUSTOM: 'bg-purple-100 text-purple-700',
  FOUNDATIONS: 'bg-gray-100 text-gray-700',
}

export function HybridWorkoutCard({
  id,
  workoutId,
  workoutName,
  description,
  format,
  assignedDate,
  status,
  timeCap,
  totalRounds,
  repScheme,
  movementCount,
  scalingLevel,
  isBenchmark,
  benchmarkSource,
  notes,
  startTime,
  endTime,
  locationName,
  location,
  onStartFocusMode,
}: HybridWorkoutCardProps) {
  const isCompleted = status === 'COMPLETED'
  const isInProgress = status === 'SCHEDULED'
  const formatInfo = FORMAT_INFO[format]

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
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

  return (
    <Card
      className={cn(
        'transition-all',
        isCompleted && 'opacity-75',
        isInProgress && 'ring-2 ring-blue-500'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('text-xs', formatInfo.badge)}>
                {formatInfo.icon}
                <span className="ml-1">{formatInfo.label}</span>
              </Badge>
              <Badge className={cn('text-xs', SCALING_BADGES[scalingLevel])}>
                {scalingLevel}
              </Badge>
              <Badge className={cn('text-xs', STATUS_BADGES[status].className)}>
                {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {STATUS_BADGES[status].label}
              </Badge>
            </div>
            <CardTitle className="text-lg">{workoutName}</CardTitle>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
              <Calendar className="h-3 w-3" />
              {formatDate(assignedDate)}
            </div>
            {startTime && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 justify-end">
                <Timer className="h-3 w-3" />
                {startTime}{endTime && ` - ${endTime}`}
              </div>
            )}
            {(locationName || location?.name) && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 justify-end">
                <MapPin className="h-3 w-3" />
                {locationName || location?.name}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm">
          {timeCap && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(timeCap)}
            </div>
          )}
          {totalRounds && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Repeat className="h-4 w-4" />
              {totalRounds} rundor
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            {movementCount} övningar
          </div>
        </div>

        {/* Rep scheme */}
        {repScheme && (
          <div className="text-center py-2 bg-muted/50 rounded-lg">
            <span className="text-lg font-bold">{repScheme}</span>
          </div>
        )}

        {/* Benchmark badge */}
        {isBenchmark && benchmarkSource && (
          <Badge variant="outline" className="text-xs">
            {benchmarkSource} Benchmark
          </Badge>
        )}

        {/* Description or notes */}
        {(description || notes) && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notes || description}
          </p>
        )}
      </CardContent>

      <CardFooter>
        {isCompleted ? (
          <Button variant="outline" className="w-full" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Slutförd
          </Button>
        ) : isInProgress ? (
          <Button className="w-full" onClick={() => onStartFocusMode(id)}>
            <Play className="h-4 w-4 mr-2" />
            Fortsätt pass
          </Button>
        ) : (
          <Button className="w-full" onClick={() => onStartFocusMode(id)}>
            <Play className="h-4 w-4 mr-2" />
            Starta Focus Mode
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default HybridWorkoutCard
