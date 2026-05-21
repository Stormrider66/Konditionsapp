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
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { getBusinessSlugFromPathname } from '@/lib/business-scope-client'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useLocale } from '@/i18n/client'

interface AvailableClient {
  id: string
  name: string
}

interface LiveHRDashboardProps {
  sessionId: string
  initialData: LiveHRStreamData
  initialAvailableClients: AvailableClient[]
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  connectionLost: string
  updateError: string
  sessionEnded: string
  participantAdded: (count: number) => string
  participantRemoved: string
  removeError: string
  connected: string
  disconnected: string
}> = {
  en: {
    connectionLost: 'Connection lost',
    updateError: 'Could not update session',
    sessionEnded: 'Session ended',
    participantAdded: (count) => `${count} athlete(s) added`,
    participantRemoved: 'Athlete removed',
    removeError: 'Could not remove athlete',
    connected: 'Connected',
    disconnected: 'Disconnected',
  },
  sv: {
    connectionLost: 'Anslutningen bröts',
    updateError: 'Kunde inte uppdatera sessionen',
    sessionEnded: 'Session avslutad',
    participantAdded: (count) => `${count} atlet(er) tillagda`,
    participantRemoved: 'Atlet borttagen',
    removeError: 'Kunde inte ta bort atleten',
    connected: 'Ansluten',
    disconnected: 'Frånkopplad',
  },
}

export function LiveHRDashboard({
  sessionId,
  initialData,
  initialAvailableClients,
}: LiveHRDashboardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const router = useRouter()
  const pathname = usePathname()
  const pathBusinessSlug = getBusinessSlugFromPathname(pathname)
  const basePath = pathBusinessSlug ? `/${pathBusinessSlug}` : ''
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
      setConnectionError(copy.connectionLost)
    })

    eventSource.onerror = () => {
      setIsConnected(false)
      setConnectionError(copy.connectionLost)
    }

    return () => {
      eventSource.close()
    }
  }, [copy.connectionLost, sessionId, data.status])

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
        toast.success(copy.sessionEnded)
        router.push(`${basePath}/coach/live-hr`)
      }
    } catch {
      toast.error(copy.updateError)
    }
  }, [basePath, copy.sessionEnded, copy.updateError, sessionId, router])

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

    toast.success(copy.participantAdded(clientIds.length))
  }, [copy, sessionId])

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

      toast.success(copy.participantRemoved)
    } catch {
      toast.error(copy.removeError)
    }
  }, [copy.participantRemoved, copy.removeError, sessionId])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`${basePath}/coach/live-hr`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-1.5">Live HR <InfoTooltip conceptKey="liveHrZones" /></h1>
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
              {isConnected ? copy.connected : connectionError || copy.disconnected}
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
