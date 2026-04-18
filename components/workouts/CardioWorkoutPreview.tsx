'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkoutPreview } from './WorkoutPreview'
import { CompleteSessionDialog } from './CompleteSessionDialog'
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

interface CardioFocusApiSegment {
  id: string
  index: number
  type: string
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  notes?: string
  actualDuration?: number
  actualDistance?: number
  actualPace?: number
  actualAvgHR?: number
  actualMaxHR?: number
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
): PreviewWorkoutData {
  const exercises: PreviewExercise[] = api.segments.map((seg, idx) => {
    const section = SEGMENT_TYPE_TO_SECTION[seg.type] ?? 'MAIN'
    const meta: string[] = []
    if (seg.plannedDuration) meta.push(formatDuration(seg.plannedDuration))
    if (seg.plannedDistance) meta.push(`${seg.plannedDistance.toFixed(2)} km`)
    if (seg.plannedPace) meta.push(formatPace(seg.plannedPace))
    if (seg.plannedZone) meta.push(`Zon ${seg.plannedZone}`)
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
      name:
        s === 'WARMUP'
          ? 'Uppvärmning'
          : s === 'COOLDOWN'
            ? 'Nedvarvning'
            : s === 'CORE'
              ? 'Återhämtning'
              : 'Huvudpass',
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
}: CardioWorkoutPreviewProps) {
  const [data, setData] = useState<PreviewWorkoutData | null>(null)
  const [apiData, setApiData] = useState<CardioFocusApiResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [voiceCoachActive, setVoiceCoachActive] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const startedAtRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/cardio-sessions/${assignmentId}/focus-mode`)
      if (!res.ok) throw new Error('Failed to load workout')
      const json = (await res.json()) as CardioFocusApiResponse
      if (!json.success) throw new Error('Failed to load workout')
      setApiData(json.data)
      setData(mapToPreviewData(json.data, 'Kondition'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ladda passet')
    } finally {
      setIsLoading(false)
    }
  }, [assignmentId])

  useEffect(() => {
    startedAtRef.current = Date.now()
    void refresh()
  }, [refresh])

  async function handleStart() {
    if (!apiData) return
    if (!apiData.sessionLog) {
      try {
        await fetch(`/api/cardio-sessions/${assignmentId}/focus-mode`, { method: 'POST' })
      } catch {
        /* noop — focus mode tolerates missing session log */
      }
    }
    setShowFocusMode(true)
  }

  async function handleComplete(payload: CompleteSessionPayload) {
    setIsCompleting(true)
    try {
      const res = await fetch(`/api/cardio-sessions/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          sessionRPE: payload.rpe,
          notes: payload.notes,
        }),
      })
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
          <p className="mb-3 text-sm text-muted-foreground">{error ?? 'Kunde inte ladda passet.'}</p>
          <Button onClick={onClose}>Stäng</Button>
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
          notes: s.notes,
          actualDuration: s.actualDuration,
          actualDistance: s.actualDistance,
          actualPace: s.actualPace,
          actualAvgHR: s.actualAvgHR,
          actualMaxHR: s.actualMaxHR,
          completed: s.completed,
          skipped: s.skipped,
          logId: s.logId,
        }))}
        onClose={() => {
          setShowFocusMode(false)
          void refresh()
        }}
        onComplete={async () => {
          setShowFocusMode(false)
          onCompleted?.()
          onClose()
        }}
        onSegmentComplete={async (segmentIndex, segData) => {
          await fetch(`/api/cardio-sessions/${assignmentId}/segments/${segmentIndex}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(segData),
          })
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
              title="AI-röstcoach"
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
