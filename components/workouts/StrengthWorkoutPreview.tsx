'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkoutPreview } from './WorkoutPreview'
import { ExerciseLogSheet } from './ExerciseLogSheet'
import { FloatingRestTimer } from './FloatingRestTimer'
import { CompleteSessionDialog } from './CompleteSessionDialog'
import { useRestTimer } from './useRestTimer'
import { useTranslations } from '@/i18n/client'
import type {
  CompleteSessionPayload,
  LoggedSetPayload,
  PreviewExercise,
  PreviewSetLog,
  PreviewWorkoutData,
} from './types'
import { FocusModeWorkout } from '@/components/athlete/workout/FocusModeWorkout'
import { HeadlessVoiceCoach } from '@/components/athlete/workout/HeadlessVoiceCoach'
import { AudioCaptureManager } from '@/lib/ai/live-voice-coaching/audio-capture'
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client'

interface FocusModeApiResponse {
  success: boolean
  data: PreviewWorkoutData
}

interface StrengthWorkoutPreviewProps {
  assignmentId: string
  onClose: () => void
  onCompleted?: () => void
}

export function StrengthWorkoutPreview({
  assignmentId,
  onClose,
  onCompleted,
}: StrengthWorkoutPreviewProps) {
  const t = useTranslations('components.workoutPreview')
  const [data, setData] = useState<PreviewWorkoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [voiceCoachActive, setVoiceCoachActive] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const restTimer = useRestTimer()
  const startedAtRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`)
      if (!res.ok) throw new Error(t('errors.loadFailed'))
      const json = (await res.json()) as FocusModeApiResponse
      setData(withDerivedWorkoutKind(json.data))
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

  const activeExercise = data?.exercises.find((e) => e.exerciseId === activeExerciseId) ?? null

  async function handleLogSet(payload: LoggedSetPayload): Promise<PreviewSetLog> {
    const res = await fetch(`/api/strength-sessions/${assignmentId}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Failed to log set')
    const json = await res.json()
    const saved: PreviewSetLog = {
      id: json.data.setLog.id,
      setNumber: json.data.setLog.setNumber,
      weight: json.data.setLog.weight,
      repsCompleted: json.data.setLog.repsCompleted,
      rpe: json.data.setLog.rpe ?? undefined,
      meanVelocity: json.data.setLog.meanVelocity ?? undefined,
      peakVelocity: json.data.setLog.peakVelocity ?? undefined,
      meanPower: json.data.setLog.meanPower ?? undefined,
      peakPower: json.data.setLog.peakPower ?? undefined,
      meanTime: json.data.setLog.meanTime ?? undefined,
      peakTime: json.data.setLog.peakTime ?? undefined,
      estimated1RM: json.data.estimated1RM,
      velocityZone: json.data.velocityZone,
      completedAt: json.data.setLog.completedAt,
    }
    // Optimistic merge into the preview data.
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.exerciseId !== payload.exerciseId) return ex
          return {
            ...ex,
            completedSets: ex.completedSets + 1,
            setLogs: [...ex.setLogs, saved],
          }
        }),
        progress: {
          ...prev.progress,
          completedSets: prev.progress.completedSets + 1,
          percentComplete:
            prev.progress.totalSetsTarget > 0
              ? Math.round(
                  ((prev.progress.completedSets + 1) / prev.progress.totalSetsTarget) * 100,
                )
              : 0,
          isComplete:
            prev.progress.completedSets + 1 >= prev.progress.totalSetsTarget &&
            prev.progress.totalSetsTarget > 0,
        },
      }
    })
    return saved
  }

  async function handleComplete(payload: CompleteSessionPayload) {
    setIsCompleting(true)
    try {
      const durationMinutes =
        payload.duration ??
        Math.max(
          1,
          Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 60000),
        )
      const completionPayload = {
        status: 'COMPLETED',
        rpe: payload.rpe,
        duration: durationMinutes,
        notes: payload.notes,
      }
      let res = await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionPayload),
      })

      const futureWarning = await readFutureCompletionWarning(res)
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) return
        res = await fetch(`/api/strength-sessions/${assignmentId}/focus-mode`, {
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

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <div className="max-w-sm rounded-xl border bg-card p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            {error ?? t('errors.loadFailed')}
          </p>
          <Button onClick={onClose}>{t('actions.close')}</Button>
        </div>
      </div>
    )
  }

  if (showFocusMode) {
    return (
      <FocusModeWorkout
        assignmentId={assignmentId}
        onClose={() => {
          setShowFocusMode(false)
          void refresh()
        }}
      />
    )
  }

  const audioSupported =
    typeof window !== 'undefined' && AudioCaptureManager.isSupported()

  return (
    <>
      <WorkoutPreview
        data={data}
        onClose={onClose}
        onExerciseClick={(ex: PreviewExercise) => setActiveExerciseId(ex.exerciseId)}
        onStart={() => setShowFocusMode(true)}
        onComplete={() => setShowCompleteDialog(true)}
        audioSlot={
          audioSupported ? (
            <Button
              variant={voiceCoachActive ? 'default' : 'outline'}
              size="icon"
              onClick={() => setVoiceCoachActive((v) => !v)}
              title={t('actions.voiceCoach')}
            >
              <Radio className="h-4 w-4" />
            </Button>
          ) : null
        }
      />

      <ExerciseLogSheet
        open={activeExerciseId !== null}
        onOpenChange={(open) => {
          if (!open) setActiveExerciseId(null)
        }}
        exercise={activeExercise}
        restTimer={restTimer}
        onLogSet={handleLogSet}
      />

      {restTimer.active && activeExerciseId === null && (
        <FloatingRestTimer
          active={restTimer.active}
          remaining={restTimer.remaining}
          isPaused={restTimer.isPaused}
          onSkip={restTimer.skip}
          onTogglePause={restTimer.togglePause}
          onOpenExercise={(id) => setActiveExerciseId(id)}
        />
      )}

      <CompleteSessionDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onConfirm={handleComplete}
        completedSets={data.progress.completedSets}
        totalSetsTarget={data.progress.totalSetsTarget}
        defaultDurationMinutes={data.workout.estimatedDuration ?? undefined}
        isStrengthWorkout
      />

      {voiceCoachActive && (
        <HeadlessVoiceCoach
          assignmentId={assignmentId}
          workoutType="strength"
          onClose={() => setVoiceCoachActive(false)}
        />
      )}

      {isCompleting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </>
  )
}

function withDerivedWorkoutKind(data: PreviewWorkoutData): PreviewWorkoutData {
  return {
    ...data,
    workout: {
      ...data.workout,
      kind: data.workout.kind ?? 'strength',
      isAiGenerated: data.workout.isAiGenerated ?? false,
    },
    readiness: data.readiness ?? { available: false },
  }
}

export default StrengthWorkoutPreview
