'use client'

/**
 * Coach-facing table for managing learned exercise aliases.
 *
 * Hydrated from a server-side fetch so the first paint is meaningful even
 * on slow connections; subsequent mutations refetch from the API.
 */

import { useState, useTransition, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface AliasRow {
  id: string
  alias: string
  createdAt: string
  exerciseId: string
  exerciseName: string
  category?: string | null
  biomechanicalPillar?: string | null
}

interface Props {
  initialAliases: AliasRow[]
}

export function ExerciseAliasesClient({ initialAliases }: Props) {
  const { toast } = useToast()
  const [aliases, setAliases] = useState<AliasRow[]>(initialAliases)
  const [search, setSearch] = useState('')
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const refetch = useCallback(
    async (q: string) => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('search', q.trim())
      const res = await fetch(`/api/programs/exercise-aliases?${params.toString()}`)
      if (!res.ok) throw new Error('Kunde inte ladda kopplingar')
      const data = (await res.json()) as { aliases: AliasRow[] }
      setAliases(data.aliases ?? [])
    },
    []
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    // Debounce via transition — fine for a table that re-renders cheaply.
    startTransition(() => {
      void refetch(value).catch((e) => {
        toast({
          title: 'Sökningen misslyckades',
          description: e instanceof Error ? e.message : 'Okänt fel',
          variant: 'destructive',
        })
      })
    })
  }

  const handleDelete = async (row: AliasRow) => {
    if (
      !confirm(
        `Ta bort kopplingen "${row.alias}" → ${row.exerciseName}?\n\nFramtida importer av samma namn kommer behöva mappas manuellt igen.`
      )
    )
      return

    setBusyId(row.id)
    try {
      const res = await fetch(
        `/api/programs/exercise-aliases?id=${encodeURIComponent(row.id)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Kunde inte ta bort kopplingen')
      }
      setAliases((prev) => prev.filter((a) => a.id !== row.id))
      toast({
        title: 'Koppling borttagen',
        description: `"${row.alias}" kommer inte längre mappas automatiskt.`,
      })
    } catch (e) {
      toast({
        title: 'Misslyckades',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Kopplingar</CardTitle>
            <CardDescription>
              {aliases.length} {aliases.length === 1 ? 'koppling' : 'kopplingar'}
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Sök namn eller övning…"
              className="pl-9"
            />
            {pending && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {aliases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Inga kopplingar än</p>
            <p className="text-sm mt-1">
              Kopplingar skapas automatiskt när du väljer rätt övning i
              importflödet.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {aliases.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 p-3 rounded border hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{a.alias}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-sm text-blue-700 dark:text-blue-400 truncate">
                      {a.exerciseName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {a.category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {a.category}
                      </Badge>
                    )}
                    {a.biomechanicalPillar && (
                      <Badge variant="outline" className="text-[10px]">
                        {a.biomechanicalPillar}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      Skapad{' '}
                      {format(new Date(a.createdAt), 'd MMM yyyy', {
                        locale: sv,
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(a)}
                  disabled={busyId === a.id}
                  title="Ta bort koppling"
                >
                  {busyId === a.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-500" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
