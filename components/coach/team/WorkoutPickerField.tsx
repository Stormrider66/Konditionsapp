'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search, Dumbbell, Heart, Zap, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'

export type PickableWorkoutType = 'strength' | 'cardio' | 'hybrid'

export interface PickedWorkout {
  type: PickableWorkoutType
  id: string
  name: string
}

interface WorkoutPickerFieldProps {
  value: PickedWorkout | null
  onChange: (workout: PickedWorkout | null) => void
  locale: 'en' | 'sv'
}

const TYPES: Array<{ value: PickableWorkoutType; en: string; sv: string; icon: typeof Dumbbell }> = [
  { value: 'strength', en: 'Strength', sv: 'Styrka', icon: Dumbbell },
  { value: 'cardio', en: 'Cardio', sv: 'Kondition', icon: Heart },
  { value: 'hybrid', en: 'Hybrid', sv: 'Hybrid', icon: Zap },
]

// type → list endpoint + the array key in its response
const ENDPOINT: Record<PickableWorkoutType, { path: string; key: string }> = {
  strength: { path: '/api/strength-sessions', key: 'sessions' },
  cardio: { path: '/api/cardio-sessions', key: 'sessions' },
  hybrid: { path: '/api/hybrid-workouts', key: 'workouts' },
}

/**
 * In-dialog workout picker: choose a type, then search/select a session for the
 * team. Backed by the existing business-scoped list endpoints. Used when the
 * assignment dialog isn't handed a workout up front.
 */
export function WorkoutPickerField({ value, onChange, locale }: WorkoutPickerFieldProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)
  const [type, setType] = useState<PickableWorkoutType>(value?.type ?? 'strength')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const businessHeaders = useMemo(() => getBusinessScopeHeaders(pathname), [pathname])

  const fetchItems = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      try {
        const { path, key } = ENDPOINT[type]
        // Team sessions are business-scoped (StrengthSession.teamId is usually
        // null), so list the business's sessions rather than filtering by team.
        const params = new URLSearchParams({ limit: '20' })
        if (query.trim()) params.set('search', query.trim())
        const res = await fetch(`${path}?${params}`, { headers: businessHeaders, signal })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        const list = Array.isArray(data[key]) ? data[key] : []
        setItems(list.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setItems([])
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [type, query, businessHeaders]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => void fetchItems(controller.signal), 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [fetchItems])

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {TYPES.map((option) => {
          const Icon = option.icon
          const active = type === option.value
          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setType(option.value)
                onChange(null)
              }}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {t(option.en, option.sv)}
            </Button>
          )
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search workouts…', 'Sök pass…')}
          className="pl-7"
        />
      </div>

      <ScrollArea className="h-[140px] rounded-md border p-1">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('No workouts found.', 'Inga pass hittades.')}
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const selected = value?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ type, id: item.id, name: item.name })}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors',
                    selected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/60'
                  )}
                >
                  <span className="truncate">{item.name}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
