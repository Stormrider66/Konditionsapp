'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Clock } from 'lucide-react'

interface TeamEvent {
  id: string
  teamName: string
  title: string
  type: string
  location: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PRACTICE: { label: 'Träning', color: 'bg-blue-500' },
  GAME: { label: 'Match', color: 'bg-red-500' },
  TEST: { label: 'Test', color: 'bg-purple-500' },
  INTERVAL_SESSION: { label: 'Intervall', color: 'bg-orange-500' },
  OFF_DAY: { label: 'Vilodag', color: 'bg-green-500' },
  MEETING: { label: 'Möte', color: 'bg-yellow-500' },
  OTHER: { label: 'Övrigt', color: 'bg-gray-500' },
}

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'Idag'
  if (d.toDateString() === tomorrow.toDateString()) return 'Imorgon'
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

export function UpcomingTeamEvents() {
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/athlete/team-calendar?days=14')
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  if (loading) return null
  if (events.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Kommande laghändelser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.slice(0, 5).map((event) => {
          const typeConf = TYPE_LABELS[event.type] || TYPE_LABELS.OTHER
          return (
            <div key={event.id} className="flex items-start gap-2 py-1.5">
              <div className={`w-1 self-stretch rounded-full shrink-0 ${typeConf.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{event.title}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{typeConf.label}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatEventDate(event.startDate)}</span>
                  {!event.allDay && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(event.startDate)}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
