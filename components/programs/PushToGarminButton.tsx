'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Watch, Check, Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PushToGarminButtonProps {
  workoutId: string
  clientId: string
  /** YYYY-MM-DD — if provided the workout is also scheduled on this date */
  scheduleDate?: string
  /** Whether the workout has already been pushed */
  alreadyPushed?: boolean
}

export function PushToGarminButton({
  workoutId,
  clientId,
  scheduleDate,
  alreadyPushed = false,
}: PushToGarminButtonProps) {
  const [loading, setLoading] = useState(false)
  const [pushed, setPushed] = useState(alreadyPushed)

  const handlePush = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/garmin/workouts/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, clientId, scheduleDate }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'GARMIN_NOT_CONNECTED') {
          toast.error('Garmin inte anslutet', {
            description: 'Atleten behöver ansluta Garmin Connect i sina inställningar.',
          })
        } else {
          toast.error(data.error || 'Kunde inte skicka till Garmin')
        }
        return
      }

      setPushed(true)
      toast.success('Skickat till Garmin', {
        description: data.scheduled
          ? 'Passet är schemalagt i atletens Garmin Connect-kalender.'
          : 'Passet finns nu i atletens Garmin Connect.',
      })
    } catch {
      toast.error('Nätverksfel — försök igen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${pushed ? 'text-green-600' : 'text-slate-400 hover:text-primary'}`}
            onClick={handlePush}
            disabled={loading}
            title={pushed ? 'Skickat till Garmin' : 'Skicka till Garmin'}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pushed ? (
              <Check className="h-4 w-4" />
            ) : (
              <Watch className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {pushed ? 'Redan skickad till Garmin — tryck för att skicka igen' : 'Skicka till Garmin-klocka'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
