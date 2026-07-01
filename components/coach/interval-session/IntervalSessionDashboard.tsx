'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { IntervalSessionControls } from './IntervalSessionControls'
import { AthleteTimingGrid } from './AthleteTimingGrid'
import { IntervalSummaryBar } from './IntervalSummaryBar'
import { LactateEntryPanel } from './LactateEntryPanel'
import { AddParticipantDialog } from './AddParticipantDialog'
import type {
  IntervalSessionStreamData,
} from '@/lib/interval-session/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'

type AppLocale = 'en' | 'sv'

const copy = (locale: AppLocale, en: string, sv: string) => locale === 'sv' ? sv : en

interface AvailableClient {
  id: string
  name: string
}

interface IntervalSessionDashboardProps {
  sessionId: string
  businessSlug?: string
  initialData: IntervalSessionStreamData
  initialAvailableClients: AvailableClient[]
}

export function IntervalSessionDashboard({
  sessionId,
  businessSlug,
  initialData,
  initialAvailableClients,
}: IntervalSessionDashboardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const router = useRouter()
  const [data, setData] = useState<IntervalSessionStreamData>(initialData)
  const [availableClients, setAvailableClients] = useState(initialAvailableClients)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Connect to SSE stream
  useEffect(() => {
    if (data.status === 'ENDED') return

    const eventSource = new EventSource(
      `/api/coach/interval-sessions/${sessionId}/stream`
    )

    eventSource.onopen = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data) as IntervalSessionStreamData
        setData(newData)
      } catch {
        console.error('Failed to parse SSE data')
      }
    }

    eventSource.addEventListener('ended', () => {
      eventSource.close()
      setIsConnected(false)
    })

    eventSource.addEventListener('error', () => {
      eventSource.close()
      setIsConnected(false)
      setConnectionError(copy(locale, 'Connection interrupted', 'Anslutningen bröts'))
    })

    eventSource.onerror = () => {
      setIsConnected(false)
      setConnectionError(copy(locale, 'Connection interrupted', 'Anslutningen bröts'))
    }

    return () => {
      eventSource.close()
    }
  }, [sessionId, data.status, locale])

  // Refresh available clients
  const refreshAvailableClients = useCallback(async () => {
    try {
      const res = await fetch(`/api/coach/interval-sessions/${sessionId}`)
      if (res.ok) {
        const result = await res.json()
        setAvailableClients(result.availableClients)
      }
    } catch {
      // Silently fail
    }
  }, [sessionId])

  // Auto-advance handler (called by controls for group rest)
  const handleAutoAdvance = useCallback(async () => {
    try {
      await fetch(`/api/coach/interval-sessions/${sessionId}/advance`, { method: 'POST' })
    } catch {
      toast.error(copy(locale, 'Could not auto-advance', 'Kunde inte avancera automatiskt'))
    }
  }, [sessionId, locale])

  // Auto-end session when all athletes complete all intervals (INDIVIDUAL mode)
  useEffect(() => {
    if (data.restMode !== 'INDIVIDUAL' || data.status !== 'ACTIVE') return
    if (data.participants.length === 0) return

    const allDone = data.participants.every((p) => p.allIntervalsCompleted)
    if (allDone) {
      // End the session
      void fetch(`/api/coach/interval-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      }).then(() => {
        toast.success(copy(locale, 'All athletes done - session ended', 'Alla atleter klara - session avslutad'))
      }).catch(() => {})
    }
  }, [data.restMode, data.status, data.participants, sessionId, locale])

  // Handle tap — record lap with client-side cumulative time
  const handleTap = useCallback(
    async (clientId: string) => {
      if (!data.timerStartedAt) return

      const cumulativeMs = Date.now() - new Date(data.timerStartedAt).getTime()

      try {
        const res = await fetch(`/api/coach/interval-sessions/${sessionId}/lap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, cumulativeMs }),
        })

        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error || copy(locale, 'Could not register lap', 'Kunde inte registrera varv'))
        }
      } catch {
        toast.error(copy(locale, 'Network error', 'Nätverksfel'))
      }
    },
    [sessionId, data.timerStartedAt, locale]
  )

  // Handle undo
  const handleUndo = useCallback(
    async (clientId: string, intervalNumber: number) => {
      try {
        const res = await fetch(`/api/coach/interval-sessions/${sessionId}/lap`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, intervalNumber }),
        })

        if (res.ok) {
          toast.success(copy(locale, 'Lap undone', 'Varv återkallat'))
        }
      } catch {
        toast.error(copy(locale, 'Could not undo lap', 'Kunde inte återkalla varv'))
      }
    },
    [sessionId, locale]
  )

  const handleStatusChange = useCallback(() => {
    // SSE will pick up the changes
  }, [])

  const handleAddParticipant = useCallback(
    async (clientId: string) => {
      try {
        const res = await fetch(
          `/api/coach/interval-sessions/${sessionId}/participants`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId }),
          }
        )

        if (res.ok) {
          toast.success(copy(locale, 'Athlete added', 'Atlet tillagd'))
          void refreshAvailableClients()
        }
      } catch {
        toast.error(copy(locale, 'Could not add athlete', 'Kunde inte lägga till atlet'))
      }
    },
    [sessionId, refreshAvailableClients, locale]
  )

  const isTimingActive = data.status === 'ACTIVE'
  const isLactateEntry = data.status === 'LACTATE_ENTRY'
  const isEnded = data.status === 'ENDED'
  const currentIntervalSplits = data.participants
    .map((participant) =>
      participant.laps.find((lap) => lap.intervalNumber === data.currentInterval)?.splitTimeMs
    )
    .filter((split): split is number => typeof split === 'number')
  const closedIntervalElapsedMs =
    data.summary.allTapped && currentIntervalSplits.length > 0
      ? Math.max(...currentIntervalSplits)
      : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => router.push(`${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold dark:text-white truncate">
              {data.sessionName || copy(locale, 'Interval session', 'Intervallsession')}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isConnected && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
              {data.restMode !== 'NONE' && (
                <span className="text-xs">
                  {data.restMode === 'INDIVIDUAL' ? copy(locale, 'Individual rest', 'Individuell vila') : copy(locale, 'Group rest', 'Gruppvila')}
                </span>
              )}
              {connectionError && (
                <span className="text-destructive">{connectionError}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isEnded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions/${sessionId}/analysis`
                )
              }
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {copy(locale, 'Analysis', 'Analys')}
            </Button>
          )}
          {!isEnded && (
            <AddParticipantDialog
              availableClients={availableClients}
              onAdd={handleAddParticipant}
            />
          )}
          {connectionError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Controls (timer + buttons) */}
      <IntervalSessionControls
        sessionId={sessionId}
        status={data.status}
        currentInterval={data.currentInterval}
        timerStartedAt={data.timerStartedAt}
        protocol={data.protocol}
        restMode={data.restMode}
        groupRestStartedAt={data.groupRestStartedAt}
        allTapped={data.summary.allTapped}
        closedIntervalElapsedMs={closedIntervalElapsedMs}
        onStatusChange={handleStatusChange}
        onAutoAdvance={handleAutoAdvance}
      />

      {/* Summary bar */}
      {data.status !== 'SETUP' && (
        <IntervalSummaryBar
          currentInterval={
            data.restMode === 'INDIVIDUAL'
              ? Math.max(...data.participants.map((p) => p.athleteCurrentInterval), 1)
              : data.currentInterval
          }
          totalParticipants={data.summary.totalParticipants}
          tappedThisInterval={data.summary.tappedThisInterval}
          avgSplitMs={data.summary.avgSplitMs}
          restMode={data.restMode}
          participants={data.restMode === 'INDIVIDUAL' ? data.participants : undefined}
        />
      )}

      {/* Lactate entry panel */}
      {isLactateEntry && (
        <LactateEntryPanel
          sessionId={sessionId}
          participants={data.participants}
          currentInterval={data.currentInterval}
        />
      )}

      {/* Athlete timing grid */}
      <AthleteTimingGrid
        participants={data.participants}
        currentInterval={data.currentInterval}
        disabled={!isTimingActive}
        onTap={handleTap}
        onUndo={handleUndo}
        restMode={data.restMode}
        restDurationSeconds={data.restDurationSeconds}
      />
    </div>
  )
}
