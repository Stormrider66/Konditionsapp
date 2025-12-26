'use client'

/**
 * Day Sidebar Component
 *
 * Shows details for the selected day including all events, workouts, etc.
 */

import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  Plus,
  Clock,
  MapPin,
  Activity,
  Heart,
  Target,
  Edit,
  Trash2,
  ExternalLink,
  ChevronRight,
  Mountain,
  Thermometer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  UnifiedCalendarItem,
  EVENT_TYPE_CONFIG,
  IMPACT_CONFIG,
  WORKOUT_TYPE_COLORS,
  INTENSITY_COLORS,
} from './types'
import { PostEventMonitor } from './PostEventMonitor'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface DaySidebarProps {
  clientId: string
  date: Date | null
  items: UnifiedCalendarItem[]
  selectedItem: UnifiedCalendarItem | null
  onItemClick: (item: UnifiedCalendarItem) => void
  onAddEvent: () => void
  onEditEvent: (item: UnifiedCalendarItem) => void
  onEventDeleted: () => void
  isCoachView?: boolean
}

export function DaySidebar({
  date,
  items,
  selectedItem,
  onItemClick,
  onAddEvent,
  onEditEvent,
  onEventDeleted,
  isCoachView,
}: DaySidebarProps) {
  if (!date) {
    return (
      <Card className="w-full lg:w-80 shrink-0">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>Klicka på en dag för att se detaljer</p>
        </CardContent>
      </Card>
    )
  }

  const workouts = items.filter((i) => i.type === 'WORKOUT')
  const races = items.filter((i) => i.type === 'RACE')
  const events = items.filter((i) => i.type === 'CALENDAR_EVENT')
  const fieldTests = items.filter((i) => i.type === 'FIELD_TEST')
  const checkIns = items.filter((i) => i.type === 'CHECK_IN')

  return (
    <Card className="w-full lg:w-80 shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">
            {format(date, 'EEEE d MMMM', { locale: sv })}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onAddEvent}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Inga händelser denna dag
          </p>
        ) : (
          <>
            {/* Workouts */}
            {workouts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  Pass ({workouts.length})
                </h4>
                <div className="space-y-2">
                  {workouts.map((workout) => (
                    <WorkoutItem
                      key={workout.id}
                      workout={workout}
                      isSelected={selectedItem?.id === workout.id}
                      onClick={() => onItemClick(workout)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Races */}
            {races.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  Tävlingar
                </h4>
                <div className="space-y-2">
                  {races.map((race) => (
                    <RaceItem
                      key={race.id}
                      race={race}
                      isSelected={selectedItem?.id === race.id}
                      onClick={() => onItemClick(race)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Events */}
            {events.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  Händelser
                </h4>
                <div className="space-y-2">
                  {events.map((event) => (
                    <CalendarEventItem
                      key={event.id}
                      event={event}
                      isSelected={selectedItem?.id === event.id}
                      onClick={() => onItemClick(event)}
                      onEdit={() => onEditEvent(event)}
                      onDeleted={onEventDeleted}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Field Tests */}
            {fieldTests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-500" />
                  Fälttest
                </h4>
                <div className="space-y-2">
                  {fieldTests.map((test) => (
                    <FieldTestItem
                      key={test.id}
                      test={test}
                      isSelected={selectedItem?.id === test.id}
                      onClick={() => onItemClick(test)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Check-ins */}
            {checkIns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-gray-500" />
                  Daglig avstämning
                </h4>
                <div className="space-y-2">
                  {checkIns.map((checkIn) => (
                    <CheckInItem
                      key={checkIn.id}
                      checkIn={checkIn}
                      isSelected={selectedItem?.id === checkIn.id}
                      onClick={() => onItemClick(checkIn)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Post-Event Monitoring for Illness/Altitude Camp */}
            {selectedItem?.type === 'CALENDAR_EVENT' &&
              (selectedItem.metadata.eventType === 'ILLNESS' ||
                selectedItem.metadata.eventType === 'ALTITUDE_CAMP') && (
              <div className="mt-4">
                <PostEventMonitor
                  eventType={selectedItem.metadata.eventType as 'ILLNESS' | 'ALTITUDE_CAMP'}
                  eventData={{
                    startDate: new Date(selectedItem.date),
                    endDate: selectedItem.endDate ? new Date(selectedItem.endDate) : new Date(selectedItem.date),
                    illnessType: selectedItem.metadata.illnessType as string | undefined,
                    hadFever: selectedItem.metadata.hadFever as boolean | undefined,
                    feverDays: selectedItem.metadata.feverDays as number | undefined,
                    symptomsBelowNeck: selectedItem.metadata.symptomsBelowNeck as boolean | undefined,
                    medicalClearance: selectedItem.metadata.medicalClearance as boolean | undefined,
                    returnToTrainingDate: selectedItem.metadata.returnToTrainingDate
                      ? new Date(selectedItem.metadata.returnToTrainingDate as string)
                      : undefined,
                    altitude: selectedItem.metadata.altitude as number | undefined,
                  }}
                />
              </div>
            )}
          </>
        )}

        <Separator />

        <Button variant="outline" className="w-full" onClick={onAddEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Lägg till händelse
        </Button>
      </CardContent>
    </Card>
  )
}

// Sub-components for different item types

interface WorkoutItemProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
}

function WorkoutItem({ workout, isSelected, onClick }: WorkoutItemProps) {
  const meta = workout.metadata
  const workoutType = (meta.workoutType as string) || 'OTHER'
  const intensity = (meta.intensity as string) || 'MODERATE'
  const isCompleted = meta.isCompleted as boolean

  return (
    <button
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                WORKOUT_TYPE_COLORS[workoutType] || 'bg-blue-500'
              )}
            />
            <span className="font-medium text-sm truncate">{workout.title}</span>
            {isCompleted && (
              <Badge variant="secondary" className="text-xs">
                ✓
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {typeof meta.duration === 'number' && meta.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {meta.duration} min
              </span>
            )}
            {typeof meta.distance === 'number' && meta.distance > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {meta.distance} km
              </span>
            )}
          </div>
        </div>
        <Badge
          className={cn(
            'text-xs shrink-0',
            INTENSITY_COLORS[intensity]?.replace('bg-', 'bg-') || 'bg-yellow-500',
            'text-white'
          )}
        >
          {intensity.charAt(0) + intensity.slice(1).toLowerCase()}
        </Badge>
      </div>
    </button>
  )
}

interface RaceItemProps {
  race: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
}

function RaceItem({ race, isSelected, onClick }: RaceItemProps) {
  const meta = race.metadata
  const classification = meta.classification as string
  const isCompleted = meta.isCompleted as boolean

  const classificationColors: Record<string, string> = {
    A: 'bg-red-500 text-white',
    B: 'bg-orange-500 text-white',
    C: 'bg-blue-500 text-white',
  }

  return (
    <button
      className={cn(
        'w-full text-left p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 transition-colors',
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-red-100 dark:hover:bg-red-950/40'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{race.title}</span>
            <Badge className={cn('text-xs', classificationColors[classification] || 'bg-gray-500')}>
              {classification}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {meta.distance ? String(meta.distance) : ''}
            {typeof meta.targetTime === 'string' && meta.targetTime && ` • Mål: ${meta.targetTime}`}
            {isCompleted && typeof meta.actualTime === 'string' && meta.actualTime && ` • Tid: ${meta.actualTime}`}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  )
}

interface CalendarEventItemProps {
  event: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  onEdit: () => void
  onDeleted: () => void
}

function CalendarEventItem({
  event,
  isSelected,
  onClick,
  onEdit,
  onDeleted,
}: CalendarEventItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const meta = event.metadata
  const eventType = (meta.eventType as string) || 'EXTERNAL_EVENT'
  const trainingImpact = (meta.trainingImpact as string) || 'NORMAL'
  const isReadOnly = meta.isReadOnly as boolean
  const config = EVENT_TYPE_CONFIG[eventType as keyof typeof EVENT_TYPE_CONFIG]
  const impactConfig = IMPACT_CONFIG[trainingImpact as keyof typeof IMPACT_CONFIG]

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/calendar-events/${event.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onDeleted()
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        config?.bgColor || 'bg-gray-100',
        isSelected ? 'ring-2 ring-primary' : ''
      )}
    >
      <button className="w-full text-left" onClick={onClick}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span>{config?.icon}</span>
              <span className={cn('font-medium text-sm truncate', config?.color)}>
                {event.title}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={cn('text-xs', impactConfig?.color)}
              >
                {impactConfig?.labelSv}
              </Badge>
              {eventType === 'ALTITUDE_CAMP' && typeof meta.altitude === 'number' && meta.altitude > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  {meta.altitude}m
                </span>
              )}
            </div>
            {event.endDate && event.endDate !== event.date && (
              <div className="text-xs text-muted-foreground mt-1">
                Till: {format(new Date(event.endDate as string), 'd MMM', { locale: sv })}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t">
          <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1" />
            Redigera
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-red-600 hover:text-red-700">
                <Trash2 className="h-3 w-3 mr-1" />
                Ta bort
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort händelse?</AlertDialogTitle>
                <AlertDialogDescription>
                  Är du säker på att du vill ta bort &quot;{event.title}&quot;? Detta kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Tar bort...' : 'Ta bort'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {isReadOnly && (
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Importerad från {String(meta.externalCalendarName || 'extern kalender')}
        </div>
      )}
    </div>
  )
}

interface FieldTestItemProps {
  test: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
}

function FieldTestItem({ test, isSelected, onClick }: FieldTestItemProps) {
  const meta = test.metadata
  const testType = (meta.testType as string) || ''
  const isValidated = meta.validatedByCoach as boolean

  return (
    <button
      className={cn(
        'w-full text-left p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 transition-colors',
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-green-100 dark:hover:bg-green-950/40'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{test.title}</span>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {testType.replace(/_/g, ' ')}
            </Badge>
            {isValidated ? (
              <Badge className="text-xs bg-green-500">Validerad</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Väntar validering
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

interface CheckInItemProps {
  checkIn: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
}

function CheckInItem({ checkIn, isSelected, onClick }: CheckInItemProps) {
  const meta = checkIn.metadata
  const readinessScore = meta.readinessScore as number | undefined
  const readinessDecision = meta.readinessDecision as string | undefined

  const decisionColors: Record<string, string> = {
    PROCEED: 'bg-green-500',
    REDUCE: 'bg-yellow-500',
    EASY: 'bg-orange-500',
    REST: 'bg-red-500',
  }

  return (
    <button
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors',
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-medium text-sm">Daglig avstämning</span>
          <div className="flex items-center gap-2 mt-1">
            {readinessScore !== undefined && (
              <span className="text-xs text-muted-foreground">
                Beredskap: {readinessScore}%
              </span>
            )}
          </div>
        </div>
        {readinessDecision && (
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              decisionColors[readinessDecision] || 'bg-gray-500'
            )}
          />
        )}
      </div>
    </button>
  )
}
