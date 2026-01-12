'use client'

/**
 * Session Controls
 *
 * Controls for managing live HR session (pause, resume, end).
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Play, Pause, Square, Radio } from 'lucide-react'
import { LiveHRSessionStatus } from '@/lib/live-hr/types'

interface SessionControlsProps {
  sessionId: string
  sessionName: string | null
  status: LiveHRSessionStatus
  onStatusChange: (status: LiveHRSessionStatus) => Promise<void>
}

export function SessionControls({
  sessionName,
  status,
  onStatusChange,
}: SessionControlsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus: LiveHRSessionStatus) => {
    setIsLoading(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between bg-card rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          {status === 'ACTIVE' ? (
            <>
              <Radio className="h-5 w-5 text-red-500 animate-pulse" />
              <Badge variant="destructive">LIVE</Badge>
            </>
          ) : status === 'PAUSED' ? (
            <Badge variant="secondary">PAUSAD</Badge>
          ) : (
            <Badge variant="outline">AVSLUTAD</Badge>
          )}
        </div>

        {/* Session name */}
        <div>
          <h2 className="font-semibold">
            {sessionName || 'Live HR Session'}
          </h2>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {status === 'ACTIVE' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('PAUSED')}
            disabled={isLoading}
          >
            <Pause className="h-4 w-4 mr-1" />
            Pausa
          </Button>
        )}

        {status === 'PAUSED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('ACTIVE')}
            disabled={isLoading}
          >
            <Play className="h-4 w-4 mr-1" />
            Återuppta
          </Button>
        )}

        {status !== 'ENDED' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isLoading}>
                <Square className="h-4 w-4 mr-1" />
                Avsluta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Avsluta session?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta avslutar live-övervakningen. Du kan inte återuppta sessionen efteråt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleStatusChange('ENDED')}
                >
                  Avsluta session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
