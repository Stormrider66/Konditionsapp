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
          className="bg-slate-950/50 pl-7 text-white"
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-white/10 bg-slate-950/60">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">{emptyText}</p>
          ) : (
            results.map((ex) => {
              const already = selectedIds.has(ex.id)
              return (
                <button
                  key={ex.id}
                  type="button"
                  disabled={already}
                  onClick={() => add(ex)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40"
                >
                  <span className="truncate">
                    {getExerciseDisplayName(ex, locale)}
                    {ex.muscleGroup && <span className="ml-2 text-xs text-slate-500">{ex.muscleGroup}</span>}
                  </span>
                  {!already && <Plus className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                </button>
              )
            })
          )}
        </div>
      )}

      {value.length === 0 ? (
        <p className="text-xs text-slate-500">{noneSelectedText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((ex) => (
            <Badge key={ex.id} variant="secondary" className="gap-1">
              {ex.name}
              <button type="button" onClick={() => remove(ex.id)} className="ml-0.5 hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
