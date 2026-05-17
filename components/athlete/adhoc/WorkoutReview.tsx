'use client'

/**
 * Workout Review Component
 *
 * Shows the AI-parsed workout for review and confirmation.
 * Allows editing before final save.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Check,
  AlertCircle,
  Clock,
  MapPin,
  Activity,
  Dumbbell,
  Heart,
  Zap,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { formatParsedWorkoutDistanceKm, getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface WorkoutReviewProps {
  parsedWorkout: ParsedWorkout
  onConfirm: (data: {
    parsedStructure?: ParsedWorkout
    perceivedEffort?: number
    feeling?: 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'EXHAUSTED'
    notes?: string
  }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

const FEELING_OPTIONS = [
  { value: 'GREAT', labelKey: 'great', emoji: '🔥' },
  { value: 'GOOD', labelKey: 'good', emoji: '😊' },
  { value: 'OKAY', labelKey: 'okay', emoji: '😐' },
  { value: 'TIRED', labelKey: 'tired', emoji: '😓' },
  { value: 'EXHAUSTED', labelKey: 'exhausted', emoji: '😫' },
]

const TYPE_LABELS: Record<string, { labelKey: string; color: string }> = {
  CARDIO: { labelKey: 'cardio', color: 'bg-blue-500' },
  STRENGTH: { labelKey: 'strength', color: 'bg-orange-500' },
  HYBRID: { labelKey: 'hybrid', color: 'bg-purple-500' },
  MIXED: { labelKey: 'mixed', color: 'bg-gray-500' },
}

const INTENSITY_LABELS: Record<string, string> = {
  RECOVERY: 'recovery',
  EASY: 'easy',
  MODERATE: 'moderate',
  THRESHOLD: 'threshold',
  INTERVAL: 'interval',
  MAX: 'max',
}

export function WorkoutReview({
  parsedWorkout,
  onConfirm,
  onCancel,
  isSubmitting,
}: WorkoutReviewProps) {
  const t = useTranslations('components.adHocWorkoutReview')
  const [editMode, setEditMode] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Editable fields
  const [duration, setDuration] = useState(parsedWorkout.duration?.toString() || '')
  const [distance, setDistance] = useState(() => {
    const distanceKm = getParsedWorkoutDistanceKm(parsedWorkout)
    return distanceKm !== null ? distanceKm.toString() : ''
  })
  const [rpe, setRpe] = useState(parsedWorkout.perceivedEffort || 6)
  const [feeling, setFeeling] = useState<typeof FEELING_OPTIONS[0]['value'] | undefined>(
    parsedWorkout.feeling
  )
  const [notes, setNotes] = useState(parsedWorkout.notes || '')

  const typeInfo = TYPE_LABELS[parsedWorkout.type] || TYPE_LABELS.MIXED
  const confidencePercent = Math.round((parsedWorkout.confidence || 0) * 100)

  const handleConfirm = async () => {
    const updatedWorkout: ParsedWorkout = {
      ...parsedWorkout,
      duration: duration ? parseInt(duration) : parsedWorkout.duration,
      distance: distance ? Math.round(parseFloat(distance) * 1000) : parsedWorkout.distance,
      perceivedEffort: rpe,
      feeling: feeling as ParsedWorkout['feeling'],
      notes,
    }

    await onConfirm({
      parsedStructure: editMode ? updatedWorkout : undefined,
      perceivedEffort: rpe,
      feeling: feeling as 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'EXHAUSTED',
      notes,
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {parsedWorkout.name || t('fallbackWorkoutName')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-white', typeInfo.color)}>
                {t(`types.${typeInfo.labelKey}`)}
              </Badge>
              {parsedWorkout.intensity && (
                <Badge variant="outline">
                  {INTENSITY_LABELS[parsedWorkout.intensity]
                    ? t(`intensities.${INTENSITY_LABELS[parsedWorkout.intensity]}`)
                    : parsedWorkout.intensity}
                </Badge>
              )}
            </div>
          </div>

          {/* Confidence indicator */}
          <div className="text-right">
            <div
              className={cn(
                'text-sm font-medium',
                confidencePercent >= 80
                  ? 'text-green-600'
                  : confidencePercent >= 60
                  ? 'text-yellow-600'
                  : 'text-red-600'
              )}
            >
              {t('confidence', { percent: confidencePercent })}
            </div>
            <div className="text-xs text-muted-foreground">{t('aiInterpretation')}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Warnings */}
        {parsedWorkout.warnings && parsedWorkout.warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {t('warnings.title')}
                </p>
                {parsedWorkout.warnings.map((warning, i) => (
                  <p key={i} className="text-sm text-yellow-700 dark:text-yellow-300">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {parsedWorkout.duration && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{parsedWorkout.duration} min</div>
                <div className="text-xs text-muted-foreground">{t('metrics.time')}</div>
              </div>
            </div>
          )}

          {parsedWorkout.distance && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{formatParsedWorkoutDistanceKm(parsedWorkout)} km</div>
                <div className="text-xs text-muted-foreground">{t('metrics.distance')}</div>
              </div>
            </div>
          )}

          {parsedWorkout.avgHeartRate && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{parsedWorkout.avgHeartRate} bpm</div>
                <div className="text-xs text-muted-foreground">{t('metrics.avgHeartRate')}</div>
              </div>
            </div>
          )}

          {parsedWorkout.elevationGain && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{parsedWorkout.elevationGain} m</div>
                <div className="text-xs text-muted-foreground">{t('metrics.elevationGain')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Strength exercises */}
        {parsedWorkout.strengthExercises && parsedWorkout.strengthExercises.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('strength.exercises')}</span>
            </div>
            <div className="grid gap-2">
              {parsedWorkout.strengthExercises.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded border bg-background"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ex.exerciseName}</span>
                    {ex.isCustom && (
                      <Badge variant="outline" className="text-xs">
                        {t('strength.newExercise')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {ex.sets}x{ex.reps}
                    {ex.weight && ` @ ${ex.weight}kg`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hybrid movements */}
        {parsedWorkout.movements && parsedWorkout.movements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {parsedWorkout.hybridFormat || 'Workout'}
                {parsedWorkout.repScheme && ` (${parsedWorkout.repScheme})`}
              </span>
            </div>
            <div className="grid gap-1">
              {parsedWorkout.movements.map((m, i) => (
                <div key={i} className="text-sm p-2 rounded bg-muted/50">
                  {m.reps && `${m.reps} `}
                  {m.name}
                  {m.weight && ` (${m.weight}${m.weightUnit || 'kg'})`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI interpretation */}
        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setShowDetails(!showDetails)}
        >
          <span className="text-sm">{t('aiInterpretation')}</span>
          {showDetails ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {showDetails && (
          <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
            {parsedWorkout.rawInterpretation}
          </div>
        )}

        <Separator />

        {/* Edit mode toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('edit.title')}</span>
          <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
            <Edit2 className="h-4 w-4 mr-1" />
            {editMode ? t('actions.hide') : t('actions.show')}
          </Button>
        </div>

        {editMode && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">{t('edit.duration')}</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance">{t('edit.distance')}</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="5.0"
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Subjective data */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('subjective.rpe')}</Label>
              <span className="text-sm font-medium">{rpe}/10</span>
            </div>
            <Slider
              value={[rpe]}
              onValueChange={([value]) => setRpe(value)}
              min={1}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('subjective.easy')}</span>
              <span>Max</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('subjective.feeling')}</Label>
            <div className="flex flex-wrap gap-2">
              {FEELING_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={feeling === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFeeling(option.value)}
                >
                  {option.emoji} {t(`feelings.${option.labelKey}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('subjective.notes')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('subjective.notesPlaceholder')}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
          {t('actions.cancel')}
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('actions.saving')}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {t('actions.confirm')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
