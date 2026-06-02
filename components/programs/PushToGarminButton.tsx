'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
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
  const locale = useLocale()
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
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
          toast.error(t('Garmin Connect är inte anslutet', 'Garmin Connect is not connected'), {
            description: t(
              'Atleten behöver ansluta Garmin Connect i sina inställningar.',
              'The athlete needs to connect Garmin Connect in their settings.'
            ),
          })
        } else {
          toast.error(data.error || t('Kunde inte skicka till Garmin Connect', 'Could not send to Garmin Connect'))
        }
        return
      }

      setPushed(true)
      toast.success(t('Skickat till Garmin Connect', 'Sent to Garmin Connect'), {
        description: data.scheduled
          ? t(
              'Passet är schemalagt i atletens Garmin Connect-kalender.',
              "The session is scheduled in the athlete's Garmin Connect calendar."
            )
          : t(
              'Passet finns nu i atletens Garmin Connect.',
              "The session is now in the athlete's Garmin Connect."
            ),
      })
    } catch {
      toast.error(t('Nätverksfel — försök igen', 'Network error - try again'))
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
            title={pushed ? t('Skickat till Garmin Connect', 'Sent to Garmin Connect') : t('Skicka till Garmin Connect', 'Send to Garmin Connect')}
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
          {pushed
            ? t('Redan skickad till Garmin Connect — tryck för att skicka igen', 'Already sent to Garmin Connect - click to send again')
            : t('Skicka till Garmin Connect', 'Send to Garmin Connect')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
