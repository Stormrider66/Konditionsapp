'use client'

/**
 * Quick Form Component
 *
 * Structured form for manual workout entry.
 * Allows athletes to enter workout details without AI parsing.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import {
  CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'
import { useLocale, useTranslations } from '@/i18n/client'

interface QuickFormProps {
  onSubmit: (data: { parsedWorkout: ParsedWorkout; workoutDate: Date }) => Promise<void>
  isProcessing?: boolean
}

type WorkoutTypeOption = 'CARDIO' | 'STRENGTH' | 'HYBRID'

const CARDIO_SPORTS = [
  { value: 'RUNNING', labelKey: 'running' },
  { value: 'CYCLING', labelKey: 'cycling' },
  { value: 'SWIMMING', labelKey: 'swimming' },
  { value: 'ROWING', labelKey: 'rowing' },
  { value: 'SKIING', labelKey: 'skiing' },
  { value: 'WALKING', labelKey: 'walking' },
  { value: 'OTHER', labelKey: 'other' },
]

const INTENSITY_OPTIONS = [
  { value: 'RECOVERY', labelKey: 'recovery' },
  { value: 'EASY', labelKey: 'easy' },
  { value: 'MODERATE', labelKey: 'moderate' },
  { value: 'THRESHOLD', labelKey: 'hard' },
  { value: 'MAX', labelKey: 'maximum' },
]

const FEELING_OPTIONS = [
  { value: 'GREAT', labelKey: 'great' },
  { value: 'GOOD', labelKey: 'good' },
  { value: 'OKAY', labelKey: 'okay' },
  { value: 'TIRED', labelKey: 'tired' },
  { value: 'EXHAUSTED', labelKey: 'exhausted' },
]

interface ExerciseEntry {
  id: string
  name: string
  sets: number
  reps: number
  weight?: number
}

export function QuickForm({ onSubmit, isProcessing }: QuickFormProps) {
  const t = useTranslations('components.adHocQuickForm')
  const locale = useLocale()
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date())
  const [workoutType, setWorkoutType] = useState<WorkoutTypeOption>('CARDIO')
  const [workoutName, setWorkoutName] = useState('')

  // Cardio fields
  const [sport, setSport] = useState('RUNNING')
  const [duration, setDuration] = useState<number>(30)
  const [distance, setDistance] = useState<string>('')
  const [intensity, setIntensity] = useState<string>('MODERATE')

  // Strength fields
  const [exercises, setExercises] = useState<ExerciseEntry[]>([
    { id: '1', name: '', sets: 3, reps: 10, weight: undefined },
  ])

  // Subjective fields
  const [perceivedEffort, setPerceivedEffort] = useState<number>(5)
  const [feeling, setFeeling] = useState<string>('')
  const [notes, setNotes] = useState('')
  const dateLocale = locale === 'en' ? enUS : sv

  const addExercise = () => {
    setExercises([
      ...exercises,
      { id: Date.now().toString(), name: '', sets: 3, reps: 10, weight: undefined },
    ])
  }

  const removeExercise = (id: string) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((e) => e.id !== id))
    }
  }

  const updateExercise = <K extends keyof ExerciseEntry>(id: string, field: K, value: ExerciseEntry[K]) => {
    setExercises(
      exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }

  const handleSubmit = async () => {
    // Build ParsedWorkout object
    const parsedWorkout: ParsedWorkout = {
      type: workoutType,
      confidence: 1, // Manual entry = full confidence
      name: workoutName || undefined,
      duration: duration,
      distance: distance ? Math.round(parseFloat(distance) * 1000) : undefined,
      intensity: intensity as ParsedWorkout['intensity'],
      perceivedEffort,
      feeling: feeling as ParsedWorkout['feeling'],
      notes: notes || undefined,
      rawInterpretation: t('rawInterpretation'),
    }

    if (workoutType === 'CARDIO' || workoutType === 'HYBRID') {
      parsedWorkout.sport = sport as ParsedWorkout['sport']
    }

    if (workoutType === 'STRENGTH' || workoutType === 'HYBRID') {
      parsedWorkout.strengthExercises = exercises
        .filter((e) => e.name.trim())
        .map((e) => ({
          exerciseName: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          matchConfidence: 0, // Will be matched on backend
          isCustom: true, // Manual entry, not yet matched
        }))
    }

    await onSubmit({ parsedWorkout, workoutDate })
  }

  const isValid = () => {
    if (workoutType === 'CARDIO') {
      return duration > 0
    }
    if (workoutType === 'STRENGTH') {
      return exercises.some((e) => e.name.trim())
    }
    if (workoutType === 'HYBRID') {
      return duration > 0 || exercises.some((e) => e.name.trim())
    }
    return false
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date picker */}
        <div className="space-y-2">
          <Label>{t('date.label')}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !workoutDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {workoutDate ? (
                  format(workoutDate, 'PPP', { locale: dateLocale })
                ) : (
                  <span>{t('date.placeholder')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={workoutDate}
                onSelect={(date) => date && setWorkoutDate(date)}
                disabled={(date) => date > new Date()}
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Workout type */}
        <div className="space-y-2">
          <Label>{t('workoutType.label')}</Label>
          <Select value={workoutType} onValueChange={(v) => setWorkoutType(v as WorkoutTypeOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CARDIO">{t('workoutType.cardio')}</SelectItem>
              <SelectItem value="STRENGTH">{t('workoutType.strength')}</SelectItem>
              <SelectItem value="HYBRID">{t('workoutType.hybrid')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Workout name (optional) */}
        <div className="space-y-2">
          <Label>{t('name.label')}</Label>
          <Input
            placeholder={t('name.placeholder')}
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
          />
        </div>

        {/* Cardio fields */}
        {(workoutType === 'CARDIO' || workoutType === 'HYBRID') && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">{t('cardio.title')}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('cardio.sport')}</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARDIO_SPORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {t(`sports.${s.labelKey}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('cardio.intensity')}</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENSITY_OPTIONS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {t(`intensities.${i.labelKey}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('cardio.duration')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('cardio.distance')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder={t('cardio.distancePlaceholder')}
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Strength fields */}
        {(workoutType === 'STRENGTH' || workoutType === 'HYBRID') && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t('strength.title')}</h3>
              <Button variant="outline" size="sm" onClick={addExercise}>
                <Plus className="h-4 w-4 mr-1" />
                {t('strength.addExercise')}
              </Button>
            </div>

            <div className="space-y-3">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <Input
                        placeholder={t('strength.exercisePlaceholder')}
                        value={exercise.name}
                        onChange={(e) => updateExercise(exercise.id, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Set"
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(exercise.id, 'sets', parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Reps"
                        value={exercise.reps}
                        onChange={(e) =>
                          updateExercise(exercise.id, 'reps', parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="kg"
                    className="w-20"
                    value={exercise.weight || ''}
                    onChange={(e) =>
                      updateExercise(
                        exercise.id,
                        'weight',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(exercise.id)}
                    disabled={exercises.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subjective fields */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium">{t('subjective.title')}</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('subjective.rpe')}</Label>
              <span className="text-sm font-medium">{perceivedEffort}/10</span>
            </div>
            <Slider
              value={[perceivedEffort]}
              onValueChange={(v) => setPerceivedEffort(v[0])}
              min={1}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('subjective.easy')}</span>
              <span>{t('subjective.maximum')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('subjective.feeling')}</Label>
            <Select value={feeling} onValueChange={setFeeling}>
              <SelectTrigger>
                <SelectValue placeholder={t('subjective.feelingPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {FEELING_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {t(`feelings.${f.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('subjective.notes')}</Label>
            <Textarea
              placeholder={t('subjective.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!isValid() || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('actions.saving')}
            </>
          ) : (
            t('actions.saveWorkout')
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
