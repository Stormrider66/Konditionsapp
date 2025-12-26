'use client'

/**
 * ForTimeTimer Component
 *
 * Count-up timer for "For Time" workouts.
 * Tracks elapsed time with optional time cap.
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
  Flag,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ForTimeTimerProps {
  /** Time cap in seconds (0 = no cap) */
  timeCap?: number
  /** Callback when workout is marked complete */
  onComplete: (elapsedTime: number) => void
  /** Callback when time cap is reached */
  onTimeCapReached?: () => void
  /** Auto-start */
  autoStart?: boolean
}

export function ForTimeTimer({
  timeCap = 0,
  onComplete,
  onTimeCapReached,
  autoStart = false,
}: ForTimeTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isMuted, setIsMuted] = useState(false)
  const [hasStarted, setHasStarted] = useState(autoStart)
  const [isTimeCapped, setIsTimeCapped] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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
    if (isRunning && !isTimeCapped) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newValue = prev + 1

          // Time cap warnings
          if (timeCap > 0) {
            const remaining = timeCap - newValue

            if (remaining === 60) {
              playBeep(500, 300)
              vibrate(200)
            }

            if (remaining === 30) {
              playBeep(600, 200)
              vibrate(150)
            }

            if (remaining === 10) {
              playBeep(700, 150)
              vibrate(100)
            }

            if (remaining <= 3 && remaining > 0) {
              playBeep(800, 100)
              vibrate(50)
            }

            if (remaining === 0) {
              playBeep(900, 500)
              vibrate([100, 50, 100, 50, 100])
              setIsTimeCapped(true)
              setIsRunning(false)
              if (onTimeCapReached) {
                onTimeCapReached()
              }
            }
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
  }, [isRunning, isTimeCapped, timeCap, playBeep, vibrate, onTimeCapReached])

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
    setIsTimeCapped(false)
  }

  // Complete workout
  const handleComplete = () => {
    setIsRunning(false)
    playBeep(900, 400)
    vibrate([100, 50, 100])
    onComplete(elapsedSeconds)
  }

  // Calculate progress if time cap exists
  const progress = timeCap > 0 ? (elapsedSeconds / timeCap) * 100 : 0
  const remaining = timeCap > 0 ? timeCap - elapsedSeconds : 0

  // Colors
  const getColor = () => {
    if (isTimeCapped) return 'text-red-500'
    if (timeCap > 0 && remaining <= 30) return 'text-yellow-500'
    return 'text-blue-500'
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          FOR TIME
        </Badge>
        {timeCap > 0 && (
          <span className="text-sm text-muted-foreground">
            Max {formatTime(timeCap)}
          </span>
        )}
      </div>

      {/* Timer display */}
      <div
        className={cn(
          'relative w-56 h-56 rounded-full transition-colors duration-300',
          isTimeCapped ? 'bg-red-500/10' : 'bg-blue-500/10'
        )}
      >
        {/* Progress ring (only if time cap) */}
        {timeCap > 0 && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
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
                isTimeCapped ? 'stroke-red-500' : 'stroke-blue-500'
              )}
              style={{
                strokeDasharray: 2 * Math.PI * 90,
                strokeDashoffset: 2 * Math.PI * 90 * (1 - Math.min(progress, 100) / 100),
              }}
            />
          </svg>
        )}

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {!hasStarted ? (
            <Button
              size="lg"
              className="rounded-full h-20 w-20 bg-blue-500 hover:bg-blue-600"
              onClick={startTimer}
            >
              <Play className="h-8 w-8" />
            </Button>
          ) : (
            <>
              <span className={cn('text-5xl font-bold tabular-nums', getColor())}>
                {formatTime(elapsedSeconds)}
              </span>
              {timeCap > 0 && !isTimeCapped && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatTime(remaining)} kvar
                  </span>
                </div>
              )}
              {isTimeCapped && (
                <span className="text-sm text-red-500 mt-1">Tid ute!</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Complete button */}
      {hasStarted && !isTimeCapped && (
        <Button
          size="lg"
          className="h-14 px-8 bg-green-500 hover:bg-green-600"
          onClick={handleComplete}
        >
          <Flag className="h-5 w-5 mr-2" />
          Klar!
        </Button>
      )}

      {/* Controls */}
      {hasStarted && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTimer}
            disabled={isTimeCapped}
          >
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

export default ForTimeTimer
