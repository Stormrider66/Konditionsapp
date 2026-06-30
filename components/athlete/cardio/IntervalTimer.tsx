'use client'

/**
 * IntervalTimer Component
 *
 * Circular countdown timer for cardio segments.
 * Shows segment type, target pace/zone, and provides audio alerts.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  SkipForward,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  Timer,
  Route,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n/client'
import { LiveTargetCues } from './LiveTargetCues'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS' | 'CORE' | 'PREHAB' | 'PLYOMETRIC'

interface IntervalTimerProps {
  /** Duration in seconds */
  duration: number
  /** Segment type for styling */
  segmentType: SegmentType
  /** Segment index (1-based for display) */
  segmentNumber: number
  /** Total segments */
  totalSegments: number
  /** Target pace in sec/km — or sec/500m for rowing ergs (optional) */
  targetPace?: number
  /** Unit suffix for the pace display. Default '/km'; '/500m' for row/ski erg. */
  paceUnit?: string
  /** Target zone 1-5 (optional) */
  targetZone?: number
  /** Target distance in km (optional) */
  targetDistance?: number
  /** Target calories for the segment (optional) */
  targetCalories?: number
  /** Calories burned so far in this segment, from a connected machine (optional) */
  liveCalories?: number
  /** Resolved target power in watts (optional) */
  targetPower?: number
  /** Label for a relative power target not yet resolved, e.g. "80% prolog" (optional) */
  targetPowerPending?: string
  /** Live power from a connected machine, in watts (optional). */
  livePower?: number
  /** Live pace from a connected rower/SkiErg, in sec/500m (optional). */
  livePace?: number
  /** Live heart rate from a connected band, in bpm (optional). */
  liveHeartRate?: number
  /** The athlete's current HR zone for the live reading (1-5, optional). */
  liveHrZone?: number
  /** Color (hex) for the live HR zone badge, from the parent's zone map (optional). */
  liveHrColor?: string
  /** Called when timer completes */
  onComplete: () => void
  /** Called when user skips segment */
  onSkip: () => void
  /** Auto-start the timer */
  autoStart?: boolean
  /** Segment notes */
  notes?: string
  /** Voice coaching speak function (from useVoiceCoach) */
  voiceSpeak?: (text: string, priority?: 'high' | 'normal') => void
  /** Disable voice countdown cues (when live voice coach is active) */
  disableVoiceCues?: boolean
  /** Force pause from parent (e.g. live voice coach tool call) */
  forcePaused?: boolean
  /** External time adjustment from parent controls (positive extends, negative reduces). */
  externalAdjustment?: { id: number; seconds: number } | null
  /** Called when timer state changes (for live voice coach status reporting) */
  onStateChange?: (state: { seconds: number; isRunning: boolean }) => void
}

const SEGMENT_COLORS: Record<SegmentType, { bg: string; text: string; stroke: string; badge: string }> = {
  WARMUP: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    stroke: 'stroke-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  COOLDOWN: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    stroke: 'stroke-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  INTERVAL: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    stroke: 'stroke-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  STEADY: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    stroke: 'stroke-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  RECOVERY: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-500',
    stroke: 'stroke-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  },
  HILL: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    stroke: 'stroke-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  DRILLS: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    stroke: 'stroke-purple-500',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  CORE: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-500',
    stroke: 'stroke-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  PREHAB: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-500',
    stroke: 'stroke-teal-500',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  PLYOMETRIC: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    stroke: 'stroke-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
}

const SEGMENT_NAMES: Record<SegmentType, string> = {
  WARMUP: 'segments.warmup',
  COOLDOWN: 'segments.cooldown',
  INTERVAL: 'segments.interval',
  STEADY: 'segments.steady',
  RECOVERY: 'segments.recovery',
  HILL: 'segments.hill',
  DRILLS: 'segments.drills',
  CORE: 'segments.core',
  PREHAB: 'segments.prehab',
  PLYOMETRIC: 'segments.plyometric',
}

export function IntervalTimer({
  duration,
  segmentType,
  segmentNumber,
  totalSegments,
  targetPace,
  paceUnit = '/km',
  targetZone,
  targetDistance,
  targetCalories,
  liveCalories,
  targetPower,
  targetPowerPending,
  livePower,
  livePace,
  liveHeartRate,
  liveHrZone,
  liveHrColor,
  onComplete,
  onSkip,
  autoStart = false,
  notes,
  voiceSpeak,
  disableVoiceCues = false,
  forcePaused,
  externalAdjustment,
  onStateChange,
}: IntervalTimerProps) {
  const t = useTranslations('components.intervalTimer')
  const [seconds, setSeconds] = useState(duration)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isMuted, setIsMuted] = useState(false)
  const [hasStarted, setHasStarted] = useState(autoStart)

  // The countdown is anchored to a wall-clock deadline (endAtRef) and the tick
  // derives the remaining time from Date.now(). This makes it immune to the
  // two real-world failure modes of a decrementing setInterval:
  // - parent re-render churn (BLE machine data arrives several times a second;
  //   if the tick effect restarted on every new callback identity, the 1 s
  //   interval never fired — observed in the field as "2 s in 10 minutes"),
  // - Android Chrome throttling timers when the screen dims or the tab hides.
  const endAtRef = useRef<number | null>(null) // deadline while running
  const secondsRef = useRef(duration) // remaining, for (re)anchoring on resume
  const completedRef = useRef(false)
  const lastExternalAdjustmentIdRef = useRef<number | null>(null)
  useEffect(() => {
    secondsRef.current = seconds
  }, [seconds])

  // Latest-callback refs so the tick never restarts on prop identity changes.
  const latestRef = useRef({ onComplete, voiceSpeak, disableVoiceCues })
  useEffect(() => {
    latestRef.current = { onComplete, voiceSpeak, disableVoiceCues }
  })
  const isMutedRef = useRef(isMuted)
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  // Pause keeps the remaining time in state and drops the deadline; resume
  // re-anchors from the kept remaining time (in the tick effect below).
  const pauseTimer = useCallback(() => {
    if (endAtRef.current != null) {
      setSeconds(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)))
    }
    endAtRef.current = null
    setIsRunning(false)
  }, [])

  // External pause/resume control (from live voice coach)
  useEffect(() => {
    if (forcePaused === undefined) return
    if (forcePaused && isRunning) {
      pauseTimer()
    } else if (!forcePaused && hasStarted && !isRunning) {
      setIsRunning(true)
    }
  }, [forcePaused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Report state changes to parent
  useEffect(() => {
    onStateChange?.({ seconds, isRunning })
  }, [seconds, isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  const colors = SEGMENT_COLORS[segmentType]

  // Play beep sound using Web Audio API
  const playBeep = useCallback(
    (frequency: number = 800, audioDuration: number = 200) => {
      if (isMutedRef.current || typeof window === 'undefined') return

      try {
        const audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        gainNode.gain.value = 0.3

        oscillator.start()
        setTimeout(() => {
          oscillator.stop()
          void audioContext.close()
        }, audioDuration)
      } catch {
        // Audio context not supported
      }
    },
    []
  )

  // Vibrate if supported
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  // Timer countdown. Depends ONLY on isRunning: the interval is created once
  // per run and keeps ticking no matter how often the parent re-renders. The
  // 250 ms cadence + clock-derived remaining keeps the display accurate even
  // when the browser delays ticks.
  useEffect(() => {
    if (!isRunning) return

    // (Re)anchor the deadline when starting or resuming.
    if (endAtRef.current == null) {
      endAtRef.current = Date.now() + secondsRef.current * 1000
    }

    const crossed = (prev: number, next: number, threshold: number) =>
      prev > threshold && next <= threshold

    const tick = () => {
      const endAt = endAtRef.current
      if (endAt == null || completedRef.current) return
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      const prev = secondsRef.current
      if (remaining === prev) return

      const { voiceSpeak: speak, disableVoiceCues: noCues } = latestRef.current
      // Fire each cue once even if a throttled tick jumps several seconds.
      if (crossed(prev, remaining, 30) && remaining > 10 && duration > 60) {
        playBeep(500, 150)
        vibrate(100)
        if (!noCues) speak?.('Thirty seconds.')
      }
      if (crossed(prev, remaining, 10) && remaining > 3) {
        playBeep(600, 150)
        vibrate(100)
        if (!noCues) speak?.('Ten seconds.')
      }
      if (crossed(prev, remaining, 3) && remaining > 0) {
        playBeep(700, 100)
        vibrate(50)
        if (!noCues) speak?.('Three. Two. One.', 'high')
      } else if (remaining <= 2 && remaining > 0) {
        playBeep(700, 100)
        vibrate(50)
      }

      setSeconds(remaining)

      if (remaining === 0) {
        completedRef.current = true
        playBeep(900, 400)
        vibrate([100, 50, 100, 50, 100])
        setTimeout(() => latestRef.current.onComplete(), 500)
      }
    }

    const id = setInterval(tick, 250)
    tick()
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning])

  // Start timer
  const startTimer = () => {
    setIsRunning(true)
    setHasStarted(true)
  }

  // Toggle pause/play
  const toggleTimer = () => {
    if (!hasStarted) {
      startTimer()
    } else if (isRunning) {
      pauseTimer()
    } else {
      setIsRunning(true)
    }
  }

  // Extend time (shifts the deadline while running)
  const extendTime = (additionalSeconds: number) => {
    if (endAtRef.current != null) endAtRef.current += additionalSeconds * 1000
    setSeconds((prev) => prev + additionalSeconds)
  }

  // Reduce time
  const reduceTime = (reduceSeconds: number) => {
    if (endAtRef.current != null) {
      endAtRef.current = Math.max(Date.now(), endAtRef.current - reduceSeconds * 1000)
    }
    setSeconds((prev) => Math.max(0, prev - reduceSeconds))
  }

  useEffect(() => {
    if (!externalAdjustment) return
    if (lastExternalAdjustmentIdRef.current === externalAdjustment.id) return
    lastExternalAdjustmentIdRef.current = externalAdjustment.id

    if (externalAdjustment.seconds > 0) {
      extendTime(externalAdjustment.seconds)
    } else if (externalAdjustment.seconds < 0) {
      reduceTime(Math.abs(externalAdjustment.seconds))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalAdjustment])

  // Calculate circle progress
  const progress = (seconds / duration) * 100
  const circumference = 2 * Math.PI * 90 // radius = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
  }

  // Get color based on time remaining
  const getTimeColor = () => {
    if (seconds <= 3) return 'text-red-500'
    if (seconds <= 10) return 'text-yellow-500'
    return colors.text
  }

  const getStrokeColor = () => {
    if (seconds <= 3) return 'stroke-red-500'
    if (seconds <= 10) return 'stroke-yellow-500'
    return colors.stroke
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      {/* Segment header */}
      <div className="flex items-center gap-3">
        <Badge className={colors.badge}>{t(SEGMENT_NAMES[segmentType])}</Badge>
        <span className="text-sm text-muted-foreground">
          {t('segmentCounter', { current: segmentNumber, total: totalSegments })}
        </span>
      </div>

      {/* Target / live indicators */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <LiveTargetCues
          targetPower={targetPower}
          targetPowerPending={targetPowerPending}
          livePower={livePower}
          targetPace={targetPace}
          paceUnit={paceUnit}
          livePace={livePace}
          targetZone={targetZone}
          liveHeartRate={liveHeartRate}
          liveHrZone={liveHrZone}
          liveHrColor={liveHrColor}
        />

        {targetDistance && (
          <div className="flex items-center gap-2 text-sm">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{targetDistance.toFixed(2)} km</span>
          </div>
        )}
        {targetCalories && (
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="font-bold">
              {liveCalories != null ? `${liveCalories} / ${targetCalories}` : targetCalories} cal
            </span>
          </div>
        )}
      </div>

      {/* Circular Timer */}
      <div className={cn('relative w-56 h-56 rounded-full', colors.bg)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="8"
            className="stroke-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn('transition-all duration-1000', getStrokeColor())}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {!hasStarted ? (
            <Button
              size="lg"
              className="rounded-full h-20 w-20"
              onClick={startTimer}
            >
              <Play className="h-8 w-8" />
            </Button>
          ) : (
            <>
              <span className={cn('text-5xl font-bold tabular-nums', getTimeColor())}>
                {formatTime(seconds)}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <Timer className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatTime(duration)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes if any */}
      {notes && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {notes}
        </p>
      )}

      {/* Time adjustment buttons */}
      {hasStarted && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reduceTime(15)}
            disabled={seconds <= 15}
          >
            <Minus className="h-4 w-4 mr-1" />
            15s
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTimer}
            aria-label={isRunning ? t('actions.pauseTimer') : t('actions.startTimer')}
          >
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => extendTime(30)}>
            <Plus className="h-4 w-4 mr-1" />
            30s
          </Button>
        </div>
      )}

      {/* Skip and mute */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMuted(!isMuted)}
          className="text-muted-foreground"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" onClick={onSkip}>
          <SkipForward className="h-4 w-4 mr-2" />
          {t('actions.skip')}
        </Button>
      </div>
    </div>
  )
}

export default IntervalTimer
