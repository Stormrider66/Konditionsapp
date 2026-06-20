'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRightLeft, Bike, CheckCircle2, Pause, Play, Radio, RefreshCw, Square, Waves } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { labelFromEquipmentKey } from '@/lib/team-capture/equipment'
import { cn } from '@/lib/utils'

type CaptureStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
type MachineType = 'BIKEERG' | 'ROWER' | 'SKIERG' | 'WATTBIKE' | 'ASSAULT_BIKE' | 'ECHO_BIKE' | 'AIR_BIKE' | 'RUN' | 'REST'

interface CaptureParticipant {
  id: string
  clientId: string
  displayName: string
  jerseyNumber: number | null
  laneNumber: number
  heatNumber: number
  expectedStartOffsetSec: number
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
}: TeamCaptureControlRoomProps) {
  const [session, setSession] = useState(initialSession)
  const [busy, setBusy] = useState(false)
  const [attributionBusyId, setAttributionBusyId] = useState<string | null>(null)
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

  const elapsedSec = session.masterStartedAt && now > 0
    ? Math.max(0, Math.floor((now - new Date(session.masterStartedAt).getTime()) / 1000))
    : 0

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
      toast.success(text(locale, 'Capture resolved into athlete evaluations', 'Fångsten har kopplats till spelarnas utvärderingar'))
      await refresh()
    } catch {
      toast.error(text(locale, 'Could not resolve capture', 'Kunde inte sammanställa fångsten'))
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
          <Button variant="ghost" size="icon" onClick={() => void refresh()} disabled={busy} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {session.stations.map((station) => (
          <Link
            key={station.id}
            href={`${baseHref}/station/${station.id}`}
            className="rounded-lg border bg-white p-4 shadow-sm transition hover:border-blue-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-blue-500"
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

      <div className="rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
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

      <div className="mt-4 rounded-lg border bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
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
            <thead className="sticky top-0 border-b bg-muted/80 text-xs uppercase text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
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
                      H{segment.heatNumber} · R{segment.roundNumber}
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

function metric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function formatNumber(value: unknown): string {
  const numberValue = metric(value)
  return numberValue === undefined ? '-' : String(Math.round(numberValue))
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
