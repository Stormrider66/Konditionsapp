'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkoutPreview } from './WorkoutPreview'
import { CompleteSessionDialog } from './CompleteSessionDialog'
import { useTranslations } from '@/i18n/client'
import type {
  CompleteSessionPayload,
  PreviewExercise,
  PreviewSection,
  PreviewWorkoutData,
} from './types'
import { HybridFocusModeWorkout } from '@/components/athlete/hybrid/HybridFocusModeWorkout'
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client'

interface HybridFocusMovement {
  id: string
  exerciseId: string
  name: string
  nameSv?: string
  videoUrl?: string
  instructions?: string
  order: number
  reps?: number
  calories?: number
  distance?: number
  duration?: number
  weight?: number
  notes?: string
  completed: boolean
}

interface HybridFocusApiResponse {
  success: boolean
  data: {
    assignment: {
      id: string
      assignedDate: string
      status: string
      notes?: string | null
      customScaling?: unknown
      scalingNotes?: string | null
    }
    workout: {
      id: string
      name: string
      description?: string | null
      format: string
      timeCap?: number | null
      workTime?: number | null
      restTime?: number | null
      totalRounds: number
      totalMinutes?: number | null
      repScheme?: string | null
      repSchemeArray?: number[]
      scalingLevel: string
      isBenchmark: boolean
    }
    workoutLog?: {
      id: string
      totalRounds?: number | null
      totalTime?: number | null
      extraReps?: number | null
    } | null
    movements: HybridFocusMovement[]
    stats: {
      totalMovements: number
      totalReps: number
      totalCalories: number
      rounds: number
    }
  }
}

interface HybridWorkoutPreviewProps {
  assignmentId: string
  onClose: () => void
  onCompleted?: () => void
}

const FORMAT_LABEL_KEYS: Record<string, string> = {
  FOR_TIME: 'forTime',
  AMRAP: 'amrap',
  EMOM: 'emom',
  TABATA: 'tabata',
  CHIPPER: 'chipper',
  LADDER: 'ladder',
  INTERVALS: 'intervals',
  HYROX_SIM: 'hyroxSim',
}

function describeTarget(m: HybridFocusMovement): string {
  const parts: string[] = []
  if (m.reps) parts.push(`${m.reps} reps`)
  if (m.calories) parts.push(`${m.calories} cal`)
  if (m.distance) parts.push(`${m.distance} m`)
  if (m.duration) parts.push(`${m.duration}s`)
  if (m.weight) parts.push(`${m.weight} kg`)
  return parts.join(' · ') || '—'
}

function mapToPreviewData(api: HybridFocusApiResponse['data'], mainSectionName: string): PreviewWorkoutData {
  const exercises: PreviewExercise[] = api.movements.map((m, idx) => ({
    id: m.id,
    exerciseId: m.exerciseId,
    name: m.name,
    nameSv: m.nameSv,
    videoUrl: m.videoUrl,
    instructions: m.instructions,
    sets: 1,
    repsTarget: describeTarget(m),
    restSeconds: 0,
    notes: m.notes,
    section: 'MAIN',
    orderIndex: idx,
    completedSets: m.completed ? 1 : 0,
    setLogs: [],
  }))

  const sections: PreviewSection[] = [
    { type: 'MAIN', name: mainSectionName, exerciseCount: exercises.length },
  ]

  const completed = exercises.filter((e) => e.completedSets > 0).length
  return {
    assignment: {
      id: api.assignment.id,
      assignedDate: api.assignment.assignedDate,
      status: api.assignment.status,
      notes: api.assignment.notes,
    },
    workout: {
      id: api.workout.id,
      name: api.workout.name,
      description: api.workout.description,
      estimatedDuration: api.workout.totalMinutes ?? api.workout.timeCap ?? null,
      kind: 'hybrid',
      tags: [api.workout.format],
    },
    sections,
    exercises,
    progress: {
      currentExerciseIndex: 0,
      totalExercises: exercises.length,
      totalSetsTarget: exercises.length,
      completedSets: completed,
      percentComplete:
        exercises.length > 0 ? Math.round((completed / exercises.length) * 100) : 0,
      isComplete: completed >= exercises.length && exercises.length > 0,
    },
    readiness: { available: false },
  }
}

type HybridFormat =
  | 'FOR_TIME'
  | 'AMRAP'
  | 'EMOM'
  | 'TABATA'
  | 'CHIPPER'
  | 'LADDER'
  | 'INTERVALS'
  | 'HYROX_SIM'

export function HybridWorkoutPreview({
  assignmentId,
  onClose,
  onCompleted,
}: HybridWorkoutPreviewProps) {
  const t = useTranslations('components.workoutPreview')
  const [apiData, setApiData] = useState<HybridFocusApiResponse['data'] | null>(null)
  const [data, setData] = useState<PreviewWorkoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const startedAtRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`)
      if (!res.ok) throw new Error(t('errors.loadFailed'))
      const json = (await res.json()) as HybridFocusApiResponse
      if (!json.success) throw new Error(t('errors.loadFailed'))
      setApiData(json.data)
      const formatKey = FORMAT_LABEL_KEYS[json.data.workout.format]
      const formatLabel = formatKey
        ? t(`formats.${formatKey}`)
        : t('formats.custom', { value: json.data.workout.format })
      const previewData = mapToPreviewData(json.data, t('sections.main'))
      setData({ ...previewData, workout: { ...previewData.workout, tags: [formatLabel] } })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId, t])

  useEffect(() => {
    startedAtRef.current = Date.now()
    void refresh()
  }, [refresh])

  async function handleStart() {
    if (!apiData?.workoutLog) {
      try {
        await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`, { method: 'POST' })
      } catch {
        /* tolerate */
      }
    }
    setShowFocusMode(true)
  }

  async function handleComplete(payload: CompleteSessionPayload) {
    setIsCompleting(true)
    try {
      const completionPayload = {
        status: 'COMPLETED',
        sessionRPE: payload.rpe,
        notes: payload.notes,
      }
      let res = await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionPayload),
      })

      const futureWarning = await readFutureCompletionWarning(res)
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) return
        res = await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...completionPayload, allowFutureCompletion: true }),
        })
      }

      if (!res.ok) throw new Error('Failed to complete session')
      setShowCompleteDialog(false)
      onCompleted?.()
      onClose()
    } finally {
      setIsCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data || !apiData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-xl border bg-card p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">{error ?? t('errors.loadFailed')}</p>
          <Button onClick={onClose}>{t('actions.close')}</Button>
        </div>
      </div>
    )
  }

  if (showFocusMode) {
    return (
      <HybridFocusModeWorkout
        assignmentId={assignmentId}
        workoutName={apiData.workout.name}
        workoutDescription={apiData.workout.description ?? undefined}
        format={apiData.workout.format as HybridFormat}
        timeCap={apiData.workout.timeCap ?? undefined}
        workTime={apiData.workout.workTime ?? undefined}
        restTime={apiData.workout.restTime ?? undefined}
        totalRounds={apiData.workout.totalRounds}
        totalMinutes={apiData.workout.totalMinutes ?? undefined}
        repScheme={apiData.workout.repScheme ?? undefined}
        repSchemeArray={apiData.workout.repSchemeArray}
        movements={apiData.movements.map((m) => ({
          id: m.id,
          exerciseId: m.exerciseId,
          name: m.name,
          nameSv: m.nameSv,
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weight: m.weight,
          completed: m.completed,
        }))}
        scalingLevel={apiData.workout.scalingLevel}
        onClose={() => {
          setShowFocusMode(false)
          void refresh()
        }}
        onComplete={async () => {
          setShowFocusMode(false)
          onCompleted?.()
          onClose()
        }}
        onRoundComplete={async (roundNumber, movements, duration) => {
          await fetch(`/api/hybrid-workouts/${assignmentId}/rounds`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roundNumber, movements, duration }),
          })
        }}
      />
    )
  }

  return (
    <>
      <WorkoutPreview
        data={data}
        onClose={onClose}
        onStart={handleStart}
        onComplete={() => setShowCompleteDialog(true)}
      />

      <CompleteSessionDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onConfirm={handleComplete}
        completedSets={data.progress.completedSets}
        totalSetsTarget={data.progress.totalSetsTarget}
        defaultDurationMinutes={data.workout.estimatedDuration ?? undefined}
        isStrengthWorkout={false}
      />

      {isCompleting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </>
  )
}

export default HybridWorkoutPreview
