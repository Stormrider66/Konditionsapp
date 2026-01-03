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

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { TeamSelector } from './TeamSelector'

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

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

  useEffect(() => {
    if (open) {
      // Reset form
      setSelectedTeamId('')
      setTeam(null)
      setExcludedMembers([])
      setAssignedDate(new Date().toISOString().split('T')[0])
      setNotes('')
    }
  }, [open])

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamDetails(selectedTeamId)
    } else {
      setTeam(null)
      setExcludedMembers([])
    }
  }, [selectedTeamId])

  async function fetchTeamDetails(teamId: string) {
    setLoadingTeam(true)
    try {
      const response = await fetch(`/api/teams/${teamId}`)
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
  }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutType,
          workoutId,
          assignedDate,
          notes: notes || undefined,
          excludeAthleteIds: excludedMembers.length > 0 ? excludedMembers : undefined,
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
        description: 'Ett oväntat fel intr\u00e4ffade.',
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
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tilldela till Lag
        </DialogTitle>
        <DialogDescription>
          Tilldela &quot;{workoutName}&quot; till ett helt lag.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Team Selection */}
        <div className="space-y-2">
          <Label>V\u00e4lj lag</Label>
          <TeamSelector
            value={selectedTeamId}
            onValueChange={setSelectedTeamId}
            placeholder="V\u00e4lj ett lag..."
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
