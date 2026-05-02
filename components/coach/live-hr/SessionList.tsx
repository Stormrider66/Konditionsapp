'use client'

/**
 * Session List Component
 *
 * Client component for listing and creating sessions.
 */

import { useState, useEffect } from 'react'
import { CreateSessionDialog } from '@/components/coach/live-hr/CreateSessionDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Clock, Radio, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LiveHRSessionListItem, LiveHRSessionStatus } from '@/lib/live-hr/types'

interface Team {
  id: string
  name: string
}

interface LiveHRSessionListProps {
  teams: Team[]
}

export function LiveHRSessionList({ teams }: LiveHRSessionListProps) {
  const router = useRouter()
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
        toast.error('Kunde inte hämta sessioner')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSessions()
  }, [showEnded])

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

      toast.success('Session skapad')
      router.push(`/coach/live-hr/${session.id}`)
    } catch {
      toast.error('Kunde inte skapa session')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('sv-SE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: LiveHRSessionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="destructive">LIVE</Badge>
      case 'PAUSED':
        return <Badge variant="secondary">PAUSAD</Badge>
      case 'ENDED':
        return <Badge variant="outline">AVSLUTAD</Badge>
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
        <div className="flex items-center gap-4">
          <Button
            variant={showEnded ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setShowEnded(false)}
          >
            Aktiva
          </Button>
          <Button
            variant={showEnded ? 'ghost' : 'outline'}
            size="sm"
            onClick={() => setShowEnded(true)}
          >
            Alla
          </Button>
        </div>
        <CreateSessionDialog teams={teams} onCreate={handleCreate} />
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500 animate-pulse" />
            Aktiva sessioner
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Other sessions */}
      {otherSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {showEnded ? 'Alla sessioner' : 'Pausade sessioner'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Inga sessioner</p>
            <p className="text-muted-foreground text-sm mb-4">
              Starta en ny session för att börja övervaka atleters puls
            </p>
            <CreateSessionDialog teams={teams} onCreate={handleCreate} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SessionCard({ session }: { session: LiveHRSessionListItem }) {
  return (
    <Link href={`/coach/live-hr/${session.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg truncate">
              {session.name || 'Live HR Session'}
            </CardTitle>
            {session.status === 'ACTIVE' ? (
              <Badge variant="destructive">LIVE</Badge>
            ) : session.status === 'PAUSED' ? (
              <Badge variant="secondary">PAUSAD</Badge>
            ) : (
              <Badge variant="outline">AVSLUTAD</Badge>
            )}
          </div>
          {session.teamName && (
            <CardDescription>{session.teamName}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {session.activeParticipants}/{session.participantCount}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{new Date(session.startedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
