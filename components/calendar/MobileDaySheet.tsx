'use client'

/**
 * Mobile Day Sheet Component
 *
 * Bottom sheet that slides up on mobile to show day details.
 * Replaces the sidebar on mobile devices for better touch interaction.
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  X,
  Plus,
  Clock,
  MapPin,
  Activity,
  GripHorizontal,
  ChevronDown,
  Edit,
  Trash2,
  Move,
  Mountain,
  Thermometer,
} from 'lucide-react'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
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
} from './types'
import { PostEventMonitor } from './PostEventMonitor'
import { cn } from '@/lib/utils'

interface MobileDaySheetProps {
  date: Date | null
  items: UnifiedCalendarItem[]
  selectedItem: UnifiedCalendarItem | null
  isOpen: boolean
  onClose: () => void
  onItemClick: (item: UnifiedCalendarItem) => void
  onAddEvent: () => void
  onEditEvent: (item: UnifiedCalendarItem) => void
  onEventDeleted: () => void
  onMoveWorkout?: (item: UnifiedCalendarItem) => void
  isCoachView?: boolean
  variant?: 'default' | 'glass'
}

export function MobileDaySheet({
  date,
  items,
  selectedItem,
  isOpen,
  onClose,
  onItemClick,
  onAddEvent,
  onEditEvent,
  onEventDeleted,
  onMoveWorkout,
  isCoachView,
  variant = 'default',
}: MobileDaySheetProps) {
  const isGlass = variant === 'glass'
  const sheetRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startY = useRef(0)
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle backdrop touch to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  // Handle drag to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    // Only allow drag from handle area
    if (!target.closest('[data-drag-handle]')) return

    startY.current = e.touches[0].clientY
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return

      const currentY = e.touches[0].clientY
      const delta = currentY - startY.current

      // Only allow dragging down
      if (delta > 0) {
        setDragY(delta)
      }
    },
    [isDragging]
  )

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)

    // If dragged more than 100px, close the sheet
    if (dragY > 100) {
      onClose()
    }

    setDragY(0)
  }, [isDragging, dragY, onClose])

  // Handle delete
  const handleDelete = async (item: UnifiedCalendarItem) => {
    if (item.type !== 'CALENDAR_EVENT') return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/calendar-events/${item.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onEventDeleted()
      }
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !date) return null

  const workouts = items.filter((i) => i.type === 'WORKOUT')
  const races = items.filter((i) => i.type === 'RACE')
  const events = items.filter((i) => i.type === 'CALENDAR_EVENT')
  const fieldTests = items.filter((i) => i.type === 'FIELD_TEST')

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Detaljer för ${format(date, 'd MMMM', { locale: sv })}`}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 shadow-2xl transition-all duration-300 ease-out',
          isGlass
            ? 'bg-slate-950/90 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem]'
            : 'bg-background rounded-t-2xl shadow-xl',
          'max-h-[85vh] flex flex-col',
          isOpen && !isDragging ? 'translate-y-0' : '',
          !isOpen ? 'translate-y-full' : ''
        )}
        style={{
          transform: isDragging ? `translateY(${dragY}px)` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div
          data-drag-handle
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        >
          <div className={cn(
            "w-12 h-1.5 rounded-full transition-colors",
            isGlass ? "bg-white/10" : "bg-muted-foreground/30"
          )} />
        </div>

        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-6 pb-4 pt-1",
          isGlass ? "border-b border-white/5" : "border-b"
        )}>
          <div>
            <h2 className={cn(
              "text-2xl font-black capitalize tracking-tight",
              isGlass ? "text-white" : ""
            )}>
              {format(date, 'EEEE', { locale: sv })}
            </h2>
            <p className={cn(
              "text-sm font-bold uppercase tracking-widest opacity-50",
              isGlass ? "text-slate-400" : "text-muted-foreground"
            )}>
              {format(date, 'd MMMM yyyy', { locale: sv })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isGlass ? "ghost" : "default"}
              size="sm"
              onClick={onAddEvent}
              className={cn(
                "h-10 px-4 font-black text-xs uppercase tracking-widest",
                isGlass ? "bg-white/5 border border-white/10 text-white hover:bg-white/10" : ""
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              Lägg till
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={isGlass ? "text-slate-400 hover:text-white hover:bg-white/5" : ""}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                isGlass ? "bg-slate-500/10" : "bg-muted/50"
              )}>
                <Clock className={cn("h-8 w-8 opacity-20", isGlass ? "text-slate-400" : "")} />
              </div>
              <div className="space-y-1">
                <p className={cn("font-black text-lg", isGlass ? "text-white" : "")}>Inga händelser</p>
                <p className="text-sm text-muted-foreground">Välförtjänt vila eller dags att planera?</p>
              </div>
              <Button
                variant="outline"
                className={cn(
                  "mt-2 font-black text-xs uppercase tracking-widest rounded-full px-6",
                  isGlass ? "bg-white/5 border-white/10 text-slate-400 hover:text-white" : ""
                )}
                onClick={onAddEvent}
              >
                <Plus className="h-4 w-4 mr-2" />
                Planera dagen
              </Button>
            </div>
          ) : (
            <>
              {/* Workouts */}
              {workouts.length > 0 && (
                <Section title="Träningspass" count={workouts.length} isGlass={isGlass}>
                  {workouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      isSelected={selectedItem?.id === workout.id}
                      onClick={() => onItemClick(workout)}
                      onMove={onMoveWorkout ? () => onMoveWorkout(workout) : undefined}
                      isGlass={isGlass}
                    />
                  ))}
                </Section>
              )}

              {/* Races */}
              {races.length > 0 && (
                <Section title="Tävlingar" count={races.length} isGlass={isGlass}>
                  {races.map((race) => (
                    <RaceCard
                      key={race.id}
                      race={race}
                      isSelected={selectedItem?.id === race.id}
                      onClick={() => onItemClick(race)}
                      isGlass={isGlass}
                    />
                  ))}
                </Section>
              )}

              {/* Calendar Events */}
              {events.length > 0 && (
                <Section title="Händelser" count={events.length} isGlass={isGlass}>
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isSelected={selectedItem?.id === event.id}
                      onClick={() => onItemClick(event)}
                      onEdit={isCoachView ? () => onEditEvent(event) : undefined}
                      onDelete={() => handleDelete(event)}
                      isDeleting={isDeleting}
                      isGlass={isGlass}
                    />
                  ))}
                </Section>
              )}

              {/* Field Tests */}
              {fieldTests.length > 0 && (
                <Section title="Fälttester" count={fieldTests.length} isGlass={isGlass}>
                  {fieldTests.map((test) => (
                    <FieldTestCard
                      key={test.id}
                      test={test}
                      isSelected={selectedItem?.id === test.id}
                      onClick={() => onItemClick(test)}
                      isGlass={isGlass}
                    />
                  ))}
                </Section>
              )}

              {/* Post-Event Monitoring */}
              {selectedItem?.type === 'CALENDAR_EVENT' &&
                (selectedItem.metadata.eventType === 'ILLNESS' ||
                  selectedItem.metadata.eventType === 'ALTITUDE_CAMP') && (
                  <div className="mt-6">
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
                      variant={isGlass ? "glass" : "default"}
                    />
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Section component
interface SectionProps {
  title: string
  count: number
  children: React.ReactNode
  isGlass?: boolean
}

function Section({ title, count, children, isGlass = false }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-1">
        <h3 className={cn(
          "text-[10px] uppercase font-black tracking-widest",
          isGlass ? "text-slate-500" : "text-muted-foreground"
        )}>
          {title}
        </h3>
        <div className={cn(
          "h-px flex-1",
          isGlass ? "bg-white/5" : "bg-muted"
        )} />
        <Badge variant="secondary" className={cn(
          "text-[10px] font-bold px-1.5 h-4 min-w-4 flex items-center justify-center rounded-full",
          isGlass ? "bg-white/10 text-slate-400 border-none" : ""
        )}>
          {count}
        </Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// Workout card
interface WorkoutCardProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  onMove?: () => void
  isGlass?: boolean
}

function WorkoutCard({ workout, isSelected, onClick, onMove, isGlass = false }: WorkoutCardProps) {
  const workoutType = workout.metadata.workoutType as string
  const colorClass =
    WORKOUT_TYPE_COLORS[workoutType as keyof typeof WORKOUT_TYPE_COLORS] ||
    WORKOUT_TYPE_COLORS.DEFAULT

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border transition-all active:scale-[0.98] duration-300',
        isGlass
          ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
          : cn(
            colorClass.replace('bg-', 'bg-').replace('/20', '/10'),
            'border-l-4',
            colorClass.replace('bg-', 'border-l-').replace('/20', '-500')
          ),
        isSelected && (isGlass ? 'ring-1 ring-blue-500/50 bg-blue-500/5' : 'ring-2 ring-primary')
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-black text-base tracking-tight truncate",
            isGlass ? "text-white" : ""
          )}>{workout.title}</h4>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50",
            isGlass ? "text-slate-400" : "text-muted-foreground"
          )}>
            {workoutType?.replace(/_/g, ' ')}
          </p>
        </div>
        {onMove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 ml-2"
            onClick={(e) => {
              e.stopPropagation()
              onMove()
            }}
          >
            <Move className="h-4 w-4" />
          </Button>
        )}
      </div>

      {typeof workout.metadata.duration === 'number' && workout.metadata.duration > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{workout.metadata.duration} min</span>
        </div>
      )}

      {workout.description && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {workout.description}
        </p>
      )}
    </div>
  )
}

// Race card
interface RaceCardProps {
  race: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function RaceCard({ race, isSelected, onClick, isGlass = false }: RaceCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-2xl border transition-all active:scale-[0.98] duration-300',
        isGlass
          ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30"
          : 'border-l-4 border-l-red-500 bg-red-500/10',
        isSelected && (isGlass ? 'ring-1 ring-red-500/60 bg-red-500/10' : 'ring-2 ring-primary')
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-black text-base tracking-tight truncate",
            isGlass ? "text-white" : ""
          )}>{race.title}</h4>
          {typeof race.metadata.distance === 'string' && race.metadata.distance && (
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50",
              isGlass ? "text-slate-400" : "text-muted-foreground"
            )}>
              {race.metadata.distance}
            </p>
          )}
        </div>
        <Badge variant="destructive" className={cn(
          "text-[10px] uppercase font-bold tracking-tight rounded-md px-2",
          isGlass ? "bg-red-500/20 text-red-400 border-none" : ""
        )}>
          {typeof race.metadata.classification === 'string' ? race.metadata.classification : 'Tävling'}
        </Badge>
      </div>

      {typeof race.metadata.location === 'string' && race.metadata.location && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{race.metadata.location}</span>
        </div>
      )}
    </div>
  )
}

// Event card
interface EventCardProps {
  event: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  onEdit?: () => void
  onDelete: () => void
  isDeleting: boolean
  isGlass?: boolean
}

function EventCard({
  event,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  isDeleting,
  isGlass = false,
}: EventCardProps) {
  const eventType = event.metadata.eventType as string
  const config = EVENT_TYPE_CONFIG[eventType as keyof typeof EVENT_TYPE_CONFIG] || {
    label: 'Händelse',
    labelSv: 'Händelse',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '📅',
  }
  const impact = event.metadata.trainingImpact as string
  const impactConfig = IMPACT_CONFIG[impact as keyof typeof IMPACT_CONFIG]

  return (
    <div
      className={cn(
        'p-4 rounded-2xl border transition-all duration-300',
        isGlass
          ? "bg-white/5 border-white/10"
          : config.bgColor,
        isSelected && (isGlass ? 'ring-1 ring-purple-500/50 bg-purple-500/5' : 'ring-2 ring-primary')
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">{config.icon}</span>
            <h4 className="font-medium text-sm truncate">{event.title}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
            {config.labelSv}
          </p>
        </div>
        {impactConfig && (
          <Badge variant="outline" className={cn('text-xs shrink-0 ml-2', impactConfig.color)}>
            {impactConfig.label}
          </Badge>
        )}
      </div>

      {/* Altitude/Illness info */}
      {typeof event.metadata.altitude === 'number' && event.metadata.altitude > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground ml-6">
          <Mountain className="h-3 w-3" />
          <span>{event.metadata.altitude}m höjd</span>
        </div>
      )}

      {typeof event.metadata.illnessType === 'string' && event.metadata.illnessType && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground ml-6">
          <Thermometer className="h-3 w-3" />
          <span>{event.metadata.illnessType}</span>
        </div>
      )}

      {event.description && (
        <p className="text-xs text-muted-foreground mt-2 ml-6 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Actions */}
      {(onEdit || !event.metadata.isReadOnly) && (
        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Edit className="h-3 w-3 mr-1" />
              Redigera
            </Button>
          )}
          {!event.metadata.isReadOnly && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Ta bort
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ta bort händelse?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Detta kommer att permanent ta bort &quot;{event.title}&quot;.
                    Denna åtgärd kan inte ångras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Ta bort
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  )
}

// Field test card
interface FieldTestCardProps {
  test: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function FieldTestCard({ test, isSelected, onClick, isGlass = false }: FieldTestCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-2xl border transition-all active:scale-[0.98] duration-300',
        isGlass
          ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/30"
          : 'border-l-4 border-l-green-500 bg-green-500/10',
        isSelected && (isGlass ? 'ring-1 ring-green-500/50 bg-green-500/5' : 'ring-2 ring-primary')
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-green-600" />
        <h4 className="font-medium text-sm">{test.title}</h4>
      </div>
      {test.description && (
        <p className="text-xs text-muted-foreground mt-1 ml-6 line-clamp-2">
          {test.description}
        </p>
      )}
    </div>
  )
}
