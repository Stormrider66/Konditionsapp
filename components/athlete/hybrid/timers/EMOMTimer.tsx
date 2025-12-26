'use client'

/**
 * EMOMTimer Component
 *
 * Every Minute On the Minute timer.
 * Counts down within each minute, auto-advances to next minute.
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EMOMTimerProps {
  /** Total minutes */
  totalMinutes: number
  /** Work time per minute (default 60) */
  workTime?: number
  /** Rest time per minute (default 0) */
  restTime?: number
  /** Current minute (1-indexed) */
  currentMinute: number
  /** Callback when all minutes complete */
  onComplete: () => void
  /** Callback when a minute completes */
  onMinuteComplete: (minute: number) => void
  /** Auto-start */
  autoStart?: boolean
}

export function EMOMTimer({
  totalMinutes,
  workTime = 60,
  restTime = 0,
  currentMinute,
  onComplete,
  onMinuteComplete,
  autoStart = false,
}: EMOMTimerProps) {
  const minuteDuration = workTime + restTime
  const [secondsInMinute, setSecondsInMinute] = useState(minuteDuration)
  const [minute, setMinute] = useState(currentMinute)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isMuted, setIsMuted] = useState(false)
  const [hasStarted, setHasStarted] = useState(autoStart)
  const [phase, setPhase] = useState<'WORK' | 'REST'>('WORK')
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

  // Timer countdown
  useEffect(() => {
    if (isRunning && secondsInMinute > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsInMinute((prev) => {
          const newValue = prev - 1

          // Determine current phase
          if (restTime > 0 && newValue <= restTime) {
            setPhase('REST')
          } else {
            setPhase('WORK')
          }

          // Alert at 10 seconds remaining in work phase
          if (newValue === restTime + 10 && workTime >= 20) {
            playBeep(600, 150)
            vibrate(100)
          }

          // Alert at 3, 2, 1 before minute ends
          if (newValue <= 3 && newValue > 0) {
            playBeep(700, 100)
            vibrate(50)
          }

          // Minute complete
          if (newValue === 0) {
            playBeep(900, 300)
            vibrate([100, 50, 100])

            onMinuteComplete(minute)

            // Check if all minutes complete
            if (minute >= totalMinutes) {
              if (!hasCompletedRef.current) {
                hasCompletedRef.current = true
                setTimeout(onComplete, 500)
              }
              return 0
            }

            // Auto-advance to next minute
            setTimeout(() => {
              setMinute((m) => m + 1)
              setSecondsInMinute(minuteDuration)
              setPhase('WORK')
            }, 200)
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
  }, [
    isRunning,
    secondsInMinute,
    minute,
    totalMinutes,
    minuteDuration,
    workTime,
    restTime,
    playBeep,
    vibrate,
    onMinuteComplete,
    onComplete,
  ])

  // Format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    if (mins > 0) {
      return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
    }
    return `:${remainingSecs.toString().padStart(2, '0')}`
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
    setSecondsInMinute(minuteDuration)
    setMinute(1)
    setIsRunning(false)
    setPhase('WORK')
    hasCompletedRef.current = false
  }

  // Calculate progress within minute
  const progress = ((minuteDuration - secondsInMinute) / minuteDuration) * 100

  // Colors based on phase
  const getColor = () => {
    if (phase === 'REST') return 'text-blue-500'
    if (secondsInMinute <= 10) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStrokeColor = () => {
    if (phase === 'REST') return 'stroke-blue-500'
    return 'stroke-green-500'
  }

  const isComplete = minute > totalMinutes

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          EMOM
        </Badge>
        <span className="text-sm text-muted-foreground">
          {totalMinutes} minuter
        </span>
      </div>

      {/* Minute indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Minut</span>
        <span className="text-3xl font-bold">
          {Math.min(minute, totalMinutes)}
        </span>
        <span className="text-lg text-muted-foreground">/ {totalMinutes}</span>
      </div>

      {/* Timer display */}
      <div
        className={cn(
          'relative w-56 h-56 rounded-full transition-colors duration-300',
          phase === 'WORK' ? 'bg-green-500/10' : 'bg-blue-500/10'
        )}
      >
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
            className={cn('transition-all duration-1000', getStrokeColor())}
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
          ) : isComplete ? (
            <span className="text-2xl font-bold text-green-500">Klar!</span>
          ) : (
            <>
              <Badge
                className={cn(
                  'mb-2',
                  phase === 'WORK'
                    ? 'bg-green-500/20 text-green-600'
                    : 'bg-blue-500/20 text-blue-600'
                )}
              >
                {phase === 'WORK' ? 'ARBETE' : 'VILA'}
              </Badge>
              <span className={cn('text-5xl font-bold tabular-nums', getColor())}>
                {formatTime(secondsInMinute)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Minute progress indicators */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
        {Array.from({ length: totalMinutes }, (_, i) => i + 1).map((m) => (
          <div
            key={m}
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              m < minute
                ? 'bg-green-500'
                : m === minute
                  ? 'bg-green-500 ring-2 ring-green-500/30'
                  : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Controls */}
      {hasStarted && !isComplete && (
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

export default EMOMTimer
