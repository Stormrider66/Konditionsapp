'use client'

/**
 * Send an AI WOD to the athlete's own Garmin watch.
 * Athlete-scoped — posts to /api/ai/wod/[id]/push-garmin (no clientId needed;
 * the route resolves the logged-in athlete and verifies they own the WOD).
 */

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Watch, Check, Loader2 } from 'lucide-react'

interface PushWodToGarminButtonProps {
  wodId: string
  alreadyPushed?: boolean
}

export function PushWodToGarminButton({ wodId, alreadyPushed = false }: PushWodToGarminButtonProps) {
  const locale = useLocale()
  const t = (sv: string, en: string) => (locale === 'sv' ? sv : en)
  const [loading, setLoading] = useState(false)
  const [pushed, setPushed] = useState(alreadyPushed)

  const handlePush = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/wod/${wodId}/push-garmin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.code === 'GARMIN_NOT_CONNECTED') {
          toast.error(t('Garmin är inte anslutet', 'Garmin is not connected'), {
            description: t(
              'Anslut Garmin Connect i dina inställningar för att skicka pass till klockan.',
              'Connect Garmin Connect in your settings to send workouts to your watch.'
            ),
          })
        } else {
          toast.error(data.error || t('Kunde inte skicka till Garmin', 'Could not send to Garmin'))
        }
        return
      }

      setPushed(true)
      toast.success(t('Skickat till Garmin', 'Sent to Garmin'), {
        description: data.scheduleWarning
          ? t('Passet finns i Garmin, men kunde inte schemaläggas i kalendern.', 'The workout is in Garmin, but could not be scheduled on the calendar.')
          : t('Passet ligger nu på din klocka för idag.', "The workout is now on your watch for today."),
      })
    } catch {
      toast.error(t('Nätverksfel — försök igen', 'Network error - try again'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handlePush}
      disabled={loading}
      className="w-full sm:w-auto min-h-[48px] border-slate-300 bg-white/70 text-slate-900 hover:bg-white hover:border-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/30 transition-all"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : pushed ? (
        <Check className="w-4 h-4 mr-2 text-green-600" />
      ) : (
        <Watch className="w-4 h-4 mr-2" />
      )}
      {pushed ? t('Skickat till Garmin', 'Sent to Garmin') : t('Skicka till Garmin', 'Send to Garmin')}
    </Button>
  )
}
