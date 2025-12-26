'use client'

/**
 * SegmentLoggingForm Component
 *
 * Form to log actual values after completing a cardio segment.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Route,
  Gauge,
  Heart,
  Check,
  SkipForward,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

interface SegmentLoggingFormProps {
  segmentIndex: number
  segmentType: SegmentType
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  timerDuration?: number // Actual time from timer
  onSubmit: (data: {
    actualDuration?: number
    actualDistance?: number
    actualPace?: number
    actualAvgHR?: number
    actualMaxHR?: number
    completed: boolean
    skipped: boolean
    notes?: string
  }) => void
  onSkip: () => void
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

export function SegmentLoggingForm({
  segmentIndex,
  segmentType,
  typeName,
  plannedDuration,
  plannedDistance,
  plannedPace,
  plannedZone,
  timerDuration,
  onSubmit,
  onSkip,
}: SegmentLoggingFormProps) {
  const [actualDuration, setActualDuration] = useState<string>(
    timerDuration ? String(Math.round(timerDuration / 60)) : ''
  )
  const [actualDistance, setActualDistance] = useState<string>('')
  const [actualAvgHR, setActualAvgHR] = useState<string>('')
  const [actualMaxHR, setActualMaxHR] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Format time for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format pace for display
  const formatPace = (paceSeconds: number) => {
    const mins = Math.floor(paceSeconds / 60)
    const secs = paceSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}/km`
  }

  const handleSubmit = () => {
    const durationSeconds = actualDuration
      ? parseInt(actualDuration) * 60
      : timerDuration

    onSubmit({
      actualDuration: durationSeconds,
      actualDistance: actualDistance ? parseFloat(actualDistance) : undefined,
      actualAvgHR: actualAvgHR ? parseInt(actualAvgHR) : undefined,
      actualMaxHR: actualMaxHR ? parseInt(actualMaxHR) : undefined,
      completed: true,
      skipped: false,
      notes: notes || undefined,
    })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Badge className={cn(SEGMENT_COLORS[segmentType])}>
            {typeName}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Segment {segmentIndex + 1}
          </span>
        </div>
        <CardTitle className="text-lg">Logga resultat</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Planned values reference */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Planerat
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            {plannedDuration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {formatDuration(plannedDuration)}
              </div>
            )}
            {plannedDistance && (
              <div className="flex items-center gap-1">
                <Route className="h-3 w-3 text-muted-foreground" />
                {plannedDistance.toFixed(2)} km
              </div>
            )}
            {plannedPace && (
              <div className="flex items-center gap-1">
                <Gauge className="h-3 w-3 text-muted-foreground" />
                {formatPace(plannedPace)}
              </div>
            )}
            {plannedZone && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-muted-foreground" />
                Zon {plannedZone}
              </div>
            )}
          </div>
        </div>

        {/* Actual values form */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tid (min)
            </Label>
            <Input
              id="duration"
              type="number"
              inputMode="numeric"
              placeholder={timerDuration ? String(Math.round(timerDuration / 60)) : '-'}
              value={actualDuration}
              onChange={(e) => setActualDuration(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="distance" className="text-sm flex items-center gap-1">
              <Route className="h-3 w-3" /> Distans (km)
            </Label>
            <Input
              id="distance"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="-"
              value={actualDistance}
              onChange={(e) => setActualDistance(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avgHR" className="text-sm flex items-center gap-1">
              <Heart className="h-3 w-3" /> Snitt puls
            </Label>
            <Input
              id="avgHR"
              type="number"
              inputMode="numeric"
              placeholder="-"
              value={actualAvgHR}
              onChange={(e) => setActualAvgHR(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxHR" className="text-sm flex items-center gap-1">
              <Heart className="h-3 w-3" /> Max puls
            </Label>
            <Input
              id="maxHR"
              type="number"
              inputMode="numeric"
              placeholder="-"
              value={actualMaxHR}
              onChange={(e) => setActualMaxHR(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm">
            Anteckningar (valfritt)
          </Label>
          <Textarea
            id="notes"
            placeholder="Hur kändes segmentet?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={onSkip}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Hoppa över
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={handleSubmit}
          >
            <Check className="h-4 w-4 mr-2" />
            Slutför
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SegmentLoggingForm
