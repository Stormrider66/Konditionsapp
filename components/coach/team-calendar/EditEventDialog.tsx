'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TEAM_EVENT_TYPE_LABELS, TEAM_EVENT_TYPES, type TeamEventType } from '@/lib/team-calendar/event-types'
import { toast } from 'sonner'

interface EditableTeamEvent {
  id: string
  title: string
  description: string | null
  type: string
  location: string | null
  startDate: string
  endDate: string | null
  allDay: boolean
}

interface EditEventDialogProps {
  event: EditableTeamEvent | null
  teamId: string
  businessSlug?: string
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

function dateValue(iso: string) {
  return new Date(iso).toISOString().slice(0, 10)
}

function timeValue(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toTimeString().slice(0, 5)
}

export function EditEventDialog({
  event,
  teamId,
  businessSlug,
  onOpenChange,
  onUpdated,
}: EditEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TeamEventType>('PRACTICE')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)

  useEffect(() => {
    if (!event) return
    setTitle(event.title)
    setType(TEAM_EVENT_TYPES.includes(event.type as TeamEventType) ? event.type as TeamEventType : 'OTHER')
    setDescription(event.description ?? '')
    setLocation(event.location ?? '')
    setStartDate(dateValue(event.startDate))
    setStartTime(timeValue(event.startDate))
    setEndTime(timeValue(event.endDate))
    setAllDay(event.allDay)
  }, [event])

  const handleUpdate = async () => {
    if (!event || !title.trim() || !startDate) {
      toast.error('Ange titel och datum')
      return
    }

    setLoading(true)
    try {
      const startDateTime = allDay
        ? `${startDate}T00:00:00`
        : `${startDate}T${startTime || '09:00'}:00`
      const endDateTime = endTime && !allDay
        ? `${startDate}T${endTime}:00`
        : null

      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events/${event.id}${params.size ? `?${params}` : ''}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          type,
          description: description.trim() || null,
          location: location.trim() || null,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success('Händelse uppdaterad')
      onOpenChange(false)
      onUpdated()
    } catch {
      toast.error('Kunde inte uppdatera händelse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={Boolean(event)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planera pass</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Is + styrka"
            />
          </div>

          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={type} onValueChange={(value) => setType(value as TeamEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_EVENT_TYPES.map((eventType) => (
                  <SelectItem key={eventType} value={eventType}>
                    {TEAM_EVENT_TYPE_LABELS[eventType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Datum</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="edit-all-day"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
            <Label htmlFor="edit-all-day" className="text-sm">Heldag</Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Starttid</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sluttid</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Plats</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="t.ex. Isrinken, Gymmet"
            />
          </div>

          <div className="space-y-2">
            <Label>Plan och innehåll</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fyll i passets innehåll, fokus, övningar eller ansvar..."
              rows={6}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? 'Sparar...' : 'Spara'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
