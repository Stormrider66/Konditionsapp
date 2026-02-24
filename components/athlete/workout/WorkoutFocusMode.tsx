'use client'

/**
 * WorkoutFocusMode Component
 *
 * Full-screen, mobile-first workout execution view for traditional Workout entities.
 * Shows one exercise at a time with swipe navigation.
 */

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  CheckCircle2,
  Dumbbell,
  Timer,
  Flame,
  Target,
  Loader2,
  Info,
  Play,
} from 'lucide-react'
import { SetLoggingForm, SetLogData } from './SetLoggingForm'
import { RestTimer } from './RestTimer'
import { ExerciseImage } from '@/components/themed/ExerciseImage'
import { ExerciseHeader } from '@/components/themed/ExerciseHeader'
import { Player } from '@remotion/player'
import { ExerciseAnimation } from '@/remotion/exercises/ExerciseAnimation'
import { useToast } from '@/hooks/use-toast'

interface FocusModeExercise {
  id: string
  segmentId: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  imageUrls?: string[]
  sets: number
  repsTarget: number | string
  weight?: string
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
    completedAt: Date
  }[]
}

interface WorkoutFocusModeProps {
  workoutId: string
  athleteId: string
  existingLogId?: string
  workout: {
    id: string
    name: string
    type: string
    intensity: string
    description?: string
    duration?: number
  }
  sections: {
    type: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
    name: string
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
  onClose: () => void
  onComplete: () => void
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

export function WorkoutFocusMode({
  workoutId,
  athleteId,
  existingLogId,
  workout,
  sections,
  exercises: initialExercises,
  progress: initialProgress,
  onClose,
  onComplete,
}: WorkoutFocusModeProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [exercises, setExercises] = useState(initialExercises)
  const [progress, setProgress] = useState(initialProgress)
  const [currentIndex, setCurrentIndex] = useState(initialProgress.currentExerciseIndex)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [sessionRPE, setSessionRPE] = useState<number>(7)
  const [restTime, setRestTime] = useState(90)
  const [workoutLogId, setWorkoutLogId] = useState<string | undefined>(existingLogId)

  // Current exercise
  const currentExercise = useMemo(
    () => exercises[currentIndex] || null,
    [exercises, currentIndex]
  )

  // Navigate between exercises
  const goToNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setShowRestTimer(false)
    }
  }, [currentIndex, exercises.length])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setShowRestTimer(false)
    }
  }, [currentIndex])

  // Ensure workout log exists
  const ensureWorkoutLog = async (): Promise<string> => {
    if (workoutLogId) return workoutLogId

    // Create a new workout log
    const response = await fetch(`/api/workouts/${workoutId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutId,
        athleteId,
        completed: false,
        completedAt: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create workout log')
    }

    const result = await response.json()
    const newLogId = result.id || result.data?.id
    setWorkoutLogId(newLogId)
    return newLogId
  }

  // Handle set submission
  const handleSetSubmit = async (setData: SetLogData) => {
    try {
      const logId = await ensureWorkoutLog()

      // Create set log
      const response = await fetch(`/api/workouts/${workoutId}/logs/${logId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: setData.exerciseId,
          setNumber: setData.setNumber,
          weight: setData.weight,
          repsCompleted: setData.repsCompleted,
          rpe: setData.rpe,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to log set')
      }

      const result = await response.json()

      // Update local state
      setExercises((prevExercises) =>
        prevExercises.map((ex) => {
          if (ex.exerciseId === setData.exerciseId) {
            return {
              ...ex,
              completedSets: ex.completedSets + 1,
              setLogs: [
                ...ex.setLogs,
                {
                  id: result.id || result.data?.id,
                  setNumber: setData.setNumber,
                  weight: setData.weight,
                  repsCompleted: setData.repsCompleted,
                  rpe: setData.rpe,
                  completedAt: new Date(),
                },
              ],
            }
          }
          return ex
        })
      )

      // Update progress
      setProgress((prev) => ({
        ...prev,
        completedSets: prev.completedSets + 1,
        percentComplete: Math.round(
          ((prev.completedSets + 1) / prev.totalSetsTarget) * 100
        ),
        isComplete: prev.completedSets + 1 >= prev.totalSetsTarget,
      }))

      // Show rest timer after logging set
      if (currentExercise) {
        setRestTime(currentExercise.restSeconds)
        setShowRestTimer(true)
      }
    } catch (err) {
      console.error('Error logging set:', err)
      toast({
        title: 'Kunde inte spara set',
        description: 'Försök igen',
        variant: 'destructive',
      })
      throw err
    }
  }

  // Handle workout completion
  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const logId = await ensureWorkoutLog()

      // Update workout log as complete
      await fetch(`/api/workouts/${workoutId}/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          perceivedEffort: sessionRPE,
          completedAt: new Date().toISOString(),
        }),
      })

      toast({
        title: 'Pass slutfört!',
        description: 'Bra jobbat!',
      })

      setShowCompleteDialog(false)
      onComplete()
    } catch (err) {
      console.error('Error completing workout:', err)
      toast({
        title: 'Kunde inte slutföra pass',
        description: 'Försök igen',
        variant: 'destructive',
      })
    } finally {
      setIsCompleting(false)
    }
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

  // Parse weight string to number
  const parseWeight = (weight?: string): number | undefined => {
    if (!weight) return undefined
    const match = weight.match(/(\d+(?:\.\d+)?)/)
    return match ? parseFloat(match[1]) : undefined
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <div className="text-center flex-1">
          <p className="font-medium text-sm">{workout.name}</p>
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
            Övning {currentIndex + 1} av {exercises.length}
          </span>
          <span>{progress.percentComplete}% klart</span>
        </div>
        <Progress value={progress.percentComplete} className="h-2" />
      </div>

      {/* Exercise navigation dots */}
      <div className="flex justify-center gap-1 py-2 overflow-x-auto px-4">
        {exercises.map((ex, idx) => {
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
              if (isExerciseComplete && currentIndex < exercises.length - 1) {
                goToNext()
              }
            }}
            onSkip={() => {
              setShowRestTimer(false)
              if (isExerciseComplete && currentIndex < exercises.length - 1) {
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
                    {currentExercise.imageUrls && currentExercise.imageUrls.length > 1 ? (
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
                        {currentExercise.weight && ` @ ${currentExercise.weight}`}
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
                      {currentExercise.weight && ` @ ${currentExercise.weight}`}
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
                          ? 'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/30'
                          : isCurrent
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/30'
                          }`}
                      >
                        <p className="text-sm font-medium">Set {setNum}</p>
                        {isCompleted ? (
                          <div className="text-xs text-green-600 dark:text-green-400">
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
                    targetWeight={parseWeight(currentExercise.weight)}
                    targetReps={currentExercise.repsTarget}
                    previousWeight={lastLog?.weight}
                    previousReps={lastLog?.repsCompleted}
                    onSubmit={handleSetSubmit}
                  />
                )}

                {/* Exercise complete message */}
                {isExerciseComplete && (
                  <Card className="bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/30">
                    <CardContent className="pt-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Övning klar!
                      </p>
                      {currentIndex < exercises.length - 1 ? (
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
            disabled={currentIndex >= exercises.length - 1}
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
              {progress.isComplete
                ? 'Bra jobbat! Alla övningar är klara.'
                : `Du har gjort ${progress.completedSets} av ${progress.totalSetsTarget} set.`}
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

export default WorkoutFocusMode
