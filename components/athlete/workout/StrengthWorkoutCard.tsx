// components/athlete/workout/StrengthWorkoutCard.tsx
/**
 * Strength Workout Display Card (Athlete View)
 *
 * Clean, athlete-friendly workout card showing:
 * - Workout overview (type, intensity, duration)
 * - Exercise list with sets/reps/load
 * - Completion status
 * - Quick log button
 * - Exercise instructions access
 * - Progress indicators
 * - Coach notes
 *
 * Features:
 * - Mobile-optimized design
 * - Large, tappable buttons
 * - Exercise video links
 * - RPE input
 * - Timer integration
 * - Checkmark completion
 * - Expandable exercise details
 */

'use client'

import { useState } from 'react'
import { Workout, WorkoutSegment, Exercise } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CheckCircle2,
  Circle,
  Play,
  Clock,
  Dumbbell,
  Info,
  MessageSquare,
  TrendingUp,
} from 'lucide-react'

interface WorkoutWithDetails extends Workout {
  segments: (WorkoutSegment & {
    exercise: Exercise | null
  })[]
}

interface StrengthWorkoutCardProps {
  workout: WorkoutWithDetails
  onStartWorkout: () => void
  onViewInstructions: (exerciseId: string) => void
  completed?: boolean
  completionPercentage?: number
}

export function StrengthWorkoutCard({
  workout,
  onStartWorkout,
  onViewInstructions,
  completed = false,
  completionPercentage = 0,
}: StrengthWorkoutCardProps) {
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set())

  // Toggle exercise expansion
  const toggleExercise = (exerciseId: string) => {
    const newExpanded = new Set(expandedExercises)
    if (newExpanded.has(exerciseId)) {
      newExpanded.delete(exerciseId)
    } else {
      newExpanded.add(exerciseId)
    }
    setExpandedExercises(newExpanded)
  }

  // Get intensity badge color
  const getIntensityColor = (intensity: string) => {
    const colors = {
      RECOVERY: 'bg-green-100 text-green-800',
      EASY: 'bg-blue-100 text-blue-800',
      MODERATE: 'bg-yellow-100 text-yellow-800',
      THRESHOLD: 'bg-orange-100 text-orange-800',
      INTERVAL: 'bg-red-100 text-red-800',
      MAX: 'bg-purple-100 text-purple-800',
    }
    return colors[intensity as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Calculate total exercises
  const totalExercises = workout.segments.length
  const completedExercises = Math.floor((completionPercentage / 100) * totalExercises)

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {workout.type}
              </Badge>
              <Badge className={`text-xs ${getIntensityColor(workout.intensity)}`}>
                {workout.intensity}
              </Badge>
              {completed && (
                <Badge className="text-xs bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">
              {workout.description || `${workout.type} Workout`}
            </CardTitle>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{workout.duration} min</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {!completed && completionPercentage > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">
                {completedExercises} / {totalExercises} exercises
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        )}

        {/* Start Workout Button */}
        {!completed && (
          <Button onClick={onStartWorkout} className="w-full" size="lg">
            <Play className="h-5 w-5 mr-2" />
            {completionPercentage > 0 ? 'Continue Workout' : 'Start Workout'}
          </Button>
        )}

        <Separator />

        {/* Exercise List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-gray-600" />
            <span className="font-semibold text-sm">Exercises ({totalExercises})</span>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {workout.segments.map((segment, index) => {
              const exercise = segment.exercise

              return (
                <AccordionItem
                  key={segment.id}
                  value={segment.id}
                  className="border rounded-lg px-3"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Exercise number */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                        {index + 1}
                      </div>

                      {/* Exercise info */}
                      <div className="text-left flex-1">
                        <p className="font-medium text-sm">
                          {exercise?.name || 'Exercise'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {segment.sets}×{segment.reps} @ {segment.weight || '—'}
                        </p>
                      </div>

                      {/* Status indicator */}
                      {completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pt-2 pb-4">
                    <div className="space-y-3 text-sm">
                      {/* Exercise details */}
                      <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded">
                        <div>
                          <span className="text-xs text-gray-600">Sets</span>
                          <p className="font-semibold">{segment.sets || '—'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Reps</span>
                          <p className="font-semibold">{segment.reps || '—'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Load</span>
                          <p className="font-semibold">{segment.weight || '—'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Rest</span>
                          <p className="font-semibold">{segment.rest || '—'}s</p>
                        </div>
                      </div>

                      {/* Tempo */}
                      {segment.tempo && (
                        <div className="bg-blue-50 p-3 rounded">
                          <span className="text-xs text-blue-600 font-medium">
                            Tempo: {segment.tempo}
                          </span>
                          <p className="text-xs text-gray-600 mt-1">
                            (Eccentric-Pause-Concentric-Pause)
                          </p>
                        </div>
                      )}

                      {/* Exercise notes */}
                      {segment.notes && (
                        <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded">
                          <MessageSquare className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-yellow-800 font-medium mb-1">
                              Coach Notes:
                            </p>
                            <p className="text-xs text-gray-700">{segment.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* View Instructions Button */}
                      {exercise && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewInstructions(exercise.id)}
                          className="w-full"
                        >
                          <Info className="h-4 w-4 mr-2" />
                          View Instructions & Video
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </div>

        {/* Workout Notes */}
        {workout.description && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-600" />
                <span className="font-semibold text-sm">Workout Notes</span>
              </div>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                {workout.description}
              </p>
            </div>
          </>
        )}

        {/* Completion Summary (if completed) */}
        {completed && (
          <>
            <Separator />
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-sm text-green-900">
                  Workout Completed!
                </span>
              </div>
              <p className="text-xs text-green-700">
                Great job! Your progress has been logged and your coach has been notified.
              </p>
            </div>
          </>
        )}

        {/* Quick Stats (if available) */}
        {!completed && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-600">Total Sets</p>
              <p className="font-semibold text-lg">
                {workout.segments.reduce((sum, seg) => sum + (seg.sets || 0), 0)}
              </p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-600">Exercises</p>
              <p className="font-semibold text-lg">{totalExercises}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-600">Duration</p>
              <p className="font-semibold text-lg">{workout.duration}m</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
