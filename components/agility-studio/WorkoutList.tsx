'use client'

// components/agility-studio/WorkoutList.tsx
// List of agility workouts with actions

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Users,
  Clock,
  Dumbbell,
  CalendarIcon,
  Printer,
  Zap,
  ChevronDown,
  CalendarPlus
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AppointmentSchedulingFields } from '@/components/coach/scheduling/AppointmentSchedulingFields'
import {
  RepeatWeeklyFields,
  computeWeeklyDates,
  DEFAULT_OCCURRENCES,
} from '@/components/coach/scheduling/RepeatWeeklyFields'
import { buildWorkoutPrintUrl, getCoachBasePath } from '@/components/workouts/print/PrintWorkoutButton'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AgilityWorkout } from '@/types'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'
import { visibleWorkoutTags } from '@/lib/workouts/business-tags'
import { PlanTeamWorkoutDialog } from '@/components/coach/team-calendar/PlanTeamWorkoutDialog'
import { WorkoutTeamYearBadges } from '@/components/workouts/WorkoutLibraryMetadataFields'

interface Athlete {
  id: string
  name: string
  email?: string | null
  teamId?: string | null
}

interface WorkoutListProps {
  workouts: AgilityWorkout[]
  athletes: Athlete[]
  searchQuery: string
  onEdit?: (workout: AgilityWorkout) => void
  onDelete: (workoutId: string) => void
  onDuplicate?: (workout: AgilityWorkout) => void
  businessId?: string
  teamNames: Map<string, string>
}

export function WorkoutList({
  workouts,
  athletes,
  searchQuery,
  onEdit,
  onDelete,
  onDuplicate,
  businessId,
  teamNames,
}: WorkoutListProps) {
  const t = useTranslations('agilityStudio')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<AgilityWorkout | null>(null)
  const [planningWorkout, setPlanningWorkout] = useState<AgilityWorkout | null>(null)
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [assignDate, setAssignDate] = useState<Date | undefined>(new Date())
  const [assignNotes, setAssignNotes] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Scheduling state
  const [schedulingOpen, setSchedulingOpen] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [locationId, setLocationId] = useState('')
  const [locationName, setLocationName] = useState('')
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true)

  // Multi-date / weekly repeat state
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [occurrences, setOccurrences] = useState(DEFAULT_OCCURRENCES)

  const filteredWorkouts = workouts.filter(workout => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      workout.name.toLowerCase().includes(query) ||
      workout.description?.toLowerCase().includes(query)
    )
  })

  const handleAssign = async () => {
    if (!selectedWorkout || selectedAthletes.length === 0 || !assignDate) return

    setIsAssigning(true)
    try {
      const dates = repeatEnabled
        ? computeWeeklyDates(assignDate, occurrences)
        : [assignDate]

      const responses = await Promise.all(
        dates.map((d) =>
          fetch(`/api/agility-workouts/${selectedWorkout.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...businessHeaders },
            body: JSON.stringify({
              athleteIds: selectedAthletes,
              assignedDate: format(d, 'yyyy-MM-dd'),
              notes: assignNotes || undefined,
              ...(startTime && {
                startTime,
                endTime: endTime || undefined,
                locationId: locationId || undefined,
                locationName: locationName || undefined,
                createCalendarEvent,
              }),
            })
          })
            .then(async (response) => ({
              ok: response.ok,
              body: await response.json().catch(() => ({})),
            }))
            .catch((error) => {
              console.error('Failed to assign on date:', d, error)
              return { ok: false, body: {} as Record<string, unknown> }
            })
        )
      )

      const successCount = responses.filter((r) => r.ok).length
      const failCount = responses.length - successCount

      if (successCount > 0) {
        const total = successCount * selectedAthletes.length
        const msg = dates.length > 1
          ? t('workout.assignMultiDateDescription', {
              athletes: selectedAthletes.length,
              dates: successCount,
              total,
            })
          : t('workout.assignSingleDateDescription', { athletes: selectedAthletes.length })

        if (failCount > 0) {
          toast.warning(t('workout.partiallyAssigned'), {
            description: `${msg} ${t('workout.failedDates', { count: failCount })}`,
          })
        } else {
          toast.success(dates.length > 1 ? t('workout.assignedMultiple') : t('workout.assignedSingle'), { description: msg })
        }

        setAssignDialogOpen(false)
        setSelectedAthletes([])
        setAssignNotes('')
        setSchedulingOpen(false)
        setStartTime('')
        setEndTime('')
        setLocationId('')
        setLocationName('')
        setCreateCalendarEvent(true)
        setRepeatEnabled(false)
        setOccurrences(DEFAULT_OCCURRENCES)
      } else {
        const firstError = (responses[0]?.body as { error?: string })?.error
        toast.error(firstError || t('workout.assignFailed'))
      }
    } catch (error) {
      console.error('Error assigning workout:', error)
      toast.error(tCommon('error'))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedWorkout) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/agility-workouts/${selectedWorkout.id}`, {
        method: 'DELETE',
        headers: businessHeaders,
      })

      if (!response.ok) throw new Error('Failed to delete workout')

      onDelete(selectedWorkout.id)
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting workout:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePrint = (workout: AgilityWorkout) => {
    window.open(
      buildWorkoutPrintUrl({
        coachBasePath: getCoachBasePath(window.location.pathname),
        kind: 'agility',
        workoutId: workout.id,
      }),
      '_blank',
      'noopener,noreferrer'
    )
  }

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    )
  }

  const selectAllAthletes = () => {
    if (selectedAthletes.length === athletes.length) {
      setSelectedAthletes([])
    } else {
      setSelectedAthletes(athletes.map(a => a.id))
    }
  }

  return (
    <div className="space-y-4">
      {filteredWorkouts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">{t('workout.noWorkouts')}</h3>
          <p>{t('workout.createFirst')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkouts.map(workout => {
            const visibleTags = visibleWorkoutTags(workout.tags)
            const teamName = workout.teamId ? teamNames.get(workout.teamId) ?? 'Lag' : null

            return (
            <Card key={workout.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="outline">{t(`workout.formats.${workout.format}`)}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(workout)}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('workout.edit')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => {
                        setSelectedWorkout(workout)
                        setAssignDialogOpen(true)
                      }}>
                        <Users className="h-4 w-4 mr-2" />
                        {t('workout.assign')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPlanningWorkout(workout)}>
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Planera i lagkalendern
                      </DropdownMenuItem>
                      {onDuplicate && (
                        <DropdownMenuItem onClick={() => onDuplicate(workout)}>
                          <Copy className="h-4 w-4 mr-2" />
                          {t('workout.duplicate')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handlePrint(workout)}>
                        <Printer className="h-4 w-4 mr-2" />
                        Skriv ut
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedWorkout(workout)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('workout.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-lg">{workout.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {workout.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {workout.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {workout.totalDuration && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {workout.totalDuration} min
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    <Dumbbell className="h-3 w-3 mr-1" />
                    {t('workout.drillsCount', { count: workout.drills?.length || 0 })}
                  </Badge>
                  {workout._count && (
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {t('workout.assignedCount', { count: workout._count.assignments })}
                    </Badge>
                  )}
                </div>
                {visibleTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {visibleTags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {visibleTags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{visibleTags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <WorkoutTeamYearBadges
                  teamName={teamName}
                  trainingYear={workout.trainingYear}
                  className="mt-3 flex flex-wrap gap-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setPlanningWorkout(workout)}
                >
                  <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                  Planera
                </Button>
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('workout.assignWorkout')}</DialogTitle>
            <DialogDescription>
              {t('workout.assignDescription', { name: selectedWorkout?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>{tCommon('date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !assignDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {assignDate ? format(assignDate, 'PPP') : t('workout.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={assignDate}
                    onSelect={setAssignDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <RepeatWeeklyFields
                enabled={repeatEnabled}
                onEnabledChange={setRepeatEnabled}
                occurrences={occurrences}
                onOccurrencesChange={setOccurrences}
                baseDate={assignDate ?? null}
                idSuffix="-agility-assign"
              />
            </div>

            {/* Athlete Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>{t('workout.athletes')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllAthletes}
                >
                  {selectedAthletes.length === athletes.length ? t('workout.selectNone') : t('workout.selectAll')}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                {athletes.map(athlete => (
                  <div key={athlete.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={athlete.id}
                      checked={selectedAthletes.includes(athlete.id)}
                      onCheckedChange={() => toggleAthleteSelection(athlete.id)}
                    />
                    <label
                      htmlFor={athlete.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {athlete.name}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('workout.selectedOf', { selected: selectedAthletes.length, total: athletes.length })}
              </p>
            </div>

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
                    {t('workout.scheduleTime')}
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
              <Label htmlFor="notes">{t('workout.notesOptional')}</Label>
              <Textarea
                id="notes"
                placeholder={t('workout.notesPlaceholder')}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedAthletes.length === 0 || !assignDate || isAssigning}
            >
              {isAssigning
                ? t('workout.assigning')
                : repeatEnabled
                  ? `${t('workout.assignCount', { count: selectedAthletes.length })} × ${occurrences}`
                  : t('workout.assignCount', { count: selectedAthletes.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('workout.deleteWorkout')}</DialogTitle>
            <DialogDescription>
              {t('workout.deleteConfirmMessage', { name: selectedWorkout?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t('workout.deleting') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanTeamWorkoutDialog
        key={planningWorkout?.id ?? 'agility-plan-dialog'}
        open={Boolean(planningWorkout)}
        onOpenChange={(open) => {
          if (!open) setPlanningWorkout(null)
        }}
        workoutType="AGILITY"
        workoutId={planningWorkout?.id ?? null}
        workoutName={planningWorkout?.name ?? ''}
        workoutDescription={planningWorkout?.description ?? null}
      />
    </div>
  )
}
