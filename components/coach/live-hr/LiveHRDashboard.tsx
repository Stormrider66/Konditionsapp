'use client'

/**
 * Live HR Dashboard
 *
 * Main component for real-time HR monitoring.
 * Uses SSE for live updates.
 */

import { useState, useEffect, useCallback } from 'react'
import { SessionControls } from './SessionControls'
import { SessionSummary } from './SessionSummary'
import { LiveHRGrid } from './LiveHRGrid'
import { AddParticipantDialog } from './AddParticipantDialog'
import { LiveHRStreamData, LiveHRSessionStatus } from '@/lib/live-hr/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface AvailableClient {
  id: string
  name: string
}

interface LiveHRDashboardProps {
  sessionId: string
  initialData: LiveHRStreamData
  initialAvailableClients: AvailableClient[]
}

export function LiveHRDashboard({
  sessionId,
  initialData,
  initialAvailableClients,
}: LiveHRDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<LiveHRStreamData>(initialData)
  const [availableClients, setAvailableClients] = useState(initialAvailableClients)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Connect to SSE stream
  useEffect(() => {
    if (data.status === 'ENDED') return

    const eventSource = new EventSource(`/api/coach/live-hr/sessions/${sessionId}/stream`)

    eventSource.onopen = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data) as LiveHRStreamData
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
      setConnectionError('Anslutningen bröts')
    })

    eventSource.onerror = () => {
      setIsConnected(false)
      setConnectionError('Anslutningen bröts')
    }

    return () => {
      eventSource.close()
    }
  }, [sessionId, data.status])

  // Update session status
  const handleStatusChange = useCallback(async (status: LiveHRSessionStatus) => {
    try {
      const res = await fetch(`/api/coach/live-hr/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) throw new Error('Failed to update session')

      const { session } = await res.json()
      setData((prev) => ({ ...prev, status: session.status }))

      if (status === 'ENDED') {
        toast.success('Session avslutad')
        router.push('/coach/live-hr')
      }
    } catch {
      toast.error('Kunde inte uppdatera sessionen')
    }
  }, [sessionId, router])

  // Add participants
  const handleAddParticipants = useCallback(async (clientIds: string[]) => {
    for (const clientId of clientIds) {
      await fetch(`/api/coach/live-hr/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
    }

    // Refresh available clients
    const res = await fetch(`/api/coach/live-hr/sessions/${sessionId}`)
    const { availableClients: newClients } = await res.json()
    setAvailableClients(newClients)

    toast.success(`${clientIds.length} atlet(er) tillagda`)
  }, [sessionId])

  // Remove participant
  const handleRemoveParticipant = useCallback(async (clientId: string) => {
    try {
      await fetch(`/api/coach/live-hr/sessions/${sessionId}/participants?clientId=${clientId}`, {
        method: 'DELETE',
      })

      // Refresh available clients
      const res = await fetch(`/api/coach/live-hr/sessions/${sessionId}`)
      const { availableClients: newClients } = await res.json()
      setAvailableClients(newClients)

      toast.success('Atlet borttagen')
    } catch {
      toast.error('Kunde inte ta bort atleten')
    }
  }, [sessionId])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/coach/live-hr')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Live HR</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-muted-foreground">
              {isConnected ? 'Ansluten' : connectionError || 'Frånkopplad'}
            </span>
            {!isConnected && data.status !== 'ENDED' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Add participants */}
          {data.status !== 'ENDED' && (
            <AddParticipantDialog
              availableClients={availableClients}
              onAdd={handleAddParticipants}
            />
          )}
        </div>
      </div>

      {/* Session controls */}
      <SessionControls
        sessionId={sessionId}
        sessionName={data.sessionName}
        status={data.status}
        onStatusChange={handleStatusChange}
      />

      {/* Summary */}
      <SessionSummary
        totalParticipants={data.summary.totalParticipants}
        activeParticipants={data.summary.activeParticipants}
        avgHeartRate={data.summary.avgHeartRate}
        zoneDistribution={data.summary.zoneDistribution}
      />

      {/* Participant grid */}
      <LiveHRGrid
        participants={data.participants}
        onRemoveParticipant={data.status !== 'ENDED' ? handleRemoveParticipant : undefined}
      />
    </div>
  )
}
