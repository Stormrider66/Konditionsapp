'use client'

/**
 * HybridFocusModeWorkout Component
 *
 * Full-screen hybrid workout execution with format-specific timers.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { cn } from '@/lib/utils'

import { AMRAPTimer, EMOMTimer, ForTimeTimer, TabataTimer } from './timers'
import { MovementCheckCard } from './MovementCheckCard'
import { RoundTracker } from './RoundTracker'

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

const FORMAT_LABELS: Record<HybridFormat, string> = {
  FOR_TIME: 'For Time',
  AMRAP: 'AMRAP',
  EMOM: 'EMOM',
  TABATA: 'Tabata',
  CHIPPER: 'Chipper',
  LADDER: 'Ladder',
  INTERVALS: 'Intervaller',
  HYROX_SIM: 'HYROX Sim',
}

export function HybridFocusModeWorkout({
  assignmentId,
  workoutName,
  workoutDescription,
  format,
  timeCap = 0,
  workTime = 60,
  restTime = 0,
  totalRounds,
  totalMinutes,
  repScheme,
  repSchemeArray = [],
  movements: initialMovements,
  scalingLevel,
  onClose,
  onComplete,
  onRoundComplete,
}: HybridFocusModeWorkoutProps) {
  const [movements, setMovements] = useState<Movement[]>(initialMovements)
  const [currentRound, setCurrentRound] = useState(1)
  const [completedRounds, setCompletedRounds] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [sessionRPE, setSessionRPE] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Movement completion status per round
  const [movementStatus, setMovementStatus] = useState<Record<number, Record<string, boolean>>>({})

  // Get movements completed in current round (memoized to prevent unnecessary re-renders)
  const currentRoundStatus = useMemo(
    () => movementStatus[currentRound] || {},
    [movementStatus, currentRound]
  )
  const allMovementsComplete = movements.every((m) => currentRoundStatus[m.id])

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
            totalMinutes={totalMinutes || totalRounds}
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
          <p className="text-sm text-muted-foreground mb-2">Övningar per runda:</p>
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
            >
              <span className="text-sm">{movement.nameSv || movement.name}</span>
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
            Runda {currentRound} av {totalRounds}
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
              name={movement.name}
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
          {currentRound >= totalRounds ? 'Slutför pass' : 'Runda klar'}
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
              {FORMAT_LABELS[format]}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {scalingLevel}
            </Badge>
          </div>
        </div>
        <div className="w-10" />
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
            <AlertDialogTitle>Avsluta pass?</AlertDialogTitle>
            <AlertDialogDescription>
              Du har slutfört {completedRounds} av {totalRounds} rundor.
              Din framsteg sparas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt träna</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>Avsluta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completion dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Pass slutfört!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bra jobbat! Du slutförde {completedRounds} rundor.
              {elapsedTime > 0 && ` Tid: ${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {/* RPE Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Hur tungt kändes passet? (RPE)
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
                <span>Lätt</span>
                <span>Måttligt</span>
                <span>Hårt</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleFinalComplete}>
              Slutför pass
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default HybridFocusModeWorkout
