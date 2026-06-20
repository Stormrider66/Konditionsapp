'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bike, Bluetooth, BluetoothConnected, Loader2, Waves } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useErgFleet } from '@/hooks/use-erg-fleet'
import type { WattbikeSample } from '@/lib/integrations/wattbike'

type MachineType = 'BIKEERG' | 'ROWER' | 'RUN' | 'REST'

interface CaptureParticipant {
  id: string
  displayName: string
  jerseyNumber: number | null
}

interface CaptureStation {
  id: string
  laneNumber: number
  machineType: MachineType
  label: string
  status: string
  deviceName: string | null
}

interface CaptureSegment {
  id: string
  participantId: string
  stationId: string | null
  roundNumber: number
  label: string
  plannedStartSec: number
  plannedEndSec: number
}

interface CaptureSession {
  id: string
  teamId: string
  name: string
  status: string
  masterStartedAt: string | Date | null
  participants: CaptureParticipant[]
  segments: CaptureSegment[]
}

interface TeamCaptureStationReceiverProps {
  businessSlug: string
  teamId: string
  locale: 'en' | 'sv'
  initialSession: CaptureSession
  station: CaptureStation
}

function text(locale: 'en' | 'sv', en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function slotForStation(station: CaptureStation): string {
  return station.machineType === 'BIKEERG' ? 'BIKE_ERG' : 'ROW'
}

function readingFromSample(sample: WattbikeSample) {
  return {
    timestamp: new Date().toISOString(),
    power: sample.power,
    cadence: sample.cadence,
    strokeRate: sample.strokeRate,
    paceSecPer500m: sample.pace,
    distanceMeters: sample.distance,
    calories: sample.calories,
    heartRate: sample.heartRate,
    raw: {
      t: sample.t,
      source: sample.source,
      speed: sample.speed,
      avgPower: sample.avgPower,
      elapsedTime: sample.elapsedTime,
      strokeCount: sample.strokeCount,
    },
  }
}

export function TeamCaptureStationReceiver({
  businessSlug,
  teamId,
  locale,
  initialSession,
  station,
}: TeamCaptureStationReceiverProps) {
  const [session, setSession] = useState(initialSession)
  const [now, setNow] = useState(0)
  const [sentCount, setSentCount] = useState(0)
  const [sending, setSending] = useState(false)
  const slot = slotForStation(station)
  const fleet = useErgFleet([slot])
  const device = fleet.devices[slot]
  const connected = device?.status === 'connected'
  const connecting = device?.status === 'connecting' || device?.status === 'reconnecting'
  const bufferRef = useRef<ReturnType<typeof readingFromSample>[]>([])

  const participantById = useMemo(
    () => new Map(session.participants.map((participant) => [participant.id, participant])),
    [session.participants]
  )
  const elapsedSec = session.masterStartedAt && now > 0
    ? Math.max(0, Math.floor((now - new Date(session.masterStartedAt).getTime()) / 1000))
    : 0
  const currentSegment = session.segments.find((segment) =>
    segment.stationId === station.id &&
    segment.plannedStartSec <= elapsedSec &&
    segment.plannedEndSec >= elapsedSec
  )
  const currentAthlete = currentSegment ? participantById.get(currentSegment.participantId) : null

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
    }, 5000)
    return () => clearInterval(poll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  useEffect(() => {
    if (!device?.client || !connected) return
    return device.client.on('data', (sample) => {
      bufferRef.current.push(readingFromSample(sample))
    })
  }, [device?.client, connected])

  useEffect(() => {
    if (!connected) return
    const interval = setInterval(() => {
      if (bufferRef.current.length === 0 || sending) return
      const readings = bufferRef.current.splice(0, 120)
      setSending(true)
      void fetch(`/api/coach/team-capture-sessions/${session.id}/station-readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          stationId: station.id,
          receiverName: station.label,
          deviceName: device?.name,
          deviceId: device?.client?.getDeviceId(),
          readings,
        }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('failed')
          setSentCount((count) => count + readings.length)
        })
        .catch(() => {
          bufferRef.current.unshift(...readings)
          toast.error(text(locale, 'Could not upload readings', 'Kunde inte skicka mätningar'))
        })
        .finally(() => setSending(false))
    }, 2000)
    return () => clearInterval(interval)
  }, [connected, device?.client, device?.name, locale, sending, session.id, station.id, station.label])

  return (
    <div className="container mx-auto px-4 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${businessSlug}/coach/teams/${teamId}/capture/${session.id}`} className="text-sm text-blue-600 hover:underline">
            {text(locale, 'Back to control room', 'Till kontrollrummet')}
          </Link>
          <h2 className="mt-2 flex items-center gap-2 text-3xl font-semibold dark:text-white">
            {station.machineType === 'BIKEERG' ? <Bike className="h-7 w-7" /> : <Waves className="h-7 w-7" />}
            {station.label}
          </h2>
        </div>
        <Badge variant={connected ? 'default' : 'outline'} className="text-sm">
          {connected ? text(locale, 'Connected', 'Ansluten') : text(locale, 'Offline', 'Offline')}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 font-medium dark:text-white">
            {connected ? <BluetoothConnected className="h-5 w-5 text-emerald-600" /> : <Bluetooth className="h-5 w-5 text-muted-foreground" />}
            {text(locale, 'Bluetooth receiver', 'Bluetoothmottagare')}
          </div>
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full"
              onClick={() => void fleet.connectSlot(slot).catch(() => {})}
              disabled={!fleet.isSupported || connecting || connected}
            >
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bluetooth className="mr-2 h-4 w-4" />}
              {connected ? text(locale, 'Connected', 'Ansluten') : text(locale, 'Connect machine', 'Anslut maskin')}
            </Button>
            {connected && (
              <Button type="button" variant="outline" className="w-full" onClick={() => void fleet.disconnectSlot(slot)}>
                {text(locale, 'Disconnect', 'Koppla från')}
              </Button>
            )}
            {!fleet.isSupported && (
              <p className="text-sm text-amber-600">
                {text(locale, 'Use Chrome/Edge on Android or desktop for web capture. Native iPad capture comes later.', 'Använd Chrome/Edge på Android eller dator för webbfångst. Native iPad-fångst kommer senare.')}
              </p>
            )}
            <div className="rounded-md border p-3 text-sm dark:border-white/10">
              <p className="text-muted-foreground">{text(locale, 'Uploaded samples', 'Skickade mätningar')}</p>
              <p className="text-2xl font-semibold dark:text-white">{sentCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <p className="text-sm text-muted-foreground">{text(locale, 'Current athlete', 'Aktuell spelare')}</p>
          {currentAthlete ? (
            <div className="mt-3">
              <p className="text-4xl font-semibold dark:text-white">
                {currentAthlete.jerseyNumber != null ? `#${currentAthlete.jerseyNumber} ` : ''}
                {currentAthlete.displayName}
              </p>
              <p className="mt-2 text-lg text-muted-foreground">
                {currentSegment?.label} · {text(locale, 'Round', 'Runda')} {currentSegment?.roundNumber}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed p-8 text-center text-muted-foreground dark:border-white/10">
              {session.masterStartedAt
                ? text(locale, 'No athlete scheduled on this station right now', 'Ingen spelare är schemalagd på stationen just nu')
                : text(locale, 'Waiting for coach start', 'Väntar på coachens start')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
