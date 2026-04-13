'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  User as UserIcon,
  Layers,
  AlertTriangle,
  Plus,
  Eye,
  EyeOff,
  Clock,
  MapPin,
  Trophy,
  Mountain,
  Plane,
  Thermometer,
  Timer,
  CalendarDays,
  Filter,
  ArrowLeft,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from 'date-fns'
import { sv } from 'date-fns/locale'

interface CrossOrgEvent {
  id: string
  type: 'CALENDAR_EVENT' | 'TEAM_EVENT' | 'WORKOUT' | 'INTERVAL_SESSION'
  title: string
  description?: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
  businessId: string
  businessName: string
  businessSlug: string
  businessColor: string
  visibility: 'FULL_DETAILS' | 'BUSY_ONLY'
  metadata: Record<string, unknown>
}

interface Conflict {
  eventA: string
  eventB: string
}

interface BusinessInfo {
  businessId: string
  name: string
  slug: string
  primaryColor: string
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Ägare',
  ADMIN: 'Sportchef',
  COACH: 'Huvudtränare',
  PHYSICAL_TRAINER: 'Fystränare',
  ASSISTANT_COACH: 'Ass. tränare',
  PHYSIO: 'Fysioterapeut',
  MEMBER: 'Medlem',
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  RACE_A: Trophy,
  RACE_B: Trophy,
  RACE_C: Trophy,
  COMPETITION: Trophy,
  ALTITUDE_CAMP: Mountain,
  TRAINING_CAMP: Mountain,
  TRAVEL: Plane,
  ILLNESS: Thermometer,
  TEAM_EVENT: Users,
  INTERVAL_SESSION: Timer,
}

type ViewMode = 'week' | 'month'

export function UnifiedCalendarClient({ userEmail }: { userEmail: string }) {
  const [events, setEvents] = useState<CrossOrgEvent[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([])
  const [hiddenBusinessIds, setHiddenBusinessIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'PERSONAL' | 'ALL_TEAMS' | 'PLANNING'>('PERSONAL')
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CrossOrgEvent | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Compute date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { locale: sv }),
        end: endOfWeek(currentDate, { locale: sv }),
      }
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    }
  }, [currentDate, viewMode])

  const days = useMemo(() => eachDayOfInterval(dateRange), [dateRange])

  // Fetch businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await fetch('/api/user/businesses')
        if (res.ok) {
          const data = await res.json()
          setBusinesses(data.businesses || [])
        }
      } catch (err) {
        console.error('[UnifiedCalendar] Failed to fetch businesses:', err)
      }
    }
    fetchBusinesses()
  }, [])

  // Fetch user preferences
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await fetch('/api/user/calendar-preferences')
        if (res.ok) {
          const data = await res.json()
          const prefs = data.preferences
          if (prefs?.defaultMode) setCalendarMode(prefs.defaultMode)
          if (prefs?.hiddenBusinessIds) {
            setHiddenBusinessIds(new Set(prefs.hiddenBusinessIds))
          }
        }
      } catch (err) {
        console.error('[UnifiedCalendar] Failed to fetch preferences:', err)
      }
    }
    fetchPrefs()
  }, [])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        mode: calendarMode,
      })
      const res = await fetch(`/api/calendar/cross-org?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
        setConflicts(data.conflicts || [])
      }
    } catch (err) {
      console.error('[UnifiedCalendar] Failed to fetch events:', err)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, calendarMode])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Get conflict IDs for quick lookup
  const conflictEventIds = useMemo(() => {
    const ids = new Set<string>()
    for (const c of conflicts) {
      ids.add(c.eventA)
      ids.add(c.eventB)
    }
    return ids
  }, [conflicts])

  // Filter events by hidden businesses
  const visibleEvents = useMemo(
    () => events.filter((e) => !hiddenBusinessIds.has(e.businessId)),
    [events, hiddenBusinessIds]
  )

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CrossOrgEvent[]>()
    for (const ev of visibleEvents) {
      const dayKey = format(parseISO(ev.startDate), 'yyyy-MM-dd')
      if (!map.has(dayKey)) map.set(dayKey, [])
      map.get(dayKey)!.push(ev)
    }
    return map
  }, [visibleEvents])

  // Toggle business visibility
  const toggleBusiness = (bizId: string) => {
    setHiddenBusinessIds((prev) => {
      const next = new Set(prev)
      if (next.has(bizId)) next.delete(bizId)
      else next.add(bizId)
      // Persist preference
      fetch('/api/user/calendar-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenBusinessIds: Array.from(next) }),
      }).catch(() => {})
      return next
    })
  }

  // Save mode preference
  const handleModeChange = (mode: string) => {
    const newMode = mode as 'PERSONAL' | 'ALL_TEAMS' | 'PLANNING'
    setCalendarMode(newMode)
    fetch('/api/user/calendar-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultMode: newMode }),
    }).catch(() => {})
  }

  // Navigation
  const goNext = () => {
    setCurrentDate((d) => (viewMode === 'week' ? addWeeks(d, 1) : addMonths(d, 1)))
  }
  const goPrev = () => {
    setCurrentDate((d) => (viewMode === 'week' ? subWeeks(d, 1) : subMonths(d, 1)))
  }
  const goToday = () => setCurrentDate(new Date())

  const getEventIcon = (ev: CrossOrgEvent) => {
    const metaType = ev.metadata?.eventType as string | undefined
    const Icon = EVENT_ICONS[metaType || ''] || EVENT_ICONS[ev.type] || CalendarDays
    return Icon
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold">Samlad Kalender</h1>
                <p className="text-sm text-slate-400">
                  {businesses.length} organisationer
                  {conflicts.length > 0 && (
                    <span className="text-amber-400 ml-2">
                      — {conflicts.length} konflikter
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <Filter className="w-4 h-4 mr-1" />
                Filter
              </Button>
              <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                  )}
                >
                  Vecka
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                  )}
                >
                  Månad
                </button>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <Tabs value={calendarMode} onValueChange={handleModeChange} className="mt-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="PERSONAL" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mitt Schema</span>
                <span className="sm:hidden">Mitt</span>
              </TabsTrigger>
              <TabsTrigger value="ALL_TEAMS" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Alla Lag</span>
                <span className="sm:hidden">Lag</span>
              </TabsTrigger>
              <TabsTrigger value="PLANNING" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Planering</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — org filter & conflict alerts */}
          {showFilters && (
            <aside className="w-full lg:w-64 shrink-0 space-y-4">
              {/* Org Filter */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Organisationer</h3>
                <div className="space-y-2">
                  {businesses.map((biz) => {
                    const isHidden = hiddenBusinessIds.has(biz.businessId)
                    const eventCount = events.filter((e) => e.businessId === biz.businessId).length
                    return (
                      <button
                        key={biz.businessId}
                        onClick={() => toggleBusiness(biz.businessId)}
                        className={cn(
                          'flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-left',
                          isHidden ? 'opacity-40 hover:opacity-60' : 'hover:bg-white/5'
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: isHidden ? '#475569' : biz.primaryColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{biz.name}</div>
                          <div className="text-xs text-slate-500">
                            {ROLE_LABELS[biz.role] || biz.role} — {eventCount} händelser
                          </div>
                        </div>
                        {isHidden ? (
                          <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Conflict Alerts */}
              {conflicts.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Konflikter ({conflicts.length})
                  </h3>
                  <div className="space-y-2">
                    {conflicts.slice(0, 5).map((c, i) => {
                      const evA = events.find((e) => e.id === c.eventA)
                      const evB = events.find((e) => e.id === c.eventB)
                      if (!evA || !evB) return null
                      return (
                        <div key={i} className="text-xs text-slate-300 p-2 rounded bg-white/5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: evA.businessColor }} />
                            <span className="truncate">{evA.title}</span>
                          </div>
                          <div className="text-slate-500 text-center my-0.5">krockar med</div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: evB.businessColor }} />
                            <span className="truncate">{evB.title}</span>
                          </div>
                        </div>
                      )
                    })}
                    {conflicts.length > 5 && (
                      <p className="text-xs text-slate-500">+{conflicts.length - 5} fler konflikter</p>
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* Main calendar area */}
          <div className="flex-1 min-w-0">
            {/* Date navigation */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goPrev}
                  className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToday}
                  className="text-slate-400 hover:text-white hover:bg-white/10 text-xs"
                >
                  Idag
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goNext}
                  className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold capitalize">
                {viewMode === 'week'
                  ? `${format(dateRange.start, 'd MMM', { locale: sv })} — ${format(dateRange.end, 'd MMM yyyy', { locale: sv })}`
                  : format(currentDate, 'MMMM yyyy', { locale: sv })}
              </h2>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            )}

            {/* Calendar grid */}
            {!isLoading && (
              <>
                {/* Week view */}
                {viewMode === 'week' && (
                  <div className="space-y-1">
                    {days.map((day) => {
                      const dayKey = format(day, 'yyyy-MM-dd')
                      const dayEvents = eventsByDay.get(dayKey) || []
                      const today = isToday(day)

                      return (
                        <div
                          key={dayKey}
                          className={cn(
                            'rounded-xl border p-4 transition-colors',
                            today
                              ? 'border-blue-500/30 bg-blue-500/5'
                              : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-sm font-semibold capitalize',
                                  today ? 'text-blue-400' : 'text-slate-300'
                                )}
                              >
                                {format(day, 'EEEE d MMMM', { locale: sv })}
                              </span>
                              {today && (
                                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                                  Idag
                                </Badge>
                              )}
                            </div>
                            {calendarMode === 'PLANNING' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-500 hover:text-white h-7 text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Ny
                              </Button>
                            )}
                          </div>
                          {dayEvents.length === 0 ? (
                            <p className="text-xs text-slate-600 italic">Inga händelser</p>
                          ) : (
                            <div className="space-y-1.5">
                              {dayEvents.map((ev) => {
                                const hasConflict = conflictEventIds.has(ev.id)
                                const EventIcon = getEventIcon(ev)
                                return (
                                  <button
                                    key={ev.id}
                                    onClick={() => setSelectedEvent(ev)}
                                    className={cn(
                                      'flex items-center gap-3 w-full p-2.5 rounded-lg transition-all text-left group',
                                      'hover:bg-white/5',
                                      hasConflict && 'ring-1 ring-amber-500/50 bg-amber-500/5'
                                    )}
                                  >
                                    <div
                                      className="w-1 h-8 rounded-full shrink-0"
                                      style={{ backgroundColor: ev.businessColor }}
                                    />
                                    <EventIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">{ev.title}</span>
                                        {hasConflict && (
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>{ev.businessName}</span>
                                        {!ev.allDay && ev.startDate && (
                                          <>
                                            <span>·</span>
                                            <Clock className="w-3 h-3" />
                                            <span>{format(parseISO(ev.startDate), 'HH:mm')}</span>
                                            {ev.endDate && (
                                              <span>— {format(parseISO(ev.endDate), 'HH:mm')}</span>
                                            )}
                                          </>
                                        )}
                                        {ev.metadata?.teamName ? (
                                          <>
                                            <span>·</span>
                                            <span>{String(ev.metadata.teamName)}</span>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] shrink-0 border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ color: ev.businessColor, borderColor: ev.businessColor + '40' }}
                                    >
                                      {ev.type === 'TEAM_EVENT' ? 'Lag' : ev.type === 'INTERVAL_SESSION' ? 'Intervall' : 'Händelse'}
                                    </Badge>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Month view */}
                {viewMode === 'month' && (
                  <div>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((d) => (
                        <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {days.map((day) => {
                        const dayKey = format(day, 'yyyy-MM-dd')
                        const dayEvents = eventsByDay.get(dayKey) || []
                        const today = isToday(day)
                        const inMonth = isSameMonth(day, currentDate)

                        return (
                          <div
                            key={dayKey}
                            className={cn(
                              'min-h-[80px] sm:min-h-[100px] rounded-lg border p-1.5 transition-colors',
                              today
                                ? 'border-blue-500/30 bg-blue-500/5'
                                : inMonth
                                  ? 'border-white/5 bg-white/[0.02]'
                                  : 'border-transparent bg-transparent opacity-40'
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  today ? 'text-blue-400' : inMonth ? 'text-slate-400' : 'text-slate-600'
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 3).map((ev) => {
                                const hasConflict = conflictEventIds.has(ev.id)
                                return (
                                  <button
                                    key={ev.id}
                                    onClick={() => setSelectedEvent(ev)}
                                    className={cn(
                                      'w-full text-left px-1.5 py-0.5 rounded text-[10px] sm:text-xs truncate transition-colors hover:opacity-80',
                                      hasConflict && 'ring-1 ring-amber-500/50'
                                    )}
                                    style={{
                                      backgroundColor: ev.businessColor + '20',
                                      color: ev.businessColor,
                                    }}
                                    title={`${ev.title} — ${ev.businessName}`}
                                  >
                                    {ev.title}
                                  </button>
                                )
                              })}
                              {dayEvents.length > 3 && (
                                <p className="text-[10px] text-slate-500 px-1">+{dayEvents.length - 3} fler</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!isLoading && visibleEvents.length === 0 && (
                  <div className="text-center py-20">
                    <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-400">Inga händelser</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {hiddenBusinessIds.size > 0
                        ? 'Prova att visa fler organisationer i filtret.'
                        : 'Det finns inga händelser för den valda perioden.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedEvent.businessColor }}
                  />
                  <span className="text-xs text-slate-500">{selectedEvent.businessName}</span>
                  {conflictEventIds.has(selectedEvent.id) && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Konflikt
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg">
                  {selectedEvent.visibility === 'BUSY_ONLY' ? 'Upptagen' : selectedEvent.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {/* Date/time */}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {selectedEvent.allDay
                      ? format(parseISO(selectedEvent.startDate), 'd MMMM yyyy', { locale: sv })
                      : `${format(parseISO(selectedEvent.startDate), 'd MMM HH:mm', { locale: sv })}${
                          selectedEvent.endDate
                            ? ` — ${format(parseISO(selectedEvent.endDate), 'HH:mm')}`
                            : ''
                        }`}
                  </span>
                </div>

                {/* Location */}
                {selectedEvent.metadata?.location ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>{String(selectedEvent.metadata.location)}</span>
                  </div>
                ) : null}

                {/* Team / Athlete */}
                {selectedEvent.metadata?.teamName ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>{String(selectedEvent.metadata.teamName)}</span>
                  </div>
                ) : null}
                {selectedEvent.metadata?.athleteName ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <UserIcon className="w-4 h-4" />
                    <span>{String(selectedEvent.metadata.athleteName)}</span>
                  </div>
                ) : null}

                {/* Description */}
                {selectedEvent.description && selectedEvent.visibility === 'FULL_DETAILS' && (
                  <p className="text-sm text-slate-400 border-t border-white/10 pt-3">
                    {selectedEvent.description}
                  </p>
                )}

                {/* Busy only notice */}
                {selectedEvent.visibility === 'BUSY_ONLY' && (
                  <div className="text-sm text-slate-500 italic border-t border-white/10 pt-3">
                    Den här organisationen delar bara tillgänglighet, inte detaljer.
                  </div>
                )}

                {/* Link to business calendar */}
                {selectedEvent.visibility === 'FULL_DETAILS' && (
                  <div className="border-t border-white/10 pt-3">
                    <Link
                      href={`/${selectedEvent.businessSlug}/coach/calendar`}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Öppna i {selectedEvent.businessName}s kalender →
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
