'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Play, SkipForward, Square, Droplets, Pause } from 'lucide-react'
import type { IntervalSessionStatus, IntervalProtocol, RestMode } from '@/lib/interval-session/types'
import { useLocale } from '@/i18n/client'

interface IntervalSessionControlsProps {
  sessionId: string
  status: IntervalSessionStatus
  currentInterval: number
  timerStartedAt: string | null
  protocol: IntervalProtocol | null
  restMode: RestMode
  groupRestStartedAt: string | null
  allTapped: boolean
  onStatusChange: () => void
  onAutoAdvance: () => void
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

export function IntervalSessionControls({
  sessionId,
  status,
  currentInterval,
  timerStartedAt,
  protocol,
  restMode,
  groupRestStartedAt,
  allTapped,
  onStatusChange,
  onAutoAdvance,
}: IntervalSessionControlsProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [groupRestRemaining, setGroupRestRemaining] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const restIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const autoAdvancedRef = useRef(false)

  // Reset auto-advance flag when interval changes
  useEffect(() => {
    autoAdvancedRef.current = false
  }, [currentInterval])

  // Client-side timer
  useEffect(() => {
    if (status === 'ACTIVE' && timerStartedAt) {
      const startTime = new Date(timerStartedAt).getTime()

      const tick = () => {
        setElapsed(Date.now() - startTime)
      }

      tick()
      intervalRef.current = setInterval(tick, 100)

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } else if (status === 'SETUP') {
      setElapsed(0)
    }
  }, [status, timerStartedAt])

  // Group rest countdown
  useEffect(() => {
    if (restMode !== 'GROUP' || !groupRestStartedAt || !protocol?.restDurationSeconds) {
      setGroupRestRemaining(null)
      return
    }

    const restEndMs = new Date(groupRestStartedAt).getTime() + protocol.restDurationSeconds * 1000

    const tick = () => {
      const remaining = Math.max(0, (restEndMs - Date.now()) / 1000)
      setGroupRestRemaining(remaining)

      if (remaining <= 0 && !autoAdvancedRef.current) {
        autoAdvancedRef.current = true
        onAutoAdvance()
      }
    }

    tick()
    restIntervalRef.current = setInterval(tick, 200)

    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    }
  }, [restMode, groupRestStartedAt, protocol?.restDurationSeconds, onAutoAdvance])

  const handleStart = async () => {
    setLoading(true)
    try {
      await fetch(`/api/coach/interval-sessions/${sessionId}/timer`, { method: 'POST' })
      onStatusChange()
    } finally {
      setLoading(false)
    }
  }

  const handleAdvance = async () => {
    setLoading(true)
    try {
      await fetch(`/api/coach/interval-sessions/${sessionId}/advance`, { method: 'POST' })
      onStatusChange()
    } finally {
      setLoading(false)
    }
  }

  const handleLactateMode = async () => {
    setLoading(true)
    try {
      await fetch(`/api/coach/interval-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LACTATE_ENTRY' }),
      })
      onStatusChange()
    } finally {
      setLoading(false)
    }
  }

  const handleResume = async () => {
    setLoading(true)
    try {
      await fetch(`/api/coach/interval-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
      onStatusChange()
    } finally {
      setLoading(false)
    }
  }

  const handleEnd = async () => {
    setLoading(true)
    try {
      await fetch(`/api/coach/interval-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      })
      onStatusChange()
    } finally {
      setLoading(false)
    }
  }

  const handleStartGroupRest = async () => {
    setLoading(true)
    try {
      await fetch(`/api/coach/interval-sessions/${sessionId}/rest`, { method: 'POST' })
      onStatusChange()
    } finally {
      setLoading(false)
    }
  }

  const currentStep = protocol?.steps?.[currentInterval - 1]
  const intervalLabel = currentStep
    ? protocol?.intervalCount
      ? `${currentStep.label} · ${currentInterval}/${protocol.intervalCount}`
      : currentStep.label
    : protocol?.intervalCount
      ? copy(locale, `Interval ${currentInterval} / ${protocol.intervalCount}`, `Intervall ${currentInterval} / ${protocol.intervalCount}`)
      : copy(locale, `Interval ${currentInterval}`, `Intervall ${currentInterval}`)

  const isGroupResting = restMode === 'GROUP' && groupRestRemaining !== null && groupRestRemaining > 0
  const restProgress = isGroupResting && protocol?.restDurationSeconds
    ? 1 - groupRestRemaining / protocol.restDurationSeconds
    : 0

  // Set glow color dynamically depending on the current status
  const glowColor = status === 'ACTIVE' ? 'red' : (status === 'LACTATE_ENTRY' ? 'emerald' : 'blue')

  return (
    <GlassCard glow={glowColor} className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md">
      <GlassCardContent className="p-4 space-y-4">
        {/* Timer display */}
        <div className="text-center">
          {isGroupResting ? (
            <>
              <div className="text-sm text-slate-550 dark:text-slate-400 mb-1 font-medium">{copy(locale, 'Group rest', 'Gruppvila')}</div>
              <div className="text-4xl sm:text-5xl font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {formatCountdown(groupRestRemaining)}
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto mt-2 h-1.5 bg-slate-100 dark:bg-slate-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-200 rounded-full"
                  style={{ width: `${restProgress * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{intervalLabel}</div>
            </>
          ) : (
            <>
              <div className="text-4xl sm:text-5xl font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {formatTime(elapsed)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{intervalLabel}</div>
            </>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {status === 'SETUP' && (
            <Button size="lg" onClick={handleStart} disabled={loading} className="px-8 bg-blue-600 hover:bg-blue-700 text-white">
              <Play className="h-5 w-5 mr-2" />
              {copy(locale, 'Start', 'Starta')}
            </Button>
          )}

          {status === 'ACTIVE' && !isGroupResting && (
            <>
              <Button
                size="default"
                variant="outline"
                onClick={handleLactateMode}
                disabled={loading}
                className="sm:size-lg border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950/20"
              >
                <Droplets className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-emerald-500" />
                Laktat
              </Button>
              {/* Show manual group rest trigger when in GROUP mode and all have tapped but rest hasn't started */}
              {restMode === 'GROUP' && allTapped && !groupRestStartedAt ? (
                <Button size="default" onClick={handleStartGroupRest} disabled={loading} className="sm:size-lg bg-amber-600 hover:bg-amber-700 text-white">
                  <Pause className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">{copy(locale, 'Start rest', 'Starta vila')}</span>
                  <span className="sm:hidden">{copy(locale, 'Rest', 'Vila')}</span>
                </Button>
              ) : restMode === 'GROUP' && !allTapped && !groupRestStartedAt ? (
                <Button size="default" variant="outline" onClick={handleStartGroupRest} disabled={loading} className="sm:size-lg border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-350">
                  <Pause className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-amber-500" />
                  <span className="hidden sm:inline">{copy(locale, 'Start rest', 'Starta vila')}</span>
                  <span className="sm:hidden">{copy(locale, 'Rest', 'Vila')}</span>
                </Button>
              ) : null}
              <Button size="default" onClick={handleAdvance} disabled={loading} className="sm:size-lg bg-blue-600 hover:bg-blue-700 text-white">
                <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">{copy(locale, 'Next interval', 'Nästa intervall')}</span>
                <span className="sm:hidden">{copy(locale, 'Next', 'Nästa')}</span>
              </Button>
              <Button
                size="default"
                variant="destructive"
                onClick={handleEnd}
                disabled={loading}
                className="sm:size-lg"
              >
                <Square className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                {copy(locale, 'End', 'Avsluta')}
              </Button>
            </>
          )}

          {status === 'ACTIVE' && isGroupResting && (
            <>
              <Button size="default" onClick={handleAdvance} disabled={loading} className="sm:size-lg bg-amber-600 hover:bg-amber-700 text-white">
                <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">{copy(locale, 'Skip rest', 'Hoppa över vila')}</span>
                <span className="sm:hidden">{copy(locale, 'Skip', 'Hoppa')}</span>
              </Button>
              <Button
                size="default"
                variant="destructive"
                onClick={handleEnd}
                disabled={loading}
                className="sm:size-lg"
              >
                <Square className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                {copy(locale, 'End', 'Avsluta')}
              </Button>
            </>
          )}

          {status === 'LACTATE_ENTRY' && (
            <>
              <Button size="default" onClick={handleResume} disabled={loading} className="sm:size-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">{copy(locale, 'Return to timing', 'Återgå till timing')}</span>
                <span className="sm:hidden">Timing</span>
              </Button>
              <Button size="default" onClick={handleAdvance} disabled={loading} className="sm:size-lg bg-blue-605 hover:bg-blue-700 text-white">
                <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">{copy(locale, 'Next interval', 'Nästa intervall')}</span>
                <span className="sm:hidden">{copy(locale, 'Next', 'Nästa')}</span>
              </Button>
              <Button
                size="default"
                variant="destructive"
                onClick={handleEnd}
                disabled={loading}
                className="sm:size-lg"
              >
                <Square className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                {copy(locale, 'End', 'Avsluta')}
              </Button>
            </>
          )}

          {status === 'ENDED' && (
            <div className="text-slate-550 dark:text-slate-400 font-medium">{copy(locale, 'Session ended', 'Session avslutad')}</div>
          )}
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
