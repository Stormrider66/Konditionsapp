'use client'

/**
 * FocusModeWorkout Component
 *
 * Full-screen, mobile-first workout execution view.
 * Shows one exercise at a time with swipe navigation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  CheckCircle2,
  Dumbbell,
  Timer,
  Flame,
  Target,
  Loader2,
  Info,
  AlertCircle,
} from 'lucide-react'
import { SetLoggingForm, SetLogData } from './SetLoggingForm'
import { RestTimer } from './RestTimer'
import { ExerciseImage } from '@/components/themed/ExerciseImage'
import { ExerciseHeader } from '@/components/themed/ExerciseHeader'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { Player } from '@remotion/player'
import { ExerciseAnimation } from '@/remotion/exercises/ExerciseAnimation'

interface FocusModeExercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  imageUrls?: string[]
  sets: number
  repsTarget: number | string
  weight?: number
  tempo?: string
  restSeconds: number
  notes?: string
  section: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  orderIndex: number
  completedSets: number
  setLogs: {
    id: string
    setNumber: number
    weight: number
    repsCompleted: number
    rpe?: number
    meanVelocity?: number
    estimated1RM?: number
    velocityZone?: string
    completedAt: Date
  }[]
}

interface WorkoutData {
  assignment: {
    id: string
    assignedDate: string
    status: string
    notes?: string
  }
  workout: {
    id: string
    name: string
    description?: string
    phase: string
    estimatedDuration?: number
  }
  sections: {
    type: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
    name: string
    notes?: string
    duration?: number
    exerciseCount: number
  }[]
  exercises: FocusModeExercise[]
  progress: {
    currentExerciseIndex: number
    totalExercises: number
    totalSetsTarget: number
    completedSets: number
    percentComplete: number
    isComplete: boolean
  }
}

interface FocusModeWorkoutProps {
  assignmentId: string
  onClose?: () => void
  basePath?: string
}

const SECTION_CONFIG = {
  WARMUP: {
    label: 'Uppvärmning',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: Flame,
  },
  MAIN: {
    label: 'Huvudpass',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Dumbbell,
  },
  CORE: {
    label: 'Core',
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: Target,
  },
  COOLDOWN: {
    label: 'Nedvarvning',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: Timer,
  },
}

export function FocusModeWorkout({
  assignmentId,
  onClose,
  basePath: basePathProp = '',
}: FocusModeWorkoutProps) {
  const contextBasePath = useBasePath()
  const basePath = basePathProp || contextBasePath
  const router = useRouter()
  const [data, setData] = useState<WorkoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [sessionRPE, setSessionRPE] = useState<number>(7)
  const [restTime, setRestTime] = useState(90)

  // Fetch workout data
  const fetchWorkoutData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/strength-sessions/${assignmentId}/focus-mode`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch workout data')
      }

      const result = await response.json()
      setData(result.data)

      // Set initial exercise index to first incomplete
      if (result.data.progress.currentExerciseIndex < result.data.exercises.length) {
        setCurrentIndex(result.data.progress.currentExerciseIndex)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId])

  useEffect(() => {
    fetchWorkoutData()
  }, [fetchWorkoutData])

  // Current exercise
  const currentExercise = useMemo(
    () => (data ? data.exercises[currentIndex] : null),
    [data, currentIndex]
  )

  // Navigate between exercises
  const goToNext = useCallback(() => {
    if (data && currentIndex < data.exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setShowRestTimer(false)
    }
  }, [data, currentIndex])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setShowRestTimer(false)
    }
  }, [currentIndex])

  // Handle set submission
  const handleSetSubmit = async (setData: SetLogData) => {
    try {
      const response = await fetch(
        `/api/strength-sessions/${assignmentId}/sets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(setData),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to log set')
      }

      // Refresh data
      await fetchWorkoutData()

      // Show rest timer after logging set
      if (currentExercise) {
        setRestTime(currentExercise.restSeconds)
        setShowRestTimer(true)
      }
    } catch (err) {
      console.error('Error logging set:', err)
      throw err
    }
  }

  // Handle workout completion
  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          rpe: sessionRPE,
        }),
      })

      setShowCompleteDialog(false)
      if (onClose) {
        onClose()
      } else {
        router.push(`${basePath}/athlete/dashboard`)
      }
    } catch (err) {
      console.error('Error completing workout:', err)
    } finally {
      setIsCompleting(false)
    }
  }

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      router.back()
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Laddar pass...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-medium mb-2">Kunde inte ladda passet</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleClose}>Gå tillbaka</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sectionConfig = currentExercise
    ? (SECTION_CONFIG[currentExercise.section] || SECTION_CONFIG.MAIN)
    : SECTION_CONFIG.MAIN

  // Next set number
  const nextSetNumber = currentExercise
    ? currentExercise.completedSets + 1
    : 1

  // Is current exercise complete?
  const isExerciseComplete = currentExercise
    ? currentExercise.completedSets >= currentExercise.sets
    : false

  // Last logged set for this exercise
  const lastLog = currentExercise?.setLogs[currentExercise.setLogs.length - 1]

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
        <div className="text-center flex-1">
          <p className="font-medium text-sm">{data.workout.name}</p>
          <Badge className={`${sectionConfig.color} text-white text-xs`}>
            {sectionConfig.label}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCompleteDialog(true)}
        >
          Avsluta
        </Button>
      </header>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            Övning {currentIndex + 1} av {data.exercises.length}
          </span>
          <span>{data.progress.percentComplete}% klart</span>
        </div>
        <Progress value={data.progress.percentComplete} className="h-2" />
      </div>

      {/* Exercise navigation dots */}
      <div className="flex justify-center gap-1 py-2 overflow-x-auto px-4">
        {data.exercises.map((ex, idx) => {
          const isComplete = ex.completedSets >= ex.sets
          const isCurrent = idx === currentIndex
          return (
            <button
              key={ex.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${isCurrent
                ? 'w-4 bg-primary'
                : isComplete
                  ? 'bg-green-500'
                  : 'bg-muted-foreground/30'
                }`}
            />
          )
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {showRestTimer ? (
          <RestTimer
            initialSeconds={restTime}
            onComplete={() => {
              setShowRestTimer(false)
              // Auto-advance if exercise is complete
              if (isExerciseComplete && currentIndex < data.exercises.length - 1) {
                goToNext()
              }
            }}
            onSkip={() => {
              setShowRestTimer(false)
              if (isExerciseComplete && currentIndex < data.exercises.length - 1) {
                goToNext()
              }
            }}
          />
        ) : (
          <div className="p-4 space-y-4">
            {/* Exercise info */}
            {currentExercise && (
              <>
                {/* Exercise Image Display */}
                {currentExercise.imageUrls && currentExercise.imageUrls.length > 0 ? (
                  <div className="flex flex-col items-center">
                    {/* Styled Header */}
                    <ExerciseHeader
                      nameSv={currentExercise.nameSv}
                      nameEn={currentExercise.name}
                      name={currentExercise.name}
                      size="xl"
                      showSubtitle={!!currentExercise.nameSv && currentExercise.nameSv !== currentExercise.name}
                      className="rounded-b-none"
                    />
                    {/* Exercise Image or Remotion Animation */}
                    {currentExercise.imageUrls.length > 1 ? (
                      <div className="w-full aspect-[9/16] bg-black rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0">
                          <Player
                            component={ExerciseAnimation}
                            inputProps={{ imageUrls: currentExercise.imageUrls }}
                            durationInFrames={300}
                            fps={30}
                            compositionWidth={1080}
                            compositionHeight={1920}
                            style={{
                              width: '100%',
                              height: '100%',
                            }}
                            controls
                            loop
                            autoPlay
                          />
                        </div>
                        {/* Badge indicating animation */}
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                          <Play className="w-3 h-3 fill-white" />
                          <span>Live Animation</span>
                        </div>
                      </div>
                    ) : (
                      <ExerciseImage
                        imageUrls={currentExercise.imageUrls}
                        exerciseId={currentExercise.exerciseId}
                        size="xl"
                        showCarousel={false}
                        enableLightbox={true}
                        className="rounded-t-none"
                      />
                    )}
                    {/* Exercise details below image */}
                    <div className="mt-3 text-center">
                      <p className="text-muted-foreground">
                        {currentExercise.sets} set × {currentExercise.repsTarget} reps
                        {currentExercise.weight && ` @ ${currentExercise.weight} kg`}
                      </p>
                      {currentExercise.tempo && (
                        <Badge variant="outline" className="mt-1">
                          Tempo: {currentExercise.tempo}
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Fallback: Text-only display when no images */
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">
                      {currentExercise.nameSv || currentExercise.name}
                    </h2>
                    <p className="text-muted-foreground">
                      {currentExercise.sets} set × {currentExercise.repsTarget} reps
                      {currentExercise.weight && ` @ ${currentExercise.weight} kg`}
                    </p>
                    {currentExercise.tempo && (
                      <Badge variant="outline" className="mt-1">
                        Tempo: {currentExercise.tempo}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Video/Instructions button */}
                {(currentExercise.videoUrl || currentExercise.instructions) && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowInstructions(true)}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Visa instruktioner
                  </Button>
                )}

                {/* Set progress */}
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: currentExercise.sets }, (_, i) => {
                    const setNum = i + 1
                    const log = currentExercise.setLogs.find(
                      (l) => l.setNumber === setNum
                    )
                    const isCompleted = !!log
                    const isCurrent = setNum === nextSetNumber

                    return (
                      <div
                        key={setNum}
                        className={`p-3 rounded-lg border text-center ${isCompleted
                          ? 'bg-green-50 border-green-300'
                          : isCurrent
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/30'
                          }`}
                      >
                        <p className="text-sm font-medium">Set {setNum}</p>
                        {isCompleted ? (
                          <div className="text-xs text-green-600">
                            <CheckCircle2 className="h-4 w-4 mx-auto" />
                            {log.weight}kg × {log.repsCompleted}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {isCurrent ? 'Aktuellt' : 'Väntar'}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Rest time info */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>Vila: {currentExercise.restSeconds} sekunder</span>
                </div>

                {/* Set logging form */}
                {!isExerciseComplete && (
                  <SetLoggingForm
                    exerciseId={currentExercise.exerciseId}
                    setNumber={nextSetNumber}
                    targetWeight={currentExercise.weight}
                    targetReps={currentExercise.repsTarget}
                    previousWeight={lastLog?.weight}
                    previousReps={lastLog?.repsCompleted}
                    onSubmit={handleSetSubmit}
                  />
                )}

                {/* Exercise complete message */}
                {isExerciseComplete && (
                  <Card className="bg-green-50 border-green-300">
                    <CardContent className="pt-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-green-800">
                        Övning klar!
                      </p>
                      {currentIndex < data.exercises.length - 1 ? (
                        <Button
                          className="mt-4"
                          onClick={goToNext}
                        >
                          Nästa övning
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          className="mt-4"
                          onClick={() => setShowCompleteDialog(true)}
                        >
                          Avsluta pass
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {currentExercise.notes && (
                  <p className="text-sm text-muted-foreground text-center italic">
                    {currentExercise.notes}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      {!showRestTimer && (
        <footer className="flex items-center justify-between p-4 border-t bg-background/95 backdrop-blur">
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Föregående
          </Button>
          <Button
            variant="outline"
            onClick={goToNext}
            disabled={currentIndex >= data.exercises.length - 1}
          >
            Nästa
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </footer>
      )}

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentExercise?.nameSv || currentExercise?.name}
            </DialogTitle>
          </DialogHeader>
          {currentExercise?.videoUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                src={currentExercise.videoUrl}
                controls
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {currentExercise?.instructions ? (
            <p className="text-sm whitespace-pre-wrap">
              {currentExercise.instructions}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Inga instruktioner tillgängliga.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Workout Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avsluta pass</DialogTitle>
            <DialogDescription>
              {data.progress.isComplete
                ? 'Bra jobbat! Alla övningar är klara.'
                : `Du har gjort ${data.progress.completedSets} av ${data.progress.totalSetsTarget} set.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Hur svårt var passet? (RPE)
            </label>
            <div className="flex items-center gap-2">
              {[5, 6, 7, 8, 9, 10].map((rpe) => (
                <Button
                  key={rpe}
                  variant={sessionRPE === rpe ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSessionRPE(rpe)}
                  className="flex-1"
                >
                  {rpe}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sessionRPE <= 6
                ? 'Lätt'
                : sessionRPE <= 7
                  ? 'Måttligt'
                  : sessionRPE <= 8
                    ? 'Svårt'
                    : 'Mycket svårt'}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Fortsätt träna
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Avsluta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FocusModeWorkout
