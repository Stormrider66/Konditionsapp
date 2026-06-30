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
  TEAM_EVENT_CONTENT_OWNERS,
  TEAM_EVENT_CONTENT_STATUSES,
  TEAM_EVENT_TYPES,
  teamEventContentOwnerLabel,
  teamEventContentStatusLabel,
  teamEventTypeLabel,
  type TeamCalendarLocale,
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'
import { CheckCircle2, ClipboardList, Copy, Dumbbell, ExternalLink, HeartPulse, Plus, Printer, Route, Send, Trash2, TriangleAlert, UserRound, Zap } from 'lucide-react'
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
  responsibleCoachId?: string | null
  responsibleCoach?: {
    id: string
    name: string
    email: string | null
  } | null
  assignedBroadcastId?: string | null
  assignedAt?: string | null
  assignmentSummary?: {
    totalAssigned: number
    totalCompleted: number
    completionRate: number
    totalTeamMembers?: number
    missingAssignmentCount?: number
    missingAthletes?: Array<{
      athleteId: string
      athleteName: string
      jerseyNumber: number | null
      position: string | null
    }>
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
  if (status === 'SKIPPED') return 'border-red-300 bg-red-50 text-red-800'
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

const PRACTICE_BLOCK_TYPES: Array<{ value: PracticeBlock['type']; label: Record<TeamCalendarLocale, string> }> = [
  { value: 'warmup', label: { en: 'Warmup', sv: 'Uppvärmning' } },
  { value: 'technical', label: { en: 'Technical', sv: 'Teknik' } },
  { value: 'tactical', label: { en: 'Tactical', sv: 'Taktik' } },
  { value: 'small_game', label: { en: 'Small-area game', sv: 'Smålagsspel' } },
  { value: 'special_teams', label: { en: 'Special teams', sv: 'Special teams' } },
  { value: 'goalie', label: { en: 'Goalie', sv: 'Målvakt' } },
  { value: 'cooldown', label: { en: 'Cooldown', sv: 'Nedvarvning' } },
]

const RINK_ZONE_OPTIONS: Array<{ value: NonNullable<PracticeBlock['rinkZone']>; label: Record<TeamCalendarLocale, string> }> = [
  { value: 'full_ice', label: { en: 'Full ice', sv: 'Helplan' } },
  { value: 'offensive_zone', label: { en: 'Offensive zone', sv: 'Anfallszon' } },
  { value: 'defensive_zone', label: { en: 'Defensive zone', sv: 'Försvarszon' } },
  { value: 'neutral_zone', label: { en: 'Neutral zone', sv: 'Mittzon' } },
  { value: 'half_ice', label: { en: 'Half ice', sv: 'Halvplan' } },
  { value: 'stations', label: { en: 'Stations', sv: 'Stationer' } },
]

const INTENSITY_OPTIONS: Array<{ value: NonNullable<PracticeBlock['intensity']>; label: Record<TeamCalendarLocale, string> }> = [
  { value: 'low', label: { en: 'Low', sv: 'Låg' } },
  { value: 'medium', label: { en: 'Medium', sv: 'Medel' } },
  { value: 'high', label: { en: 'High', sv: 'Hög' } },
  { value: 'game', label: { en: 'Game-like', sv: 'Matchlik' } },
]

const TACTICAL_CATEGORY_OPTIONS: Array<{ value: NonNullable<PracticeBlock['tacticalCategory']>; label: Record<TeamCalendarLocale, string> }> = [
  { value: 'skills', label: { en: 'Skills', sv: 'Teknik' } },
  { value: 'breakout', label: { en: 'Breakout', sv: 'Uppspel' } },
  { value: 'forecheck', label: { en: 'Forecheck', sv: 'Forecheck' } },
  { value: 'transition', label: { en: 'Transition', sv: 'Omställning' } },
  { value: 'special_teams', label: { en: 'Special teams', sv: 'Special teams' } },
  { value: 'small_area', label: { en: 'Small-area game', sv: 'Smålagsspel' } },
  { value: 'finishing', label: { en: 'Finishing', sv: 'Avslut' } },
  { value: 'goalie', label: { en: 'Goalie', sv: 'Målvakt' } },
]

const optionLabel = <T extends string>(
  options: Array<{ value: T; label: Record<TeamCalendarLocale, string> }>,
  value: T | null | undefined,
  locale: TeamCalendarLocale
) => {
  return options.find((option) => option.value === value)?.label[locale]
}

function blockFromSavedDrill(drill: SavedDrill, locale: TeamCalendarLocale): PracticeBlock {
  return makePracticeBlock({
    type: 'technical',
    title: drill.title,
    duration: 15,
    focus: text(locale, 'Övning', 'Drill'),
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

interface CoachOption {
  id: string
  name: string
  email: string | null
  roleLabel: string
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
  const [responsibleCoachId, setResponsibleCoachId] = useState<string>('none')
  const [coachOptions, setCoachOptions] = useState<CoachOption[]>([])
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([])
  const [practiceBlocks, setPracticeBlocks] = useState<PracticeBlock[]>([])
  const [savedDrills, setSavedDrills] = useState<SavedDrill[]>([])
  const [drillSearch, setDrillSearch] = useState('')
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [applyToWeeks, setApplyToWeeks] = useState('1')
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
  const missingAssignmentCount = assignmentSummary?.missingAssignmentCount ?? 0
  const canAppendAssignedWorkout = Boolean(canAssignContent && event?.linkedWorkoutId && event?.linkedWorkoutType && event.assignedBroadcastId && missingAssignmentCount > 0)
  const canRunTeamAssignment = canAssignPersistedWorkout || canAppendAssignedWorkout
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
      .map((block) => optionLabel(RINK_ZONE_OPTIONS, block.rinkZone, locale))
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
    setResponsibleCoachId(event.responsibleCoachId ?? 'none')
    setPracticeBlocks(Array.isArray(event.practicePlan) ? event.practicePlan.map(withPracticePlanningDefaults) : [])
    setApplyToWeeks('1')
  }, [event])

  useEffect(() => {
    let cancelled = false

    const loadCoaches = async () => {
      if (!event) {
        if (!cancelled) setCoachOptions([])
        return
      }

      try {
        const params = new URLSearchParams()
        if (businessSlug) params.set('businessSlug', businessSlug)
        const res = await fetch(`/api/coach/teams/${teamId}/assignable-coaches${params.size ? `?${params}` : ''}`, {
          headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setCoachOptions(data.coaches || [])
      } catch {
        if (!cancelled) setCoachOptions([])
      }
    }

    void loadCoaches()

    return () => {
      cancelled = true
    }
  }, [event, teamId, businessSlug])

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
          responsibleCoachId: responsibleCoachId === 'none' ? null : responsibleCoachId,
          applyToWeeks: Math.max(1, Math.min(52, Number.parseInt(applyToWeeks, 10) || 1)),
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
    const blocks = icePracticeTemplate(kind, locale)
    setPracticeBlocks(blocks)
    setDescription(practiceBlocksToDescription(blocks, locale))
  }

  const updatePracticeBlock = (id: string, patch: Partial<PracticeBlock>) => {
    const nextBlocks = practiceBlocks.map((block) => block.id === id ? { ...block, ...patch } : block)
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks, locale))
  }

  const addPracticeBlock = () => {
    const block = newPracticeBlock(locale)
    const nextBlocks = [...practiceBlocks, block]
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks, locale))
  }

  const addSavedDrillBlock = (drillId: string) => {
    const drill = savedDrills.find((item) => item.id === drillId)
    if (!drill) return
    const nextBlocks = [...practiceBlocks, blockFromSavedDrill(drill, locale)]
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks, locale))
  }

  const removePracticeBlock = (id: string) => {
    const nextBlocks = practiceBlocks.filter((block) => block.id !== id)
    setPracticeBlocks(nextBlocks)
    setDescription(practiceBlocksToDescription(nextBlocks, locale))
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
          responsibleCoachId: responsibleCoachId === 'none' ? null : responsibleCoachId,
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
    if (!event || !canRunTeamAssignment) return

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
      const assignmentCount = Number(data.assignmentCount ?? 0)
      if (assignmentCount === 0) {
        toast.info(text(locale, 'Inga nya spelare behövde tilldelas', 'No new players needed assignment'))
      } else if (event.assignedBroadcastId) {
        toast.success(text(locale, `Tilldelat till ${assignmentCount} nya spelare`, `Assigned to ${assignmentCount} new players`))
      } else {
        toast.success(text(locale, `Tilldelat till ${assignmentCount} spelare`, `Assigned to ${assignmentCount} players`))
      }
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
          <DialogTitle>{text(locale, 'Planera pass', 'Plan session')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{text(locale, 'Titel', 'Title')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={text(locale, 't.ex. Is + styrka', 'e.g. Ice + strength')}
            />
          </div>

          <div className="space-y-2">
            <Label>{text(locale, 'Typ', 'Type')}</Label>
            <Select value={type} onValueChange={(value) => setType(value as TeamEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_EVENT_TYPES.map((eventType) => (
                  <SelectItem key={eventType} value={eventType}>
                    {teamEventTypeLabel(eventType, locale)}
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
                    <div className="text-sm font-medium">{text(locale, 'Fys-pass med byggbart innehåll', 'Physical session with buildable content')}</div>
                    <div className="text-xs text-muted-foreground">
                      {text(locale, 'Koppla ett färdigt pass eller öppna rätt studio för att bygga innehållet.', 'Link a completed workout or open the right studio to build the content.')}
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
                  <Select
                    value={responsibleCoachId}
                    disabled={!canEdit}
                    onValueChange={setResponsibleCoachId}
                  >
                    <SelectTrigger>
                      <UserRound className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder={text(locale, 'Välj tränare', 'Select coach')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{text(locale, 'Ingen ansvarig tränare', 'No responsible coach')}</SelectItem>
                      {coachOptions.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.name} · {coach.roleLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    {text(locale, 'Visas i tränarens kalender som kommande händelse.', 'Shows in the coach calendar as an upcoming event.')}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{text(locale, 'Kopplat pass', 'Linked workout')}</Label>
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
                      <SelectItem value="none">{text(locale, 'Inget kopplat pass', 'No linked workout')}</SelectItem>
                      {workoutOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {linkedWorkoutName && (
                    <div className="text-xs text-muted-foreground">
                      {text(locale, 'Kopplat', 'Linked')}: {linkedWorkoutName}
                    </div>
                  )}
                </div>

                {linkedWorkoutId !== 'none' && canAssignContent && (
                  <div className="rounded-md border bg-background p-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_130px] sm:items-end">
                      <div>
                        <Label className="text-xs">{text(locale, 'Lägg till i flera veckor', 'Add for multiple weeks')}</Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {text(locale, 'Spara samma kopplade pass på den här veckan och kommande veckor.', 'Save the same linked workout on this week and following weeks.')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{text(locale, 'Antal veckor', 'Weeks')}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={52}
                          value={applyToWeeks}
                          onChange={(e) => setApplyToWeeks(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                      {canAppendAssignedWorkout && (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-950">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="text-xs font-medium">
                                {text(locale, `${missingAssignmentCount} nya spelare saknar passet`, `${missingAssignmentCount} new players are missing this workout`)}
                              </div>
                              {assignmentSummary?.missingAthletes?.length ? (
                                <div className="mt-0.5 truncate text-xs opacity-80">
                                  {assignmentSummary.missingAthletes.slice(0, 4).map((athlete) => athlete.athleteName).join(', ')}
                                  {assignmentSummary.missingAthletes.length > 4 ? ` +${assignmentSummary.missingAthletes.length - 4}` : ''}
                                </div>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="shrink-0 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                              onClick={handleAssignToTeam}
                              disabled={assigning}
                            >
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              {assigning ? text(locale, 'Tilldelar...', 'Assigning...') : text(locale, 'Tilldela nya', 'Assign new')}
                            </Button>
                          </div>
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
                        {assigning ? text(locale, 'Tilldelar...', 'Assigning...') : text(locale, 'Tilldela laget', 'Assign team')}
                      </Button>
                    </div>
                  ) : linkedWorkoutId !== 'none' ? (
                    <div className="text-xs text-muted-foreground">
                      {canAssignContent
                        ? text(locale, 'Spara händelsen först, sedan kan passet tilldelas laget.', 'Save the event first, then the session can be assigned to the team.')
                        : text(locale, 'Din roll kan se passet men inte tilldela workout-innehåll.', 'Your role can view the session but cannot assign workout content.')}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {canAssignContent
                        ? text(locale, 'Koppla ett färdigt pass för att kunna tilldela laget.', 'Link a completed workout before assigning it to the team.')
                        : text(locale, 'Din roll kan se passet men inte tilldela workout-innehåll.', 'Your role can view the session but cannot assign workout content.')}
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
                    <div className="text-sm font-medium">{text(locale, 'Ispass-plan', 'Ice practice plan')}</div>
                    <div className="text-xs text-muted-foreground">
                      {text(locale, 'Bygg passet i block med tid, zoner, roller, målvaktsnoter och coachingpunkter.', 'Build the session in blocks with time, zones, roles, goalie notes, and coaching points.')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {practiceMinutes} {text(locale, 'min totalt', 'min total')}
                    </div>
                    {practiceSheetHref && (
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={practiceSheetHref} target="_blank">
                          <Printer className="mr-1.5 h-3.5 w-3.5" />
                          {text(locale, 'Passblad', 'Session sheet')}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                {practiceBlocks.length > 0 && (
                  <div className="grid gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">{text(locale, 'Block', 'Blocks')}</div>
                      <div className="font-semibold">{practiceBlocks.length} {text(locale, 'st', 'pcs')}</div>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">{text(locale, 'Zoner', 'Zones')}</div>
                      <div className="font-semibold">{practiceZoneSummary || text(locale, 'Ej satt', 'Not set')}</div>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">{text(locale, 'Hög belastning', 'High load')}</div>
                      <div className="font-semibold">{highIntensityBlocks} block</div>
                    </div>
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-muted-foreground">{text(locale, 'Målvakt', 'Goalie')}</div>
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
                    {text(locale, 'Teknik + fart', 'Skills + speed')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => applyPracticeTemplate('tactical')}
                  >
                    {text(locale, 'Taktik', 'Tactics')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => applyPracticeTemplate('gamePrep')}
                  >
                    {text(locale, 'Matchförberedelse', 'Game prep')}
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
                        placeholder={text(locale, 'Sök övning...', 'Search drill...')}
                        className="h-9 w-[170px]"
                      />
                      <Select onValueChange={addSavedDrillBlock} disabled={!canEdit || filteredSavedDrills.length === 0}>
                        <SelectTrigger className="h-9 w-[190px]">
                          <SelectValue placeholder={text(locale, '+ Sparad övning', '+ Saved drill')} />
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
                            <div className="text-xs font-medium text-muted-foreground">{text(locale, 'Block', 'Block')} {index + 1}</div>
                            {block.rinkZone && (
                              <Badge variant="outline" className="text-[10px]">
                                {optionLabel(RINK_ZONE_OPTIONS, block.rinkZone, locale)}
                              </Badge>
                            )}
                            {block.intensity && (
                              <Badge variant={block.intensity === 'high' || block.intensity === 'game' ? 'default' : 'secondary'} className="text-[10px]">
                                {optionLabel(INTENSITY_OPTIONS, block.intensity, locale)}
                              </Badge>
                            )}
                            {block.tacticalCategory && (
                              <Badge variant="secondary" className="text-[10px]">
                                {optionLabel(TACTICAL_CATEGORY_OPTIONS, block.tacticalCategory, locale)}
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
                            aria-label={text(locale, 'Ta bort block', 'Remove block')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_90px]">
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Titel', 'Title')}</Label>
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
                            {text(locale, 'Kopplad till sparad övning', 'Linked to saved drill')}
                          </div>
                        )}
                        {isDrillStructure(block.drillStructure) && (
                          <div className="mt-3 rounded-md border bg-slate-50 p-2">
                            <IceHockeyRink structure={block.drillStructure} width={420} className="mx-auto" />
                          </div>
                        )}
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Blocktyp', 'Block type')}</Label>
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
                                    {blockType.label[locale]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Fokus', 'Focus')}</Label>
                            <Input
                              value={block.focus}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { focus: e.target.value })}
                              placeholder={text(locale, 't.ex. breakout, skott, tempo', 'e.g. breakout, shot, tempo')}
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Rinkzon', 'Rink zone')}</Label>
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
                                    {option.label[locale]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Intensitet', 'Intensity')}</Label>
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
                                    {option.label[locale]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Taktisk kategori', 'Tactical category')}</Label>
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
                                    {option.label[locale]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Grupp / kedja', 'Group / line')}</Label>
                            <Input
                              value={block.groups ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { groups: e.target.value })}
                              placeholder={text(locale, 't.ex. alla, kedja 1-2, backar, målvakter', 'e.g. all, line 1-2, defenders, goalies')}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Material', 'Equipment')}</Label>
                            <Input
                              value={block.equipment ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { equipment: e.target.value })}
                              placeholder={text(locale, 't.ex. puckar, koner, småmål', 'e.g. pucks, cones, mini nets')}
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Kedjor / roller', 'Lines / roles')}</Label>
                            <Input
                              value={block.lineGroups ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { lineGroups: e.target.value })}
                              placeholder={text(locale, 't.ex. femma 1 mot femma 2, PP1/BP1', 'e.g. unit 1 vs unit 2, PP1/PK1')}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{text(locale, 'Målvaktsnoter', 'Goalie notes')}</Label>
                            <Input
                              value={block.goalieNotes ?? ''}
                              disabled={!canEdit}
                              onChange={(e) => updatePracticeBlock(block.id, { goalieNotes: e.target.value })}
                              placeholder={text(locale, 't.ex. returkontroll, sidled, puckstart', 'e.g. rebound control, lateral movement, puck start')}
                            />
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          <Label className="text-xs">{text(locale, 'Beskrivning', 'Description')}</Label>
                          <Textarea
                            value={block.description}
                            disabled={!canEdit}
                            rows={2}
                            onChange={(e) => updatePracticeBlock(block.id, { description: e.target.value })}
                          />
                        </div>
                        <div className="mt-3 space-y-1">
                          <Label className="text-xs">{text(locale, 'Coachingpunkter', 'Coaching points')}</Label>
                          <Input
                            value={block.coachingPoints}
                            disabled={!canEdit}
                            onChange={(e) => updatePracticeBlock(block.id, { coachingPoints: e.target.value })}
                            placeholder={text(locale, '1-2 saker tränarna ska trycka på', '1-2 things coaches should emphasize')}
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
            <Label>{text(locale, 'Datum', 'Date')}</Label>
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
            <Label htmlFor="edit-all-day" className="text-sm">{text(locale, 'Heldag', 'All day')}</Label>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{text(locale, 'Starttid', 'Start time')}</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{text(locale, 'Sluttid', 'End time')}</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{text(locale, 'Plats', 'Location')}</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={text(locale, 't.ex. Isrinken, Gymmet', 'e.g. Ice rink, Gym')}
            />
          </div>

          <div className="space-y-2">
            <Label>{text(locale, 'Plan och innehåll', 'Plan and content')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={text(locale, 'Fyll i passets innehåll, fokus, övningar eller ansvar...', 'Add session content, focus, exercises, or responsibilities...')}
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
            {duplicating ? text(locale, 'Kopierar...', 'Copying...') : text(locale, 'Kopiera +7 dagar', 'Copy +7 days')}
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {text(locale, 'Avbryt', 'Cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={loading || !canEdit}>
              {canEdit
                ? (loading ? text(locale, 'Sparar...', 'Saving...') : text(locale, 'Spara', 'Save'))
                : text(locale, 'Endast visning', 'View only')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
