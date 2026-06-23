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
  ShieldCheck,
  Loader2,
  Info,
  AlertCircle,
} from 'lucide-react'
import { SetLoggingForm, SetLogData } from './SetLoggingForm'
import { RestTimer } from './RestTimer'
import { useLiveVoiceCoach } from '@/hooks/use-live-voice-coach'
import { useAthleteHR } from '@/hooks/use-athlete-hr'
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock'
import { LiveVoiceCoachButton } from '@/components/athlete/cardio/LiveVoiceCoachButton'
import { ExerciseImage } from '@/components/themed/ExerciseImage'
import { ExerciseHeader } from '@/components/themed/ExerciseHeader'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import { Player } from '@remotion/player'
import { ExerciseAnimation } from '@/remotion/exercises/ExerciseAnimation'
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client'
import { useLocale, useTranslations } from '@/i18n/client'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'

interface FocusModeExercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  nameEn?: string
  videoUrl?: string
  instructions?: string
  imageUrls?: string[]
  sets: number
  repsTarget: number | string
  weight?: number
  lastPerformance?: {
    weight: number
    reps: number
    repsTarget: number | null
    date: string
    sameScheme: boolean
  }
  tempo?: string
  restSeconds: number
  notes?: string
  section: 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'
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
    type: 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'
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
    labelKey: 'sections.warmup',
    color: 'bg-amber-500',
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    icon: Flame,
  },
  MAIN: {
    labelKey: 'sections.main',
    color: 'bg-primary',
    textColor: 'text-primary',
    bgColor: 'bg-primary/10',
    icon: Dumbbell,
  },
  CORE: {
    labelKey: 'sections.core',
    color: 'bg-purple-500',
    textColor: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    icon: Target,
  },
  PREHAB: {
    labelKey: 'sections.prehab',
    color: 'bg-teal-500',
    textColor: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    icon: ShieldCheck,
  },
  COOLDOWN: {
    labelKey: 'sections.cooldown',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    icon: Timer,
  },
}

export function FocusModeWorkout({
  assignmentId,
  onClose,
  basePath: basePathProp = '',
}: FocusModeWorkoutProps) {
  const t = useTranslations('components.focusModeWorkout')
  const locale = useLocale()
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
  const { isActive: screenAwake } = useScreenWakeLock()

  // Live AI Voice Coach
  const [pollLiveHr, setPollLiveHr] = useState(false)
  const hr = useAthleteHR(pollLiveHr)

  const liveCoach = useLiveVoiceCoach({
    assignmentId,
    workoutType: 'strength',
    segments: data?.exercises.map((e) => ({
      type: e.section,
      typeName: e.name,
      plannedDuration: undefined,
      plannedZone: undefined,
      notes: `${e.sets} sets × ${e.repsTarget} reps${e.weight ? ` @ ${e.weight}kg` : ''}`,
    })) ?? [],
    currentSegmentIndex: currentIndex,
    isTimerRunning: showRestTimer,
    timerSecondsRemaining: null,
    heartRate: hr.heartRate,
    heartRateZone: hr.zone,
    toolCallbacks: {
      onPauseWorkout: () => {},
      onResumeWorkout: () => {},
      onAdjustIntensity: () => {},
      onSkipSegment: () => {},
      onExtendSegment: () => {},
      onMarkSegmentComplete: () => {},
      onGetExerciseStatus: () => {
        if (!currentExercise) return null
        const lastLog = currentExercise.setLogs[currentExercise.setLogs.length - 1]
        return {
          exerciseName: getExerciseDisplayName(currentExercise, locale),
          completedSets: currentExercise.completedSets,
          targetSets: currentExercise.sets,
          targetReps: currentExercise.repsTarget,
          targetWeight: currentExercise.weight ?? null,
          lastSetWeight: lastLog?.weight ?? null,
          lastSetReps: lastLog?.repsCompleted ?? null,
          nextSetNumber: currentExercise.completedSets + 1,
        }
      },
      onLogSet: async (logData) => {
        if (!currentExercise) return { success: false }
        try {
          const response = await fetch(`/api/strength-sessions/${assignmentId}/sets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              exerciseId: currentExercise.exerciseId,
              setNumber: currentExercise.completedSets + 1,
              weight: logData.weight,
              repsCompleted: logData.reps,
              repsTarget: typeof currentExercise.repsTarget === 'number' ? currentExercise.repsTarget : undefined,
              rpe: logData.rpe,
            }),
          })
          if (!response.ok) return { success: false }
          const result = await response.json()
          await fetchWorkoutData()
          if (currentExercise.restSeconds > 0) {
            setRestTime(currentExercise.restSeconds)
            setShowRestTimer(true)
          }
          return {
            success: true,
            estimated1RM: result.data?.estimated1RM,
            setNumber: result.data?.setLog?.setNumber,
            completedSets: (currentExercise.completedSets || 0) + 1,
            targetSets: currentExercise.sets,
          }
        } catch {
          return { success: false }
        }
      },
      onSkipExercise: () => {
        if (data && currentIndex < data.exercises.length - 1) {
          setCurrentIndex((prev) => prev + 1)
          setShowRestTimer(false)
        }
      },
      onCompleteExercise: () => {
        if (data && currentIndex < data.exercises.length - 1) {
          setCurrentIndex((prev) => prev + 1)
          setShowRestTimer(false)
        }
      },
      onStartRestTimer: (seconds) => {
        setRestTime(seconds ?? currentExercise?.restSeconds ?? 90)
        setShowRestTimer(true)
      },
    },
  })
  const liveCoachActive = liveCoach.status === 'connected'
  useEffect(() => {
    setPollLiveHr((prev) => (prev === liveCoachActive ? prev : liveCoachActive))
  }, [liveCoachActive])

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
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId, t])

  useEffect(() => {
    void fetchWorkoutData()
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
      const completionPayload = {
        status: 'COMPLETED',
        rpe: sessionRPE,
      }
      let response = await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionPayload),
      })

      const futureWarning = await readFutureCompletionWarning(response)
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) return
        response = await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...completionPayload, allowFutureCompletion: true }),
        })
      }

      if (!response.ok) throw new Error('Failed to complete workout')

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
          <p className="text-muted-foreground">{t('loading')}</p>
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
            <h3 className="font-medium mb-2">{t('errors.loadTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleClose}>{t('actions.goBack')}</Button>
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
            {t(sectionConfig.labelKey)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {screenAwake && (
            <Badge variant="outline" className="gap-1 text-xs">
              <ShieldCheck className="h-3 w-3" />
              <span className="hidden sm:inline">{locale === 'sv' ? 'Skarm aktiv' : 'Screen awake'}</span>
            </Badge>
          )}
          {liveCoach.supported && (
            <LiveVoiceCoachButton
              status={liveCoach.status}
              isListening={liveCoach.isListening}
              isSpeaking={liveCoach.isSpeaking}
              isMuted={liveCoach.isMuted}
              transcript={liveCoach.transcript}
              error={liveCoach.error}
              aiAllowanceAction={liveCoach.aiAllowanceAction}
              supported={liveCoach.supported}
              onConnect={liveCoach.connect}
              onDisconnect={liveCoach.disconnect}
              onToggleMute={liveCoach.toggleMute}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { liveCoach.disconnect(); setShowCompleteDialog(true) }}
          >
            {t('actions.finish')}
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            {t('progress.exerciseCounter', { current: currentIndex + 1, total: data.exercises.length })}
          </span>
          <span>{t('progress.percentComplete', { percent: data.progress.percentComplete })}</span>
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
                  ? 'bg-emerald-500'
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
                      nameEn={currentExercise.nameEn || currentExercise.name}
                      name={currentExercise.name}
                      locale={locale}
                      size="xl"
                      showSubtitle
                      className="rounded-b-none"
                    />
                    {/* Exercise Image or Remotion Animation */}
                    {currentExercise.imageUrls.length > 1 ? (
                      <div className="w-full max-w-sm aspect-square bg-black rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0">
                          <Player
                            component={ExerciseAnimation}
                            inputProps={{ imageUrls: currentExercise.imageUrls }}
                            durationInFrames={300}
                            fps={30}
                            compositionWidth={1024}
                            compositionHeight={1024}
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
                      {getExerciseDisplayName(currentExercise, locale)}
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
                    variant="secondary"
                    className="w-full text-foreground"
                    onClick={() => setShowInstructions(true)}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    {t('instructions.show')}
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
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : isCurrent
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/30'
                          }`}
                      >
                        <p className="text-sm font-medium">Set {setNum}</p>
                        {isCompleted ? (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4 mx-auto" />
                            {log.weight}kg × {log.repsCompleted}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {isCurrent ? t('sets.current') : t('sets.waiting')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Rest time info */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>{t('rest.label', { seconds: currentExercise.restSeconds })}</span>
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
                    lastSession={currentExercise.lastPerformance}
                    onSubmit={handleSetSubmit}
                  />
                )}

                {/* Exercise complete message */}
                {isExerciseComplete && (
                  <Card className="bg-emerald-500/10 border-emerald-500/40">
                    <CardContent className="pt-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        {t('exerciseComplete.title')}
                      </p>
                      {currentIndex < data.exercises.length - 1 ? (
                        <Button
                          className="mt-4"
                          onClick={goToNext}
                        >
                          {t('actions.nextExercise')}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          className="mt-4"
                          onClick={() => setShowCompleteDialog(true)}
                        >
                          {t('actions.finishWorkout')}
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
            variant="secondary"
            className="text-foreground"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('actions.previous')}
          </Button>
          <Button
            variant="secondary"
            className="text-foreground"
            onClick={goToNext}
            disabled={currentIndex >= data.exercises.length - 1}
          >
            {t('actions.next')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </footer>
      )}

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentExercise ? getExerciseDisplayName(currentExercise, locale) : ''}
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
              {t('instructions.empty')}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Workout Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('completeDialog.title')}</DialogTitle>
            <DialogDescription>
              {data.progress.isComplete
                ? t('completeDialog.allDone')
                : t('completeDialog.partial', { completed: data.progress.completedSets, total: data.progress.totalSetsTarget })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              {t('completeDialog.rpeQuestion')}
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
                ? t('rpe.easy')
                : sessionRPE <= 7
                  ? t('rpe.moderate')
                  : sessionRPE <= 8
                    ? t('rpe.hard')
                    : t('rpe.veryHard')}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              className="text-foreground"
              onClick={() => setShowCompleteDialog(false)}
            >
              {t('actions.continueTraining')}
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t('actions.finish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FocusModeWorkout
