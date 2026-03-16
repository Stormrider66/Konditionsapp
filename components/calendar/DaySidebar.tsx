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
  Loader2,
  Edit,
  Trash2,
  ExternalLink,
  ChevronRight,
  Mountain,
  Thermometer,
  Sparkles,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Dumbbell,
  Timer,
  Zap,
  Trophy,
  Beaker,
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
import { useEffect, useState } from 'react'
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
  onViewWorkoutDetails?: (workoutId: string) => void
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
  onViewWorkoutDetails,
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
  const adHocWorkouts = items.filter((i) => i.type === 'AD_HOC')

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

              {adHocWorkouts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                    Ad-hoc ({adHocWorkouts.length})
                  </h4>
                  <div className="space-y-2.5">
                    {adHocWorkouts.map((adHocWorkout) => (
                      <AdHocItem
                        key={adHocWorkout.id}
                        workout={adHocWorkout}
                        isSelected={selectedItem?.id === adHocWorkout.id}
                        onClick={() => onItemClick(adHocWorkout)}
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
                  onViewWorkoutDetails={onViewWorkoutDetails}
                />
              )}

              {selectedItem?.type === 'AD_HOC' && (
                <AdHocDetailPanel workout={selectedItem} isGlass={true} />
              )}

              {selectedItem?.type === 'RACE' && (
                <RaceDetailPanel race={selectedItem} isGlass={true} />
              )}

              {selectedItem?.type === 'FIELD_TEST' && (
                <FieldTestDetailPanel test={selectedItem} isGlass={true} />
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

            {adHocWorkouts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-500" />
                  Ad-hoc ({adHocWorkouts.length})
                </h4>
                <div className="space-y-2">
                  {adHocWorkouts.map((adHocWorkout) => (
                    <AdHocItem
                      key={adHocWorkout.id}
                      workout={adHocWorkout}
                      isSelected={selectedItem?.id === adHocWorkout.id}
                      onClick={() => onItemClick(adHocWorkout)}
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
                onViewWorkoutDetails={onViewWorkoutDetails}
              />
            )}

            {selectedItem?.type === 'AD_HOC' && (
              <AdHocDetailPanel workout={selectedItem} />
            )}

            {selectedItem?.type === 'RACE' && (
              <RaceDetailPanel race={selectedItem} />
            )}

            {selectedItem?.type === 'FIELD_TEST' && (
              <FieldTestDetailPanel test={selectedItem} />
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
  onViewWorkoutDetails?: (workoutId: string) => void
}

interface SidebarWorkoutDetail {
  id: string
  name: string
  type: string
  intensity?: string | null
  duration?: number | null
  distance?: number | null
  instructions?: string | null
  day?: {
    week?: {
      program?: {
        id: string
        clientId: string
      } | null
    } | null
  } | null
}

interface SidebarWorkoutLog {
  id: string
  completed: boolean
  completedAt: string | null
  duration: number | null
  distance: number | null
  avgPace: string | null
  avgHR: number | null
  perceivedEffort: number | null
  notes: string | null
  coachFeedback: string | null
  intervalResults?: Array<{
    segmentId?: string
    segmentLabel?: string
    reps?: Array<{
      repNumber?: number
      pace?: string
      avgHR?: number
      maxHR?: number
      duration?: number
      distance?: number
      avgPower?: number
      notes?: string
    }>
  }> | null
}

interface SidebarRaceResult {
  id: string
  raceDate: string
  distance?: string | null
  timeFormatted: string
  goalTime?: string | null
  avgPace?: string | null
  avgHeartRate?: number | null
  trainingProgramId?: string | null
  conditions?: string | null
  athleteNotes?: string | null
  coachNotes?: string | null
  terrain?: string | null
  temperature?: number | null
  windSpeed?: number | null
  elevation?: number | null
  confidence?: string | null
}

interface SidebarFieldTestDetail {
  id: string
  testType: string
  date: string
  lt1Pace?: number | null
  lt1HR?: number | null
  lt2Pace?: number | null
  lt2HR?: number | null
  confidence?: string | null
  valid: boolean
  notes?: string | null
  warnings?: unknown
  errors?: unknown
  conditions?: Record<string, unknown> | null
  results?: Record<string, unknown> | null
}

function WorkoutDetailPanel({ workout, isCoachView, isGlass = false, onViewWorkoutDetails }: WorkoutDetailPanelProps) {
  const meta = workout.metadata
  const workoutId = (meta.workoutId as string) || workout.id
  const [detail, setDetail] = useState<SidebarWorkoutDetail | null>(null)
  const [latestLog, setLatestLog] = useState<SidebarWorkoutLog | null>(null)
  const [raceResult, setRaceResult] = useState<SidebarRaceResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetch(`/api/workouts/${workoutId}`).then((res) => (res.ok ? res.json() : null)),
      fetch(`/api/workouts/${workoutId}/logs`).then((res) => (res.ok ? res.json() : { data: [] })),
    ])
      .then(([workoutData, logsData]) => {
        if (cancelled) return
        setDetail(workoutData)
        const logs = Array.isArray(logsData?.data) ? logsData.data : []
        const completedLog = logs.find((log: SidebarWorkoutLog) => log.completed) || logs[0] || null
        setLatestLog(completedLog)

        const clientId = workoutData?.day?.week?.program?.clientId
        const programId = workoutData?.day?.week?.program?.id
        if (!clientId || !programId || !completedLog?.completedAt) {
          setRaceResult(null)
          return
        }

        fetch(`/api/race-results?clientId=${clientId}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((results: SidebarRaceResult[]) => {
            if (cancelled || !Array.isArray(results)) return
            const targetTime = new Date(completedLog.completedAt as string).getTime()
            const programResults = results.filter((result) => result.trainingProgramId === programId)
            const closest = programResults
              .sort((a, b) => Math.abs(new Date(a.raceDate).getTime() - targetTime) - Math.abs(new Date(b.raceDate).getTime() - targetTime))[0] || null
            setRaceResult(closest)
          })
          .catch(() => {
            if (!cancelled) {
              setRaceResult(null)
            }
          })
      })
      .catch(() => {
        if (cancelled) return
        setDetail(null)
        setLatestLog(null)
        setRaceResult(null)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [workoutId])

  const workoutType = detail?.type || (meta.workoutType as string) || 'RUNNING'
  const intensity = detail?.intensity || (meta.intensity as string) || 'MODERATE'
  const duration = detail?.duration ?? (meta.duration as number | undefined)
  const distance = detail?.distance ?? (meta.distance as number | undefined)
  const instructions = detail?.instructions || (meta.instructions as string | undefined)
  const isCompleted = latestLog?.completed || (meta.isCompleted as boolean)
  const intervalResults = Array.isArray(latestLog?.intervalResults) ? latestLog.intervalResults : []
  const hasIntervalDetails = intervalResults.some((segment) => Array.isArray(segment.reps) && segment.reps.length > 0)
  const completedDate = latestLog?.completedAt
    ? new Date(latestLog.completedAt).toLocaleDateString('sv-SE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

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
        {isLoading && (
          <div className={cn(
            'flex items-center gap-2 text-xs',
            isGlass ? 'text-slate-400' : 'text-muted-foreground'
          )}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Laddar passdetaljer
          </div>
        )}

        {/* Title */}
        <div>
          <p className={cn(
            "font-black text-lg tracking-tight",
            isGlass ? "text-white" : ""
          )}>{workout.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              className={cn(
                'text-xs',
                INTENSITY_COLORS[intensity] || 'bg-yellow-500',
                'text-white'
              )}
            >
              {formatIntensityLabel(intensity)}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-[10px] uppercase font-bold border-none px-2",
              isGlass ? "bg-white/5 text-slate-400" : "text-xs"
            )}>
              {formatWorkoutTypeLabel(workoutType)}
            </Badge>
            {isCompleted && completedDate && (
              <span className={cn(
                'text-[10px] uppercase tracking-widest font-bold',
                isGlass ? 'text-slate-500' : 'text-muted-foreground'
              )}>
                Slutfört {completedDate}
              </span>
            )}
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

        {latestLog?.completed && (
          <div className={cn(
            'rounded-xl border p-3 space-y-3',
            isGlass ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
          )}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Genomfört pass
              </p>
              {completedDate && (
                <span className="text-[10px] text-muted-foreground">{completedDate}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {raceResult?.timeFormatted && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> {formatRaceDistanceLabel(raceResult.distance)}</p>
                  <p className="font-semibold">{raceResult.timeFormatted}</p>
                  {raceResult.goalTime ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Mål {raceResult.goalTime}</p>
                  ) : null}
                </div>
              )}
              {(latestLog.duration != null || duration) && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tid</p>
                  <p className="font-semibold">
                    {latestLog.duration != null ? `${latestLog.duration} min` : '-'}
                    {duration ? <span className="text-muted-foreground font-normal"> / plan {duration} min</span> : null}
                  </p>
                </div>
              )}
              {(latestLog.distance != null || distance) && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Distans</p>
                  <p className="font-semibold">
                    {latestLog.distance != null ? `${latestLog.distance} km` : '-'}
                    {distance ? <span className="text-muted-foreground font-normal"> / plan {distance} km</span> : null}
                  </p>
                </div>
              )}
              {latestLog.avgPace && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tempo</p>
                  <p className="font-semibold">{latestLog.avgPace}</p>
                </div>
              )}
              {!latestLog.avgPace && raceResult?.avgPace && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tävlingstempo</p>
                  <p className="font-semibold">{raceResult.avgPace}</p>
                </div>
              )}
              {(latestLog.avgHR != null || latestLog.perceivedEffort != null) && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Belastning</p>
                  <p className="font-semibold">
                    {latestLog.avgHR != null ? `${latestLog.avgHR} bpm` : 'Ingen puls'}
                    {latestLog.perceivedEffort != null ? ` • RPE ${latestLog.perceivedEffort}/10` : ''}
                  </p>
                </div>
              )}
            </div>

            {latestLog.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Atletens anteckningar</p>
                <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>
                  {latestLog.notes}
                </p>
              </div>
            )}

            {latestLog.coachFeedback && (
              <div className={cn(
                'rounded-lg border p-2.5',
                isGlass ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
              )}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Tränarfeedback
                </p>
                <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>
                  {latestLog.coachFeedback}
                </p>
              </div>
            )}

            {hasIntervalDetails && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Intervall- och splittider</p>
                <div className="space-y-2">
                  {intervalResults.map((segment, segmentIndex) => {
                    const reps = Array.isArray(segment.reps) ? segment.reps : []
                    if (reps.length === 0) return null

                    return (
                      <div
                        key={`${segment.segmentId || 'segment'}-${segmentIndex}`}
                        className={cn(
                          'rounded-lg border p-2.5 space-y-2',
                          isGlass ? 'bg-white/5 border-white/10' : 'bg-background'
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {segment.segmentLabel || `Block ${segmentIndex + 1}`}
                        </p>
                        <div className="space-y-1.5">
                          {reps.map((rep, repIndex) => (
                            <div key={`${segmentIndex}-${repIndex}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="font-semibold">Rep {rep.repNumber || repIndex + 1}</span>
                              {rep.duration ? <span>Tid {formatDurationMinutes(rep.duration)}</span> : null}
                              {rep.distance ? <span>Distans {rep.distance} km</span> : null}
                              {rep.pace ? <span>Tempo {rep.pace}</span> : null}
                              {rep.avgHR ? <span>Puls {rep.avgHR} bpm</span> : null}
                              {rep.avgPower ? <span>Effekt {rep.avgPower} W</span> : null}
                              {rep.notes ? <span className="text-muted-foreground">{rep.notes}</span> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {onViewWorkoutDetails && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full font-bold text-[10px] uppercase tracking-widest h-9",
                isGlass ? "bg-white/5 border-white/10 text-slate-400 hover:text-white" : ""
              )}
              onClick={() => onViewWorkoutDetails(workoutId)}
            >
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              {latestLog?.completed ? 'Visa fullständig genomgång' : 'Visa detaljer'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface AdHocItemProps {
  workout: UnifiedCalendarItem
  isSelected: boolean
  onClick: () => void
  isGlass?: boolean
}

function AdHocItem({ workout, isSelected, onClick, isGlass = false }: AdHocItemProps) {
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

interface SidebarAdHocDetail {
  id: string
  inputType: string
  workoutName: string | null
  parsedType: string | null
  parsedStructure: Record<string, unknown> | null
  workoutDate: string
}

function AdHocDetailPanel({ workout, isGlass = false }: { workout: UnifiedCalendarItem; isGlass?: boolean }) {
  const [detail, setDetail] = useState<SidebarAdHocDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/adhoc-workouts/${workout.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((response) => {
        if (!cancelled) {
          setDetail(response?.data || null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [workout.id])

  const parsed = detail?.parsedStructure || {}
  const distance = formatDistanceValue(parsed.distance)
  const duration = typeof parsed.duration === 'number' ? parsed.duration : null
  const avgPace = typeof parsed.avgPace === 'string' ? parsed.avgPace : null
  const avgHeartRate = typeof parsed.avgHeartRate === 'number' ? parsed.avgHeartRate : null
  const intensity = typeof parsed.intensity === 'string' ? parsed.intensity : (workout.metadata.intensity as string | undefined) || 'MODERATE'
  const feeling = typeof parsed.feeling === 'string' ? parsed.feeling : null
  const notes = typeof parsed.notes === 'string' ? parsed.notes : null
  const strengthCount = Array.isArray(parsed.strengthExercises) ? parsed.strengthExercises.length : 0
  const cardioCount = Array.isArray(parsed.cardioSegments) ? parsed.cardioSegments.length : 0
  const hybridCount = Array.isArray(parsed.hybridMovements) ? parsed.hybridMovements.length : 0
  const previewItems = getAdHocPreviewItems(parsed)

  return (
    <div className={cn(
      'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      isGlass
        ? 'bg-teal-500/5 border-teal-500/20 shadow-[0_4px_20px_rgba(20,184,166,0.12)]'
        : 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-teal-500">
          <CheckCircle2 className="h-4 w-4" />
          Ad-hoc detaljer
        </h4>
        <Badge variant="secondary" className={cn(
          'text-[10px] uppercase font-bold tracking-tight',
          isGlass ? 'bg-emerald-500/20 text-emerald-400 border-none px-2' : 'bg-green-100 text-green-700'
        )}>
          Genomfört
        </Badge>
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className={cn('flex items-center gap-2 text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Laddar ad-hoc-detaljer
          </div>
        )}

        <div>
          <p className={cn('font-black text-lg tracking-tight', isGlass ? 'text-white' : '')}>{workout.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={cn('text-xs', INTENSITY_COLORS[intensity] || 'bg-yellow-500', 'text-white')}>
              {formatIntensityLabel(intensity)}
            </Badge>
            <Badge variant="outline" className={cn(
              'text-[10px] uppercase font-bold border-none px-2',
              isGlass ? 'bg-white/5 text-slate-400' : 'text-xs'
            )}>
              {formatAdHocTypeLabel(detail?.parsedType)}
            </Badge>
            <span className={cn(
              'text-[10px] uppercase tracking-widest font-bold',
              isGlass ? 'text-slate-500' : 'text-muted-foreground'
            )}>
              {formatAdHocInputType(detail?.inputType)}
            </span>
          </div>
        </div>

        {(duration || distance.label || avgPace || avgHeartRate) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {duration ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tid</p>
                <p className="font-semibold">{duration} min</p>
              </div>
            ) : null}
            {distance.label ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Distans</p>
                <p className="font-semibold">{distance.label}</p>
              </div>
            ) : null}
            {avgPace ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tempo</p>
                <p className="font-semibold">{avgPace}</p>
              </div>
            ) : null}
            {avgHeartRate ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Puls</p>
                <p className="font-semibold">{avgHeartRate} bpm</p>
              </div>
            ) : null}
          </div>
        )}

        {(strengthCount > 0 || cardioCount > 0 || hybridCount > 0 || feeling) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {strengthCount > 0 ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Dumbbell className="h-3 w-3" /> Styrkeövningar</p>
                <p className="font-semibold">{strengthCount}</p>
              </div>
            ) : null}
            {cardioCount > 0 ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Konditionsblock</p>
                <p className="font-semibold">{cardioCount}</p>
              </div>
            ) : null}
            {hybridCount > 0 ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Hybridmoment</p>
                <p className="font-semibold">{hybridCount}</p>
              </div>
            ) : null}
            {feeling ? (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">Känsla</p>
                <p className="font-semibold">{formatFeelingLabel(feeling)}</p>
              </div>
            ) : null}
          </div>
        )}

        {previewItems.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Innehåll</p>
            <div className="flex flex-wrap gap-2">
              {previewItems.map((item) => (
                <span
                  key={item}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-semibold',
                    isGlass ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-background'
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {notes ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Anteckningar</p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{notes}</p>
          </div>
        ) : (
          !isLoading && (
            <p className={cn('text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
              Inga extra detaljer registrerade för detta ad-hoc-pass.
            </p>
          )
        )}
      </div>
    </div>
  )
}

function RaceDetailPanel({ race, isGlass = false }: { race: UnifiedCalendarItem; isGlass?: boolean }) {
  const [detail, setDetail] = useState<SidebarRaceResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/race-results/${race.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setDetail(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [race.id])

  const meta = race.metadata
  const completed = (meta.isCompleted as boolean) || !!detail?.timeFormatted
  const confidence = formatConfidenceLabel(detail?.confidence)
  const dateLabel = detail?.raceDate
    ? new Date(detail.raceDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className={cn(
      'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      isGlass
        ? 'bg-red-500/5 border-red-500/20 shadow-[0_4px_20px_rgba(239,68,68,0.12)]'
        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-red-500">
          <Trophy className="h-4 w-4" />
          Tävling
        </h4>
        {completed && (
          <Badge variant="secondary" className={cn(
            'text-[10px] uppercase font-bold tracking-tight',
            isGlass ? 'bg-emerald-500/20 text-emerald-400 border-none px-2' : 'bg-green-100 text-green-700'
          )}>
            Genomförd
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className={cn('flex items-center gap-2 text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Laddar tävlingsdetaljer
          </div>
        )}

        <div>
          <p className={cn('font-black text-lg tracking-tight', isGlass ? 'text-white' : '')}>{race.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className="text-xs bg-red-500 text-white">
              {formatRaceDistanceLabel(detail?.distance || (meta.distance as string | undefined))}
            </Badge>
            {typeof meta.classification === 'string' && (
              <Badge variant="outline" className={cn(
                'text-[10px] uppercase font-bold border-none px-2',
                isGlass ? 'bg-white/5 text-slate-400' : 'text-xs'
              )}>
                Klass {meta.classification}
              </Badge>
            )}
            {dateLabel && (
              <span className={cn('text-[10px] uppercase tracking-widest font-bold', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                {dateLabel}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {detail?.timeFormatted && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> Resultat</p>
              <p className="font-semibold">{detail.timeFormatted}</p>
            </div>
          )}
          {(detail?.goalTime || meta.targetTime) && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground">Måltid</p>
              <p className="font-semibold">{detail?.goalTime || String(meta.targetTime)}</p>
            </div>
          )}
          {(detail?.avgPace || meta.actualPace) && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tempo</p>
              <p className="font-semibold">{detail?.avgPace || String(meta.actualPace)}</p>
            </div>
          )}
          {detail?.avgHeartRate && (
            <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
              <p className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Snittpuls</p>
              <p className="font-semibold">{detail.avgHeartRate} bpm</p>
            </div>
          )}
        </div>

        {(detail?.terrain || detail?.temperature || detail?.windSpeed || detail?.elevation || confidence) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {detail?.terrain && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">Bana</p>
                <p className="font-semibold">{detail.terrain}</p>
              </div>
            )}
            {detail?.temperature != null && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">Temperatur</p>
                <p className="font-semibold">{detail.temperature}°C</p>
              </div>
            )}
            {detail?.windSpeed != null && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">Vind</p>
                <p className="font-semibold">{detail.windSpeed} m/s</p>
              </div>
            )}
            {confidence && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">Analyskvalitet</p>
                <p className="font-semibold">{confidence}</p>
              </div>
            )}
          </div>
        )}

        {detail?.conditions && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Förhållanden</p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>
              {detail.conditions}
            </p>
          </div>
        )}

        {detail?.athleteNotes && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Atletens anteckningar</p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{detail.athleteNotes}</p>
          </div>
        )}

        {detail?.coachNotes && (
          <div className={cn('rounded-lg border p-2.5', isGlass ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200')}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Coachanalys</p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{detail.coachNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FieldTestDetailPanel({ test, isGlass = false }: { test: UnifiedCalendarItem; isGlass?: boolean }) {
  const [detail, setDetail] = useState<SidebarFieldTestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetch(`/api/field-tests/${test.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setDetail(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [test.id])

  const warnings = normalizeMessages(detail?.warnings)
  const errors = normalizeMessages(detail?.errors)
  const dateLabel = detail?.date
    ? new Date(detail.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
    : null
  const metrics = getFieldTestMetrics(detail?.results || null)

  return (
    <div className={cn(
      'mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2',
      isGlass
        ? 'bg-green-500/5 border-green-500/20 shadow-[0_4px_20px_rgba(34,197,94,0.12)]'
        : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-green-500">
          <Beaker className="h-4 w-4" />
          Fälttest
        </h4>
        {detail && (
          <Badge variant="secondary" className={cn(
            'text-[10px] uppercase font-bold tracking-tight',
            detail.valid
              ? (isGlass ? 'bg-emerald-500/20 text-emerald-400 border-none px-2' : 'bg-green-100 text-green-700')
              : (isGlass ? 'bg-yellow-500/20 text-yellow-300 border-none px-2' : 'bg-yellow-100 text-yellow-700')
          )}>
            {detail.valid ? 'Validerat' : 'Behöver kontroll'}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className={cn('flex items-center gap-2 text-xs', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Laddar testdetaljer
          </div>
        )}

        <div>
          <p className={cn('font-black text-lg tracking-tight', isGlass ? 'text-white' : '')}>{test.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className="text-xs bg-green-500 text-white">
              {formatFieldTestType(detail?.testType || (test.metadata.testType as string | undefined))}
            </Badge>
            {dateLabel && (
              <span className={cn('text-[10px] uppercase tracking-widest font-bold', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                {dateLabel}
              </span>
            )}
            {detail?.confidence && (
              <span className={cn('text-[10px] uppercase tracking-widest font-bold', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                {formatConfidenceLabel(detail.confidence)}
              </span>
            )}
          </div>
        </div>

        {(detail?.lt1Pace || detail?.lt1HR || detail?.lt2Pace || detail?.lt2HR) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(detail?.lt1Pace || detail?.lt1HR) && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">LT1</p>
                <p className="font-semibold">
                  {detail?.lt1Pace ? `${formatPaceSeconds(detail.lt1Pace)}` : 'Tempo saknas'}
                  {detail?.lt1HR ? ` • ${Math.round(detail.lt1HR)} bpm` : ''}
                </p>
              </div>
            )}
            {(detail?.lt2Pace || detail?.lt2HR) && (
              <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                <p className="text-muted-foreground">LT2</p>
                <p className="font-semibold">
                  {detail?.lt2Pace ? `${formatPaceSeconds(detail.lt2Pace)}` : 'Tempo saknas'}
                  {detail?.lt2HR ? ` • ${Math.round(detail.lt2HR)} bpm` : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {metrics.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nyckelvärden</p>
            <div className="flex flex-wrap gap-2">
              {metrics.map((metric) => (
                <span
                  key={metric}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-semibold',
                    isGlass ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-background'
                  )}
                >
                  {metric}
                </span>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className={cn('rounded-lg border p-2.5', isGlass ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200')}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-1">Varningar</p>
            <ul className={cn('space-y-1 text-xs', isGlass ? 'text-slate-300' : '')}>
              {warnings.slice(0, 3).map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div className={cn('rounded-lg border p-2.5', isGlass ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200')}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Kvalitetsproblem</p>
            <ul className={cn('space-y-1 text-xs', isGlass ? 'text-slate-300' : '')}>
              {errors.slice(0, 3).map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {detail?.notes && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Anteckningar</p>
            <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>{detail.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDistanceValue(distance: unknown): { label: string | null } {
  if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
    return { label: `${distance % 1 === 0 ? distance.toFixed(0) : distance.toFixed(1)} km` }
  }
  if (typeof distance === 'string' && distance.trim()) {
    const normalized = distance.trim()
    return { label: normalized.includes('km') ? normalized : `${normalized} km` }
  }
  return { label: null }
}

function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '-'
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} s`
  }
  return `${minutes} min`
}

function formatWorkoutTypeLabel(type?: string | null): string {
  const labels: Record<string, string> = {
    RUNNING: 'Löpning',
    STRENGTH: 'Styrka',
    PLYOMETRIC: 'Plyometri',
    CORE: 'Core',
    RECOVERY: 'Återhämtning',
    CYCLING: 'Cykling',
    SKIING: 'Skidor',
    SWIMMING: 'Simning',
    TRIATHLON: 'Triathlon',
    HYROX: 'Hyrox',
    ALTERNATIVE: 'Alternativt',
    OTHER: 'Övrigt',
  }
  return labels[type || ''] || type || 'Pass'
}

function formatIntensityLabel(intensity?: string | null): string {
  const labels: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Max',
  }
  return labels[intensity || ''] || intensity || 'Pass'
}

function formatFeelingLabel(feeling?: string | null): string {
  const labels: Record<string, string> = {
    Great: 'Fantastiskt',
    Good: 'Bra',
    Okay: 'Okej',
    Tired: 'Trött',
    Struggled: 'Kämpigt',
  }
  return labels[feeling || ''] || feeling || '-'
}

function formatAdHocInputType(inputType?: string | null): string {
  const labels: Record<string, string> = {
    PHOTO: 'Foto',
    AUDIO: 'Ljud',
    TEXT: 'Text',
    MANUAL_FORM: 'Manuell',
    GARMIN: 'Garmin',
    STRAVA: 'Strava',
    TEMPLATE: 'Mall',
  }
  return labels[inputType || ''] || 'Ad-hoc'
}

function formatAdHocTypeLabel(parsedType?: string | null): string {
  return formatWorkoutTypeLabel(parsedType || 'OTHER')
}

function formatRaceDistanceLabel(distance?: string | null): string {
  const labels: Record<string, string> = {
    '5K': '5 km-resultat',
    '10K': '10 km-resultat',
    HALF_MARATHON: 'Halvmaraton-resultat',
    MARATHON: 'Maraton-resultat',
    CUSTOM: 'Tävlingsresultat',
  }
  return labels[distance || ''] || 'Tävlingsresultat'
}

function getAdHocPreviewItems(parsed: Record<string, unknown>): string[] {
  const items: string[] = []

  const strengthExercises = Array.isArray(parsed.strengthExercises) ? parsed.strengthExercises : []
  for (const exercise of strengthExercises.slice(0, 3)) {
    if (exercise && typeof exercise === 'object') {
      const nameSv = typeof (exercise as { nameSv?: unknown }).nameSv === 'string'
        ? (exercise as { nameSv?: string }).nameSv
        : null
      const name = typeof (exercise as { name?: unknown }).name === 'string'
        ? (exercise as { name?: string }).name
        : null
      if (nameSv || name) {
        items.push(nameSv || name || '')
      }
    }
  }

  const cardioSegments = Array.isArray(parsed.cardioSegments) ? parsed.cardioSegments : []
  for (const segment of cardioSegments.slice(0, 3 - items.length)) {
    if (segment && typeof segment === 'object') {
      const segmentType = typeof (segment as { type?: unknown }).type === 'string'
        ? (segment as { type?: string }).type
        : null
      const duration = typeof (segment as { duration?: unknown }).duration === 'number'
        ? (segment as { duration?: number }).duration
        : null
      if (segmentType) {
        items.push(`${formatCardioSegmentLabel(segmentType)}${duration ? ` ${duration} min` : ''}`)
      }
    }
  }

  const hybridMovements = Array.isArray(parsed.hybridMovements) ? parsed.hybridMovements : []
  for (const movement of hybridMovements.slice(0, 3 - items.length)) {
    if (movement && typeof movement === 'object') {
      const name = typeof (movement as { movementName?: unknown }).movementName === 'string'
        ? (movement as { movementName?: string }).movementName
        : null
      if (name) {
        items.push(name)
      }
    }
  }

  return items.slice(0, 3)
}

function formatCardioSegmentLabel(type: string): string {
  const labels: Record<string, string> = {
    WARMUP: 'Uppvärmning',
    WORK: 'Arbete',
    INTERVAL: 'Intervall',
    RECOVERY: 'Återhämtning',
    COOLDOWN: 'Nedjogg',
    REST: 'Vila',
  }
  return labels[type] || type
}

function formatConfidenceLabel(confidence?: string | null): string | null {
  if (!confidence) return null
  const labels: Record<string, string> = {
    VERY_HIGH: 'Mycket hög säkerhet',
    HIGH: 'Hög säkerhet',
    MEDIUM: 'Medelhög säkerhet',
    LOW: 'Låg säkerhet',
  }
  return labels[confidence] || confidence
}

function formatFieldTestType(type?: string): string {
  const labels: Record<string, string> = {
    THIRTY_MIN_TT: '30 min TT',
    TWENTY_MIN_TT: '20 min TT',
    HR_DRIFT: 'HR-drift',
    CRITICAL_VELOCITY: 'Critical Velocity',
    RACE_BASED: 'Tävlingsbaserat',
  }
  return labels[type || ''] || type || 'Fälttest'
}

function formatPaceSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}/km`
}

function normalizeMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return []
}

function getFieldTestMetrics(results: Record<string, unknown> | null): string[] {
  if (!results) return []
  const metrics: string[] = []

  if (typeof results.thresholdPace === 'number') {
    metrics.push(`Tröskeltempo ${formatPaceSeconds(results.thresholdPace)}`)
  }
  if (typeof results.thresholdHR === 'number') {
    metrics.push(`Tröskelpuls ${Math.round(results.thresholdHR)} bpm`)
  }
  if (typeof results.driftPercent === 'number') {
    metrics.push(`Drift ${results.driftPercent.toFixed(1)}%`)
  }
  if (typeof results.criticalVelocity === 'number') {
    metrics.push(`CV ${results.criticalVelocity.toFixed(2)} m/s`)
  }
  if (typeof results.vdot === 'number') {
    metrics.push(`VDOT ${results.vdot.toFixed(1)}`)
  }

  return metrics.slice(0, 4)
}
