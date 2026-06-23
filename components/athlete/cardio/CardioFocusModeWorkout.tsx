'use client'

/**
 * CardioFocusModeWorkout Component
 *
 * Full-screen cardio workout execution with segment-by-segment progression.
 */


import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Activity,
  Clock,
  Headphones,
  HeadphoneOff,
  Bluetooth,
  Gauge,
  Heart,
  ShieldCheck,
  MessageSquareText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IntervalTimer } from './IntervalTimer'
import { SegmentLoggingForm } from './SegmentLoggingForm'
import {
  resolveSegmentPower,
  equipmentUsesPower,
  equipmentIsRowing,
  equipmentIsAirbike,
  equipmentIsConcept2,
} from '@/lib/cardio/focus-mode-segments'
import {
  useVoiceCoach,
  buildSegmentStartCue,
  buildSegmentCompleteCue,
  buildSessionCompleteCue,
} from '@/hooks/use-voice-coach'
import { useLiveVoiceCoach } from '@/hooks/use-live-voice-coach'
import type {
  LiveMachineMetrics,
  LivePerformanceSnapshot,
  LivePostWorkoutDebrief,
} from '@/lib/ai/live-voice-coaching/types'
import { useAthleteHR } from '@/hooks/use-athlete-hr'
import { useErgFleet } from '@/hooks/use-erg-fleet'
import { useHeartRateBand } from '@/hooks/use-heart-rate-band'
import { useLivePowerPush } from '@/hooks/use-live-power-push'
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock'
import { WattbikeClient } from '@/lib/integrations/wattbike'
import { ErgMachinePanel, ergEquipmentLabel } from './ErgMachinePanel'
import { ZONE_COLORS, type LiveHRMachineType } from '@/lib/live-hr/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LiveVoiceCoachButton } from './LiveVoiceCoachButton'
import { useTranslations, useLocale } from '@/i18n/client'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS' | 'CORE' | 'PREHAB' | 'PLYOMETRIC'

interface FocusModeSegment {
  id: string
  index: number
  type: SegmentType
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  plannedCalories?: number
  plannedPower?: number
  powerRelPercent?: number
  powerRelTo?: 'OPENER' | 'FTP' | 'CP'
  isBenchmark?: boolean
  equipment?: string
  notes?: string
  actualDuration?: number
  actualDistance?: number
  actualPace?: number
  actualAvgHR?: number
  actualMaxHR?: number
  actualAvgPower?: number
  actualMaxPower?: number
  actualCalories?: number
  completed: boolean
  skipped: boolean
  logId?: string
}

interface CardioFocusModeWorkoutProps {
  assignmentId: string
  sessionName: string
  sessionDescription?: string
  sport: string
  segments: FocusModeSegment[]
  /** Athlete HR zones for the live band display (lactate test or %-of-max). */
  hrZones?: {
    source: 'LACTATE_TEST' | 'MAX_HR_PERCENT'
    maxHr: number
    zones: Array<{ zone: number; hrMin: number; hrMax: number }>
  }
  initialSegmentIndex?: number
  autoStartFirstTimedSegment?: boolean
  onClose: () => void
  onComplete: (data: { sessionRPE: number; notes?: string }) => void
  onSegmentComplete: (
    segmentIndex: number,
    data: {
      actualDuration?: number
      actualDistance?: number
      actualPace?: number
      actualAvgHR?: number
      actualMaxHR?: number
      actualAvgPower?: number
      actualMaxPower?: number
      actualCalories?: number
      completed: boolean
      skipped: boolean
      notes?: string
      // Wall-clock effort window + 1 Hz watt samples, for aligning the log
      // with watch HR streams and power charts.
      startedAt?: string
      completedAt?: string
      powerSamples?: (number | null)[]
    }
  ) => Promise<void>
}

const SEGMENT_COLORS: Record<SegmentType, string> = {
  WARMUP: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  COOLDOWN: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  INTERVAL: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  STEADY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  RECOVERY: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
  HILL: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  DRILLS: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  CORE: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  PREHAB: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
  PLYOMETRIC: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
}

type ViewState = 'timer' | 'logging' | 'complete'

function isWorkType(type?: string): boolean {
  return type === 'INTERVAL' || type === 'STEADY' || type === 'HILL'
}

function liveMachineTypeForEquipment(equipment?: string | null): LiveHRMachineType | undefined {
  if (equipment === 'ROW') return 'CONCEPT2_ROW'
  if (equipment === 'SKI_ERG') return 'CONCEPT2_SKIERG'
  if (equipment === 'BIKE_ERG') return 'CONCEPT2_BIKEERG'
  if (equipment === 'WATTBIKE') return 'WATTBIKE'
  return undefined
}

export function CardioFocusModeWorkout({
  assignmentId,
  sessionName,
  sessionDescription: _sessionDescription,
  sport: _sport,
  segments: initialSegments,
  hrZones,
  initialSegmentIndex = 0,
  autoStartFirstTimedSegment = false,
  onClose,
  onComplete,
  onSegmentComplete,
}: CardioFocusModeWorkoutProps) {
  const t = useTranslations('components.cardioFocusModeWorkout')
  const [segments, setSegments] = useState<FocusModeSegment[]>(initialSegments)
  const [currentIndex, setCurrentIndex] = useState(initialSegmentIndex)
  const [viewState, setViewState] = useState<ViewState>('timer')
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [sessionRPE, setSessionRPE] = useState(5)
  const [sessionNotes, setSessionNotes] = useState('')
  const [painMentioned, setPainMentioned] = useState(false)
  const [painDetails, setPainDetails] = useState('')
  const [debriefCapturedAt, setDebriefCapturedAt] = useState<string | null>(null)
  const debriefPromptSentRef = useRef(false)
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isActive: screenAwake } = useScreenWakeLock()
  // A fresh power workout opens on a machine-connection screen instead of the
  // first timer, so every erg is connected BEFORE the clock starts. Resumed
  // sessions and non-power workouts go straight to the timer as before.
  const startsWithSetup =
    initialSegmentIndex === 0 &&
    WattbikeClient.isSupported() &&
    initialSegments.every((s) => !s.completed && !s.skipped) &&
    initialSegments.some(
      (s) =>
        equipmentUsesPower(s.equipment) ||
        s.plannedPower != null ||
        s.powerRelPercent != null ||
        s.isBenchmark === true
    )
  const [preStartSetup, setPreStartSetup] = useState(startsWithSetup)
  // Mid-session machine management (swap / late-connect) in a dialog overlay.
  const [manageMachinesOpen, setManageMachinesOpen] = useState(false)
  // Whether the current segment's timer should auto-start. True during natural
  // progression (after logging a work interval, and after a rest auto-completes),
  // false on manual navigation/skip. Held back while the setup screen shows.
  const [autoRunTimer, setAutoRunTimer] = useState(autoStartFirstTimedSegment && !startsWithSetup)

  // Voice coaching (basic SpeechSynthesis)
  const voice = useVoiceCoach({ rate: 1.05 })

  // Timer state exposed for live voice coach
  const [timerState, setTimerState] = useState<{ seconds: number; isRunning: boolean }>({ seconds: 0, isRunning: false })
  const [forcePaused, setForcePaused] = useState<boolean | undefined>(undefined)
  const [timerAdjustment, setTimerAdjustment] = useState<{ id: number; seconds: number } | null>(null)
  const timerAdjustmentIdRef = useRef(0)
  const [powerAdjustmentPctBySegment, setPowerAdjustmentPctBySegment] = useState<Record<number, number>>({})

  // Live HR feed (only polls when live coach is connected)
  const [pollLiveHr, setPollLiveHr] = useState(false)
  const hr = useAthleteHR(pollLiveHr)

  // Live erg power (focus-mode): Wattbike/FTMS bikes, airbikes, and Concept2
  // PM5 ergs (row/ski) all stream through the same client type. A mixed-erg
  // workout connects one machine per equipment slot; the active segment's
  // equipment picks which machine drives the strip, accumulation and ERG.
  // tw() handles the few new strings without touching the shared catalogs.
  const locale = useLocale()
  const tw = (sv: string, en: string) => (locale === 'sv' ? sv : en)

  // Does this workout involve power at all? Gates the whole live-erg strip.
  const usesPower = segments.some(
    (s) =>
      equipmentUsesPower(s.equipment) ||
      s.plannedPower != null ||
      s.powerRelPercent != null ||
      s.isBenchmark === true
  )

  // One connection slot per distinct power equipment ('' = unspecified machine,
  // e.g. legacy Wattbike sessions that only set watt targets).
  const slotKeys = useMemo(() => {
    if (!usesPower) return []
    const keys: string[] = []
    for (const s of segments) {
      if (s.equipment && equipmentUsesPower(s.equipment) && !keys.includes(s.equipment)) {
        keys.push(s.equipment)
      }
    }
    if (keys.length === 0) keys.push('')
    return keys
  }, [segments, usesPower])

  const fleet = useErgFleet(slotKeys)
  const [ergEnabled, setErgEnabled] = useState(true)
  // BLE heart-rate band (chest strap / broadcasting watch) — live bpm on the
  // strip and per-segment avg/max HR into the logs.
  const segHrRef = useRef<number[]>([])
  const hrBand = useHeartRateBand((bpm) => {
    if (accumulatingRef.current) segHrRef.current.push(bpm)
  })
  const [measuredForForm, setMeasuredForForm] = useState<{
    actualAvgPower?: number
    actualMaxPower?: number
    actualDistance?: number
    actualCalories?: number
    actualAvgHR?: number
    actualMaxHR?: number
  }>({})
  const segPowerRef = useRef<number[]>([])
  const segMaxRef = useRef(0)
  // Rower distance is cumulative for the session; the segment's metres are the
  // delta between the first and last sample seen while accumulating.
  const segDistStartRef = useRef<number | null>(null)
  const segDistLastRef = useRef<number | null>(null)
  // Machine calories are cumulative too. The live per-segment kcal is kept in
  // state tagged with its segment index, so a stale value never renders after
  // advancing (state is only ever written from the BLE data callback).
  const segCalStartRef = useRef<number | null>(null)
  const segCalLastRef = useRef<number | null>(null)
  const currentIndexRef = useRef(initialSegmentIndex)
  const [calLive, setCalLive] = useState<{ idx: number; kcal: number } | null>(null)
  const [powerAvgLive, setPowerAvgLive] = useState<{ idx: number; avg: number } | null>(null)
  const accumulatingRef = useRef(false)
  // Wall-clock window of the current segment's effort (timer start → complete),
  // and 1 Hz watt samples bucketed by second within it. Captured so logs can be
  // aligned with a simultaneously-recorded watch HR stream.
  const segWindowRef = useRef<{ startedAt: number | null; endedAt: number | null }>({
    startedAt: null,
    endedAt: null,
  })
  const segSamplesRef = useRef<(number | null)[]>([])
  // Window + samples captured at timer completion, so a form submitted after a
  // folded rest countdown still reports the effort's true end time.
  const pendingWindowRef = useRef<{
    startedAt?: string
    completedAt: string
    powerSamples?: (number | null)[]
  } | null>(null)

  const currentSegment = segments[currentIndex]
  const completedCount = segments.filter((s) => s.completed || s.skipped).length
  const progressPercent = segments.length > 0 ? (completedCount / segments.length) * 100 : 0

  // The machine behind the current segment's equipment (or the only one connected).
  const activeDevice = fleet.deviceFor(currentSegment?.equipment)
  const activeClient = activeDevice?.client ?? null
  const activeConnected = activeDevice?.status === 'connected'
  const liveMachineType = liveMachineTypeForEquipment(activeDevice?.slot || currentSegment?.equipment)
  // Stream power to the coach's live team grid when the athlete is in a session.
  const { activeSessionId: liveSessionId } = useLivePowerPush(activeClient, activeConnected, liveMachineType)

  // Current band HR mapped onto the athlete's zones (lactate-test zones when
  // available, otherwise Garmin %-of-max bands) for the colored strip display.
  const liveHrZone = (() => {
    if (hrBand.bpm == null || !hrZones?.zones?.length) return null
    for (const z of hrZones.zones) {
      if (hrBand.bpm <= z.hrMax) return z.zone
    }
    return hrZones.zones[hrZones.zones.length - 1].zone
  })()
  const liveHrColor = liveHrZone != null
    ? ZONE_COLORS[liveHrZone as keyof typeof ZONE_COLORS] ?? '#EF4444'
    : '#EF4444'

  // The opener (benchmark) segment's logged average watts — anchors relative % targets.
  const openerPower = segments.find((s) => s.isBenchmark)?.actualAvgPower

  // Resolve the current segment's power target (absolute, or % of the logged opener).
  const resolvedPower = currentSegment
    ? resolveSegmentPower(currentSegment, openerPower)
    : {}
  const baseTargetPower = resolvedPower.watts
  const currentPowerAdjustmentPct = powerAdjustmentPctBySegment[currentIndex] ?? 0
  const currentTargetPower = typeof baseTargetPower === 'number'
    ? Math.max(1, Math.round(baseTargetPower * (1 + currentPowerAdjustmentPct / 100)))
    : baseTargetPower
  const currentTargetPowerPending = resolvedPower.pendingLabel

  // After a work effort the "rest between rounds" runs as a single auto-advancing
  // countdown on the log form: the athlete logs the finished effort while the rest
  // ticks the full length down (e.g. 60→0), then it auto-submits and the next
  // round's first interval auto-starts.
  const followingRestSeconds = segments[currentIndex + 1]?.type === 'RECOVERY'
    ? (segments[currentIndex + 1]?.plannedDuration ?? 0)
    : 0
  const restCountdownForForm = followingRestSeconds > 0 ? followingRestSeconds : undefined

  // Name the connect button after the workout's equipment so a rowing session
  // doesn't ask the athlete to "connect Wattbike". With several slots the
  // button opens the machine panel instead of connecting directly.
  const connectLabel =
    slotKeys.length > 1
      ? tw('Anslut maskiner', 'Connect machines')
      : segments.some((s) => equipmentIsConcept2(s.equipment))
        ? tw('Anslut Concept2 (PM5)', 'Connect Concept2 (PM5)')
        : segments.some((s) => equipmentIsAirbike(s.equipment))
          ? tw('Anslut airbike', 'Connect airbike')
          : tw('Anslut Wattbike', 'Connect Wattbike')

  // Watts, rower metres, kcal and band HR measured for the current segment's effort.
  const segmentMeasured = useCallback((): {
    actualAvgPower?: number
    actualMaxPower?: number
    actualDistance?: number
    actualCalories?: number
    actualAvgHR?: number
    actualMaxHR?: number
  } => {
    const out: {
      actualAvgPower?: number
      actualMaxPower?: number
      actualDistance?: number
      actualCalories?: number
      actualAvgHR?: number
      actualMaxHR?: number
    } = {}
    const arr = segPowerRef.current
    if (arr.length > 0) {
      out.actualAvgPower = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      out.actualMaxPower = Math.round(segMaxRef.current)
    }
    const start = segDistStartRef.current
    const last = segDistLastRef.current
    if (start != null && last != null && last > start) {
      out.actualDistance = Math.round(last - start) / 1000 // metres → km
    }
    const calStart = segCalStartRef.current
    const calLast = segCalLastRef.current
    if (calStart != null && calLast != null && calLast > calStart) {
      out.actualCalories = Math.round(calLast - calStart)
    }
    const hrSamples = segHrRef.current
    if (hrSamples.length > 0) {
      out.actualAvgHR = Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length)
      out.actualMaxHR = Math.max(...hrSamples)
    }
    return out
  }, [])

  // Snapshot the effort's wall-clock window + watt series for the log payload.
  const segmentWindow = useCallback((): {
    startedAt?: string
    completedAt: string
    powerSamples?: (number | null)[]
  } => {
    const startedMs = segWindowRef.current.startedAt
    const endedMs = segWindowRef.current.endedAt ?? Date.now()
    const samples = segSamplesRef.current
    return {
      ...(startedMs != null ? { startedAt: new Date(startedMs).toISOString() } : {}),
      completedAt: new Date(endedMs).toISOString(),
      ...(samples.length > 0
        ? { powerSamples: samples.map((v) => (v == null ? null : Math.round(v))) }
        : {}),
    }
  }, [])

  // Subscribe to the active machine's stream; collect samples only during a
  // work effort. Re-subscribes when the segment routes to another machine.
  useEffect(() => {
    if (!activeClient) return
    // Distance and calories are cumulative per machine — a device swap
    // mid-segment must restart the deltas from the new machine's counters.
    segDistStartRef.current = null
    segDistLastRef.current = null
    segCalStartRef.current = null
    segCalLastRef.current = null
    const off = activeClient.on('data', (s) => {
      if (!accumulatingRef.current) return
      if (typeof s.power === 'number') {
        segPowerRef.current.push(s.power)
        if (s.power > segMaxRef.current) segMaxRef.current = s.power
        // 1 Hz series bucketed by second since the timer started (last sample
        // in a second wins; missed seconds stay null).
        const startedAt = segWindowRef.current.startedAt
        if (startedAt != null) {
          const sec = Math.floor((Date.now() - startedAt) / 1000)
          if (sec >= 0 && sec < 3600) {
            const samples = segSamplesRef.current
            while (samples.length < sec) samples.push(null)
            samples[sec] = s.power
          }
        }
      }
      // Only rower/PM5 distance is trusted (it IS the machine's metric); FTMS
      // bike distance is virtual/speed-derived, so it stays manual there.
      if ((s.source === 'ftms-rower' || s.source === 'pm5') && typeof s.distance === 'number') {
        if (segDistStartRef.current == null) segDistStartRef.current = s.distance
        segDistLastRef.current = s.distance
      }
      if (typeof s.calories === 'number') {
        if (segCalStartRef.current == null) segCalStartRef.current = s.calories
        segCalLastRef.current = s.calories
        const kcal = Math.max(0, Math.round(s.calories - segCalStartRef.current))
        const idx = currentIndexRef.current
        setCalLive((prev) => (prev?.idx === idx && prev.kcal === kcal ? prev : { idx, kcal }))
      }
      // Segment-average watts for the live strip (state only changes when the
      // rounded average moves, so this settles quickly).
      const powerArr = segPowerRef.current
      if (powerArr.length > 0) {
        const avg = Math.round(powerArr.reduce((a, b) => a + b, 0) / powerArr.length)
        const idx = currentIndexRef.current
        setPowerAvgLive((prev) => (prev?.idx === idx && prev.avg === avg ? prev : { idx, avg }))
      }
    })
    return off
  }, [activeClient])

  // Only accumulate while a work segment's timer is on screen.
  useEffect(() => {
    accumulatingRef.current =
      activeConnected && viewState === 'timer' && isWorkType(currentSegment?.type)
  }, [activeConnected, viewState, currentIndex, currentSegment])

  // Reset the per-segment accumulator when the segment changes.
  useEffect(() => {
    segPowerRef.current = []
    segMaxRef.current = 0
    segDistStartRef.current = null
    segDistLastRef.current = null
    segCalStartRef.current = null
    segCalLastRef.current = null
    currentIndexRef.current = currentIndex
    segWindowRef.current = { startedAt: null, endedAt: null }
    segSamplesRef.current = []
    segHrRef.current = []
  }, [currentIndex])

  // Stamp the segment's wall-clock start the moment its timer begins running.
  useEffect(() => {
    if (viewState === 'timer' && timerState.isRunning && segWindowRef.current.startedAt == null) {
      segWindowRef.current.startedAt = Date.now()
    }
  }, [viewState, timerState.isRunning])

  // Duration-less efforts ("16 cal for time") have no IntervalTimer: stamp the
  // window start on entry and tick an elapsed display, so time-to-target is
  // both visible and recorded.
  const [elapsedDisplay, setElapsedDisplay] = useState(0)
  useEffect(() => {
    if (preStartSetup || viewState !== 'timer' || currentSegment?.plannedDuration) return
    if (segWindowRef.current.startedAt == null) {
      segWindowRef.current.startedAt = Date.now()
    }
    const started = segWindowRef.current.startedAt
    const id = setInterval(() => {
      setElapsedDisplay(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    }, 500)
    return () => {
      clearInterval(id)
      setElapsedDisplay(0)
    }
  }, [viewState, currentIndex, preStartSetup, currentSegment?.plannedDuration])

  // Live kcal burned in the current segment (null until the machine reports energy).
  const liveSegmentCalories = calLive && calLive.idx === currentIndex ? calLive.kcal : null
  const coachHeartRate = hrBand.bpm ?? activeDevice?.latest?.heartRate ?? hr.heartRate ?? null
  const coachHeartRateZone = liveHrZone ?? hr.zone ?? null
  const liveMachineMetrics = useMemo<LiveMachineMetrics>(() => {
    const latest = activeDevice?.latest
    const cadence = latest?.cadence ?? latest?.avgCadence ?? null
    const distanceKm =
      segDistStartRef.current != null && segDistLastRef.current != null && segDistLastRef.current >= segDistStartRef.current
        ? Math.round(segDistLastRef.current - segDistStartRef.current) / 1000
        : typeof latest?.distance === 'number'
          ? Math.round(latest.distance) / 1000
          : null

    return {
      available: activeConnected || coachHeartRate != null,
      connected: activeConnected,
      equipment: activeDevice?.slot || currentSegment?.equipment || null,
      machineType: liveMachineType ?? null,
      power: typeof latest?.power === 'number' ? Math.round(latest.power) : null,
      targetPower: typeof currentTargetPower === 'number' ? currentTargetPower : null,
      averagePower:
        powerAvgLive?.idx === currentIndex
          ? powerAvgLive.avg
          : typeof latest?.avgPower === 'number'
            ? Math.round(latest.avgPower)
            : null,
      maxPower: segMaxRef.current > 0 ? Math.round(segMaxRef.current) : null,
      cadence: typeof cadence === 'number' ? Math.round(cadence) : null,
      strokeRate: typeof latest?.strokeRate === 'number' ? Math.round(latest.strokeRate) : null,
      paceSeconds: typeof latest?.pace === 'number' ? Math.round(latest.pace) : null,
      distanceKm,
      calories: liveSegmentCalories,
      targetCalories: currentSegment?.plannedCalories ?? null,
      heartRate: coachHeartRate,
      heartRateZone: coachHeartRateZone,
      segmentIndex: currentIndex,
      segmentTypeName: currentSegment?.typeName,
      timeRemainingSeconds: timerState.seconds,
      isTimerRunning: timerState.isRunning,
    }
  }, [
    activeConnected,
    activeDevice?.slot,
    activeDevice?.latest,
    currentSegment?.equipment,
    currentSegment?.plannedCalories,
    currentSegment?.typeName,
    liveMachineType,
    currentTargetPower,
    powerAvgLive,
    currentIndex,
    liveSegmentCalories,
    coachHeartRate,
    coachHeartRateZone,
    timerState.seconds,
    timerState.isRunning,
  ])
  const postWorkoutDebrief = useMemo<LivePostWorkoutDebrief>(() => ({
    sessionRpe: sessionRPE,
    notes: sessionNotes.trim() || null,
    painMentioned,
    painDetails: painMentioned ? painDetails.trim() || null : null,
    capturedAt: debriefCapturedAt ?? undefined,
  }), [sessionRPE, sessionNotes, painMentioned, painDetails, debriefCapturedAt])
  const performanceSnapshot = useMemo<LivePerformanceSnapshot>(() => {
    const completedSegments = segments.filter((s) => s.completed).length
    const skippedSegments = segments.filter((s) => s.skipped).length
    const powerSegments = segments.filter((s) => typeof s.actualAvgPower === 'number')
    const hrSegments = segments.filter((s) => typeof s.actualAvgHR === 'number')
    const maxHrSegments = segments.filter((s) => typeof s.actualMaxHR === 'number')

    return {
      workoutName: sessionName,
      sport: _sport,
      totalSegments: segments.length,
      completedSegments,
      skippedSegments,
      totalPlannedDurationSeconds: segments.reduce((sum, s) => sum + (s.plannedDuration ?? 0), 0),
      totalActualDurationSeconds: segments.reduce((sum, s) => sum + (s.actualDuration ?? 0), 0) || null,
      avgHeartRate: hrSegments.length > 0
        ? Math.round(hrSegments.reduce((sum, s) => sum + (s.actualAvgHR ?? 0), 0) / hrSegments.length)
        : null,
      maxHeartRate: maxHrSegments.length > 0
        ? Math.max(...maxHrSegments.map((s) => s.actualMaxHR ?? 0))
        : null,
      avgPower: powerSegments.length > 0
        ? Math.round(powerSegments.reduce((sum, s) => sum + (s.actualAvgPower ?? 0), 0) / powerSegments.length)
        : null,
      maxPower: segments.some((s) => typeof s.actualMaxPower === 'number')
        ? Math.max(...segments.map((s) => s.actualMaxPower ?? 0))
        : null,
      totalDistanceKm: segments.some((s) => typeof s.actualDistance === 'number')
        ? Math.round(segments.reduce((sum, s) => sum + (s.actualDistance ?? 0), 0) * 100) / 100
        : null,
      totalCalories: segments.some((s) => typeof s.actualCalories === 'number')
        ? Math.round(segments.reduce((sum, s) => sum + (s.actualCalories ?? 0), 0))
        : null,
      segments: segments.map((s, index) => {
        const resolvedSegmentPower = resolveSegmentPower(s, openerPower).watts
        return {
          index,
          typeName: s.typeName,
          completed: s.completed,
          skipped: s.skipped,
          plannedDurationSeconds: s.plannedDuration ?? null,
          actualDurationSeconds: s.actualDuration ?? null,
          plannedPower: typeof resolvedSegmentPower === 'number'
            ? resolvedSegmentPower
            : s.plannedPower ?? null,
          actualAvgPower: s.actualAvgPower ?? null,
          actualMaxPower: s.actualMaxPower ?? null,
          actualAvgHR: s.actualAvgHR ?? null,
          actualMaxHR: s.actualMaxHR ?? null,
          actualCalories: s.actualCalories ?? null,
          notes: s.notes ?? null,
        }
      }),
    }
  }, [segments, sessionName, _sport, openerPower])

  // Live AI Voice Coach (Gemini Live API)
  const liveCoach = useLiveVoiceCoach({
    assignmentId,
    segments,
    currentSegmentIndex: currentIndex,
    isTimerRunning: timerState.isRunning,
    timerSecondsRemaining: timerState.seconds,
    heartRate: coachHeartRate,
    heartRateZone: coachHeartRateZone,
    liveMetrics: liveMachineMetrics,
    postWorkoutDebrief,
    performanceSnapshot,
    toolCallbacks: {
      onSkipSegment: () => {
        if (currentIndex < segments.length - 1) {
          setCurrentIndex((prev) => prev + 1)
          setViewState('timer')
          setTimerElapsed(0)
          setForcePaused(undefined)
        }
      },
      onPauseWorkout: () => {
        setForcePaused(true)
      },
      onResumeWorkout: () => {
        setForcePaused(false)
      },
      onExtendSegment: (seconds) => {
        const safeSeconds = Math.max(5, Math.min(600, Math.round(seconds || 30)))
        timerAdjustmentIdRef.current += 1
        setTimerAdjustment({ id: timerAdjustmentIdRef.current, seconds: safeSeconds })
      },
      onMarkSegmentComplete: () => {
        handleTimerComplete()
      },
      onAdjustIntensity: (direction) => {
        if (typeof currentTargetPower !== 'number') return
        setPowerAdjustmentPctBySegment((prev) => {
          const current = prev[currentIndex] ?? 0
          const next = Math.max(-20, Math.min(20, current + (direction === 'harder' ? 5 : -5)))
          return { ...prev, [currentIndex]: next }
        })
      },
      onRecordPostWorkoutDebrief: (debrief) => {
        if (typeof debrief.sessionRpe === 'number') setSessionRPE(debrief.sessionRpe)
        if (debrief.notes) setSessionNotes(debrief.notes)
        setPainMentioned(debrief.painMentioned === true)
        setPainDetails(debrief.painDetails ?? '')
        setDebriefCapturedAt(debrief.capturedAt ?? new Date().toISOString())
      },
    },
  })
  const liveCoachActive = liveCoach.status === 'connected'

  useEffect(() => {
    setPollLiveHr((prev) => (prev === liveCoachActive ? prev : liveCoachActive))
  }, [liveCoachActive])

  // When live coach is active, disable basic voice cues
  useEffect(() => {
    if (liveCoachActive && voice.enabled) {
      voice.stop()
    }
  }, [liveCoachActive, voice])

  useEffect(() => {
    if (!showCompleteDialog) {
      debriefPromptSentRef.current = false
      return
    }
    if (!liveCoachActive || debriefPromptSentRef.current) return

    debriefPromptSentRef.current = true
    const powerText = performanceSnapshot.avgPower
      ? `avg ${performanceSnapshot.avgPower} W${performanceSnapshot.maxPower ? `, max ${performanceSnapshot.maxPower} W` : ''}`
      : 'no average power saved yet'
    const hrText = performanceSnapshot.avgHeartRate
      ? `avg HR ${performanceSnapshot.avgHeartRate}${performanceSnapshot.maxHeartRate ? `, max HR ${performanceSnapshot.maxHeartRate}` : ''}`
      : 'no heart-rate summary saved yet'

    liveCoach.sendContextMessage(
      `[POST WORKOUT DEBRIEF] The workout is complete. Ask one short debrief: session RPE 1-10, any pain/injury, and any notes for the coach. After the athlete answers, call record_post_workout_debrief. Do not claim the workout is saved; the athlete still taps Finish. Snapshot: ${performanceSnapshot.completedSegments}/${performanceSnapshot.totalSegments} segments completed, ${powerText}, ${hrText}.`
    )
  }, [showCompleteDialog, liveCoachActive, liveCoach, performanceSnapshot])

  // ERG: set the bike's resistance to the segment's target watts (opt-out via
  // toggle). Bikes with a motor brake only — airbikes and rowing ergs are
  // air-resistance, there is no target to set.
  useEffect(() => {
    if (!ergEnabled || !activeConnected || !activeDevice?.canControl || activeDevice.kind !== 'bike') return
    if (!isWorkType(currentSegment?.type) || typeof currentTargetPower !== 'number') return
    void activeDevice.client.setTargetPower(currentTargetPower).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentTargetPower, ergEnabled, activeConnected, activeDevice?.canControl, activeDevice?.kind])

  // Advance to a segment and show its timer. Auto-started intervals begin running
  // immediately — the get-ready heads-up is the "ten seconds left" cue on the
  // previous segment's timer, not a separate break.
  const goToSegment = (index: number, autoRun: boolean) => {
    setAutoRunTimer(autoRun)
    setCurrentIndex(index)
    setTimerElapsed(0)
    setViewState('timer')
  }

  // Announce segment on transition (basic voice — skip when live coach active
  // or while the machine setup screen still hides the timer)
  useEffect(() => {
    if (liveCoachActive || preStartSetup) return
    if (viewState === 'timer' && currentSegment) {
      const cue = buildSegmentStartCue(
        currentSegment,
        currentIndex + 1,
        segments.length
      )
      voice.speak(cue, 'high')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, viewState, liveCoachActive, preStartSetup])

  // Check if all segments are complete
  useEffect(() => {
    if (completedCount === segments.length && segments.length > 0) {
      if (!liveCoachActive) {
        voice.speak(buildSessionCompleteCue(), 'high')
      }
      setShowCompleteDialog(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCount, segments.length, liveCoachActive])

  // Handle timer complete - auto-advance or show the logging form
  const handleTimerComplete = useCallback(() => {
    if (segWindowRef.current.endedAt == null) segWindowRef.current.endedAt = Date.now()
    if (currentSegment?.plannedDuration) {
      setTimerElapsed(currentSegment.plannedDuration)
    }

    const nextIdx = currentIndex + 1
    const nextSeg = segments[nextIdx]
    const measured = isWorkType(currentSegment?.type) ? segmentMeasured() : {}
    const win = segmentWindow()

    // Auto-log the finished segment and roll straight into the next one (no form).
    const autoAdvance = (data: {
      completed: boolean
      skipped: boolean
      actualDuration?: number
      startedAt?: string
      completedAt?: string
      powerSamples?: (number | null)[]
      actualAvgPower?: number
      actualMaxPower?: number
      actualDistance?: number
      actualCalories?: number
      actualAvgHR?: number
      actualMaxHR?: number
    }) => {
      void onSegmentComplete(currentIndex, data).catch(() => {})
      setSegments((prev) =>
        prev.map((seg, idx) => (idx === currentIndex ? { ...seg, ...data } : seg))
      )
      if (nextIdx <= segments.length - 1) {
        setAutoRunTimer(true)
        setCurrentIndex(nextIdx)
        setTimerElapsed(0)
        setViewState('timer')
      } else {
        setShowCompleteDialog(true)
      }
    }

    // Rest/recovery: never make the athlete fill a form on a rest — auto-log and go.
    if (currentSegment?.type === 'RECOVERY') {
      autoAdvance({ completed: true, skipped: false, startedAt: win.startedAt, completedAt: win.completedAt })
      return
    }

    // Consecutive work efforts in a round flow back-to-back: the athlete moves
    // straight to the next station with no time to type, so auto-log this effort
    // and auto-start the next one immediately (no logging form, no break).
    if (isWorkType(currentSegment?.type) && isWorkType(nextSeg?.type)) {
      autoAdvance({ completed: true, skipped: false, actualDuration: currentSegment?.plannedDuration, ...measured, ...win })
      return
    }

    // Otherwise (entering a rest, a cooldown, or the end of the workout) show the
    // logging form. When a rest follows, the form runs it as the auto-advancing
    // "rest between rounds" countdown.
    if (!liveCoachActive) {
      voice.speak(buildSegmentCompleteCue(nextSeg), 'high')
    }
    pendingWindowRef.current = win
    setMeasuredForForm(measured)
    setViewState('logging')
  }, [currentSegment, currentIndex, segments, voice, liveCoachActive, onSegmentComplete, segmentMeasured, segmentWindow])

  // Handle timer skip - mark as skipped and move on
  const handleTimerSkip = useCallback(() => {
    if (segWindowRef.current.endedAt == null) segWindowRef.current.endedAt = Date.now()
    pendingWindowRef.current = segmentWindow()
    setMeasuredForForm(segmentMeasured())
    setViewState('logging')
  }, [segmentMeasured, segmentWindow])

  // Calorie-target efforts without a duration ("18 cal row") complete
  // themselves when the machine's counter reaches the target.
  const calAutoFiredRef = useRef(false)
  useEffect(() => {
    calAutoFiredRef.current = false
  }, [currentIndex])
  useEffect(() => {
    if (preStartSetup || viewState !== 'timer' || calAutoFiredRef.current) return
    const target = currentSegment?.plannedCalories
    if (!target || currentSegment?.plannedDuration || !isWorkType(currentSegment?.type)) return
    if (liveSegmentCalories != null && liveSegmentCalories >= target) {
      calAutoFiredRef.current = true
      handleTimerComplete()
    }
  }, [liveSegmentCalories, currentSegment, viewState, preStartSetup, handleTimerComplete])

  // Handle segment logging submit
  const handleSegmentSubmit = async (data: {
    actualDuration?: number
    actualDistance?: number
    actualPace?: number
    actualAvgHR?: number
    actualMaxHR?: number
    actualAvgPower?: number
    actualMaxPower?: number
    actualCalories?: number
    completed: boolean
    skipped: boolean
    notes?: string
  }) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    // Fold in machine-measured values: avg power, rower distance and calories
    // already pre-fill the form, max power has no field. The effort window was
    // snapshotted at timer completion — "now" would include the rest countdown.
    const win = pendingWindowRef.current
    const merged = {
      ...data,
      actualAvgPower: data.actualAvgPower ?? measuredForForm.actualAvgPower,
      actualMaxPower: data.actualMaxPower ?? measuredForForm.actualMaxPower,
      actualDistance: data.actualDistance ?? measuredForForm.actualDistance,
      actualCalories: data.actualCalories ?? measuredForForm.actualCalories,
      actualAvgHR: data.actualAvgHR ?? measuredForForm.actualAvgHR,
      actualMaxHR: data.actualMaxHR ?? measuredForForm.actualMaxHR,
      ...(win ?? {}),
    }

    try {
      await onSegmentComplete(currentIndex, merged)

      // Update local state
      setSegments((prev) =>
        prev.map((seg, idx) =>
          idx === currentIndex
            ? { ...seg, ...merged }
            : seg
        )
      )

      // The logging form ran the following rest as a countdown, so fold it: mark
      // the rest complete and skip straight to the next interval (which auto-starts).
      const nextSeg = segments[currentIndex + 1]
      const foldRest = nextSeg && nextSeg.type === 'RECOVERY' && nextSeg.plannedDuration ? nextSeg : null
      if (foldRest) {
        void onSegmentComplete(currentIndex + 1, {
          completed: true,
          skipped: false,
          actualDuration: foldRest.plannedDuration,
          // The folded rest ran on the log form: from the effort's end to now.
          startedAt: win?.completedAt,
          completedAt: new Date().toISOString(),
        }).catch(() => {})
        setSegments((prev) =>
          prev.map((seg, idx) =>
            idx === currentIndex + 1
              ? { ...seg, completed: true, skipped: false, actualDuration: foldRest.plannedDuration }
              : seg
          )
        )
      }

      pendingWindowRef.current = null
      const advanceTo = foldRest ? currentIndex + 2 : currentIndex + 1
      if (advanceTo <= segments.length - 1) {
        goToSegment(advanceTo, true)
      } else {
        setShowCompleteDialog(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle segment skip
  const handleSegmentSkip = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      await onSegmentComplete(currentIndex, {
        completed: false,
        skipped: true,
      })

      // Update local state
      setSegments((prev) =>
        prev.map((seg, idx) =>
          idx === currentIndex
            ? { ...seg, skipped: true, completed: false }
            : seg
        )
      )

      // Move to next segment (manual skip — don't auto-start the next timer)
      if (currentIndex < segments.length - 1) {
        goToSegment(currentIndex + 1, false)
      } else {
        setShowCompleteDialog(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle final completion
  const handleFinalComplete = () => {
    const finalNotes = [
      sessionNotes.trim(),
      painMentioned
        ? `Pain/injury mentioned${painDetails.trim() ? `: ${painDetails.trim()}` : ''}`
        : null,
    ].filter(Boolean).join('\n\n')

    liveCoach.disconnect('completed')
    onComplete({
      sessionRPE,
      notes: finalNotes || undefined,
    })
  }

  // Navigate to previous segment (manual — don't auto-start the timer)
  const goToPrevious = () => {
    if (currentIndex > 0) goToSegment(currentIndex - 1, false)
  }

  // Navigate to next segment (manual — don't auto-start the timer)
  const goToNext = () => {
    if (currentIndex < segments.length - 1) goToSegment(currentIndex + 1, false)
  }

  // Format time
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentSegment) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)} className="hover:bg-slate-100 dark:hover:bg-white/10">
          <X className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        </Button>
        <div className="text-center">
          <h1 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">{sessionName}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t('segmentCounter', { current: currentIndex + 1, total: segments.length })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {screenAwake && (
            <Badge variant="outline" className="gap-1 text-xs">
              <ShieldCheck className="h-3 w-3" />
              <span className="hidden sm:inline">{tw('Skarm aktiv', 'Screen awake')}</span>
            </Badge>
          )}
          {/* Live AI Voice Coach */}
          {liveCoach.supported && (
            <LiveVoiceCoachButton
              status={liveCoach.status}
              isListening={liveCoach.isListening}
              isSpeaking={liveCoach.isSpeaking}
              isMuted={liveCoach.isMuted}
              transcript={liveCoach.transcript}
              error={liveCoach.error}
              aiAllowanceAction={liveCoach.aiAllowanceAction}
              supported={liveCoach.supported}
              onConnect={liveCoach.connect}
              onDisconnect={liveCoach.disconnect}
              onToggleMute={liveCoach.toggleMute}
            />
          )}
          {/* Basic voice toggle (hidden when live coach is active) */}
          {!liveCoachActive && voice.supported ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={voice.toggle}
              className={cn(
                'hover:bg-slate-100 dark:hover:bg-white/10',
                voice.enabled && 'text-blue-500'
              )}
              title={voice.enabled ? t('voice.on') : t('voice.off')}
            >
              {voice.enabled ? <Headphones className="h-5 w-5" /> : <HeadphoneOff className="h-5 w-5 text-slate-400" />}
            </Button>
          ) : !liveCoach.supported && !voice.supported ? (
            <div className="w-10" />
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-white/5">
        <div className="flex items-center gap-4">
          <Progress value={progressPercent} className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-white/10" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            {completedCount}/{segments.length}
          </span>
        </div>
        {/* Segment type indicators */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 custom-scrollbar">
          {segments.map((seg, idx) => (
            <div
              key={seg.id}
              className={cn(
                'h-2 rounded-full flex-shrink-0 transition-all duration-300',
                idx < segments.length / 2 ? 'w-4' : 'w-3',
                seg.completed || seg.skipped
                  ? 'bg-emerald-500'
                  : idx === currentIndex
                    ? SEGMENT_COLORS[seg.type].split(' ')[0] // extract just the bg color logic if possible, or mapping
                    : 'bg-slate-200 dark:bg-white/10'
              )}
              style={idx === currentIndex ? {} : {}}
            />
          ))}
        </div>
      </div>

      {/* Live erg strip (bike / airbike / Concept2) — only for power workouts */}
      {usesPower && !preStartSetup && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-white/5">
          {activeConnected && activeDevice ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-1.5">
                {slotKeys.length > 1 && (
                  <span className="self-center text-xs font-bold uppercase tracking-wide text-slate-400">
                    {ergEquipmentLabel(activeDevice.slot, locale)}
                  </span>
                )}
                <Gauge className="h-4 w-4 self-center text-blue-500" />
                <span className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                  {activeDevice.latest?.power ?? 0}
                </span>
                <span className="text-xs text-slate-500">W</span>
                {typeof currentTargetPower === 'number' && (
                  <span className="text-xs text-slate-400">
                    / {currentTargetPower} W {tw('mål', 'target')}
                  </span>
                )}
                {powerAvgLive?.idx === currentIndex && powerAvgLive.avg > 0 && (
                  <span className="text-xs text-slate-400">
                    · {tw('snitt', 'avg')}{' '}
                    <span className="font-bold tabular-nums text-slate-600 dark:text-slate-300">
                      {powerAvgLive.avg} W
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                {liveSessionId && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    {tw('Live till coach', 'Live to coach')}
                  </span>
                )}
                {hrBand.bpm != null && (
                  <span
                    className="flex items-center gap-1 tabular-nums font-semibold"
                    style={{ color: liveHrColor }}
                  >
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    {hrBand.bpm}
                    {liveHrZone != null && (
                      <span
                        className="rounded px-1 text-[10px] font-black text-white"
                        style={{ backgroundColor: liveHrColor }}
                      >
                        Z{liveHrZone}
                      </span>
                    )}
                  </span>
                )}
                {liveSegmentCalories != null && (
                  <span className="tabular-nums font-semibold text-orange-500">
                    {liveSegmentCalories}
                    {currentSegment.plannedCalories != null ? `/${currentSegment.plannedCalories}` : ''} cal
                  </span>
                )}
                {activeDevice.kind === 'rower' ? (
                  <>
                    {activeDevice.latest?.pace != null && (
                      <span className="tabular-nums font-semibold">
                        {formatDuration(activeDevice.latest.pace)}
                        <span className="font-normal text-xs">/500m</span>
                      </span>
                    )}
                    {activeDevice.latest?.strokeRate != null && (
                      <span className="tabular-nums">{Math.round(activeDevice.latest.strokeRate)} spm</span>
                    )}
                  </>
                ) : (
                  activeDevice.latest?.cadence != null && (
                    <span className="tabular-nums">{Math.round(activeDevice.latest.cadence)} rpm</span>
                  )
                )}
                {activeDevice.canControl && activeDevice.kind === 'bike' && (
                  <button
                    type="button"
                    onClick={() => setErgEnabled((v) => !v)}
                    title={tw('Sätt motståndet automatiskt till målet (ERG)', 'Auto-set resistance to target (ERG)')}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-bold',
                      ergEnabled
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-white/10'
                    )}
                  >
                    ERG
                  </button>
                )}
                {fleet.isSupported && (
                  <button
                    type="button"
                    onClick={() => setManageMachinesOpen(true)}
                    title={tw('Hantera maskiner', 'Manage machines')}
                    className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <Bluetooth className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                slotKeys.length > 1
                  ? setManageMachinesOpen(true)
                  : void fleet.connectSlot(slotKeys[0] ?? '').catch(() => {})
              }
              disabled={
                !fleet.isSupported ||
                (slotKeys.length === 1 &&
                  ['connecting', 'reconnecting'].includes(fleet.devices[slotKeys[0]]?.status ?? ''))
              }
              className="w-full"
              title={
                !fleet.isSupported
                  ? tw('Live-data kräver Chrome på Android eller dator', 'Live machine data needs Chrome on Android or desktop')
                  : undefined
              }
            >
              <Bluetooth className="mr-2 h-4 w-4" />
              {slotKeys.length === 1 &&
              ['connecting', 'reconnecting'].includes(fleet.devices[slotKeys[0]]?.status ?? '')
                ? tw('Ansluter…', 'Connecting…')
                : connectLabel}
            </Button>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4">
        {preStartSetup ? (
          // Machine connection screen — the first timer mounts (and auto-starts)
          // only once the athlete taps start, so the clock never runs while
          // they're still pairing ergs.
          <ErgMachinePanel
            slots={slotKeys}
            fleet={fleet}
            hrBand={hrBand}
            variant="prestart"
            onDone={() => {
              setPreStartSetup(false)
              setAutoRunTimer(true)
            }}
          />
        ) : viewState === 'timer' && currentSegment.plannedDuration ? (
          <IntervalTimer
            key={currentSegment.id}
            duration={currentSegment.plannedDuration}
            segmentType={currentSegment.type}
            segmentNumber={currentIndex + 1}
            totalSegments={segments.length}
            targetPace={currentSegment.plannedPace}
            paceUnit={equipmentIsRowing(currentSegment.equipment) ? '/500m' : '/km'}
            targetZone={currentSegment.plannedZone}
            targetDistance={currentSegment.plannedDistance}
            targetCalories={currentSegment.plannedCalories}
            liveCalories={liveSegmentCalories ?? undefined}
            targetPower={currentTargetPower}
            targetPowerPending={currentTargetPowerPending}
            notes={currentSegment.notes}
            onComplete={handleTimerComplete}
            onSkip={handleTimerSkip}
            autoStart={autoRunTimer}
            voiceSpeak={voice.speak}
            disableVoiceCues={liveCoachActive}
            forcePaused={forcePaused}
            externalAdjustment={timerAdjustment}
            onStateChange={setTimerState}
          />
        ) : viewState === 'timer' && !currentSegment.plannedDuration ? (
          // No duration - show segment info and allow marking complete
          <div className="text-center space-y-8 max-w-sm mx-auto">
            <Badge className={cn('text-lg py-2 px-6 font-black uppercase tracking-wider', SEGMENT_COLORS[currentSegment.type])}>
              {currentSegment.typeName}
            </Badge>
            {currentSegment.plannedDistance && (
              <div className="space-y-1">
                <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {currentSegment.plannedDistance.toFixed(2)}
                </p>
                <p className="text-xl font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">km</p>
              </div>
            )}
            {currentSegment.plannedCalories && (
              // Calorie effort: count live from the machine and auto-complete at
              // the target (see the calorie effect); without a machine it's the
              // plain target + manual complete.
              <div className="space-y-1">
                <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">
                  {activeConnected && liveSegmentCalories != null ? (
                    <>
                      {liveSegmentCalories}
                      <span className="text-slate-300 dark:text-slate-600"> / {currentSegment.plannedCalories}</span>
                    </>
                  ) : (
                    currentSegment.plannedCalories
                  )}
                </p>
                <p className="text-xl font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">cal</p>
              </div>
            )}
            {isWorkType(currentSegment.type) && (
              // Elapsed stopwatch — this effort is scored by time-to-target.
              <p className="text-3xl font-bold tabular-nums text-slate-500 dark:text-slate-400">
                {formatDuration(elapsedDisplay)}
              </p>
            )}
            {currentSegment.notes && (
              <div className="bg-white/50 dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 backdrop-blur-sm">
                <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{currentSegment.notes}</p>
              </div>
            )}
            <Button size="lg" onClick={handleTimerComplete} className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {t('actions.markComplete')}
            </Button>
          </div>
        ) : (
          <SegmentLoggingForm
            key={currentSegment.id}
            segmentIndex={currentIndex}
            segmentType={currentSegment.type}
            typeName={currentSegment.typeName}
            plannedDuration={currentSegment.plannedDuration}
            plannedDistance={currentSegment.plannedDistance}
            plannedPace={currentSegment.plannedPace}
            paceUnit={equipmentIsRowing(currentSegment.equipment) ? '/500m' : '/km'}
            plannedZone={currentSegment.plannedZone}
            plannedCalories={currentSegment.plannedCalories}
            plannedPower={currentTargetPower}
            defaultAvgPower={measuredForForm.actualAvgPower}
            defaultDistance={measuredForForm.actualDistance}
            defaultCalories={measuredForForm.actualCalories}
            showPower={
              (currentSegment.type === 'INTERVAL' || currentSegment.type === 'STEADY' || currentSegment.type === 'HILL') &&
              (equipmentUsesPower(currentSegment.equipment) ||
                currentSegment.isBenchmark === true ||
                currentSegment.powerRelPercent != null ||
                currentSegment.plannedPower != null)
            }
            isBenchmark={currentSegment.isBenchmark}
            restCountdownSeconds={restCountdownForForm}
            timerDuration={timerElapsed}
            onSubmit={handleSegmentSubmit}
            onSkip={handleSegmentSkip}
          />
        )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between sticky bottom-0 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Clock className="h-4 w-4" />
          <span>
            {segments
              .slice(currentIndex)
              .reduce((sum, s) => sum + (s.plannedDuration || 0), 0) > 0
              ? formatDuration(
                segments
                  .slice(currentIndex)
                  .reduce((sum, s) => sum + (s.plannedDuration || 0), 0)
              )
              : '-'
            } {t('remaining')}
          </span>
        </div>

        <Button
          variant="secondary"
          size="icon"
          onClick={goToNext}
          disabled={currentIndex >= segments.length - 1}
          className="text-foreground"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Mid-session machine management — overlay so the running timer is untouched */}
      <Dialog open={manageMachinesOpen} onOpenChange={setManageMachinesOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">{tw('Hantera maskiner', 'Manage machines')}</DialogTitle>
          <ErgMachinePanel
            slots={slotKeys}
            fleet={fleet}
            hrBand={hrBand}
            variant="manage"
            onDone={() => setManageMachinesOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exitDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exitDialog.description', { completed: completedCount, total: segments.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('exitDialog.continue')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { liveCoach.disconnect(); onClose() }}>
              {t('exitDialog.exit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completion dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {t('completeDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('completeDialog.description', { total: segments.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {/* RPE Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {t('completeDialog.rpeQuestion')}
                </Label>
                <Badge variant="outline" className="text-lg px-3">
                  {sessionRPE}
                </Badge>
              </div>
              <Slider
                value={[sessionRPE]}
                onValueChange={([value]) => setSessionRPE(value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('rpe.easy')}</span>
                <span>{t('rpe.moderate')}</span>
                <span>{t('rpe.hard')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4" />
                {tw('Anteckningar till coachen', 'Notes for coach')}
                {debriefCapturedAt && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {tw('Röst', 'Voice')}
                  </Badge>
                )}
              </Label>
              <Textarea
                value={sessionNotes}
                onChange={(event) => setSessionNotes(event.target.value)}
                placeholder={tw('Hur kändes passet?', 'How did the workout feel?')}
                className="min-h-[90px]"
              />
            </div>

            <div className="space-y-3 rounded-md border border-slate-200 p-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cardio-pain-mentioned"
                  checked={painMentioned}
                  onCheckedChange={(checked) => setPainMentioned(checked === true)}
                />
                <Label htmlFor="cardio-pain-mentioned" className="text-sm font-medium">
                  {tw('Smärta eller skadekänning', 'Pain or injury concern')}
                </Label>
              </div>
              {painMentioned && (
                <Textarea
                  value={painDetails}
                  onChange={(event) => setPainDetails(event.target.value)}
                  placeholder={tw('Kort beskrivning', 'Brief details')}
                  className="min-h-[70px]"
                />
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleFinalComplete} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {t('actions.finishWorkout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CardioFocusModeWorkout
