'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateEventDialog } from './CreateEventDialog'
import { EditEventDialog } from './EditEventDialog'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_CONTENT_OWNER_LABELS,
  TEAM_EVENT_CONTENT_STATUS_LABELS,
  TEAM_EVENT_TYPE_COLORS,
  TEAM_EVENT_TYPE_LABELS,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
  isTeamEventType,
} from '@/lib/team-calendar/event-types'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Download,
  Trash2,
  Plus,
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
  contentStatus?: string
  contentOwner?: string | null
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
  linkedWorkoutName?: string | null
  createdBy: { name: string }
  intervalSession: { id: string; name: string; status: string } | null
}

function getTypeConfig(type: string) {
  if (isTeamEventType(type)) {
    return {
      label: TEAM_EVENT_TYPE_LABELS[type],
      color: TEAM_EVENT_TYPE_COLORS[type],
    }
  }
  return { label: 'Övrigt', color: 'bg-gray-500' }
}

function firstDescriptionLine(description: string | null): string | null {
  return description?.split('\n').map((line) => line.trim()).find(Boolean) ?? null
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
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

function getMonthDates(baseDate: Date): Date[] {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
  const dates: Date[] = []

  for (let day = 1; day <= end.getDate(); day++) {
    dates.push(new Date(start.getFullYear(), start.getMonth(), day))
  }

  return dates
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function planningColumnFor(type: string): 'ice' | 'physical' | 'team' | 'other' | 'annual' {
  if (type === 'PRACTICE' || type === 'ICE_PRACTICE') return 'ice'
  if (['STRENGTH', 'CARDIO', 'HYBRID', 'AGILITY', 'PREHAB', 'PLYOMETRICS', 'INTERVAL_SESSION'].includes(type)) {
    return 'physical'
  }
  if (type === 'GAME' || type === 'TEST') return 'team'
  if (type === 'ANNUAL_PLAN') return 'annual'
  return 'other'
}

function compactEventText(event: TeamEvent): string {
  const time = event.allDay ? '' : formatTime(event.startDate)
  const location = event.location ? ` ${event.location}` : ''
  return `${time}${time ? ' ' : ''}${event.title}${location}`
}

function eventNeedsContent(event: TeamEvent): boolean {
  if (!PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)) return false
  return event.contentStatus !== 'CONTENT_READY' || !event.linkedWorkoutId
}

function contentStatusLabel(status: string | undefined): string {
  if (status && status in TEAM_EVENT_CONTENT_STATUS_LABELS) {
    return TEAM_EVENT_CONTENT_STATUS_LABELS[status as TeamEventContentStatus]
  }
  return TEAM_EVENT_CONTENT_STATUS_LABELS.PLANNED
}

function contentOwnerLabel(owner: string | null | undefined): string {
  if (owner && owner in TEAM_EVENT_CONTENT_OWNER_LABELS) {
    return TEAM_EVENT_CONTENT_OWNER_LABELS[owner as TeamEventContentOwner]
  }
  return TEAM_EVENT_CONTENT_OWNER_LABELS.physical_trainer
}

function inputDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface TeamCalendarViewProps {
  teamId: string
  teamName: string
  businessSlug?: string
}

export function TeamCalendarView({ teamId, teamName: _teamName, businessSlug }: TeamCalendarViewProps) {
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekBase, setWeekBase] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<TeamEvent | null>(null)
  const [viewMode, setViewMode] = useState<'week' | 'planning'>('week')
  const contentQueue = events
    .filter(eventNeedsContent)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const weekDates = getWeekDates(weekBase)
  const monthDates = getMonthDates(weekBase)
  const rangeStart = viewMode === 'planning' ? monthDates[0] : weekDates[0]
  const rangeEnd = new Date(viewMode === 'planning' ? monthDates[monthDates.length - 1] : weekDates[6])
  rangeEnd.setHours(23, 59, 59, 999)

  // Stabilize the ISO strings outside the dep array — react-hooks v6
  // requires deps to be simple expressions (no method calls).
  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        from: rangeStartIso,
        to: rangeEndIso,
      })
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events?${params}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      }
    } catch {
      toast.error('Kunde inte hämta händelser')
    } finally {
      setLoading(false)
    }
  }, [teamId, businessSlug, rangeStartIso, rangeEndIso])

  useEffect(() => {
    void fetchEvents()
  }, [fetchEvents])

  const navigateWeek = (direction: number) => {
    const next = new Date(weekBase)
    if (viewMode === 'planning') {
      next.setMonth(next.getMonth() + direction)
    } else {
      next.setDate(next.getDate() + direction * 7)
    }
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
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events/${eventId}${params.size ? `?${params}` : ''}`, {
        method: 'DELETE',
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId))
        toast.success('Händelse borttagen')
      }
    } catch {
      toast.error('Kunde inte ta bort händelse')
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (businessSlug) params.set('businessSlug', businessSlug)
    window.open(`/api/coach/teams/${teamId}/events/export${params.size ? `?${params}` : ''}`, '_blank')
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
            {viewMode === 'planning'
              ? weekBase.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })
              : `${weekDates[0].toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - ${weekDates[6].toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-background p-0.5">
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3"
              onClick={() => {
                setViewMode('week')
                setLoading(true)
              }}
            >
              Vecka
            </Button>
            <Button
              variant={viewMode === 'planning' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-3"
              onClick={() => {
                setViewMode('planning')
                setLoading(true)
              }}
            >
              Planering
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportera .ics
          </Button>
          <CreateEventDialog teamId={teamId} businessSlug={businessSlug} onCreated={fetchEvents} />
        </div>
      </div>

      {contentQueue.length > 0 && (
        <div className="rounded-lg border bg-amber-50/70 p-3 text-amber-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Fys-pass som behöver innehåll</div>
              <div className="text-xs text-amber-900/80">
                {contentQueue.length} planerade pass saknar kopplat workout-innehåll.
              </div>
            </div>
            <div className="flex max-w-full flex-wrap gap-2">
              {contentQueue.slice(0, 6).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="rounded-md border border-amber-300 bg-white/70 px-2.5 py-1.5 text-left text-xs shadow-sm hover:bg-white"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-amber-900/75">
                    {new Date(event.startDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} · {contentOwnerLabel(event.contentOwner)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendar view */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : viewMode === 'planning' ? (
        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/70 text-left">
                <th className="w-16 border-r px-2 py-2 font-semibold">v.</th>
                <th className="w-16 border-r px-2 py-2 font-semibold">Dag</th>
                <th className="w-28 border-r px-2 py-2 font-semibold">Datum</th>
                <th className="border-r px-2 py-2 font-semibold">Is</th>
                <th className="border-r px-2 py-2 font-semibold">Fys</th>
                <th className="border-r px-2 py-2 font-semibold">Match / lag</th>
                <th className="border-r px-2 py-2 font-semibold">Övrigt</th>
                <th className="px-2 py-2 font-semibold bg-amber-100 text-amber-950">Årshjul</th>
              </tr>
            </thead>
            <tbody>
              {monthDates.map((date) => {
                const dayEvents = events.filter((e) => isSameDay(new Date(e.startDate), date))
                const grouped = {
                  ice: dayEvents.filter((event) => planningColumnFor(event.type) === 'ice'),
                  physical: dayEvents.filter((event) => planningColumnFor(event.type) === 'physical'),
                  team: dayEvents.filter((event) => planningColumnFor(event.type) === 'team'),
                  other: dayEvents.filter((event) => planningColumnFor(event.type) === 'other'),
                  annual: dayEvents.filter((event) => planningColumnFor(event.type) === 'annual'),
                }
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const dayName = date.toLocaleDateString('sv-SE', { weekday: 'short' }).toUpperCase()
                const weekNumber = Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7)

                const renderCell = (cellEvents: TeamEvent[], defaultType: TeamEventType) => (
                  <div className="space-y-1">
                    {cellEvents.length === 0 ? (
                      <CreateEventDialog
                        teamId={teamId}
                        businessSlug={businessSlug}
                        onCreated={fetchEvents}
                        defaultDate={inputDateValue(date)}
                        defaultType={defaultType}
                        trigger={
                          <button
                            type="button"
                            className="flex w-full items-center gap-1 rounded-sm px-1.5 py-1 text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                            Lägg till
                          </button>
                        }
                      />
                    ) : (
                      <>
                        {cellEvents.map((event) => {
                          const typeConf = getTypeConfig(event.type)
                          return (
                            <button
                              key={event.id}
                              type="button"
                              className="block w-full rounded-sm px-1.5 py-1 text-left hover:bg-muted"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${typeConf.color}`} />
                              <span className="font-medium">{compactEventText(event)}</span>
                              {eventNeedsContent(event) && (
                                <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">
                                  {contentStatusLabel(event.contentStatus)}
                                </span>
                              )}
                            </button>
                          )
                        })}
                        <CreateEventDialog
                          teamId={teamId}
                          businessSlug={businessSlug}
                          onCreated={fetchEvents}
                          defaultDate={inputDateValue(date)}
                          defaultType={defaultType}
                          trigger={
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 rounded-sm px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                              Lägg till
                            </button>
                          }
                        />
                      </>
                    )}
                  </div>
                )

                return (
                  <tr key={date.toISOString()} className={isWeekend ? 'bg-muted/40' : ''}>
                    <td className="border-r border-t px-2 py-2 text-muted-foreground">{date.getDay() === 1 ? `v.${weekNumber}` : ''}</td>
                    <td className={`border-r border-t px-2 py-2 font-semibold ${date.getDay() === 0 ? 'text-red-600' : ''}`}>{dayName}</td>
                    <td className="border-r border-t px-2 py-2">{date.getDate()}</td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.ice, 'PRACTICE')}</td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.physical, 'STRENGTH')}</td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.team, 'GAME')}</td>
                    <td className="border-r border-t px-2 py-2 align-top">{renderCell(grouped.other, 'OTHER')}</td>
                    <td className="border-t bg-amber-50 px-2 py-2 align-top">{renderCell(grouped.annual, 'ANNUAL_PLAN')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
                        const typeConf = getTypeConfig(event.type)
                        const descriptionLine = firstDescriptionLine(event.description)
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-2 p-2 rounded-md bg-card border text-sm group cursor-pointer hover:border-primary/40 hover:bg-muted/30"
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedEvent(event)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedEvent(event)
                              }
                            }}
                          >
                            <div className={`w-1 self-stretch rounded-full shrink-0 ${typeConf.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{event.title}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {typeConf.label}
                                </Badge>
                                {eventNeedsContent(event) && (
                                  <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-[10px] text-amber-800">
                                    {contentStatusLabel(event.contentStatus)}
                                  </Badge>
                                )}
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
                              {descriptionLine && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  {descriptionLine}
                                </div>
                              )}
                              {event.linkedWorkoutName && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  Kopplat pass: {event.linkedWorkoutName}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleDelete(event.id)
                              }}
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

      <EditEventDialog
        event={selectedEvent}
        teamId={teamId}
        businessSlug={businessSlug}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
        onUpdated={fetchEvents}
      />
    </div>
  )
}
