'use client'

/**
 * Coach-side machine capture for Live HR sessions.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bike, Bluetooth, Gauge, Heart, Loader2, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RolePanel } from '@/components/layouts/role-shell/RolePage'
import { useErgFleet } from '@/hooks/use-erg-fleet'
import type { WattbikeClient, WattbikeSample } from '@/lib/integrations/wattbike'
import type { LiveHRMachineType, LiveHRParticipantData } from '@/lib/live-hr/types'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'

interface MachineCapturePanelProps {
  sessionId: string
  participants: LiveHRParticipantData[]
  disabled?: boolean
}

type AppLocale = 'en' | 'sv'
type MachineOption = {
  type: LiveHRMachineType
  slot: string
  kind: 'bike' | 'rower'
  labels: Record<AppLocale, string>
}

const PUSH_INTERVAL_MS = 2_000

const MACHINE_OPTIONS: MachineOption[] = [
  { type: 'WATTBIKE', slot: 'WATTBIKE', kind: 'bike', labels: { en: 'Wattbike', sv: 'Wattbike' } },
  { type: 'CONCEPT2_ROW', slot: 'ROW', kind: 'rower', labels: { en: 'Concept2 RowErg', sv: 'Concept2 RowErg' } },
  { type: 'CONCEPT2_SKIERG', slot: 'SKI_ERG', kind: 'rower', labels: { en: 'Concept2 SkiErg', sv: 'Concept2 SkiErg' } },
  { type: 'CONCEPT2_BIKEERG', slot: 'BIKE_ERG', kind: 'bike', labels: { en: 'Concept2 BikeErg', sv: 'Concept2 BikeErg' } },
]

const COPY: Record<AppLocale, {
  title: string
  live: string
  athletePlaceholder: string
  machinePlaceholder: string
  unsupported: string
  noAthletes: string
  connect: string
  connecting: string
  disconnect: string
  connected: string
  idle: string
  streamError: string
  watts: string
  cadenceBike: string
  cadenceRower: string
  heartRate: string
  noMachineData: string
}> = {
  en: {
    title: 'Machine stream',
    live: 'Live to session',
    athletePlaceholder: 'Select athlete',
    machinePlaceholder: 'Select machine',
    unsupported: 'Chrome or Edge is required for machine capture',
    noAthletes: 'Add an athlete before connecting a machine',
    connect: 'Connect',
    connecting: 'Connecting...',
    disconnect: 'Disconnect',
    connected: 'Connected',
    idle: 'Ready',
    streamError: 'Could not stream machine data',
    watts: 'Watts',
    cadenceBike: 'RPM',
    cadenceRower: 'SPM',
    heartRate: 'HR',
    noMachineData: 'Waiting for PM5 data: select Just Ride on the monitor and pedal',
  },
  sv: {
    title: 'Maskinström',
    live: 'Live till session',
    athletePlaceholder: 'Välj atlet',
    machinePlaceholder: 'Välj maskin',
    unsupported: 'Chrome eller Edge krävs för maskinanslutning',
    noAthletes: 'Lägg till en atlet innan du ansluter maskin',
    connect: 'Anslut',
    connecting: 'Ansluter...',
    disconnect: 'Koppla från',
    connected: 'Ansluten',
    idle: 'Redo',
    streamError: 'Kunde inte strömma maskindata',
    watts: 'Watt',
    cadenceBike: 'RPM',
    cadenceRower: 'SPM',
    heartRate: 'Puls',
    noMachineData: 'Väntar på PM5-data: välj Just Ride på monitorn och trampa',
  },
}

export function MachineCapturePanel({ sessionId, participants, disabled = false }: MachineCapturePanelProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedMachineType, setSelectedMachineType] = useState<LiveHRMachineType>('WATTBIKE')
  const [latest, setLatest] = useState<{ client: WattbikeClient; sample: WattbikeSample } | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [noDataHintClient, setNoDataHintClient] = useState<WattbikeClient | null>(null)
  const latestRef = useRef<WattbikeSample | null>(null)

  const machine = useMemo(
    () => MACHINE_OPTIONS.find((option) => option.type === selectedMachineType) ?? MACHINE_OPTIONS[0],
    [selectedMachineType]
  )
  const fleet = useErgFleet(MACHINE_OPTIONS.map((option) => option.slot))
  const device = fleet.devices[machine.slot]
  const isConnecting = device?.status === 'connecting' || device?.status === 'reconnecting'
  const isConnected = device?.status === 'connected'
  const activeClientId = participants.some((participant) => participant.clientId === selectedClientId)
    ? selectedClientId
    : participants[0]?.clientId ?? ''
  const selectedParticipant = participants.find((participant) => participant.clientId === activeClientId)
  const captureSupported = hasMounted ? fleet.isSupported : false
  const canConnect = !disabled && captureSupported && participants.length > 0 && !!activeClientId
  const displayLatest = isConnected ? device?.latest ?? (latest?.client === device?.client ? latest.sample : null) : null
  const showNoDataHint = isConnected && noDataHintClient === device?.client && !displayLatest
  const displayPower =
    displayLatest?.power != null
      ? displayLatest.power
      : displayLatest?.avgPower != null
        ? displayLatest.avgPower
        : null

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && displayLatest) latestRef.current = displayLatest
  }, [displayLatest, isConnected])

  useEffect(() => {
    latestRef.current = null
    if (!device?.client || !isConnected) return

    const client = device.client
    const hintTimeoutId = window.setTimeout(() => {
      if (!latestRef.current) setNoDataHintClient(client)
    }, 4_000)

    const off = client.on('data', (sample) => {
      latestRef.current = sample
      setLatest({ client, sample })
      setNoDataHintClient((current) => current === client ? null : current)
    })

    return () => {
      window.clearTimeout(hintTimeoutId)
      off()
    }
  }, [device?.client, isConnected])

  useEffect(() => {
    if (!isConnected || !activeClientId || disabled) return

    const intervalId = setInterval(() => {
      const sample = latestRef.current
      const power = typeof sample?.power === 'number'
        ? sample.power
        : typeof sample?.avgPower === 'number'
          ? sample.avgPower
          : null
      if (!sample || power == null) return

      void fetch(`/api/coach/live-hr/sessions/${sessionId}/machine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          clientId: activeClientId,
          ergometerType: selectedMachineType,
          power: Math.round(power),
          cadence: Math.round(machine.kind === 'rower' ? sample.strokeRate ?? 0 : sample.cadence ?? sample.avgCadence ?? 0) || undefined,
          heartRate: typeof sample.heartRate === 'number' ? Math.round(sample.heartRate) : undefined,
          deviceId: device?.client.getDeviceId() ?? undefined,
        }),
      }).catch(() => {
        toast.error(copy.streamError)
      })
    }, PUSH_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [activeClientId, copy.streamError, device?.client, disabled, isConnected, machine.kind, selectedMachineType, sessionId])

  return (
    <RolePanel className="mb-6">
      <div className="border-b border-zinc-200 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            <Bluetooth className="h-4 w-4 text-teal-500" />
            {copy.title}
          </h3>
          <Badge
            variant={isConnected ? 'default' : 'outline'}
            className={cn(
              isConnected
                ? 'bg-emerald-600 text-white border-none'
                : 'border-slate-350 dark:border-white/10 text-slate-600 dark:text-slate-400'
            )}
          >
            {isConnected ? copy.live : copy.idle}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Select value={activeClientId} onValueChange={setSelectedClientId} disabled={disabled || participants.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={participants.length > 0 ? copy.athletePlaceholder : copy.noAthletes} />
            </SelectTrigger>
            <SelectContent>
              {participants.map((participant) => (
                <SelectItem key={participant.clientId} value={participant.clientId}>
                  {participant.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMachineType}
            onValueChange={(value) => setSelectedMachineType(value as LiveHRMachineType)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={copy.machinePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {MACHINE_OPTIONS.map((option) => (
                <SelectItem key={option.type} value={option.type}>
                  {option.labels[locale]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isConnected ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void fleet.disconnectSlot(machine.slot)}
              className="border-slate-250 dark:border-white/10 text-slate-700 dark:text-slate-300"
            >
              {copy.disconnect}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void fleet.connectSlot(machine.slot).catch(() => {})}
              disabled={!canConnect || isConnecting}
              title={hasMounted && !captureSupported ? copy.unsupported : undefined}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bluetooth className="h-4 w-4 mr-2" />
              )}
              {isConnecting ? copy.connecting : copy.connect}
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          {hasMounted && !captureSupported && (
            <span className="text-amber-600 dark:text-amber-400">{copy.unsupported}</span>
          )}
          {selectedParticipant && isConnected && (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Radio className="h-4 w-4" />
              {selectedParticipant.clientName}
            </span>
          )}
          {device?.name && (
            <span className="font-medium text-slate-700 dark:text-slate-300">{device.name}</span>
          )}
          <span className="flex items-center gap-1 tabular-nums">
            <Gauge className="h-4 w-4 text-amber-500" />
            {copy.watts}: {displayPower != null ? Math.round(displayPower) : '-'}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Bike className="h-4 w-4 text-blue-500" />
            {machine.kind === 'rower' ? copy.cadenceRower : copy.cadenceBike}:{' '}
            {machine.kind === 'rower'
              ? displayLatest?.strokeRate != null ? Math.round(displayLatest.strokeRate) : '-'
              : displayLatest?.cadence != null
                ? Math.round(displayLatest.cadence)
                : displayLatest?.avgCadence != null
                  ? Math.round(displayLatest.avgCadence)
                  : '-'}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Heart className="h-4 w-4 text-rose-500" />
            {copy.heartRate}: {displayLatest?.heartRate != null ? Math.round(displayLatest.heartRate) : '-'}
          </span>
          {showNoDataHint && (
            <span className="text-amber-600 dark:text-amber-400">{copy.noMachineData}</span>
          )}
        </div>
      </div>
    </RolePanel>
  )
}
