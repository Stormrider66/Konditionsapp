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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IntervalTimer } from './IntervalTimer'
import { SegmentLoggingForm } from './SegmentLoggingForm'
import {
  resolveSegmentPower,
  equipmentUsesPower,
  equipmentIsRowing,
  equipmentIsAirbike,
} from '@/lib/cardio/focus-mode-segments'
import {
  useVoiceCoach,
  buildSegmentStartCue,
  buildSegmentCompleteCue,
  buildSessionCompleteCue,
} from '@/hooks/use-voice-coach'
import { useLiveVoiceCoach } from '@/hooks/use-live-voice-coach'
import { useAthleteHR } from '@/hooks/use-athlete-hr'
import { useErgFleet } from '@/hooks/use-erg-fleet'
import { useLivePowerPush } from '@/hooks/use-live-power-push'
import { WattbikeClient } from '@/lib/integrations/wattbike'
import { ErgMachinePanel, ergEquipmentLabel } from './ErgMachinePanel'
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
      completed: boolean
      skipped: boolean
      notes?: string
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

export function CardioFocusModeWorkout({
  assignmentId,
  sessionName,
  sessionDescription: _sessionDescription,
  sport: _sport,
  segments: initialSegments,
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
  const [sessionNotes, _setSessionNotes] = useState('')
  const [timerElapsed, setTimerElapsed] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Live HR feed (only polls when live coach is connected)
  const liveCoachConnectedRef = useRef(false)
  const hr = useAthleteHR(liveCoachConnectedRef.current)

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
  const [measuredForForm, setMeasuredForForm] = useState<{
    actualAvgPower?: number
    actualMaxPower?: number
    actualDistance?: number
  }>({})
  const segPowerRef = useRef<number[]>([])
  const segMaxRef = useRef(0)
  // Rower distance is cumulative for the session; the segment's metres are the
  // delta between the first and last sample seen while accumulating.
  const segDistStartRef = useRef<number | null>(null)
  const segDistLastRef = useRef<number | null>(null)
  const accumulatingRef = useRef(false)

  // Live AI Voice Coach (Gemini Live API)
  const liveCoach = useLiveVoiceCoach({
    assignmentId,
    segments,
    currentSegmentIndex: currentIndex,
    isTimerRunning: timerState.isRunning,
    timerSecondsRemaining: timerState.seconds,
    heartRate: hr.heartRate,
    heartRateZone: hr.zone,
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
      onExtendSegment: () => {
        // Timer will receive new duration on next render
      },
      onMarkSegmentComplete: () => {
        handleTimerComplete()
      },
      onAdjustIntensity: () => {
        // Noted by the AI — no direct action needed
      },
    },
  })
  const liveCoachActive = liveCoach.status === 'connected'
  liveCoachConnectedRef.current = liveCoachActive

  // When live coach is active, disable basic voice cues
  useEffect(() => {
    if (liveCoachActive && voice.enabled) {
      voice.stop()
    }
  }, [liveCoachActive, voice])

  const currentSegment = segments[currentIndex]
  const completedCount = segments.filter((s) => s.completed || s.skipped).length
  const progressPercent = segments.length > 0 ? (completedCount / segments.length) * 100 : 0

  // The machine behind the current segment's equipment (or the only one connected).
  const activeDevice = fleet.deviceFor(currentSegment?.equipment)
  const activeClient = activeDevice?.client ?? null
  const activeConnected = activeDevice?.status === 'connected'
  // Stream power to the coach's live team grid when the athlete is in a session.
  const { activeSessionId: liveSessionId } = useLivePowerPush(activeClient, activeConnected)

  // The opener (benchmark) segment's logged average watts — anchors relative % targets.
  const openerPower = segments.find((s) => s.isBenchmark)?.actualAvgPower

  // Resolve the current segment's power target (absolute, or % of the logged opener).
  const resolvedPower = currentSegment
    ? resolveSegmentPower(currentSegment, openerPower)
    : {}
  const currentTargetPower = resolvedPower.watts
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
      : segments.some((s) => equipmentIsRowing(s.equipment))
        ? tw('Anslut Concept2 (PM5)', 'Connect Concept2 (PM5)')
        : segments.some((s) => equipmentIsAirbike(s.equipment))
          ? tw('Anslut airbike', 'Connect airbike')
          : tw('Anslut Wattbike', 'Connect Wattbike')

  // Average / peak watts (and rower metres) measured for the current segment's effort.
  const segmentMeasured = useCallback((): {
    actualAvgPower?: number
    actualMaxPower?: number
    actualDistance?: number
  } => {
    const out: { actualAvgPower?: number; actualMaxPower?: number; actualDistance?: number } = {}
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
    return out
  }, [])

  // Subscribe to the active machine's stream; collect samples only during a
  // work effort. Re-subscribes when the segment routes to another machine.
  useEffect(() => {
    if (!activeClient) return
    // Distance is cumulative per machine — a device swap mid-segment must
    // restart the delta from the new machine's counter.
    segDistStartRef.current = null
    segDistLastRef.current = null
    const off = activeClient.on('data', (s) => {
      if (!accumulatingRef.current) return
      if (typeof s.power === 'number') {
        segPowerRef.current.push(s.power)
        if (s.power > segMaxRef.current) segMaxRef.current = s.power
      }
      // Only rower distance is trusted (it IS the rowing metric); bike distance
      // is virtual/speed-derived, so it stays manual there.
      if (s.source === 'ftms-rower' && typeof s.distance === 'number') {
        if (segDistStartRef.current == null) segDistStartRef.current = s.distance
        segDistLastRef.current = s.distance
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
  }, [currentIndex])

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
    if (currentSegment?.plannedDuration) {
      setTimerElapsed(currentSegment.plannedDuration)
    }

    const nextIdx = currentIndex + 1
    const nextSeg = segments[nextIdx]
    const measured = isWorkType(currentSegment?.type) ? segmentMeasured() : {}

    // Auto-log the finished segment and roll straight into the next one (no form).
    const autoAdvance = (data: { completed: boolean; skipped: boolean; actualDuration?: number }) => {
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
      autoAdvance({ completed: true, skipped: false })
      return
    }

    // Consecutive work efforts in a round flow back-to-back: the athlete moves
    // straight to the next station with no time to type, so auto-log this effort
    // and auto-start the next one immediately (no logging form, no break).
    if (isWorkType(currentSegment?.type) && isWorkType(nextSeg?.type)) {
      autoAdvance({ completed: true, skipped: false, actualDuration: currentSegment?.plannedDuration, ...measured })
      return
    }

    // Otherwise (entering a rest, a cooldown, or the end of the workout) show the
    // logging form. When a rest follows, the form runs it as the auto-advancing
    // "rest between rounds" countdown.
    if (!liveCoachActive) {
      voice.speak(buildSegmentCompleteCue(nextSeg), 'high')
    }
    setMeasuredForForm(measured)
    setViewState('logging')
  }, [currentSegment, currentIndex, segments, voice, liveCoachActive, onSegmentComplete, segmentMeasured])

  // Handle timer skip - mark as skipped and move on
  const handleTimerSkip = useCallback(() => {
    setMeasuredForForm(segmentMeasured())
    setViewState('logging')
  }, [segmentMeasured])

  // Handle segment logging submit
  const handleSegmentSubmit = async (data: {
    actualDuration?: number
    actualDistance?: number
    actualPace?: number
    actualAvgHR?: number
    actualMaxHR?: number
    actualAvgPower?: number
    actualMaxPower?: number
    completed: boolean
    skipped: boolean
    notes?: string
  }) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    // Fold in machine-measured values: avg power and rower distance already
    // pre-fill the form, max power has no field.
    const merged = {
      ...data,
      actualAvgPower: data.actualAvgPower ?? measuredForForm.actualAvgPower,
      actualMaxPower: data.actualMaxPower ?? measuredForForm.actualMaxPower,
      actualDistance: data.actualDistance ?? measuredForForm.actualDistance,
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
        }).catch(() => {})
        setSegments((prev) =>
          prev.map((seg, idx) =>
            idx === currentIndex + 1
              ? { ...seg, completed: true, skipped: false, actualDuration: foldRest.plannedDuration }
              : seg
          )
        )
      }

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
    onComplete({
      sessionRPE,
      notes: sessionNotes || undefined,
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
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                {liveSessionId && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    {tw('Live till coach', 'Live to coach')}
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
            targetPower={currentTargetPower}
            targetPowerPending={currentTargetPowerPending}
            notes={currentSegment.notes}
            onComplete={handleTimerComplete}
            onSkip={handleTimerSkip}
            autoStart={autoRunTimer}
            voiceSpeak={voice.speak}
            disableVoiceCues={liveCoachActive}
            forcePaused={forcePaused}
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
            plannedPower={currentTargetPower}
            defaultAvgPower={measuredForForm.actualAvgPower}
            defaultDistance={measuredForForm.actualDistance}
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
