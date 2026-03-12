'use client'

import Link from 'next/link'
import { Heart, Clock, Dumbbell, Flame, Target, StretchHorizontal, Activity } from 'lucide-react'
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

export interface WorkoutTemplateSummary {
  id: string
  name: string
  nameSv: string
  descriptionSv: string | null
  category: string
  workoutType: string
  difficulty: string
  targetSports: string[]
  muscleGroups: string[]
  equipment: string[]
  estimatedDuration: number
  usageCount: number
  tags: string[]
  isFavorite: boolean
}

interface WorkoutTemplateCardProps {
  template: WorkoutTemplateSummary
  onToggleFavorite: (id: string) => void
}

export function WorkoutTemplateCard({ template, onToggleFavorite }: WorkoutTemplateCardProps) {
  const basePath = useBasePath()
  const categoryConfig = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.STRENGTH
  const CategoryIcon = categoryConfig.icon

  return (
    <div className="relative group">
      <Link
        href={`${basePath}/athlete/browse-workouts/${template.id}`}
        className="dark:bg-slate-800/50 dark:hover:bg-slate-700/60 bg-white hover:bg-slate-50 rounded-xl p-4 ring-1 ring-black/5 dark:ring-white/5 hover:ring-black/10 dark:hover:ring-white/10 transition-all cursor-pointer flex flex-col gap-3 h-full"
      >
        {/* Category badge */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
            <CategoryIcon className="h-3 w-3" />
            {categoryConfig.label}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {DIFFICULTY_LABELS[template.difficulty]}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">
          {template.nameSv}
        </h3>

        {/* Duration + muscle groups */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.estimatedDuration} min
          </span>
          {template.muscleGroups.length > 0 && (
            <span className="truncate">{template.muscleGroups.slice(0, 2).join(', ')}</span>
          )}
        </div>

        {/* Equipment chips */}
        {template.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.equipment.slice(0, 3).map((eq) => (
              <span
                key={eq}
                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400"
              >
                {eq}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Favorite toggle */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleFavorite(template.id)
        }}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10"
        aria-label={template.isFavorite ? 'Ta bort favorit' : 'Lägg till favorit'}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            template.isFavorite
              ? 'fill-red-500 text-red-500'
              : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500'
          }`}
        />
      </button>
    </div>
  )
}
