'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Activity,
  Clock,
  MapPin,
  Dumbbell,
  Flame,
  Wind,
  Loader2,
  AlertCircle,
  Repeat,
  Timer,
  Weight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarWorkoutDetailSheetProps {
  workoutId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: 'default' | 'glass'
}

interface WorkoutSegment {
  id: string
  order: number
  type: string
  duration?: number | null
  distance?: number | null
  pace?: string | null
  zone?: number | null
  heartRate?: string | null
  power?: number | null
  reps?: number | null
  exerciseId?: string | null
  sets?: number | null
  repsCount?: string | null
  weight?: string | null
  tempo?: string | null
  rest?: number | null
  section: string
  description?: string | null
  notes?: string | null
  exercise?: {
    id: string
    name: string
    category?: string | null
    muscleGroup?: string | null
  } | null
}

interface WorkoutDetail {
  id: string
  name: string
  type: string
  intensity: string
  duration?: number | null
  distance?: number | null
  instructions?: string | null
  coachNotes?: string | null
  segments: WorkoutSegment[]
}

const SECTION_ORDER = ['WARMUP', 'MAIN', 'CORE', 'COOLDOWN'] as const
const SECTION_LABELS: Record<string, string> = {
  WARMUP: 'Uppvärmning',
  MAIN: 'Huvudpass',
  CORE: 'Core',
  COOLDOWN: 'Nedvarvning',
}
const SECTION_COLORS: Record<string, string> = {
  WARMUP: 'text-amber-500',
  MAIN: 'text-blue-500',
  CORE: 'text-purple-500',
  COOLDOWN: 'text-green-500',
}

const INTENSITY_LABELS: Record<string, string> = {
  EASY: 'Lätt',
  MODERATE: 'Måttlig',
  HARD: 'Hård',
  MAXIMUM: 'Maximal',
  RECOVERY: 'Återhämtning',
}

const INTENSITY_COLORS: Record<string, string> = {
  EASY: 'bg-green-500',
  MODERATE: 'bg-yellow-500',
  HARD: 'bg-orange-500',
  MAXIMUM: 'bg-red-500',
  RECOVERY: 'bg-blue-400',
}

export function CalendarWorkoutDetailSheet({
  workoutId,
  open,
  onOpenChange,
  variant = 'default',
}: CalendarWorkoutDetailSheetProps) {
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isGlass = variant === 'glass'

  useEffect(() => {
    if (!workoutId || !open) {
      setWorkout(null)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`/api/workouts/${workoutId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Kunde inte hämta passdetaljer')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setWorkout(data)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [workoutId, open])

  const groupedSegments = workout
    ? SECTION_ORDER.reduce<Record<string, WorkoutSegment[]>>((acc, section) => {
        const segs = workout.segments.filter((s) => s.section === section)
        if (segs.length > 0) acc[section] = segs
        return acc
      }, {})
    : {}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          'w-full sm:max-w-lg overflow-y-auto',
          isGlass && 'bg-slate-900/95 border-white/10'
        )}
      >
        <SheetHeader>
          <SheetTitle className={cn(isGlass && 'text-white')}>
            Passdetaljer
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {workout && !isLoading && (
          <div className="space-y-6 pt-4">
            {/* Header */}
            <div>
              <h3 className={cn(
                'text-lg font-bold',
                isGlass ? 'text-white' : ''
              )}>
                {workout.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  className={cn(
                    'text-xs text-white',
                    INTENSITY_COLORS[workout.intensity] || 'bg-yellow-500'
                  )}
                >
                  {INTENSITY_LABELS[workout.intensity] || workout.intensity}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    isGlass && 'border-white/20 text-slate-400'
                  )}
                >
                  {workout.type}
                </Badge>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {workout.duration && workout.duration > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {workout.duration} min
                  </span>
                )}
                {workout.distance && workout.distance > 0 && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {workout.distance} km
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  {workout.segments.length} segment
                </span>
              </div>
            </div>

            <Separator className={cn(isGlass && 'bg-white/10')} />

            {/* Instructions */}
            {workout.instructions && (
              <div>
                <h4 className={cn(
                  'text-xs font-bold uppercase tracking-wider mb-2',
                  isGlass ? 'text-slate-500' : 'text-muted-foreground'
                )}>
                  Instruktioner
                </h4>
                <p className={cn(
                  'text-sm whitespace-pre-wrap',
                  isGlass ? 'text-slate-300' : ''
                )}>
                  {workout.instructions}
                </p>
              </div>
            )}

            {/* Coach notes */}
            {workout.coachNotes && (
              <div>
                <h4 className={cn(
                  'text-xs font-bold uppercase tracking-wider mb-2',
                  isGlass ? 'text-slate-500' : 'text-muted-foreground'
                )}>
                  Tränarens anteckningar
                </h4>
                <p className={cn(
                  'text-sm whitespace-pre-wrap',
                  isGlass ? 'text-slate-300' : ''
                )}>
                  {workout.coachNotes}
                </p>
              </div>
            )}

            {/* Segments grouped by section */}
            {Object.keys(groupedSegments).length > 0 ? (
              <div className="space-y-5">
                {SECTION_ORDER.map((section) => {
                  const segments = groupedSegments[section]
                  if (!segments) return null

                  return (
                    <div key={section}>
                      <h4 className={cn(
                        'text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2',
                        SECTION_COLORS[section] || 'text-muted-foreground'
                      )}>
                        <SectionIcon section={section} />
                        {SECTION_LABELS[section] || section}
                        <span className="text-muted-foreground font-normal">
                          ({segments.length})
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {segments.map((seg) => (
                          <SegmentCard
                            key={seg.id}
                            segment={seg}
                            isGlass={isGlass}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Inga segment i detta pass
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SectionIcon({ section }: { section: string }) {
  switch (section) {
    case 'WARMUP':
      return <Flame className="h-4 w-4" />
    case 'MAIN':
      return <Dumbbell className="h-4 w-4" />
    case 'CORE':
      return <Activity className="h-4 w-4" />
    case 'COOLDOWN':
      return <Wind className="h-4 w-4" />
    default:
      return null
  }
}

function SegmentCard({ segment, isGlass }: { segment: WorkoutSegment; isGlass: boolean }) {
  const isExercise = segment.type === 'exercise' || segment.type === 'work'
  const isInterval = segment.type === 'interval'
  const isRest = segment.type === 'rest' || segment.type === 'recovery'
  const isWarmupCooldown = segment.type === 'warmup' || segment.type === 'cooldown'

  const exerciseName = segment.exercise?.name || segment.description || segmentTypeLabel(segment.type)

  return (
    <div className={cn(
      'rounded-lg border p-3 text-sm',
      isGlass
        ? 'bg-white/5 border-white/10'
        : 'bg-card',
      isRest && (isGlass ? 'bg-white/[0.02] border-dashed' : 'bg-muted/50 border-dashed')
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium',
            isGlass ? 'text-white' : '',
            isRest && 'text-muted-foreground'
          )}>
            {exerciseName}
          </p>

          {/* Detail chips */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            {isExercise && (
              <>
                {segment.sets && (
                  <span className="flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    {segment.sets} set
                  </span>
                )}
                {segment.repsCount && (
                  <span>{segment.repsCount} reps</span>
                )}
                {segment.weight && (
                  <span className="flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {segment.weight}
                  </span>
                )}
                {segment.tempo && (
                  <span>Tempo: {segment.tempo}</span>
                )}
                {segment.rest != null && segment.rest > 0 && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    Vila {segment.rest}s
                  </span>
                )}
              </>
            )}

            {(isInterval || isWarmupCooldown) && (
              <>
                {segment.duration != null && segment.duration > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {segment.duration} min
                  </span>
                )}
                {segment.distance != null && segment.distance > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {segment.distance} km
                  </span>
                )}
                {segment.pace && <span>Tempo: {segment.pace}</span>}
                {segment.zone != null && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    Zon {segment.zone}
                  </Badge>
                )}
                {segment.heartRate && <span>{segment.heartRate}</span>}
                {segment.reps != null && segment.reps > 0 && (
                  <span>{segment.reps}x</span>
                )}
              </>
            )}

            {isRest && segment.duration != null && segment.duration > 0 && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {segment.duration} min vila
              </span>
            )}
          </div>
        </div>

        {/* Zone badge on the right */}
        {segment.zone != null && isExercise && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
            Zon {segment.zone}
          </Badge>
        )}
      </div>

      {segment.notes && (
        <p className={cn(
          'text-xs mt-2 italic',
          isGlass ? 'text-slate-400' : 'text-muted-foreground'
        )}>
          {segment.notes}
        </p>
      )}
    </div>
  )
}

function segmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    warmup: 'Uppvärmning',
    interval: 'Intervall',
    cooldown: 'Nedvarvning',
    exercise: 'Övning',
    work: 'Arbete',
    rest: 'Vila',
    recovery: 'Återhämtning',
  }
  return labels[type] || type
}
