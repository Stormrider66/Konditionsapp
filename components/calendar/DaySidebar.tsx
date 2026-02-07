// components/calendar/DaySidebar.tsx
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
  Sparkles,
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
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'

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
  variant?: 'default' | 'glass'
}

export function DaySidebar({
  clientId,
  date,
  items,
  selectedItem,
  onItemClick,
  onAddEvent,
  onEditEvent,
  onEventDeleted,
  isCoachView,
  variant = 'default',
}: DaySidebarProps) {
  const isGlass = variant === 'glass'

  if (!date) {
    if (isGlass) {
      return (
        <GlassCard className="w-full lg:w-80 shrink-0">
          <GlassCardContent className="p-12 text-center text-slate-500 font-medium h-[250px] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center">
              <ChevronRight className="h-6 w-6 text-slate-500 opacity-50" />
            </div>
            <p className="text-sm">Välj en dag i kalendern för att se detaljer</p>
          </GlassCardContent>
        </GlassCard>
      )
    }
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
  const wods = items.filter((i) => i.type === 'WOD')

  if (isGlass) {
    return (
      <GlassCard className="w-full lg:w-80 shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto">
        <GlassCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <GlassCardTitle className="text-xl font-black capitalize text-white tracking-tight">
              {format(date, 'EEEE d MMMM', { locale: sv })}
            </GlassCardTitle>
            <Button variant="ghost" size="icon" onClick={onAddEvent} className="hover:bg-white/10 text-slate-400">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </GlassCardHeader>

        <GlassCardContent className="space-y-6 pt-2">
          {items.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-slate-500 gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-500/5 flex items-center justify-center">
                <Clock className="h-5 w-5 opacity-20" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50">
                Inga händelser
              </p>
            </div>
          ) : (
            <>
              {workouts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Pass ({workouts.length})
                  </h4>
                  <div className="space-y-2.5">
                    {workouts.map((workout) => (
                      <WorkoutItem
                        key={workout.id}
                        workout={workout}
                        isSelected={selectedItem?.id === workout.id}
                        onClick={() => onItemClick(workout)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {wods.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    AI-Pass ({wods.length})
                  </h4>
                  <div className="space-y-2.5">
                    {wods.map((wod) => (
                      <WODItem
                        key={wod.id}
                        wod={wod}
                        isSelected={selectedItem?.id === wod.id}
                        onClick={() => onItemClick(wod)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {races.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" />
                    Tävlingar
                  </h4>
                  <div className="space-y-2.5">
                    {races.map((race) => (
                      <RaceItem
                        key={race.id}
                        race={race}
                        isSelected={selectedItem?.id === race.id}
                        onClick={() => onItemClick(race)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {events.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    Händelser
                  </h4>
                  <div className="space-y-2.5">
                    {events.map((event) => (
                      <CalendarEventItem
                        key={event.id}
                        event={event}
                        isSelected={selectedItem?.id === event.id}
                        onClick={() => onItemClick(event)}
                        onEdit={() => onEditEvent(event)}
                        onDeleted={onEventDeleted}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {fieldTests.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-green-500" />
                    Fälttest
                  </h4>
                  <div className="space-y-2.5">
                    {fieldTests.map((test) => (
                      <FieldTestItem
                        key={test.id}
                        test={test}
                        isSelected={selectedItem?.id === test.id}
                        onClick={() => onItemClick(test)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {checkIns.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    Daglig avstämning
                  </h4>
                  <div className="space-y-2.5">
                    {checkIns.map((checkIn) => (
                      <CheckInItem
                        key={checkIn.id}
                        checkIn={checkIn}
                        isSelected={selectedItem?.id === checkIn.id}
                        onClick={() => onItemClick(checkIn)}
                        isGlass={true}
                      />
                    ))}
                  </div>
                </div>
              )}

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
                      variant="glass"
                    />
                  </div>
                )}

              {selectedItem?.type === 'WORKOUT' && (
                <WorkoutDetailPanel
                  workout={selectedItem}
                  isCoachView={isCoachView}
                  isGlass={true}
                />
              )}
            </>
          )}

          <div className="pt-4 mt-6 border-t border-white/5">
            <Button
              variant="ghost"
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all h-10"
              onClick={onAddEvent}
            >
              <Plus className="h-4 w-4 mr-2" />
              Lägg till händelse
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    )
  }

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

            {wods.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  AI-Pass ({wods.length})
                </h4>
                <div className="space-y-2">
                  {wods.map((wod) => (
                    <WODItem
                      key={wod.id}
                      wod={wod}
                      isSelected={selectedItem?.id === wod.id}
                      onClick={() => onItemClick(wod)}
                    />
                  ))}
                </div>
              </div>
            )}

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

            {selectedItem?.type === 'WORKOUT' && (
              <WorkoutDetailPanel
                workout={selectedItem}
                isCoachView={isCoachView}
              />
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

// ── WOD Item ──────────────────────────────────────────────────────────────

interface WODItemProps {
  wod: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function WODItem({ wod, isSelected, onClick, isGlass = false }: WODItemProps) {
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
            {meta.requestedDuration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {meta.actualDuration || meta.requestedDuration} min
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

interface WorkoutItemProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function WorkoutItem({ workout, isSelected, onClick, isGlass = false }: WorkoutItemProps) {
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

interface RaceItemProps {
  race: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function RaceItem({ race, isSelected, onClick, isGlass = false }: RaceItemProps) {
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

interface CalendarEventItemProps {
  event: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  onEdit: () => void
  onDeleted: () => void
  isGlass?: boolean
}

function CalendarEventItem({
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

interface FieldTestItemProps {
  test: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function FieldTestItem({ test, isSelected, onClick, isGlass = false }: FieldTestItemProps) {
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

interface CheckInItemProps {
  checkIn: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function CheckInItem({ checkIn, isSelected, onClick, isGlass = false }: CheckInItemProps) {
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

interface WorkoutDetailPanelProps {
  workout: UnifiedCalendarItem
  isCoachView?: boolean
  isGlass?: boolean
}

function WorkoutDetailPanel({ workout, isCoachView, isGlass = false }: WorkoutDetailPanelProps) {
  const meta = workout.metadata
  const workoutType = (meta.workoutType as string) || 'RUNNING'
  const intensity = (meta.intensity as string) || 'MODERATE'
  const duration = meta.duration as number | undefined
  const distance = meta.distance as number | undefined
  const instructions = meta.instructions as string | undefined
  const isCompleted = meta.isCompleted as boolean
  const workoutId = meta.workoutId as string | undefined

  return (
    <div className={cn(
      "mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2",
      isGlass
        ? "bg-blue-500/5 border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-blue-400">
          <Activity className="h-4 w-4 text-blue-500" />
          Passdetaljer
        </h4>
        {isCompleted && (
          <Badge variant="secondary" className={cn(
            "text-[10px] uppercase font-bold tracking-tight",
            isGlass ? "bg-emerald-500/20 text-emerald-400 border-none px-2" : "bg-green-100 text-green-700"
          )}>
            Genomfört
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Title */}
        <div>
          <p className={cn(
            "font-black text-lg tracking-tight",
            isGlass ? "text-white" : ""
          )}>{workout.title}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              className={cn(
                'text-xs',
                INTENSITY_COLORS[intensity] || 'bg-yellow-500',
                'text-white'
              )}
            >
              {intensity.charAt(0) + intensity.slice(1).toLowerCase()}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-[10px] uppercase font-bold border-none px-2",
              isGlass ? "bg-white/5 text-slate-400" : "text-xs"
            )}>
              {workoutType}
            </Badge>
          </div>
        </div>

        {/* Duration & Distance */}
        {(duration || distance) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {duration && duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {duration} min
              </span>
            )}
            {distance && distance > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {distance} km
              </span>
            )}
          </div>
        )}

        {/* Instructions */}
        {instructions && (
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Instruktioner</p>
            <p className={cn(
              "whitespace-pre-wrap font-medium",
              isGlass ? "text-slate-300" : ""
            )}>{instructions}</p>
          </div>
        )}

        {/* Action Buttons */}
        {workoutId && !isCoachView && (
          <div className="flex gap-2 pt-2">
            {!isCompleted ? (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => window.location.href = `/athlete/workouts/${workoutId}/log`}
              >
                Logga pass
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 font-bold text-[10px] uppercase tracking-widest h-9",
                  isGlass ? "bg-white/5 border-white/10 text-slate-400 hover:text-white" : ""
                )}
                onClick={() => window.location.href = `/athlete/workouts/${workoutId}`}
              >
                Visa logg
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
