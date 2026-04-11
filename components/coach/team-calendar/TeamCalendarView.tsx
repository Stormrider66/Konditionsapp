'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateEventDialog } from './CreateEventDialog'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Download,
  Trash2,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'

interface TeamEvent {
  id: string
  title: string
  description: string | null
  type: string
  location: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  createdBy: { name: string }
  intervalSession: { id: string; name: string; status: string } | null
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  PRACTICE: { label: 'Träning', color: 'bg-blue-500' },
  GAME: { label: 'Match', color: 'bg-red-500' },
  TEST: { label: 'Test', color: 'bg-purple-500' },
  INTERVAL_SESSION: { label: 'Intervall', color: 'bg-orange-500' },
  OFF_DAY: { label: 'Vilodag', color: 'bg-green-500' },
  MEETING: { label: 'Möte', color: 'bg-yellow-500' },
  OTHER: { label: 'Övrigt', color: 'bg-gray-500' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)

  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface TeamCalendarViewProps {
  teamId: string
  teamName: string
  businessSlug?: string
}

export function TeamCalendarView({ teamId, teamName, businessSlug }: TeamCalendarViewProps) {
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekBase, setWeekBase] = useState(new Date())

  const weekDates = getWeekDates(weekBase)
  const weekStart = weekDates[0]
  const weekEnd = new Date(weekDates[6])
  weekEnd.setHours(23, 59, 59, 999)

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      })
      const res = await fetch(`/api/coach/teams/${teamId}/events?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch {
      toast.error('Kunde inte hämta händelser')
    } finally {
      setLoading(false)
    }
  }, [teamId, weekStart.toISOString(), weekEnd.toISOString()])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const navigateWeek = (direction: number) => {
    const next = new Date(weekBase)
    next.setDate(next.getDate() + direction * 7)
    setWeekBase(next)
    setLoading(true)
  }

  const goToday = () => {
    setWeekBase(new Date())
    setLoading(true)
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Ta bort händelse?')) return
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/events/${eventId}`, { method: 'DELETE' })
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId))
        toast.success('Händelse borttagen')
      }
    } catch {
      toast.error('Kunde inte ta bort händelse')
    }
  }

  const handleExport = () => {
    window.open(`/api/coach/teams/${teamId}/events/export`, '_blank')
  }

  const today = new Date()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)} aria-label="Föregående vecka">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Idag
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(1)} aria-label="Nästa vecka">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            {weekDates[0].toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportera .ics
          </Button>
          <CreateEventDialog teamId={teamId} onCreated={fetchEvents} />
        </div>
      </div>

      {/* Week view */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {weekDates.map((date) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.startDate), date))
            const isToday = isSameDay(date, today)
            const isPast = date < today && !isToday
            const dayName = date.toLocaleDateString('sv-SE', { weekday: 'short' })
            const dayNum = date.getDate()

            return (
              <div
                key={date.toISOString()}
                className={`flex gap-3 p-2 rounded-lg transition-colors ${
                  isToday
                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                    : isPast
                      ? 'opacity-60'
                      : 'hover:bg-muted/50'
                }`}
              >
                {/* Day label */}
                <div className="w-12 shrink-0 text-center pt-1">
                  <div className="text-[10px] uppercase font-medium text-muted-foreground">{dayName}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {dayNum}
                  </div>
                </div>

                {/* Events */}
                <div className="flex-1 min-h-[40px]">
                  {dayEvents.length === 0 ? (
                    <div className="text-xs text-muted-foreground pt-2">—</div>
                  ) : (
                    <div className="space-y-1">
                      {dayEvents.map((event) => {
                        const typeConf = TYPE_CONFIG[event.type] || TYPE_CONFIG.OTHER
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-2 p-2 rounded-md bg-card border text-sm group"
                          >
                            <div className={`w-1 self-stretch rounded-full shrink-0 ${typeConf.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{event.title}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {typeConf.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {!event.allDay && (
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(event.startDate)}
                                    {event.endDate && ` - ${formatTime(event.endDate)}`}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                              onClick={() => handleDelete(event.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
