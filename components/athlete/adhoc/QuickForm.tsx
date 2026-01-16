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
import { sv } from 'date-fns/locale'
import {
  CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParsedWorkout, ParsedStrengthExercise } from '@/lib/adhoc-workout/types'

interface QuickFormProps {
  onSubmit: (data: { parsedWorkout: ParsedWorkout; workoutDate: Date }) => Promise<void>
  isProcessing?: boolean
}

type WorkoutTypeOption = 'CARDIO' | 'STRENGTH' | 'HYBRID'

const CARDIO_SPORTS = [
  { value: 'RUNNING', label: 'Löpning' },
  { value: 'CYCLING', label: 'Cykling' },
  { value: 'SWIMMING', label: 'Simning' },
  { value: 'ROWING', label: 'Rodd' },
  { value: 'SKIING', label: 'Längdskidor' },
  { value: 'WALKING', label: 'Promenad' },
  { value: 'OTHER', label: 'Övrigt' },
]

const INTENSITY_OPTIONS = [
  { value: 'RECOVERY', label: 'Återhämtning (Zon 1)' },
  { value: 'EASY', label: 'Lätt (Zon 2)' },
  { value: 'MODERATE', label: 'Måttlig (Zon 3)' },
  { value: 'HARD', label: 'Hård (Zon 4)' },
  { value: 'MAXIMUM', label: 'Maximal (Zon 5)' },
]

const FEELING_OPTIONS = [
  { value: 'GREAT', label: 'Fantastiskt' },
  { value: 'GOOD', label: 'Bra' },
  { value: 'OKAY', label: 'Okej' },
  { value: 'TIRED', label: 'Trött' },
  { value: 'EXHAUSTED', label: 'Utmattad' },
]

interface ExerciseEntry {
  id: string
  name: string
  sets: number
  reps: number
  weight?: number
}

export function QuickForm({ onSubmit, isProcessing }: QuickFormProps) {
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

  const updateExercise = (id: string, field: keyof ExerciseEntry, value: any) => {
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
      distance: distance ? parseFloat(distance) : undefined,
      intensity: intensity as any,
      perceivedEffort,
      feeling: feeling as any,
      notes: notes || undefined,
      rawInterpretation: 'Manuellt inmatat pass',
    }

    if (workoutType === 'CARDIO' || workoutType === 'HYBRID') {
      parsedWorkout.sport = sport as any
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
          Fyll i formulär
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Date picker */}
        <div className="space-y-2">
          <Label>När genomfördes passet?</Label>
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
                  format(workoutDate, 'PPP', { locale: sv })
                ) : (
                  <span>Välj datum</span>
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
                locale={sv}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Workout type */}
        <div className="space-y-2">
          <Label>Typ av pass</Label>
          <Select value={workoutType} onValueChange={(v) => setWorkoutType(v as WorkoutTypeOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CARDIO">Kondition</SelectItem>
              <SelectItem value="STRENGTH">Styrka</SelectItem>
              <SelectItem value="HYBRID">Blandat</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Workout name (optional) */}
        <div className="space-y-2">
          <Label>Namn på passet (valfritt)</Label>
          <Input
            placeholder="t.ex. Morgonlöpning, Benpass"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
          />
        </div>

        {/* Cardio fields */}
        {(workoutType === 'CARDIO' || workoutType === 'HYBRID') && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">Konditionsdel</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sport</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARDIO_SPORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intensitet</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENSITY_OPTIONS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minuter)</Label>
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Distans (km, valfritt)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="t.ex. 5.0"
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
              <h3 className="font-medium">Styrkedel</h3>
              <Button variant="outline" size="sm" onClick={addExercise}>
                <Plus className="h-4 w-4 mr-1" />
                Lägg till övning
              </Button>
            </div>

            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div key={exercise.id} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <Input
                        placeholder="Övning"
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
          <h3 className="font-medium">Hur kändes det?</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Upplevd ansträngning (RPE)</Label>
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
              <span>Lätt</span>
              <span>Maximal</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Känsla</Label>
            <Select value={feeling} onValueChange={setFeeling}>
              <SelectTrigger>
                <SelectValue placeholder="Välj hur du kände dig" />
              </SelectTrigger>
              <SelectContent>
                {FEELING_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Anteckningar (valfritt)</Label>
            <Textarea
              placeholder="Övriga kommentarer om passet..."
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
              Sparar...
            </>
          ) : (
            'Spara pass'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
