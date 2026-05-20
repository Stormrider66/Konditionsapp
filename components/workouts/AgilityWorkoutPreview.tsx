'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { WorkoutPreview } from './WorkoutPreview'
import { CompleteSessionDialog } from './CompleteSessionDialog'
import type {
  CompleteSessionPayload,
  PreviewExercise,
  PreviewSection,
  PreviewWorkoutData,
  WorkoutSection,
} from './types'
import { AgilityWorkoutExecution } from '@/components/athlete/AgilityWorkoutExecution'
import type { AgilityWorkout, AgilityWorkoutDrill, AgilityDrill } from '@/types'
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client'
import { useLocale } from '@/i18n/client'

type DrillWithDetails = AgilityWorkoutDrill & { drill: AgilityDrill }

interface AgilityWorkoutPreviewProps {
  workout: AgilityWorkout & { drills: DrillWithDetails[] }
  clientId: string
  assignmentId?: string
  basePath?: string
}

const SECTION_TO_PREVIEW: Record<string, WorkoutSection> = {
  WARMUP: 'WARMUP',
  MAIN: 'MAIN',
  COOLDOWN: 'COOLDOWN',
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

function buildPreviewData(
  workout: AgilityWorkout & { drills: DrillWithDetails[] },
  locale: AppLocale,
): PreviewWorkoutData {
  const drills = [...workout.drills].sort((a, b) => a.order - b.order)

  const exercises: PreviewExercise[] = drills.map((d, idx) => {
    const meta: string[] = []
    if (d.sets && d.reps) meta.push(`${d.sets}×${d.reps}`)
    else if (d.sets) meta.push(`${d.sets} set`)
    else if (d.reps) meta.push(`${d.reps} reps`)
    if (d.duration) meta.push(`${d.duration}s`)
    if (d.restSeconds) meta.push(text(locale, `vila ${d.restSeconds}s`, `rest ${d.restSeconds}s`))
    const section = SECTION_TO_PREVIEW[d.sectionType ?? 'MAIN'] ?? 'MAIN'
    return {
      id: d.id,
      exerciseId: d.drill.id,
      name: d.drill.name,
      nameSv: d.drill.nameSv ?? undefined,
      videoUrl: d.drill.videoUrl ?? undefined,
      instructions: d.drill.setupInstructions ?? undefined,
      sets: d.sets ?? 1,
      repsTarget: meta.join(' · ') || '—',
      restSeconds: d.restSeconds ?? 0,
      notes: d.notes ?? undefined,
      section,
      orderIndex: idx,
      completedSets: 0,
      setLogs: [],
    }
  })

  const sectionCounts = new Map<WorkoutSection, number>()
  for (const ex of exercises) {
    sectionCounts.set(ex.section, (sectionCounts.get(ex.section) ?? 0) + 1)
  }
  const sections: PreviewSection[] = (
    ['WARMUP', 'MAIN', 'COOLDOWN'] as WorkoutSection[]
  )
    .filter((s) => (sectionCounts.get(s) ?? 0) > 0)
    .map((s) => ({
      type: s,
      name:
        s === 'WARMUP'
          ? text(locale, 'Uppvärmning', 'Warm-up')
          : s === 'COOLDOWN'
            ? text(locale, 'Nedvarvning', 'Cool-down')
            : text(locale, 'Huvudpass', 'Main session'),
      exerciseCount: sectionCounts.get(s) ?? 0,
    }))

  return {
    assignment: {
      id: workout.id,
      status: 'PENDING',
      notes: null,
    },
    workout: {
      id: workout.id,
      name: workout.name,
      description: workout.description ?? null,
      estimatedDuration: workout.totalDuration ?? null,
      kind: 'agility',
      tags: workout.primaryFocus ? [workout.primaryFocus] : undefined,
    },
    sections,
    exercises,
    progress: {
      currentExerciseIndex: 0,
      totalExercises: exercises.length,
      totalSetsTarget: exercises.length,
      completedSets: 0,
      percentComplete: 0,
      isComplete: false,
    },
    readiness: { available: false },
  }
}

export function AgilityWorkoutPreview({
  workout,
  clientId,
  assignmentId,
  basePath = '/athlete',
}: AgilityWorkoutPreviewProps) {
  const locale = getAppLocale(useLocale())
  const data = useMemo(() => buildPreviewData(workout, locale), [workout, locale])
  const [showExecution, setShowExecution] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  async function handleComplete(payload: CompleteSessionPayload) {
    if (!assignmentId) {
      setShowCompleteDialog(false)
      return
    }
    setIsCompleting(true)
    try {
      const completionPayload = {
        totalDuration: (payload.duration ?? 0) * 60,
        perceivedEffort: payload.rpe ?? 5,
        notes: payload.notes,
        drillResults: [],
        assignmentId,
      }
      let res = await fetch(`/api/agility-workouts/${workout.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionPayload),
      })

      const futureWarning = await readFutureCompletionWarning(res)
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) return
        res = await fetch(`/api/agility-workouts/${workout.id}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...completionPayload, allowFutureCompletion: true }),
        })
      }

      if (!res.ok) throw new Error('Failed to complete session')
      setShowCompleteDialog(false)
      window.history.back()
    } finally {
      setIsCompleting(false)
    }
  }

  if (showExecution) {
    return (
      <AgilityWorkoutExecution
        workout={workout}
        clientId={clientId}
        assignmentId={assignmentId}
        basePath={basePath}
        onComplete={() => {
          setShowExecution(false)
          window.history.back()
        }}
      />
    )
  }

  return (
    <>
      <WorkoutPreview
        data={data}
        onClose={() => window.history.back()}
        onStart={() => setShowExecution(true)}
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

export default AgilityWorkoutPreview
