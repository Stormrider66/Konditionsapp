'use client'

/**
 * Team Workout Assignment Dialog
 *
 * Assign a workout to a team. Everyone is marked by default; uncheck to
 * exclude (e.g. a goalie doing something different). Supports:
 * - Team-selector mode (default) OR team-fixed mode (pass `teamId`).
 * - A pre-chosen workout (props) OR an in-dialog workout picker (omit the
 *   workout props).
 * - Position quick-select chips (F/D/G…) and per-player preselect.
 * - Account-less roster members are shown disabled (they can't receive a
 *   program until invited).
 */

import { useCallback, useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/i18n/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Calendar, Loader2, CheckCircle2, Clock, ChevronDown, MapPin, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { TeamSelector } from './TeamSelector'
import { PositionQuickSelect } from './PositionQuickSelect'
import { WorkoutPickerField, type PickedWorkout } from './WorkoutPickerField'
import { AppointmentSchedulingFields } from '@/components/coach/scheduling/AppointmentSchedulingFields'
import {
  RepeatWeeklyFields,
  computeWeeklyDates,
  DEFAULT_OCCURRENCES,
} from '@/components/coach/scheduling/RepeatWeeklyFields'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'

interface LocationOption {
  id: string
  name: string
}

interface TrainerOption {
  id: string
  name: string
  email: string
}

interface TeamMember {
  id: string
  name: string
  email?: string
  position?: string | null
  hasAthleteAccount: boolean
}

interface Team {
  id: string
  name: string
  members: TeamMember[]
}

interface TeamWorkoutAssignmentDialogProps {
  /** Pre-chosen workout. Omit all three to show the in-dialog workout picker. */
  workoutType?: 'strength' | 'cardio' | 'hybrid' | 'agility'
  workoutId?: string
  workoutName?: string
  /** Fix the dialog to a single team (skips the team selector). */
  teamId?: string
  /** Open with only this athlete marked (per-player quick-assign). */
  preselectAthleteId?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAssigned?: () => void
}

type AppLocale = 'en' | 'sv'

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

export function TeamWorkoutAssignmentDialog({
  workoutType,
  workoutId,
  workoutName,
  teamId: fixedTeamId,
  preselectAthleteId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onAssigned,
}: TeamWorkoutAssignmentDialogProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [team, setTeam] = useState<Team | null>(null)
  const [excludedMembers, setExcludedMembers] = useState<string[]>([])
  // athleteId → blocked exercise names (from the restriction preview)
  const [blockedById, setBlockedById] = useState<Record<string, string[]>>({})
  const [assignedDate, setAssignedDate] = useState('')
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [occurrences, setOccurrences] = useState(DEFAULT_OCCURRENCES)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)

  // In-dialog workout picker (used when no workout props were passed)
  const [pickedWorkout, setPickedWorkout] = useState<PickedWorkout | null>(null)
  const needsWorkoutPicker = !workoutId
  const effectiveWorkout = workoutId
    ? { type: workoutType!, id: workoutId, name: workoutName ?? '' }
    : pickedWorkout
  const effWorkoutType = effectiveWorkout?.type
  const effWorkoutId = effectiveWorkout?.id

  // Location & trainer
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [customLocationName, setCustomLocationName] = useState('')
  const [useCustomLocation, setUseCustomLocation] = useState(false)
  const [selectedTrainerId, setSelectedTrainerId] = useState('')

  // Scheduling state
  const [schedulingOpen, setSchedulingOpen] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [locationId, setLocationId] = useState('')
  const [locationName, setLocationName] = useState('')
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true)
  const pathname = usePathname()
  const businessHeaders = useMemo(() => getBusinessScopeHeaders(pathname), [pathname])

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/locations', { headers: businessHeaders })
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }, [businessHeaders])

  const fetchTrainers = useCallback(async () => {
    try {
      const response = await fetch('/api/trainers', { headers: businessHeaders })
      if (response.ok) {
        const data = await response.json()
        setTrainers(data.trainers || [])
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error)
    }
  }, [businessHeaders])

  const fetchTeamDetails = useCallback(
    async (teamId: string) => {
      setLoadingTeam(true)
      try {
        const response = await fetch(`/api/teams/${teamId}`, { headers: businessHeaders })
        if (response.ok) {
          const data = await response.json()
          const raw = data.data
          const members: TeamMember[] = (raw?.members ?? []).map(
            (m: { id: string; name: string; email?: string | null; position?: string | null; athleteAccount?: { id: string } | null }) => ({
              id: m.id,
              name: m.name,
              email: m.email ?? undefined,
              position: m.position ?? null,
              hasAthleteAccount: Boolean(m.athleteAccount),
            })
          )
          const nextTeam: Team = { id: raw.id, name: raw.name, members }
          setTeam(nextTeam)
          // Default selection: everyone (account-less + blocked are filtered by
          // the inclusion rule, not by exclusions). Preselect narrows to one.
          if (preselectAthleteId) {
            setExcludedMembers(
              members.filter((m) => m.hasAthleteAccount && m.id !== preselectAthleteId).map((m) => m.id)
            )
          } else {
            setExcludedMembers([])
          }
        }
      } catch (error) {
        console.error('Failed to fetch team:', error)
      } finally {
        setLoadingTeam(false)
      }
    },
    [businessHeaders, preselectAthleteId]
  )

  useEffect(() => {
    if (!open) return

    void Promise.resolve().then(() => {
      void fetchLocations()
      void fetchTrainers()
      // Reset form
      setSelectedTeamId(fixedTeamId ?? '')
      setTeam(null)
      setExcludedMembers([])
      setBlockedById({})
      setPickedWorkout(null)
      setAssignedDate(new Date().toISOString().split('T')[0])
      setRepeatEnabled(false)
      setOccurrences(DEFAULT_OCCURRENCES)
      setNotes('')
      setSelectedLocationId('')
      setCustomLocationName('')
      setUseCustomLocation(false)
      setSelectedTrainerId('')
      setSchedulingOpen(false)
      setStartTime('')
      setEndTime('')
      setLocationId('')
      setLocationName('')
      setCreateCalendarEvent(true)
    })
  }, [fetchLocations, fetchTrainers, open, fixedTeamId])

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (selectedTeamId) {
        void fetchTeamDetails(selectedTeamId)
      } else {
        setTeam(null)
        setExcludedMembers([])
      }
    })
  }, [fetchTeamDetails, selectedTeamId])

  // Restriction preview: which account-having members are blocked for the
  // chosen workout. Blocked members are then disabled + auto-excluded below.
  useEffect(() => {
    const controller = new AbortController()
    async function loadPreview() {
      if (!selectedTeamId || !team || !effWorkoutId || !effWorkoutType) {
        setBlockedById({})
        return
      }
      const athleteIds = team.members.filter((m) => m.hasAthleteAccount).map((m) => m.id)
      if (athleteIds.length === 0) {
        setBlockedById({})
        return
      }
      try {
        const res = await fetch(`/api/teams/${selectedTeamId}/assign-workout/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(businessHeaders ?? {}) },
          body: JSON.stringify({ workoutType: effWorkoutType, workoutId: effWorkoutId, athleteIds }),
          signal: controller.signal,
        })
        if (!res.ok) {
          setBlockedById({})
          return
        }
        const data = await res.json()
        const map: Record<string, string[]> = {}
        if (data?.success) {
          for (const b of data.data.blocked as Array<{ athleteId: string; exerciseNames: string[] }>) {
            map[b.athleteId] = b.exerciseNames
          }
        }
        setBlockedById(map)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setBlockedById({})
      }
    }
    void loadPreview()
    return () => controller.abort()
  }, [selectedTeamId, team, effWorkoutType, effWorkoutId, businessHeaders])

  const isBlocked = useCallback((memberId: string) => memberId in blockedById, [blockedById])

  /** Will this member actually be assigned (has account, not blocked, not unchecked)? */
  const isIncluded = useCallback(
    (member: TeamMember) =>
      member.hasAthleteAccount && !isBlocked(member.id) && !excludedMembers.includes(member.id),
    [excludedMembers, isBlocked]
  )

  const positions = useMemo(() => {
    if (!team) return []
    const set = new Set<string>()
    team.members.forEach((m) => {
      if (m.position) set.add(m.position)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'sv'))
  }, [team])

  function toggleMemberExclusion(member: TeamMember) {
    if (!member.hasAthleteAccount || isBlocked(member.id)) return // can't be assigned
    setExcludedMembers((prev) =>
      prev.includes(member.id) ? prev.filter((id) => id !== member.id) : [...prev, member.id]
    )
  }

  function selectAllMembers() {
    setExcludedMembers([])
  }

  function deselectAllMembers() {
    if (team) setExcludedMembers(team.members.map((m) => m.id))
  }

  function selectPosition(position: string) {
    if (!team) return
    // Uncheck everyone not of this position; account-less / blocked are filtered
    // out by the inclusion rule regardless.
    setExcludedMembers(team.members.filter((m) => m.position !== position).map((m) => m.id))
  }

  const selectedMemberCount = team ? team.members.filter(isIncluded).length : 0

  const dialogTitle = effectiveWorkout?.name
    ? `${copy(locale, 'Assign', 'Tilldela')} "${effectiveWorkout.name}"`
    : copy(locale, 'Assign a workout', 'Tilldela ett pass')

  type AssignResponseBody = {
    data?: { assignmentCount?: number; teamName?: string; skipped?: Array<{ name: string }> }
    error?: string
  }

  async function handleAssign() {
    if (!selectedTeamId || selectedMemberCount === 0 || !effectiveWorkout || !assignedDate) return

    setLoading(true)
    try {
      const baseDate = new Date(assignedDate)
      const dates = repeatEnabled ? computeWeeklyDates(baseDate, occurrences) : [baseDate]
      const dateStrings = dates.map((d) => d.toISOString().split('T')[0])

      const responses = await Promise.all(
        dateStrings.map((isoDate) =>
          fetch(`/api/teams/${selectedTeamId}/assign-workout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(businessHeaders ?? {}) },
            body: JSON.stringify({
              workoutType: effectiveWorkout.type,
              workoutId: effectiveWorkout.id,
              assignedDate: isoDate,
              notes: notes || undefined,
              excludeAthleteIds: excludedMembers.length > 0 ? excludedMembers : undefined,
              locationId: selectedLocationId || undefined,
              locationName: customLocationName || undefined,
              responsibleCoachId: selectedTrainerId || undefined,
              ...(startTime && {
                startTime,
                endTime: endTime || undefined,
                locationId: locationId || undefined,
                locationName: locationName || undefined,
                createCalendarEvent,
              }),
            }),
          })
            .then(async (response) => ({
              ok: response.ok,
              isoDate,
              body: (await response.json().catch(() => ({}))) as AssignResponseBody,
            }))
            .catch((error) => {
              console.error(`Failed to assign on ${isoDate}:`, error)
              return { ok: false, isoDate, body: {} as AssignResponseBody }
            })
        )
      )

      const okResponses = responses.filter((r) => r.ok)
      const successCount = okResponses.length
      const failCount = responses.length - successCount

      if (successCount > 0) {
        const teamName = okResponses[0]?.body.data?.teamName ?? ''
        const perDateCount = okResponses[0]?.body.data?.assignmentCount ?? selectedMemberCount
        const skipped = okResponses[0]?.body.data?.skipped

        const description =
          dates.length > 1
            ? copy(
                locale,
                `${effectiveWorkout.name}: ${perDateCount} players × ${successCount} weeks in ${teamName}.`,
                `${effectiveWorkout.name}: ${perDateCount} spelare × ${successCount} veckor i ${teamName}.`
              )
            : copy(
                locale,
                `${effectiveWorkout.name} assigned to ${perDateCount} players in ${teamName}.`,
                `${effectiveWorkout.name} tilldelat till ${perDateCount} spelare i ${teamName}.`
              )

        if (failCount > 0) {
          toast.warning(copy(locale, 'Partially assigned', 'Delvis tilldelat'), {
            description: `${description} ${copy(locale, `${failCount} week(s) failed.`, `${failCount} vecka/veckor misslyckades.`)}`,
          })
        } else {
          toast.success(copy(locale, 'Team workout assigned!', 'Lagpass tilldelat!'), { description })
        }

        if (skipped && skipped.length > 0) {
          toast.warning(
            copy(
              locale,
              `${skipped.length} player(s) skipped by a restriction`,
              `${skipped.length} spelare hoppades över pga restriktion`
            ),
            { description: skipped.map((s) => s.name).join(', ') }
          )
        }

        setOpen(false)
        onAssigned?.()
      } else {
        toast.error(copy(locale, 'Assignment failed', 'Tilldelning misslyckades'), {
          description:
            responses[0]?.body.error ||
            copy(locale, 'Could not assign the workout to the team.', 'Kunde inte tilldela passet till laget.'),
        })
      }
    } catch (error) {
      console.error('Failed to assign workout to team:', error)
      toast.error(copy(locale, 'Assignment failed', 'Tilldelning misslyckades'), {
        description: copy(locale, 'An unexpected error occurred.', 'Ett oväntat fel inträffade.'),
      })
    } finally {
      setLoading(false)
    }
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {copy(locale, 'Assign to Team', 'Tilldela till Lag')}
        </DialogTitle>
        <DialogDescription>{dialogTitle}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 overflow-y-auto min-h-0">
        {/* Team Selection (hidden in team-fixed mode) */}
        {!fixedTeamId && (
          <div className="space-y-2">
            <Label>{copy(locale, 'Select team', 'Välj lag')}</Label>
            <TeamSelector
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
              placeholder={copy(locale, 'Select a team...', 'Välj ett lag...')}
            />
          </div>
        )}

        {/* Workout picker (when no workout was passed in) */}
        {needsWorkoutPicker && selectedTeamId && (
          <div className="space-y-2">
            <Label>{copy(locale, 'Workout', 'Pass')}</Label>
            <WorkoutPickerField
              value={pickedWorkout}
              onChange={setPickedWorkout}
              locale={locale}
              teamId={selectedTeamId}
            />
          </div>
        )}

        {/* Date Selection */}
        <div className="space-y-2">
          <Label htmlFor="assignedDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {copy(locale, 'Date', 'Datum')}
          </Label>
          <Input
            id="assignedDate"
            type="date"
            value={assignedDate}
            onChange={(e) => setAssignedDate(e.target.value)}
          />
          <RepeatWeeklyFields
            enabled={repeatEnabled}
            onEnabledChange={setRepeatEnabled}
            occurrences={occurrences}
            onOccurrencesChange={setOccurrences}
            baseDate={assignedDate ? new Date(assignedDate) : null}
          />
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {copy(locale, 'Location (optional)', 'Plats (valfritt)')}
          </Label>
          {locations.length > 0 && !useCustomLocation ? (
            <Select value={selectedLocationId || 'none'} onValueChange={(v) => {
              if (v === 'custom') {
                setUseCustomLocation(true)
                setSelectedLocationId('')
              } else if (v === 'none') {
                setSelectedLocationId('')
              } else {
                setSelectedLocationId(v)
                setCustomLocationName('')
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder={copy(locale, 'Select location...', 'Välj plats...')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{copy(locale, 'No location', 'Ingen plats')}</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
                <SelectItem value="custom">{copy(locale, 'Other location...', 'Annan plats...')}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder={copy(locale, 'Enter location (e.g. Track, Gym)', 'Ange plats (t.ex. Löparbanan, Gymmet)')}
                value={customLocationName}
                onChange={(e) => setCustomLocationName(e.target.value)}
              />
              {locations.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => { setUseCustomLocation(false); setCustomLocationName('') }}
                >
                  {copy(locale, 'Choose from list instead', 'Välj från lista istället')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Trainer Selection */}
        {trainers.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {copy(locale, 'Coach (optional)', 'Tränare (valfritt)')}
            </Label>
            <Select value={selectedTrainerId || 'none'} onValueChange={(v) => setSelectedTrainerId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder={copy(locale, 'Select coach...', 'Välj tränare...')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{copy(locale, 'No specific coach', 'Ingen specifik tränare')}</SelectItem>
                {trainers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Team Members */}
        {selectedTeamId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{copy(locale, 'Players', 'Spelare')}</Label>
              {team && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllMembers}>
                    {copy(locale, 'All', 'Alla')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllMembers}>
                    {copy(locale, 'None', 'Ingen')}
                  </Button>
                </div>
              )}
            </div>

            {team && positions.length > 0 && (
              <PositionQuickSelect
                positions={positions}
                allLabel={copy(locale, 'All', 'Alla')}
                onSelectAll={selectAllMembers}
                onSelectPosition={selectPosition}
              />
            )}

            {loadingTeam ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : team && team.members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {copy(locale, 'The team has no members.', 'Laget har inga medlemmar.')}
              </p>
            ) : team ? (
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-2">
                  {team.members.map((member) => {
                    const accountLess = !member.hasAthleteAccount
                    const blockedNames = blockedById[member.id]
                    const blocked = Boolean(blockedNames)
                    const disabled = accountLess || blocked
                    const included = isIncluded(member)
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                          disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : included
                              ? 'bg-primary/5 hover:bg-primary/10 cursor-pointer'
                              : 'hover:bg-muted/50 opacity-60 cursor-pointer'
                        }`}
                        onClick={() => toggleMemberExclusion(member)}
                      >
                        <Checkbox
                          checked={included}
                          disabled={disabled}
                          onCheckedChange={() => toggleMemberExclusion(member)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {member.name}
                            {member.position && (
                              <span className="text-xs text-muted-foreground">{member.position}</span>
                            )}
                          </div>
                          {accountLess ? (
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                              {copy(locale, 'No athlete account — invite first', 'Saknar konto — bjud in först')}
                            </div>
                          ) : blocked ? (
                            <div className="text-xs text-amber-600 dark:text-amber-400">
                              {copy(locale, 'Blocked by restriction', 'Blockerad av restriktion')}
                              {blockedNames.length > 0 ? `: ${blockedNames.join(', ')}` : ''}
                            </div>
                          ) : member.email ? (
                            <div className="text-xs text-muted-foreground">{member.email}</div>
                          ) : null}
                        </div>
                        {included && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : null}

            {team && (
              <div className="flex items-center gap-2">
                <Badge variant={selectedMemberCount > 0 ? 'default' : 'secondary'}>
                  {selectedMemberCount} {copy(locale, 'of', 'av')} {team.members.length} {copy(locale, 'players selected', 'spelare valda')}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Scheduling Section */}
        <Collapsible open={schedulingOpen} onOpenChange={setSchedulingOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {copy(locale, 'Schedule time (optional)', 'Schemalägg tid (valfritt)')}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${schedulingOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 pb-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <AppointmentSchedulingFields
                startTime={startTime}
                endTime={endTime}
                locationId={locationId}
                locationName={locationName}
                createCalendarEvent={createCalendarEvent}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
                onLocationIdChange={setLocationId}
                onLocationNameChange={setLocationName}
                onCreateCalendarEventChange={setCreateCalendarEvent}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">{copy(locale, 'Notes (optional)', 'Anteckningar (valfritt)')}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={copy(locale, 'Any instructions for the players...', 'Eventuella instruktioner till spelarna...')}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          {copy(locale, 'Cancel', 'Avbryt')}
        </Button>
        <Button
          onClick={handleAssign}
          disabled={loading || !selectedTeamId || selectedMemberCount === 0 || !effectiveWorkout}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {copy(locale, 'Assigning...', 'Tilldelar...')}
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              {copy(locale, 'Assign', 'Tilldela')} ({repeatEnabled ? `${selectedMemberCount}×${occurrences}` : selectedMemberCount})
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )

  // If controlled, render without trigger
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    )
  }

  // Uncontrolled with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  )
}
