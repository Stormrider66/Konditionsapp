'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, SkipForward, Square, Droplets } from 'lucide-react'
import type { IntervalSessionStatus, IntervalProtocol } from '@/lib/interval-session/types'

interface IntervalSessionControlsProps {
  sessionId: string
  status: IntervalSessionStatus
  currentInterval: number
  timerStartedAt: string | null
  protocol: IntervalProtocol | null
  onStatusChange: () => void
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

export function IntervalSessionControls({
  sessionId,
  status,
  currentInterval,
  timerStartedAt,
  protocol,
  onStatusChange,
}: IntervalSessionControlsProps) {
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

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
    // For LACTATE_ENTRY and ENDED, keep elapsed frozen
  }, [status, timerStartedAt])

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

  const intervalLabel = protocol?.intervalCount
    ? `Intervall ${currentInterval} / ${protocol.intervalCount}`
    : `Intervall ${currentInterval}`

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Timer display */}
      <div className="text-center">
        <div className="text-5xl font-mono font-bold tabular-nums dark:text-white">
          {formatTime(elapsed)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{intervalLabel}</div>
      </div>

      {/* Control buttons */}
      <div className="flex justify-center gap-3">
        {status === 'SETUP' && (
          <Button size="lg" onClick={handleStart} disabled={loading} className="px-8">
            <Play className="h-5 w-5 mr-2" />
            Starta
          </Button>
        )}

        {status === 'ACTIVE' && (
          <>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLactateMode}
              disabled={loading}
            >
              <Droplets className="h-5 w-5 mr-2" />
              Laktat
            </Button>
            <Button size="lg" onClick={handleAdvance} disabled={loading}>
              <SkipForward className="h-5 w-5 mr-2" />
              Nasta intervall
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleEnd}
              disabled={loading}
            >
              <Square className="h-5 w-5 mr-2" />
              Avsluta
            </Button>
          </>
        )}

        {status === 'LACTATE_ENTRY' && (
          <>
            <Button size="lg" onClick={handleResume} disabled={loading}>
              <Play className="h-5 w-5 mr-2" />
              Aterga till timing
            </Button>
            <Button size="lg" onClick={handleAdvance} disabled={loading}>
              <SkipForward className="h-5 w-5 mr-2" />
              Nasta intervall
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleEnd}
              disabled={loading}
            >
              <Square className="h-5 w-5 mr-2" />
              Avsluta
            </Button>
          </>
        )}

        {status === 'ENDED' && (
          <div className="text-muted-foreground font-medium">Session avslutad</div>
        )}
      </div>
    </div>
  )
}
