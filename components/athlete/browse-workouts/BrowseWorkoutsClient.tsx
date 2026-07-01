'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Heart, Dumbbell, Activity, Flame, Target, StretchHorizontal, Trophy } from 'lucide-react'
import { WorkoutTemplateCard, type WorkoutTemplateSummary } from './WorkoutTemplateCard'
import { useTranslations } from '@/i18n/client'

type CategoryFilter = 'alla' | 'favoriter' | 'din-sport' | 'STRENGTH' | 'CARDIO' | 'FUNCTIONAL' | 'CORE' | 'STRETCHING'

const CATEGORY_FILTERS: { value: CategoryFilter; labelKey: string; icon: React.ElementType }[] = [
  { value: 'alla', labelKey: 'filters.all', icon: Flame },
  { value: 'favoriter', labelKey: 'filters.favorites', icon: Heart },
  { value: 'din-sport', labelKey: 'filters.yourSport', icon: Trophy },
  { value: 'STRENGTH', labelKey: 'filters.strength', icon: Dumbbell },
  { value: 'CARDIO', labelKey: 'filters.cardio', icon: Activity },
  { value: 'FUNCTIONAL', labelKey: 'filters.functional', icon: Flame },
  { value: 'CORE', labelKey: 'filters.core', icon: Target },
  { value: 'STRETCHING', labelKey: 'filters.stretching', icon: StretchHorizontal },
]

interface BrowseWorkoutsClientProps {
  athleteSport?: string | null
}

export function BrowseWorkoutsClient({ athleteSport }: BrowseWorkoutsClientProps) {
  const t = useTranslations('components.browseWorkoutsClient')
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
    void fetchTemplates()
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
    if (debouncedQuery) return t('empty.search', { query: debouncedQuery })
    switch (category) {
      case 'favoriter': return t('empty.favorites')
      case 'din-sport': return athleteSport ? t('empty.sport') : t('empty.noSport')
      default: return t('empty.category')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5 transition-colors">
          <Dumbbell className="h-8 w-8 text-orange-600 dark:text-orange-400 transition-colors" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold italic uppercase tracking-tight leading-none mb-1 text-slate-900 dark:text-white transition-colors">
            {t('title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/50 ring-1 ring-black/5 dark:ring-white/5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((filter) => {
          const isActive = category === filter.value
          // Hide the sport filter if no sport is set
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
              {t(filter.labelKey)}
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
