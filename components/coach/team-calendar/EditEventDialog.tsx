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
import {
  PHYSICAL_TEAM_EVENT_TYPES,
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
import { CheckCircle2, Dumbbell, ExternalLink, HeartPulse, Route, Send, Zap } from 'lucide-react'
import Link from 'next/link'
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
  contentStatus?: string
  contentOwner?: string | null
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
  linkedWorkoutName?: string | null
  assignedBroadcastId?: string | null
  assignedAt?: string | null
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

function builderLinkFor(type: TeamEventType, businessSlug?: string) {
  const coachBase = businessSlug ? `/${businessSlug}/coach` : '/coach'

  if (type === 'STRENGTH' || type === 'PREHAB' || type === 'PLYOMETRICS') {
    return { href: `${coachBase}/strength`, label: 'Öppna Strength Studio', icon: Dumbbell }
  }
  if (type === 'CARDIO' || type === 'INTERVAL_SESSION') {
    return { href: `${coachBase}/cardio`, label: 'Öppna Cardio Studio', icon: HeartPulse }
  }
  if (type === 'HYBRID') {
    return { href: `${coachBase}/hybrid-studio`, label: 'Öppna Hybrid Studio', icon: Route }
  }
  if (type === 'AGILITY') {
    return { href: `${coachBase}/agility-studio`, label: 'Öppna Agility Studio', icon: Zap }
  }
  return null
}

function workoutTypeForEventType(type: TeamEventType): 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY' | null {
  if (type === 'STRENGTH' || type === 'PREHAB' || type === 'PLYOMETRICS') return 'STRENGTH'
  if (type === 'CARDIO' || type === 'INTERVAL_SESSION') return 'CARDIO'
  if (type === 'HYBRID') return 'HYBRID'
  if (type === 'AGILITY') return 'AGILITY'
  return null
}

interface WorkoutOption {
  id: string
  name: string
  description: string | null
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
  const [contentStatus, setContentStatus] = useState<TeamEventContentStatus>('PLANNED')
  const [contentOwner, setContentOwner] = useState<TeamEventContentOwner>('physical_trainer')
  const [linkedWorkoutId, setLinkedWorkoutId] = useState<string>('none')
  const [linkedWorkoutName, setLinkedWorkoutName] = useState<string | null>(null)
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const builderLink = builderLinkFor(type, businessSlug)
  const isPhysicalSession = PHYSICAL_TEAM_EVENT_TYPES.includes(type)
  const linkedWorkoutType = workoutTypeForEventType(type)
  const canAssignPersistedWorkout = Boolean(event?.linkedWorkoutId && event?.linkedWorkoutType && !event.assignedBroadcastId)
  const isAssigned = Boolean(event?.assignedBroadcastId)

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
    setContentStatus(
      TEAM_EVENT_CONTENT_STATUSES.includes(event.contentStatus as TeamEventContentStatus)
        ? event.contentStatus as TeamEventContentStatus
        : 'PLANNED'
    )
    setContentOwner(
      TEAM_EVENT_CONTENT_OWNERS.includes(event.contentOwner as TeamEventContentOwner)
        ? event.contentOwner as TeamEventContentOwner
        : 'physical_trainer'
    )
    setLinkedWorkoutId(event.linkedWorkoutId ?? 'none')
    setLinkedWorkoutName(event.linkedWorkoutName ?? null)
  }, [event])

  useEffect(() => {
    if (!event || !isPhysicalSession || !linkedWorkoutType) {
      setWorkoutOptions([])
      return
    }

    const loadOptions = async () => {
      setLoadingWorkouts(true)
      try {
        const params = new URLSearchParams({ type: linkedWorkoutType })
        if (businessSlug) params.set('businessSlug', businessSlug)
        const res = await fetch(`/api/coach/teams/${teamId}/events/workout-options?${params}`, {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setWorkoutOptions(data.workouts || [])
      } catch {
        toast.error('Kunde inte hämta pass att koppla')
      } finally {
        setLoadingWorkouts(false)
      }
    }

    void loadOptions()
  }, [event, isPhysicalSession, linkedWorkoutType, teamId, businessSlug])

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
          contentStatus,
          contentOwner,
          linkedWorkoutType: linkedWorkoutId === 'none' ? null : linkedWorkoutType,
          linkedWorkoutId: linkedWorkoutId === 'none' ? null : linkedWorkoutId,
          linkedWorkoutName: linkedWorkoutId === 'none' ? null : linkedWorkoutName,
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

  const handleAssignToTeam = async () => {
    if (!event || !canAssignPersistedWorkout) return

    setAssigning(true)
    try {
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const res = await fetch(`/api/coach/teams/${teamId}/events/${event.id}/assign-workout${params.size ? `?${params}` : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessSlug ? { 'x-business-slug': businessSlug } : {}),
        },
        body: JSON.stringify({ notes: description.trim() || undefined }),
      })

      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      toast.success(`Tilldelat till ${data.assignmentCount ?? 'laget'} spelare`)
      onOpenChange(false)
      onUpdated()
    } catch {
      toast.error('Kunde inte tilldela passet')
    } finally {
      setAssigning(false)
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

          {isPhysicalSession && (
            <div className="rounded-md border bg-muted/35 p-3">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium">Fys-pass med byggbart innehåll</div>
                    <div className="text-xs text-muted-foreground">
                      Koppla ett färdigt pass eller öppna rätt studio för att bygga innehållet.
                    </div>
                  </div>
                  {builderLink && (
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={builderLink.href}>
                        <builderLink.icon className="mr-1.5 h-3.5 w-3.5" />
                        {builderLink.label}
                        <ExternalLink className="ml-1.5 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <Label className="text-xs">Innehållsansvarig</Label>
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

                <div className="space-y-1">
                  <Label className="text-xs">Kopplat pass</Label>
                  <Select
                    value={linkedWorkoutId}
                    onValueChange={(value) => {
                      setLinkedWorkoutId(value)
                      const selected = workoutOptions.find((option) => option.id === value)
                      setLinkedWorkoutName(selected?.name ?? null)
                      if (value !== 'none') setContentStatus('CONTENT_READY')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingWorkouts ? 'Hämtar pass...' : 'Välj pass'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Inget kopplat pass</SelectItem>
                      {workoutOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {linkedWorkoutName && (
                    <div className="text-xs text-muted-foreground">
                      Kopplat: {linkedWorkoutName}
                    </div>
                  )}
                </div>

                <div className="rounded-md border bg-background p-3">
                  {isAssigned ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Passet är tilldelat laget.
                    </div>
                  ) : canAssignPersistedWorkout ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        Skapa teamtilldelning med datum, tid och plats från kalendern.
                      </div>
                      <Button type="button" size="sm" onClick={handleAssignToTeam} disabled={assigning}>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        {assigning ? 'Tilldelar...' : 'Tilldela laget'}
                      </Button>
                    </div>
                  ) : linkedWorkoutId !== 'none' ? (
                    <div className="text-xs text-muted-foreground">
                      Spara händelsen först, sedan kan passet tilldelas laget.
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Koppla ett färdigt pass för att kunna tilldela laget.
                    </div>
                  )}
                </div>
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
