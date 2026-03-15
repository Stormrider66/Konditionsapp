'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Pencil,
  Save,
  X,
  CheckCircle2,
  Heart,
  Zap,
  MessageSquare,
  TrendingUp,
  Gauge,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface CalendarWorkoutDetailSheetProps {
  workoutId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: 'default' | 'glass'
  isCoachView?: boolean
  businessSlug?: string
  onWorkoutUpdated?: () => void
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
  status: string
  duration?: number | null
  distance?: number | null
  instructions?: string | null
  coachNotes?: string | null
  segments: WorkoutSegment[]
}

interface WorkoutLog {
  id: string
  completed: boolean
  completedAt: string | null
  duration: number | null
  distance: number | null
  avgPace: string | null
  avgHR: number | null
  maxHR: number | null
  avgPower: number | null
  normalizedPower: number | null
  maxPower: number | null
  avgCadence: number | null
  elevation: number | null
  tss: number | null
  perceivedEffort: number | null
  difficulty: number | null
  feeling: string | null
  notes: string | null
  coachFeedback: string | null
  coachViewedAt: string | null
  athlete: { id: string; name: string | null }
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

const FEELING_LABELS: Record<string, string> = {
  Great: 'Fantastiskt',
  Good: 'Bra',
  Okay: 'Okej',
  Tired: 'Trött',
  Struggled: 'Kämpigt',
}

const FEELING_COLORS: Record<string, string> = {
  Great: 'text-green-500',
  Good: 'text-emerald-500',
  Okay: 'text-yellow-500',
  Tired: 'text-orange-500',
  Struggled: 'text-red-500',
}

export function CalendarWorkoutDetailSheet({
  workoutId,
  open,
  onOpenChange,
  variant = 'default',
  isCoachView = false,
  businessSlug,
  onWorkoutUpdated,
}: CalendarWorkoutDetailSheetProps) {
  const { toast } = useToast()
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isGlass = variant === 'glass'

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [editIntensity, setEditIntensity] = useState('')
  const [editInstructions, setEditInstructions] = useState('')
  const [editCoachNotes, setEditCoachNotes] = useState('')

  // Fetch workout and logs
  useEffect(() => {
    if (!workoutId || !open) {
      setWorkout(null)
      setLogs([])
      setError(null)
      setIsEditing(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([
      fetch(`/api/workouts/${workoutId}`).then((res) => {
        if (!res.ok) throw new Error('Kunde inte hämta passdetaljer')
        return res.json()
      }),
      fetch(`/api/workouts/${workoutId}/logs`).then((res) => {
        if (!res.ok) return { data: [] }
        return res.json()
      }),
    ])
      .then(([workoutData, logsData]) => {
        if (!cancelled) {
          setWorkout(workoutData)
          setLogs(logsData.data || [])
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

  const startEditing = useCallback(() => {
    if (!workout) return
    setEditName(workout.name)
    setEditIntensity(workout.intensity)
    setEditInstructions(workout.instructions || '')
    setEditCoachNotes(workout.coachNotes || '')
    setIsEditing(true)
  }, [workout])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  const saveEdits = useCallback(async () => {
    if (!workout || !workoutId) return
    setIsSaving(true)

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          intensity: editIntensity,
          instructions: editInstructions || null,
          coachNotes: editCoachNotes || null,
          segments: workout.segments.map((s) => ({
            type: s.type,
            duration: s.duration,
            distance: s.distance,
            pace: s.pace,
            zone: s.zone,
            heartRate: s.heartRate,
            notes: s.notes,
            exerciseId: s.exerciseId,
            sets: s.sets,
            reps: s.repsCount,
            weight: s.weight,
            rest: s.rest,
          })),
        }),
      })

      if (!response.ok) throw new Error('Kunde inte spara ändringar')

      setWorkout({
        ...workout,
        name: editName,
        intensity: editIntensity,
        instructions: editInstructions || null,
        coachNotes: editCoachNotes || null,
      })
      setIsEditing(false)
      toast({ title: 'Sparat', description: 'Passet har uppdaterats' })
      onWorkoutUpdated?.()
    } catch {
      toast({
        title: 'Fel',
        description: 'Kunde inte spara ändringar',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [workout, workoutId, editName, editIntensity, editInstructions, editCoachNotes, toast, onWorkoutUpdated])

  const groupedSegments = workout
    ? SECTION_ORDER.reduce<Record<string, WorkoutSegment[]>>((acc, section) => {
        const segs = workout.segments.filter((s) => s.section === section)
        if (segs.length > 0) acc[section] = segs
        return acc
      }, {})
    : {}

  const latestLog = logs.find((l) => l.completed) || null
  const athleteBasePath = businessSlug ? `/${businessSlug}` : ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          'w-full sm:max-w-lg overflow-y-auto',
          isGlass && 'bg-slate-900/95 border-white/10'
        )}
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className={cn(isGlass && 'text-white')}>
              Passdetaljer
            </SheetTitle>
            {workout && !isLoading && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startEditing}
                className={cn(
                  'h-8 gap-1.5',
                  isGlass && 'text-slate-400 hover:text-white hover:bg-white/10'
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Redigera
              </Button>
            )}
            {isEditing && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  className={cn('h-8', isGlass && 'text-slate-400 hover:text-white hover:bg-white/10')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdits}
                  disabled={isSaving}
                  className="h-8 gap-1.5"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Spara
                </Button>
              </div>
            )}
          </div>
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
            {/* Header - View or Edit mode */}
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                    Namn
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                  />
                </div>
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                    Intensitet
                  </label>
                  <Select value={editIntensity} onValueChange={setEditIntensity}>
                    <SelectTrigger className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INTENSITY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                    Instruktioner
                  </label>
                  <Textarea
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    rows={3}
                    className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                  />
                </div>
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                    Tränarens anteckningar
                  </label>
                  <Textarea
                    value={editCoachNotes}
                    onChange={(e) => setEditCoachNotes(e.target.value)}
                    rows={3}
                    className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                  />
                </div>
              </div>
            ) : (
              <div>
                <h3 className={cn('text-lg font-bold', isGlass ? 'text-white' : '')}>
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
                    className={cn('text-xs', isGlass && 'border-white/20 text-slate-400')}
                  >
                    {workout.type}
                  </Badge>
                  {latestLog && (
                    <Badge className="text-xs bg-green-600 text-white gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Genomfört
                    </Badge>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {workout.duration != null && workout.duration > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {workout.duration} min
                    </span>
                  )}
                  {workout.distance != null && workout.distance > 0 && (
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
            )}

            {/* Completion Results */}
            {latestLog && !isEditing && (
              <>
                <Separator className={cn(isGlass && 'bg-white/10')} />
                <LogResultsSection log={latestLog} workout={workout} isGlass={isGlass} />
              </>
            )}

            <Separator className={cn(isGlass && 'bg-white/10')} />

            {/* Instructions */}
            {!isEditing && workout.instructions && (
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
            {!isEditing && workout.coachNotes && (
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
            {!isEditing && Object.keys(groupedSegments).length > 0 ? (
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
            ) : !isEditing ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Inga segment i detta pass
              </p>
            ) : null}

            {/* Action buttons */}
            {!isEditing && !latestLog && !isCoachView && (
              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false)
                    window.location.href = `${athleteBasePath}/athlete/workouts/${workoutId}/log`
                  }}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Logga pass
                </Button>
              </div>
            )}

            {!isEditing && latestLog && !isCoachView && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  className={cn(
                    'w-full',
                    isGlass && 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  )}
                  onClick={() => {
                    onOpenChange(false)
                    window.location.href = `${athleteBasePath}/athlete/workouts/${workoutId}`
                  }}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Visa fullständig logg
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Log Results Section ──────────────────────────────────────────────

interface LogResultsSectionProps {
  log: WorkoutLog
  workout: WorkoutDetail
  isGlass: boolean
}

function LogResultsSection({ log, workout, isGlass }: LogResultsSectionProps) {
  const completedDate = log.completedAt
    ? new Date(log.completedAt).toLocaleDateString('sv-SE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-4',
      isGlass
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
    )}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Resultat
        </h4>
        {completedDate && (
          <span className="text-xs text-muted-foreground">{completedDate}</span>
        )}
      </div>

      {/* Actual vs Planned metrics */}
      <div className="grid grid-cols-2 gap-3">
        {(log.duration != null || (workout.duration != null && workout.duration > 0)) && (
          <MetricCard
            icon={<Clock className="h-4 w-4" />}
            label="Tid"
            actual={log.duration != null ? `${log.duration} min` : null}
            planned={workout.duration != null && workout.duration > 0 ? `${workout.duration} min` : null}
            isGlass={isGlass}
          />
        )}
        {(log.distance != null || (workout.distance != null && workout.distance > 0)) && (
          <MetricCard
            icon={<MapPin className="h-4 w-4" />}
            label="Distans"
            actual={log.distance != null ? `${log.distance} km` : null}
            planned={workout.distance != null && workout.distance > 0 ? `${workout.distance} km` : null}
            isGlass={isGlass}
          />
        )}
        {log.avgPace && (
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Tempo"
            actual={log.avgPace}
            isGlass={isGlass}
          />
        )}
        {log.avgHR != null && (
          <MetricCard
            icon={<Heart className="h-4 w-4" />}
            label="Puls"
            actual={`${log.avgHR} bpm`}
            extra={log.maxHR != null ? `Max: ${log.maxHR}` : undefined}
            isGlass={isGlass}
          />
        )}
        {log.avgPower != null && (
          <MetricCard
            icon={<Zap className="h-4 w-4" />}
            label="Effekt"
            actual={`${log.avgPower} W`}
            extra={log.normalizedPower != null ? `NP: ${log.normalizedPower} W` : undefined}
            isGlass={isGlass}
          />
        )}
        {log.perceivedEffort != null && (
          <MetricCard
            icon={<Gauge className="h-4 w-4" />}
            label="RPE"
            actual={`${log.perceivedEffort}/10`}
            isGlass={isGlass}
          />
        )}
      </div>

      {/* Extra cycling metrics */}
      {(log.avgCadence != null || log.elevation != null || log.tss != null) && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {log.avgCadence != null && <span>Kadens: {log.avgCadence} rpm</span>}
          {log.elevation != null && <span>Höjdmeter: {log.elevation} m</span>}
          {log.tss != null && <span>TSS: {log.tss.toFixed(0)}</span>}
        </div>
      )}

      {/* Feeling */}
      {log.feeling && (
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', FEELING_COLORS[log.feeling] || '')}>
            {FEELING_LABELS[log.feeling] || log.feeling}
          </span>
          {log.difficulty != null && (
            <span className="text-xs text-muted-foreground">
              Svårighet: {log.difficulty}/5
            </span>
          )}
        </div>
      )}

      {/* Athlete notes */}
      {log.notes && (
        <div>
          <h5 className={cn(
            'text-xs font-bold uppercase tracking-wider mb-1',
            isGlass ? 'text-slate-500' : 'text-muted-foreground'
          )}>
            Atletens anteckningar
          </h5>
          <p className={cn(
            'text-sm whitespace-pre-wrap',
            isGlass ? 'text-slate-300' : ''
          )}>
            {log.notes}
          </p>
        </div>
      )}

      {/* Coach feedback */}
      {log.coachFeedback && (
        <div className={cn(
          'rounded-lg border p-3',
          isGlass ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
        )}>
          <h5 className="text-xs font-bold uppercase tracking-wider mb-1 text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Tränarens feedback
          </h5>
          <p className={cn(
            'text-sm whitespace-pre-wrap',
            isGlass ? 'text-slate-300' : ''
          )}>
            {log.coachFeedback}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Metric Card ──────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  actual: string | null
  planned?: string | null
  extra?: string
  isGlass: boolean
}

function MetricCard({ icon, label, actual, planned, extra, isGlass }: MetricCardProps) {
  return (
    <div className={cn(
      'rounded-lg border p-2.5',
      isGlass ? 'bg-white/5 border-white/10' : 'bg-card'
    )}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      {actual ? (
        <p className={cn('text-sm font-bold', isGlass ? 'text-white' : '')}>
          {actual}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
      {planned && actual && planned !== actual && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Planerat: {planned}
        </p>
      )}
      {extra && (
        <p className="text-xs text-muted-foreground mt-0.5">{extra}</p>
      )}
    </div>
  )
}

// ── Section Icon ─────────────────────────────────────────────────────

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

// ── Segment Card ─────────────────────────────────────────────────────

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
