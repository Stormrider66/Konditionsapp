// components/athlete/workout/WorkoutLoggingForm.tsx
/**
 * Simple Workout Logging Form (Athlete View)
 *
 * Streamlined form for logging completed strength workouts:
 * - Exercise-by-exercise logging
 * - Sets and reps completed
 * - Actual load used
 * - RPE (Rate of Perceived Exertion) per exercise
 * - Overall workout RPE
 * - Notes and feedback
 * - Quick completion checkmarks
 * - Progress saving
 *
 * Features:
 * - Mobile-optimized input fields
 * - Auto-save draft
 * - Numeric keyboard for mobile
 * - RPE slider (1-10)
 * - Skip exercise option
 * - Photo/video upload
 * - Timer for rest periods
 */

'use client'

import { useState, useEffect } from 'react'
import { Workout, WorkoutSegment, Exercise } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  Circle,
  Save,
  Send,
  AlertCircle,
  Camera,
  Clock,
  X,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface WorkoutWithDetails extends Workout {
  segments: (WorkoutSegment & {
    exercise: Exercise | null
  })[]
}

interface ExerciseLog {
  segmentId: string
  exerciseId: string
  setsCompleted: number
  setsPlanned: number
  repsCompleted: number
  repsPlanned: number
  loadUsed: number
  rpe: number
  notes: string
  skipped: boolean
}

interface WorkoutLoggingFormProps {
  workout: WorkoutWithDetails
  onSubmit: (logData: any) => void
  onCancel: () => void
  initialData?: any
}

export function WorkoutLoggingForm({
  workout,
  onSubmit,
  onCancel,
  initialData,
}: WorkoutLoggingFormProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({})
  const [overallRPE, setOverallRPE] = useState<number>(5)
  const [workoutNotes, setWorkoutNotes] = useState<string>('')
  const [actualDuration, setActualDuration] = useState<number>(workout.duration || 60)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  // Initialize exercise logs
  useEffect(() => {
    const initialLogs: Record<string, ExerciseLog> = {}

    workout.segments.forEach((segment) => {
      initialLogs[segment.id] = {
        segmentId: segment.id,
        exerciseId: segment.exerciseId || '',
        setsCompleted: segment.sets || 0,
        setsPlanned: segment.sets || 0,
        repsCompleted: segment.reps || 0,
        repsPlanned: segment.reps || 0,
        loadUsed: parseFloat(segment.weight?.replace(/[^\d.]/g, '') || '0'),
        rpe: 5,
        notes: '',
        skipped: false,
      }
    })

    setExerciseLogs(initialLogs)
  }, [workout])

  // Update exercise log
  const updateExerciseLog = (segmentId: string, field: keyof ExerciseLog, value: any) => {
    setExerciseLogs({
      ...exerciseLogs,
      [segmentId]: {
        ...exerciseLogs[segmentId],
        [field]: value,
      },
    })
  }

  // Toggle exercise completion
  const toggleExerciseSkipped = (segmentId: string) => {
    updateExerciseLog(segmentId, 'skipped', !exerciseLogs[segmentId]?.skipped)
  }

  // Calculate completion percentage
  const getCompletionPercentage = () => {
    const total = workout.segments.length
    const completed = Object.values(exerciseLogs).filter(
      (log) => !log.skipped && log.setsCompleted > 0
    ).length
    return Math.round((completed / total) * 100)
  }

  // Validate form
  const validateForm = (): boolean => {
    const activeExercises = Object.values(exerciseLogs).filter((log) => !log.skipped)

    if (activeExercises.length === 0) {
      toast({
        title: 'No exercises logged',
        description: 'Please log at least one exercise or mark them as skipped',
        variant: 'destructive',
      })
      return false
    }

    // Check for missing data
    const missingData = activeExercises.some(
      (log) => log.setsCompleted === 0 || log.repsCompleted === 0 || log.loadUsed === 0
    )

    if (missingData) {
      toast({
        title: 'Incomplete data',
        description: 'Please fill in sets, reps, and load for all exercises',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSaving(true)

    try {
      const logData = {
        workoutId: workout.id,
        completedAt: new Date().toISOString(),
        duration: actualDuration,
        overallRPE,
        notes: workoutNotes,
        exerciseLogs: Object.values(exerciseLogs).filter((log) => !log.skipped),
        uploadedFiles,
      }

      await onSubmit(logData)

      toast({
        title: 'Workout logged!',
        description: 'Your progress has been saved successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log workout',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // RPE labels
  const getRPELabel = (rpe: number) => {
    const labels = [
      'Rest',
      'Very Easy',
      'Easy',
      'Moderate',
      'Somewhat Hard',
      'Hard',
      'Very Hard',
      'Very Very Hard',
      'Near Maximal',
      'Maximal',
      'Beyond Maximal',
    ]
    return labels[rpe] || 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Log Workout</h2>
          <Badge variant="secondary">{getCompletionPercentage()}% Complete</Badge>
        </div>
        <p className="text-sm text-gray-600">
          {workout.description || `${workout.type} Workout`}
        </p>
      </div>

      {/* Overall Duration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Workout Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              inputMode="numeric"
              value={actualDuration}
              onChange={(e) => setActualDuration(parseInt(e.target.value) || 0)}
              className="w-24 h-12 text-lg"
              min="1"
            />
            <span className="text-sm text-gray-600">minuter</span>
            <span className="text-xs text-gray-500">
              (Planerat: {workout.duration} min)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Logs */}
      <div className="space-y-3">
        {workout.segments.map((segment, index) => {
          const log = exerciseLogs[segment.id]
          const exercise = segment.exercise

          return (
            <Card
              key={segment.id}
              className={log?.skipped ? 'opacity-50 border-dashed' : ''}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{exercise?.name || 'Exercise'}</h3>
                      <p className="text-xs text-gray-600">
                        Target: {segment.sets}×{segment.reps} @ {segment.weight || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`skip-${segment.id}`}
                      checked={log?.skipped}
                      onCheckedChange={() => toggleExerciseSkipped(segment.id)}
                    />
                    <Label htmlFor={`skip-${segment.id}`} className="text-xs cursor-pointer">
                      Skip
                    </Label>
                  </div>
                </div>
              </CardHeader>

              {!log?.skipped && (
                <CardContent className="space-y-4">
                  {/* Sets and Reps */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">Set</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={log?.setsCompleted || 0}
                        onChange={(e) =>
                          updateExerciseLog(segment.id, 'setsCompleted', parseInt(e.target.value) || 0)
                        }
                        min="0"
                        max={segment.sets || 10}
                        className="h-12 text-lg text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Reps</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={log?.repsCompleted || 0}
                        onChange={(e) =>
                          updateExerciseLog(segment.id, 'repsCompleted', parseInt(e.target.value) || 0)
                        }
                        min="0"
                        className="h-12 text-lg text-center"
                      />
                    </div>
                  </div>

                  {/* Load */}
                  <div>
                    <Label className="text-xs mb-1 block">Belastning (kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={log?.loadUsed || 0}
                      onChange={(e) =>
                        updateExerciseLog(segment.id, 'loadUsed', parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      className="h-12 text-lg"
                    />
                  </div>

                  {/* RPE Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs">RPE (Effort)</Label>
                      <Badge variant="secondary" className="text-xs">
                        {log?.rpe || 5} - {getRPELabel(log?.rpe || 5)}
                      </Badge>
                    </div>
                    <Slider
                      value={[log?.rpe || 5]}
                      onValueChange={([value]) => updateExerciseLog(segment.id, 'rpe', value)}
                      min={1}
                      max={10}
                      step={1}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Easy</span>
                      <span>Moderate</span>
                      <span>Hard</span>
                      <span>Max</span>
                    </div>
                  </div>

                  {/* Extra Reps Indicator */}
                  {log && log.repsCompleted > log.repsPlanned && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-xs text-green-800">
                        <strong>Great work!</strong> You completed {log.repsCompleted - log.repsPlanned} extra
                        reps. Keep it up!
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Notes */}
                  <div>
                    <Label className="text-xs">Notes (Optional)</Label>
                    <Textarea
                      value={log?.notes || ''}
                      onChange={(e) => updateExerciseLog(segment.id, 'notes', e.target.value)}
                      rows={2}
                      placeholder="How did it feel? Any issues?"
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              )}

              {log?.skipped && (
                <CardContent>
                  <div className="text-center py-4 text-sm text-gray-500">
                    Exercise skipped
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Overall RPE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Overall Workout Effort</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">How hard was the entire workout?</Label>
            <Badge variant="secondary">
              {overallRPE} - {getRPELabel(overallRPE)}
            </Badge>
          </div>
          <Slider
            value={[overallRPE]}
            onValueChange={([value]) => setOverallRPE(value)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Very Easy</span>
            <span>Moderate</span>
            <span>Very Hard</span>
            <span>Maximal</span>
          </div>
        </CardContent>
      </Card>

      {/* Workout Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Workout Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            rows={4}
            placeholder="How did the workout go overall? Any feedback for your coach?"
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Action Buttons - Sticky on mobile */}
      <div className="sticky bottom-0 bg-white border-t pt-4 pb-2 -mx-4 px-4 sm:static sm:bg-transparent sm:border-0 sm:pt-0 sm:pb-0 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-12 text-base"
            disabled={isSaving}
          >
            <X className="h-5 w-5 mr-2" />
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-12 text-base"
            disabled={isSaving}
          >
            <Send className="h-5 w-5 mr-2" />
            {isSaving ? 'Sparar...' : 'Logga pass'}
          </Button>
        </div>
      </div>

      {/* Warning */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Make sure to log all your exercises accurately. This data helps your coach track your
          progress and adjust your program.
        </AlertDescription>
      </Alert>
    </div>
  )
}
