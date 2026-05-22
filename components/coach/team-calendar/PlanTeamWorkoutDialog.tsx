'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
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
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  teamEventContentOwnerLabel,
  teamEventContentStatusLabel,
  teamEventTypeLabel,
  type TeamCalendarLocale,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'
import { localDateTimeInputToIso } from '@/lib/team-calendar/date-time'
import { useLocale } from '@/i18n/client'
import { CalendarPlus, MapPin, UserRound } from 'lucide-react'
import { toast } from 'sonner'

type PlanWorkoutType = 'STRENGTH' | 'CARDIO' | 'HYBRID' | 'AGILITY'

interface PlanningTeamOption {
  id: string
  name: string
  sportType: string
  roleLabel: string
}

interface CoachOption {
  id: string
  name: string
  email: string | null
  roleLabel: string
}

interface CalendarLocationOption {
  id: string
  name: string
  source: 'gym' | 'team'
  description: string | null
  isPrimary: boolean
}

interface PlanTeamWorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workoutType: PlanWorkoutType
  workoutId: string | null
  workoutName: string
  workoutDescription?: string | null
  onPlanned?: () => void
}

const EVENT_TYPE_BY_WORKOUT_TYPE: Record<PlanWorkoutType, TeamEventType> = {
  STRENGTH: 'STRENGTH',
  CARDIO: 'CARDIO',
  HYBRID: 'HYBRID',
  AGILITY: 'AGILITY',
}

const DEFAULT_TITLE_BY_WORKOUT_TYPE: Record<PlanWorkoutType, Record<TeamCalendarLocale, string>> = {
  STRENGTH: { sv: 'Styrka', en: 'Strength' },
  CARDIO: { sv: 'Kondition', en: 'Conditioning' },
  HYBRID: { sv: 'Hybrid', en: 'Hybrid' },
  AGILITY: { sv: 'Agility', en: 'Agility' },
}

const CUSTOM_LOCATION_VALUE = '__custom__'

function text(locale: TeamCalendarLocale, sv: string, en: string) {
  return locale === 'sv' ? sv : en
}

function businessSlugFromPath(pathname: string | null) {
  if (!pathname) return undefined
  const match = pathname.match(/^\/([^/]+)\/coach\//)
  if (match && match[1] !== 'coach') return match[1]
  return undefined
}

export function PlanTeamWorkoutDialog({
  open,
  onOpenChange,
  workoutType,
  workoutId,
  workoutName,
  workoutDescription,
  onPlanned,
}: PlanTeamWorkoutDialogProps) {
  const locale: TeamCalendarLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const pathname = usePathname()
  const businessSlug = useMemo(() => businessSlugFromPath(pathname), [pathname])
  const eventType = EVENT_TYPE_BY_WORKOUT_TYPE[workoutType]

  const [teams, setTeams] = useState<PlanningTeamOption[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [locations, setLocations] = useState<CalendarLocationOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)

  const [teamId, setTeamId] = useState('')
  const [title, setTitle] = useState(workoutName || DEFAULT_TITLE_BY_WORKOUT_TYPE[workoutType][locale])
  const [contentStatus, setContentStatus] = useState<TeamEventContentStatus>('CONTENT_READY')
  const [contentOwner, setContentOwner] = useState<TeamEventContentOwner>('physical_trainer')
  const [responsibleCoachId, setResponsibleCoachId] = useState('none')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [locationMode, setLocationMode] = useState(CUSTOM_LOCATION_VALUE)
  const [weeks, setWeeks] = useState('1')
  const [notes, setNotes] = useState(workoutDescription ?? '')

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const loadTeams = async () => {
      setLoadingOptions(true)
      try {
        const params = new URLSearchParams({ workoutType })
        if (businessSlug) params.set('businessSlug', businessSlug)
        const res = await fetch(`/api/coach/team-calendar/planning-options?${params}`, {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (cancelled) return
        const nextTeams = (data.teams || []) as PlanningTeamOption[]
        setTeams(nextTeams)
        setTeamId((current) => (
          nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id || ''
        ))
      } catch {
        if (!cancelled) {
          setTeams([])
          setTeamId('')
        }
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    }

    void loadTeams()
    return () => {
      cancelled = true
    }
  }, [businessSlug, open, workoutType])

  useEffect(() => {
    if (!open || !teamId) {
      return
    }

    let cancelled = false
    const loadTeamOptions = async () => {
      try {
        const params = new URLSearchParams()
        if (businessSlug) params.set('businessSlug', businessSlug)
        const suffix = params.size ? `?${params}` : ''
        const headers: HeadersInit = businessSlug ? { 'x-business-slug': businessSlug } : {}
        const [coachesRes, locationsRes] = await Promise.all([
          fetch(`/api/coach/teams/${teamId}/assignable-coaches${suffix}`, { headers }),
          fetch(`/api/coach/teams/${teamId}/locations${suffix}`, { headers }),
        ])
        const coachesData = coachesRes.ok ? await coachesRes.json() : { coaches: [] }
        const locationsData = locationsRes.ok ? await locationsRes.json() : { locations: [] }
        if (cancelled) return
        setCoaches(coachesData.coaches || [])
        setLocations(locationsData.locations || [])
      } catch {
        if (!cancelled) {
          setCoaches([])
          setLocations([])
        }
      }
    }

    void loadTeamOptions()
    return () => {
      cancelled = true
    }
  }, [businessSlug, open, teamId])

  const handleSave = async () => {
    if (!workoutId) {
      toast.error(text(locale, 'Spara passet först', 'Save the workout first'))
      return
    }
    if (!teamId || !title.trim() || !startDate) {
      toast.error(text(locale, 'Välj lag, titel och datum', 'Choose team, title, and date'))
      return
    }

    const recurrenceCount = Math.max(1, Math.min(52, Number.parseInt(weeks, 10) || 1))
    const startDateTime = allDay
      ? localDateTimeInputToIso(startDate)
      : localDateTimeInputToIso(startDate, startTime || '09:00')
    const endDateTime = endTime && !allDay
      ? localDateTimeInputToIso(startDate, endTime)
      : undefined

    setSaving(true)
    try {
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
          type: eventType,
          description: notes.trim() || undefined,
          location: location.trim() || undefined,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay,
          contentStatus,
          contentOwner,
          linkedWorkoutType: workoutType,
          linkedWorkoutId: workoutId,
          linkedWorkoutName: workoutName,
          responsibleCoachId: responsibleCoachId === 'none' ? null : responsibleCoachId,
          recurrenceCount,
          recurrenceIntervalWeeks: recurrenceCount > 1 ? 1 : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed')
      }

      const data = await res.json().catch(() => null)
      toast.success(
        (data?.count ?? recurrenceCount) > 1
          ? text(locale, `${data?.count ?? recurrenceCount} kalenderpass skapade`, `${data?.count ?? recurrenceCount} calendar sessions created`)
          : text(locale, 'Passet lades in i lagkalendern', 'Workout added to the team calendar')
      )
      onOpenChange(false)
      onPlanned?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text(locale, 'Kunde inte planera passet', 'Could not plan the workout'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            {text(locale, 'Planera i lagkalender', 'Plan in team calendar')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{text(locale, 'Lag', 'Team')}</Label>
            <Select
              value={teamId}
              onValueChange={(value) => {
                setTeamId(value)
                setResponsibleCoachId('none')
                setLocation('')
                setLocationMode(CUSTOM_LOCATION_VALUE)
                setCoaches([])
                setLocations([])
              }}
              disabled={loadingOptions || teams.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? text(locale, 'Hämtar lag...', 'Loading teams...') : text(locale, 'Välj lag', 'Select team')} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} · {team.roleLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingOptions && teams.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {text(locale, 'Din roll kan inte planera den här passtypen för något lag.', 'Your role cannot plan this workout type for any team.')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{text(locale, 'Titel', 'Title')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{text(locale, 'Typ', 'Type')}</Label>
              <Input value={teamEventTypeLabel(eventType, locale)} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{text(locale, 'Datum', 'Date')}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="team-plan-all-day" checked={allDay} onCheckedChange={setAllDay} />
            <Label htmlFor="team-plan-all-day" className="text-sm">{text(locale, 'Heldag', 'All day')}</Label>
          </div>

          {!allDay && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{text(locale, 'Starttid', 'Start time')}</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{text(locale, 'Sluttid', 'End time')}</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">{text(locale, 'Status', 'Status')}</Label>
              <Select value={contentStatus} onValueChange={(value) => setContentStatus(value as TeamEventContentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_EVENT_CONTENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {teamEventContentStatusLabel(status, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{text(locale, 'Innehållsansvarig', 'Content owner')}</Label>
              <Select value={contentOwner} onValueChange={(value) => setContentOwner(value as TeamEventContentOwner)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_EVENT_CONTENT_OWNERS.map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {teamEventContentOwnerLabel(owner, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{text(locale, 'Ansvarig tränare', 'Responsible coach')}</Label>
            <Select value={responsibleCoachId} onValueChange={setResponsibleCoachId} disabled={!teamId}>
              <SelectTrigger>
                <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={text(locale, 'Välj tränare', 'Select coach')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{text(locale, 'Ingen ansvarig tränare', 'No responsible coach')}</SelectItem>
                {coaches.map((coach) => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.name} · {coach.roleLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{text(locale, 'Plats', 'Location')}</Label>
            <Select
              value={locationMode}
              onValueChange={(value) => {
                setLocationMode(value)
                if (value === CUSTOM_LOCATION_VALUE) {
                  setLocation('')
                  return
                }
                setLocation(locations.find((option) => option.id === value)?.name ?? '')
              }}
              disabled={!teamId}
            >
              <SelectTrigger>
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={text(locale, 'Välj plats', 'Select location')} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}{option.isPrimary ? text(locale, ' · huvudplats', ' · primary location') : ''}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_LOCATION_VALUE}>{text(locale, 'Annan plats...', 'Other location...')}</SelectItem>
              </SelectContent>
            </Select>
            {locationMode === CUSTOM_LOCATION_VALUE && (
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={text(locale, 't.ex. Frivikter, Is A, Hall B', 'e.g. Free weights, Ice A, Hall B')}
              />
            )}
          </div>

          <div className="rounded-md border bg-muted/35 p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px] sm:items-end">
              <div>
                <Label className="text-xs">{text(locale, 'Lägg till i flera veckor', 'Add for multiple weeks')}</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {text(locale, 'Skapar samma kopplade pass på valt datum och kommande veckor.', 'Creates the same linked workout on the selected date and following weeks.')}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{text(locale, 'Antal veckor', 'Weeks')}</Label>
                <Input type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{text(locale, 'Plan och instruktioner', 'Plan and instructions')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={text(locale, 'Lägg till fokus, ansvar eller instruktioner...', 'Add focus, responsibilities, or instructions...')}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {text(locale, 'Avbryt', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !teamId || !workoutId}>
            {saving ? text(locale, 'Planerar...', 'Planning...') : text(locale, 'Lägg in i kalendern', 'Add to calendar')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
