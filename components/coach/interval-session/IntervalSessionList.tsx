'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Timer, Users, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { IntervalSessionListItem } from '@/lib/interval-session/types'

interface IntervalSessionListProps {
  businessSlug?: string
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  SETUP: { label: 'Foreberedelse', variant: 'outline' },
  ACTIVE: { label: 'Aktiv', variant: 'default' },
  LACTATE_ENTRY: { label: 'Laktat', variant: 'secondary' },
  ENDED: { label: 'Avslutad', variant: 'destructive' },
}

export function IntervalSessionList({ businessSlug }: IntervalSessionListProps) {
  const router = useRouter()
  const [sessions, setSessions] = useState<IntervalSessionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [includeEnded, setIncludeEnded] = useState(false)

  const fetchSessions = async () => {
    try {
      const res = await fetch(
        `/api/coach/interval-sessions?includeEnded=${includeEnded}`
      )
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
      }
    } catch {
      toast.error('Kunde inte hamta sessioner')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [includeEnded])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Ta bort session?')) return

    try {
      const res = await fetch(`/api/coach/interval-sessions/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        toast.success('Session borttagen')
      }
    } catch {
      toast.error('Kunde inte ta bort session')
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
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
        <Label htmlFor="show-ended" className="text-sm text-muted-foreground">
          Visa avslutade
        </Label>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Inga intervallsessioner annu. Skapa en ny for att borja.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => {
            const statusInfo = STATUS_LABELS[session.status] || STATUS_LABELS.SETUP
            return (
              <Card
                key={session.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  router.push(
                    `${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions/${session.id}`
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">
                        {session.name || 'Intervallsession'}
                      </h3>
                      {session.teamName && (
                        <p className="text-sm text-muted-foreground">
                          {session.teamName}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      Intervall {session.currentInterval}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {session.participantCount} atleter
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.startedAt).toLocaleDateString('sv-SE')}
                    </span>
                    {session.status === 'ENDED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive"
                        onClick={(e) => handleDelete(session.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
