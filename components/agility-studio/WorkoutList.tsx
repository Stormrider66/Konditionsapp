'use client'

// components/agility-studio/WorkoutList.tsx
// List of agility workouts with actions

import { useState } from 'react'
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
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AgilityWorkout } from '@/types'

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
  onEdit: (workout: AgilityWorkout) => void
  onDelete: (workoutId: string) => void
  onDuplicate: (workout: AgilityWorkout) => void
}

export function WorkoutList({
  workouts,
  athletes,
  searchQuery,
  onEdit,
  onDelete,
  onDuplicate
}: WorkoutListProps) {
  const t = useTranslations('agilityStudio')
  const tCommon = useTranslations('common')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<AgilityWorkout | null>(null)
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [assignDate, setAssignDate] = useState<Date | undefined>(new Date())
  const [assignNotes, setAssignNotes] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
      const response = await fetch(`/api/agility-workouts/${selectedWorkout.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteIds: selectedAthletes,
          assignedDate: format(assignDate, 'yyyy-MM-dd'),
          notes: assignNotes || undefined
        })
      })

      if (!response.ok) throw new Error('Failed to assign workout')

      setAssignDialogOpen(false)
      setSelectedAthletes([])
      setAssignNotes('')
    } catch (error) {
      console.error('Error assigning workout:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedWorkout) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/agility-workouts/${selectedWorkout.id}`, {
        method: 'DELETE'
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
          {filteredWorkouts.map(workout => (
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
                      <DropdownMenuItem onClick={() => onEdit(workout)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('workout.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedWorkout(workout)
                        setAssignDialogOpen(true)
                      }}>
                        <Users className="h-4 w-4 mr-2" />
                        {t('workout.assign')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(workout)}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('workout.duplicate')}
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
                {workout.tags && workout.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {workout.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {workout.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{workout.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
          <div className="space-y-4 py-4">
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
              {isAssigning ? t('workout.assigning') : t('workout.assignCount', { count: selectedAthletes.length })}
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
    </div>
  )
}
