'use client'

/**
 * TabataTimer Component
 *
 * Classic Tabata timer: 20 seconds work / 10 seconds rest x 8 rounds.
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabataTimerProps {
  /** Work time per interval (default 20) */
  workTime?: number
  /** Rest time per interval (default 10) */
  restTime?: number
  /** Total rounds (default 8) */
  totalRounds?: number
  /** Callback when all rounds complete */
  onComplete: () => void
  /** Callback when a round completes */
  onRoundComplete: (round: number) => void
  /** Auto-start */
  autoStart?: boolean
}

export function TabataTimer({
  workTime = 20,
  restTime = 10,
  totalRounds = 8,
  onComplete,
  onRoundComplete,
  autoStart = false,
}: TabataTimerProps) {
  const roundDuration = workTime + restTime
  const [secondsRemaining, setSecondsRemaining] = useState(workTime)
  const [currentRound, setCurrentRound] = useState(1)
  const [phase, setPhase] = useState<'WORK' | 'REST'>('WORK')
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

  // Timer countdown
  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          const newValue = prev - 1

          // Alert at 3, 2, 1
          if (newValue <= 3 && newValue > 0) {
            playBeep(700, 100)
            vibrate(50)
          }

          // Phase transition
          if (newValue === 0) {
            if (phase === 'WORK') {
              // Work phase ended
              playBeep(600, 200)
              vibrate(100)
              setPhase('REST')
              setSecondsRemaining(restTime)
              return restTime
            } else {
              // Rest phase ended
              onRoundComplete(currentRound)

              if (currentRound >= totalRounds) {
                // All rounds complete
                if (!hasCompletedRef.current) {
                  hasCompletedRef.current = true
                  playBeep(900, 500)
                  vibrate([100, 50, 100, 50, 100])
                  setIsRunning(false)
                  setTimeout(onComplete, 500)
                }
                return 0
              }

              // Start next round
              playBeep(800, 300)
              vibrate([100, 50, 100])
              setPhase('WORK')
              setCurrentRound((r) => r + 1)
              setSecondsRemaining(workTime)
              return workTime
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
  }, [
    isRunning,
    secondsRemaining,
    phase,
    currentRound,
    totalRounds,
    workTime,
    restTime,
    playBeep,
    vibrate,
    onRoundComplete,
    onComplete,
  ])

  // Format time
  const formatTime = (secs: number) => {
    return `:${secs.toString().padStart(2, '0')}`
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
    setSecondsRemaining(workTime)
    setCurrentRound(1)
    setPhase('WORK')
    setIsRunning(false)
    hasCompletedRef.current = false
  }

  // Calculate progress within phase
  const phaseTotal = phase === 'WORK' ? workTime : restTime
  const progress = ((phaseTotal - secondsRemaining) / phaseTotal) * 100

  const isComplete = currentRound > totalRounds || (currentRound === totalRounds && secondsRemaining === 0 && phase === 'REST')

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          TABATA
        </Badge>
        <span className="text-sm text-muted-foreground">
          {workTime}s arbete / {restTime}s vila
        </span>
      </div>

      {/* Round indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Runda</span>
        <span className="text-3xl font-bold">{Math.min(currentRound, totalRounds)}</span>
        <span className="text-lg text-muted-foreground">/ {totalRounds}</span>
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
            strokeWidth="12"
            className="stroke-muted/30"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className={cn(
              'transition-all duration-200',
              phase === 'WORK' ? 'stroke-green-500' : 'stroke-blue-500'
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
          ) : isComplete ? (
            <span className="text-2xl font-bold text-green-500">Klar!</span>
          ) : (
            <>
              <Badge
                className={cn(
                  'mb-2 text-lg px-4 py-1',
                  phase === 'WORK'
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white'
                )}
              >
                {phase === 'WORK' ? 'ARBETE' : 'VILA'}
              </Badge>
              <span
                className={cn(
                  'text-6xl font-bold tabular-nums',
                  phase === 'WORK' ? 'text-green-500' : 'text-blue-500',
                  secondsRemaining <= 3 && 'text-yellow-500'
                )}
              >
                {formatTime(secondsRemaining)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Round progress indicators */}
      <div className="flex gap-2">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
          <div
            key={r}
            className={cn(
              'w-4 h-4 rounded-full transition-all',
              r < currentRound
                ? 'bg-green-500'
                : r === currentRound && !isComplete
                  ? phase === 'WORK'
                    ? 'bg-green-500 ring-2 ring-green-500/30'
                    : 'bg-blue-500 ring-2 ring-blue-500/30'
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

export default TabataTimer
