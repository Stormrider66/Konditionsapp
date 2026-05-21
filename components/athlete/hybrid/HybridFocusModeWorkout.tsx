'use client'

/**
 * HybridFocusModeWorkout Component
 *
 * Full-screen hybrid workout execution with format-specific timers.
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { X, Activity, CheckCircle2 } from 'lucide-react'

import { AMRAPTimer, EMOMTimer, ForTimeTimer, TabataTimer } from './timers'
import { MovementCheckCard } from './MovementCheckCard'
import { RoundTracker } from './RoundTracker'
import { useLiveVoiceCoach } from '@/hooks/use-live-voice-coach'
import { useAthleteHR } from '@/hooks/use-athlete-hr'
import { LiveVoiceCoachButton } from '@/components/athlete/cardio/LiveVoiceCoachButton'
import { useLocale, useTranslations } from '@/i18n/client'

type HybridFormat =
  | 'FOR_TIME'
  | 'AMRAP'
  | 'EMOM'
  | 'TABATA'
  | 'CHIPPER'
  | 'LADDER'
  | 'INTERVALS'
  | 'HYROX_SIM'

interface Movement {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  nameEn?: string
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weight?: number
  completed: boolean
}

interface HybridFocusModeWorkoutProps {
  assignmentId: string
  workoutName: string
  workoutDescription?: string
  format: HybridFormat
  timeCap?: number
  workTime?: number
  restTime?: number
  totalRounds: number
  totalMinutes?: number
  repScheme?: string
  repSchemeArray?: number[]
  movements: Movement[]
  scalingLevel: string
  onClose: () => void
  onComplete: (data: {
    totalTime?: number
    totalRounds?: number
    extraReps?: number
    sessionRPE: number
    notes?: string
  }) => void
  onRoundComplete: (
    roundNumber: number,
    movements: { movementId: string; movementName: string; reps: number | string; completed: boolean }[],
    duration?: number
  ) => Promise<void>
}

type TranslationKey = Parameters<ReturnType<typeof useTranslations>>[0]

const FORMAT_LABELS: Record<HybridFormat, TranslationKey> = {
  FOR_TIME: 'formats.forTime',
  AMRAP: 'formats.amrap',
  EMOM: 'formats.emom',
  TABATA: 'formats.tabata',
  CHIPPER: 'formats.chipper',
  LADDER: 'formats.ladder',
  INTERVALS: 'formats.intervals',
  HYROX_SIM: 'formats.hyroxSim',
}

export function HybridFocusModeWorkout({
  assignmentId,
  workoutName,
  format,
  timeCap = 0,
  workTime = 60,
  restTime = 0,
  totalRounds,
  totalMinutes,
  repSchemeArray = [],
  movements: initialMovements,
  scalingLevel,
  onClose,
  onComplete,
  onRoundComplete,
}: HybridFocusModeWorkoutProps) {
  const t = useTranslations('components.hybridFocusModeWorkout')
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const movements = initialMovements
  const movementDisplayName = useCallback(
    (movement: Movement) => locale === 'sv' ? movement.nameSv || movement.name : movement.nameEn || movement.name,
    [locale],
  )
  const [currentRound, setCurrentRound] = useState(1)
  const [completedRounds, setCompletedRounds] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [sessionRPE, setSessionRPE] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Movement completion status per round
  const [movementStatus, setMovementStatus] = useState<Record<number, Record<string, boolean>>>({})

  // Live AI Voice Coach
  const liveCoachConnectedRef = useRef(false)
  const hr = useAthleteHR(liveCoachConnectedRef.current)
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsedTime

  const liveCoach = useLiveVoiceCoach({
    assignmentId,
    workoutType: 'hybrid',
    segments: movements.map((m) => ({
      type: format,
      typeName: movementDisplayName(m),
      notes: [m.reps && `${m.reps} reps`, m.calories && `${m.calories} cal`, m.distance && `${m.distance}m`].filter(Boolean).join(', '),
    })),
    currentSegmentIndex: currentRound - 1,
    isTimerRunning: true,
    timerSecondsRemaining: timeCap ? timeCap - elapsedTime : null,
    heartRate: hr.heartRate,
    heartRateZone: hr.zone,
    toolCallbacks: {
      onEndCoaching: () => liveCoach.disconnect(),
      onPauseWorkout: () => {},
      onResumeWorkout: () => {},
      onAdjustIntensity: () => {},
      onSkipSegment: () => {},
      onExtendSegment: () => {},
      onMarkSegmentComplete: () => {},
      onCompleteRound: () => {
        void handleRoundComplete()
      },
      onGetWorkoutTimer: () => ({
        elapsedSeconds: elapsedRef.current,
        remainingSeconds: timeCap ? timeCap - elapsedRef.current : null,
        currentRound,
        totalRounds: totalRounds || null,
      }),
    },
  })
  liveCoachConnectedRef.current = liveCoach.status === 'connected'

  // Get movements completed in current round (memoized to prevent unnecessary re-renders)
  const currentRoundStatus = useMemo(
    () => movementStatus[currentRound] || {},
    [movementStatus, currentRound]
  )
  // Calculate progress
  const progressPercent = totalRounds > 0 ? (completedRounds / totalRounds) * 100 : 0

  // Toggle movement completion
  const toggleMovement = (movementId: string) => {
    setMovementStatus((prev) => ({
      ...prev,
      [currentRound]: {
        ...prev[currentRound],
        [movementId]: !prev[currentRound]?.[movementId],
      },
    }))
  }

  // Handle round completion
  const handleRoundComplete = useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // Build movement logs
      const movementLogs = movements.map((m) => ({
        movementId: m.id,
        movementName: m.name,
        reps: m.reps || m.calories || m.distance || 0,
        completed: currentRoundStatus[m.id] || false,
      }))

      await onRoundComplete(currentRound, movementLogs)

      setCompletedRounds((prev) => prev + 1)

      // Check if workout is complete
      if (currentRound >= totalRounds) {
        setShowCompleteDialog(true)
      } else {
        // Reset for next round
        setCurrentRound((prev) => prev + 1)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [currentRound, totalRounds, movements, currentRoundStatus, onRoundComplete, isSubmitting])

  // Handle timer complete callbacks
  const handleTimerComplete = useCallback(() => {
    setShowCompleteDialog(true)
  }, [])

  const handleAMRAPRoundComplete = useCallback(() => {
    setCompletedRounds((prev) => prev + 1)
  }, [])

  const handleEMOMMinuteComplete = useCallback(
    async (minute: number) => {
      // For EMOM, each minute is a "round"
      const movementLogs = movements.map((m) => ({
        movementId: m.id,
        movementName: m.name,
        reps: m.reps || 0,
        completed: true,
      }))

      await onRoundComplete(minute, movementLogs)
      setCompletedRounds(minute)
    },
    [movements, onRoundComplete]
  )

  const handleTabataRoundComplete = useCallback(
    async (round: number) => {
      const movementLogs = movements.map((m) => ({
        movementId: m.id,
        movementName: m.name,
        reps: m.reps || 0,
        completed: true,
      }))

      await onRoundComplete(round, movementLogs)
      setCompletedRounds(round)
    },
    [movements, onRoundComplete]
  )

  const handleForTimeComplete = useCallback(
    (time: number) => {
      setElapsedTime(time)
      setShowCompleteDialog(true)
    },
    []
  )

  // Final completion
  const handleFinalComplete = () => {
    onComplete({
      totalTime: elapsedTime || undefined,
      totalRounds: completedRounds,
      sessionRPE,
    })
  }

  // Render format-specific timer
  const renderTimer = () => {
    switch (format) {
      case 'AMRAP':
        return (
          <AMRAPTimer
            timeCap={timeCap || 600}
            roundCount={completedRounds}
            onComplete={handleTimerComplete}
            onRoundComplete={handleAMRAPRoundComplete}
          />
        )

      case 'EMOM':
        return (
          <EMOMTimer
            totalMinutes={totalRounds || totalMinutes || 1}
            workTime={workTime}
            restTime={restTime}
            currentMinute={currentRound}
            onComplete={handleTimerComplete}
            onMinuteComplete={handleEMOMMinuteComplete}
          />
        )

      case 'TABATA':
        return (
          <TabataTimer
            workTime={workTime || 20}
            restTime={restTime || 10}
            totalRounds={totalRounds || 8}
            onComplete={handleTimerComplete}
            onRoundComplete={handleTabataRoundComplete}
          />
        )

      case 'FOR_TIME':
      case 'CHIPPER':
      case 'LADDER':
        return (
          <ForTimeTimer
            timeCap={timeCap}
            onComplete={handleForTimeComplete}
            onTimeCapReached={handleTimerComplete}
          />
        )

      default:
        return (
          <ForTimeTimer
            timeCap={timeCap}
            onComplete={handleForTimeComplete}
          />
        )
    }
  }

  // Render movements checklist
  const renderMovements = () => {
    // For timed formats (AMRAP, EMOM, TABATA), show movements alongside timer
    // For completion formats (FOR_TIME, CHIPPER), show movements for checking off
    const isChecklistFormat = ['FOR_TIME', 'CHIPPER', 'LADDER', 'INTERVALS'].includes(format)

    if (!isChecklistFormat) {
      return (
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
          <p className="text-sm text-muted-foreground mb-2">{t('movementsPerRound')}</p>
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
            >
              <span className="text-sm">{movementDisplayName(movement)}</span>
              <div className="flex gap-2 text-xs">
                {movement.reps && <Badge variant="secondary">{movement.reps}</Badge>}
                {movement.calories && <Badge variant="secondary">{movement.calories} cal</Badge>}
                {movement.distance && <Badge variant="secondary">{movement.distance}m</Badge>}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Round info */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('roundOfTotal', { current: currentRound, total: totalRounds })}
          </span>
          {repSchemeArray[currentRound - 1] && (
            <Badge variant="outline">
              {repSchemeArray[currentRound - 1]} reps
            </Badge>
          )}
        </div>

        {/* Round tracker */}
        <RoundTracker
          totalRounds={totalRounds}
          currentRound={currentRound}
          completedRounds={completedRounds}
          repScheme={repSchemeArray}
        />

        {/* Movements checklist */}
        <div className="space-y-2">
          {movements.map((movement) => (
            <MovementCheckCard
              key={movement.id}
              name={movementDisplayName(movement)}
              nameSv={movement.nameSv}
              reps={movement.reps}
              calories={movement.calories}
              distance={movement.distance}
              duration={movement.duration}
              weight={movement.weight}
              completed={currentRoundStatus[movement.id] || false}
              onToggle={() => toggleMovement(movement.id)}
            />
          ))}
        </div>

        {/* Complete round button */}
        <Button
          size="lg"
          className="w-full h-14"
          onClick={handleRoundComplete}
          disabled={isSubmitting}
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {currentRound >= totalRounds ? t('actions.finishWorkout') : t('actions.roundDone')}
        </Button>
      </div>
    )
  }

  const isTimedFormat = ['AMRAP', 'EMOM', 'TABATA'].includes(format)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)}>
          <X className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h1 className="font-semibold text-sm">{workoutName}</h1>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              {t(FORMAT_LABELS[format])}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {scalingLevel}
            </Badge>
          </div>
        </div>
        {liveCoach.supported ? (
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
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b">
        <div className="flex items-center gap-4">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground font-medium">
            {completedRounds}/{totalRounds}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isTimedFormat ? (
          <div className="space-y-6">
            {renderTimer()}
            {renderMovements()}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timer at top for For Time formats */}
            {renderTimer()}
            {/* Movements checklist below */}
            {renderMovements()}
          </div>
        )}
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exit.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exit.description', { completed: completedRounds, total: totalRounds })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('exit.continue')}</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>{t('exit.end')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completion dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t('completion.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('completion.description', { completed: completedRounds })}
              {elapsedTime > 0 && ` ${t('completion.time', {
                time: `${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`,
              })}`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {/* RPE Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {t('rpe.label')}
                </Label>
                <Badge variant="outline" className="text-lg px-3">
                  {sessionRPE}
                </Badge>
              </div>
              <Slider
                value={[sessionRPE]}
                onValueChange={([value]) => setSessionRPE(value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('rpe.easy')}</span>
                <span>{t('rpe.moderate')}</span>
                <span>{t('rpe.hard')}</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleFinalComplete}>
              {t('actions.finishWorkout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default HybridFocusModeWorkout
