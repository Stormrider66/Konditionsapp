'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search, Dumbbell, Heart, Zap, Footprints, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { visibleWorkoutTags } from '@/lib/workouts/business-tags'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'

export type PickableWorkoutType = 'strength' | 'cardio' | 'hybrid' | 'agility'

export interface PickedWorkout {
  type: PickableWorkoutType
  id: string
  name: string
}

interface WorkoutPickerFieldProps {
  value: PickedWorkout | null
  onChange: (workout: PickedWorkout | null) => void
  locale: 'en' | 'sv'
  /** When set, enables a "This team" quick filter (workouts scoped to the team). */
  teamId?: string
}

const TYPES: Array<{ value: PickableWorkoutType; en: string; sv: string; icon: typeof Dumbbell }> = [
  { value: 'strength', en: 'Strength', sv: 'Styrka', icon: Dumbbell },
  { value: 'cardio', en: 'Cardio', sv: 'Kondition', icon: Heart },
  { value: 'hybrid', en: 'Hybrid', sv: 'Hybrid', icon: Zap },
  { value: 'agility', en: 'Agility', sv: 'Agility', icon: Footprints },
]

// type → list endpoint + the array key in its response. All four endpoints
// support `search` (name + description), `teamId`, repeated `tag` filters, and
// a `limit`, and return `{ ..., pagination: { total } }`.
const ENDPOINT: Record<PickableWorkoutType, { path: string; key: string }> = {
  strength: { path: '/api/strength-sessions', key: 'sessions' },
  cardio: { path: '/api/cardio-sessions', key: 'sessions' },
  hybrid: { path: '/api/hybrid-workouts', key: 'workouts' },
  agility: { path: '/api/agility-workouts', key: 'data' },
}

const PAGE_SIZE = 20

interface PickerItem {
  id: string
  name: string
  tags: string[]
}

/**
 * In-dialog workout picker: choose a type, then search/filter/select a session
 * for the team. Filters (search, "this team", tags) all run server-side against
 * the existing business-scoped list endpoints, so they hold up on a large bank.
 */
export function WorkoutPickerField({ value, onChange, locale, teamId }: WorkoutPickerFieldProps) {
  const t = (en: string, sv: string) => (locale === 'sv' ? sv : en)
  const [type, setType] = useState<PickableWorkoutType>(value?.type ?? 'strength')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<PickerItem[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [teamOnly, setTeamOnly] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const businessHeaders = useMemo(() => getBusinessScopeHeaders(pathname), [pathname])

  const fetchItems = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      try {
        const { path, key } = ENDPOINT[type]
        const params = new URLSearchParams({ limit: String(limit) })
        if (query.trim()) params.set('search', query.trim())
        if (teamOnly && teamId) params.set('teamId', teamId)
        selectedTags.forEach((tag) => params.append('tag', tag))
        const res = await fetch(`${path}?${params}`, { headers: businessHeaders, signal })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        const list = Array.isArray(data[key]) ? data[key] : []
        setItems(
          list.map((w: { id: string; name: string; tags?: string[] | null }) => ({
            id: w.id,
            name: w.name,
            tags: visibleWorkoutTags(w.tags),
          }))
        )
        setTotal(typeof data?.pagination?.total === 'number' ? data.pagination.total : list.length)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setItems([])
        setTotal(0)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [type, query, limit, teamOnly, teamId, selectedTags, businessHeaders]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => void fetchItems(controller.signal), 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [fetchItems])

  // Tag vocabulary for the filter chips: the visible tags present in the current
  // results, plus any already-selected tags so they stay toggleable as the list
  // narrows.
  const tagVocab = useMemo(() => {
    const set = new Set<string>(selectedTags)
    items.forEach((item) => item.tags.forEach((tag) => set.add(tag)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [items, selectedTags])

  const handleTypeChange = (next: PickableWorkoutType) => {
    setType(next)
    setLimit(PAGE_SIZE)
    setSelectedTags([])
    onChange(null)
  }

  const toggleTag = (tag: string) => {
    setLimit(PAGE_SIZE)
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((option) => {
          const Icon = option.icon
          const active = type === option.value
          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeChange(option.value)}
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
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(PAGE_SIZE)
          }}
          placeholder={t('Search by name…', 'Sök på namn…')}
          className="pl-7"
        />
      </div>

      {/* Filter chips: "this team" + tags */}
      {(teamId || tagVocab.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {teamId && (
            <button
              type="button"
              onClick={() => {
                setTeamOnly((prev) => !prev)
                setLimit(PAGE_SIZE)
              }}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                teamOnly
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Users className="h-3 w-3" />
              {t('This team', 'Det här laget')}
            </button>
          )}
          {tagVocab.map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs transition-colors',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                #{tag}
              </button>
            )
          })}
        </div>
      )}

      <ScrollArea className="h-[170px] rounded-md border p-1">
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
                    'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                    selected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/60'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.name}</span>
                    {item.tags.length > 0 && (
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="px-1 py-0 text-[10px] font-normal">
                            #{tag}
                          </Badge>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>
                        )}
                      </span>
                    )}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              )
            })}

            {items.length < total && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
              >
                {t(`Show more (${total - items.length})`, `Visa fler (${total - items.length})`)}
              </Button>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
