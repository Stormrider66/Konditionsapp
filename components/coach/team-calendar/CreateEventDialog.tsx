'use client'

import { type ReactNode, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

const CONTENT_OWNER_OPTIONS = [
  { value: 'coach', label: 'Tränarstab' },
  { value: 'physical_trainer', label: 'Fystränare' },
  { value: 'physio', label: 'Fysioterapeut' },
  { value: 'shared', label: 'Delat ansvar' },
]

const CONTENT_STATUS_OPTIONS = [
  { value: 'planned_shell', label: 'Planerad ram' },
  { value: 'needs_content', label: 'Behöver innehåll' },
  { value: 'content_added', label: 'Innehåll klart' },
]

interface CreateEventDialogProps {
  teamId: string
  businessSlug?: string
  onCreated: () => void
  trigger?: ReactNode
  defaultDate?: string
  defaultType?: TeamEventType
}

export function CreateEventDialog({
  teamId,
  businessSlug,
  onCreated,
  trigger,
  defaultDate,
  defaultType = 'PRACTICE',
}: CreateEventDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<TeamEventType>(defaultType)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(defaultDate ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [contentOwner, setContentOwner] = useState('physical_trainer')
  const [contentStatus, setContentStatus] = useState('planned_shell')

  const buildDescription = () => {
    const ownerLabel = CONTENT_OWNER_OPTIONS.find((option) => option.value === contentOwner)?.label ?? 'Delat ansvar'
    const statusLabel = CONTENT_STATUS_OPTIONS.find((option) => option.value === contentStatus)?.label ?? 'Planerad ram'
    const planningLines = [
      `Planeringsstatus: ${statusLabel}`,
      `Innehållsansvarig: ${ownerLabel}`,
    ]
    const notes = description.trim()
    return notes ? `${planningLines.join('\n')}\n\n${notes}` : planningLines.join('\n')
  }

  const handleCreate = async () => {
    if (!title.trim() || !startDate) {
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
        : undefined

      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          type,
          description: buildDescription(),
          location: location.trim() || undefined,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success('Händelse skapad')
      setOpen(false)
      resetForm()
      onCreated()
    } catch {
      toast.error('Kunde inte skapa händelse')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setType(defaultType)
    setDescription('')
    setLocation('')
    setStartDate(defaultDate ?? '')
    setStartTime('')
    setEndTime('')
    setAllDay(false)
    setContentOwner('physical_trainer')
    setContentStatus('planned_shell')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setType(defaultType)
      setStartDate(defaultDate ?? '')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Ny händelse
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skapa händelse</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Styrketräning, Match vs AIK"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={contentStatus} onValueChange={setContentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Innehåll</Label>
              <Select value={contentOwner} onValueChange={setContentOwner}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_OWNER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              id="all-day"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
            <Label htmlFor="all-day" className="text-sm">Heldag</Label>
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
            <Label>Plats (valfritt)</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="t.ex. Isrinken, Gymmet"
            />
          </div>

          <div className="space-y-2">
            <Label>Plan och innehåll (valfritt)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lägg in plan, fokus, övningar eller instruktioner..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Skapar...' : 'Skapa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
