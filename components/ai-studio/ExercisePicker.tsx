'use client'

/**
 * Exercise Picker
 *
 * Lightweight exercise search + select. Used inside the draft workout editor
 * where a segment needs an exerciseId and the user doesn't already have one
 * in hand. For "swap an existing exercise" flows prefer the heavier
 * ExerciseSwapper which shows progression paths.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Check, X } from 'lucide-react'
import { useLocale } from '@/i18n/client'

type ExerciseRow = {
  id: string
  name: string
  category?: string | null
  biomechanicalPillar?: string | null
  progressionLevel?: string | null
  equipment?: string | null
}

interface ExercisePickerProps {
  value?: string | null
  valueName?: string | null
  onChange: (exerciseId: string | null, exerciseName: string | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  placeholder: string
  selectedExercise: string
  clearExercise: string
  title: string
  description: string
  searchPlaceholder: string
  loading: string
  noMatches: string
  cancel: string
  choose: string
}> = {
  en: {
    placeholder: 'Choose exercise...',
    selectedExercise: 'Selected exercise',
    clearExercise: 'Clear exercise',
    title: 'Choose exercise',
    description: 'Search the exercise library or choose from the list.',
    searchPlaceholder: 'Search: squat, deadlift, bench...',
    loading: 'Loading...',
    noMatches: 'No exercises match the search.',
    cancel: 'Cancel',
    choose: 'Choose',
  },
  sv: {
    placeholder: 'Välj övning...',
    selectedExercise: 'Vald övning',
    clearExercise: 'Rensa övning',
    title: 'Välj övning',
    description: 'Sök i övningsbiblioteket eller välj från listan.',
    searchPlaceholder: 'Sök: squat, deadlift, bench...',
    loading: 'Laddar...',
    noMatches: 'Inga övningar matchar sökningen.',
    cancel: 'Avbryt',
    choose: 'Välj',
  },
}

export function ExercisePicker({
  value,
  valueName,
  onChange,
  placeholder,
  className,
  disabled,
}: ExercisePickerProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ExerciseRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ExerciseRow | null>(null)

  const fetchExercises = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '30' })
        if (q.trim()) params.set('search', q.trim())
        const res = await fetch(`/api/exercises?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load exercises')
        const data = await res.json()
        setResults(data.exercises || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounced search when dialog is open
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      void fetchExercises(search)
    }, 250)
    return () => clearTimeout(t)
  }, [open, search, fetchExercises])

  const handleConfirm = () => {
    if (!selected) return
    onChange(selected.id, selected.name)
    setOpen(false)
    setSelected(null)
    setSearch('')
  }

  const handleClear = () => {
    onChange(null, null)
  }

  const displayName = valueName || (value ? copy.selectedExercise : placeholder ?? copy.placeholder)

  return (
    <>
      <div className={`flex items-center gap-1 ${className ?? ''}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex-1 justify-start font-normal"
        >
          <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          <span className={value ? '' : 'text-muted-foreground'}>{displayName}</span>
        </Button>
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClear}
            title={copy.clearExercise}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="pl-9"
                autoFocus
              />
            </div>

            <ScrollArea className="h-[340px] pr-2">
              {loading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {copy.loading}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {copy.noMatches}
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((ex) => {
                    const isSelected = selected?.id === ex.id
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => setSelected(ex)}
                        className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-transparent hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{ex.name}</span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {ex.category && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {ex.category}
                                </Badge>
                              )}
                              {ex.biomechanicalPillar && (
                                <Badge variant="outline" className="text-[10px]">
                                  {ex.biomechanicalPillar}
                                </Badge>
                              )}
                              {ex.equipment && (
                                <span className="text-[10px] text-muted-foreground">
                                  {ex.equipment}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setSelected(null)
                setSearch('')
              }}
            >
              {copy.cancel}
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!selected}>
              {copy.choose}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
