'use client'

/**
 * Full editable roster table for a team.
 *
 * - Inline edit of jersey + position (focus → type → blur saves)
 * - Remove button per row (detaches from team — does NOT delete the client)
 * - Sorts by jersey then name
 *
 * Prop-driven: `members` is the source of truth. After any mutation we
 * call router.refresh() so the RSC parent re-renders and cells see the
 * authoritative values. Local state is limited to a per-cell edit buffer
 * (active only while focused) plus savingId/removingId indicators.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  Heart,
  HeartPulse,
  Loader2,
  MailPlus,
  Plus,
  ShieldAlert,
  Tags,
  Trash2,
  User2,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'

export interface TeamRosterMember {
  id: string
  name: string
  email: string | null
  jerseyNumber: number | null
  position: string | null
  photoUrl: string | null
  hasAthleteAccount: boolean
  todayWorkoutCount: number
  upcomingWorkoutCount: number
  activeInjuryCount: number
  activeRestrictionCount: number
  restrictionSummaries: Array<{
    type: string
    severity: string
    source: string
    bodyParts: string[]
    reason: string | null
  }>
}

interface TeamRosterTableProps {
  teamId: string
  businessSlug: string
  members: TeamRosterMember[]
}

export function TeamRosterTable({ teamId, businessSlug, members }: TeamRosterTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [assignOpen, setAssignOpen] = useState(false)

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        const ja = a.jerseyNumber ?? 9999
        const jb = b.jerseyNumber ?? 9999
        if (ja !== jb) return ja - jb
        return a.name.localeCompare(b.name)
      }),
    [members]
  )
  const selectedMembers = useMemo(
    () => sorted.filter((member) => selectedIds.has(member.id)),
    [selectedIds, sorted]
  )
  const allVisibleSelected = sorted.length > 0 && selectedMembers.length === sorted.length
  const someVisibleSelected = selectedMembers.length > 0 && !allVisibleSelected

  const toggleMember = (clientId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return new Set()
      const next = new Set(current)
      sorted.forEach((member) => next.add(member.id))
      return next
    })
  }

  const pushCreateWorkout = (kind: 'strength' | 'cardio' | 'hybrid') => {
    const path = kind === 'hybrid' ? 'hybrid-studio' : kind
    const params = new URLSearchParams({
      teamId,
      athleteIds: Array.from(selectedIds).join(','),
      source: 'team-roster',
    })
    router.push(`/${businessSlug}/coach/${path}?${params.toString()}`)
  }

  const pushPlayerTab = (clientId: string, tab: 'calendar' | 'programs') => {
    router.push(`/${businessSlug}/coach/clients/${clientId}?tab=${tab}`)
  }

  const saveField = async (
    clientId: string,
    field: 'jerseyNumber' | 'position' | 'email',
    value: string
  ): Promise<boolean> => {
    setSavingId(clientId)

    let payload: Record<string, unknown>
    if (field === 'jerseyNumber') {
      if (value === '') payload = { jerseyNumber: null }
      else {
        const n = Number(value)
        if (!Number.isInteger(n) || n < 0 || n > 999) {
          toast({ title: 'Ogiltigt tröjnummer (0-999)', variant: 'destructive' })
          setSavingId(null)
          return false
        }
        payload = { jerseyNumber: n }
      }
    } else {
      if (field === 'position') {
        payload = { position: value === '' ? null : value }
      } else {
        const email = value.trim().toLowerCase()
        if (!email) {
          toast({ title: 'Ange en e-postadress', variant: 'destructive' })
          setSavingId(null)
          return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          toast({ title: 'Ogiltig e-postadress', variant: 'destructive' })
          setSavingId(null)
          return false
        }
        payload = { email }
      }
    }

    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Sparning misslyckades')
      if (field === 'email') toast({ title: 'E-post sparad' })
      router.refresh()
      return true
    } catch (e) {
      toast({
        title: 'Kunde inte spara',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
      return false
    } finally {
      setSavingId(null)
    }
  }

  const removeMember = async (clientId: string, name: string) => {
    if (!confirm(`Ta bort ${name} från laget? Spelaren finns kvar i atletregistret.`)) return
    setRemovingId(clientId)
    try {
      const res = await fetch(`/api/coach/teams/${teamId}/members/${clientId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Kunde inte ta bort')
      }
      toast({ title: `${name} borttagen från laget` })
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setRemovingId(null)
    }
  }

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Inga spelare i laget ännu — lägg till din första spelare.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {selectedMembers.length > 0 && (
        <div className="flex flex-col gap-3 rounded-md border bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/60 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium dark:text-slate-100">
              {selectedMembers.length} spelare markerade
            </p>
            <p className="text-xs text-muted-foreground">
              Tilldela befintliga pass direkt eller starta ett nytt pass med urvalet sparat som kontext.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Tags className="mr-2 h-4 w-4" />
              Tilldela befintligt
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Skapa pass
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => pushCreateWorkout('strength')}>
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Styrkepass
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => pushCreateWorkout('cardio')}>
                  <Heart className="mr-2 h-4 w-4" />
                  Konditionspass
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => pushCreateWorkout('hybrid')}>
                  <Zap className="mr-2 h-4 w-4" />
                  Hybridpass
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Avmarkera
            </Button>
          </div>
        </div>
      )}

      <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
              onCheckedChange={toggleAllVisible}
              aria-label="Markera alla spelare"
            />
          </TableHead>
          <TableHead className="w-14"></TableHead>
          <TableHead className="w-20">#</TableHead>
          <TableHead>Namn</TableHead>
          <TableHead className="w-40">Position</TableHead>
          <TableHead className="min-w-48">Status</TableHead>
          <TableHead className="hidden md:table-cell">E-post</TableHead>
          <TableHead className="w-32 text-right">Planera</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((m) => (
          <TableRow key={m.id} data-state={selectedIds.has(m.id) ? 'selected' : undefined}>
            <TableCell>
              <Checkbox
                checked={selectedIds.has(m.id)}
                onCheckedChange={() => toggleMember(m.id)}
                aria-label={`Markera ${m.name}`}
              />
            </TableCell>
            <TableCell>
              <PlayerAvatarCell
                teamId={teamId}
                clientId={m.id}
                name={m.name}
                photoUrl={m.photoUrl}
              />
            </TableCell>
            <TableCell>
              <RosterNumberCell
                value={m.jerseyNumber}
                onSave={(v) => saveField(m.id, 'jerseyNumber', v)}
                saving={savingId === m.id}
              />
            </TableCell>
            <TableCell className="font-medium">{m.name}</TableCell>
            <TableCell>
              <RosterTextCell
                value={m.position}
                placeholder="—"
                onSave={(v) => saveField(m.id, 'position', v)}
                saving={savingId === m.id}
              />
            </TableCell>
            <TableCell>
              <RosterStatusBadges member={m} />
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm">
              <RosterEmailCell
                value={m.email}
                saving={savingId === m.id}
                onSave={(v) => saveField(m.id, 'email', v)}
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => pushPlayerTab(m.id, 'calendar')}
                  aria-label={`Öppna kalender för ${m.name}`}
                  title="Öppna spelarkalender"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
                <CreateAthleteAccountDialog
                  clientId={m.id}
                  clientName={m.name}
                  clientEmail={m.email}
                  hasExistingAccount={m.hasAthleteAccount}
                  onAccountCreated={() => router.refresh()}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={m.hasAthleteAccount ? `Skicka invite till ${m.name}` : `Bjud in ${m.name}`}
                      title={m.hasAthleteAccount ? 'Skicka invite' : 'Skapa atletkonto och invite'}
                    >
                      <MailPlus className="h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => pushPlayerTab(m.id, 'programs')}
                  aria-label={`Öppna program för ${m.name}`}
                  title="Öppna spelarprogram"
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                disabled={removingId === m.id}
                onClick={() => removeMember(m.id, m.name)}
                aria-label={`Ta bort ${m.name}`}
              >
                {removingId === m.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-500" />
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>

      <RosterWorkoutAssignmentDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        teamId={teamId}
        businessSlug={businessSlug}
        members={members}
        selectedIds={Array.from(selectedIds)}
        onAssigned={() => {
          setSelectedIds(new Set())
          router.refresh()
        }}
      />
    </div>
  )
}

function RosterStatusBadges({ member }: { member: TeamRosterMember }) {
  const hasCareFlag = member.activeRestrictionCount > 0 || member.activeInjuryCount > 0

  return (
    <div className="flex flex-wrap gap-1.5">
      {member.todayWorkoutCount > 0 && (
        <Badge variant="default" className="text-[10px]">
          <CalendarDays className="mr-1 h-3 w-3" />
          {member.todayWorkoutCount} idag
        </Badge>
      )}
      {member.todayWorkoutCount === 0 && member.upcomingWorkoutCount > 0 && (
        <Badge variant="secondary" className="text-[10px]">
          <CalendarDays className="mr-1 h-3 w-3" />
          {member.upcomingWorkoutCount} kommande
        </Badge>
      )}
      {member.activeRestrictionCount > 0 && (
        <Badge variant="outline" className="border-red-300 text-[10px] text-red-700 dark:border-red-800 dark:text-red-300">
          <ShieldAlert className="mr-1 h-3 w-3" />
          {member.activeRestrictionCount} restr.
        </Badge>
      )}
      {member.activeRestrictionCount === 0 && member.activeInjuryCount > 0 && (
        <Badge variant="outline" className="border-amber-300 text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-300">
          <HeartPulse className="mr-1 h-3 w-3" />
          {member.activeInjuryCount} skada
        </Badge>
      )}
      {!hasCareFlag && member.todayWorkoutCount === 0 && member.upcomingWorkoutCount === 0 && (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  )
}

type WorkoutType = 'strength' | 'cardio' | 'hybrid'

interface WorkoutOption {
  id: string
  name: string
  description?: string | null
}

const workoutTypeLabels: Record<WorkoutType, string> = {
  strength: 'Styrka',
  cardio: 'Kondition',
  hybrid: 'Hybrid',
}

const workoutTypeIcons: Record<WorkoutType, typeof Dumbbell> = {
  strength: Dumbbell,
  cardio: Heart,
  hybrid: Zap,
}

function getTodayInputDate() {
  return new Date().toISOString().split('T')[0]
}

function RosterWorkoutAssignmentDialog({
  open,
  onOpenChange,
  teamId,
  businessSlug,
  members,
  selectedIds,
  onAssigned,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  businessSlug: string
  members: TeamRosterMember[]
  selectedIds: string[]
  onAssigned: () => void
}) {
  const { toast } = useToast()
  const [workoutType, setWorkoutType] = useState<WorkoutType>('strength')
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('')
  const [assignedDate, setAssignedDate] = useState(getTodayInputDate)
  const [notes, setNotes] = useState('')
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds]
  )
  const careFlags = selectedMembers.filter(
    (member) => member.activeRestrictionCount > 0 || member.activeInjuryCount > 0
  )
  const selectedWorkout = workouts.find((workout) => workout.id === selectedWorkoutId)

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    const endpoint =
      workoutType === 'strength'
        ? '/api/strength-sessions?limit=100'
        : workoutType === 'cardio'
          ? '/api/cardio-sessions?limit=100'
          : '/api/hybrid-workouts?limit=100'

    async function loadWorkouts() {
      setLoadingWorkouts(true)
      try {
        const res = await fetch(endpoint, {
          signal: controller.signal,
          headers: { 'x-business-slug': businessSlug },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Kunde inte hämta pass')
        }
        const data = await res.json()
        const list = workoutType === 'hybrid' ? data.workouts : data.sessions
        setWorkouts(
          (Array.isArray(list) ? list : []).map((item: WorkoutOption) => ({
            id: item.id,
            name: item.name,
            description: item.description ?? null,
          }))
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        toast({
          title: 'Kunde inte hämta pass',
          description: error instanceof Error ? error.message : 'Okänt fel',
          variant: 'destructive',
        })
      } finally {
        setLoadingWorkouts(false)
      }
    }

    void loadWorkouts()

    return () => controller.abort()
  }, [businessSlug, open, toast, workoutType])

  const assignWorkout = async () => {
    if (!selectedWorkoutId || selectedMembers.length === 0) return

    setAssigning(true)
    try {
      const res = await fetch(`/api/teams/${teamId}/assign-workout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-business-slug': businessSlug,
        },
        body: JSON.stringify({
          workoutType,
          workoutId: selectedWorkoutId,
          assignedDate,
          notes: notes.trim() || undefined,
          includeAthleteIds: selectedIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Tilldelning misslyckades')

      toast({
        title: 'Pass tilldelat',
        description: `${selectedWorkout?.name ?? 'Passet'} tilldelades till ${data.data?.assignmentCount ?? selectedMembers.length} spelare.`,
      })
      onOpenChange(false)
      onAssigned()
    } catch (error) {
      toast({
        title: 'Kunde inte tilldela pass',
        description: error instanceof Error ? error.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tilldela pass till urval
          </DialogTitle>
          <DialogDescription>
            Välj ett befintligt pass och datum. Endast de markerade spelarna får passet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Passkategori</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(workoutTypeLabels) as WorkoutType[]).map((type) => {
                const Icon = workoutTypeIcons[type]
                return (
                  <Button
                    key={type}
                    type="button"
                    variant={workoutType === type ? 'default' : 'outline'}
                    onClick={() => {
                      setWorkoutType(type)
                      setSelectedWorkoutId('')
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {workoutTypeLabels[type]}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="workout-select">Pass</Label>
            <select
              id="workout-select"
              value={selectedWorkoutId}
              onChange={(event) => setSelectedWorkoutId(event.target.value)}
              disabled={loadingWorkouts}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{loadingWorkouts ? 'Laddar pass...' : 'Välj pass...'}</option>
              {workouts.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assigned-date">Datum</Label>
            <Input
              id="assigned-date"
              type="date"
              value={assignedDate}
              onChange={(event) => setAssignedDate(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assignment-notes">Anteckningar</Label>
            <Textarea
              id="assignment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Instruktioner till spelarna..."
              rows={2}
            />
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-sm font-medium">{selectedMembers.length} spelare får passet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedMembers.slice(0, 5).map((member) => member.name).join(', ')}
              {selectedMembers.length > 5 ? ` +${selectedMembers.length - 5}` : ''}
            </p>
          </div>

          {careFlags.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4" />
                Kontrollera restriktioner innan tilldelning
              </p>
              <div className="mt-2 space-y-1 text-xs">
                {careFlags.slice(0, 4).map((member) => (
                  <p key={member.id}>
                    {member.name}: {formatCareFlag(member)}
                  </p>
                ))}
                {careFlags.length > 4 && <p>+{careFlags.length - 4} fler spelare</p>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={assignWorkout}
            disabled={assigning || !selectedWorkoutId || selectedMembers.length === 0}
          >
            {assigning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Tags className="mr-2 h-4 w-4" />
            )}
            Tilldela ({selectedMembers.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatCareFlag(member: TeamRosterMember) {
  if (member.restrictionSummaries.length > 0) {
    const first = member.restrictionSummaries[0]
    const bodyParts = first.bodyParts.length > 0 ? `, ${first.bodyParts.join('/')}` : ''
    return `${first.type.replace(/_/g, ' ')} (${first.severity.toLowerCase()}${bodyParts})`
  }
  return `${member.activeInjuryCount} aktiv ${member.activeInjuryCount === 1 ? 'skada' : 'skador'}`
}

function PlayerAvatarCell({
  teamId,
  clientId,
  name,
  photoUrl,
}: {
  teamId: string
  clientId: string
  name: string
  photoUrl: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ogiltigt format', description: 'Välj en bild (JPG/PNG/WebP/HEIC)', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await fetch(
        `/api/coach/teams/${teamId}/members/${clientId}/photo`,
        { method: 'POST', body: form }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Uppladdning misslyckades')
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const remove = async () => {
    if (!confirm(`Ta bort foto för ${name}?`)) return
    setUploading(true)
    try {
      const res = await fetch(
        `/api/coach/teams/${teamId}/members/${clientId}/photo`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Kunde inte ta bort')
      router.refresh()
    } catch (e) {
      toast({
        title: 'Fel',
        description: e instanceof Error ? e.message : 'Okänt fel',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative group">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void upload(f)
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500 transition"
        aria-label={`Ladda upp foto för ${name}`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
        ) : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <User2 className="h-5 w-5 text-slate-400" />
        )}
        {!uploading && !photoUrl && (
          <span className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
            <Camera className="h-4 w-4 text-white" />
          </span>
        )}
      </button>
      {photoUrl && !uploading && (
        <button
          type="button"
          onClick={remove}
          aria-label={`Ta bort foto för ${name}`}
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-slate-700 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

/**
 * Controlled input that tracks the parent's `value` prop whenever the cell
 * is NOT actively being edited, and uses a local `buffer` only while focused.
 * This way server-driven re-renders (router.refresh after bulk import, etc.)
 * update what's shown without fighting user typing.
 */
function RosterNumberCell({
  value,
  onSave,
  saving,
}: {
  value: number | null
  onSave: (v: string) => void
  saving: boolean
}) {
  const [buffer, setBuffer] = useState<string | null>(null)
  const propDisplay = value == null ? '' : String(value)
  const display = buffer ?? propDisplay
  return (
    <Input
      type="number"
      min={0}
      max={999}
      value={display}
      disabled={saving}
      onFocus={() => setBuffer(propDisplay)}
      onChange={(e) => setBuffer(e.target.value)}
      onBlur={() => {
        const next = (buffer ?? '').trim()
        if (next !== propDisplay) onSave(next)
        setBuffer(null)
      }}
      className="h-8 w-16 text-center"
    />
  )
}

function RosterTextCell({
  value,
  placeholder,
  onSave,
  saving,
}: {
  value: string | null
  placeholder: string
  onSave: (v: string) => void
  saving: boolean
}) {
  const [buffer, setBuffer] = useState<string | null>(null)
  const propDisplay = value ?? ''
  const display = buffer ?? propDisplay
  return (
    <Input
      value={display}
      placeholder={placeholder}
      disabled={saving}
      onFocus={() => setBuffer(propDisplay)}
      onChange={(e) => setBuffer(e.target.value)}
      onBlur={() => {
        const next = (buffer ?? '').trim()
        if (next !== propDisplay) onSave(next)
        setBuffer(null)
      }}
      className="h-8"
    />
  )
}

function RosterEmailCell({
  value,
  saving,
  onSave,
}: {
  value: string | null
  saving: boolean
  onSave: (v: string) => Promise<boolean>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [buffer, setBuffer] = useState('')
  const [optimisticValue, setOptimisticValue] = useState<string | null>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const displayValue = value ?? optimisticValue

  if (displayValue) {
    return <span className="text-muted-foreground">{displayValue}</span>
  }

  if (!editing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => {
          setBuffer('')
          setEditing(true)
        }}
      >
        <MailPlus className="mr-1.5 h-3.5 w-3.5" />
        Lägg till
      </Button>
    )
  }

  const save = async () => {
    const next = buffer.trim()
    if (!next) return
    const saved = await onSave(next)
    if (saved) {
      setOptimisticValue(next.toLowerCase())
      setEditing(false)
      setBuffer('')
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        type="email"
        value={buffer}
        disabled={saving}
        placeholder="namn@example.com"
        onChange={(event) => setBuffer(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void save()
          if (event.key === 'Escape') {
            setEditing(false)
            setBuffer('')
          }
        }}
        className="h-8 w-56"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={saving || !buffer.trim()}
        onClick={() => void save()}
        aria-label="Spara e-postadress"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4 text-emerald-600" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={saving}
        onClick={() => {
          setEditing(false)
          setBuffer('')
        }}
        aria-label="Avbryt e-post"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
