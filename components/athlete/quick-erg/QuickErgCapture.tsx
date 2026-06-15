'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  AlertTriangle,
  Bike,
  Bluetooth,
  CheckCircle2,
  Flame,
  Gauge,
  Heart,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Ship,
  Square,
  Waves,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import {
  WattbikeRecorder,
  type WattbikeLiveMetrics,
  type WattbikeSample,
} from '@/lib/integrations/wattbike'
import { useWattbike } from '@/hooks/use-wattbike'
import {
  formatMachineName,
  type QuickErgMachineType,
  type QuickErgSessionAnalysis,
  type QuickErgSource,
} from '@/lib/quick-erg/session-summary'

type Phase = 'idle' | 'ready' | 'recording' | 'review' | 'saving'
type AppLocale = 'en' | 'sv'

const MACHINE_OPTIONS: Array<{
  value: QuickErgMachineType
  label: string
  kind: 'rower' | 'bike' | 'unknown'
}> = [
  { value: 'CONCEPT2_ROW', label: 'Concept2 RowErg', kind: 'rower' },
  { value: 'CONCEPT2_SKIERG', label: 'Concept2 SkiErg', kind: 'rower' },
  { value: 'CONCEPT2_BIKEERG', label: 'Concept2 BikeErg', kind: 'bike' },
  { value: 'WATTBIKE', label: 'Wattbike', kind: 'bike' },
  { value: 'ASSAULT_BIKE', label: 'AirBike', kind: 'bike' },
  { value: 'FTMS_BIKE', label: 'Bluetooth bike', kind: 'bike' },
  { value: 'FTMS_AIRBIKE', label: 'Bluetooth airbike', kind: 'bike' },
]

function text(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function formatDuration(sec: number): string {
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = Math.floor(sec % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatPace(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return '--'
  const minutes = Math.floor(sec / 60)
  const seconds = Math.round(sec % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function sourceFromSamples(sourceRef: { pm5: boolean; cps: boolean }): QuickErgSource {
  if (sourceRef.pm5) return 'BLUETOOTH_PM5'
  if (sourceRef.cps) return 'BLUETOOTH_CPS'
  return 'BLUETOOTH_FTMS'
}

function sampleHasMovement(sample: WattbikeSample, previous?: WattbikeSample | null): boolean {
  if ((sample.power ?? 0) >= 20) return true
  if ((sample.cadence ?? 0) >= 5) return true
  if ((sample.strokeRate ?? 0) >= 5) return true
  if ((sample.speed ?? 0) >= 1) return true

  if (
    typeof sample.distance === 'number' &&
    typeof previous?.distance === 'number' &&
    sample.distance - previous.distance > 0.5
  ) {
    return true
  }

  return false
}

function machineMatchesKind(machine: QuickErgMachineType, kind: 'bike' | 'rower' | null): boolean {
  if (!kind) return true
  const option = MACHINE_OPTIONS.find((item) => item.value === machine)
  return option?.kind === kind
}

export function QuickErgCapture() {
  const router = useRouter()
  const basePath = useBasePath()
  const locale = (useLocale() === 'sv' ? 'sv' : 'en') as AppLocale
  const wb = useWattbike({ reconnectKnownOnMount: true })

  const [recorder] = useState(() => new WattbikeRecorder())
  const [phase, setPhase] = useState<Phase>('idle')
  const [machineType, setMachineType] = useState<QuickErgMachineType>('CONCEPT2_ROW')
  const [live, setLive] = useState<WattbikeLiveMetrics | null>(null)
  const [analysis, setAnalysis] = useState<QuickErgSessionAnalysis | null>(null)
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState('')

  const phaseRef = useRef<Phase>('idle')
  const recordingRef = useRef(false)
  const startedAtRef = useRef<Date | null>(null)
  const completedAtRef = useRef<Date | null>(null)
  const previousSampleRef = useRef<WattbikeSample | null>(null)
  const sourceRef = useRef({ pm5: false, cps: false })

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (wb.status === 'connected' && phaseRef.current === 'idle') {
      setPhase('ready')
    }
    if (wb.status === 'disconnected' && phaseRef.current === 'ready') {
      setPhase('idle')
    }
  }, [wb.status])

  useEffect(() => {
    if (wb.machineKind === 'bike' && phaseRef.current !== 'recording' && !machineMatchesKind(machineType, 'bike')) {
      setMachineType('WATTBIKE')
    }
    if (wb.machineKind === 'rower' && phaseRef.current !== 'recording' && !machineMatchesKind(machineType, 'rower')) {
      setMachineType('CONCEPT2_ROW')
    }
  }, [wb.machineKind, machineType])

  const addSample = useCallback((sample: WattbikeSample) => {
    if (sample.source === 'pm5') sourceRef.current.pm5 = true
    if (sample.source === 'cps') sourceRef.current.cps = true

    recorder.add(sample)
    setLive(recorder.liveMetrics())
  }, [recorder])

  const beginRecording = useCallback((firstSample?: WattbikeSample) => {
    recorder.start()
    startedAtRef.current = new Date()
    completedAtRef.current = null
    recordingRef.current = true
    sourceRef.current = { pm5: false, cps: false }
    setAnalysis(null)
    setLive(null)
    setPhase('recording')

    if (firstSample) addSample(firstSample)
  }, [addSample, recorder])

  useEffect(() => {
    const off = wb.client.on('data', (sample) => {
      const previous = previousSampleRef.current
      previousSampleRef.current = sample

      if (phaseRef.current === 'ready' && sampleHasMovement(sample, previous)) {
        beginRecording(sample)
        return
      }

      if (!recordingRef.current) {
        setLive((current) => current ?? {
          elapsedSec: 0,
          sampleCount: 0,
          power: sample.power ? Math.round(sample.power) : 0,
          avgPower: 0,
          maxPower: sample.power ? Math.round(sample.power) : 0,
          cadence: sample.cadence,
          heartRate: sample.heartRate,
          distanceMeters: sample.distance,
          calories: sample.calories,
          pace: sample.pace,
          strokeRate: sample.strokeRate,
          speed: sample.speed,
        })
        return
      }

      addSample(sample)
    })

    return off
  }, [addSample, beginRecording, wb.client])

  const handleStop = useCallback(() => {
    recordingRef.current = false
    completedAtRef.current = new Date()
    recorder.stop()
    const nextAnalysis = recorder.quickErgSessionAnalysis()
    setAnalysis(nextAnalysis)
    setLive(recorder.liveMetrics())
    setPhase('review')
  }, [recorder])

  const handleReset = useCallback(() => {
    recordingRef.current = false
    recorder.start()
    recorder.stop()
    startedAtRef.current = null
    completedAtRef.current = null
    previousSampleRef.current = null
    sourceRef.current = { pm5: false, cps: false }
    setAnalysis(null)
    setLive(null)
    setRpe('')
    setNotes('')
    setPhase(wb.status === 'connected' ? 'ready' : 'idle')
  }, [recorder, wb.status])

  const handleSave = useCallback(async () => {
    if (!analysis || !startedAtRef.current || !completedAtRef.current) return

    setPhase('saving')

    try {
      const response = await fetch('/api/athlete/quick-erg-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineType,
          machineKind: wb.machineKind,
          source: sourceFromSamples(sourceRef.current),
          deviceName: wb.deviceName,
          deviceId: wb.deviceId,
          startedAt: startedAtRef.current.toISOString(),
          completedAt: completedAtRef.current.toISOString(),
          samples: analysis.samples,
          rpe: rpe ? Number(rpe) : undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || text(locale, 'Could not save session', 'Kunde inte spara passet'))
      }

      toast.success(text(locale, 'Erg session saved', 'Ergpasset har sparats'))
      handleReset()
      router.push(`${basePath}/athlete/dashboard`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Could not save session', 'Kunde inte spara passet'))
      setPhase('review')
    }
  }, [analysis, basePath, handleReset, locale, machineType, notes, router, rpe, wb.deviceId, wb.deviceName, wb.machineKind])

  const connected = wb.status === 'connected'
  const isConnecting = wb.status === 'connecting' || wb.status === 'reconnecting'
  const isRower = MACHINE_OPTIONS.find((item) => item.value === machineType)?.kind === 'rower'
  const reviewSummary = analysis?.summary
  const elapsed = phase === 'review' || phase === 'saving'
    ? reviewSummary?.durationSec ?? live?.elapsedSec ?? 0
    : live?.elapsedSec ?? 0
  const canSave = !!analysis && analysis.summary.durationSec >= 5 && phase !== 'saving'

  if (!wb.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {text(locale, 'Bluetooth recording unavailable', 'Bluetoothinspelning inte tillganglig')}
          </CardTitle>
          <CardDescription>
            {text(
              locale,
              'Use Chrome or Edge on Android or desktop for now. iPhone capture will move to the native app later.',
              'Anvand Chrome eller Edge pa Android eller dator just nu. iPhone-stod kommer i den native appen senare.'
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5" />
              {text(locale, 'Record erg', 'Spela in erg')}
            </CardTitle>
            <CardDescription>
              {text(locale, 'Connect, move, stop, save.', 'Anslut, kor, stoppa, spara.')}
            </CardDescription>
          </div>
          <Badge variant={connected ? 'default' : 'secondary'}>
            {connected
              ? wb.deviceName || text(locale, 'Connected', 'Ansluten')
              : isConnecting
                ? text(locale, 'Connecting', 'Ansluter')
                : text(locale, 'Not connected', 'Ej ansluten')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {!connected && phase !== 'review' && (
          <Button
            className="w-full"
            onClick={() => void wb.connect()}
            disabled={isConnecting}
          >
            {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bluetooth className="mr-2 h-4 w-4" />}
            {text(locale, 'Connect machine', 'Anslut maskin')}
          </Button>
        )}

        {connected && phase !== 'recording' && phase !== 'review' && phase !== 'saving' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{text(locale, 'Machine', 'Maskin')}</Label>
              <Select value={machineType} onValueChange={(value) => setMachineType(value as QuickErgMachineType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{text(locale, 'Ready', 'Redo')}</p>
                  <p className="text-sm text-muted-foreground">
                    {text(locale, 'Recording starts when the machine moves.', 'Inspelningen startar nar maskinen ror sig.')}
                  </p>
                </div>
                <Button onClick={() => beginRecording()}>
                  <Play className="mr-2 h-4 w-4" />
                  {text(locale, 'Start now', 'Starta nu')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === 'recording' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums">
                {isRower && live?.pace ? formatPace(live.pace) : live?.power ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">
                {isRower && live?.pace ? '/500m' : 'W'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={<Gauge className="h-4 w-4" />} value={formatDuration(elapsed)} label={text(locale, 'Time', 'Tid')} />
              <Metric icon={<Waves className="h-4 w-4" />} value={live?.distanceMeters ? `${Math.round(live.distanceMeters)} m` : '--'} label={text(locale, 'Distance', 'Distans')} />
              <Metric icon={isRower ? <Ship className="h-4 w-4" /> : <Bike className="h-4 w-4" />} value={isRower ? live?.strokeRate ?? '--' : live?.cadence ?? '--'} label={isRower ? 'spm' : 'rpm'} />
              <Metric icon={<Heart className="h-4 w-4" />} value={live?.heartRate ?? '--'} label="bpm" />
              <Metric icon={<Flame className="h-4 w-4" />} value={live?.calories ?? '--'} label="kcal" />
              <Metric icon={<ZapMetricIcon />} value={live?.avgPower ?? 0} label={text(locale, 'Avg W', 'Snitt W')} />
              <Metric icon={<ZapMetricIcon />} value={live?.maxPower ?? 0} label={text(locale, 'Max W', 'Max W')} />
              <Metric icon={<Gauge className="h-4 w-4" />} value={live?.sampleCount ?? 0} label={text(locale, 'Samples', 'Samples')} />
            </div>

            <Button variant="destructive" className="w-full" onClick={handleStop}>
              <Square className="mr-2 h-4 w-4" />
              {text(locale, 'Stop', 'Stoppa')}
            </Button>
          </div>
        )}

        {(phase === 'review' || phase === 'saving') && reviewSummary && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {formatMachineName(machineType)}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={<Gauge className="h-4 w-4" />} value={formatDuration(reviewSummary.durationSec)} label={text(locale, 'Time', 'Tid')} />
              <Metric icon={<Waves className="h-4 w-4" />} value={reviewSummary.distanceMeters ? `${Math.round(reviewSummary.distanceMeters)} m` : '--'} label={text(locale, 'Distance', 'Distans')} />
              <Metric icon={<ZapMetricIcon />} value={reviewSummary.avgPower ?? '--'} label={text(locale, 'Avg W', 'Snitt W')} />
              <Metric icon={<ZapMetricIcon />} value={reviewSummary.maxPower ?? '--'} label={text(locale, 'Max W', 'Max W')} />
              <Metric icon={<Heart className="h-4 w-4" />} value={reviewSummary.avgHeartRate ?? '--'} label={text(locale, 'Avg HR', 'Snittpuls')} />
              <Metric icon={<Heart className="h-4 w-4" />} value={reviewSummary.maxHeartRate ?? '--'} label={text(locale, 'Max HR', 'Maxpuls')} />
              <Metric icon={<Flame className="h-4 w-4" />} value={reviewSummary.calories ?? '--'} label="kcal" />
              <Metric icon={<Ship className="h-4 w-4" />} value={reviewSummary.avgPace500m ? formatPace(reviewSummary.avgPace500m) : '--'} label="/500m" />
            </div>

            {analysis.bestEfforts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {analysis.bestEfforts.slice(0, 5).map((effort) => (
                  <Badge key={`${effort.type}-${effort.label}`} variant="outline">
                    {effort.label} {effort.unit === 'W' ? `${effort.value} W` : formatDuration(effort.value)}
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="quick-erg-rpe">RPE</Label>
                <Input
                  id="quick-erg-rpe"
                  type="number"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(event) => setRpe(event.target.value)}
                  placeholder="1-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-erg-notes">{text(locale, 'Notes', 'Anteckningar')}</Label>
                <Textarea
                  id="quick-erg-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={text(locale, 'How did it feel?', 'Hur kandes det?')}
                />
              </div>
            </div>

            {!canSave && phase !== 'saving' && (
              <p className="text-sm text-amber-600">
                {text(locale, 'Too short to save.', 'For kort for att sparas.')}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleReset} disabled={phase === 'saving'}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {text(locale, 'Discard', 'Kasta')}
              </Button>
              <Button onClick={() => void handleSave()} disabled={!canSave}>
                {phase === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {text(locale, 'Save session', 'Spara pass')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode
  value: ReactNode
  label: string
}) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-lg font-semibold tabular-nums">
        {icon}
        <span className="truncate">{value}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function ZapMetricIcon() {
  return <Gauge className="h-4 w-4" />
}
