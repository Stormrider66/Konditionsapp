'use client'

/**
 * AMRAPTimer Component
 *
 * Count-up timer for AMRAP (As Many Rounds As Possible) workouts.
 * Tracks elapsed time up to a time cap.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AMRAPTimerProps {
  /** Time cap in seconds */
  timeCap: number
  /** Current round count */
  roundCount: number
  /** Callback when timer finishes */
  onComplete: () => void
  /** Callback to increment round */
  onRoundComplete: () => void
  /** Auto-start the timer */
  autoStart?: boolean
}

export function AMRAPTimer({
  timeCap,
  roundCount,
  onComplete,
  onRoundComplete,
  autoStart = false,
}: AMRAPTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isMuted, setIsMuted] = useState(false)
  const [hasStarted, setHasStarted] = useState(autoStart)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasCompletedRef = useRef(false)

  // Play beep sound
  const playBeep = useCallback(
    (frequency: number = 800, duration: number = 200) => {
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
        }, duration)
      } catch {
        // Audio context not supported
      }
    },
    [isMuted]
  )

  // Vibrate
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  // Timer count-up
  useEffect(() => {
    if (isRunning && elapsedSeconds < timeCap) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newValue = prev + 1
          const remaining = timeCap - newValue

          // Alert at 1 minute remaining
          if (remaining === 60) {
            playBeep(500, 300)
            vibrate(200)
          }

          // Alert at 30 seconds remaining
          if (remaining === 30) {
            playBeep(600, 200)
            vibrate(150)
          }

          // Alert at 10 seconds remaining
          if (remaining === 10) {
            playBeep(700, 150)
            vibrate(100)
          }

          // Alert at 3, 2, 1
          if (remaining <= 3 && remaining > 0) {
            playBeep(800, 100)
            vibrate(50)
          }

          // Complete
          if (remaining === 0 && !hasCompletedRef.current) {
            hasCompletedRef.current = true
            playBeep(900, 500)
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
  }, [isRunning, elapsedSeconds, timeCap, playBeep, vibrate, onComplete])

  // Format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
  }

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

  // Reset timer
  const resetTimer = () => {
    setElapsedSeconds(0)
    setIsRunning(false)
    hasCompletedRef.current = false
  }

  // Calculate progress
  const progress = (elapsedSeconds / timeCap) * 100
  const remaining = timeCap - elapsedSeconds
  const isOvertime = elapsedSeconds >= timeCap

  // Color based on time remaining
  const getColor = () => {
    if (isOvertime) return 'text-red-500'
    if (remaining <= 10) return 'text-yellow-500'
    if (remaining <= 60) return 'text-amber-500'
    return 'text-green-500'
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          AMRAP
        </Badge>
        <span className="text-sm text-muted-foreground">
          {formatTime(timeCap)} tidsgräns
        </span>
      </div>

      {/* Round counter */}
      <div className="flex items-center gap-4">
        <Target className="h-5 w-5 text-muted-foreground" />
        <span className="text-4xl font-bold">{roundCount}</span>
        <span className="text-lg text-muted-foreground">rundor</span>
      </div>

      {/* Timer display */}
      <div className="relative w-56 h-56 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10">
        {/* Progress ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="8"
            className="stroke-muted/30"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn(
              'transition-all duration-1000',
              isOvertime ? 'stroke-red-500' : 'stroke-green-500'
            )}
            style={{
              strokeDasharray: 2 * Math.PI * 90,
              strokeDashoffset: 2 * Math.PI * 90 * (1 - progress / 100),
            }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {!hasStarted ? (
            <Button
              size="lg"
              className="rounded-full h-20 w-20 bg-green-500 hover:bg-green-600"
              onClick={startTimer}
            >
              <Play className="h-8 w-8" />
            </Button>
          ) : (
            <>
              <span className={cn('text-5xl font-bold tabular-nums', getColor())}>
                {formatTime(elapsedSeconds)}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {remaining > 0 ? `${formatTime(remaining)} kvar` : 'Tid ute!'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Round complete button */}
      {hasStarted && !isOvertime && (
        <Button
          size="lg"
          className="h-14 px-8"
          onClick={onRoundComplete}
        >
          + Runda klar
        </Button>
      )}

      {/* Controls */}
      {hasStarted && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={toggleTimer}>
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={resetTimer}>
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
      )}
    </div>
  )
}

export default AMRAPTimer
