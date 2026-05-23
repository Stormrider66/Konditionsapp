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
import type { WODResponse, WODSectionType, WODWorkoutType } from '@/types/wod'
import { useLocale } from '@/i18n/client'

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

type AppLocale = 'en' | 'sv'

const WORKOUT_TYPE_LABELS: Record<WODWorkoutType, Record<AppLocale, string>> = {
  strength: { en: 'Strength', sv: 'Styrka' },
  cardio: { en: 'Cardio', sv: 'Kondition' },
  mixed: { en: 'Mixed', sv: 'Mixat' },
  core: { en: 'Core', sv: 'Core' },
}

const READINESS_MESSAGES: Record<AppLocale, {
  high: string
  medium: string
  low: string
  unknown: string
}> = {
  en: {
    high: 'Your body is ready for a challenge.',
    medium: 'Good day for moderate training.',
    low: 'Focus on recovery today.',
    unknown: 'No readiness data available.',
  },
  sv: {
    high: 'Din kropp är redo för utmaning!',
    medium: 'Bra dag för måttlig träning',
    low: 'Fokusera på återhämtning idag',
    unknown: 'Ingen beredskapsdata tillgänglig',
  },
}

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function buildPreviewData(response: WODResponse, locale: AppLocale): PreviewWorkoutData {
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
    const label = WORKOUT_TYPE_LABELS[metadata.workoutType]?.[locale]
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
          ? READINESS_MESSAGES[locale].unknown
          : metadata.readinessScore >= 7
            ? READINESS_MESSAGES[locale].high
            : metadata.readinessScore >= 5
              ? READINESS_MESSAGES[locale].medium
              : READINESS_MESSAGES[locale].low,
    },
  }
}

export function WODPreviewScreen({
  response,
  onStart,
  onRegenerate,
  onClose,
}: WODPreviewScreenProps) {
  const locale = getAppLocale(useLocale())
  const data = useMemo(() => buildPreviewData(response, locale), [response, locale])

  return (
    <WorkoutPreview
      data={data}
      onStart={onStart}
      onRegenerate={onRegenerate}
      onClose={onClose}
      defaultExpandedSections="all"
    />
  )
}

export default WODPreviewScreen
