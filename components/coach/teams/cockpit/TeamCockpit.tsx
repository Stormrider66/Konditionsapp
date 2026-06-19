'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, TabletSmartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TeamActionInbox, type TeamActionSignals } from './TeamActionInbox'
import { TeamSchedulePane, type ScheduleEvent, type Locale } from './TeamSchedulePane'
import { TeamRosterRail, type RailMember, type DayCoverage } from './TeamRosterRail'
import { TeamSelectedPlayerPanel } from './TeamSelectedPlayerPanel'
import { TeamSelectedSessionPanel } from './TeamSelectedSessionPanel'
import { TeamWorkoutAssignmentDialog } from '@/components/coach/team/TeamWorkoutAssignmentDialog'
import { TeamDayPrintButton } from '@/components/coach/teams/TeamDayPrintButton'

const ACTIVE_ASSIGNMENT_STATUSES = new Set(['PENDING', 'SCHEDULED', 'MODIFIED'])

interface TeamCockpitProps {
  teamId: string
  teamName: string
  businessSlug: string
  locale: Locale
  members: RailMember[]
  actionSignals: TeamActionSignals
}

type Selection =
  | { kind: 'session'; id: string }
  | { kind: 'player'; id: string }
  | null

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

/**
 * Client shell for the Idag cockpit. Owns the day's event fetch plus the
 * cross-pane interaction state (selected session/player, position filter) so
 * the schedule pane and roster rail stay in sync: click a session to spotlight
 * its players, click a player to spotlight their sessions, filter both panes by
 * position at once.
 */
export function TeamCockpit({ teamId, teamName, businessSlug, locale, members, actionSignals }: TeamCockpitProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewedDate, setViewedDate] = useState<Date>(() => startOfDay(new Date()))
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selection, setSelection] = useState<Selection>(null)
  const [positionFilter, setPositionFilter] = useState<string | null>(null)
  const [selectedPlayerUpcomingEvents, setSelectedPlayerUpcomingEvents] = useState<ScheduleEvent[]>([])
  const [selectedPlayerUpcomingLoading, setSelectedPlayerUpcomingLoading] = useState(false)
  const [missedFollowUps, setMissedFollowUps] = useState<number | null>(null)
  // Assignment dialog: null = closed; {athleteId} preselects one player.
  const [assignTarget, setAssignTarget] = useState<{ athleteId?: string } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const dayStartIso = useMemo(() => startOfDay(viewedDate).toISOString(), [viewedDate])

  useEffect(() => {
    const controller = new AbortController()
    const dayStart = new Date(dayStartIso)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const params = new URLSearchParams({
      from: dayStart.toISOString(),
      to: dayEnd.toISOString(),
      businessSlug,
    })

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/coach/teams/${teamId}/events?${params}`, {
          headers: { 'x-business-slug': businessSlug },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        setEvents(Array.isArray(data.events) ? data.events : [])
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(true)
        setEvents([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [teamId, businessSlug, dayStartIso, refreshKey])

  useEffect(() => {
    const controller = new AbortController()

    async function loadMissedFollowUps() {
      try {
        const params = new URLSearchParams({
          businessSlug,
          days: '7',
        })
        const res = await fetch(`/api/teams/${teamId}/workout-monitor?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        setMissedFollowUps(typeof data?.data?.totals?.missed === 'number' ? data.data.totals.missed : 0)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setMissedFollowUps(null)
      }
    }

    void loadMissedFollowUps()
    return () => controller.abort()
  }, [teamId, businessSlug, refreshKey])

  useEffect(() => {
    if (selection?.kind !== 'player') {
      return
    }

    const controller = new AbortController()
    const selectedPlayerId = selection.id
    const rangeStart = new Date(dayStartIso)
    rangeStart.setDate(rangeStart.getDate() + 1)
    const rangeEnd = new Date(dayStartIso)
    rangeEnd.setDate(rangeEnd.getDate() + 8)
    const params = new URLSearchParams({
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
      businessSlug,
    })

    async function loadUpcoming() {
      setSelectedPlayerUpcomingLoading(true)
      try {
        const res = await fetch(`/api/coach/teams/${teamId}/events?${params}`, {
          headers: { 'x-business-slug': businessSlug },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        const nextEvents = Array.isArray(data.events)
          ? (data.events as ScheduleEvent[]).filter((event) =>
              event.assignmentSummary?.athletes?.some((athlete) => athlete.athleteId === selectedPlayerId)
            )
          : []
        setSelectedPlayerUpcomingEvents(nextEvents)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setSelectedPlayerUpcomingEvents([])
      } finally {
        if (!controller.signal.aborted) setSelectedPlayerUpcomingLoading(false)
      }
    }

    void loadUpcoming()
    return () => controller.abort()
  }, [teamId, businessSlug, dayStartIso, selection, refreshKey])

  const goToDay = useCallback((next: Date) => {
    setViewedDate(startOfDay(next))
    setSelection(null) // a session/player selection doesn't carry across days
    setSelectedPlayerUpcomingEvents([])
    setSelectedPlayerUpcomingLoading(false)
  }, [])

  const stepDay = useCallback(
    (delta: number) => goToDay(new Date(viewedDate.getTime() + delta * DAY_MS)),
    [goToDay, viewedDate]
  )

  const onSelectSession = useCallback((eventId: string) => {
    setSelectedPlayerUpcomingEvents([])
    setSelectedPlayerUpcomingLoading(false)
    setSelection((current) =>
      current?.kind === 'session' && current.id === eventId ? null : { kind: 'session', id: eventId }
    )
  }, [])

  const onSelectPlayer = useCallback((memberId: string) => {
    setSelectedPlayerUpcomingEvents([])
    setSelectedPlayerUpcomingLoading(false)
    setSelection((current) =>
      current?.kind === 'player' && current.id === memberId ? null : { kind: 'player', id: memberId }
    )
  }, [])

  const memberPositionById = useMemo(() => {
    const map = new Map<string, string | null>()
    members.forEach((member) => map.set(member.id, member.position))
    return map
  }, [members])

  const positions = useMemo(() => {
    const set = new Set<string>()
    members.forEach((member) => {
      if (member.position) set.add(member.position)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'sv'))
  }, [members])

  // eventId → set of participating member ids (from the event's assignment summary).
  const participantsByEvent = useMemo(() => {
    const map = new Map<string, Set<string>>()
    events.forEach((event) => {
      const athletes = event.assignmentSummary?.athletes
      if (athletes && athletes.length > 0) {
        map.set(event.id, new Set(athletes.map((athlete) => athlete.athleteId)))
      }
    })
    return map
  }, [events])

  // Per-member session coverage for the viewed day, derived from that day's
  // events so the rail's "pass idag" column tracks the schedule's day-nav (the
  // status dot stays current-state — readiness/medical isn't day-specific).
  const coverageByMember = useMemo(() => {
    const map = new Map<string, DayCoverage>()
    events.forEach((event) => {
      event.assignmentSummary?.athletes?.forEach((athlete) => {
        const entry = map.get(athlete.athleteId) ?? { active: 0, completed: 0 }
        if (athlete.status === 'COMPLETED') entry.completed += 1
        else if (ACTIVE_ASSIGNMENT_STATUSES.has(athlete.status)) entry.active += 1
        map.set(athlete.athleteId, entry)
      })
    })
    return map
  }, [events])

  // memberId → set of event ids they participate in on the viewed day.
  const eventsByPlayer = useMemo(() => {
    const map = new Map<string, Set<string>>()
    participantsByEvent.forEach((memberIds, eventId) => {
      memberIds.forEach((memberId) => {
        const set = map.get(memberId) ?? new Set<string>()
        set.add(eventId)
        map.set(memberId, set)
      })
    })
    return map
  }, [participantsByEvent])

  const selectedSessionId = selection?.kind === 'session' ? selection.id : null
  const selectedPlayerId = selection?.kind === 'player' ? selection.id : null
  const selectedSessionEvent = selectedSessionId
    ? events.find((event) => event.id === selectedSessionId) ?? null
    : null
  const selectedMember = selectedPlayerId
    ? members.find((member) => member.id === selectedPlayerId) ?? null
    : null

  // Schedule pane: highlight the selected player's sessions; dim sessions that
  // fall outside the active player selection or the position filter.
  const highlightedEventIds = useMemo(
    () => (selectedPlayerId ? eventsByPlayer.get(selectedPlayerId) ?? new Set<string>() : new Set<string>()),
    [selectedPlayerId, eventsByPlayer]
  )

  const dimmedEventIds = useMemo(() => {
    const dimmed = new Set<string>()
    for (const event of events) {
      const outsidePlayer = selectedPlayerId != null && !highlightedEventIds.has(event.id)

      let outsidePosition = false
      if (positionFilter) {
        const participants = participantsByEvent.get(event.id)
        // Only dim when we know the participants and none plays the position;
        // sessions with unknown rosters stay visible.
        if (participants && participants.size > 0) {
          outsidePosition = ![...participants].some(
            (id) => memberPositionById.get(id) === positionFilter
          )
        }
      }

      if (outsidePlayer || outsidePosition) dimmed.add(event.id)
    }
    return dimmed
  }, [events, selectedPlayerId, highlightedEventIds, positionFilter, participantsByEvent, memberPositionById])

  // Rail: when a session is selected, highlight its participants and dim the rest.
  const sessionParticipantIds = selectedSessionId
    ? participantsByEvent.get(selectedSessionId) ?? new Set<string>()
    : null

  const selectedPlayerHasNoSession =
    selectedPlayerId != null && (eventsByPlayer.get(selectedPlayerId)?.size ?? 0) === 0

  const selectedPlayerDayEvents = selectedPlayerId
    ? events.filter((event) => eventsByPlayer.get(selectedPlayerId)?.has(event.id))
    : []

  const isToday = startOfDay(viewedDate).getTime() === today.getTime()

  return (
    <>
      <TeamActionInbox
        teamBasePath={`/${businessSlug}/coach/teams/${teamId}`}
        locale={locale}
        viewedDate={viewedDate}
        events={events}
        signals={actionSignals}
        missedFollowUps={missedFollowUps}
      />
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <TeamDayPrintButton
          teamId={teamId}
          teamName={teamName}
          coachBasePath={`/${businessSlug}/coach`}
        />
        <Button asChild type="button" variant="outline">
          <Link href={`/${businessSlug}/coach/teams/${teamId}/kiosk`}>
            <TabletSmartphone className="mr-1.5 h-4 w-4" />
            Focus mode
          </Link>
        </Button>
        <Button type="button" onClick={() => setAssignTarget({})}>
          <Plus className="mr-1.5 h-4 w-4" />
          {locale === 'sv' ? 'Tilldela pass' : 'Assign workout'}
        </Button>
      </div>
      <div className="mb-8 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <TeamSchedulePane
            teamId={teamId}
            businessSlug={businessSlug}
            locale={locale}
            events={events}
            loading={loading}
            error={error}
            viewedDate={viewedDate}
            isToday={isToday}
            onPrevDay={() => stepDay(-1)}
            onNextDay={() => stepDay(1)}
            onToday={() => goToDay(today)}
            selectedSessionId={selectedSessionId}
            highlightedEventIds={highlightedEventIds}
            dimmedEventIds={dimmedEventIds}
            onSelectSession={onSelectSession}
          />
          <TeamSelectedSessionPanel
            event={selectedSessionEvent}
            members={members}
            locale={locale}
            businessSlug={businessSlug}
            teamId={teamId}
            onClear={() => setSelection(null)}
          />
        </div>
        <div className="space-y-4">
          <TeamRosterRail
            members={members}
            rosterHref={`/${businessSlug}/coach/teams/${teamId}/trupp`}
            athleteCalendarHrefBase={`/${businessSlug}/coach/athletes`}
            coverageByMember={coverageByMember}
            positions={positions}
            positionFilter={positionFilter}
            onPositionFilterChange={setPositionFilter}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={onSelectPlayer}
            sessionParticipantIds={sessionParticipantIds}
            selectedPlayerHasNoSession={selectedPlayerHasNoSession}
            onQuickAssign={(memberId) => setAssignTarget({ athleteId: memberId })}
          />
          <TeamSelectedPlayerPanel
            member={selectedMember}
            locale={locale}
            viewedDate={viewedDate}
            dayEvents={selectedPlayerDayEvents}
            upcomingEvents={selectedPlayerUpcomingEvents}
            dayCoverage={selectedPlayerId ? coverageByMember.get(selectedPlayerId) : undefined}
            upcomingLoading={selectedPlayerUpcomingLoading}
            businessSlug={businessSlug}
            teamId={teamId}
            onAssign={(memberId) => setAssignTarget({ athleteId: memberId })}
            onClear={() => setSelection(null)}
          />
        </div>
      </div>

      <TeamWorkoutAssignmentDialog
        teamId={teamId}
        preselectAthleteId={assignTarget?.athleteId}
        open={assignTarget !== null}
        onOpenChange={(next) => {
          if (!next) setAssignTarget(null)
        }}
        onAssigned={() => {
          setAssignTarget(null)
          setRefreshKey((key) => key + 1) // refetch the day's events → coverage updates
        }}
      />
    </>
  )
}
