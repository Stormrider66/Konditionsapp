'use client'

/**
 * RestTimer Component
 *
 * Circular countdown timer with audio/vibration alerts.
 * Shown after completing a set.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward, Plus, Minus, Volume2, VolumeX } from 'lucide-react'

interface RestTimerProps {
  initialSeconds: number
  onComplete: () => void
  onSkip: () => void
  autoStart?: boolean
}

export function RestTimer({
  initialSeconds,
  onComplete,
  onSkip,
  autoStart = true,
}: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isMuted, setIsMuted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio
  useEffect(() => {
    // Use Web Audio API for beep sound
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio()
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Play beep sound
  const playBeep = useCallback((frequency: number = 800, duration: number = 200) => {
    if (isMuted || typeof window === 'undefined') return

    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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
  }, [isMuted])

  // Vibrate
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
            vibrate([100, 50, 100])
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
  }, [isRunning, seconds, playBeep, vibrate, onComplete])

  // Extend time
  const extendTime = (additionalSeconds: number) => {
    setSeconds((prev) => prev + additionalSeconds)
  }

  // Reduce time
  const reduceTime = (reduceSeconds: number) => {
    setSeconds((prev) => Math.max(0, prev - reduceSeconds))
  }

  // Toggle pause/play
  const toggleTimer = () => {
    setIsRunning((prev) => !prev)
  }

  // Calculate circle progress
  const progress = (seconds / initialSeconds) * 100
  const circumference = 2 * Math.PI * 90 // radius = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`
  }

  // Color based on time remaining
  const getColor = () => {
    if (seconds <= 3) return 'text-red-500'
    if (seconds <= 10) return 'text-yellow-500'
    return 'text-blue-500'
  }

  const getStrokeColor = () => {
    if (seconds <= 3) return 'stroke-red-500'
    if (seconds <= 10) return 'stroke-yellow-500'
    return 'stroke-blue-500'
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      {/* Circular Timer */}
      <div className="relative w-52 h-52">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="8"
            className="stroke-muted"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={`transition-all duration-1000 ${getStrokeColor()}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold tabular-nums ${getColor()}`}>
            {formatTime(seconds)}
          </span>
          <span className="text-sm text-muted-foreground mt-1">Vila</span>
        </div>
      </div>

      {/* Time adjustment buttons */}
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
        >
          {isRunning ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => extendTime(30)}
        >
          <Plus className="h-4 w-4 mr-1" />
          30s
        </Button>
      </div>

      {/* Skip and mute */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMuted(!isMuted)}
          className="text-muted-foreground"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <Button variant="secondary" onClick={onSkip}>
          <SkipForward className="h-4 w-4 mr-2" />
          Hoppa över vila
        </Button>
      </div>
    </div>
  )
}

export default RestTimer
