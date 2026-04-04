'use client'

import { useState } from 'react'
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
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

const EVENT_TYPES = [
  { value: 'PRACTICE', label: 'Träning' },
  { value: 'GAME', label: 'Match' },
  { value: 'TEST', label: 'Test' },
  { value: 'INTERVAL_SESSION', label: 'Intervallpass' },
  { value: 'OFF_DAY', label: 'Vilodag' },
  { value: 'MEETING', label: 'Möte' },
  { value: 'OTHER', label: 'Övrigt' },
]

interface CreateEventDialogProps {
  teamId: string
  onCreated: () => void
}

export function CreateEventDialog({ teamId, onCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('PRACTICE')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)

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

      const res = await fetch(`/api/coach/teams/${teamId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          description: description.trim() || undefined,
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
    setType('PRACTICE')
    setDescription('')
    setLocation('')
    setStartDate('')
    setStartTime('')
    setEndTime('')
    setAllDay(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Ny händelse
        </Button>
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
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
            <Label>Beskrivning (valfritt)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaljer om passet..."
              rows={2}
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
