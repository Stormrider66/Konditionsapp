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
import {
  GlassCard,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { Play, Pause, Square, Radio } from 'lucide-react'
import { LiveHRSessionStatus } from '@/lib/live-hr/types'
import { useLocale } from '@/i18n/client'

interface SessionControlsProps {
  sessionId: string
  sessionName: string | null
  status: LiveHRSessionStatus
  onStatusChange: (status: LiveHRSessionStatus) => Promise<void>
}

type AppLocale = 'en' | 'sv'

const COPY: Record<AppLocale, {
  paused: string
  ended: string
  pause: string
  resume: string
  end: string
  endTitle: string
  endDescription: string
  cancel: string
  endSession: string
}> = {
  en: {
    paused: 'PAUSED',
    ended: 'ENDED',
    pause: 'Pause',
    resume: 'Resume',
    end: 'End',
    endTitle: 'End session?',
    endDescription: 'This ends live monitoring. You cannot resume the session afterward.',
    cancel: 'Cancel',
    endSession: 'End session',
  },
  sv: {
    paused: 'PAUSAD',
    ended: 'AVSLUTAD',
    pause: 'Pausa',
    resume: 'Återuppta',
    end: 'Avsluta',
    endTitle: 'Avsluta session?',
    endDescription: 'Detta avslutar live-övervakningen. Du kan inte återuppta sessionen efteråt.',
    cancel: 'Avbryt',
    endSession: 'Avsluta session',
  },
}

export function SessionControls({
  sessionName,
  status,
  onStatusChange,
}: SessionControlsProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus: LiveHRSessionStatus) => {
    setIsLoading(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setIsLoading(false)
    }
  }

  const glowColor = status === 'ACTIVE' ? 'red' : (status === 'PAUSED' ? 'emerald' : 'blue')

  return (
    <GlassCard glow={glowColor} className="bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 shadow-md mb-6">
      <GlassCardContent className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          {status === 'ACTIVE' ? (
            <>
              <Radio className="h-5 w-5 text-red-500 animate-pulse" />
              <Badge variant="destructive">LIVE</Badge>
            </>
          ) : status === 'PAUSED' ? (
            <Badge variant="secondary">{copy.paused}</Badge>
          ) : (
            <Badge variant="outline">{copy.ended}</Badge>
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
            {copy.pause}
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
            {copy.resume}
          </Button>
        )}

        {status !== 'ENDED' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isLoading}>
                <Square className="h-4 w-4 mr-1" />
                {copy.end}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{copy.endTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {copy.endDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleStatusChange('ENDED')}
                >
                  {copy.endSession}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </GlassCardContent>
  </GlassCard>
  )
}
