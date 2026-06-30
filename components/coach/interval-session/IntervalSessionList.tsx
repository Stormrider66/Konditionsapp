'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Timer, Users, Trash2, Calendar, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import type { IntervalSessionListItem } from '@/lib/interval-session/types'
import { useLocale } from '@/i18n/client'
import { cn } from '@/lib/utils'

interface IntervalSessionListProps {
  businessSlug?: string
}

type AppLocale = 'en' | 'sv'

const STATUS_LABELS: Record<string, { en: string; sv: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  SETUP: { en: 'Setup', sv: 'Förberedelse', variant: 'outline' },
  ACTIVE: { en: 'Active', sv: 'Aktiv', variant: 'default' },
  LACTATE_ENTRY: { en: 'Lactate', sv: 'Laktat', variant: 'secondary' },
  ENDED: { en: 'Ended', sv: 'Avslutad', variant: 'destructive' },
}

const copy = {
  en: {
    fetchFailed: 'Could not fetch sessions',
    deleteConfirm: 'Delete session?',
    deleteSuccess: 'Session deleted',
    deleteFailed: 'Could not delete session',
    showEnded: 'Show ended',
    empty: 'No interval sessions yet. Create a new one to start.',
    fallbackName: 'Interval session',
    interval: (value: number) => `Interval ${value}`,
    athletes: (count: number) => `${count} ${count === 1 ? 'athlete' : 'athletes'}`,
    atTime: (time: string) => ` at ${time}`,
    analysis: 'Analysis',
  },
  sv: {
    fetchFailed: 'Kunde inte hämta sessioner',
    deleteConfirm: 'Ta bort session?',
    deleteSuccess: 'Session borttagen',
    deleteFailed: 'Kunde inte ta bort session',
    showEnded: 'Visa avslutade',
    empty: 'Inga intervallsessioner ännu. Skapa en ny för att börja.',
    fallbackName: 'Intervallsession',
    interval: (value: number) => `Intervall ${value}`,
    athletes: (count: number) => `${count} atleter`,
    atTime: (time: string) => ` kl ${time}`,
    analysis: 'Analys',
  },
} satisfies Record<AppLocale, {
  fetchFailed: string
  deleteConfirm: string
  deleteSuccess: string
  deleteFailed: string
  showEnded: string
  empty: string
  fallbackName: string
  interval: (value: number) => string
  athletes: (count: number) => string
  atTime: (time: string) => string
  analysis: string
}>

function formatDate(value: string | Date, locale: AppLocale): string {
  return new Date(value).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US')
}

export function IntervalSessionList({ businessSlug }: IntervalSessionListProps) {
  const router = useRouter()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const text = copy[locale]
  const [sessions, setSessions] = useState<IntervalSessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [includeEnded, setIncludeEnded] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/coach/interval-sessions?includeEnded=${includeEnded}`
      )
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
      }
    } catch {
      toast.error(text.fetchFailed)
    } finally {
      setLoading(false)
    }
  }, [includeEnded, text.fetchFailed])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchSessions()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [fetchSessions])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(text.deleteConfirm)) return

    try {
      const res = await fetch(`/api/coach/interval-sessions/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        toast.success(text.deleteSuccess)
      }
    } catch {
      toast.error(text.deleteFailed)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950/60" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch
          id="show-ended"
          checked={includeEnded}
          onCheckedChange={setIncludeEnded}
        />
        <Label htmlFor="show-ended" className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {text.showEnded}
        </Label>
      </div>

      {sessions.length === 0 ? (
        <RolePanel className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {text.empty}
        </RolePanel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const statusInfo = STATUS_LABELS[session.status] || STATUS_LABELS.SETUP
            const panelTone = session.status === 'ACTIVE'
              ? 'border-red-200 dark:border-red-900/50'
              : session.status === 'LACTATE_ENTRY'
                ? 'border-emerald-200 dark:border-emerald-900/50'
                : 'border-zinc-200 dark:border-white/10'

            return (
              <RolePanel
                key={session.id}
                className={cn('cursor-pointer p-4 transition-shadow hover:shadow-md', panelTone)}
                onClick={() =>
                  router.push(
                    `${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions/${session.id}`
                  )
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                      {session.name || text.fallbackName}
                    </h3>
                    {session.teamName && (
                      <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                        {session.teamName}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusInfo.variant} className="shrink-0">{statusInfo[locale]}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5 text-blue-500" />
                    {text.interval(session.currentInterval)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" />
                    {text.athletes(session.participantCount)}
                  </span>
                </div>

                {session.scheduledDate && session.status === 'SETUP' && (
                  <div className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-650 dark:text-blue-400">
                    <Calendar className="h-3 w-3" />
                    {formatDate(session.scheduledDate, locale)}
                    {session.scheduledTime && text.atTime(session.scheduledTime)}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(session.startedAt, locale)}
                  </span>
                  {session.status === 'ENDED' && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs dark:border-white/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(
                            `${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions/${session.id}/analysis`
                          )
                        }}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        {text.analysis}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-600 dark:text-red-450 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={(e) => handleDelete(session.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </RolePanel>
            )
          })}
        </div>
      )}
    </div>
  )
}
