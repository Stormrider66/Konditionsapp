'use client'

/**
 * CardioSessionCard Component
 *
 * Card for displaying cardio session on athlete dashboard.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Route,
  Play,
  Calendar,
  Zap,
  CheckCircle2,
  SkipForward,
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
  onStartFocusMode: (assignmentId: string) => void
}

const STATUS_BADGES: Record<AssignmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Planerad', className: 'bg-gray-100 text-gray-700' },
  SCHEDULED: { label: 'Pågående', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Slutförd', className: 'bg-green-100 text-green-700' },
  SKIPPED: { label: 'Hoppades över', className: 'bg-yellow-100 text-yellow-700' },
  MODIFIED: { label: 'Modifierad', className: 'bg-purple-100 text-purple-700' },
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
  STEADY: 'bg-green-500',
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
    <Card className={cn(
      'transition-all',
      isCompleted && 'opacity-75',
      isInProgress && 'ring-2 ring-blue-500'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {SPORT_NAMES[sport] || sport}
              </Badge>
              <Badge className={cn('text-xs', STATUS_BADGES[status].className)}>
                {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {STATUS_BADGES[status].label}
              </Badge>
            </div>
            <CardTitle className="text-lg">{sessionName}</CardTitle>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(assignedDate)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm">
          {totalDuration && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatDuration(totalDuration)}
            </div>
          )}
          {totalDistance && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Route className="h-4 w-4" />
              {formatDistance(totalDistance)}
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Zap className="h-4 w-4" />
            {segmentCount} segment
          </div>
        </div>

        {/* Segment type indicators */}
        {uniqueSegmentTypes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {uniqueSegmentTypes.map((type) => (
              <div
                key={type}
                className={cn('h-2 w-2 rounded-full', SEGMENT_COLORS[type])}
                title={type}
              />
            ))}
          </div>
        )}

        {/* Progress for in-progress sessions */}
        {isInProgress && segmentCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Framsteg</span>
              <span>{completedSegments}/{segmentCount}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
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

export default CardioSessionCard
