'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Watch, Check, Loader2 } from 'lucide-react'
import { useLocale } from '@/i18n/client'

interface PushStrengthToGarminButtonProps {
  sessionId: string
  athleteId: string
  scheduleDate?: string
  size?: 'sm' | 'default' | 'icon'
}

export function PushStrengthToGarminButton({
  sessionId,
  athleteId,
  scheduleDate,
  size = 'sm',
}: PushStrengthToGarminButtonProps) {
  const locale = useLocale() === 'sv' ? 'sv' : 'en'
  const [loading, setLoading] = useState(false)
  const [pushed, setPushed] = useState(false)
  const text = (sv: string, en: string) => (locale === 'sv' ? sv : en)

  const handlePush = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/strength-sessions/${sessionId}/push-garmin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId, scheduleDate }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || text('Kunde inte skicka till Garmin', 'Could not send to Garmin'))
        return
      }

      setPushed(true)
      toast.success(text('Skickat till Garmin', 'Sent to Garmin'), {
        description: data.message,
      })
    } catch {
      toast.error(text('Kunde inte skicka till Garmin', 'Could not send to Garmin'))
    } finally {
      setLoading(false)
    }
  }

  if (pushed) {
    return (
      <Button variant="ghost" size={size} disabled className="text-green-600">
        <Check className="h-3.5 w-3.5 mr-1" />
        Garmin
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={(e) => { e.stopPropagation(); handlePush() }}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <Watch className="h-3.5 w-3.5 mr-1" />
      )}
      Garmin
    </Button>
  )
}
