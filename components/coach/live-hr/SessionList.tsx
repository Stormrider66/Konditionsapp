'use client'

/**
 * Session List Component
 *
 * Client component for listing and creating sessions.
 */

import { useState, useEffect } from 'react'
import { CreateSessionDialog } from '@/components/coach/live-hr/CreateSessionDialog'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, Radio, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { LiveHRSessionListItem } from '@/lib/live-hr/types'

interface Team {
  id: string
  name: string
}

interface LiveHRSessionListProps {
  teams: Team[]
}

type AppLocale = 'en' | 'sv'

const COPY = {
  en: {
    fetchError: 'Could not fetch sessions',
    createSuccess: 'Session created',
    createError: 'Could not create session',
    active: 'Active',
    all: 'All',
    activeSessions: 'Active sessions',
    allSessions: 'All sessions',
    pausedSessions: 'Paused sessions',
    noSessions: 'No sessions',
    emptyHint: 'Start a new session to begin monitoring athlete heart rates',
    paused: 'PAUSED',
    ended: 'ENDED',
    defaultSessionName: 'Live HR Session',
  },
  sv: {
    fetchError: 'Kunde inte hämta sessioner',
    createSuccess: 'Session skapad',
    createError: 'Kunde inte skapa session',
    active: 'Aktiva',
    all: 'Alla',
    activeSessions: 'Aktiva sessioner',
    allSessions: 'Alla sessioner',
    pausedSessions: 'Pausade sessioner',
    noSessions: 'Inga sessioner',
    emptyHint: 'Starta en ny session för att börja övervaka atleters puls',
    paused: 'PAUSAD',
    ended: 'AVSLUTAD',
    defaultSessionName: 'Live HR Session',
  },
} as const

export function LiveHRSessionList({ teams }: LiveHRSessionListProps) {
  const router = useRouter()
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [sessions, setSessions] = useState<LiveHRSessionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEnded, setShowEnded] = useState(false)

  // Fetch sessions
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch(`/api/coach/live-hr/sessions?includeEnded=${showEnded}`)
        const data = await res.json()
        setSessions(data.sessions || [])
      } catch {
        toast.error(copy.fetchError)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchSessions()
  }, [copy.fetchError, showEnded])

  // Create new session
  const handleCreate = async (data: { name?: string; teamId?: string }) => {
    try {
      const res = await fetch('/api/coach/live-hr/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to create session')

      const { session } = await res.json()

      // If team was selected, add all team members
      if (data.teamId) {
        await fetch(`/api/coach/live-hr/sessions/${session.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: data.teamId }),
        })
      }

      toast.success(copy.createSuccess)
      router.push(`/coach/live-hr/${session.id}`)
    } catch {
      toast.error(copy.createError)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE')
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
        <CreateSessionDialog teams={teams} onCreate={handleCreate} />
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
              <SessionCard key={session.id} session={session} locale={locale} copy={copy} />
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
              <SessionCard key={session.id} session={session} locale={locale} copy={copy} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <GlassCard glow="red" className="border border-slate-200 dark:border-white/5">
          <GlassCardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-rose-500 mb-4 animate-pulse" />
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{copy.noSessions}</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              {copy.emptyHint}
            </p>
            <CreateSessionDialog teams={teams} onCreate={handleCreate} />
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  )
}

function SessionCard({
  session,
  locale,
  copy,
}: {
  session: LiveHRSessionListItem
  locale: AppLocale
  copy: (typeof COPY)[AppLocale]
}) {
  const isLive = session.status === 'ACTIVE'
  const timeLocale = locale === 'sv' ? 'sv-SE' : 'en-US'
  return (
    <Link href={`/coach/live-hr/${session.id}`}>
      <GlassCard glow={isLive ? 'red' : 'blue'} className="hover:shadow-lg transition-all cursor-pointer border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/10">
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <GlassCardTitle className="text-lg truncate text-slate-900 dark:text-white">
              {session.name || copy.defaultSessionName}
            </GlassCardTitle>
            {session.status === 'ACTIVE' ? (
              <Badge variant="destructive" className="animate-pulse bg-red-600 text-white border-none">LIVE</Badge>
            ) : session.status === 'PAUSED' ? (
              <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{copy.paused}</Badge>
            ) : (
              <Badge variant="outline" className="border-slate-350 dark:border-white/10 text-slate-600 dark:text-slate-400">{copy.ended}</Badge>
            )}
          </div>
          {session.teamName && (
            <GlassCardDescription className="text-slate-500 dark:text-slate-400">{session.teamName}</GlassCardDescription>
          )}
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
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
            </div>
            <ChevronRight className="h-4 w-4" />
          </div>
        </GlassCardContent>
      </GlassCard>
    </Link>
  )
}
