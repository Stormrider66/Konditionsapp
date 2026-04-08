'use client'

/**
 * Strength Focus Mode
 *
 * Full-screen mobile-first workout execution UI for strength sessions.
 * Shows one exercise at a time, logs sets (weight, reps, RPE),
 * includes rest timer, and tracks completion progress.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Timer,
  Dumbbell,
  Flame,
  Target,
  Sparkles,
  Loader2,
  SkipForward,
} from 'lucide-react'
import { ExerciseImage } from '@/components/themed/ExerciseImage'

interface FocusModeExercise {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  imageUrls?: string[]
  instructions?: string
  sets: number
  repsTarget: number | string
  weight?: number
  tempo?: string
  restSeconds: number
  notes?: string
  section: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
  orderIndex: number
  completedSets: number
  setLogs: Array<{
    id: string
    setNumber: number
    weight: number
    repsCompleted: number
    rpe?: number
    estimated1RM?: number
  }>
}

interface StrengthFocusModeProps {
  assignmentId: string
  onClose: () => void
  onComplete?: () => void
}

const SECTION_ICONS: Record<string, typeof Dumbbell> = {
  WARMUP: Flame,
  MAIN: Dumbbell,
  CORE: Target,
  COOLDOWN: Sparkles,
}

const SECTION_COLORS: Record<string, string> = {
  WARMUP: 'text-yellow-500',
  MAIN: 'text-blue-500',
  CORE: 'text-purple-500',
  COOLDOWN: 'text-green-500',
}

export function StrengthFocusMode({ assignmentId, onClose, onComplete }: StrengthFocusModeProps) {
  const [exercises, setExercises] = useState<FocusModeExercise[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [workoutName, setWorkoutName] = useState('')
  const [progress, setProgress] = useState({ completedSets: 0, totalSetsTarget: 0, percentComplete: 0 })

  // Set logging state
  const [logWeight, setLogWeight] = useState('')
  const [logReps, setLogReps] = useState('')
  const [logRpe, setLogRpe] = useState<number | null>(null)
  const [isLoggingSet, setIsLoggingSet] = useState(false)

  // Rest timer
  const [restTimeLeft, setRestTimeLeft] = useState(0)
  const [isResting, setIsResting] = useState(false)

  // Completion
  const [showComplete, setShowComplete] = useState(false)
  const [sessionRpe, setSessionRpe] = useState(7)
  const [isCompleting, setIsCompleting] = useState(false)

  // Load workout data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (data.success) {
        setExercises(data.data.exercises)
        setCurrentIndex(data.data.progress.currentExerciseIndex)
        setProgress({
          completedSets: data.data.progress.completedSets,
          totalSetsTarget: data.data.progress.totalSetsTarget,
          percentComplete: data.data.progress.percentComplete,
        })
        setWorkoutName(data.data.workout.name)

        // Pre-fill weight from exercise data or last logged set
        const current = data.data.exercises[data.data.progress.currentExerciseIndex]
        if (current) {
          const lastLog = current.setLogs[current.setLogs.length - 1]
          setLogWeight(lastLog ? String(lastLog.weight) : current.weight ? String(current.weight) : '')
          const target = typeof current.repsTarget === 'number' ? current.repsTarget : parseInt(String(current.repsTarget)) || 0
          setLogReps(lastLog ? String(lastLog.repsCompleted) : String(target))
        }
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId])

  useEffect(() => { fetchData() }, [fetchData])

  // Rest timer countdown
  useEffect(() => {
    if (!isResting || restTimeLeft <= 0) return
    const interval = setInterval(() => {
      setRestTimeLeft((prev) => {
        if (prev <= 1) {
          setIsResting(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isResting, restTimeLeft])

  const currentExercise = exercises[currentIndex]

  // Pre-fill when changing exercise
  useEffect(() => {
    if (!currentExercise) return
    const lastLog = currentExercise.setLogs[currentExercise.setLogs.length - 1]
    setLogWeight(lastLog ? String(lastLog.weight) : currentExercise.weight ? String(currentExercise.weight) : '')
    const target = typeof currentExercise.repsTarget === 'number' ? currentExercise.repsTarget : parseInt(String(currentExercise.repsTarget)) || 0
    setLogReps(lastLog ? String(lastLog.repsCompleted) : String(target))
    setLogRpe(null)
  }, [currentIndex, currentExercise])

  // Log a set
  const handleLogSet = async () => {
    if (!currentExercise || isLoggingSet) return
    setIsLoggingSet(true)

    try {
      const res = await fetch(`/api/strength-sessions/${assignmentId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: currentExercise.exerciseId,
          setNumber: currentExercise.completedSets + 1,
          weight: parseFloat(logWeight) || 0,
          repsCompleted: parseInt(logReps) || 0,
          repsTarget: typeof currentExercise.repsTarget === 'number' ? currentExercise.repsTarget : parseInt(String(currentExercise.repsTarget)) || 0,
          rpe: logRpe,
        }),
      })

      if (res.ok) {
        // Start rest timer
        if (currentExercise.restSeconds > 0) {
          setRestTimeLeft(currentExercise.restSeconds)
          setIsResting(true)
        }

        // Refresh data to get updated progress
        await fetchData()

        // Check if all sets for this exercise are done
        if (currentExercise.completedSets + 1 >= currentExercise.sets) {
          // Auto-advance to next exercise after rest (or immediately if no rest)
          if (currentExercise.restSeconds <= 0 && currentIndex < exercises.length - 1) {
            setCurrentIndex(currentIndex + 1)
          }
        }
      }
    } catch {
      // Error
    } finally {
      setIsLoggingSet(false)
    }
  }

  // Complete workout
  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          rpe: sessionRpe,
        }),
      })
      onComplete?.()
      onClose()
    } catch {
      // Error
    } finally {
      setIsCompleting(false)
    }
  }

  // Navigate
  const goNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsResting(false)
    } else {
      setShowComplete(true)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsResting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (showComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
        <Check className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Pass klart!</h2>
        <p className="text-muted-foreground mb-6">{progress.completedSets} set loggade</p>

        <div className="w-full max-w-xs space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Hur tungt kändes passet? RPE: {sessionRpe}</p>
            <Slider
              value={[sessionRpe]}
              onValueChange={(v) => setSessionRpe(v[0])}
              min={1}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Lätt</span>
              <span>Maximalt</span>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleComplete} disabled={isCompleting}>
            {isCompleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Slutför pass
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Stäng
          </Button>
        </div>
      </div>
    )
  }

  if (!currentExercise) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Inga övningar att visa</p>
          <Button className="mt-4" onClick={onClose}>Stäng</Button>
        </div>
      </div>
    )
  }

  const SectionIcon = SECTION_ICONS[currentExercise.section] || Dumbbell
  const sectionColor = SECTION_COLORS[currentExercise.section] || 'text-gray-500'
  const setsRemaining = currentExercise.sets - currentExercise.completedSets

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          <SectionIcon className={`h-4 w-4 flex-shrink-0 ${sectionColor}`} />
          <span className="text-sm font-medium truncate">{workoutName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {progress.percentComplete}%
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress.percentComplete}%` }} />
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Exercise image */}
        {currentExercise.imageUrls && currentExercise.imageUrls.length > 0 ? (
          <div className="aspect-[4/3] bg-black/90 max-h-[250px]">
            <ExerciseImage
              imageUrls={currentExercise.imageUrls}
              exerciseId={currentExercise.exerciseId}
              size="lg"
              showCarousel={true}
              enableLightbox={false}
              className="w-full h-full"
            />
          </div>
        ) : null}

        <div className="p-4 space-y-4">
          {/* Exercise name & info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {currentIndex + 1}/{exercises.length}
              </Badge>
              <Badge variant="outline" className={`text-xs ${sectionColor}`}>
                {currentExercise.section}
              </Badge>
            </div>
            <h1 className="text-xl font-bold">{currentExercise.nameSv || currentExercise.name}</h1>
            {currentExercise.notes && (
              <p className="text-sm text-muted-foreground mt-1">{currentExercise.notes}</p>
            )}
          </div>

          {/* Target */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Set</p>
              <p className="text-lg font-bold">{currentExercise.completedSets}/{currentExercise.sets}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Reps</p>
              <p className="text-lg font-bold">{currentExercise.repsTarget}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Vikt</p>
              <p className="text-lg font-bold">{currentExercise.weight ? `${currentExercise.weight}kg` : '—'}</p>
            </div>
          </div>

          {/* Rest timer */}
          {isResting && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-center">
              <Timer className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-3xl font-mono font-bold text-blue-700">
                {Math.floor(restTimeLeft / 60)}:{String(restTimeLeft % 60).padStart(2, '0')}
              </p>
              <p className="text-xs text-blue-500 mt-1">Vila</p>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setIsResting(false)}>
                Hoppa över vila
              </Button>
            </div>
          )}

          {/* Set logging form */}
          {setsRemaining > 0 && !isResting && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">
                Logga set {currentExercise.completedSets + 1} av {currentExercise.sets}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Vikt (kg)</label>
                  <Input
                    type="number"
                    value={logWeight}
                    onChange={(e) => setLogWeight(e.target.value)}
                    placeholder="0"
                    className="text-center text-lg font-mono"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Reps</label>
                  <Input
                    type="number"
                    value={logReps}
                    onChange={(e) => setLogReps(e.target.value)}
                    placeholder="0"
                    className="text-center text-lg font-mono"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">RPE (valfritt): {logRpe || '—'}</label>
                <Slider
                  value={logRpe ? [logRpe] : [7]}
                  onValueChange={(v) => setLogRpe(v[0])}
                  min={1}
                  max={10}
                  step={0.5}
                />
              </div>

              <Button className="w-full" size="lg" onClick={handleLogSet} disabled={isLoggingSet}>
                {isLoggingSet ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Logga set
              </Button>
            </div>
          )}

          {/* Previous sets for this exercise */}
          {currentExercise.setLogs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Loggade set:</p>
              {currentExercise.setLogs.map((log) => (
                <div key={log.id} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-1.5">
                  <span>Set {log.setNumber}</span>
                  <span className="font-mono">{log.weight}kg × {log.repsCompleted}{log.rpe ? ` @RPE ${log.rpe}` : ''}</span>
                  {log.estimated1RM && <span className="text-xs text-muted-foreground">~{Math.round(log.estimated1RM)}kg 1RM</span>}
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          {currentExercise.instructions && (
            <div className="text-sm text-muted-foreground border-t pt-3">
              <p className="font-medium text-foreground mb-1">Instruktioner</p>
              <p className="whitespace-pre-line">{currentExercise.instructions}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goPrev} disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Förra
        </Button>

        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {exercises.length}
        </span>

        {setsRemaining <= 0 || currentExercise.section === 'WARMUP' || currentExercise.section === 'COOLDOWN' ? (
          <Button size="sm" onClick={goNext}>
            {currentIndex < exercises.length - 1 ? (
              <>Nästa <ChevronRight className="h-4 w-4 ml-1" /></>
            ) : (
              <>Klart <Check className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={goNext}>
            <SkipForward className="h-4 w-4 mr-1" />
            Hoppa
          </Button>
        )}
      </div>
    </div>
  )
}
