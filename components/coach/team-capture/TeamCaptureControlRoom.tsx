'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bike, CheckCircle2, Pause, Play, Radio, RefreshCw, Square, Waves } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CaptureStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
type MachineType = 'BIKEERG' | 'ROWER' | 'RUN' | 'REST'

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
  machineType: MachineType
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
  machineType: MachineType
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
  const [now, setNow] = useState(Date.now())

  const baseHref = `/${businessSlug}/coach/teams/${teamId}/capture/${session.id}`
  const participantById = useMemo(
    () => new Map(session.participants.map((participant) => [participant.id, participant])),
    [session.participants]
  )
  const lanes = useMemo(
    () => Array.from(new Set(session.participants.map((participant) => participant.laneNumber))).sort((a, b) => a - b),
    [session.participants]
  )

  const elapsedSec = session.masterStartedAt
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
                {station.machineType === 'BIKEERG' ? <Bike className="h-4 w-4" /> : <Waves className="h-4 w-4" />}
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
    </div>
  )
}
