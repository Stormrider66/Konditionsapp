'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { Loader2, Calendar, Clock, MapPin, User, UserCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  RepeatWeeklyFields,
  computeWeeklyDates,
  DEFAULT_OCCURRENCES,
} from '@/components/coach/scheduling/RepeatWeeklyFields'
import { useLocale } from '@/i18n/client'

interface CoachOption {
  id: string
  name: string
  email?: string
}

interface CalendarAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionType: 'strength' | 'cardio' | 'hybrid' | 'agility'
  sessionId: string
  clientId: string
  date: string // YYYY-MM-DD
  businessSlug?: string
  businessId?: string
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
  businessId,
  onAssigned,
  onSkip,
}: CalendarAssignDialogProps) {
  const router = useRouter()
  const locale = useLocale()
  const appLocale = locale === 'sv' ? 'sv' : 'en'
  const dateLocale = locale === 'sv' ? sv : enUS
  const [athleteName, setAthleteName] = useState<string>('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [locationName, setLocationName] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [occurrences, setOccurrences] = useState(DEFAULT_OCCURRENCES)
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [selectedCoach, setSelectedCoach] = useState<string>('')

  const baseDate = useMemo(() => {
    try {
      return parseISO(date)
    } catch {
      return null
    }
  }, [date])

  // Fetch athlete name for display
  useEffect(() => {
    if (!open || !clientId) return
    let cancelled = false

    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          // /api/clients/[id] returns { success: true, data: { ...client } }
          const name = data?.data?.name ?? data?.name
          setAthleteName(name || 'Atlet')
        }
      } catch {
        // Fallback name
        if (!cancelled) setAthleteName('Atlet')
      }
    }
    fetchClient()
    return () => { cancelled = true }
  }, [open, clientId])

  // Fetch coach list (for "Ansvarig coach" selector). Defaults to current user.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function fetchCoaches() {
      try {
        if (businessId) {
          const res = await fetch(`/api/business/${businessId}/coaches`)
          if (!res.ok) return
          const data = await res.json()
          const list: CoachOption[] = (data.coaches || []).map((c: CoachOption) => ({
            id: c.id,
            name: c.name,
            email: c.email,
          }))
          if (cancelled) return
          setCoaches(list)
          // Default to current user if present in the list
          const meRes = await fetch('/api/users/me')
          if (meRes.ok) {
            const me = await meRes.json()
            const meId = me?.data?.id || me?.id
            if (!cancelled && meId && list.some((c) => c.id === meId)) {
              setSelectedCoach(meId)
            }
          }
        } else {
          const res = await fetch('/api/users/me')
          if (!res.ok) return
          const data = await res.json()
          const me = data?.data || data
          if (!cancelled && me?.id) {
            setCoaches([{ id: me.id, name: me.name || 'Jag', email: me.email }])
            setSelectedCoach(me.id)
          }
        }
      } catch {
        /* non-critical */
      }
    }
    fetchCoaches()
    return () => { cancelled = true }
  }, [open, businessId])

  const formattedDate = (() => {
    try {
      return format(parseISO(date), 'd MMMM yyyy', { locale: dateLocale })
    } catch {
      return date
    }
  })()

  const redirectToCalendar = (focusDate?: string) => {
    const prefix = businessSlug ? `/${businessSlug}` : ''
    const targetDate = focusDate || date
    const query = targetDate ? `?date=${targetDate}` : ''
    const url = `${prefix}/coach/athletes/${clientId}/calendar${query}`
    // Hard navigation: a soft `router.push` sometimes doesn't surface the new
    // `?date=` param to the target page's client hooks in time for the month
    // state to pick it up. A full page load is simpler and more reliable here,
    // and the coach is done with this flow anyway.
    if (typeof window !== 'undefined') {
      window.location.href = url
    } else {
      router.push(url)
    }
  }

  const handleAssign = async () => {
    setAssigning(true)
    try {
      const targetDates = repeatEnabled && baseDate
        ? computeWeeklyDates(baseDate, occurrences)
        : baseDate
          ? [baseDate]
          : []

      if (targetDates.length === 0) {
        toast.error('Kunde inte tilldela', { description: 'Ogiltigt datum.' })
        return
      }

      const results = await Promise.all(
        targetDates.map(async (d) => {
          const dateStr = format(d, 'yyyy-MM-dd')

          const commonFields = {
            athleteIds: [clientId],
            assignedDate: dateStr,
            ...(startTime && { startTime }),
            ...(endTime && { endTime }),
            ...(locationName && { locationName }),
            createCalendarEvent: true,
            ...(selectedCoach && { responsibleCoachId: selectedCoach }),
          }

          let url: string
          let body: Record<string, unknown>

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

          try {
            const r = await fetch(url!, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
                ...(businessId ? { 'x-business-id': businessId } : {}),
              },
              body: JSON.stringify(body!),
            })
            return r.ok
          } catch {
            return false
          }
        })
      )

      const successCount = results.filter(Boolean).length
      const total = targetDates.length

      if (successCount === 0) {
        toast.error(appLocale === 'sv' ? 'Kunde inte tilldela' : 'Could not assign', {
          description: appLocale === 'sv' ? 'Ett fel uppstod.' : 'An error occurred.',
        })
        return
      }

      if (successCount < total) {
        toast.warning(appLocale === 'sv' ? `${successCount} av ${total} pass tilldelade` : `${successCount} of ${total} workouts assigned`, {
          description: appLocale === 'sv' ? `${total - successCount} pass misslyckades.` : `${total - successCount} workouts failed.`,
        })
      } else {
        toast.success(
          appLocale === 'sv'
            ? total === 1 ? 'Pass tilldelat!' : `${total} pass tilldelade!`
            : total === 1 ? 'Workout assigned!' : `${total} workouts assigned!`,
          {
            description: total === 1
              ? appLocale === 'sv' ? `Tilldelat till ${athleteName} den ${formattedDate}.` : `Assigned to ${athleteName} on ${formattedDate}.`
              : appLocale === 'sv' ? `Tilldelat till ${athleteName} med start ${formattedDate}.` : `Assigned to ${athleteName} starting ${formattedDate}.`,
          }
        )
      }

      onOpenChange(false)
      onAssigned?.()
      redirectToCalendar()
    } catch (error) {
      console.error('Failed to assign:', error)
      toast.error(appLocale === 'sv' ? 'Kunde inte tilldela' : 'Could not assign', {
        description: appLocale === 'sv' ? 'Ett oväntat fel uppstod.' : 'An unexpected error occurred.',
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {appLocale === 'sv' ? 'Tilldela pass' : 'Assign workout'}{athleteName ? ` ${appLocale === 'sv' ? 'till' : 'to'} ${athleteName}` : ''}
          </DialogTitle>
          <DialogDescription>
            {appLocale === 'sv' ? 'Tilldela till' : 'Assign to'} <strong>{athleteName || '...'}</strong> {appLocale === 'sv' ? 'den' : 'on'}{' '}
            <strong>{formattedDate}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto min-h-0">
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
                {appLocale === 'sv' ? 'Starttid' : 'Start time'}
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
                {appLocale === 'sv' ? 'Sluttid' : 'End time'}
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
              {appLocale === 'sv' ? 'Plats' : 'Location'}
            </Label>
            <Input
              id="location"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={appLocale === 'sv' ? 't.ex. Gymmet, Utomhus...' : 'e.g. Gym, outdoors...'}
            />
          </div>

          {/* Optional: Responsible coach */}
          {coaches.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="coach" className="flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5" />
                {appLocale === 'sv' ? 'Ansvarig coach' : 'Responsible coach'}
              </Label>
              <Select
                value={selectedCoach || 'none'}
                onValueChange={(v) => setSelectedCoach(v === 'none' ? '' : v)}
              >
                <SelectTrigger id="coach">
                  <SelectValue placeholder={appLocale === 'sv' ? 'Välj coach...' : 'Choose coach...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{appLocale === 'sv' ? 'Ingen vald' : 'None selected'}</SelectItem>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Repeat weekly */}
          <RepeatWeeklyFields
            enabled={repeatEnabled}
            onEnabledChange={setRepeatEnabled}
            occurrences={occurrences}
            onOccurrencesChange={setOccurrences}
            baseDate={baseDate}
          />
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip} disabled={assigning}>
            {appLocale === 'sv' ? 'Hoppa över' : 'Skip'}
          </Button>
          <Button onClick={handleAssign} disabled={assigning}>
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {appLocale === 'sv' ? 'Tilldelar...' : 'Assigning...'}
              </>
            ) : repeatEnabled ? (
              appLocale === 'sv' ? `Tilldela ${occurrences} pass` : `Assign ${occurrences} workouts`
            ) : (
              appLocale === 'sv' ? 'Tilldela' : 'Assign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
