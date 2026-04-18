'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ActiveRest {
  exerciseId: string
  setNumber: number
  totalSeconds: number
  startedAt: number
}

export interface UseRestTimerResult {
  active: ActiveRest | null
  remaining: number
  isPaused: boolean
  start: (rest: Omit<ActiveRest, 'startedAt'>) => void
  skip: () => void
  adjust: (delta: number) => void
  togglePause: () => void
}

function playBeep(frequency = 800, duration = 200) {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = 'sine'
    gain.gain.value = 0.3
    osc.start()
    setTimeout(() => {
      osc.stop()
      void ctx.close()
    }, duration)
  } catch {
    /* noop */
  }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
}

export function useRestTimer(): UseRestTimerResult {
  const [active, setActive] = useState<ActiveRest | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const alertedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!active || isPaused) return
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - active.startedAt) / 1000)
      const left = Math.max(0, active.totalSeconds - elapsed)
      setRemaining(left)
      if (left === 10 && !alertedRef.current.has(10)) {
        alertedRef.current.add(10)
        playBeep(600, 150)
        vibrate(100)
      }
      if (left <= 3 && left > 0 && !alertedRef.current.has(left)) {
        alertedRef.current.add(left)
        playBeep(700, 100)
        vibrate(50)
      }
      if (left === 0) {
        playBeep(900, 400)
        vibrate([100, 50, 100])
        setActive(null)
      }
    }, 250)
    return () => clearInterval(interval)
  }, [active, isPaused])

  const start = useCallback((rest: Omit<ActiveRest, 'startedAt'>) => {
    alertedRef.current = new Set()
    setIsPaused(false)
    setRemaining(rest.totalSeconds)
    setActive({ ...rest, startedAt: Date.now() })
  }, [])

  const skip = useCallback(() => {
    alertedRef.current = new Set()
    setActive(null)
    setRemaining(0)
  }, [])

  const adjust = useCallback(
    (delta: number) => {
      setActive((prev) => {
        if (!prev) return prev
        const total = Math.max(5, prev.totalSeconds + delta)
        const elapsed = Math.floor((Date.now() - prev.startedAt) / 1000)
        const left = Math.max(0, total - elapsed)
        setRemaining(left)
        return { ...prev, totalSeconds: total }
      })
    },
    [],
  )

  const togglePause = useCallback(() => {
    setActive((prev) => {
      if (!prev) return prev
      if (!isPaused) {
        return { ...prev, totalSeconds: remaining, startedAt: Date.now() }
      }
      return { ...prev, startedAt: Date.now() - (prev.totalSeconds - remaining) * 1000 }
    })
    setIsPaused((p) => !p)
  }, [isPaused, remaining])

  return { active, remaining, isPaused, start, skip, adjust, togglePause }
}
