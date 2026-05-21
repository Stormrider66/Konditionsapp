'use client'

/**
 * Team Workout Assignment Dialog
 *
 * Dialog for bulk assigning workouts to entire teams:
 * - Select team from dropdown
 * - Auto-selects all team members
 * - Optional member exclusion
 * - Scheduled date selection
 * - Optional notes
 */

import { useCallback, useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
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
import { AppointmentSchedulingFields } from '@/components/coach/scheduling/AppointmentSchedulingFields'
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
}

interface Team {
  id: string
  name: string
  members: TeamMember[]
}

interface TeamWorkoutAssignmentDialogProps {
  workoutType: 'strength' | 'cardio' | 'hybrid'
  workoutId: string
  workoutName: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAssigned?: () => void
}

export function TeamWorkoutAssignmentDialog({
  workoutType,
  workoutId,
  workoutName,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onAssigned,
}: TeamWorkoutAssignmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [team, setTeam] = useState<Team | null>(null)
  const [excludedMembers, setExcludedMembers] = useState<string[]>([])
  const [assignedDate, setAssignedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTeam, setLoadingTeam] = useState(false)

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
      const response = await fetch('/api/locations', {
        headers: businessHeaders,
      })
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
      const response = await fetch('/api/trainers', {
        headers: businessHeaders,
      })
      if (response.ok) {
        const data = await response.json()
        setTrainers(data.trainers || [])
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error)
    }
  }, [businessHeaders])

  const fetchTeamDetails = useCallback(async (teamId: string) => {
    setLoadingTeam(true)
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        headers: businessHeaders,
      })
      if (response.ok) {
        const data = await response.json()
        setTeam(data.data)
        setExcludedMembers([]) // Reset exclusions when team changes
      }
    } catch (error) {
      console.error('Failed to fetch team:', error)
    } finally {
      setLoadingTeam(false)
    }
  }, [businessHeaders])

  useEffect(() => {
    if (open) {
      void fetchLocations()
      void fetchTrainers()
      // Reset form
      setSelectedTeamId('')
      setTeam(null)
      setExcludedMembers([])
      setAssignedDate(new Date().toISOString().split('T')[0])
      setNotes('')
      // Reset location & trainer
      setSelectedLocationId('')
      setCustomLocationName('')
      setUseCustomLocation(false)
      setSelectedTrainerId('')
      // Reset scheduling
      setSchedulingOpen(false)
      setStartTime('')
      setEndTime('')
      setLocationId('')
      setLocationName('')
      setCreateCalendarEvent(true)
    }
  }, [fetchLocations, fetchTrainers, open])

  useEffect(() => {
    if (selectedTeamId) {
      void fetchTeamDetails(selectedTeamId)
    } else {
      setTeam(null)
      setExcludedMembers([])
    }
  }, [fetchTeamDetails, selectedTeamId])

  function toggleMemberExclusion(memberId: string) {
    setExcludedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  function selectAllMembers() {
    setExcludedMembers([])
  }

  function deselectAllMembers() {
    if (team) {
      setExcludedMembers(team.members.map((m) => m.id))
    }
  }

  const selectedMemberCount = team
    ? team.members.length - excludedMembers.length
    : 0

  async function handleAssign() {
    if (!selectedTeamId || selectedMemberCount === 0) return

    setLoading(true)
    try {
      const response = await fetch(`/api/teams/${selectedTeamId}/assign-workout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(businessHeaders ?? {}) },
        body: JSON.stringify({
          workoutType,
          workoutId,
          assignedDate,
          notes: notes || undefined,
          excludeAthleteIds: excludedMembers.length > 0 ? excludedMembers : undefined,
          locationId: selectedLocationId || undefined,
          locationName: customLocationName || undefined,
          responsibleCoachId: selectedTrainerId || undefined,
          // Include scheduling fields if time is set
          ...(startTime && {
            startTime,
            endTime: endTime || undefined,
            locationId: locationId || undefined,
            locationName: locationName || undefined,
            createCalendarEvent,
          }),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Lagpass tilldelat!', {
          description: `${workoutName} tilldelat till ${result.data.assignmentCount} spelare i ${result.data.teamName}.`,
        })
        setOpen(false)
        onAssigned?.()
      } else {
        const data = await response.json()
        toast.error('Tilldelning misslyckades', {
          description: data.error || 'Kunde inte tilldela passet till laget.',
        })
      }
    } catch (error) {
      console.error('Failed to assign workout to team:', error)
      toast.error('Tilldelning misslyckades', {
        description: 'Ett oväntat fel inträffade.',
      })
    } finally {
      setLoading(false)
    }
  }

  const workoutTypeLabel =
    workoutType === 'strength'
      ? 'Styrkepass'
      : workoutType === 'cardio'
        ? 'Konditionspass'
        : 'Hybridpass'

  const dialogContent = (
    <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tilldela till Lag
        </DialogTitle>
        <DialogDescription>
          Tilldela &quot;{workoutName}&quot; till ett helt lag.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 overflow-y-auto min-h-0">
        {/* Team Selection */}
        <div className="space-y-2">
          <Label>Välj lag</Label>
          <TeamSelector
            value={selectedTeamId}
            onValueChange={setSelectedTeamId}
            placeholder="Välj ett lag..."
          />
        </div>

        {/* Date Selection */}
        <div className="space-y-2">
          <Label htmlFor="assignedDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Datum
          </Label>
          <Input
            id="assignedDate"
            type="date"
            value={assignedDate}
            onChange={(e) => setAssignedDate(e.target.value)}
          />
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Plats (valfritt)
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
                <SelectValue placeholder="Välj plats..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen plats</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
                <SelectItem value="custom">Annan plats...</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-1">
              <Input
                placeholder="Ange plats (t.ex. Löparbanan, Gymmet)"
                value={customLocationName}
                onChange={(e) => setCustomLocationName(e.target.value)}
              />
              {locations.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => { setUseCustomLocation(false); setCustomLocationName('') }}
                >
                  Välj från lista istället
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
              Tränare (valfritt)
            </Label>
            <Select value={selectedTrainerId || 'none'} onValueChange={(v) => setSelectedTrainerId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Välj tränare..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen specifik tränare</SelectItem>
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
              <Label>Spelare</Label>
              {team && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllMembers}
                    disabled={excludedMembers.length === 0}
                  >
                    Alla
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllMembers}
                    disabled={excludedMembers.length === team.members.length}
                  >
                    Ingen
                  </Button>
                </div>
              )}
            </div>

            {loadingTeam ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : team && team.members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Laget har inga medlemmar.
              </p>
            ) : team ? (
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-2">
                  {team.members.map((member) => {
                    const isIncluded = !excludedMembers.includes(member.id)
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                          isIncluded
                            ? 'bg-primary/5 hover:bg-primary/10'
                            : 'hover:bg-muted/50 opacity-60'
                        }`}
                        onClick={() => toggleMemberExclusion(member.id)}
                      >
                        <Checkbox
                          checked={isIncluded}
                          onCheckedChange={() => toggleMemberExclusion(member.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{member.name}</div>
                          {member.email && (
                            <div className="text-xs text-muted-foreground">
                              {member.email}
                            </div>
                          )}
                        </div>
                        {isIncluded && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : null}

            {team && (
              <div className="flex items-center gap-2">
                <Badge variant={selectedMemberCount > 0 ? 'default' : 'secondary'}>
                  {selectedMemberCount} av {team.members.length} spelare valda
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
                Schemalägg tid (valfritt)
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
          <Label htmlFor="notes">Anteckningar (valfritt)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Eventuella instruktioner till spelarna..."
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
        <Button
          onClick={handleAssign}
          disabled={loading || !selectedTeamId || selectedMemberCount === 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Tilldelar...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Tilldela ({selectedMemberCount})
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
