'use client'

/**
 * Session List Component
 *
 * Client component for listing and creating sessions.
 */

import { useState, useEffect, useCallback } from 'react'
import { CreateSessionDialog } from '@/components/coach/live-hr/CreateSessionDialog'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, Radio, ChevronRight, Square, Bike, WifiOff } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { LiveHRSessionListItem } from '@/lib/live-hr/types'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'

interface Team {
  id: string
  name: string
}

interface Athlete {
  id: string
  name: string
  team?: {
    name: string | null
  } | null
}

interface LiveHRSessionListProps {
  teams: Team[]
  athletes: Athlete[]
}

type AppLocale = 'en' | 'sv'

const COPY = {
  en: {
    fetchError: 'Could not fetch sessions',
    createSuccess: 'Session created',
    createError: 'Could not create session',
    endSuccess: 'Session ended',
    endError: 'Could not end session',
    active: 'Active',
    all: 'All',
    activeSessions: 'Active sessions',
    staleSessions: 'No live signal',
    allSessions: 'All sessions',
    pausedSessions: 'Paused sessions',
    noSessions: 'No sessions',
    emptyHint: 'Start a new session to begin monitoring athlete heart rates',
    paused: 'PAUSED',
    ended: 'ENDED',
    noSignal: 'NO SIGNAL',
    machine: 'Machine',
    endSession: 'End',
    defaultSessionName: 'Live HR Session',
  },
  sv: {
    fetchError: 'Kunde inte hämta sessioner',
    createSuccess: 'Session skapad',
    createError: 'Kunde inte skapa session',
    endSuccess: 'Session avslutad',
    endError: 'Kunde inte avsluta sessionen',
    active: 'Aktiva',
    all: 'Alla',
    activeSessions: 'Aktiva sessioner',
    staleSessions: 'Ingen live-signal',
    allSessions: 'Alla sessioner',
    pausedSessions: 'Pausade sessioner',
    noSessions: 'Inga sessioner',
    emptyHint: 'Starta en ny session för att börja övervaka atleters puls',
    paused: 'PAUSAD',
    ended: 'AVSLUTAD',
    noSignal: 'INGEN SIGNAL',
    machine: 'Maskin',
    endSession: 'Avsluta',
    defaultSessionName: 'Live HR Session',
  },
} as const

export function LiveHRSessionList({ teams, athletes }: LiveHRSessionListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [sessions, setSessions] = useState<LiveHRSessionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEnded, setShowEnded] = useState(false)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/coach/live-hr/sessions?includeEnded=${showEnded}`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      toast.error(copy.fetchError)
    } finally {
      setIsLoading(false)
    }
  }, [copy.fetchError, showEnded])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSessions()
  }, [fetchSessions])

  // Create new session
  const handleCreate = async (data: { name?: string; teamId?: string; participantIds?: string[] }) => {
    try {
      const res = await fetch('/api/coach/live-hr/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          businessSlug: pathBusinessSlug ?? undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to create session')

      const { session } = await res.json()

      toast.success(copy.createSuccess)
      router.push(`${basePath}/coach/live-hr/${session.id}`)
    } catch {
      toast.error(copy.createError)
    }
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/coach/live-hr/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      })

      if (!res.ok) throw new Error('Failed to end session')

      toast.success(copy.endSuccess)
      await fetchSessions()
    } catch {
      toast.error(copy.endError)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE' && !s.isStale)
  const staleSessions = sessions.filter((s) => s.status === 'ACTIVE' && s.isStale)
  const otherSessions = sessions.filter((s) => s.status !== 'ACTIVE')

  return (
    <div className="space-y-8">
      {/* Header with create button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-1 rounded-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEnded(false)}
            className={`rounded-lg px-3 ${!showEnded ? 'bg-white dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-slate-200/80 dark:border-blue-500/30 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            {copy.active}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEnded(true)}
            className={`rounded-lg px-3 ${showEnded ? 'bg-white dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-slate-200/80 dark:border-blue-500/30 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
            {copy.all}
          </Button>
        </div>
        <CreateSessionDialog teams={teams} athletes={athletes} onCreate={handleCreate} />
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
            {copy.activeSessions}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                locale={locale}
                copy={copy}
                basePath={basePath}
                onEnd={handleEndSession}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stale active sessions */}
      {staleSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
            <WifiOff className="h-5 w-5 text-slate-500" />
            {copy.staleSessions}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staleSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                locale={locale}
                copy={copy}
                basePath={basePath}
                onEnd={handleEndSession}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other sessions */}
      {otherSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
            {showEnded ? copy.allSessions : copy.pausedSessions}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                locale={locale}
                copy={copy}
                basePath={basePath}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <RolePanel className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <Radio className="h-12 w-12 text-slate-500 mb-4 animate-pulse" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{copy.noSessions}</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {copy.emptyHint}
          </p>
          <CreateSessionDialog teams={teams} athletes={athletes} onCreate={handleCreate} />
        </RolePanel>
      )}
    </div>
  )
}

function SessionCard({
  session,
  locale,
  copy,
  basePath,
  onEnd,
}: {
  session: LiveHRSessionListItem
  locale: AppLocale
  copy: (typeof COPY)[AppLocale]
  basePath: string
  onEnd?: (sessionId: string) => void
}) {
  const router = useRouter()
  const isLive = session.status === 'ACTIVE'
  const timeLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  return (
    <RolePanel
      className={`cursor-pointer p-5 transition-all hover:shadow-lg ${
        isLive && !session.isStale
          ? 'border-red-100 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/10'
          : 'border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950/60'
      }`}
      role="button"
      tabIndex={0}
      onClick={() => router.push(`${basePath}/coach/live-hr/${session.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          router.push(`${basePath}/coach/live-hr/${session.id}`)
        }
      }}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
            {session.name || copy.defaultSessionName}
          </h3>
          {session.status === 'ACTIVE' && session.isStale ? (
            <Badge variant="outline" className="border-slate-350 dark:border-white/10 text-slate-600 dark:text-slate-400">{copy.noSignal}</Badge>
          ) : session.status === 'ACTIVE' ? (
            <Badge variant="destructive" className="animate-pulse bg-red-600 text-white border-none">LIVE</Badge>
          ) : session.status === 'PAUSED' ? (
            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{copy.paused}</Badge>
          ) : (
            <Badge variant="outline" className="border-slate-350 dark:border-white/10 text-slate-600 dark:text-slate-400">{copy.ended}</Badge>
          )}
        </div>
        {session.teamName && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{session.teamName}</p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span>
                {session.activeParticipants}/{session.participantCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-emerald-500" />
              <span>{new Date(session.startedAt).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {session.hasMachineSignal && (
              <div className="flex items-center gap-1">
                <Bike className="h-4 w-4 text-amber-500" />
                <span>{copy.machine}</span>
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </div>
        {session.isStale && onEnd && (
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-250 dark:border-white/10 text-slate-700 dark:text-slate-300"
              onClick={(event) => {
                event.stopPropagation()
                onEnd(session.id)
              }}
            >
              <Square className="h-3.5 w-3.5 mr-2" />
              {copy.endSession}
            </Button>
          </div>
        )}
      </div>
    </RolePanel>
  )
}
