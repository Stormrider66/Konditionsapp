'use client'

/**
 * WODPreviewScreen — now a thin adapter over the shared WorkoutPreview.
 * Maps the AI-generated WODResponse shape into PreviewWorkoutData so the
 * daily AI workout matches the rest of the athlete workout surfaces.
 */

import { useMemo } from 'react'
import { WorkoutPreview } from '@/components/workouts/WorkoutPreview'
import type {
  PreviewExercise,
  PreviewSection,
  PreviewWorkoutData,
  WorkoutSection,
} from '@/components/workouts/types'
import type { WODResponse, WODSectionType } from '@/types/wod'
import { WOD_LABELS } from '@/types/wod'

interface WODPreviewScreenProps {
  response: WODResponse
  onStart: () => void
  onRegenerate: () => void
  onClose: () => void
}

const SECTION_TO_PREVIEW: Record<WODSectionType, WorkoutSection> = {
  WARMUP: 'WARMUP',
  MAIN: 'MAIN',
  CORE: 'CORE',
  COOLDOWN: 'COOLDOWN',
}

function buildPreviewData(response: WODResponse): PreviewWorkoutData {
  const { metadata, workout } = response
  const exercises: PreviewExercise[] = []
  let orderIndex = 0

  for (const section of workout.sections) {
    for (const ex of section.exercises) {
      const sets = ex.sets ?? 1
      const repsTarget: number | string =
        ex.reps ?? (ex.duration ? `${ex.duration}s` : '—')
      exercises.push({
        id: `${section.type}-${orderIndex}`,
        exerciseId: ex.exerciseId ?? `${section.type}-${orderIndex}`,
        name: ex.name,
        nameSv: ex.nameSv,
        imageUrls: ex.imageUrls,
        instructions: ex.instructions,
        sets,
        repsTarget,
        restSeconds: ex.restSeconds ?? 0,
        tempo: ex.tempo,
        notes: ex.instructions,
        section: SECTION_TO_PREVIEW[section.type] ?? 'MAIN',
        orderIndex: orderIndex++,
        completedSets: 0,
        setLogs: [],
      })
    }
  }

  const sections: PreviewSection[] = workout.sections.map((s) => ({
    type: SECTION_TO_PREVIEW[s.type] ?? 'MAIN',
    name: s.name,
    notes: s.notes,
    duration: s.duration,
    exerciseCount: s.exercises.length,
  }))

  const intensityMap: Record<string, PreviewWorkoutData['workout']['intensity']> = {
    recovery: 'LOW',
    easy: 'LOW',
    moderate: 'MODERATE',
    threshold: 'HIGH',
  }

  const tags: string[] = []
  if (metadata.workoutType) {
    const label = WOD_LABELS.workoutTypes[metadata.workoutType]?.title
    if (label) tags.push(label)
  }

  return {
    assignment: {
      id: metadata.requestId,
      status: 'PENDING',
      notes: workout.coachNotes ?? null,
    },
    workout: {
      id: metadata.requestId,
      name: workout.title,
      description: [workout.subtitle, workout.description].filter(Boolean).join(' — '),
      estimatedDuration: workout.totalDuration,
      kind: metadata.workoutType === 'cardio' ? 'cardio' : 'strength',
      tags: tags.length > 0 ? tags : undefined,
      intensity: intensityMap[metadata.adjustedIntensity] ?? 'MODERATE',
      isAiGenerated: true,
    },
    sections,
    exercises,
    progress: {
      currentExerciseIndex: 0,
      totalExercises: workout.totalExercises,
      totalSetsTarget: workout.totalSets ?? exercises.length,
      completedSets: 0,
      percentComplete: 0,
      isComplete: false,
    },
    readiness: {
      available: metadata.readinessScore !== null,
      score: metadata.readinessScore ?? undefined,
      message:
        metadata.readinessScore === null
          ? WOD_LABELS.readiness.unknown
          : metadata.readinessScore >= 7
            ? WOD_LABELS.readiness.high
            : metadata.readinessScore >= 5
              ? WOD_LABELS.readiness.medium
              : WOD_LABELS.readiness.low,
    },
  }
}

export function WODPreviewScreen({
  response,
  onStart,
  onRegenerate,
  onClose,
}: WODPreviewScreenProps) {
  const data = useMemo(() => buildPreviewData(response), [response])

  return (
    <WorkoutPreview
      data={data}
      onStart={onStart}
      onRegenerate={onRegenerate}
      onClose={onClose}
    />
  )
}

export default WODPreviewScreen
