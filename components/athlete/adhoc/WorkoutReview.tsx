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
  Copy,
  Minus,
  Plus,
} from 'lucide-react'
import type { ParsedStrengthExercise, ParsedStrengthSet, ParsedWorkout } from '@/lib/adhoc-workout/types'
import { formatParsedWorkoutDistanceKm, getParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'

interface WorkoutReviewProps {
  parsedWorkout: ParsedWorkout
  onConfirm: (data: {
    parsedStructure?: ParsedWorkout
    perceivedEffort?: number
    feeling?: FeelingValue
    notes?: string
  }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

type FeelingValue = 'GREAT' | 'GOOD' | 'OKAY' | 'TIRED' | 'EXHAUSTED'

const FEELING_VALUES: readonly FeelingValue[] = ['GREAT', 'GOOD', 'OKAY', 'TIRED', 'EXHAUSTED']

const FEELING_OPTIONS = [
  { value: 'GREAT', labelKey: 'great', emoji: '🔥' },
  { value: 'GOOD', labelKey: 'good', emoji: '😊' },
  { value: 'OKAY', labelKey: 'okay', emoji: '😐' },
  { value: 'TIRED', labelKey: 'tired', emoji: '😓' },
  { value: 'EXHAUSTED', labelKey: 'exhausted', emoji: '😫' },
] satisfies Array<{ value: FeelingValue; labelKey: string; emoji: string }>

function getValidFeeling(value: unknown): FeelingValue | undefined {
  return FEELING_VALUES.includes(value as FeelingValue) ? (value as FeelingValue) : undefined
}

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

type EditableSet = {
  setNumber: number
  weight: string
  repsCompleted: string
  repsTarget?: number
  rpe: string
  defaultReps: string
}

type EditableStrengthExercise = ParsedStrengthExercise & {
  actualSetsDraft: EditableSet[]
}

function clampSetCount(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(20, Math.max(1, Math.round(parsed)))
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function defaultRepsText(reps: ParsedStrengthExercise['reps']): string {
  if (typeof reps === 'number' && Number.isFinite(reps)) return String(reps)
  if (typeof reps !== 'string') return ''
  const match = reps.match(/\d+/)
  return match ? match[0] : ''
}

function createEditableSet(
  exercise: ParsedStrengthExercise,
  setNumber: number,
  actualSet?: ParsedStrengthSet
): EditableSet {
  const fallbackReps = defaultRepsText(exercise.reps)
  const targetReps = parseOptionalNumber(fallbackReps)

  return {
    setNumber,
    weight:
      actualSet?.weight !== undefined
        ? String(actualSet.weight)
        : exercise.weight !== undefined
          ? String(exercise.weight)
          : '',
    repsCompleted:
      actualSet?.repsCompleted !== undefined
        ? String(actualSet.repsCompleted)
        : fallbackReps,
    repsTarget: actualSet?.repsTarget ?? targetReps,
    rpe: actualSet?.rpe !== undefined ? String(actualSet.rpe) : '',
    defaultReps: fallbackReps,
  }
}

function buildEditableStrengthExercises(
  exercises: ParsedStrengthExercise[] | undefined
): EditableStrengthExercise[] {
  return (exercises || []).map((exercise) => {
    const existingSets = Array.isArray(exercise.actualSets) ? exercise.actualSets : []
    const setCount = clampSetCount(exercise.sets, existingSets.length || 1)

    return {
      ...exercise,
      actualSetsDraft: Array.from({ length: setCount }, (_, index) =>
        createEditableSet(exercise, index + 1, existingSets[index])
      ),
    }
  })
}

function materializeActualSets(exercise: EditableStrengthExercise): ParsedStrengthSet[] {
  const actualSets: ParsedStrengthSet[] = []

  for (const setRow of exercise.actualSetsDraft) {
    const weight = parseOptionalNumber(setRow.weight)
    const rpe = parseOptionalNumber(setRow.rpe)
    const reps = parseOptionalNumber(setRow.repsCompleted)
    const defaultReps = parseOptionalNumber(setRow.defaultReps)
    const repsChanged = reps !== undefined && (defaultReps === undefined || reps !== defaultReps)
    const hasActualData = weight !== undefined || rpe !== undefined || repsChanged

    if (!hasActualData) continue

    const actualSet: ParsedStrengthSet = {
      setNumber: setRow.setNumber,
    }
    const repsTarget = setRow.repsTarget ?? defaultReps

    if (weight !== undefined) actualSet.weight = weight
    if (reps !== undefined || defaultReps !== undefined) actualSet.repsCompleted = reps ?? defaultReps
    if (repsTarget !== undefined) actualSet.repsTarget = repsTarget
    if (rpe !== undefined) actualSet.rpe = Math.max(1, Math.min(10, Math.round(rpe)))

    actualSets.push(actualSet)
  }

  return actualSets
}

function materializeStrengthExercises(
  exercises: EditableStrengthExercise[]
): ParsedStrengthExercise[] {
  return exercises.map((editableExercise) => {
    const { actualSetsDraft: _actualSetsDraft, ...exercise } = editableExercise
    const actualSets = materializeActualSets(editableExercise)
    const nextExercise: ParsedStrengthExercise = { ...exercise }

    if (actualSets.length > 0) {
      nextExercise.actualSets = actualSets
    } else {
      delete nextExercise.actualSets
    }

    return nextExercise
  })
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
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<number | null>(() =>
    parsedWorkout.strengthExercises?.length ? 0 : null
  )
  const [strengthExercises, setStrengthExercises] = useState<EditableStrengthExercise[]>(() =>
    buildEditableStrengthExercises(parsedWorkout.strengthExercises)
  )

  // Editable fields
  const [duration, setDuration] = useState(parsedWorkout.duration?.toString() || '')
  const [distance, setDistance] = useState(() => {
    const distanceKm = getParsedWorkoutDistanceKm(parsedWorkout)
    return distanceKm !== null ? distanceKm.toString() : ''
  })
  const [rpe, setRpe] = useState(parsedWorkout.perceivedEffort || 6)
  const [feeling, setFeeling] = useState<FeelingValue | undefined>(() =>
    getValidFeeling(parsedWorkout.feeling)
  )
  const [notes, setNotes] = useState(parsedWorkout.notes || '')

  const typeInfo = TYPE_LABELS[parsedWorkout.type] || TYPE_LABELS.MIXED
  const confidencePercent = Math.round((parsedWorkout.confidence || 0) * 100)
  const reviewedStrengthExercises = materializeStrengthExercises(strengthExercises)
  const hasStrengthSetEdits =
    JSON.stringify(reviewedStrengthExercises.map((exercise) => exercise.actualSets || [])) !==
    JSON.stringify((parsedWorkout.strengthExercises || []).map((exercise) => exercise.actualSets || []))

  const updateSetValue = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'repsCompleted' | 'rpe',
    value: string
  ) => {
    setStrengthExercises((prev) =>
      prev.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) return exercise

        return {
          ...exercise,
          actualSetsDraft: exercise.actualSetsDraft.map((setRow, currentSetIndex) =>
            currentSetIndex === setIndex ? { ...setRow, [field]: value } : setRow
          ),
        }
      })
    )
  }

  const addSet = (exerciseIndex: number) => {
    setStrengthExercises((prev) =>
      prev.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex || exercise.actualSetsDraft.length >= 20) {
          return exercise
        }

        return {
          ...exercise,
          sets: exercise.actualSetsDraft.length + 1,
          actualSetsDraft: [
            ...exercise.actualSetsDraft,
            createEditableSet(exercise, exercise.actualSetsDraft.length + 1),
          ],
        }
      })
    )
  }

  const removeSet = (exerciseIndex: number) => {
    setStrengthExercises((prev) =>
      prev.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex || exercise.actualSetsDraft.length <= 1) {
          return exercise
        }

        return {
          ...exercise,
          sets: exercise.actualSetsDraft.length - 1,
          actualSetsDraft: exercise.actualSetsDraft.slice(0, -1),
        }
      })
    )
  }

  const copyFirstWeightToAllSets = (exerciseIndex: number) => {
    setStrengthExercises((prev) =>
      prev.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) return exercise
        const firstWeight = exercise.actualSetsDraft[0]?.weight ?? ''
        if (!firstWeight) return exercise

        return {
          ...exercise,
          actualSetsDraft: exercise.actualSetsDraft.map((setRow) => ({
            ...setRow,
            weight: firstWeight,
          })),
        }
      })
    )
  }

  const handleConfirm = async () => {
    const selectedFeeling = getValidFeeling(feeling)
    const updatedWorkout: ParsedWorkout = {
      ...parsedWorkout,
      duration: duration ? parseInt(duration) : parsedWorkout.duration,
      distance: distance ? Math.round(parseFloat(distance) * 1000) : parsedWorkout.distance,
      strengthExercises:
        reviewedStrengthExercises.length > 0
          ? reviewedStrengthExercises
          : parsedWorkout.strengthExercises,
      perceivedEffort: rpe,
      notes,
    }

    if (selectedFeeling) {
      updatedWorkout.feeling = selectedFeeling
    } else {
      delete updatedWorkout.feeling
    }

    const payload: {
      parsedStructure?: ParsedWorkout
      perceivedEffort: number
      feeling?: FeelingValue
      notes: string
    } = {
      perceivedEffort: rpe,
      notes,
    }

    if (editMode || hasStrengthSetEdits) {
      payload.parsedStructure = updatedWorkout
    }

    if (selectedFeeling) {
      payload.feeling = selectedFeeling
    }

    await onConfirm(payload)
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
        {strengthExercises.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('strength.exercises')}</span>
            </div>
            <div className="grid gap-2">
              {strengthExercises.map((ex, i) => {
                const isExpanded = expandedExerciseIndex === i
                const actualSetsCount = materializeActualSets(ex).length

                return (
                  <div
                    key={`${ex.exerciseId || ex.exerciseName}-${i}`}
                    className="rounded border bg-background"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 p-2 text-left"
                      onClick={() => setExpandedExerciseIndex(isExpanded ? null : i)}
                      aria-expanded={isExpanded}
                    >
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">{ex.exerciseName}</span>
                          {ex.isCustom && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {t('strength.newExercise')}
                            </Badge>
                          )}
                        </span>
                        {actualSetsCount > 0 && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {t('strength.loggedSets', { count: actualSetsCount })}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        {ex.sets}x{ex.reps ?? '?'}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 border-t p-2">
                        <div className="grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-1 text-xs text-muted-foreground">
                          <span>{t('strength.set')}</span>
                          <span>{t('strength.weightKg')}</span>
                          <span>{t('strength.reps')}</span>
                          <span>{t('strength.rpe')}</span>
                        </div>

                        <div className="space-y-2">
                          {ex.actualSetsDraft.map((setRow, setIndex) => (
                            <div
                              key={setRow.setNumber}
                              className="grid grid-cols-[42px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2"
                            >
                              <div className="flex h-10 items-center justify-center rounded-md bg-muted/50 text-sm font-medium">
                                {setRow.setNumber}
                              </div>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                value={setRow.weight}
                                onChange={(event) => updateSetValue(i, setIndex, 'weight', event.target.value)}
                                aria-label={t('strength.weightForSet', { number: setRow.setNumber })}
                                placeholder="0"
                              />
                              <Input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                value={setRow.repsCompleted}
                                onChange={(event) => updateSetValue(i, setIndex, 'repsCompleted', event.target.value)}
                                aria-label={t('strength.repsForSet', { number: setRow.setNumber })}
                                placeholder={setRow.defaultReps || '0'}
                              />
                              <Input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="10"
                                step="1"
                                value={setRow.rpe}
                                onChange={(event) => updateSetValue(i, setIndex, 'rpe', event.target.value)}
                                aria-label={t('strength.rpeForSet', { number: setRow.setNumber })}
                                placeholder="-"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyFirstWeightToAllSets(i)}
                            disabled={!ex.actualSetsDraft[0]?.weight}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            {t('strength.copyFirstWeight')}
                          </Button>
                          <div className="ml-auto flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeSet(i)}
                              disabled={ex.actualSetsDraft.length <= 1}
                              aria-label={t('strength.removeSet')}
                              title={t('strength.removeSet')}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => addSet(i)}
                              disabled={ex.actualSetsDraft.length >= 20}
                              aria-label={t('strength.addSet')}
                              title={t('strength.addSet')}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
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
          type="button"
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
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
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
                  type="button"
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
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
          {t('actions.cancel')}
        </Button>
        <Button type="button" className="flex-1" onClick={handleConfirm} disabled={isSubmitting}>
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
