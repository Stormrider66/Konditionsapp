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
  type TeamEventContentOwner,
  type TeamEventContentStatus,
  type TeamEventType,
} from '@/lib/team-calendar/event-types'
import { CheckCircle2, Dumbbell, ExternalLink, HeartPulse, Plus, Printer, Route, Send, Trash2, Zap } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IceHockeyRink, type DrillStructure } from '@/components/coach/drills/IceHockeyRink'

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

interface PracticeBlock {
  id: string
  type: 'warmup' | 'technical' | 'tactical' | 'small_game' | 'special_teams' | 'goalie' | 'cooldown'
  title: string
  duration: number
  focus: string
  description: string
  coachingPoints: string
  drillId?: string | null
  drillStructure?: unknown
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

function assignmentStatusLabel(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'Klar'
    case 'SKIPPED':
      return 'Skippad'
    case 'SCHEDULED':
      return 'Bekräftad'
    case 'IN_PROGRESS':
      return 'Pågår'
    case 'MODIFIED':
      return 'Ändrad'
    default:
      return 'Ej klar'
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

const PRACTICE_BLOCK_TYPES: Array<{ value: PracticeBlock['type']; label: string }> = [
  { value: 'warmup', label: 'Uppvärmning' },
  { value: 'technical', label: 'Teknik' },
  { value: 'tactical', label: 'Taktik' },
  { value: 'small_game', label: 'Smålagsspel' },
  { value: 'special_teams', label: 'Special teams' },
  { value: 'goalie', label: 'Målvakt' },
  { value: 'cooldown', label: 'Nedvarvning' },
]

function blockId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function blockSummary(block: PracticeBlock) {
  const lines = [`${block.duration} min | ${block.title}`]
  if (block.focus) lines.push(`Fokus: ${block.focus}`)
  if (block.description) lines.push(block.description)
  if (block.coachingPoints) lines.push(`Coaching: ${block.coachingPoints}`)
  return lines.join('\n')
}

function practiceBlocksToDescription(blocks: PracticeBlock[]) {
  return blocks.map(blockSummary).join('\n\n')
}

function makeBlock(input: Omit<PracticeBlock, 'id'>): PracticeBlock {
  return { id: blockId(), ...input }
}

function newPracticeBlock(): PracticeBlock {
  return makeBlock({
    type: 'technical',
    title: 'Nytt block',
    duration: 10,
    focus: '',
    description: '',
    coachingPoints: '',
  })
}

function blockFromSavedDrill(drill: SavedDrill): PracticeBlock {
  return makeBlock({
    type: 'technical',
    title: drill.title,
    duration: 15,
    focus: 'Övning',
    description: drill.description ?? '',
    coachingPoints: '',
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

function icePracticeTemplate(kind: 'skills' | 'tactical' | 'gamePrep'): PracticeBlock[] {
  if (kind === 'skills') {
    return [
      makeBlock({ type: 'warmup', title: 'Skridskoteknik + pucktouch', duration: 10, focus: 'Aktivering', description: 'Lätta riktningsförändringar, puckkontroll och tempo upp stegvis.', coachingPoints: 'Knä över tå, aktiv klubba, korta byten.' }),
      makeBlock({ type: 'technical', title: 'Teknikstationer', duration: 15, focus: 'Pass/mottag, skott, riktningsförändringar', description: 'Tre stationer med tydlig rotation och hög repetition.', coachingPoints: 'Kvalitet före fart första varvet, sedan tempo.' }),
      makeBlock({ type: 'small_game', title: '2v2 / 3v3 korta byten', duration: 15, focus: 'Beslut i små ytor', description: 'Smålagsspel med 30-40 sek byten.', coachingPoints: 'Spelbarhet, snabb återerövring, kommunikation.' }),
      makeBlock({ type: 'technical', title: 'Fartmoment + avslut', duration: 15, focus: 'Övergångar', description: 'Övergång från fart till avslut med trafik mot mål.', coachingPoints: 'Attackera med fart, andra våg mot retur.' }),
      makeBlock({ type: 'cooldown', title: 'Nedvarvning + samling', duration: 5, focus: 'Summering', description: 'Lugn åkning och kort samling.', coachingPoints: 'Lyft 1-2 nycklar till nästa pass.' }),
    ]
  }

  if (kind === 'tactical') {
    return [
      makeBlock({ type: 'warmup', title: 'Spelvändningar utan press', duration: 10, focus: 'Timing', description: 'Lugn uppstart med passvägar och uppspel.', coachingPoints: 'Vänd upp tidigt, scan före puck.' }),
      makeBlock({ type: 'tactical', title: 'Breakout + första pass', duration: 15, focus: 'Speluppbyggnad', description: 'Back-forward-center-positioner med kontrollerad press.', coachingPoints: 'Bredd, understöd, första pass på blad.' }),
      makeBlock({ type: 'tactical', title: 'Forecheck/backcheck', duration: 15, focus: 'Styrning och avstånd', description: 'Lagdelar jobbar med triggers och hemgångar.', coachingPoints: 'Rätt sida, korta avstånd, tydliga triggers.' }),
      makeBlock({ type: 'special_teams', title: 'Zonspel / special teams', duration: 15, focus: 'Roller', description: 'Repetera PP/BP eller försvar/anfall i zon.', coachingPoints: 'Tydliga roller och nästa aktion.' }),
      makeBlock({ type: 'cooldown', title: 'Samling', duration: 5, focus: 'Nycklar', description: '1-2 prioriteringar till nästa match.', coachingPoints: 'Kort och tydligt.' }),
    ]
  }

  return [
    makeBlock({ type: 'warmup', title: 'Tempo + pucktouch', duration: 10, focus: 'Aktivering', description: 'Matchlik start med målvaktsvärmning integrerad.', coachingPoints: 'Få upp fart utan att slita.' }),
    makeBlock({ type: 'technical', title: 'Matchlika avslut', duration: 15, focus: 'Trafik på mål', description: 'Avslut med skymning, retur och andra puck.', coachingPoints: 'In på kassen, klubba ledig, stoppa vid mål.' }),
    makeBlock({ type: 'tactical', title: 'Spelvändningar + hemgångar', duration: 15, focus: 'Matchdetaljer', description: 'Övergångar med defensiv sortering.', coachingPoints: 'Första hem, andra styr, tredje säkrar.' }),
    makeBlock({ type: 'special_teams', title: 'PP / BP / tekningar', duration: 12, focus: 'Special teams', description: 'Repetera fasta situationer och roller.', coachingPoints: 'Startposition, första beslut, returjobb.' }),
    makeBlock({ type: 'small_game', title: 'Kort spel + matchplan', duration: 8, focus: 'Energi', description: 'Kort intensivt spel och tydlig matchplan.', coachingPoints: 'Avsluta med självförtroende.' }),
  ]
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
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const builderLink = builderLinkFor(type, businessSlug)
  const isPhysicalSession = PHYSICAL_TEAM_EVENT_TYPES.includes(type)
  const isIcePractice = type === 'PRACTICE' || type === 'ICE_PRACTICE'
  const practiceSheetHref = event && businessSlug
    ? `/${businessSlug}/coach/teams/${teamId}/calendar/${event.id}/practice-sheet`
    : null
  const linkedWorkoutType = workoutTypeForEventType(type)
  const canAssignPersistedWorkout = Boolean(canAssignContent && event?.linkedWorkoutId && event?.linkedWorkoutType && !event.assignedBroadcastId)
  const isAssigned = Boolean(event?.assignedBroadcastId)
  const assignmentSummary = event?.assignmentSummary

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
    setPracticeBlocks(Array.isArray(event.practicePlan) ? event.practicePlan : [])
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
      toast.error('Din roll kan bara visa den här händelsen')
      return
    }
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
          practicePlan: isIcePractice ? practiceBlocks : null,
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

  const applyPracticeTemplate = (kind: 'skills' | 'tactical' | 'gamePrep') => {
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
                    disabled={!canAssignContent}
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Passet är tilldelat laget.
                      </div>
                      {assignmentSummary && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Genomförande</span>
                            <span className="font-medium text-foreground">
                              {assignmentSummary.totalCompleted}/{assignmentSummary.totalAssigned} klara · {assignmentSummary.completionRate}%
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
                          Tilldelat {new Date(event.assignedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                      {assignmentSummary?.athletes?.length ? (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">Spelarstatus</div>
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
                                      {assignmentStatusLabel(athlete.status)}
                                    </Badge>
                                  </div>
                                  {(athlete.rpe || duration || athlete.completedAt) && (
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      {athlete.rpe && <span>RPE {athlete.rpe}/10</span>}
                                      {duration && <span>{duration}</span>}
                                      {athlete.completedAt && (
                                        <span>
                                          Klar {new Date(athlete.completedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
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
                        Skapa teamtilldelning med datum, tid och plats från kalendern.
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
                      Bygg passet i block med tid, fokus och coachingpunkter.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {practiceBlocks.reduce((sum, block) => sum + (Number(block.duration) || 0), 0)} min totalt
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
                    <Select onValueChange={addSavedDrillBlock} disabled={!canEdit}>
                      <SelectTrigger className="h-9 w-[190px]">
                        <SelectValue placeholder="+ Sparad övning" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedDrills.map((drill) => (
                          <SelectItem key={drill.id} value={drill.id}>
                            {drill.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {practiceBlocks.length > 0 && (
                  <div className="space-y-2">
                    {practiceBlocks.map((block, index) => (
                      <div key={block.id} className="rounded-md border bg-background p-3">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="text-xs font-medium text-muted-foreground">Block {index + 1}</div>
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

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleUpdate} disabled={loading || !canEdit}>
            {canEdit ? (loading ? 'Sparar...' : 'Spara') : 'Endast visning'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
