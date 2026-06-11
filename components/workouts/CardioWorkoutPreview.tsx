'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkoutPreview } from './WorkoutPreview'
import { CompleteSessionDialog } from './CompleteSessionDialog'
import { useTranslations } from '@/i18n/client'
import type {
  CompleteSessionPayload,
  PreviewExercise,
  PreviewSection,
  PreviewWorkoutData,
  WorkoutSection,
} from './types'
import { CardioFocusModeWorkout } from '@/components/athlete/cardio/CardioFocusModeWorkout'
import { HeadlessVoiceCoach } from '@/components/athlete/workout/HeadlessVoiceCoach'
import { AudioCaptureManager } from '@/lib/ai/live-voice-coaching/audio-capture'
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client'

interface CardioFocusApiSegment {
  id: string
  index: number
  type: string
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  plannedCalories?: number
  plannedPower?: number
  powerRelPercent?: number
  powerRelTo?: 'OPENER' | 'FTP' | 'CP'
  isBenchmark?: boolean
  equipment?: string
  notes?: string
  actualDuration?: number
  actualDistance?: number
  actualCalories?: number
  actualPace?: number
  actualAvgHR?: number
  actualMaxHR?: number
  actualAvgPower?: number
  actualMaxPower?: number
  completed: boolean
  skipped: boolean
  logId?: string
}

interface CardioFocusApiResponse {
  success: boolean
  data: {
    assignment: {
      id: string
      assignedDate: string
      status: string
      notes?: string | null
    }
    session: {
      id: string
      name: string
      description?: string | null
      sport: string
      totalDuration?: number | null
      totalDistance?: number | null
      avgZone?: number | null
      segments: unknown[]
    }
    sessionLog?: {
      id: string
      startedAt: string
      status: string
    } | null
    segments: CardioFocusApiSegment[]
    progress: {
      currentSegmentIndex: number
      totalSegments: number
      completedSegments: number
      totalPlannedDuration: number
      percentComplete: number
      isComplete: boolean
    }
  }
}

interface CardioWorkoutPreviewProps {
  assignmentId: string
  onClose: () => void
  onCompleted?: () => void
  /** Skip the overview screen and jump straight into Focus Mode once loaded. */
  autoStart?: boolean
}

const SEGMENT_TYPE_TO_SECTION: Record<string, WorkoutSection> = {
  WARMUP: 'WARMUP',
  COOLDOWN: 'COOLDOWN',
  RECOVERY: 'CORE',
  REST: 'CORE',
  INTERVAL: 'MAIN',
  STEADY: 'MAIN',
  HILL: 'MAIN',
  DRILLS: 'MAIN',
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

function formatPace(secPerKm?: number): string {
  if (!secPerKm) return ''
  const m = Math.floor(secPerKm / 60)
  const s = secPerKm % 60
  return `${m}:${s.toString().padStart(2, '0')}/km`
}

function mapToPreviewData(
  api: CardioFocusApiResponse['data'],
  kindLabel: string,
  zoneLabel: string,
  sectionNames: Partial<Record<WorkoutSection, string>>,
): PreviewWorkoutData {
  const exercises: PreviewExercise[] = api.segments.map((seg, idx) => {
    const section = SEGMENT_TYPE_TO_SECTION[seg.type] ?? 'MAIN'
    const meta: string[] = []
    if (seg.plannedDuration) meta.push(formatDuration(seg.plannedDuration))
    if (seg.plannedDistance) meta.push(`${seg.plannedDistance.toFixed(2)} km`)
    if (seg.plannedPace) meta.push(formatPace(seg.plannedPace))
    if (seg.plannedZone) meta.push(`${zoneLabel} ${seg.plannedZone}`)
    return {
      id: seg.id,
      exerciseId: seg.id,
      name: seg.typeName,
      nameSv: seg.typeName,
      sets: 1,
      repsTarget: meta.join(' · ') || '—',
      restSeconds: 0,
      notes: seg.notes,
      section,
      orderIndex: idx,
      completedSets: seg.completed ? 1 : 0,
      setLogs: [],
    }
  })

  const sectionCounts = new Map<WorkoutSection, number>()
  for (const ex of exercises) {
    sectionCounts.set(ex.section, (sectionCounts.get(ex.section) ?? 0) + 1)
  }
  const sections: PreviewSection[] = (
    ['WARMUP', 'MAIN', 'CORE', 'COOLDOWN'] as WorkoutSection[]
  )
    .filter((s) => (sectionCounts.get(s) ?? 0) > 0)
    .map((s) => ({
      type: s,
      name: sectionNames[s] ?? s,
      exerciseCount: sectionCounts.get(s) ?? 0,
    }))

  const totalSegments = api.progress.totalSegments
  const completedSegments = api.progress.completedSegments
  return {
    assignment: {
      id: api.assignment.id,
      assignedDate: api.assignment.assignedDate,
      status: api.assignment.status,
      notes: api.assignment.notes,
    },
    workout: {
      id: api.session.id,
      name: api.session.name,
      description: api.session.description,
      estimatedDuration: api.session.totalDuration
        ? Math.round(api.session.totalDuration / 60)
        : null,
      kind: 'cardio',
      tags: [kindLabel],
    },
    sections,
    exercises,
    progress: {
      currentExerciseIndex: 0,
      totalExercises: totalSegments,
      totalSetsTarget: totalSegments,
      completedSets: completedSegments,
      percentComplete: api.progress.percentComplete,
      isComplete: api.progress.isComplete,
    },
    readiness: { available: false },
  }
}

export function CardioWorkoutPreview({
  assignmentId,
  onClose,
  onCompleted,
  autoStart = false,
}: CardioWorkoutPreviewProps) {
  const t = useTranslations('components.workoutPreview')
  const [data, setData] = useState<PreviewWorkoutData | null>(null)
  const [apiData, setApiData] = useState<CardioFocusApiResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [voiceCoachActive, setVoiceCoachActive] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const startedAtRef = useRef<number | null>(null)
  const sectionNames = useMemo<Partial<Record<WorkoutSection, string>>>(() => {
    return {
      WARMUP: t('sections.warmup'),
      MAIN: t('sections.main'),
      CORE: t('sections.recovery'),
      PREHAB: t('sections.prehab'),
      COOLDOWN: t('sections.cooldown'),
    }
  }, [t])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/cardio-sessions/${assignmentId}/focus-mode`)
      if (!res.ok) throw new Error(t('errors.loadFailed'))
      const json = (await res.json()) as CardioFocusApiResponse
      if (!json.success) throw new Error(t('errors.loadFailed'))
      setApiData(json.data)
      setData(
        mapToPreviewData(json.data, t('kinds.cardio'), t('labels.zone'), sectionNames),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId, sectionNames, t])

  useEffect(() => {
    startedAtRef.current = Date.now()
    void refresh()
  }, [refresh])

  // Jump straight into Focus Mode when launched with autoStart (skip the overview).
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (!autoStart || isLoading || !apiData || showFocusMode || autoStartedRef.current) return
    autoStartedRef.current = true
    void handleStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isLoading, apiData, showFocusMode])

  async function handleStart() {
    if (!apiData) return
    startedAtRef.current = Date.now()
    if (!apiData.sessionLog) {
      try {
        const res = await fetch(`/api/cardio-sessions/${assignmentId}/focus-mode`, { method: 'POST' })
        if (!res.ok) throw new Error(t('errors.loadFailed'))
        const json = await res.json()
        setApiData((prev) => prev ? { ...prev, sessionLog: json.data ?? prev.sessionLog } : prev)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('errors.loadFailed'))
        return
      }
    }
    setShowFocusMode(true)
  }

  async function handleComplete(payload: CompleteSessionPayload) {
    setIsCompleting(true)
    try {
      const durationSeconds =
        payload.duration != null
          ? Math.max(1, Math.round(payload.duration * 60))
          : apiData?.progress.totalPlannedDuration ||
            Math.max(
              60,
              Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000),
            )
      const completionPayload = {
        status: 'COMPLETED',
        sessionRPE: payload.rpe,
        notes: payload.notes,
        actualDuration: durationSeconds,
      }
      let res = await fetch(`/api/cardio-sessions/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionPayload),
      })

      const futureWarning = await readFutureCompletionWarning(res)
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) return
        res = await fetch(`/api/cardio-sessions/${assignmentId}/focus-mode`, {
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
      <CardioFocusModeWorkout
        assignmentId={assignmentId}
        sessionName={apiData.session.name}
        sessionDescription={apiData.session.description ?? undefined}
        sport={apiData.session.sport}
        segments={apiData.segments.map((s) => ({
          id: s.id,
          index: s.index,
          type: s.type as never,
          typeName: s.typeName,
          plannedDuration: s.plannedDuration,
          plannedDistance: s.plannedDistance,
          plannedPace: s.plannedPace,
          plannedZone: s.plannedZone,
          plannedCalories: s.plannedCalories,
          plannedPower: s.plannedPower,
          powerRelPercent: s.powerRelPercent,
          powerRelTo: s.powerRelTo,
          isBenchmark: s.isBenchmark,
          equipment: s.equipment,
          notes: s.notes,
          actualDuration: s.actualDuration,
          actualDistance: s.actualDistance,
          actualCalories: s.actualCalories,
          actualPace: s.actualPace,
          actualAvgHR: s.actualAvgHR,
          actualMaxHR: s.actualMaxHR,
          actualAvgPower: s.actualAvgPower,
          actualMaxPower: s.actualMaxPower,
          completed: s.completed,
          skipped: s.skipped,
          logId: s.logId,
        }))}
        initialSegmentIndex={Math.min(
          apiData.progress.currentSegmentIndex ?? 0,
          Math.max(apiData.segments.length - 1, 0),
        )}
        autoStartFirstTimedSegment
        onClose={() => {
          setShowFocusMode(false)
          void refresh()
        }}
        onComplete={async (payload) => {
          await handleComplete({
            rpe: payload.sessionRPE,
            notes: payload.notes,
          })
        }}
        onSegmentComplete={async (segmentIndex, segData) => {
          const res = await fetch(`/api/cardio-sessions/${assignmentId}/segments/${segmentIndex}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(segData),
          })
          if (!res.ok) throw new Error('Failed to log cardio segment')
        }}
      />
    )
  }

  const audioSupported = typeof window !== 'undefined' && AudioCaptureManager.isSupported()

  return (
    <>
      <WorkoutPreview
        data={data}
        onClose={onClose}
        onStart={handleStart}
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

      <CompleteSessionDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onConfirm={handleComplete}
        completedSets={data.progress.completedSets}
        totalSetsTarget={data.progress.totalSetsTarget}
        defaultDurationMinutes={data.workout.estimatedDuration ?? undefined}
        isStrengthWorkout={false}
      />

      {voiceCoachActive && (
        <HeadlessVoiceCoach
          assignmentId={assignmentId}
          workoutType="cardio"
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

export default CardioWorkoutPreview
