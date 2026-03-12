'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Clock, Dumbbell, ChevronDown, ChevronUp, Loader2, Activity, Flame, Target, StretchHorizontal } from 'lucide-react'
import { useBasePath } from '@/lib/contexts/BasePathContext'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  STRENGTH: { label: 'Styrka', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Dumbbell },
  CARDIO: { label: 'Cardio', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: Activity },
  FUNCTIONAL: { label: 'Funktionell', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Flame },
  CORE: { label: 'Core', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: Target },
  STRETCHING: { label: 'Stretching', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', icon: StretchHorizontal },
}

const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Nybörjare',
  INTERMEDIATE: 'Medel',
  ADVANCED: 'Avancerad',
}

const SECTION_COLORS: Record<string, string> = {
  WARMUP: 'border-l-amber-400',
  MAIN: 'border-l-blue-500',
  CORE: 'border-l-emerald-500',
  COOLDOWN: 'border-l-purple-400',
}

interface TemplateExercise {
  name: string
  nameSv: string
  sets?: number
  reps?: number | string
  duration?: number
  rest?: number
  weight?: string
  notes?: string
}

interface TemplateSection {
  type: string
  label: string
  exercises: TemplateExercise[]
}

interface WorkoutTemplateDetail {
  id: string
  name: string
  nameSv: string
  description: string | null
  descriptionSv: string | null
  category: string
  workoutType: string
  difficulty: string
  targetSports: string[]
  muscleGroups: string[]
  equipment: string[]
  estimatedDuration: number
  sections: TemplateSection[]
  usageCount: number
  isFavorite: boolean
}

interface WorkoutTemplateDetailClientProps {
  template: WorkoutTemplateDetail
}

export function WorkoutTemplateDetailClient({ template }: WorkoutTemplateDetailClientProps) {
  const router = useRouter()
  const basePath = useBasePath()
  const [isFavorite, setIsFavorite] = useState(template.isFavorite)
  const [starting, setStarting] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>(
    // Expand all by default
    Object.fromEntries(template.sections.map((_, i) => [i, true]))
  )

  const categoryConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.STRENGTH
  const CategoryIcon = categoryConfig.icon

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleToggleFavorite = async () => {
    setIsFavorite(!isFavorite)
    try {
      const res = await fetch(`/api/workout-templates/${template.id}/favorite`, { method: 'POST' })
      if (!res.ok) setIsFavorite(isFavorite)
    } catch {
      setIsFavorite(isFavorite)
    }
  }

  const handleStartWorkout = async () => {
    setStarting(true)
    try {
      const res = await fetch(`/api/workout-templates/${template.id}/start`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        router.push(`${basePath}/athlete/ad-hoc/${data.adHocWorkoutId}`)
      }
    } catch (error) {
      console.error('Error starting workout:', error)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="pb-24">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka
      </button>

      {/* Hero section */}
      <div className="space-y-4 mb-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${categoryConfig.color}`}>
              <CategoryIcon className="h-3 w-3" />
              {categoryConfig.label}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {template.nameSv}
            </h1>
          </div>
          <button
            onClick={handleToggleFavorite}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={isFavorite ? 'Ta bort favorit' : 'Lägg till favorit'}
          >
            <Heart
              className={`h-5 w-5 ${
                isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400 dark:text-slate-500'
              }`}
            />
          </button>
        </div>

        {template.descriptionSv && (
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {template.descriptionSv}
          </p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {template.estimatedDuration} min
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-xs font-medium">
            {DIFFICULTY_LABELS[template.difficulty]}
          </span>
          {template.usageCount > 0 && (
            <span className="text-xs text-slate-400">{template.usageCount} gånger använd</span>
          )}
        </div>

        {/* Equipment */}
        {template.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.equipment.map((eq) => (
              <span
                key={eq}
                className="px-2 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400"
              >
                {eq}
              </span>
            ))}
          </div>
        )}

        {/* Muscle groups */}
        {template.muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {template.muscleGroups.map((mg) => (
              <span
                key={mg}
                className="px-2 py-1 rounded-lg text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              >
                {mg}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Workout sections */}
      <div className="space-y-4">
        {template.sections.map((section, sIndex) => (
          <div
            key={sIndex}
            className={`rounded-xl bg-white dark:bg-slate-800/50 ring-1 ring-black/5 dark:ring-white/5 overflow-hidden border-l-4 ${SECTION_COLORS[section.type] || 'border-l-slate-300'}`}
          >
            <button
              onClick={() => toggleSection(sIndex)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {section.label}
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {section.exercises.length} övningar
                </span>
              </div>
              {expandedSections[sIndex] ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {expandedSections[sIndex] && (
              <div className="px-4 pb-3 space-y-2">
                {section.exercises.map((exercise, eIndex) => (
                  <div
                    key={eIndex}
                    className="flex items-start justify-between py-2 border-t border-slate-100 dark:border-slate-700/50 first:border-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {exercise.nameSv}
                      </p>
                      {exercise.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">{exercise.notes}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5 shrink-0 ml-4">
                      {exercise.sets && exercise.reps && (
                        <p className="font-medium">{exercise.sets} × {exercise.reps}</p>
                      )}
                      {exercise.duration && !exercise.sets && (
                        <p className="font-medium">{exercise.duration}s</p>
                      )}
                      {exercise.weight && <p>{exercise.weight}</p>}
                      {exercise.rest != null && exercise.rest > 0 && (
                        <p className="text-slate-400">Vila {exercise.rest}s</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 z-50">
        <button
          onClick={handleStartWorkout}
          disabled={starting}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {starting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Startar...
            </>
          ) : (
            'Starta pass'
          )}
        </button>
      </div>
    </div>
  )
}
