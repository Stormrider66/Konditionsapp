'use client'

/**
 * SegmentLoggingForm Component
 *
 * Form to log actual values after completing a cardio segment.
 */

import { useState, useEffect, useRef } from 'react'
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
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS' | 'CORE' | 'PREHAB' | 'PLYOMETRIC'

interface SegmentLoggingFormProps {
  segmentIndex: number
  segmentType: SegmentType
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  plannedPower?: number
  showPower?: boolean
  isBenchmark?: boolean
  /** When set, the following rest runs as a live countdown that auto-submits. */
  restCountdownSeconds?: number
  /** Auto-submit when the rest countdown reaches this (the get-ready pre-roll takes the rest). Default 0. */
  restHandoffAt?: number
  timerDuration?: number // Actual time from timer
  onSubmit: (data: {
    actualDuration?: number
    actualDistance?: number
    actualPace?: number
    actualAvgHR?: number
    actualMaxHR?: number
    actualAvgPower?: number
    actualMaxPower?: number
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
  CORE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  PREHAB: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  PLYOMETRIC: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export function SegmentLoggingForm({
  segmentIndex,
  segmentType,
  typeName,
  plannedDuration,
  plannedDistance,
  plannedPace,
  plannedZone,
  plannedPower,
  showPower = false,
  isBenchmark = false,
  restCountdownSeconds,
  restHandoffAt = 0,
  timerDuration,
  onSubmit,
  onSkip,
}: SegmentLoggingFormProps) {
  const t = useTranslations('components.segmentLoggingForm')
  const [actualDuration, setActualDuration] = useState<string>(() => {
    // Pre-fill the actual time from the elapsed timer, falling back to the
    // planned duration so it's never blank when the form opens.
    const seconds = timerDuration || plannedDuration
    return seconds ? String(Math.round(seconds / 60)) : ''
  })
  const [actualDistance, setActualDistance] = useState<string>('')
  const [actualAvgHR, setActualAvgHR] = useState<string>('')
  const [actualMaxHR, setActualMaxHR] = useState<string>('')
  const [actualAvgPower, setActualAvgPower] = useState<string>('')
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
      actualAvgPower: actualAvgPower ? parseInt(actualAvgPower) : undefined,
      completed: true,
      skipped: false,
      notes: notes || undefined,
    })
  }

  // Run the following rest as a live countdown; auto-submit at 0 so the athlete
  // logs data while resting and rolls straight into the next interval.
  const [restLeft, setRestLeft] = useState(restCountdownSeconds ?? 0)
  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit
  const autoSubmittedRef = useRef(false)
  useEffect(() => {
    if (!restCountdownSeconds) return
    const id = setInterval(() => {
      setRestLeft((prev) => {
        // Hand off to the get-ready pre-roll (or finish) at restHandoffAt, holding
        // the last shown value so the pre-roll continues the count seamlessly.
        if (prev - 1 <= restHandoffAt) {
          clearInterval(id)
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true
            submitRef.current()
          }
          return prev
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [restCountdownSeconds, restHandoffAt])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Badge className={cn(SEGMENT_COLORS[segmentType])}>
            {typeName}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('segmentCounter', { number: segmentIndex + 1 })}
          </span>
        </div>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rest countdown — the following rest runs here while data is logged */}
        {restCountdownSeconds ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-sky-100 dark:bg-sky-900/20 py-2">
            <Clock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span className="text-2xl font-black tabular-nums text-sky-700 dark:text-sky-300">{formatDuration(restLeft)}</span>
          </div>
        ) : null}

        {/* Planned values reference */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {t('planned')}
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
                {t('zone', { zone: plannedZone })}
              </div>
            )}
            {plannedPower != null && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-muted-foreground" />
                {plannedPower} W
              </div>
            )}
          </div>
        </div>

        {/* Opener (benchmark) watts — anchors every "% of opener" target */}
        {showPower && isBenchmark && (
          <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-900/20">
            <Label htmlFor="avgPower" className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Zap className="h-3 w-3 text-amber-500" /> {t('fields.avgPower')}
            </Label>
            <Input
              id="avgPower"
              type="number"
              inputMode="numeric"
              placeholder="-"
              value={actualAvgPower}
              onChange={(e) => setActualAvgPower(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 bg-white/70 text-lg font-semibold text-foreground dark:bg-black/20"
            />
            <p className="text-xs text-muted-foreground">{t('openerHint')}</p>
          </div>
        )}

        {/* Actual values form */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-medium text-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t('fields.duration')}
            </Label>
            <Input
              id="duration"
              type="number"
              inputMode="numeric"
              placeholder={timerDuration ? String(Math.round(timerDuration / 60)) : '-'}
              value={actualDuration}
              onChange={(e) => setActualDuration(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 bg-muted/40 text-lg font-semibold text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="distance" className="text-sm font-medium text-foreground flex items-center gap-1">
              <Route className="h-3 w-3" /> {t('fields.distance')}
            </Label>
            <Input
              id="distance"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="-"
              value={actualDistance}
              onChange={(e) => setActualDistance(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 bg-muted/40 text-lg font-semibold text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avgHR" className="text-sm font-medium text-foreground flex items-center gap-1">
              <Heart className="h-3 w-3" /> {t('fields.avgHeartRate')}
            </Label>
            <Input
              id="avgHR"
              type="number"
              inputMode="numeric"
              placeholder="-"
              value={actualAvgHR}
              onChange={(e) => setActualAvgHR(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 bg-muted/40 text-lg font-semibold text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxHR" className="text-sm font-medium text-foreground flex items-center gap-1">
              <Heart className="h-3 w-3" /> {t('fields.maxHeartRate')}
            </Label>
            <Input
              id="maxHR"
              type="number"
              inputMode="numeric"
              placeholder="-"
              value={actualMaxHR}
              onChange={(e) => setActualMaxHR(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 bg-muted/40 text-lg font-semibold text-foreground"
            />
          </div>

          {showPower && !isBenchmark && (
            <div className="space-y-2">
              <Label htmlFor="avgPower" className="text-sm font-medium text-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> {t('fields.avgPower')}
              </Label>
              <Input
                id="avgPower"
                type="number"
                inputMode="numeric"
                placeholder={plannedPower != null ? String(plannedPower) : '-'}
                value={actualAvgPower}
                onChange={(e) => setActualAvgPower(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                className="h-12 bg-muted/40 text-lg font-semibold text-foreground"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium text-foreground">
            {t('fields.notes')}
          </Label>
          <Textarea
            id="notes"
            placeholder={t('fields.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1 h-12 text-foreground"
            onClick={onSkip}
          >
            <SkipForward className="h-4 w-4 mr-2" />
            {t('actions.skip')}
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={handleSubmit}
          >
            <Check className="h-4 w-4 mr-2" />
            {t('actions.complete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SegmentLoggingForm
