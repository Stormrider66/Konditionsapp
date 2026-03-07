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
  IntervalSessionStatus,
} from '@/lib/interval-session/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, UserPlus, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

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
      setConnectionError('Anslutningen brots')
    })

    eventSource.onerror = () => {
      setIsConnected(false)
      setConnectionError('Anslutningen brots')
    }

    return () => {
      eventSource.close()
    }
  }, [sessionId, data.status])

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

  // Handle tap — record lap with client-side cumulative time
  const handleTap = useCallback(
    async (clientId: string) => {
      if (!data.timerStartedAt) return

      const cumulativeMs = Date.now() - new Date(data.timerStartedAt).getTime()

      // Optimistic: no UI update needed, SSE will push new data
      try {
        const res = await fetch(`/api/coach/interval-sessions/${sessionId}/lap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, cumulativeMs }),
        })

        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error || 'Kunde inte registrera varv')
        }
      } catch {
        toast.error('Natverksfel')
      }
    },
    [sessionId, data.timerStartedAt]
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
          toast.success('Varv aterkallt')
        }
      } catch {
        toast.error('Kunde inte aterkalla varv')
      }
    },
    [sessionId]
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
          toast.success('Atlet tillagd')
          refreshAvailableClients()
        }
      } catch {
        toast.error('Kunde inte lagga till atlet')
      }
    },
    [sessionId, refreshAvailableClients]
  )

  const isTimingActive = data.status === 'ACTIVE'
  const isLactateEntry = data.status === 'LACTATE_ENTRY'
  const isEnded = data.status === 'ENDED'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`${businessSlug ? `/${businessSlug}` : ''}/coach/interval-sessions`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold dark:text-white">
              {data.sessionName || 'Intervallsession'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isConnected && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              )}
              {connectionError && (
                <span className="text-destructive">{connectionError}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              Analys
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
        onStatusChange={handleStatusChange}
      />

      {/* Summary bar */}
      {data.status !== 'SETUP' && (
        <IntervalSummaryBar
          currentInterval={data.currentInterval}
          totalParticipants={data.summary.totalParticipants}
          tappedThisInterval={data.summary.tappedThisInterval}
          avgSplitMs={data.summary.avgSplitMs}
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
      />
    </div>
  )
}
