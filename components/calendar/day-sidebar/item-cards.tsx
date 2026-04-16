'use client'

// Item cards extracted from DaySidebar.tsx (Phase 7k).
// Each card renders one calendar-item row in the sidebar list.

import { useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Clock,
  MapPin,
  Activity,
  Heart,
  Target,
  ExternalLink,
  Mountain,
  Thermometer,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Edit,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  Beaker,
} from 'lucide-react'
import {
  UnifiedCalendarItem,
  EVENT_TYPE_CONFIG,
  IMPACT_CONFIG,
  WORKOUT_TYPE_COLORS,
  INTENSITY_COLORS,
} from '../types'
import { cn } from '@/lib/utils'
import { formatDistanceValue, formatDurationMinutes, formatWorkoutTypeLabel, formatIntensityLabel, formatFieldTestType, formatAdHocInputType, formatAdHocTypeLabel, formatRaceDistanceLabel } from './formatters'

export interface WODItemProps {
  wod: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function WODItem({ wod, isSelected, onClick, isGlass = false }: WODItemProps) {
  const meta = wod.metadata
  const isCompleted = meta.isCompleted as boolean
  const mode = meta.mode as string
  const modeLabels: Record<string, string> = {
    STRUCTURED: 'Strukturerat',
    CASUAL: 'Avslappnat',
    FUN: 'Bara kul!',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg p-3 transition-all',
        isGlass
          ? cn(
              'border border-white/10 hover:bg-white/5',
              isSelected && 'bg-white/10 border-emerald-500/30'
            )
          : cn(
              'border hover:shadow-sm',
              isSelected && 'ring-2 ring-emerald-500/50'
            )
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              'font-medium text-sm truncate',
              isGlass ? 'text-white' : ''
            )}>
              {wod.title}
            </span>
            {isCompleted && (
              <Badge variant="default" className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                Klar
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-3 w-3" />
              AI-Pass
            </span>
            <span>{modeLabels[mode] || mode}</span>
            {typeof meta.requestedDuration === 'number' && meta.requestedDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(typeof meta.actualDuration === 'number' ? meta.actualDuration : meta.requestedDuration)} min
              </span>
            )}
          </div>
        </div>
        <ChevronRight className={cn(
          'h-4 w-4 shrink-0 mt-1',
          isGlass ? 'text-slate-500' : 'text-muted-foreground'
        )} />
      </div>
    </button>
  )
}

// ── Workout Item ──────────────────────────────────────────────────────────

export interface WorkoutItemProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function WorkoutItem({ workout, isSelected, onClick, isGlass = false }: WorkoutItemProps) {
  const meta = workout.metadata
  const workoutType = (meta.workoutType as string) || 'OTHER'
  const intensity = (meta.intensity as string) || 'MODERATE'
  const isCompleted = meta.isCompleted as boolean

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
          : isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent',
        isSelected && isGlass && "ring-1 ring-blue-500/50 bg-blue-500/5"
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

export interface RaceItemProps {
  race: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function RaceItem({ race, isSelected, onClick, isGlass = false }: RaceItemProps) {
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
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30"
          : 'border-red-200 bg-red-50 dark:bg-red-950/20',
        isSelected
          ? (isGlass ? 'ring-1 ring-red-500/60 bg-red-500/10' : 'ring-2 ring-primary')
          : ''
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

export interface CalendarEventItemProps {
  event: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  onEdit: () => void
  onDeleted: () => void
  isGlass?: boolean
}

export function CalendarEventItem({
  event,
  isSelected,
  onClick,
  onEdit,
  onDeleted,
  isGlass = false,
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
        'p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-white/5 border-white/10"
          : (config?.bgColor || 'bg-gray-100'),
        isSelected && (isGlass ? 'ring-1 ring-purple-500/50 bg-purple-500/5' : 'ring-2 ring-primary')
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

      {!isReadOnly && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
          <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1" />
            Redigera
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs uppercase font-bold text-red-400 hover:text-red-300">
                <Trash2 className="h-3 w-3 mr-1" />
                Ta bort
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={isGlass ? "bg-slate-900 border-white/10" : ""}>
              <AlertDialogHeader>
                <AlertDialogTitle className={isGlass ? "text-white font-black" : ""}>Ta bort händelse?</AlertDialogTitle>
                <AlertDialogDescription className={isGlass ? "text-slate-400" : ""}>
                  Är du säker på att du vill ta bort &quot;{event.title}&quot;? Detta kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className={isGlass ? "bg-white/5 border-white/10 text-slate-300" : ""}>Avbryt</AlertDialogCancel>
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
        <div className="text-[10px] font-medium text-slate-500 mt-2 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          Importerad från {String(meta.externalCalendarName || 'extern kalender')}
        </div>
      )}
    </div>
  )
}

export interface FieldTestItemProps {
  test: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function FieldTestItem({ test, isSelected, onClick, isGlass = false }: FieldTestItemProps) {
  const meta = test.metadata
  const testType = (meta.testType as string) || ''
  const isValidated = meta.validatedByCoach as boolean

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/30"
          : 'border-green-200 bg-green-50 dark:bg-green-950/20',
        isSelected && (isGlass ? 'ring-1 ring-green-500/50 bg-green-500/5' : 'ring-2 ring-primary')
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

export interface CheckInItemProps {
  checkIn: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function CheckInItem({ checkIn, isSelected, onClick, isGlass = false }: CheckInItemProps) {
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
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
          : isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent',
        isSelected && isGlass && 'ring-1 ring-slate-500/50 bg-slate-500/5'
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

export interface AdHocItemProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

export function AdHocItem({ workout, isSelected, onClick, isGlass = false }: AdHocItemProps) {
  const meta = workout.metadata
  const intensity = (meta.intensity as string) || 'MODERATE'
  const distance = formatDistanceValue(meta.distance)

  return (
    <button
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-300',
        isGlass
          ? 'bg-teal-500/5 border-teal-500/20 hover:bg-teal-500/10 hover:border-teal-500/30'
          : 'border-teal-200 bg-teal-50 dark:bg-teal-950/20',
        isSelected
          ? (isGlass ? 'ring-1 ring-teal-500/60 bg-teal-500/10' : 'ring-2 ring-primary')
          : ''
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{workout.title}</span>
            <Badge variant="secondary" className="text-xs">
              ✓
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {typeof meta.duration === 'number' && meta.duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {meta.duration} min
              </span>
            )}
            {distance.label && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {distance.label}
              </span>
            )}
          </div>
        </div>
        <Badge
          className={cn(
            'text-xs shrink-0',
            INTENSITY_COLORS[intensity] || 'bg-yellow-500',
            'text-white'
          )}
        >
          {formatIntensityLabel(intensity)}
        </Badge>
      </div>
    </button>
  )
}
