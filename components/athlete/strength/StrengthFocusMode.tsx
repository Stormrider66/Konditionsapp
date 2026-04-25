'use client'

/**
 * Strength Focus Mode
 *
 * Full-screen mobile-first workout execution UI for strength sessions.
 * Shows one exercise at a time, logs sets (weight, reps, RPE),
 * includes rest timer, and tracks completion progress.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Link2,
} from 'lucide-react'
import { ExerciseImage } from '@/components/themed/ExerciseImage'

interface SetLogSummary {
  id: string
  setNumber: number
  weight: number
  repsCompleted: number
  rpe?: number
  estimated1RM?: number
}

interface FocusModeFollowUp {
  exerciseId: string
  name: string
  nameSv?: string
  imageUrls?: string[]
  instructions?: string
  repsTarget: number | string
  weight?: number
  restBeforeSeconds: number
  notes?: string
  completedSets: number
  setLogs: SetLogSummary[]
}

interface FocusModeSetRow {
  reps: number | string
  weight?: number
}

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
  setLogs: SetLogSummary[]
  followUps?: FocusModeFollowUp[]
  setRows?: FocusModeSetRow[]
}

/**
 * Active entity in a block: either the primary exercise (stage 0) or
 * a follow-up at stage 1..N. Collapsed to a common shape so the UI /
 * logging code can treat both uniformly.
 */
interface ActiveStage {
  stage: number // 0 = primary, 1..N = followUps[stage-1]
  exerciseId: string
  name: string
  nameSv?: string
  imageUrls?: string[]
  instructions?: string
  repsTarget: number | string
  weight?: number
  notes?: string
  completedSets: number
  setLogs: SetLogSummary[]
  // Total rounds is always driven by the primary's `sets` — follow-ups
  // run once per primary round.
  totalRounds: number
  // Pause before this stage starts (0 for primary, configurable for follow-ups).
  restBeforeSeconds: number
}

/**
 * Resume logic. A round is complete when primary and every follow-up
 * each have one more log for that round. If primary is ahead of a
 * follow-up, we're mid-round and the next stage to execute is whichever
 * follow-up is behind. If everyone's tied, the next stage is primary
 * (start of a new round).
 */
function computeCurrentStage(ex: FocusModeExercise | undefined): number {
  if (!ex) return 0
  const primaryDone = ex.completedSets
  const followUps = ex.followUps ?? []
  for (let i = 0; i < followUps.length; i++) {
    if (followUps[i].completedSets < primaryDone) return i + 1
  }
  return 0
}

function buildActiveStage(
  ex: FocusModeExercise | undefined,
  stage: number
): ActiveStage | null {
  if (!ex) return null
  const followUps = ex.followUps ?? []
  if (stage === 0) {
    // Pyramid loading: when setRows is present, the upcoming set's
    // prescription comes from setRows[completedSets] (the row for the
    // round we're about to log). Falls back to the flat values when
    // we've outrun the row count, which shouldn't happen if the builder
    // keeps setRows in sync with `sets`.
    const row = ex.setRows?.[ex.completedSets]
    return {
      stage: 0,
      exerciseId: ex.exerciseId,
      name: ex.name,
      nameSv: ex.nameSv,
      imageUrls: ex.imageUrls,
      instructions: ex.instructions,
      repsTarget: row?.reps ?? ex.repsTarget,
      weight: row?.weight ?? ex.weight,
      notes: ex.notes,
      completedSets: ex.completedSets,
      setLogs: ex.setLogs,
      totalRounds: ex.sets,
      restBeforeSeconds: 0,
    }
  }
  const f = followUps[stage - 1]
  if (!f) return null
  return {
    stage,
    exerciseId: f.exerciseId,
    name: f.name,
    nameSv: f.nameSv,
    imageUrls: f.imageUrls,
    instructions: f.instructions,
    repsTarget: f.repsTarget,
    weight: f.weight,
    notes: f.notes,
    completedSets: f.completedSets,
    setLogs: f.setLogs,
    totalRounds: ex.sets,
    restBeforeSeconds: f.restBeforeSeconds,
  }
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

  // Rest timer. `restReason` drives the label — 'round' = full rest
  // between rounds of a block, 'stage' = short pause between primary
  // and follow-up (classic superset → 0s, contrast/PAP → 15–30s).
  const [restTimeLeft, setRestTimeLeft] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [restReason, setRestReason] = useState<'round' | 'stage'>('round')

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

  // Derive the active stage from server truth. Re-computes on every
  // fetchData refresh, so resume after reload / crash is automatic.
  const currentStage = useMemo(
    () => computeCurrentStage(currentExercise),
    [currentExercise]
  )
  const activeStage = useMemo(
    () => buildActiveStage(currentExercise, currentStage),
    [currentExercise, currentStage]
  )
  const followUpsCount = currentExercise?.followUps?.length ?? 0

  // Pre-fill when the active stage changes (new exercise, or moving
  // between stages of a block). For pyramid loading (setRows present)
  // the prescription differs per set, so we always pre-fill with the
  // upcoming set's prescribed values rather than echoing the last log
  // — otherwise the athlete would have to manually overwrite the prior
  // set's heavier/lighter load every time.
  const isPyramidPrimary =
    currentExercise?.setRows != null &&
    currentExercise.setRows.length > 0 &&
    activeStage?.stage === 0
  useEffect(() => {
    if (!activeStage) return
    const lastLog = activeStage.setLogs[activeStage.setLogs.length - 1]
    const target = typeof activeStage.repsTarget === 'number'
      ? activeStage.repsTarget
      : parseInt(String(activeStage.repsTarget)) || 0
    if (isPyramidPrimary) {
      setLogWeight(activeStage.weight != null ? String(activeStage.weight) : '')
      setLogReps(String(target))
    } else {
      setLogWeight(lastLog ? String(lastLog.weight) : activeStage.weight ? String(activeStage.weight) : '')
      setLogReps(lastLog ? String(lastLog.repsCompleted) : String(target))
    }
    setLogRpe(null)
  }, [activeStage?.exerciseId, activeStage?.completedSets, isPyramidPrimary]) // eslint-disable-line react-hooks/exhaustive-deps

  // Log a set. For a block with follow-ups, post against the current
  // stage's exerciseId. Then decide the next step: contrast pause →
  // next stage, main rest → next round, or advance to next block.
  const handleLogSet = async () => {
    if (!currentExercise || !activeStage || isLoggingSet) return
    setIsLoggingSet(true)

    // Snapshot the stage state before the network call — React state
    // won't update inside this handler, and we need these values to
    // decide the post-log transition.
    const stageAtLog = activeStage.stage
    const roundJustLogged = activeStage.completedSets + 1
    const isLastStage = stageAtLog >= followUpsCount
    const isLastRound = roundJustLogged >= currentExercise.sets
    const repsTargetNum = typeof activeStage.repsTarget === 'number'
      ? activeStage.repsTarget
      : parseInt(String(activeStage.repsTarget)) || 0

    try {
      const res = await fetch(`/api/strength-sessions/${assignmentId}/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: activeStage.exerciseId,
          setNumber: roundJustLogged,
          weight: parseFloat(logWeight) || 0,
          repsCompleted: parseInt(logReps) || 0,
          repsTarget: repsTargetNum,
          rpe: logRpe,
        }),
      })

      if (res.ok) {
        if (!isLastStage) {
          // Another stage in this block comes next. Show a "contrast
          // pause" timer only if the upcoming follow-up asks for one.
          const nextFollowUp = currentExercise.followUps![stageAtLog]
          const pause = nextFollowUp?.restBeforeSeconds ?? 0
          if (pause > 0) {
            setRestReason('stage')
            setRestTimeLeft(pause)
            setIsResting(true)
          }
          // currentStage is derived — it'll re-point to the next stage
          // once fetchData() below updates completedSets counts.
        } else if (!isLastRound) {
          // Last stage of this round done — main rest before the next
          // round restarts at the primary.
          if (currentExercise.restSeconds > 0) {
            setRestReason('round')
            setRestTimeLeft(currentExercise.restSeconds)
            setIsResting(true)
          }
        } else {
          // Block done. Auto-advance unless the primary wants a final
          // rest before handing off to the next exercise.
          if (currentExercise.restSeconds > 0) {
            setRestReason('round')
            setRestTimeLeft(currentExercise.restSeconds)
            setIsResting(true)
          } else if (currentIndex < exercises.length - 1) {
            setCurrentIndex(currentIndex + 1)
          }
        }

        await fetchData()
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

  if (!currentExercise || !activeStage) {
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
  const setsRemaining = activeStage.totalRounds - activeStage.completedSets
  const hasBlock = followUpsCount > 0
  const currentRound = activeStage.completedSets + 1
  const restLabel = restReason === 'stage' ? 'Paus innan nästa övning' : 'Vila'

  // Build stage chips: primary → follow-up 1 → follow-up 2
  const blockStages = hasBlock
    ? [
        { name: currentExercise.nameSv || currentExercise.name, isPrimary: true },
        ...(currentExercise.followUps ?? []).map((f) => ({
          name: f.nameSv || f.name,
          isPrimary: false,
        })),
      ]
    : []

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
        {/* Exercise image — uses the ACTIVE stage's media */}
        {activeStage.imageUrls && activeStage.imageUrls.length > 0 ? (
          <div className="aspect-[4/3] bg-black/90 max-h-[250px]">
            <ExerciseImage
              imageUrls={activeStage.imageUrls}
              exerciseId={activeStage.exerciseId}
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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {currentIndex + 1}/{exercises.length}
              </Badge>
              <Badge variant="outline" className={`text-xs ${sectionColor}`}>
                {currentExercise.section}
              </Badge>
              {hasBlock && (
                <Badge variant="secondary" className="text-xs">
                  <Link2 className="h-3 w-3 mr-1" />
                  {activeStage.stage === 0
                    ? 'Huvudövning'
                    : `Följd ${activeStage.stage}`}
                </Badge>
              )}
              {hasBlock && (
                <Badge variant="outline" className="text-xs">
                  Runda {currentRound} / {activeStage.totalRounds}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold">{activeStage.nameSv || activeStage.name}</h1>
            {activeStage.notes && (
              <p className="text-sm text-muted-foreground mt-1">{activeStage.notes}</p>
            )}
          </div>

          {/* Block stage indicator (superset / contrast pair) */}
          {hasBlock && (
            <div className="flex items-center gap-1 flex-wrap">
              {blockStages.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] border ${
                      i === activeStage.stage
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 text-muted-foreground border-transparent'
                    }`}
                  >
                    {s.name}
                  </span>
                  {i < blockStages.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Target */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{hasBlock ? 'Runda' : 'Set'}</p>
              <p className="text-lg font-bold">
                {activeStage.completedSets}/{activeStage.totalRounds}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Reps</p>
              <p className="text-lg font-bold">{activeStage.repsTarget}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Vikt</p>
              <p className="text-lg font-bold">{activeStage.weight ? `${activeStage.weight}kg` : '—'}</p>
            </div>
          </div>

          {/* Rest / contrast-pause timer */}
          {isResting && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 text-center">
              <Timer className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-3xl font-mono font-bold text-foreground">
                {Math.floor(restTimeLeft / 60)}:{String(restTimeLeft % 60).padStart(2, '0')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{restLabel}</p>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setIsResting(false)}>
                Hoppa över vila
              </Button>
            </div>
          )}

          {/* Set logging form */}
          {setsRemaining > 0 && !isResting && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">
                Logga {hasBlock ? 'runda' : 'set'} {currentRound} av {activeStage.totalRounds}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Vikt (kg)</label>
                  <Input
                    type="number"
                    value={logWeight}
                    onChange={(e) => setLogWeight(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="0"
                    className="h-12 bg-muted/40 text-center text-xl font-bold text-foreground"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Reps</label>
                  <Input
                    type="number"
                    value={logReps}
                    onChange={(e) => setLogReps(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="0"
                    className="h-12 bg-muted/40 text-center text-xl font-bold text-foreground"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">RPE (valfritt): {logRpe || '—'}</label>
                <Slider
                  value={[logRpe ?? 6]}
                  onValueChange={(v) => setLogRpe(v[0])}
                  min={1}
                  max={10}
                  step={0.5}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleLogSet}
                disabled={isLoggingSet || !logReps || parseInt(logReps) <= 0}
              >
                {isLoggingSet ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Logga set
              </Button>
            </div>
          )}

          {/* Previous sets for the active stage */}
          {activeStage.setLogs.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Loggade set:</p>
              {activeStage.setLogs.map((log) => (
                <div key={log.id} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-1.5">
                  <span>Set {log.setNumber}</span>
                  <span className="font-mono">{log.weight}kg × {log.repsCompleted}{log.rpe ? ` @RPE ${log.rpe}` : ''}</span>
                  {log.estimated1RM && <span className="text-xs text-muted-foreground">~{Math.round(log.estimated1RM)}kg 1RM</span>}
                </div>
              ))}
            </div>
          )}

          {/* Instructions */}
          {activeStage.instructions && (
            <div className="text-sm text-muted-foreground border-t pt-3">
              <p className="font-medium text-foreground mb-1">Instruktioner</p>
              <p className="whitespace-pre-line">{activeStage.instructions}</p>
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
