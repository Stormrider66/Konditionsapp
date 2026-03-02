'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Loader2, Calendar, Clock, MapPin, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CalendarAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionType: 'strength' | 'cardio' | 'hybrid' | 'agility'
  sessionId: string
  clientId: string
  date: string // YYYY-MM-DD
  businessSlug?: string
  onAssigned?: () => void
  onSkip?: () => void
}

export function CalendarAssignDialog({
  open,
  onOpenChange,
  sessionType,
  sessionId,
  clientId,
  date,
  businessSlug,
  onAssigned,
  onSkip,
}: CalendarAssignDialogProps) {
  const router = useRouter()
  const [athleteName, setAthleteName] = useState<string>('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [locationName, setLocationName] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Fetch athlete name for display
  useEffect(() => {
    if (!open || !clientId) return
    let cancelled = false

    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setAthleteName(data.name || 'Atlet')
        }
      } catch {
        // Fallback name
        if (!cancelled) setAthleteName('Atlet')
      }
    }
    fetchClient()
    return () => { cancelled = true }
  }, [open, clientId])

  const formattedDate = (() => {
    try {
      return format(parseISO(date), 'd MMMM yyyy', { locale: sv })
    } catch {
      return date
    }
  })()

  const redirectToCalendar = () => {
    const prefix = businessSlug ? `/${businessSlug}` : ''
    router.push(`${prefix}/coach/clients/${clientId}/calendar`)
  }

  const handleAssign = async () => {
    setAssigning(true)
    try {
      let url: string
      let body: Record<string, unknown>

      const commonFields = {
        athleteIds: [clientId],
        assignedDate: date,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(locationName && { locationName }),
        ...(startTime && { createCalendarEvent: true }),
      }

      switch (sessionType) {
        case 'strength':
          url = `/api/strength-sessions/${sessionId}/assign`
          body = commonFields
          break
        case 'cardio':
          url = `/api/cardio-sessions/${sessionId}/assign`
          body = commonFields
          break
        case 'hybrid':
          url = '/api/hybrid-assignments'
          body = { ...commonFields, workoutId: sessionId }
          break
        case 'agility':
          url = `/api/agility-workouts/${sessionId}/assign`
          body = commonFields
          break
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success('Pass tilldelat!', {
          description: `Tilldelat till ${athleteName} den ${formattedDate}.`,
        })
        onOpenChange(false)
        onAssigned?.()
        redirectToCalendar()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error('Kunde inte tilldela', {
          description: data.error || 'Ett fel uppstod.',
        })
      }
    } catch (error) {
      console.error('Failed to assign:', error)
      toast.error('Kunde inte tilldela', {
        description: 'Ett oväntat fel uppstod.',
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleSkip = () => {
    onOpenChange(false)
    onSkip?.()
    redirectToCalendar()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tilldela pass</DialogTitle>
          <DialogDescription>
            Tilldela till <strong>{athleteName || '...'}</strong> den{' '}
            <strong>{formattedDate}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Read-only info */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <User className="h-4 w-4 shrink-0" />
            <span>{athleteName || '...'}</span>
            <Calendar className="h-4 w-4 shrink-0 ml-auto" />
            <span>{formattedDate}</span>
          </div>

          {/* Optional: Start time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Starttid
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="08:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Sluttid
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="09:00"
              />
            </div>
          </div>

          {/* Optional: Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Plats
            </Label>
            <Input
              id="location"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="t.ex. Gymmet, Utomhus..."
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip} disabled={assigning}>
            Hoppa över
          </Button>
          <Button onClick={handleAssign} disabled={assigning}>
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tilldelar...
              </>
            ) : (
              'Tilldela'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
