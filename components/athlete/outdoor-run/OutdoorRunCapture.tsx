'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  AlertTriangle,
  Bluetooth,
  CheckCircle2,
  Clock,
  Heart,
  Loader2,
  MapPin,
  Play,
  RotateCcw,
  Save,
  Satellite,
  ShieldCheck,
  Square,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import { useHeartRateBand } from '@/hooks/use-heart-rate-band'
import { useRunGps } from '@/hooks/use-run-gps'
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBasePath } from '@/lib/contexts/BasePathContext'
import {
  buildPhoneRunSessionAnalysis,
  formatRunPace,
  type PhoneRunAnalysis,
  type PhoneRunRawSample,
} from '@/lib/outdoor-run/session-summary'

type Phase = 'idle' | 'recording' | 'review' | 'saving'
type AppLocale = 'en' | 'sv'

const DRAFT_KEY = 'outdoor-run:draft:v1'
const DRAFT_EVENT = 'outdoor-run-draft-changed'

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

function formatDistance(meters?: number): string {
  if (!meters || meters < 1) return '--'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(2)} km`
}

function getDraftSnapshot(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage.getItem(DRAFT_KEY))
}

function subscribeDraftSnapshot(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('storage', onStoreChange)
  window.addEventListener(DRAFT_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(DRAFT_EVENT, onStoreChange)
  }
}

function notifyDraftChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(DRAFT_EVENT))
}

export function OutdoorRunCapture() {
  const router = useRouter()
  const basePath = useBasePath()
  const locale = (useLocale() === 'sv' ? 'sv' : 'en') as AppLocale

  const [phase, setPhase] = useState<Phase>('idle')
  const [samples, setSamples] = useState<PhoneRunRawSample[]>([])
  const [analysis, setAnalysis] = useState<PhoneRunAnalysis | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [completedAt, setCompletedAt] = useState<Date | null>(null)
  const [rpe, setRpe] = useState('')
  const [notes, setNotes] = useState('')
  const hasDraft = useSyncExternalStore(subscribeDraftSnapshot, getDraftSnapshot, () => false)
  const { isActive: wakeLockActive, release: releaseWakeLock } = useScreenWakeLock({
    enabled: phase === 'recording',
  })

  const samplesRef = useRef<PhoneRunRawSample[]>([])
  const bpmRef = useRef<number | null>(null)

  const hr = useHeartRateBand((bpm) => {
    bpmRef.current = bpm
  })

  const addSample = useCallback((sample: PhoneRunRawSample) => {
    samplesRef.current = [...samplesRef.current, sample]
    const nextAnalysis = buildPhoneRunSessionAnalysis(samplesRef.current)
    setSamples(samplesRef.current)
    setAnalysis(nextAnalysis)
  }, [])

  const gps = useRunGps(addSample)
  const {
    isSupported: gpsSupported,
    status: gpsStatus,
    latest: latestGps,
    error: gpsError,
    start: startGps,
    stop: stopGps,
  } = gps

  useEffect(() => {
    if (typeof window === 'undefined' || phase !== 'recording' || !startedAt) return

    const id = window.setInterval(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        startedAt: startedAt.toISOString(),
        samples: samplesRef.current,
      }))
      notifyDraftChanged()
    }, 5000)

    return () => window.clearInterval(id)
  }, [phase, startedAt])

  useEffect(() => {
    return () => {
      stopGps()
      void releaseWakeLock()
    }
  }, [releaseWakeLock, stopGps])

  const beginRun = useCallback(() => {
    const now = new Date()
    samplesRef.current = []
    setSamples([])
    setAnalysis(null)
    setStartedAt(now)
    setCompletedAt(null)
    setRpe('')
    setNotes('')
    setPhase('recording')
    startGps(now, () => bpmRef.current)
  }, [startGps])

  const stopRun = useCallback(async () => {
    stopGps()
    await releaseWakeLock()
    const doneAt = new Date()
    const nextAnalysis = buildPhoneRunSessionAnalysis(samplesRef.current)
    setCompletedAt(doneAt)
    setAnalysis(nextAnalysis)
    setPhase('review')
  }, [releaseWakeLock, stopGps])

  const reset = useCallback(() => {
    stopGps()
    void releaseWakeLock()
    samplesRef.current = []
    bpmRef.current = null
    setSamples([])
    setAnalysis(null)
    setStartedAt(null)
    setCompletedAt(null)
    setRpe('')
    setNotes('')
    setPhase('idle')
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_KEY)
      notifyDraftChanged()
    }
  }, [releaseWakeLock, stopGps])

  const restoreDraft = useCallback(() => {
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as { startedAt?: string; samples?: PhoneRunRawSample[] }
      if (!parsed.startedAt || !Array.isArray(parsed.samples)) return
      samplesRef.current = parsed.samples
      setSamples(parsed.samples)
      setStartedAt(new Date(parsed.startedAt))
      setCompletedAt(new Date())
      setAnalysis(buildPhoneRunSessionAnalysis(parsed.samples))
      setPhase('review')
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
      notifyDraftChanged()
    }
  }, [])

  const save = useCallback(async () => {
    if (!analysis || !startedAt || !completedAt) return

    setPhase('saving')

    try {
      const response = await fetch('/api/athlete/phone-run-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'ANDROID_CHROME_PWA',
          deviceName: hr.deviceName,
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          samples,
          rpe: rpe ? Number(rpe) : undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || text(locale, 'Could not save run', 'Kunde inte spara lopningen'))
      }

      toast.success(text(locale, 'Run saved', 'Lopningen har sparats'))
      reset()
      router.push(`${basePath}/athlete/dashboard`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Could not save run', 'Kunde inte spara lopningen'))
      setPhase('review')
    }
  }, [analysis, basePath, completedAt, hr.deviceName, locale, notes, reset, router, rpe, samples, startedAt])

  const liveSummary = analysis?.summary
  const canSave = !!analysis && analysis.summary.durationSec >= 10 && analysis.summary.distanceMeters >= 20 && phase !== 'saving'
  const isHrConnecting = hr.status === 'connecting' || hr.status === 'reconnecting'
  const hrConnected = hr.status === 'connected'
  const gpsIssue = gpsStatus === 'error' ? gpsError : null

  const gpsAccuracy = useMemo(() => {
    const latest = latestGps
    if (!latest?.accuracy) return null
    return Math.round(latest.accuracy)
  }, [latestGps])

  if (!gpsSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {text(locale, 'GPS recording unavailable', 'GPS-inspelning inte tillganglig')}
          </CardTitle>
          <CardDescription>
            {text(locale, 'Use Chrome on an Android phone for this first version.', 'Anvand Chrome pa en Android-telefon for forsta versionen.')}
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
              <MapPin className="h-5 w-5" />
              {text(locale, 'Record run', 'Spela in lopning')}
            </CardTitle>
            <CardDescription>
              {text(locale, 'GPS pace and distance with optional Bluetooth heart rate.', 'GPS-fart och distans med valfri Bluetooth-puls.')}
            </CardDescription>
          </div>
          <Badge variant={phase === 'recording' ? 'default' : 'secondary'}>
            {phase === 'recording'
              ? text(locale, 'Recording', 'Spelar in')
              : phase === 'review' || phase === 'saving'
                ? text(locale, 'Review', 'Granska')
                : text(locale, 'Ready', 'Redo')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {phase === 'idle' && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatusTile
                icon={<Satellite className="h-4 w-4" />}
                label={text(locale, 'GPS', 'GPS')}
                value={text(locale, 'Available', 'Tillganglig')}
              />
              <StatusTile
                icon={<Heart className="h-4 w-4" />}
                label={text(locale, 'Heart rate', 'Puls')}
                value={hrConnected
                  ? hr.bpm
                    ? `${hr.bpm} bpm`
                    : hr.deviceName || text(locale, 'Connected', 'Ansluten')
                  : text(locale, 'Optional', 'Valfri')}
              />
            </div>

            {hr.isSupported ? (
              <Button variant="outline" className="w-full" onClick={() => void hr.connect()} disabled={isHrConnecting || hrConnected}>
                {isHrConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bluetooth className="mr-2 h-4 w-4" />}
                {hrConnected
                  ? hr.deviceName || text(locale, 'Heart-rate belt connected', 'Pulsband anslutet')
                  : text(locale, 'Connect heart-rate belt', 'Anslut pulsband')}
              </Button>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {text(locale, 'Bluetooth heart rate needs Chrome on Android.', 'Bluetooth-puls kraver Chrome pa Android.')}
              </div>
            )}

            {hasDraft && (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
                <div className="text-sm">
                  <p className="font-medium">{text(locale, 'Unsaved run found', 'Osparad lopning hittad')}</p>
                  <p className="text-muted-foreground">{text(locale, 'Review it before starting a new one.', 'Granska den innan du startar en ny.')}</p>
                </div>
                <Button variant="outline" onClick={restoreDraft}>
                  {text(locale, 'Review', 'Granska')}
                </Button>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={() => void beginRun()}>
              <Play className="mr-2 h-4 w-4" />
              {text(locale, 'Start run', 'Starta lopning')}
            </Button>
          </div>
        )}

        {phase === 'recording' && !liveSummary && (
          <div className="flex items-center justify-center gap-2 rounded-md bg-muted/50 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {text(locale, 'Waiting for GPS...', 'Vantar pa GPS...')}
          </div>
        )}

        {phase === 'recording' && liveSummary && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums">
                {formatRunPace(liveSummary.avgPaceSecPerKm)}
              </div>
              <div className="text-sm text-muted-foreground">/km</div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={<Clock className="h-4 w-4" />} value={formatDuration(liveSummary.durationSec)} label={text(locale, 'Time', 'Tid')} />
              <Metric icon={<MapPin className="h-4 w-4" />} value={formatDistance(liveSummary.distanceMeters)} label={text(locale, 'Distance', 'Distans')} />
              <Metric icon={<Heart className="h-4 w-4" />} value={hr.bpm ?? liveSummary.avgHeartRate ?? '--'} label="bpm" />
              <Metric icon={<TrendingUp className="h-4 w-4" />} value={liveSummary.avgSpeedMps ? (liveSummary.avgSpeedMps * 3.6).toFixed(1) : '--'} label="km/h" />
            </div>

            <div className="flex flex-wrap gap-2">
              {gpsAccuracy !== null && (
                <Badge variant="outline">
                  {text(locale, 'GPS', 'GPS')} +/- {gpsAccuracy} m
                </Badge>
              )}
              {wakeLockActive && (
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {text(locale, 'Screen awake', 'Skarm aktiv')}
                </Badge>
              )}
              <Badge variant={hrConnected ? 'default' : 'secondary'}>
                {hrConnected ? text(locale, 'HR connected', 'Puls ansluten') : text(locale, 'No HR belt', 'Inget pulsband')}
              </Badge>
            </div>

            {gpsIssue && (
              <p className="text-sm text-amber-600">{gpsIssue}</p>
            )}

            <Button variant="destructive" className="w-full" onClick={() => void stopRun()}>
              <Square className="mr-2 h-4 w-4" />
              {text(locale, 'Stop', 'Stoppa')}
            </Button>
          </div>
        )}

        {(phase === 'review' || phase === 'saving') && liveSummary && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {text(locale, 'Outdoor run', 'Utomhuslopning')}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={<Clock className="h-4 w-4" />} value={formatDuration(liveSummary.durationSec)} label={text(locale, 'Time', 'Tid')} />
              <Metric icon={<MapPin className="h-4 w-4" />} value={formatDistance(liveSummary.distanceMeters)} label={text(locale, 'Distance', 'Distans')} />
              <Metric icon={<TrendingUp className="h-4 w-4" />} value={formatRunPace(liveSummary.avgPaceSecPerKm)} label="/km" />
              <Metric icon={<Heart className="h-4 w-4" />} value={liveSummary.avgHeartRate ?? '--'} label={text(locale, 'Avg HR', 'Snittpuls')} />
              <Metric icon={<Heart className="h-4 w-4" />} value={liveSummary.maxHeartRate ?? '--'} label={text(locale, 'Max HR', 'Maxpuls')} />
              <Metric icon={<Satellite className="h-4 w-4" />} value={liveSummary.sampleCount} label={text(locale, 'GPS points', 'GPS-punkter')} />
              <Metric icon={<MapPin className="h-4 w-4" />} value={analysis?.splits.length ?? 0} label={text(locale, 'Splits', 'Splits')} />
              <Metric icon={<TrendingUp className="h-4 w-4" />} value={liveSummary.elevationGainMeters ? `${liveSummary.elevationGainMeters} m` : '--'} label={text(locale, 'Climb', 'Hojdmeter')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="run-rpe">RPE</Label>
                <Input
                  id="run-rpe"
                  type="number"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(event) => setRpe(event.target.value)}
                  placeholder="1-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="run-notes">{text(locale, 'Notes', 'Anteckningar')}</Label>
                <Textarea
                  id="run-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={text(locale, 'How did it feel?', 'Hur kandes det?')}
                />
              </div>
            </div>

            {!canSave && phase !== 'saving' && (
              <p className="text-sm text-amber-600">
                {text(locale, 'Run is too short to save.', 'Lopningen ar for kort for att sparas.')}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={reset} disabled={phase === 'saving'}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {text(locale, 'Discard', 'Kasta')}
              </Button>
              <Button onClick={() => void save()} disabled={!canSave}>
                {phase === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {text(locale, 'Save run', 'Spara lopning')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
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
