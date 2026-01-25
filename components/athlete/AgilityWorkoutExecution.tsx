'use client'

// components/athlete/AgilityWorkoutExecution.tsx
// Workout execution view for athletes

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Timer,
  X
} from 'lucide-react'
import type { AgilityWorkout, AgilityWorkoutDrill, AgilityDrill } from '@/types'

interface WorkoutDrillWithDetails extends AgilityWorkoutDrill {
  drill: AgilityDrill
}

interface AgilityWorkoutExecutionProps {
  workout: AgilityWorkout & {
    drills: WorkoutDrillWithDetails[]
  }
  clientId: string
  assignmentId?: string
  onComplete?: () => void
  basePath?: string
}

interface DrillResult {
  drillId: string
  completedReps?: number
  completedSets?: number
  timeInSeconds?: number
  notes?: string
}

export function AgilityWorkoutExecution({
  workout,
  clientId,
  assignmentId,
  onComplete,
  basePath = '/athlete'
}: AgilityWorkoutExecutionProps) {
  const router = useRouter()
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restSeconds, setRestSeconds] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [drillResults, setDrillResults] = useState<Record<string, DrillResult>>({})
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [perceivedEffort, setPerceivedEffort] = useState(5)
  const [workoutNotes, setWorkoutNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime] = useState(new Date())

  const sortedDrills = workout.drills.sort((a, b) => a.order - b.order)
  const currentDrill = sortedDrills[currentDrillIndex]
  const progress = ((currentDrillIndex + 1) / sortedDrills.length) * 100

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isTimerRunning && !isResting) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    } else if (isResting && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds(prev => {
          if (prev <= 1) {
            setIsResting(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning, isResting, restSeconds])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDrillComplete = useCallback(() => {
    // Save current drill result
    const drillId = currentDrill.id
    setDrillResults(prev => ({
      ...prev,
      [drillId]: {
        drillId,
        completedReps: currentDrill.reps ?? currentDrill.drill.defaultReps ?? undefined,
        completedSets: currentDrill.sets ?? currentDrill.drill.defaultSets ?? undefined,
        timeInSeconds: elapsedSeconds,
        notes: prev[drillId]?.notes
      }
    }))

    // Check if this is the last drill
    if (currentDrillIndex === sortedDrills.length - 1) {
      setShowCompleteDialog(true)
    } else {
      // Start rest timer if there's rest between drills
      const restTime = currentDrill.restSeconds || workout.restBetweenDrills || 30
      setRestSeconds(restTime)
      setIsResting(true)
      setIsTimerRunning(false)
    }
  }, [currentDrill, currentDrillIndex, sortedDrills.length, elapsedSeconds, workout.restBetweenDrills])

  const handleNextDrill = () => {
    if (currentDrillIndex < sortedDrills.length - 1) {
      setCurrentDrillIndex(prev => prev + 1)
      setElapsedSeconds(0)
      setIsResting(false)
      setRestSeconds(0)
    }
  }

  const handlePreviousDrill = () => {
    if (currentDrillIndex > 0) {
      setCurrentDrillIndex(prev => prev - 1)
      setElapsedSeconds(0)
      setIsResting(false)
      setRestSeconds(0)
    }
  }

  const handleSkipRest = () => {
    setRestSeconds(0)
    setIsResting(false)
    handleNextDrill()
  }

  const handleSubmitWorkout = async () => {
    setIsSubmitting(true)

    try {
      const endTime = new Date()
      const totalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      const response = await fetch(`/api/agility-workouts/${workout.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: clientId,
          assignmentId,
          totalDuration,
          perceivedEffort,
          notes: workoutNotes || undefined,
          drillResults: Object.values(drillResults)
        })
      })

      if (!response.ok) throw new Error('Failed to save workout result')

      setShowCompleteDialog(false)
      if (onComplete) {
        onComplete()
      } else {
        router.push(`${basePath}/agility`)
      }
    } catch (error) {
      console.error('Error saving workout result:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateDrillNote = (note: string) => {
    setDrillResults(prev => ({
      ...prev,
      [currentDrill.id]: {
        ...prev[currentDrill.id],
        drillId: currentDrill.id,
        notes: note
      }
    }))
  }

  const categoryColors: Record<string, string> = {
    COD: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    REACTIVE_AGILITY: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    SPEED_ACCELERATION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    PLYOMETRICS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    FOOTWORK: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    BALANCE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{workout.name}</h1>
          <p className="text-sm text-muted-foreground">
            Drill {currentDrillIndex + 1} of {sortedDrills.length}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => router.push(`${basePath}/agility`)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-2" />

      {/* Rest Timer Overlay */}
      {isResting && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Rest Time</p>
            <p className="text-5xl font-mono font-bold text-blue-600 dark:text-blue-400 mb-4">
              {formatTime(restSeconds)}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleSkipRest}>
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Rest
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Drill Card */}
      {!isResting && currentDrill && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className={categoryColors[currentDrill.drill.category]}>
                {currentDrill.drill.category.replace(/_/g, ' ')}
              </Badge>
              {currentDrill.sectionType && (
                <Badge variant="outline">{currentDrill.sectionType}</Badge>
              )}
            </div>
            <CardTitle className="text-2xl mt-2">{currentDrill.drill.name}</CardTitle>
            <CardDescription>{currentDrill.drill.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parameters */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {(currentDrill.sets || currentDrill.drill.defaultSets) && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Sets</p>
                  <p className="text-xl font-bold">
                    {currentDrill.sets || currentDrill.drill.defaultSets}
                  </p>
                </div>
              )}
              {(currentDrill.reps || currentDrill.drill.defaultReps) && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Reps</p>
                  <p className="text-xl font-bold">
                    {currentDrill.reps || currentDrill.drill.defaultReps}
                  </p>
                </div>
              )}
              {currentDrill.drill.distanceMeters && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-xl font-bold">{currentDrill.drill.distanceMeters}m</p>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-center py-4">
              <p className="text-6xl font-mono font-bold mb-4">
                {formatTime(elapsedSeconds)}
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant={isTimerRunning ? 'destructive' : 'default'}
                  size="lg"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setElapsedSeconds(0)}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Coaching Cues */}
            {currentDrill.drill.executionCues && currentDrill.drill.executionCues.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Coaching Cues</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {currentDrill.drill.executionCues.map((cue, i) => (
                    <li key={i}>{cue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {currentDrill.notes && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Coach Notes:</p>
                <p className="text-sm text-muted-foreground">{currentDrill.notes}</p>
              </div>
            )}

            {/* Athlete Notes */}
            <div>
              <Label htmlFor="drill-notes">Your Notes (optional)</Label>
              <Textarea
                id="drill-notes"
                placeholder="How did this drill feel?"
                value={drillResults[currentDrill.id]?.notes || ''}
                onChange={(e) => updateDrillNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousDrill}
          disabled={currentDrillIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleDrillComplete}>
          {currentDrillIndex === sortedDrills.length - 1 ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Workout
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Workout Complete!
            </DialogTitle>
            <DialogDescription>
              Great job completing {workout.name}! Rate your effort and add any notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* RPE Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Rate of Perceived Effort (RPE)</Label>
                <span className="font-bold text-lg">{perceivedEffort}/10</span>
              </div>
              <Slider
                value={[perceivedEffort]}
                onValueChange={(v) => setPerceivedEffort(v[0])}
                min={1}
                max={10}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Very Easy</span>
                <span>Maximum Effort</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="workout-notes">Workout Notes (optional)</Label>
              <Textarea
                id="workout-notes"
                placeholder="How did this workout feel overall? Any issues?"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitWorkout} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save & Finish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
