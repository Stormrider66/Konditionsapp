'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateEventDialog } from './CreateEventDialog'
import { EditEventDialog } from './EditEventDialog'
import {
  PHYSICAL_TEAM_EVENT_TYPES,
  TEAM_EVENT_CONTENT_OWNERS,
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
  CheckCircle2,
  ClipboardList,
  MapPin,
  Clock,
  Download,
  Trash2,
  Plus,
  Filter,
  Send,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { PracticeBlock } from '@/lib/team-calendar/practice-plan'

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
  practicePlan?: PracticeBlock[] | null
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
  linkedWorkoutName?: string | null
  assignedBroadcastId?: string | null
  assignedAt?: string | null
  assignmentSummary?: {
    totalAssigned: number
    totalCompleted: number
    completionRate: number
    athletes: Array<{
      assignmentId: string
      athleteId: string
      athleteName: string
      jerseyNumber: number | null
      position: string | null
      workoutType: string
      status: string
      completedAt: string | null
      rpe: number | null
      duration: number | null
      notes: string | null
    }>
  } | null
  createdBy: { name: string }
  intervalSession: { id: string; name: string; status: string } | null
}

interface TeamCalendarPermissions {
  role: string
  roleLabel: string
  canView: boolean
  creatableTypes: TeamEventType[]
  assignableContentTypes: TeamEventType[]
}

type PlanningFilter = 'all' | 'iceMissingPlan' | 'needsContent' | 'ready' | 'assigned' | 'ice' | 'physical'

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
  if (event.contentStatus === 'ASSIGNED' || event.assignedBroadcastId) return false
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

function assignmentProgressLabel(event: TeamEvent): string | null {
  if (!event.assignmentSummary) return null
  return `${event.assignmentSummary.totalCompleted}/${event.assignmentSummary.totalAssigned} klara`
}

function hasPracticePlan(event: TeamEvent): boolean {
  return Array.isArray(event.practicePlan) && event.practicePlan.length > 0
}

function isIcePracticeEvent(event: TeamEvent): boolean {
  return event.type === 'PRACTICE' || event.type === 'ICE_PRACTICE'
}

function isPhysicalEvent(event: TeamEvent): boolean {
  return PHYSICAL_TEAM_EVENT_TYPES.includes(event.type as TeamEventType)
}

function getPlanningBadges(event: TeamEvent): Array<{
  key: string
  label: string
  icon: LucideIcon
  className: string
}> {
  const badges: Array<{
    key: string
    label: string
    icon: LucideIcon
    className: string
  }> = []

  if (isIcePracticeEvent(event)) {
    if (hasPracticePlan(event)) {
      badges.push({
        key: 'practice-plan',
        label: 'Plan',
        icon: ClipboardList,
        className: 'border-blue-300 bg-blue-50 text-blue-800',
      })
    } else {
      badges.push({
        key: 'missing-practice-plan',
        label: 'Saknar plan',
        icon: TriangleAlert,
        className: 'border-amber-300 bg-amber-50 text-amber-800',
      })
    }
  }

  if (isPhysicalEvent(event)) {
    if (event.assignedBroadcastId) {
      badges.push({
        key: 'assigned',
        label: assignmentProgressLabel(event) ?? 'Tilldelat',
        icon: Send,
        className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
      })
    } else if (event.linkedWorkoutId && event.contentStatus === 'CONTENT_READY') {
      badges.push({
        key: 'ready',
        label: 'Klar',
        icon: CheckCircle2,
        className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
      })
    } else if (eventNeedsContent(event)) {
      badges.push({
        key: 'needs-content',
        label: contentStatusLabel(event.contentStatus),
        icon: TriangleAlert,
        className: 'border-amber-300 bg-amber-50 text-amber-800',
      })
    }
  }

  return badges
}

function PlanningBadges({ event, compact = false }: { event: TeamEvent; compact?: boolean }) {
  const badges = getPlanningBadges(event)
  if (badges.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'mt-1' : ''}`}>
      {badges.map((badge) => {
        const Icon = badge.icon
        return (
          <Badge
            key={badge.key}
            variant="outline"
            className={`shrink-0 gap-1 ${compact ? 'px-1 py-0 text-[10px]' : 'text-[10px]'} ${badge.className}`}
          >
            <Icon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            {badge.label}
          </Badge>
        )
      })}
    </div>
  )
}

function eventMatchesPlanningFilter(event: TeamEvent, filter: PlanningFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'iceMissingPlan') return isIcePracticeEvent(event) && !hasPracticePlan(event)
  if (filter === 'needsContent') return eventNeedsContent(event)
  if (filter === 'ready') return isPhysicalEvent(event) && Boolean(event.linkedWorkoutId) && event.contentStatus === 'CONTENT_READY' && !event.assignedBroadcastId
  if (filter === 'assigned') return Boolean(event.assignedBroadcastId)
  if (filter === 'ice') return isIcePracticeEvent(event)
  if (filter === 'physical') return isPhysicalEvent(event)
  return true
}

const PLANNING_FILTERS: Array<{ value: PlanningFilter; label: string }> = [
  { value: 'all', label: 'Alla' },
  { value: 'iceMissingPlan', label: 'Saknar isplan' },
  { value: 'needsContent', label: 'Behöver innehåll' },
  { value: 'ready', label: 'Klara fys' },
  { value: 'assigned', label: 'Tilldelade' },
  { value: 'ice', label: 'Is' },
  { value: 'physical', label: 'Fys' },
]

function inputDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const PHYSICAL_QUICK_TYPES: Array<{ type: TeamEventType; title: string; label: string }> = [
  { type: 'STRENGTH', title: 'Styrka', label: 'Styrka' },
  { type: 'CARDIO', title: 'Kondition', label: 'Kondition' },
  { type: 'PREHAB', title: 'Stabilitet / Prehab', label: 'Prehab' },
  { type: 'PLYOMETRICS', title: 'Plyometri', label: 'Plyo' },
  { type: 'HYBRID', title: 'Hybrid', label: 'Hybrid' },
  { type: 'AGILITY', title: 'Agility', label: 'Agility' },
]

const DEFAULT_CREATABLE_TYPES: TeamEventType[] = [
  ...PHYSICAL_QUICK_TYPES.map((item) => item.type),
  'PRACTICE',
  'GAME',
  'OTHER',
  'ANNUAL_PLAN',
]

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
  const [planningFilter, setPlanningFilter] = useState<PlanningFilter>('all')
  const [queueOwnerFilter, setQueueOwnerFilter] = useState<'all' | TeamEventContentOwner>('all')
  const [queueStatusFilter, setQueueStatusFilter] = useState<'open' | TeamEventContentStatus>('open')
  const [calendarPermissions, setCalendarPermissions] = useState<TeamCalendarPermissions | null>(null)
  const contentQueue = events
    .filter(eventNeedsContent)
    .filter((event) => queueOwnerFilter === 'all' || event.contentOwner === queueOwnerFilter)
    .filter((event) => queueStatusFilter === 'open' || event.contentStatus === queueStatusFilter)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const allOpenContentQueue = events.filter(eventNeedsContent)
  const visibleEvents = events.filter((event) => eventMatchesPlanningFilter(event, planningFilter))
  const planningFilterCounts = PLANNING_FILTERS.reduce<Record<PlanningFilter, number>>((acc, filter) => {
    acc[filter.value] = events.filter((event) => eventMatchesPlanningFilter(event, filter.value)).length
    return acc
  }, {
    all: 0,
    iceMissingPlan: 0,
    needsContent: 0,
    ready: 0,
    assigned: 0,
    ice: 0,
    physical: 0,
  })

  const weekDates = getWeekDates(weekBase)
  const monthDates = getMonthDates(weekBase)
  const rangeStart = viewMode === 'planning' ? monthDates[0] : weekDates[0]
  const rangeEnd = new Date(viewMode === 'planning' ? monthDates[monthDates.length - 1] : weekDates[6])
  rangeEnd.setHours(23, 59, 59, 999)

  // Stabilize the ISO strings outside the dep array — react-hooks v6
  // requires deps to be simple expressions (no method calls).
  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()
  const creatableTypes = calendarPermissions?.creatableTypes ?? DEFAULT_CREATABLE_TYPES
  const isPhysicalTrainerCalendar = calendarPermissions?.role === 'PHYSICAL_TRAINER'
  const canCreateType = (type: TeamEventType) => creatableTypes.includes(type)
  const canAssignContentType = (type: string) => calendarPermissions?.assignableContentTypes.includes(type as TeamEventType) ?? true

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
        setCalendarPermissions(data.calendarPermissions || null)
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
          {creatableTypes.length > 0 && (
            <CreateEventDialog
              teamId={teamId}
              businessSlug={businessSlug}
              onCreated={fetchEvents}
              allowedEventTypes={creatableTypes}
              defaultType={isPhysicalTrainerCalendar ? 'STRENGTH' : undefined}
              defaultTitle={isPhysicalTrainerCalendar ? 'Fys' : undefined}
              defaultContentStatus={isPhysicalTrainerCalendar ? 'NEEDS_CONTENT' : undefined}
              defaultContentOwner={isPhysicalTrainerCalendar ? 'physical_trainer' : undefined}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  {isPhysicalTrainerCalendar ? 'Nytt fyspass' : 'Ny händelse'}
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-background p-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Visa
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PLANNING_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                variant={planningFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPlanningFilter(filter.value)}
              >
                {filter.label}
                <span className="ml-1 text-[10px] opacity-70">{planningFilterCounts[filter.value]}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {allOpenContentQueue.length > 0 && (
        <div className="rounded-lg border bg-amber-50/70 p-3 text-amber-950">
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4" />
                Fys-pass som behöver innehåll
              </div>
              <div className="text-xs text-amber-900/80">
                {allOpenContentQueue.length} planerade pass saknar kopplat workout-innehåll.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={queueStatusFilter === 'open' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueStatusFilter('open')}
              >
                Alla öppna
              </Button>
              <Button
                type="button"
                variant={queueStatusFilter === 'PLANNED' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueStatusFilter('PLANNED')}
              >
                Planerad ram
              </Button>
              <Button
                type="button"
                variant={queueStatusFilter === 'NEEDS_CONTENT' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueStatusFilter('NEEDS_CONTENT')}
              >
                Behöver innehåll
              </Button>
              <Button
                type="button"
                variant={queueOwnerFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setQueueOwnerFilter('all')}
              >
                Alla roller
              </Button>
              {TEAM_EVENT_CONTENT_OWNERS.map((owner) => (
                <Button
                  key={owner}
                  type="button"
                  variant={queueOwnerFilter === owner ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setQueueOwnerFilter(owner)}
                >
                  {TEAM_EVENT_CONTENT_OWNER_LABELS[owner]}
                </Button>
              ))}
            </div>

            <div className="flex max-w-full flex-wrap gap-2">
              {contentQueue.length === 0 ? (
                <div className="text-xs text-amber-900/75">Inga pass matchar filtret.</div>
              ) : (
                contentQueue.slice(0, 8).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="rounded-md border border-amber-300 bg-white/70 px-2.5 py-1.5 text-left text-xs shadow-sm hover:bg-white"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-amber-900/75">
                      {new Date(event.startDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} · {contentOwnerLabel(event.contentOwner)} · {contentStatusLabel(event.contentStatus)}
                    </div>
                  </button>
                ))
              )}
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
                const dayEvents = visibleEvents.filter((e) => isSameDay(new Date(e.startDate), date))
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

                const renderQuickAdd = (defaultType: TeamEventType) => {
                  if (defaultType === 'STRENGTH') {
                    return (
                      <div className="flex flex-wrap gap-1">
                        {PHYSICAL_QUICK_TYPES.map((quickType) => (
                          canCreateType(quickType.type) ? (
                            <CreateEventDialog
                              key={quickType.type}
                              teamId={teamId}
                              businessSlug={businessSlug}
                              onCreated={fetchEvents}
                              defaultDate={inputDateValue(date)}
                              defaultType={quickType.type}
                              defaultTitle={quickType.title}
                              defaultContentStatus="NEEDS_CONTENT"
                              defaultContentOwner="physical_trainer"
                              allowedEventTypes={creatableTypes}
                              trigger={
                                <button
                                  type="button"
                                  className="rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  {quickType.label}
                                </button>
                              }
                            />
                          ) : null
                        ))}
                      </div>
                    )
                  }

                  if (!canCreateType(defaultType)) return null

                  return (
                    <CreateEventDialog
                      teamId={teamId}
                      businessSlug={businessSlug}
                      onCreated={fetchEvents}
                      defaultDate={inputDateValue(date)}
                      defaultType={defaultType}
                      allowedEventTypes={creatableTypes}
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
                  )
                }

                const renderCell = (cellEvents: TeamEvent[], defaultType: TeamEventType) => (
                  <div className="space-y-1">
                    {cellEvents.length === 0 ? (
                      renderQuickAdd(defaultType)
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
                              <PlanningBadges event={event} compact />
                            </button>
                          )
                        })}
                        {renderQuickAdd(defaultType)}
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
            const dayEvents = visibleEvents.filter((e) => isSameDay(new Date(e.startDate), date))
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
                                <PlanningBadges event={event} />
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
                            {canCreateType(event.type as TeamEventType) && (
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
                            )}
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
        canEdit={selectedEvent ? canCreateType(selectedEvent.type as TeamEventType) : false}
        canAssignContent={selectedEvent ? canAssignContentType(selectedEvent.type) : false}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
        onUpdated={fetchEvents}
      />
    </div>
  )
}
