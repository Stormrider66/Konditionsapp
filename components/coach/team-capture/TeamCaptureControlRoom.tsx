'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Bike,
  CheckCircle2,
  Circle,
  Flame,
  Gauge,
  HeartPulse,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Square,
  Timer,
  Waves,
  Watch,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { roleListItemClass, roleSurfaceClass, roleTableHeadClass } from '@/components/layouts/role-shell/RolePage'
import { labelFromEquipmentKey } from '@/lib/team-capture/equipment'
import { targetStatus } from '@/lib/cardio/focus-mode-segments'
import type { LiveHrZones } from '@/lib/cardio/athlete-hr-zones'
import { cn } from '@/lib/utils'

// Above/on/below-target text color, matching the athlete focus-mode cue
// (blue = under, green = on, red = over target).
const STATUS_TEXT = {
  below: 'text-sky-600 dark:text-sky-400',
  on: 'text-emerald-600 dark:text-emerald-400',
  above: 'text-rose-600 dark:text-rose-400',
} as const

// Map a live bpm onto the athlete's HR zone (1-5) using their resolved bands.
function zoneForBpm(bpm: number, zones: LiveHrZones['zones']): number | null {
  if (!zones.length) return null
  for (const z of zones) {
    if (bpm <= z.hrMax) return z.zone
  }
  return zones[zones.length - 1].zone
}

// Target pace label without the "/500" suffix (shown after the live value).
function formatTargetPace(seconds: number): string {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

type CaptureStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
type MachineType = 'BIKEERG' | 'ROWER' | 'SKIERG' | 'WATTBIKE' | 'ASSAULT_BIKE' | 'ECHO_BIKE' | 'AIR_BIKE' | 'RUN' | 'REST'
type ParticipantStatus = 'PLANNED' | 'WATCH_STARTED' | 'READY' | 'NEEDS_HELP'
const LIVE_READING_FRESH_SECONDS = 12

interface CaptureParticipant {
  id: string
  clientId: string
  displayName: string
  jerseyNumber: number | null
  position: string | null
  laneNumber: number
  heatNumber: number
  expectedStartOffsetSec: number
  status: ParticipantStatus | string
}

interface CaptureStation {
  id: string
  laneNumber: number
  stationIndex: number
  machineType: MachineType
  equipmentKey: string | null
  captureMethod: string
  label: string
  status: string
  lastSeenAt: string | Date | null
  deviceName: string | null
  readings?: CaptureReading[]
}

interface CaptureReading {
  id: string
  timestamp: string | Date
  offsetSec: number | null
  power: number | null
  cadence: number | null
  strokeRate: number | null
  paceSecPer500m: number | null
  distanceMeters: number | null
  calories: number | null
  heartRate: number | null
}

interface CaptureSegment {
  id: string
  participantId: string
  clientId: string
  stationId: string | null
  laneNumber: number
  heatNumber: number
  roundNumber: number
  stationIndex: number
  machineType: MachineType
  equipmentKey: string | null
  captureMethod: string
  label: string
  plannedStartSec: number
  plannedEndSec: number
  /** Target power for this segment, in watts (drives the live above/on/below cue). */
  targetPower: number | null
  /** Target HR zone (1-5) for this segment. */
  targetHrZone: number | null
  /** Target pace in sec/500m (rowing/ski) for this segment. */
  targetPace: number | null
  status: string
  summary: unknown
}

interface CaptureSession {
  id: string
  teamId: string
  name: string
  status: CaptureStatus
  masterStartedAt: string | Date | null
  completedAt: string | Date | null
  resolvedAt: string | Date | null
  participants: CaptureParticipant[]
  stations: CaptureStation[]
  segments: CaptureSegment[]
}

interface TeamCaptureControlRoomProps {
  businessSlug: string
  teamId: string
  locale: 'en' | 'sv'
  initialSession: CaptureSession
  /** Resolved HR zones per athlete (clientId → zones), for the live HR-zone cue. */
  hrZonesByClient?: Record<string, LiveHrZones | null>
}

function text(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatClock(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

export function TeamCaptureControlRoom({
  businessSlug,
  teamId,
  locale,
  initialSession,
  hrZonesByClient,
}: TeamCaptureControlRoomProps) {
  const [session, setSession] = useState(initialSession)
  const [busy, setBusy] = useState(false)
  const [attributionBusyId, setAttributionBusyId] = useState<string | null>(null)
  const [participantBusyId, setParticipantBusyId] = useState<string | null>(null)
  const [showLiveMetrics, setShowLiveMetrics] = useState(true)
  const [now, setNow] = useState(0)

  const baseHref = `/${businessSlug}/coach/teams/${teamId}/capture/${session.id}`
  const participantById = useMemo(
    () => new Map(session.participants.map((participant) => [participant.id, participant])),
    [session.participants]
  )
  const lanes = useMemo(
    () => Array.from(new Set(session.participants.map((participant) => participant.laneNumber))).sort((a, b) => a - b),
    [session.participants]
  )
  const reviewSegments = useMemo(
    () => session.segments
      .filter((segment) => segment.captureMethod === 'BLUETOOTH_STATION')
      .sort((a, b) =>
        a.heatNumber - b.heatNumber ||
        a.roundNumber - b.roundNumber ||
        a.laneNumber - b.laneNumber ||
        a.plannedStartSec - b.plannedStartSec
      ),
    [session.segments]
  )
  const missingSegments = reviewSegments.filter((segment) => segment.status === 'NO_DATA')
  const sortedParticipants = useMemo(
    () => [...session.participants].sort((a, b) =>
      a.heatNumber - b.heatNumber ||
      a.laneNumber - b.laneNumber ||
      (a.jerseyNumber ?? 9999) - (b.jerseyNumber ?? 9999) ||
      a.displayName.localeCompare(b.displayName)
    ),
    [session.participants]
  )
  const readinessCounts = useMemo(() => {
    return sortedParticipants.reduce(
      (counts, participant) => {
        if (participant.status === 'READY') counts.ready += 1
        else if (participant.status === 'WATCH_STARTED') counts.watchStarted += 1
        else if (participant.status === 'NEEDS_HELP') counts.needsHelp += 1
        else counts.planned += 1
        return counts
      },
      { ready: 0, watchStarted: 0, needsHelp: 0, planned: 0 }
    )
  }, [sortedParticipants])

  const elapsedSec = session.masterStartedAt && now > 0
    ? Math.max(0, Math.floor((now - new Date(session.masterStartedAt).getTime()) / 1000))
    : 0

  const liveStationRows = useMemo(
    () => session.stations.map((station) => {
      const currentSegment = session.segments.find((segment) =>
        segment.stationId === station.id &&
        segment.plannedStartSec <= elapsedSec &&
        segment.plannedEndSec >= elapsedSec
      )
      const participant = currentSegment ? participantById.get(currentSegment.participantId) : null
      const latestReading = station.readings?.[0] ?? null

      return {
        station,
        currentSegment,
        participant,
        latestReading,
      }
    }),
    [elapsedSec, participantById, session.segments, session.stations]
  )
  const liveReadingCount = liveStationRows.filter((row) => {
    const ageSec = secondsSince(row.latestReading?.timestamp, now)
    return ageSec !== undefined && ageSec <= LIVE_READING_FRESH_SECONDS
  }).length

  const refresh = async () => {
    const response = await fetch(`/api/coach/team-capture-sessions/${session.id}`, { credentials: 'same-origin' })
    const payload = await response.json()
    if (response.ok && payload.success) setSession(payload.data)
  }

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    const poll = setInterval(() => {
      void refresh().catch(() => {})
    }, 4000)
    return () => clearInterval(poll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  const updateStatus = async (status: CaptureStatus) => {
    setBusy(true)
    try {
      const response = await fetch(`/api/coach/team-capture-sessions/${session.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed')
      setSession(payload.data)
    } catch {
      toast.error(text(locale, 'Could not update session', 'Kunde inte uppdatera passet'))
    } finally {
      setBusy(false)
    }
  }

  const resolve = async () => {
    setBusy(true)
    try {
      const response = await fetch(`/api/coach/team-capture-sessions/${session.id}/resolve`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed')
      toast.success(text(locale, 'Team cardio resolved into athlete evaluations', 'Lagkonditionen har kopplats till spelarnas utvärderingar'))
      await refresh()
    } catch {
      toast.error(text(locale, 'Could not resolve team cardio', 'Kunde inte sammanställa lagkonditionen'))
    } finally {
      setBusy(false)
    }
  }

  const updateAttribution = async (segmentId: string, clientId: string) => {
    setAttributionBusyId(segmentId)
    try {
      const response = await fetch(`/api/coach/team-capture-sessions/${session.id}/attribution`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          segmentId,
          clientId,
          reason: 'Coach corrected station attribution',
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed')
      setSession(payload.data)
      toast.success(text(locale, 'Attribution updated. Resolve again to refresh evaluations.', 'Kopplingen är ändrad. Sammanställ igen för att uppdatera utvärderingarna.'))
    } catch {
      toast.error(text(locale, 'Could not update attribution', 'Kunde inte ändra koppling'))
    } finally {
      setAttributionBusyId(null)
    }
  }

  const updateParticipantStatus = async (participantId: string, status: ParticipantStatus) => {
    setParticipantBusyId(participantId)
    try {
      const response = await fetch(`/api/coach/team-capture-sessions/${session.id}/participants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ participantId, status }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed')
      setSession(payload.data)
    } catch {
      toast.error(text(locale, 'Could not update player readiness', 'Kunde inte uppdatera spelarstatus'))
    } finally {
      setParticipantBusyId(null)
    }
  }

  return (
    <div className="container mx-auto px-4 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold dark:text-white">
            <Radio className={cn('h-6 w-6', session.status === 'ACTIVE' ? 'animate-pulse text-red-600' : 'text-blue-600')} />
            {session.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={session.status === 'ACTIVE' ? 'destructive' : 'outline'}>{session.status}</Badge>
            <span>{text(locale, 'Elapsed', 'Tid')}: {formatClock(elapsedSec)}</span>
            {session.resolvedAt && <span>{text(locale, 'Resolved', 'Sammanställd')}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.status !== 'ACTIVE' && session.status !== 'COMPLETED' && (
            <Button onClick={() => updateStatus('ACTIVE')} disabled={busy}>
              <Play className="mr-2 h-4 w-4" />
              {session.masterStartedAt ? text(locale, 'Resume', 'Fortsätt') : text(locale, 'Start', 'Starta')}
            </Button>
          )}
          {session.status === 'ACTIVE' && (
            <Button variant="outline" onClick={() => updateStatus('PAUSED')} disabled={busy}>
              <Pause className="mr-2 h-4 w-4" />
              {text(locale, 'Pause', 'Pausa')}
            </Button>
          )}
          {session.status !== 'COMPLETED' && (
            <Button variant="outline" onClick={() => updateStatus('COMPLETED')} disabled={busy}>
              <Square className="mr-2 h-4 w-4" />
              {text(locale, 'Finish', 'Avsluta')}
            </Button>
          )}
          <Button variant="secondary" onClick={resolve} disabled={busy || !session.masterStartedAt}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {text(locale, 'Resolve', 'Sammanställ')}
          </Button>
          <Button
            variant={showLiveMetrics ? 'default' : 'outline'}
            onClick={() => setShowLiveMetrics((value) => !value)}
          >
            <Activity className="mr-2 h-4 w-4" />
            {showLiveMetrics ? text(locale, 'Hide live', 'Dölj live') : text(locale, 'Show live', 'Visa live')}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void refresh()} disabled={busy} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={roleSurfaceClass('mb-4')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2 font-medium dark:text-white">
            <Watch className="h-4 w-4 text-blue-600" />
            {text(locale, 'Garmin watch roster', 'Garmin-klockor')}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="default">{readinessCounts.ready} {text(locale, 'ready', 'redo')}</Badge>
            <Badge variant="secondary">{readinessCounts.watchStarted} {text(locale, 'watch started', 'klocka startad')}</Badge>
            {readinessCounts.needsHelp > 0 && (
              <Badge variant="destructive">{readinessCounts.needsHelp} {text(locale, 'needs help', 'behöver hjälp')}</Badge>
            )}
            <Badge variant="outline">{sortedParticipants.length} {text(locale, 'players', 'spelare')}</Badge>
          </div>
        </div>
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className={roleTableHeadClass('sticky top-0 backdrop-blur')}>
              <tr>
                <th className="px-4 py-2 text-left">{text(locale, 'Lane', 'Bana')}</th>
                <th className="px-4 py-2 text-left">{text(locale, 'Player', 'Spelare')}</th>
                <th className="px-4 py-2 text-left">{text(locale, 'Status', 'Status')}</th>
                <th className="px-4 py-2 text-left">{text(locale, 'Watch check', 'Klockcheck')}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/10">
              {sortedParticipants.map((participant) => (
                <tr key={participant.id}>
                  <td className="px-4 py-3 tabular-nums dark:text-slate-100">
                    {text(locale, 'Start', 'Start')} {participant.heatNumber} · {text(locale, 'Lane', 'Bana')} {participant.laneNumber}
                  </td>
                  <td className="px-4 py-3 dark:text-slate-100">
                    <div className="font-medium">
                      {participant.jerseyNumber != null ? `#${participant.jerseyNumber} ` : ''}
                      {participant.displayName}
                    </div>
                    {participant.position && <div className="text-xs text-muted-foreground">{participant.position}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <ParticipantStatusBadge status={participant.status} locale={locale} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={participant.status === 'PLANNED' ? 'secondary' : 'outline'}
                        disabled={participantBusyId === participant.id}
                        onClick={() => updateParticipantStatus(participant.id, 'PLANNED')}
                      >
                        <Circle className="mr-1.5 h-3.5 w-3.5" />
                        {text(locale, 'Waiting', 'Väntar')}
                      </Button>
                      <Button
                        size="sm"
                        variant={participant.status === 'WATCH_STARTED' ? 'secondary' : 'outline'}
                        disabled={participantBusyId === participant.id}
                        onClick={() => updateParticipantStatus(participant.id, 'WATCH_STARTED')}
                      >
                        <Timer className="mr-1.5 h-3.5 w-3.5" />
                        {text(locale, 'Started', 'Startad')}
                      </Button>
                      <Button
                        size="sm"
                        variant={participant.status === 'READY' ? 'default' : 'outline'}
                        disabled={participantBusyId === participant.id}
                        onClick={() => updateParticipantStatus(participant.id, 'READY')}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        {text(locale, 'Ready', 'Redo')}
                      </Button>
                      <Button
                        size="sm"
                        variant={participant.status === 'NEEDS_HELP' ? 'destructive' : 'outline'}
                        disabled={participantBusyId === participant.id}
                        onClick={() => updateParticipantStatus(participant.id, 'NEEDS_HELP')}
                      >
                        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                        {text(locale, 'Help', 'Hjälp')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showLiveMetrics && (
        <div className={roleSurfaceClass('mb-4')}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2 font-medium dark:text-white">
              <Activity className="h-4 w-4 text-emerald-600" />
              {text(locale, 'Live station metrics', 'Livevärden från stationer')}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={liveReadingCount > 0 ? 'default' : 'outline'}>
                {liveReadingCount}/{session.stations.length} {text(locale, 'live', 'live')}
              </Badge>
              <Badge variant="secondary">{text(locale, 'Watts · pulse · pace · calories', 'Watt · puls · pace · kalorier')}</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className={roleTableHeadClass()}>
                <tr>
                  <th className="px-4 py-2 text-left">{text(locale, 'Station', 'Station')}</th>
                  <th className="px-4 py-2 text-left">{text(locale, 'Player', 'Spelare')}</th>
                  <th className="px-4 py-2 text-left">{text(locale, 'Round', 'Runda')}</th>
                  <th className="px-4 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      W
                    </span>
                  </th>
                  <th className="px-4 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <HeartPulse className="h-3.5 w-3.5" />
                      {text(locale, 'Pulse', 'Puls')}
                    </span>
                  </th>
                  <th className="px-4 py-2 text-right">{text(locale, 'Pace', 'Pace')}</th>
                  <th className="px-4 py-2 text-right">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" />
                      {text(locale, 'Cals', 'Kal')}
                    </span>
                  </th>
                  <th className="px-4 py-2 text-left">{text(locale, 'Sample', 'Signal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/10">
                {liveStationRows.map(({ station, currentSegment, participant, latestReading }) => {
                  const ageSec = secondsSince(latestReading?.timestamp, now)
                  const isFresh = ageSec !== undefined && ageSec <= LIVE_READING_FRESH_SECONDS

                  return (
                    <tr key={station.id} className={cn(isFresh && 'bg-emerald-50/50 dark:bg-emerald-950/20')}>
                      <td className="px-4 py-3 dark:text-slate-100">
                        <div className="flex items-center gap-2 font-medium">
                          {stationIcon(station.machineType)}
                          {station.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {station.deviceName || labelFromEquipmentKey(station.equipmentKey ?? station.machineType)}
                        </div>
                      </td>
                      <td className="px-4 py-3 dark:text-slate-100">
                        {participant ? (
                          <div className="font-medium">
                            {participant.jerseyNumber != null ? `#${participant.jerseyNumber} ` : ''}
                            {participant.displayName}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{text(locale, 'Waiting', 'Väntar')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums dark:text-slate-100">
                        {currentSegment
                          ? `${text(locale, 'Start', 'Start')} ${currentSegment.heatNumber} · R${currentSegment.roundNumber}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums dark:text-slate-100">
                        {(() => {
                          // Colour the live watts by how the athlete is tracking
                          // their segment's target; only when the reading is fresh.
                          const status = isFresh
                            ? targetStatus(latestReading?.power, currentSegment?.targetPower, { minAbsolute: 5 })
                            : null
                          return (
                            <span className="inline-flex items-baseline justify-end gap-1.5">
                              <span className={cn('font-semibold', status ? STATUS_TEXT[status] : undefined)}>
                                {formatLiveWatts(latestReading?.power)}
                              </span>
                              {currentSegment?.targetPower != null && (
                                <span className="text-xs text-muted-foreground">/ {currentSegment.targetPower}</span>
                              )}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums dark:text-slate-100">
                        {(() => {
                          // Map live bpm to the athlete's zone and compare to the
                          // segment's target zone (below/on/above), when fresh.
                          const zones = participant ? hrZonesByClient?.[participant.clientId]?.zones : undefined
                          const bpm = latestReading?.heartRate
                          const liveZone = isFresh && bpm != null && zones?.length ? zoneForBpm(bpm, zones) : null
                          const target = currentSegment?.targetHrZone ?? null
                          const status = liveZone != null && target != null
                            ? liveZone < target ? 'below' : liveZone > target ? 'above' : 'on'
                            : null
                          return (
                            <span className="inline-flex items-baseline justify-end gap-1.5">
                              <span className={cn('font-semibold', status ? STATUS_TEXT[status] : undefined)}>
                                {formatLiveHeartRate(latestReading?.heartRate)}
                              </span>
                              {target != null && (
                                <span className="text-xs text-muted-foreground">{text(locale, 'tgt', 'mål')} Z{target}</span>
                              )}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums dark:text-slate-100">
                        {(() => {
                          // Pace (sec/500m): lower = faster = harder, so invert.
                          const status = isFresh
                            ? targetStatus(latestReading?.paceSecPer500m, currentSegment?.targetPace, {
                                tolerancePct: 0,
                                minAbsolute: 2,
                                invert: true,
                              })
                            : null
                          return (
                            <span className="inline-flex items-baseline justify-end gap-1.5">
                              <span className={cn('font-semibold', status ? STATUS_TEXT[status] : undefined)}>
                                {formatPace(latestReading?.paceSecPer500m)}
                              </span>
                              {currentSegment?.targetPace != null && (
                                <span className="text-xs text-muted-foreground">/ {formatTargetPace(currentSegment.targetPace)}</span>
                              )}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums dark:text-slate-100">
                        {formatLiveCalories(latestReading?.calories)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={isFresh ? 'default' : station.status === 'ONLINE' ? 'secondary' : 'outline'}>
                            {isFresh ? text(locale, 'Live', 'Live') : station.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatAge(ageSec, locale)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {session.stations.map((station) => (
          <Link
            key={station.id}
            href={`${baseHref}/station/${station.id}`}
            className={roleListItemClass('blue', 'p-4')}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium dark:text-white">
                {stationIcon(station.machineType)}
                {station.label}
              </div>
              <Badge variant={station.status === 'ONLINE' ? 'default' : 'outline'}>
                {station.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {station.deviceName || text(locale, 'No device paired', 'Ingen enhet kopplad')}
            </p>
          </Link>
        ))}
      </div>

      <div className={roleSurfaceClass()}>
        <div className="border-b px-4 py-3 font-medium dark:border-white/10 dark:text-white">
          {text(locale, 'Lane board', 'Banöversikt')}
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {lanes.map((lane) => {
            const current = session.segments.find((segment) =>
              segment.laneNumber === lane &&
              segment.plannedStartSec <= elapsedSec &&
              segment.plannedEndSec >= elapsedSec
            )
            const next = session.segments.find((segment) =>
              segment.laneNumber === lane &&
              segment.plannedStartSec > elapsedSec
            )
            const currentParticipant = current ? participantById.get(current.participantId) : null
            const nextParticipant = next ? participantById.get(next.participantId) : null

            return (
              <div key={lane} className="rounded-md border p-3 dark:border-white/10">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold dark:text-white">{text(locale, 'Lane', 'Bana')} {lane}</span>
                  {current && <Badge variant="secondary">R{current.roundNumber}</Badge>}
                </div>
                {current ? (
                  <div>
                    <p className="text-sm font-medium dark:text-slate-100">
                      {currentParticipant?.jerseyNumber != null ? `#${currentParticipant.jerseyNumber} ` : ''}
                      {currentParticipant?.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">{current.label}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{text(locale, 'Waiting', 'Väntar')}</p>
                )}
                {next && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {text(locale, 'Next', 'Nästa')}: {nextParticipant?.displayName} · {next.label}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={roleSurfaceClass('mt-4')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2 font-medium dark:text-white">
            <ArrowRightLeft className="h-4 w-4" />
            {text(locale, 'Review and attribution', 'Granskning och koppling')}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{reviewSegments.length} {text(locale, 'machine segments', 'maskinsegment')}</Badge>
            {missingSegments.length > 0 && (
              <Badge variant="destructive">{missingSegments.length} {text(locale, 'missing data', 'saknar data')}</Badge>
            )}
            {session.resolvedAt && <Badge variant="outline">{text(locale, 'Resolved', 'Sammanställd')}</Badge>}
          </div>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className={roleTableHeadClass('sticky top-0 backdrop-blur')}>
              <tr>
                <th className="px-4 py-2 text-left">{text(locale, 'Round', 'Runda')}</th>
                <th className="px-4 py-2 text-left">{text(locale, 'Lane', 'Bana')}</th>
                <th className="px-4 py-2 text-left">{text(locale, 'Equipment', 'Utrustning')}</th>
                <th className="px-4 py-2 text-left">{text(locale, 'Player', 'Spelare')}</th>
                <th className="px-4 py-2 text-left">{text(locale, 'Status', 'Status')}</th>
                <th className="px-4 py-2 text-right">{text(locale, 'Power', 'Watt')}</th>
                <th className="px-4 py-2 text-right">{text(locale, 'Pace', 'Pace')}</th>
                <th className="px-4 py-2 text-right">{text(locale, 'Calories', 'Kalorier')}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/10">
              {reviewSegments.map((segment) => {
                const summary = summaryRecord(segment.summary)
                const participant = participantById.get(segment.participantId)
                return (
                  <tr key={segment.id} className={cn(segment.status === 'NO_DATA' && 'bg-red-50/60 dark:bg-red-950/20')}>
                    <td className="px-4 py-3 dark:text-slate-100">
                      {text(locale, 'Start', 'Start')} {segment.heatNumber} · R{segment.roundNumber}
                    </td>
                    <td className="px-4 py-3 dark:text-slate-100">{segment.laneNumber}</td>
                    <td className="px-4 py-3 dark:text-slate-100">{labelFromEquipmentKey(segment.equipmentKey ?? segment.machineType)}</td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm dark:border-white/10"
                        value={segment.clientId}
                        disabled={attributionBusyId === segment.id}
                        onChange={(event) => void updateAttribution(segment.id, event.target.value)}
                        aria-label={text(locale, 'Change player attribution', 'Ändra spelarkoppling')}
                      >
                        {session.participants.map((item) => (
                          <option key={item.clientId} value={item.clientId}>
                            {item.jerseyNumber != null ? `#${item.jerseyNumber} ` : ''}
                            {item.displayName}
                          </option>
                        ))}
                      </select>
                      {participant && participant.clientId !== segment.clientId && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {text(locale, 'Originally', 'Ursprungligen')}: {participant.displayName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={segment.status === 'RESOLVED' ? 'default' : segment.status === 'NO_DATA' ? 'destructive' : 'outline'}>
                        {segment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums dark:text-slate-100">{formatWatts(summary.avgPower, summary.maxPower)}</td>
                    <td className="px-4 py-3 text-right tabular-nums dark:text-slate-100">{formatPace(summary.avgPaceSecPer500m)}</td>
                    <td className="px-4 py-3 text-right tabular-nums dark:text-slate-100">{formatNumber(summary.calories)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function summaryRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stationIcon(machineType: MachineType) {
  if (machineType === 'ROWER' || machineType === 'SKIERG') return <Waves className="h-4 w-4" />
  return <Bike className="h-4 w-4" />
}

function ParticipantStatusBadge({ status, locale }: { status: string; locale: 'en' | 'sv' }) {
  if (status === 'READY') {
    return <Badge variant="default">{text(locale, 'Ready', 'Redo')}</Badge>
  }
  if (status === 'WATCH_STARTED') {
    return <Badge variant="secondary">{text(locale, 'Watch started', 'Klocka startad')}</Badge>
  }
  if (status === 'NEEDS_HELP') {
    return <Badge variant="destructive">{text(locale, 'Needs help', 'Behöver hjälp')}</Badge>
  }
  return <Badge variant="outline">{text(locale, 'Waiting', 'Väntar')}</Badge>
}

function metric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function secondsSince(value: string | Date | null | undefined, now: number): number | undefined {
  if (!value || now <= 0) return undefined
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return undefined
  return Math.max(0, Math.floor((now - time) / 1000))
}

function formatAge(ageSec: number | undefined, locale: 'en' | 'sv'): string {
  if (ageSec === undefined) return '-'
  if (ageSec <= 2) return text(locale, 'now', 'nu')
  if (ageSec < 60) return `${ageSec}s`
  return `${Math.floor(ageSec / 60)}m`
}

function formatNumber(value: unknown): string {
  const numberValue = metric(value)
  return numberValue === undefined ? '-' : String(Math.round(numberValue))
}

function formatLiveWatts(value: unknown): string {
  const numberValue = metric(value)
  return numberValue === undefined ? '-' : `${Math.round(numberValue)} W`
}

function formatLiveHeartRate(value: unknown): string {
  const numberValue = metric(value)
  return numberValue === undefined ? '-' : `${Math.round(numberValue)} bpm`
}

function formatLiveCalories(value: unknown): string {
  const numberValue = metric(value)
  return numberValue === undefined ? '-' : `${Math.round(numberValue)} kcal`
}

function formatWatts(avgPower: unknown, maxPower: unknown): string {
  const avg = metric(avgPower)
  const max = metric(maxPower)
  if (avg === undefined && max === undefined) return '-'
  if (max === undefined) return `${Math.round(avg ?? 0)} W`
  if (avg === undefined) return `${Math.round(max)} W max`
  return `${Math.round(avg)} / ${Math.round(max)} W`
}

function formatPace(value: unknown): string {
  const seconds = metric(value)
  if (seconds === undefined) return '-'
  const totalSeconds = Math.round(seconds)
  const min = Math.floor(totalSeconds / 60)
  const sec = totalSeconds % 60
  return `${min}:${String(sec).padStart(2, '0')}/500`
}
