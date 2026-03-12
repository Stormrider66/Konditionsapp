'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Heart, Dumbbell, Activity, Flame, Target, StretchHorizontal, Trophy } from 'lucide-react'
import { WorkoutTemplateCard, type WorkoutTemplateSummary } from './WorkoutTemplateCard'

type CategoryFilter = 'alla' | 'favoriter' | 'din-sport' | 'STRENGTH' | 'CARDIO' | 'FUNCTIONAL' | 'CORE' | 'STRETCHING'

const CATEGORY_FILTERS: { value: CategoryFilter; label: string; icon: React.ElementType }[] = [
  { value: 'alla', label: 'Alla', icon: Flame },
  { value: 'favoriter', label: 'Favoriter', icon: Heart },
  { value: 'din-sport', label: 'Din sport', icon: Trophy },
  { value: 'STRENGTH', label: 'Styrka', icon: Dumbbell },
  { value: 'CARDIO', label: 'Cardio', icon: Activity },
  { value: 'FUNCTIONAL', label: 'Funktionell', icon: Flame },
  { value: 'CORE', label: 'Core', icon: Target },
  { value: 'STRETCHING', label: 'Stretching', icon: StretchHorizontal },
]

interface BrowseWorkoutsClientProps {
  athleteSport?: string | null
}

export function BrowseWorkoutsClient({ athleteSport }: BrowseWorkoutsClientProps) {
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<CategoryFilter>('alla')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (category === 'favoriter') {
        params.set('favorites', 'true')
      } else if (category === 'din-sport' && athleteSport) {
        params.set('sport', athleteSport)
      } else if (!['alla', 'favoriter', 'din-sport'].includes(category)) {
        params.set('category', category)
      }

      if (debouncedQuery) {
        params.set('q', debouncedQuery)
      }

      const res = await fetch(`/api/workout-templates?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }, [category, debouncedQuery, athleteSport])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleToggleFavorite = async (templateId: string) => {
    // Optimistic update
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t))
    )

    try {
      const res = await fetch(`/api/workout-templates/${templateId}/favorite`, {
        method: 'POST',
      })
      if (!res.ok) {
        // Revert on failure
        setTemplates((prev) =>
          prev.map((t) => (t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t))
        )
      } else if (category === 'favoriter') {
        // If viewing favorites, remove unfavorited items
        const data = await res.json()
        if (!data.isFavorite) {
          setTemplates((prev) => prev.filter((t) => t.id !== templateId))
        }
      }
    } catch {
      // Revert on error
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t))
      )
    }
  }

  const getEmptyMessage = () => {
    if (debouncedQuery) return `Inga pass hittades för "${debouncedQuery}"`
    switch (category) {
      case 'favoriter': return 'Du har inga favoriter ännu. Tryck på hjärtat för att spara pass.'
      case 'din-sport': return athleteSport ? 'Inga sportspecifika pass hittades.' : 'Ingen sport vald i din profil.'
      default: return 'Inga pass hittades i denna kategori.'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          Hitta pass
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Utforska färdiga träningspass att köra direkt
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Sök pass..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/50 ring-1 ring-black/5 dark:ring-white/5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((filter) => {
          const isActive = category === filter.value
          // Hide "Din sport" if no sport set
          if (filter.value === 'din-sport' && !athleteSport) return null

          return (
            <button
              key={filter.value}
              onClick={() => setCategory(filter.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <filter.icon className="h-3.5 w-3.5" />
              {filter.label}
            </button>
          )
        })}
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800/30 animate-pulse"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">{getEmptyMessage()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((template) => (
            <WorkoutTemplateCard
              key={template.id}
              template={template}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
