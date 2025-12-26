'use client'

/**
 * CardioWorkoutStartScreen Component
 *
 * Pre-workout screen showing session overview before starting Focus Mode.
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Clock,
  Route,
  Heart,
  Zap,
  Play,
  X,
  ChevronRight,
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
  WARMUP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COOLDOWN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INTERVAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  STEADY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RECOVERY: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  HILL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DRILLS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Förbered dig</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Session info */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-xs">
            {SPORT_NAMES[sport] || sport}
          </Badge>
          <h2 className="text-2xl font-bold">{sessionName}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">
                {totalDuration ? formatDuration(totalDuration) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Tid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Route className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">
                {totalDistance ? formatDistance(totalDistance) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Distans</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{segments.length}</p>
              <p className="text-xs text-muted-foreground">Segment</p>
            </CardContent>
          </Card>
        </div>

        {/* Segment breakdown */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Segmentöversikt
            </h3>
            <div className="space-y-2">
              {Object.entries(segmentsByType).map(([type, data]) => (
                <div
                  key={type}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', SEGMENT_COLORS[type as SegmentType])}>
                      {SEGMENT_NAMES[type as SegmentType] || type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">×{data.count}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatDuration(data.totalDuration)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Zone distribution */}
        {totalZoneTime > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Zonfördelning
              </h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((zone) => {
                  const zoneTime = zoneCounts[zone] || 0
                  const percentage = totalZoneTime > 0 ? (zoneTime / totalZoneTime) * 100 : 0
                  if (zoneTime === 0) return null
                  return (
                    <div key={zone} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>Zon {zone}</span>
                        <span className="text-muted-foreground">
                          {formatDuration(zoneTime)} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            zone === 1 && 'bg-gray-400',
                            zone === 2 && 'bg-blue-400',
                            zone === 3 && 'bg-green-400',
                            zone === 4 && 'bg-yellow-400',
                            zone === 5 && 'bg-red-400'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Segment list preview */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Segment i ordning</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {segments.slice(0, 10).map((segment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <Badge
                      className={cn('text-xs', SEGMENT_COLORS[segment.type])}
                    >
                      {SEGMENT_NAMES[segment.type] || segment.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {segment.plannedDuration && (
                      <span>{formatDuration(segment.plannedDuration)}</span>
                    )}
                    {segment.plannedZone && (
                      <Badge variant="outline" className="text-xs">
                        Z{segment.plannedZone}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              ))}
              {segments.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{segments.length - 10} fler segment
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer with start button */}
      <div className="p-4 border-t bg-background">
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={onStart}
        >
          <Play className="h-5 w-5 mr-2" />
          Starta träningspass
        </Button>
      </div>
    </div>
  )
}

export default CardioWorkoutStartScreen
