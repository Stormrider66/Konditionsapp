'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
  type TeamCalendarLocale,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'
import { CheckCircle2, ClipboardList, Copy, Dumbbell, ExternalLink, HeartPulse, Plus, Printer, Route, Send, Trash2, TriangleAlert, Zap } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IceHockeyRink, type DrillStructure } from '@/components/coach/drills/IceHockeyRink'
import {
  icePracticeTemplate,
  makePracticeBlock,
  newPracticeBlock,
  practiceBlocksToDescription,
  withPracticePlanningDefaults,
  type PracticeBlock,
  type PracticeTemplateKind,
} from '@/lib/team-calendar/practice-plan'
import { inputDateValue, inputTimeValue, localDateTimeInputToIso } from '@/lib/team-calendar/date-time'
import { useLocale } from '@/i18n/client'

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
  practicePlan?: PracticeBlock[] | null
  linkedWorkoutType?: string | null
  linkedWorkoutId?: string | null
  linkedWorkoutName?: string | null
  assignedBroadcastId?: string | null
  assignedAt?: string | null
  assignmentSummary?: {
    totalAssigned: number
    totalCompleted: number
    completionRate: number
    athletes: Array<{
      assignmentId: string
      athleteId: string
      athleteName: string
      jerseyNumber: number | null
      position: string | null
      workoutType: string
      status: string
      completedAt: string | null
      rpe: number | null
      duration: number | null
      notes: string | null
    }>
  } | null
}

interface SavedDrill {
  id: string
  title: string
  description: string | null
  structure: unknown
}

interface EditEventDialogProps {
  event: EditableTeamEvent | null
  teamId: string
  businessSlug?: string
  canEdit?: boolean
  canAssignContent?: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

function addDaysToIso(iso: string, days: number) {
  const date = new Date(iso)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function builderLinkFor(type: TeamEventType, businessSlug: string | undefined, locale: TeamCalendarLocale) {
  const coachBase = businessSlug ? `/${businessSlug}/coach` : '/coach'

  if (type === 'STRENGTH' || type === 'PREHAB' || type === 'PLYOMETRICS') {
    return { href: `${coachBase}/strength`, label: text(locale, 'Öppna Strength Studio', 'Open Strength Studio'), icon: Dumbbell }
  }
  if (type === 'CARDIO' || type === 'INTERVAL_SESSION') {
    return { href: `${coachBase}/cardio`, label: text(locale, 'Öppna Cardio Studio', 'Open Cardio Studio'), icon: HeartPulse }
  }
  if (type === 'HYBRID') {
    return { href: `${coachBase}/hybrid-studio`, label: text(locale, 'Öppna Hybrid Studio', 'Open Hybrid Studio'), icon: Route }
  }
  if (type === 'AGILITY') {
    return { href: `${coachBase}/agility-studio`, label: text(locale, 'Öppna Agility Studio', 'Open Agility Studio'), icon: Zap }
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

function text(locale: TeamCalendarLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

function dateLocale(locale: TeamCalendarLocale): string {
  return locale === 'sv' ? 'sv-SE' : 'en-US'
}

function assignmentStatusLabel(status: string, locale: TeamCalendarLocale) {
  switch (status) {
    case 'COMPLETED':
      return text(locale, 'Klar', 'Completed')
    case 'SKIPPED':
      return text(locale, 'Skippad', 'Skipped')
    case 'SCHEDULED':
      return text(locale, 'Bekräftad', 'Confirmed')
    case 'IN_PROGRESS':
      return text(locale, 'Pågår', 'In progress')
    case 'MODIFIED':
      return text(locale, 'Ändrad', 'Modified')
    default:
      return text(locale, 'Ej klar', 'Not completed')
  }
}

function assignmentStatusClass(status: string) {
  if (status === 'COMPLETED') return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  if (status === 'SKIPPED') return 'border-rose-300 bg-rose-50 text-rose-800'
  if (status === 'IN_PROGRESS' || status === 'SCHEDULED') return 'border-blue-300 bg-blue-50 text-blue-800'
  return 'border-slate-300 bg-slate-50 text-slate-700'
}

function formatDuration(value: number | null) {
  if (!value) return null
  if (value > 300) return `${Math.round(value / 60)} min`
  return `${value} min`
}

type PhysicalWorkflowKey = 'planned' | 'needsContent' | 'ready' | 'assigned'

const PHYSICAL_WORKFLOW_STEPS: Array<{
  key: PhysicalWorkflowKey
  label: Record<TeamCalendarLocale, string>
  description: Record<TeamCalendarLocale, string>
}> = [
  { key: 'planned', label: { en: 'Planned framework', sv: 'Planerad ram' }, description: { en: 'Time, place, and owner are set', sv: 'Tid, plats och ansvar är satt' } },
  { key: 'needsContent', label: { en: 'Needs content', sv: 'Behöver innehåll' }, description: { en: 'The session should be built or linked', sv: 'Passet ska byggas eller kopplas' } },
  { key: 'ready', label: { en: 'Ready to assign', sv: 'Klar att tilldela' }, description: { en: 'Workout content is available', sv: 'Workout-innehåll finns' } },
  { key: 'assigned', label: { en: 'Assigned', sv: 'Tilldelat' }, description: { en: 'Players can complete it', sv: 'Spelarna kan genomföra' } },
]

function physicalWorkflowKey({
  contentStatus,
  linkedWorkoutId,
  isAssigned,
}: {
  contentStatus: TeamEventContentStatus
  linkedWorkoutId: string
  isAssigned: boolean
}): PhysicalWorkflowKey {
  if (isAssigned || contentStatus === 'ASSIGNED') return 'assigned'
  if (linkedWorkoutId !== 'none' && contentStatus === 'CONTENT_READY') return 'ready'
  if (contentStatus === 'NEEDS_CONTENT' || linkedWorkoutId === 'none') return 'needsContent'
  return 'planned'
}

function physicalWorkflowCopy({
  key,
  canAssignContent,
  canAssignPersistedWorkout,
  linkedWorkoutName,
  completionRate,
  locale,
}: {
  key: PhysicalWorkflowKey
  canAssignContent: boolean
  canAssignPersistedWorkout: boolean
  linkedWorkoutName: string | null
  completionRate: number | null
  locale: TeamCalendarLocale
}) {
  if (key === 'assigned') {
    return {
      title: text(locale, 'Tilldelat till laget', 'Assigned to the team'),
      description: completionRate === null
        ? text(locale, 'Följ spelarnas genomförande när de börjar rapportera.', 'Track player completion as they start reporting.')
        : text(locale, `${completionRate}% av spelarna är klara.`, `${completionRate}% of players have completed it.`),
      className: 'border-emerald-300 bg-emerald-50 text-emerald-950',
      icon: CheckCircle2,
    }
  }

  if (key === 'ready') {
    return {
      title: text(locale, 'Workout är kopplad', 'Workout is linked'),
      description: canAssignPersistedWorkout
        ? text(locale, 'Nästa steg: tilldela passet till laget.', 'Next step: assign the workout to the team.')
        : text(locale, 'Spara händelsen först, sedan kan passet tilldelas laget.', 'Save the event first, then the workout can be assigned to the team.'),
      className: 'border-blue-300 bg-blue-50 text-blue-950',
      icon: Send,
    }
  }

  if (key === 'needsContent') {
    return {
      title: text(locale, 'Passet behöver innehåll', 'The session needs content'),
      description: canAssignContent
        ? text(locale, 'Nästa steg: öppna rätt studio eller välj ett färdigt pass.', 'Next step: open the right studio or choose a completed workout.')
        : text(locale, 'Din roll kan se vad som saknas, men inte koppla workout-innehåll.', 'Your role can see what is missing, but cannot link workout content.'),
      className: 'border-amber-300 bg-amber-50 text-amber-950',
      icon: TriangleAlert,
    }
  }

  return {
    title: text(locale, 'Planerad ram', 'Planned framework'),
    description: linkedWorkoutName
      ? text(locale, `Kopplat pass: ${linkedWorkoutName}`, `Linked workout: ${linkedWorkoutName}`)
      : text(locale, 'Ramen finns. Nästa steg är att bestämma innehåll och koppla pass.', 'The framework is set. Next step is choosing content and linking a workout.'),
    className: 'border-slate-300 bg-slate-50 text-slate-950',
    icon: ClipboardList,
  }
}

const PRACTICE_BLOCK_TYPES: Array<{ value: PracticeBlock['type']; label: string }> = [
  { value: 'warmup', label: 'Uppvärmning' },
  { value: 'technical', label: 'Teknik' },
  { value: 'tactical', label: 'Taktik' },
  { value: 'small_game', label: 'Smålagsspel' },
  { value: 'special_teams', label: 'Special teams' },
  { value: 'goalie', label: 'Målvakt' },
  { value: 'cooldown', label: 'Nedvarvning' },
]

const RINK_ZONE_OPTIONS: Array<{ value: NonNullable<PracticeBlock['rinkZone']>; label: string }> = [
  { value: 'full_ice', label: 'Helplan' },
  { value: 'offensive_zone', label: 'Anfallszon' },
  { value: 'defensive_zone', label: 'Försvarszon' },
  { value: 'neutral_zone', label: 'Mittzon' },
  { value: 'half_ice', label: 'Halvplan' },
  { value: 'stations', label: 'Stationer' },
]

const INTENSITY_OPTIONS: Array<{ value: NonNullable<PracticeBlock['intensity']>; label: string }> = [
  { value: 'low', label: 'Låg' },
  { value: 'medium', label: 'Medel' },
  { value: 'high', label: 'Hög' },
  { value: 'game', label: 'Matchlik' },
]

const TACTICAL_CATEGORY_OPTIONS: Array<{ value: NonNullable<PracticeBlock['tacticalCategory']>; label: string }> = [
  { value: 'skills', label: 'Teknik' },
  { value: 'breakout', label: 'Uppspel' },
  { value: 'forecheck', label: 'Forecheck' },
  { value: 'transition', label: 'Omställning' },
  { value: 'special_teams', label: 'Special teams' },
  { value: 'small_area', label: 'Smålagsspel' },
  { value: 'finishing', label: 'Avslut' },
  { value: 'goalie', label: 'Målvakt' },
]

const optionLabel = <T extends string>(options: Array<{ value: T; label: string }>, value?: T | null) => {
  return options.find((option) => option.value === value)?.label
}

function blockFromSavedDrill(drill: SavedDrill): PracticeBlock {
  return makePracticeBlock({
    type: 'technical',
    title: drill.title,
    duration: 15,
    focus: 'Övning',
    description: drill.description ?? '',
    coachingPoints: '',
    groups: '',
    equipment: '',
    rinkZone: 'stations',
    intensity: 'medium',
    tacticalCategory: 'skills',
    lineGroups: '',
    goalieNotes: '',
    drillId: drill.id,
    drillStructure: drill.structure,
  })
}

function isDrillStructure(value: unknown): value is DrillStructure {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'players' in value &&
    'movements' in value &&
    Array.isArray((value as { players?: unknown }).players) &&
    Array.isArray((value as { movements?: unknown }).movements)
  )
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
  canEdit = true,
  canAssignContent = true,
  onOpenChange,
  onUpdated,
}: EditEventDialogProps) {
  const locale: TeamCalendarLocale = useLocale() === 'sv' ? 'sv' : 'en'
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
  const [practiceBlocks, setPracticeBlocks] = useState<PracticeBlock[]>([])
  const [savedDrills, setSavedDrills] = useState<SavedDrill[]>([])
  const [drillSearch, setDrillSearch] = useState('')
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const builderLink = builderLinkFor(type, businessSlug, locale)
  const isPhysicalSession = PHYSICAL_TEAM_EVENT_TYPES.includes(type)
  const isIcePractice = type === 'PRACTICE' || type === 'ICE_PRACTICE'
  const practiceSheetHref = event && businessSlug
    ? `/${businessSlug}/coach/teams/${teamId}/calendar/${event.id}/practice-sheet`
    : null
  const linkedWorkoutType = workoutTypeForEventType(type)
  const canAssignPersistedWorkout = Boolean(canAssignContent && event?.linkedWorkoutId && event?.linkedWorkoutType && !event.assignedBroadcastId)
  const isAssigned = Boolean(event?.assignedBroadcastId)
  const assignmentSummary = event?.assignmentSummary
  const workflowKey = physicalWorkflowKey({ contentStatus, linkedWorkoutId, isAssigned })
  const workflowCopy = physicalWorkflowCopy({
    key: workflowKey,
    canAssignContent,
    canAssignPersistedWorkout,
    linkedWorkoutName,
    completionRate: assignmentSummary?.completionRate ?? null,
    locale,
  })
  const workflowStepIndex = PHYSICAL_WORKFLOW_STEPS.findIndex((step) => step.key === workflowKey)
  const WorkflowIcon = workflowCopy.icon
  const practiceMinutes = practiceBlocks.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)
  const highIntensityBlocks = practiceBlocks.filter((block) => block.intensity === 'high' || block.intensity === 'game').length
  const goalieBlockCount = practiceBlocks.filter((block) => block.type === 'goalie' || block.tacticalCategory === 'goalie' || Boolean(block.goalieNotes?.trim())).length
  const practiceZoneSummary = Array.from(new Set(
    practiceBlocks
      .map((block) => optionLabel(RINK_ZONE_OPTIONS, block.rinkZone))
      .filter(Boolean) as string[]
  )).slice(0, 3).join(', ')
  const filteredSavedDrills = savedDrills.filter((drill) => {
    const query = drillSearch.trim().toLowerCase()
    if (!query) return true
    return `${drill.title} ${drill.description ?? ''}`.toLowerCase().includes(query)
  })

  useEffect(() => {
    if (!event) return
    setTitle(event.title)
    setType(TEAM_EVENT_TYPES.includes(event.type as TeamEventType) ? event.type as TeamEventType : 'OTHER')
    setDescription(event.description ?? '')
    setLocation(event.location ?? '')
    setStartDate(inputDateValue(new Date(event.startDate)))
    setStartTime(inputTimeValue(event.startDate))
    setEndTime(inputTimeValue(event.endDate))
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
    setPracticeBlocks(Array.isArray(event.practicePlan) ? event.practicePlan.map(withPracticePlanningDefaults) : [])
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
        toast.error(text(locale, 'Kunde inte hämta pass att koppla', 'Could not fetch workouts to link'))
      } finally {
        setLoadingWorkouts(false)
      }
    }

    void loadOptions()
  }, [event, isPhysicalSession, linkedWorkoutType, teamId, businessSlug, locale])

  useEffect(() => {
    if (!event || !isIcePractice) {
      setSavedDrills([])
      return
    }

    const loadSavedDrills = async () => {
      try {
        const res = await fetch('/api/coach/drills?shared=true&sportType=ICE_HOCKEY')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setSavedDrills(data.drills || [])
      } catch {
        setSavedDrills([])
      }
    }

    void loadSavedDrills()
  }, [event, isIcePractice])

  const handleUpdate = async () => {
    if (!canEdit) {
      toast.error(text(locale, 'Din roll kan bara visa den här händelsen', 'Your role can only view this event'))
      return
    }
    if (!event || !title.trim() || !startDate) {
      toast.error(text(locale, 'Ange titel och datum', 'Enter a title and date'))
      return
    }

    setLoading(true)
    try {
      const startDateTime = allDay
        ? localDateTimeInputToIso(startDate)
        : localDateTimeInputToIso(startDate, startTime || '09:00')
      const endDateTime = endTime && !allDay
        ? localDateTimeInputToIso(startDate, endTime)
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
          practicePlan: isIcePractice ? practiceBlocks : null,
          linkedWorkoutType: linkedWorkoutId === 'none' ? null : linkedWorkoutType,
          linkedWorkoutId: linkedWorkoutId === 'none' ? null : linkedWorkoutId,
          linkedWorkoutName: linkedWorkoutId === 'none' ? null : linkedWorkoutName,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(text(locale, 'Händelse uppdaterad', 'Event updated'))
      onOpenChange(false)
      onUpdated()
    } catch {
      toast.error(text(locale, 'Kunde inte uppdatera händelse', 'Could not update event'))
    } finally {
      setLoading(false)
    }
  }

  const applyPracticeTemplate = (kind: PracticeTemplateKind) => {
    const blocks = icePracticeTemplate(kind)
    setPracticeBlocks(blocks)
    setDescription(practiceBlocksToDescription(blocks))
  }

  const updatePracticeBlock = (id: string, patch: Partial<PracticeBlock>) => {
    const nextBlocks = practiceBlocks.map((block) => block.id === id ? { ...block, ...patch } : block)
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks))
  }

  const addPracticeBlock = () => {
    const nextBlocks = [...practiceBlocks, newPracticeBlock()]
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks))
  }

  const addSavedDrillBlock = (drillId: string) => {
    const drill = savedDrills.find((item) => item.id === drillId)
    if (!drill) return
    const nextBlocks = [...practiceBlocks, blockFromSavedDrill(drill)]
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks))
  }

  const removePracticeBlock = (id: string) => {
    const nextBlocks = practiceBlocks.filter((block) => block.id !== id)
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks))
  }

  const handleDuplicateNextWeek = async () => {
    if (!canEdit) {
      toast.error(text(locale, 'Din roll kan bara visa den här händelsen', 'Your role can only view this event'))
      return
    }
    if (!event || !title.trim()) return

    setDuplicating(true)
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
          type,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          startDate: addDaysToIso(event.startDate, 7),
          endDate: event.endDate ? addDaysToIso(event.endDate, 7) : undefined,
          allDay,
          contentStatus,
          contentOwner,
          practicePlan: isIcePractice ? practiceBlocks : null,
          linkedWorkoutType: linkedWorkoutId === 'none' ? null : linkedWorkoutType,
          linkedWorkoutId: linkedWorkoutId === 'none' ? null : linkedWorkoutId,
          linkedWorkoutName: linkedWorkoutId === 'none' ? null : linkedWorkoutName,
        }),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success(text(locale, 'Passet kopierades till nästa vecka', 'Session copied to next week'))
      onOpenChange(false)
      onUpdated()
    } catch {
      toast.error(text(locale, 'Kunde inte kopiera passet', 'Could not duplicate the session'))
    } finally {
      setDuplicating(false)
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
      toast.success(text(locale, `Tilldelat till ${data.assignmentCount ?? 'laget'} spelare`, `Assigned to ${data.assignmentCount ?? 'the team'} players`))
      onOpenChange(false)
      onUpdated()
    } catch {
      toast.error(text(locale, 'Kunde inte tilldela passet', 'Could not assign the workout'))
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

                <div className={`rounded-md border p-3 ${workflowCopy.className}`}>
                  <div className="flex items-start gap-2">
                    <WorkflowIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{workflowCopy.title}</div>
                      <div className="text-xs opacity-80">{workflowCopy.description}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {PHYSICAL_WORKFLOW_STEPS.map((step, index) => {
                    const isCurrent = step.key === workflowKey
                    const isComplete = index < workflowStepIndex
                    return (
                      <div
                        key={step.key}
                        className={`rounded-md border p-2 ${
                          isCurrent
                            ? 'border-primary bg-primary text-primary-foreground'
                            : isComplete
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                              : 'border-border bg-background text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          {isComplete ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <span className={`h-2 w-2 rounded-full ${isCurrent ? 'bg-primary-foreground' : 'bg-muted-foreground/40'}`} />
                          )}
                          {step.label[locale]}
                        </div>
                        <div className={`mt-1 text-[11px] leading-snug ${isCurrent ? 'text-primary-foreground/80' : ''}`}>
                          {step.description[locale]}
                        </div>
                      </div>
                    )
                  })}
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
                    disabled={!canAssignContent}
                    onValueChange={(value) => {
                      setLinkedWorkoutId(value)
                      const selected = workoutOptions.find((option) => option.id === value)
                      setLinkedWorkoutName(selected?.name ?? null)
                      if (value !== 'none') setContentStatus('CONTENT_READY')
                    }}
                  >
                    <SelectTrigger>
                          <SelectValue placeholder={loadingWorkouts ? text(locale, 'Hämtar pass...', 'Fetching workouts...') : text(locale, 'Välj pass', 'Select workout')} />
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {text(locale, 'Passet är tilldelat laget.', 'The session is assigned to the team.')}
                      </div>
                      {assignmentSummary && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{text(locale, 'Genomförande', 'Completion')}</span>
                            <span className="font-medium text-foreground">
                              {assignmentSummary.totalCompleted}/{assignmentSummary.totalAssigned} {text(locale, 'klara', 'completed')} · {assignmentSummary.completionRate}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, Math.max(0, assignmentSummary.completionRate))}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {event?.assignedAt && (
                        <div className="text-xs text-muted-foreground">
                          {text(locale, 'Tilldelat', 'Assigned')} {new Date(event.assignedAt).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                      {assignmentSummary?.athletes?.length ? (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">{text(locale, 'Spelarstatus', 'Player status')}</div>
                          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                            {assignmentSummary.athletes.map((athlete) => {
                              const duration = formatDuration(athlete.duration)
                              return (
                                <div key={athlete.assignmentId} className="rounded-md border bg-muted/20 p-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">
                                        {athlete.jerseyNumber ? `#${athlete.jerseyNumber} ` : ''}{athlete.athleteName}
                                      </div>
                                      {athlete.position && (
                                        <div className="text-xs text-muted-foreground">{athlete.position}</div>
                                      )}
                                    </div>
                                    <Badge variant="outline" className={`shrink-0 text-[10px] ${assignmentStatusClass(athlete.status)}`}>
                                      {assignmentStatusLabel(athlete.status, locale)}
                                    </Badge>
                                  </div>
                                  {(athlete.rpe || duration || athlete.completedAt) && (
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      {athlete.rpe && <span>RPE {athlete.rpe}/10</span>}
                                      {duration && <span>{duration}</span>}
                                      {athlete.completedAt && (
                                        <span>
                                          {text(locale, 'Klar', 'Completed')} {new Date(athlete.completedAt).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short' })}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {athlete.notes && (
                                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                      {athlete.notes}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : canAssignPersistedWorkout ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        {text(locale, 'Skapa teamtilldelning med datum, tid och plats från kalendern.', 'Create a team assignment using the date, time, and place from the calendar.')}
                      </div>
                      <Button type="button" size="sm" onClick={handleAssignToTeam} disabled={assigning}>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        {assigning ? 'Tilldelar...' : 'Tilldela laget'}
                      </Button>
                    </div>
                  ) : linkedWorkoutId !== 'none' ? (
                    <div className="text-xs text-muted-foreground">
                      {canAssignContent ? 'Spara händelsen först, sedan kan passet tilldelas laget.' : 'Din roll kan se passet men inte tilldela workout-innehåll.'}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {canAssignContent ? 'Koppla ett färdigt pass för att kunna tilldela laget.' : 'Din roll kan se passet men inte tilldela workout-innehåll.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isIcePractice && (
            <div className="rounded-md border bg-muted/35 p-3">
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-medium">Ispass-plan</div>
                    <div className="text-xs text-muted-foreground">
                      Bygg passet i block med tid, zoner, roller, målvaktsnoter och coachingpunkter.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {practiceMinutes} min totalt
                    </div>
                    {practiceSheetHref && (
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={practiceSheetHref} target="_blank">
                          <Printer className="mr-1.5 h-3.5 w-3.5" />
                          Passblad
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                {practiceBlocks.length > 0 && (
                  <div className="grid gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">Block</div>
                      <div className="font-semibold">{practiceBlocks.length} st</div>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">Zoner</div>
                      <div className="font-semibold">{practiceZoneSummary || 'Ej satt'}</div>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">Hög belastning</div>
                      <div className="font-semibold">{highIntensityBlocks} block</div>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">Målvakt</div>
                      <div className="font-semibold">{goalieBlockCount} block</div>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => applyPracticeTemplate('skills')}
                  >
                    Teknik + fart
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => applyPracticeTemplate('tactical')}
                  >
                    Taktik
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => applyPracticeTemplate('gamePrep')}
                  >
                    Matchförberedelse
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit}
                    onClick={addPracticeBlock}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Block
                  </Button>
                  {savedDrills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Input
                        value={drillSearch}
                        disabled={!canEdit}
                        onChange={(e) => setDrillSearch(e.target.value)}
                        placeholder="Sök övning..."
                        className="h-9 w-[170px]"
                      />
                      <Select onValueChange={addSavedDrillBlock} disabled={!canEdit || filteredSavedDrills.length === 0}>
                        <SelectTrigger className="h-9 w-[190px]">
                          <SelectValue placeholder="+ Sparad övning" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSavedDrills.map((drill) => (
                            <SelectItem key={drill.id} value={drill.id}>
                              {drill.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {practiceBlocks.length > 0 && (
                  <div className="space-y-2">
                    {practiceBlocks.map((block, index) => (
                      <div key={block.id} className="rounded-md border bg-background p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xs font-medium text-muted-foreground">Block {index + 1}</div>
                            {block.rinkZone && (
                              <Badge variant="outline" className="text-[10px]">
                                {optionLabel(RINK_ZONE_OPTIONS, block.rinkZone)}
                              </Badge>
                            )}
                            {block.intensity && (
                              <Badge variant={block.intensity === 'high' || block.intensity === 'game' ? 'default' : 'secondary'} className="text-[10px]">
                                {optionLabel(INTENSITY_OPTIONS, block.intensity)}
                              </Badge>
                            )}
                            {block.tacticalCategory && (
                              <Badge variant="secondary" className="text-[10px]">
                                {optionLabel(TACTICAL_CATEGORY_OPTIONS, block.tacticalCategory)}
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            disabled={!canEdit}
                            onClick={() => removePracticeBlock(block.id)}
                            aria-label="Ta bort block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_90px]">
                          <div className="space-y-1">
                            <Label className="text-xs">Titel</Label>
                            <Input
                              value={block.title}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { title: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Min</Label>
                            <Input
                              type="number"
                              min={0}
                              value={block.duration}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { duration: Number(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        {block.drillId && (
                          <div className="mt-2 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-800">
                            Kopplad till sparad övning
                          </div>
                        )}
                        {isDrillStructure(block.drillStructure) && (
                          <div className="mt-3 rounded-md border bg-slate-50 p-2">
                            <IceHockeyRink structure={block.drillStructure} width={420} className="mx-auto" />
                          </div>
                        )}
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Blocktyp</Label>
                            <Select
                              value={block.type}
                              disabled={!canEdit}
                              onValueChange={(value) => updatePracticeBlock(block.id, { type: value as PracticeBlock['type'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRACTICE_BLOCK_TYPES.map((blockType) => (
                                  <SelectItem key={blockType.value} value={blockType.value}>
                                    {blockType.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Fokus</Label>
                            <Input
                              value={block.focus}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { focus: e.target.value })}
                              placeholder="t.ex. breakout, skott, tempo"
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Rinkzon</Label>
                            <Select
                              value={block.rinkZone ?? 'full_ice'}
                              disabled={!canEdit}
                              onValueChange={(value) => updatePracticeBlock(block.id, { rinkZone: value as PracticeBlock['rinkZone'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RINK_ZONE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Intensitet</Label>
                            <Select
                              value={block.intensity ?? 'medium'}
                              disabled={!canEdit}
                              onValueChange={(value) => updatePracticeBlock(block.id, { intensity: value as PracticeBlock['intensity'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {INTENSITY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Taktisk kategori</Label>
                            <Select
                              value={block.tacticalCategory ?? 'skills'}
                              disabled={!canEdit}
                              onValueChange={(value) => updatePracticeBlock(block.id, { tacticalCategory: value as PracticeBlock['tacticalCategory'] })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TACTICAL_CATEGORY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Grupp / kedja</Label>
                            <Input
                              value={block.groups ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { groups: e.target.value })}
                              placeholder="t.ex. alla, kedja 1-2, backar, målvakter"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Material</Label>
                            <Input
                              value={block.equipment ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { equipment: e.target.value })}
                              placeholder="t.ex. puckar, koner, småmål"
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Kedjor / roller</Label>
                            <Input
                              value={block.lineGroups ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { lineGroups: e.target.value })}
                              placeholder="t.ex. femma 1 mot femma 2, PP1/BP1"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Målvaktsnoter</Label>
                            <Input
                              value={block.goalieNotes ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { goalieNotes: e.target.value })}
                              placeholder="t.ex. returkontroll, sidled, puckstart"
                            />
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          <Label className="text-xs">Beskrivning</Label>
                          <Textarea
                            value={block.description}
                            disabled={!canEdit}
                            rows={2}
                            onChange={(e) => updatePracticeBlock(block.id, { description: e.target.value })}
                          />
                        </div>
                        <div className="mt-3 space-y-1">
                          <Label className="text-xs">Coachingpunkter</Label>
                          <Input
                            value={block.coachingPoints}
                            disabled={!canEdit}
                            onChange={(e) => updatePracticeBlock(block.id, { coachingPoints: e.target.value })}
                            placeholder="1-2 saker tränarna ska trycka på"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

        <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleDuplicateNextWeek}
            disabled={duplicating || !canEdit || !event}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {duplicating ? 'Kopierar...' : 'Kopiera +7 dagar'}
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button onClick={handleUpdate} disabled={loading || !canEdit}>
              {canEdit ? (loading ? 'Sparar...' : 'Spara') : 'Endast visning'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
