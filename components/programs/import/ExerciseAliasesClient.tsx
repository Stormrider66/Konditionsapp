'use client'

/**
 * Coach-facing table for managing learned exercise aliases.
 *
 * Hydrated from a server-side fetch so the first paint is meaningful even
 * on slow connections; subsequent mutations refetch from the API.
 */

import { useState, useTransition, useCallback } from 'react'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'

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
  const t = useTranslations('components.exerciseAliasesClient')
  const locale = useLocale()
  const dateLocale = locale === 'sv' ? sv : enUS
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
      if (!res.ok) throw new Error(t('errors.fetchFailed'))
      const data = (await res.json()) as { aliases: AliasRow[] }
      setAliases(data.aliases ?? [])
    },
    [t]
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    // Debounce via transition — fine for a table that re-renders cheaply.
    startTransition(() => {
      void refetch(value).catch((e) => {
        toast({
          title: t('toasts.searchFailed.title'),
          description: e instanceof Error ? e.message : t('errors.unknown'),
          variant: 'destructive',
        })
      })
    })
  }

  const handleDelete = async (row: AliasRow) => {
    if (
      !confirm(
        t('confirmDelete', {
          alias: row.alias,
          exerciseName: row.exerciseName,
        })
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
        throw new Error(data?.error || t('errors.deleteFailed'))
      }
      setAliases((prev) => prev.filter((a) => a.id !== row.id))
      toast({
        title: t('toasts.deleteSuccess.title'),
        description: t('toasts.deleteSuccess.description', { alias: row.alias }),
      })
    } catch (e) {
      toast({
        title: t('toasts.actionFailed.title'),
        description: e instanceof Error ? e.message : t('errors.unknown'),
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <RolePanel className="p-5">
      <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{t('title')}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {t('aliasCount', { count: aliases.length })}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="border-zinc-200 bg-white pl-9 dark:border-white/10 dark:bg-zinc-900"
            />
            {pending && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
            )}
          </div>
        </div>
      </div>
      <div className="mt-5">
        {aliases.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-300">{t('emptyTitle')}</p>
            <p className="mt-1 text-sm">
              {t('emptyDescription')}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {aliases.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate font-medium text-zinc-950 dark:text-zinc-50">{a.alias}</span>
                    <span className="text-xs text-zinc-400">→</span>
                    <span className="truncate text-sm text-blue-700 dark:text-blue-300">
                      {a.exerciseName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {a.category && (
                      <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[10px] text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
                        {a.category}
                      </Badge>
                    )}
                    {a.biomechanicalPillar && (
                      <Badge variant="outline" className="text-[10px]">
                        {a.biomechanicalPillar}
                      </Badge>
                    )}
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {t('createdPrefix')}{' '}
                      {format(new Date(a.createdAt), 'd MMM yyyy', {
                        locale: dateLocale,
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
                  title={t('deleteButton')}
                  className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
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
      </div>
    </RolePanel>
  )
}
