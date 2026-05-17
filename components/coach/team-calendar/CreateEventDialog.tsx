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
import {
  TEAM_EVENT_CONTENT_OWNER_LABELS,
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUS_LABELS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPE_LABELS,
  TEAM_EVENT_TYPES,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  icePracticeTemplate,
  practiceBlocksToDescription,
  type PracticeBlock,
  type PracticeTemplateKind,
} from '@/lib/team-calendar/practice-plan'

interface CreateEventDialogProps {
  teamId: string
  businessSlug?: string
  onCreated: () => void
  trigger?: ReactNode
  defaultDate?: string
  defaultType?: TeamEventType
  defaultTitle?: string
  defaultContentStatus?: TeamEventContentStatus
  defaultContentOwner?: TeamEventContentOwner
  allowedEventTypes?: TeamEventType[]
}

export function CreateEventDialog({
  teamId,
  businessSlug,
  onCreated,
  trigger,
  defaultDate,
  defaultType = 'PRACTICE',
  defaultTitle = '',
  defaultContentStatus = 'PLANNED',
  defaultContentOwner = 'physical_trainer',
  allowedEventTypes,
}: CreateEventDialogProps) {
  const availableEventTypes = allowedEventTypes?.length ? allowedEventTypes : [...TEAM_EVENT_TYPES]
  const initialType = availableEventTypes.includes(defaultType) ? defaultType : availableEventTypes[0] ?? defaultType
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState(defaultTitle)
  const [type, setType] = useState<TeamEventType>(initialType)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(defaultDate ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [contentOwner, setContentOwner] = useState<TeamEventContentOwner>(defaultContentOwner)
  const [contentStatus, setContentStatus] = useState<TeamEventContentStatus>(defaultContentStatus)
  const [practiceBlocks, setPracticeBlocks] = useState<PracticeBlock[]>([])
  const isIcePractice = type === 'PRACTICE' || type === 'ICE_PRACTICE'
  const practiceMinutes = practiceBlocks.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)

  const applyPracticeTemplate = (kind: PracticeTemplateKind) => {
    const blocks = icePracticeTemplate(kind)
    setPracticeBlocks(blocks)
    setDescription(practiceBlocksToDescription(blocks))
  }

  const handleCreate = async () => {
    if (!title.trim() || !startDate) {
      toast.error('Ange titel och datum')
      return
    }
    if (!availableEventTypes.includes(type)) {
      toast.error('Din roll kan inte skapa den här typen av händelse')
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
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay,
          contentStatus,
          contentOwner,
          practicePlan: isIcePractice ? practiceBlocks : null,
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
    setTitle(defaultTitle)
    setType(initialType)
    setDescription('')
    setLocation('')
    setStartDate(defaultDate ?? '')
    setStartTime('')
    setEndTime('')
    setAllDay(false)
    setContentOwner(defaultContentOwner)
    setContentStatus(defaultContentStatus)
    setPracticeBlocks([])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setTitle(defaultTitle)
      setType(initialType)
      setStartDate(defaultDate ?? '')
      setContentOwner(defaultContentOwner)
      setContentStatus(defaultContentStatus)
      setPracticeBlocks([])
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
                {availableEventTypes.map((eventType) => (
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
              <Select value={contentStatus} onValueChange={(value) => setContentStatus(value as TeamEventContentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_EVENT_CONTENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {TEAM_EVENT_CONTENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Innehåll</Label>
              <Select value={contentOwner} onValueChange={(value) => setContentOwner(value as TeamEventContentOwner)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_EVENT_CONTENT_OWNERS.map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {TEAM_EVENT_CONTENT_OWNER_LABELS[owner]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isIcePractice && (
            <div className="rounded-md border bg-muted/35 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Ispass-mall</div>
                  <div className="text-xs text-muted-foreground">
                    Lägg in en färdig blockplan direkt när händelsen skapas.
                  </div>
                </div>
                {practiceBlocks.length > 0 && (
                  <div className="shrink-0 rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">
                    {practiceBlocks.length} block · {practiceMinutes} min
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPracticeTemplate('skills')}
                >
                  Teknik + fart
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPracticeTemplate('tactical')}
                >
                  Taktik
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPracticeTemplate('gamePrep')}
                >
                  Matchförberedelse
                </Button>
              </div>
            </div>
          )}

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
