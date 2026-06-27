'use client'

import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, X, Plus } from 'lucide-react'
import { useLocale } from '@/i18n/client'
import { getExerciseDisplayName } from '@/lib/exercises/display-name'

export interface PickedExercise {
  id: string
  name: string
}

interface ExerciseResult {
  id: string
  name: string
  nameSv?: string | null
  nameEn?: string | null
  muscleGroup?: string | null
}

interface MultiExercisePickerProps {
  value: PickedExercise[]
  onChange: (next: PickedExercise[]) => void
  searchPlaceholder: string
  emptyText: string
  noneSelectedText: string
}

/**
 * Search the exercise library and accumulate a set of selected exercises
 * (shown as removable chips). Used by the physio restriction form to populate
 * `affectedExerciseIds`.
 */
export function MultiExercisePicker({
  value,
  onChange,
  searchPlaceholder,
  emptyText,
  noneSelectedText,
}: MultiExercisePickerProps) {
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [loading, setLoading] = useState(false)

  const fetchResults = useCallback(async (signal: AbortSignal, q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ search: q.trim(), limit: '15' })
      const res = await fetch(`/api/exercises?${params}`, { signal })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setResults(Array.isArray(data.exercises) ? data.exercises : [])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setResults([])
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => void fetchResults(controller.signal, query), 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [fetchResults, query])

  const selectedIds = new Set(value.map((v) => v.id))

  function add(ex: ExerciseResult) {
    if (selectedIds.has(ex.id)) return
    onChange([...value, { id: ex.id, name: getExerciseDisplayName(ex, locale) }])
    setQuery('')
    setResults([])
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="bg-white pl-7 text-zinc-950 dark:bg-zinc-950/60 dark:text-zinc-100"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950/80">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
          ) : (
            results.map((ex) => {
              const already = selectedIds.has(ex.id)
              return (
                <button
                  key={ex.id}
                  type="button"
                  disabled={already}
                  onClick={() => add(ex)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-white/5"
                >
                  <span className="truncate">
                    {getExerciseDisplayName(ex, locale)}
                    {ex.muscleGroup && <span className="ml-2 text-xs text-zinc-500">{ex.muscleGroup}</span>}
                  </span>
                  {!already && <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                </button>
              )
            })
          )}
        </div>
      )}

      {value.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{noneSelectedText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((ex) => (
            <Badge
              key={ex.id}
              variant="outline"
              className="gap-1 border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-200"
            >
              {ex.name}
              <button
                type="button"
                aria-label="Remove exercise"
                onClick={() => remove(ex.id)}
                className="ml-0.5 rounded-sm hover:text-red-500 focus:outline-none focus:ring-1 focus:ring-red-300"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
