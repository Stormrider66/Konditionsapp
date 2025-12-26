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
  Heart,
  Timer,
  Route,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

interface IntervalTimerProps {
  /** Duration in seconds */
  duration: number
  /** Segment type for styling */
  segmentType: SegmentType
  /** Segment index (1-based for display) */
  segmentNumber: number
  /** Total segments */
  totalSegments: number
  /** Target pace in sec/km (optional) */
  targetPace?: number
  /** Target zone 1-5 (optional) */
  targetZone?: number
  /** Target distance in km (optional) */
  targetDistance?: number
  /** Called when timer completes */
  onComplete: () => void
  /** Called when user skips segment */
  onSkip: () => void
  /** Auto-start the timer */
  autoStart?: boolean
  /** Segment notes */
  notes?: string
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
}

const SEGMENT_NAMES: Record<SegmentType, string> = {
  WARMUP: 'Uppvärmning',
  COOLDOWN: 'Nedvarvning',
  INTERVAL: 'Intervall',
  STEADY: 'Jämn',
  RECOVERY: 'Återhämtning',
  HILL: 'Backe',
  DRILLS: 'Övningar',
}

const ZONE_COLORS = [
  '', // Zone 0 (unused)
  'bg-gray-200 text-gray-700', // Zone 1
  'bg-blue-200 text-blue-700', // Zone 2
  'bg-green-200 text-green-700', // Zone 3
  'bg-yellow-200 text-yellow-700', // Zone 4
  'bg-red-200 text-red-700', // Zone 5
]

export function IntervalTimer({
  duration,
  segmentType,
  segmentNumber,
  totalSegments,
  targetPace,
  targetZone,
  targetDistance,
  onComplete,
  onSkip,
  autoStart = false,
  notes,
}: IntervalTimerProps) {
  const [seconds, setSeconds] = useState(duration)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isMuted, setIsMuted] = useState(false)
  const [hasStarted, setHasStarted] = useState(autoStart)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const colors = SEGMENT_COLORS[segmentType]

  // Play beep sound using Web Audio API
  const playBeep = useCallback(
    (frequency: number = 800, audioDuration: number = 200) => {
      if (isMuted || typeof window === 'undefined') return

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
          audioContext.close()
        }, audioDuration)
      } catch {
        // Audio context not supported
      }
    },
    [isMuted]
  )

  // Vibrate if supported
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  // Timer countdown
  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newValue = prev - 1

          // Alert at 30 seconds for longer intervals
          if (newValue === 30 && duration > 60) {
            playBeep(500, 150)
            vibrate(100)
          }

          // Alert at 10 seconds
          if (newValue === 10) {
            playBeep(600, 150)
            vibrate(100)
          }

          // Alert at 3, 2, 1
          if (newValue <= 3 && newValue > 0) {
            playBeep(700, 100)
            vibrate(50)
          }

          // Complete
          if (newValue === 0) {
            playBeep(900, 400)
            vibrate([100, 50, 100, 50, 100])
            setTimeout(onComplete, 500)
          }

          return newValue
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, seconds, duration, playBeep, vibrate, onComplete])

  // Start timer
  const startTimer = () => {
    setIsRunning(true)
    setHasStarted(true)
  }

  // Toggle pause/play
  const toggleTimer = () => {
    if (!hasStarted) {
      startTimer()
    } else {
      setIsRunning((prev) => !prev)
    }
  }

  // Extend time
  const extendTime = (additionalSeconds: number) => {
    setSeconds((prev) => prev + additionalSeconds)
  }

  // Reduce time
  const reduceTime = (reduceSeconds: number) => {
    setSeconds((prev) => Math.max(0, prev - reduceSeconds))
  }

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

  // Format pace (sec/km to mm:ss)
  const formatPace = (paceSeconds: number) => {
    const mins = Math.floor(paceSeconds / 60)
    const secs = paceSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}/km`
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
        <Badge className={colors.badge}>{SEGMENT_NAMES[segmentType]}</Badge>
        <span className="text-sm text-muted-foreground">
          {segmentNumber} av {totalSegments}
        </span>
      </div>

      {/* Target indicators */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {targetPace && (
          <div className="flex items-center gap-2 text-sm">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatPace(targetPace)}</span>
          </div>
        )}
        {targetZone && (
          <Badge className={cn('text-xs', ZONE_COLORS[targetZone])}>
            <Heart className="h-3 w-3 mr-1" />
            Zon {targetZone}
          </Badge>
        )}
        {targetDistance && (
          <div className="flex items-center gap-2 text-sm">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{targetDistance.toFixed(2)} km</span>
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
          <Button variant="outline" size="icon" onClick={toggleTimer}>
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
          Hoppa över
        </Button>
      </div>
    </div>
  )
}

export default IntervalTimer
