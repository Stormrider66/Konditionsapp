'use client'

import { type ReactNode, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { MapPin, Plus, Repeat } from 'lucide-react'
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

interface CalendarLocationOption {
  id: string
  name: string
  source: 'gym' | 'team'
  description: string | null
  isPrimary: boolean
}

const CUSTOM_LOCATION_VALUE = '__custom__'

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
  const [createError, setCreateError] = useState<string | null>(null)

  const [title, setTitle] = useState(defaultTitle)
  const [type, setType] = useState<TeamEventType>(initialType)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [locationMode, setLocationMode] = useState(CUSTOM_LOCATION_VALUE)
  const [locationOptions, setLocationOptions] = useState<CalendarLocationOption[]>([])
  const [saveCustomLocation, setSaveCustomLocation] = useState(false)
  const [startDate, setStartDate] = useState(defaultDate ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [contentOwner, setContentOwner] = useState<TeamEventContentOwner>(defaultContentOwner)
  const [contentStatus, setContentStatus] = useState<TeamEventContentStatus>(defaultContentStatus)
  const [practiceBlocks, setPracticeBlocks] = useState<PracticeBlock[]>([])
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [repeatWeeks, setRepeatWeeks] = useState('4')
  const isIcePractice = type === 'PRACTICE' || type === 'ICE_PRACTICE'
  const practiceMinutes = practiceBlocks.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const loadLocations = async () => {
      try {
        const params = new URLSearchParams()
        if (businessSlug) params.set('businessSlug', businessSlug)
        const res = await fetch(`/api/coach/teams/${teamId}/locations${params.size ? `?${params}` : ''}`, {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setLocationOptions(data.locations || [])
        }
      } catch {
        if (!cancelled) setLocationOptions([])
      }
    }

    void loadLocations()
    return () => {
      cancelled = true
    }
  }, [open, teamId, businessSlug])

  const applyPracticeTemplate = (kind: PracticeTemplateKind) => {
    const blocks = icePracticeTemplate(kind)
    setPracticeBlocks(blocks)
    setDescription(practiceBlocksToDescription(blocks))
  }

  const handleCreate = async () => {
    setCreateError(null)
    if (!title.trim() || !startDate) {
      setCreateError('Ange titel och datum innan du skapar händelsen.')
      toast.error('Ange titel och datum')
      return
    }
    if (!availableEventTypes.includes(type)) {
      setCreateError('Din roll kan inte skapa den här typen av händelse.')
      toast.error('Din roll kan inte skapa den här typen av händelse')
      return
    }
    const recurrenceCount = repeatWeekly ? Number.parseInt(repeatWeeks, 10) : 1
    if (repeatWeekly && (!Number.isFinite(recurrenceCount) || recurrenceCount < 2 || recurrenceCount > 52)) {
      setCreateError('Välj mellan 2 och 52 veckor.')
      toast.error('Välj mellan 2 och 52 veckor')
      return
    }

    setLoading(true)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20000)
    try {
      if (saveCustomLocation && location.trim()) {
        const params = new URLSearchParams()
        if (businessSlug) params.set('businessSlug', businessSlug)
        const locationRes = await fetch(`/api/coach/teams/${teamId}/locations${params.size ? `?${params}` : ''}`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
          },
          body: JSON.stringify({ name: location.trim() }),
        }).catch(() => null)
        if (locationRes?.ok) {
          const data = await locationRes.json().catch(() => null)
          if (data?.location) {
            setLocationOptions((prev) => (
              prev.some((option) => option.id === data.location.id) ? prev : [...prev, data.location]
            ))
          }
        }
      }

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
        signal: controller.signal,
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
          practicePlan: isIcePractice ? practiceBlocks : undefined,
          recurrenceCount: repeatWeekly ? recurrenceCount : undefined,
          recurrenceIntervalWeeks: repeatWeekly ? 1 : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || data?.error || 'Failed')
      }

      const data = await res.json().catch(() => null)
      const createdCount = data?.count ?? 1
      toast.success(createdCount > 1 ? `${createdCount} händelser skapade` : 'Händelse skapad')
      setOpen(false)
      resetForm()
      onCreated()
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'Det tog för lång tid att skapa händelsen. Försök igen, eller skapa färre veckor åt gången.'
        : error instanceof Error && error.message !== 'Failed'
          ? error.message
          : 'Kunde inte skapa händelse'
      setCreateError(message)
      toast.error(message)
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle(defaultTitle)
    setType(initialType)
      setDescription('')
      setLocation('')
      setLocationMode(CUSTOM_LOCATION_VALUE)
      setSaveCustomLocation(false)
      setStartDate(defaultDate ?? '')
    setStartTime('')
    setEndTime('')
    setAllDay(false)
    setContentOwner(defaultContentOwner)
    setContentStatus(defaultContentStatus)
    setPracticeBlocks([])
    setRepeatWeekly(false)
    setRepeatWeeks('4')
    setCreateError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setTitle(defaultTitle)
      setType(initialType)
      setStartDate(defaultDate ?? '')
      setLocation('')
      setLocationMode(CUSTOM_LOCATION_VALUE)
      setSaveCustomLocation(false)
      setContentOwner(defaultContentOwner)
      setContentStatus(defaultContentStatus)
      setPracticeBlocks([])
      setRepeatWeekly(false)
      setRepeatWeeks('4')
      setCreateError(null)
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

          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="repeat-weekly" className="text-sm">Upprepa varje vecka</Label>
                  <div className="text-xs text-muted-foreground">
                    Skapa samma pass framåt i kalendern.
                  </div>
                </div>
              </div>
              <Switch
                id="repeat-weekly"
                checked={repeatWeekly}
                onCheckedChange={setRepeatWeekly}
              />
            </div>
            {repeatWeekly && (
              <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Antal veckor</Label>
                  <Input
                    type="number"
                    min={2}
                    max={52}
                    value={repeatWeeks}
                    onChange={(e) => setRepeatWeeks(e.target.value)}
                  />
                </div>
                <div className="pb-2 text-xs text-muted-foreground">
                  inkl. första passet
                </div>
              </div>
            )}
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
            <Select
              value={locationMode}
              onValueChange={(value) => {
                setLocationMode(value)
                setSaveCustomLocation(false)
                if (value === CUSTOM_LOCATION_VALUE) {
                  setLocation('')
                  return
                }
                const selectedLocation = locationOptions.find((option) => option.id === value)
                setLocation(selectedLocation?.name ?? '')
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj plats" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}{option.isPrimary ? ' · huvudplats' : ''}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_LOCATION_VALUE}>
                  Annan plats...
                </SelectItem>
              </SelectContent>
            </Select>
            {locationMode !== CUSTOM_LOCATION_VALUE && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {locationOptions.find((option) => option.id === locationMode)?.description || 'Bokas mot denna plats i kalendern.'}
              </div>
            )}
            {locationMode === CUSTOM_LOCATION_VALUE && (
              <div className="space-y-2">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="t.ex. Fri vikten, Is A, Hall B"
                />
                {location.trim() && (
                  <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-2">
                    <div className="text-xs text-muted-foreground">
                      Spara platsen i gymmets platslista för framtida bokningar.
                    </div>
                    <Switch
                      checked={saveCustomLocation}
                      onCheckedChange={setSaveCustomLocation}
                      aria-label="Spara ny plats"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Kalendern stoppar dubbelbokningar på samma plats och tid.
            </div>
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

        {createError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
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
