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
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/i18n/client'

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
    nameSv?: string | null
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
  day?: {
    week?: {
      program?: {
        id: string
      } | null
    } | null
  } | null
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

interface ExerciseOption {
  id: string
  name: string
  nameSv?: string | null
  category?: string | null
}

interface ExercisePayload {
  id: string
  name: string
  nameSv?: string | null
  category?: string | null
}

type AppLocale = 'en' | 'sv'

function getAppLocale(locale: string): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

function text(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

const SECTION_ORDER = ['WARMUP', 'MAIN', 'CORE', 'COOLDOWN'] as const
const SECTION_LABELS: Record<string, Record<AppLocale, string>> = {
  WARMUP: { sv: 'Uppvärmning', en: 'Warm-up' },
  MAIN: { sv: 'Huvudpass', en: 'Main set' },
  CORE: { sv: 'Core', en: 'Core' },
  COOLDOWN: { sv: 'Nedvarvning', en: 'Cool-down' },
}
const SECTION_COLORS: Record<string, string> = {
  WARMUP: 'text-amber-500',
  MAIN: 'text-blue-500',
  CORE: 'text-purple-500',
  COOLDOWN: 'text-green-500',
}

const INTENSITY_LABELS: Record<string, Record<AppLocale, string>> = {
  RECOVERY: { sv: 'Återhämtning', en: 'Recovery' },
  EASY: { sv: 'Lätt', en: 'Easy' },
  MODERATE: { sv: 'Måttlig', en: 'Moderate' },
  THRESHOLD: { sv: 'Tröskel', en: 'Threshold' },
  INTERVAL: { sv: 'Intervall', en: 'Interval' },
  MAX: { sv: 'Max', en: 'Max' },
}

const INTENSITY_COLORS: Record<string, string> = {
  RECOVERY: 'bg-blue-400',
  EASY: 'bg-green-500',
  MODERATE: 'bg-yellow-500',
  THRESHOLD: 'bg-orange-500',
  INTERVAL: 'bg-red-500',
  MAX: 'bg-fuchsia-600',
}

const WORKOUT_TYPE_OPTIONS = [
  'RUNNING',
  'STRENGTH',
  'PLYOMETRIC',
  'CORE',
  'RECOVERY',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
  'HYROX',
  'ALTERNATIVE',
  'OTHER',
] as const

const STRENGTH_TYPES = new Set(['STRENGTH', 'PLYOMETRIC', 'CORE'])
const STRENGTH_SEGMENT_TYPES = ['EXERCISE', 'WORK', 'REST'] as const
const CARDIO_SEGMENT_TYPES = ['WARMUP', 'WORK', 'INTERVAL', 'RECOVERY', 'COOLDOWN', 'REST'] as const

const FEELING_LABELS: Record<string, Record<AppLocale, string>> = {
  Great: { sv: 'Fantastiskt', en: 'Great' },
  Good: { sv: 'Bra', en: 'Good' },
  Okay: { sv: 'Okej', en: 'Okay' },
  Tired: { sv: 'Trött', en: 'Tired' },
  Struggled: { sv: 'Kämpigt', en: 'Struggled' },
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
  const locale = getAppLocale(useLocale())
  const { toast } = useToast()
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isGlass = variant === 'glass'

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [editIntensity, setEditIntensity] = useState('')
  const [editInstructions, setEditInstructions] = useState('')
  const [editCoachNotes, setEditCoachNotes] = useState('')
  const [editSegments, setEditSegments] = useState<WorkoutSegment[]>([])
  const [availableExercises, setAvailableExercises] = useState<ExerciseOption[]>([])

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
        if (!res.ok) throw new Error(text(locale, 'Kunde inte hämta passdetaljer', 'Could not load workout details'))
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
  }, [workoutId, open, locale])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    fetch('/api/exercises?limit=500')
      .then((res) => {
        if (!res.ok) return []
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const exercises = Array.isArray(data) ? data : data.exercises || []
        setAvailableExercises(
          exercises.map((exercise: ExercisePayload) => ({
            id: exercise.id,
            name: exercise.name,
            nameSv: exercise.nameSv,
            category: exercise.category,
          }))
        )
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableExercises([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [open])

  const startEditing = useCallback(() => {
    if (!workout) return
    setEditName(workout.name)
    setEditType(workout.type)
    setEditIntensity(workout.intensity)
    setEditInstructions(workout.instructions || '')
    setEditCoachNotes(workout.coachNotes || '')
    setEditSegments(workout.segments.map((segment) => ({ ...segment })))
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
          type: editType,
          intensity: editIntensity,
          instructions: editInstructions || null,
          coachNotes: editCoachNotes || null,
          segments: editSegments.map((s) => ({
            section: s.section,
            type: s.type,
            duration: s.duration,
            distance: s.distance,
            pace: s.pace,
            zone: s.zone,
            heartRate: s.heartRate,
            power: s.power,
            description: s.description,
            notes: s.notes,
            exerciseId: s.exerciseId,
            sets: s.sets,
            reps: s.repsCount,
            repsCount: s.repsCount,
            weight: s.weight,
            tempo: s.tempo,
            rest: s.rest,
          })),
        }),
      })

      if (!response.ok) throw new Error(text(locale, 'Kunde inte spara ändringar', 'Could not save changes'))

      setWorkout({
        ...workout,
        name: editName,
        type: editType,
        intensity: editIntensity,
        instructions: editInstructions || null,
        coachNotes: editCoachNotes || null,
        segments: editSegments,
      })
      setIsEditing(false)
      toast({
        title: text(locale, 'Sparat', 'Saved'),
        description: text(locale, 'Passet har uppdaterats', 'The workout has been updated'),
      })
      onWorkoutUpdated?.()
    } catch {
      toast({
        title: text(locale, 'Fel', 'Error'),
        description: text(locale, 'Kunde inte spara ändringar', 'Could not save changes'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [workout, workoutId, editName, editType, editIntensity, editInstructions, editCoachNotes, editSegments, toast, onWorkoutUpdated, locale])

  const isStrengthWorkout = STRENGTH_TYPES.has((isEditing ? editType : workout?.type) || '')

  const updateSegment = useCallback((index: number, field: keyof WorkoutSegment, value: string | number | null) => {
    setEditSegments((current) =>
      current.map((segment, currentIndex) =>
        currentIndex === index
          ? { ...segment, [field]: value }
          : segment
      )
    )
  }, [])

  const removeSegment = useCallback((index: number) => {
    setEditSegments((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }, [])

  const updateSegmentExercise = useCallback((index: number, exerciseId: string) => {
    const selectedExercise = availableExercises.find((exercise) => exercise.id === exerciseId) || null
    setEditSegments((current) =>
      current.map((segment, currentIndex) =>
        currentIndex === index
          ? {
              ...segment,
              exerciseId,
              exercise: selectedExercise
                ? {
                    id: selectedExercise.id,
                    name: selectedExercise.name,
                    nameSv: selectedExercise.nameSv,
                    category: selectedExercise.category,
                    muscleGroup: null,
                  }
                : null,
            }
          : segment
      )
    )
  }, [availableExercises])

  const addSegment = useCallback(() => {
    setEditSegments((current) => [
      ...current,
      {
        id: `temp-${crypto.randomUUID()}`,
        order: current.length + 1,
        type: isStrengthWorkout ? 'EXERCISE' : 'WORK',
        duration: isStrengthWorkout ? null : 10,
        distance: null,
        pace: null,
        zone: null,
        heartRate: null,
        power: null,
        reps: null,
        exerciseId: null,
        sets: isStrengthWorkout ? 3 : null,
        repsCount: isStrengthWorkout ? '10' : null,
        weight: null,
        tempo: null,
        rest: isStrengthWorkout ? 90 : null,
        section: 'MAIN',
        description: null,
        notes: null,
        exercise: null,
      },
    ])
  }, [isStrengthWorkout])

  const deleteWorkout = useCallback(async () => {
    if (!workoutId) return
    const confirmed = window.confirm(text(locale, 'Vill du ta bort detta pass? Detta kan inte ångras.', 'Delete this workout? This cannot be undone.'))
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(text(locale, 'Kunde inte ta bort passet', 'Could not delete the workout'))
      }

      toast({
        title: text(locale, 'Pass borttaget', 'Workout deleted'),
        description: text(locale, 'Passet har tagits bort från kalendern', 'The workout has been removed from the calendar'),
      })
      onOpenChange(false)
      onWorkoutUpdated?.()
    } catch {
      toast({
        title: text(locale, 'Fel', 'Error'),
        description: text(locale, 'Kunde inte ta bort passet', 'Could not delete the workout'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [workoutId, toast, onOpenChange, onWorkoutUpdated, locale])

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
              {text(locale, 'Passdetaljer', 'Workout details')}
            </SheetTitle>
            {workout && !isLoading && !isEditing && (
              <div className="flex items-center gap-1">
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
                  {text(locale, 'Redigera', 'Edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteWorkout}
                  disabled={isDeleting}
                  className={cn(
                    'h-8 gap-1.5 text-red-600 hover:text-red-700',
                    isGlass && 'text-red-400 hover:text-red-300 hover:bg-white/10'
                  )}
                >
                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {text(locale, 'Ta bort', 'Delete')}
                </Button>
              </div>
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
                  {text(locale, 'Spara', 'Save')}
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
                    {text(locale, 'Namn', 'Name')}
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                  />
                </div>
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                    {text(locale, 'Typ', 'Type')}
                  </label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKOUT_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                    {text(locale, 'Intensitet', 'Intensity')}
                  </label>
                  <Select value={editIntensity} onValueChange={setEditIntensity}>
                    <SelectTrigger className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INTENSITY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label[locale]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                    {text(locale, 'Instruktioner', 'Instructions')}
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
                    {text(locale, 'Tränarens anteckningar', "Coach's notes")}
                  </label>
                  <Textarea
                    value={editCoachNotes}
                    onChange={(e) => setEditCoachNotes(e.target.value)}
                    rows={3}
                    className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={cn('text-xs font-bold uppercase tracking-wider block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                      {text(locale, 'Segment', 'Segments')}
                    </label>
                    <Button type="button" variant="outline" size="sm" onClick={addSegment}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {text(locale, 'Lägg till segment', 'Add segment')}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {editSegments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className={cn(
                          'rounded-lg border p-3 space-y-3',
                          isGlass ? 'border-white/10 bg-white/5' : 'border-border bg-muted/30'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={cn('text-xs font-bold uppercase tracking-wider', isGlass ? 'text-slate-400' : 'text-muted-foreground')}>
                            {text(locale, 'Segment', 'Segment')} {index + 1}
                          </span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeSegment(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                              {text(locale, 'Sektion', 'Section')}
                            </label>
                            <Select value={segment.section} onValueChange={(value) => updateSegment(index, 'section', value)}>
                              <SelectTrigger className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SECTION_ORDER.map((section) => (
                                  <SelectItem key={section} value={section}>{SECTION_LABELS[section][locale]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                              {text(locale, 'Segmenttyp', 'Segment type')}
                            </label>
                            <Select value={segment.type} onValueChange={(value) => updateSegment(index, 'type', value)}>
                              <SelectTrigger className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(isStrengthWorkout ? STRENGTH_SEGMENT_TYPES : CARDIO_SEGMENT_TYPES).map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                              {text(locale, 'Beskrivning', 'Description')}
                            </label>
                            <Input
                              value={segment.description || ''}
                              onChange={(e) => updateSegment(index, 'description', e.target.value || null)}
                              className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                            />
                          </div>
                          <div>
                            <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                              {text(locale, 'Anteckningar', 'Notes')}
                            </label>
                            <Input
                              value={segment.notes || ''}
                              onChange={(e) => updateSegment(index, 'notes', e.target.value || null)}
                              className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                            />
                          </div>
                          {isStrengthWorkout ? (
                            <>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Övning', 'Exercise')}
                                </label>
                                <Select
                                  value={segment.exerciseId || '__none__'}
                                  onValueChange={(value) => {
                                    if (value === '__none__') {
                                      updateSegment(index, 'exerciseId', null)
                                      updateSegment(index, 'exercise', null)
                                      return
                                    }
                                    updateSegmentExercise(index, value)
                                  }}
                                >
                                  <SelectTrigger className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}>
                                    <SelectValue placeholder={text(locale, 'Välj övning', 'Choose exercise')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">{text(locale, 'Ingen övning', 'No exercise')}</SelectItem>
                                    {availableExercises
                                      .filter((exercise) => !exercise.category || STRENGTH_TYPES.has(exercise.category))
                                      .map((exercise) => (
                                        <SelectItem key={exercise.id} value={exercise.id}>
                                          {locale === 'sv' ? exercise.nameSv || exercise.name : exercise.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  Set
                                </label>
                                <Input
                                  type="number"
                                  value={segment.sets ?? ''}
                                  onChange={(e) => updateSegment(index, 'sets', e.target.value ? Number(e.target.value) : null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  Reps
                                </label>
                                <Input
                                  value={segment.repsCount || ''}
                                  onChange={(e) => updateSegment(index, 'repsCount', e.target.value || null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Vikt', 'Weight')}
                                </label>
                                <Input
                                  value={segment.weight || ''}
                                  onChange={(e) => updateSegment(index, 'weight', e.target.value || null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Tempo', 'Tempo')}
                                </label>
                                <Input
                                  value={segment.tempo || ''}
                                  onChange={(e) => updateSegment(index, 'tempo', e.target.value || null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Vila (sek)', 'Rest (sec)')}
                                </label>
                                <Input
                                  type="number"
                                  value={segment.rest ?? ''}
                                  onChange={(e) => updateSegment(index, 'rest', e.target.value ? Number(e.target.value) : null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Tid (min)', 'Time (min)')}
                                </label>
                                <Input
                                  type="number"
                                  value={segment.duration ?? ''}
                                  onChange={(e) => updateSegment(index, 'duration', e.target.value ? Number(e.target.value) : null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Distans (km)', 'Distance (km)')}
                                </label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={segment.distance ?? ''}
                                  onChange={(e) => updateSegment(index, 'distance', e.target.value ? Number(e.target.value) : null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Tempo', 'Pace')}
                                </label>
                                <Input
                                  value={segment.pace || ''}
                                  onChange={(e) => updateSegment(index, 'pace', e.target.value || null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Zon', 'Zone')}
                                </label>
                                <Input
                                  type="number"
                                  value={segment.zone ?? ''}
                                  onChange={(e) => updateSegment(index, 'zone', e.target.value ? Number(e.target.value) : null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Puls', 'Heart rate')}
                                </label>
                                <Input
                                  value={segment.heartRate || ''}
                                  onChange={(e) => updateSegment(index, 'heartRate', e.target.value || null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                              <div>
                                <label className={cn('text-xs font-bold uppercase tracking-wider mb-1.5 block', isGlass ? 'text-slate-500' : 'text-muted-foreground')}>
                                  {text(locale, 'Effekt', 'Power')}
                                </label>
                                <Input
                                  type="number"
                                  value={segment.power ?? ''}
                                  onChange={(e) => updateSegment(index, 'power', e.target.value ? Number(e.target.value) : null)}
                                  className={cn(isGlass && 'bg-white/5 border-white/10 text-white')}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                    {INTENSITY_LABELS[workout.intensity]?.[locale] || workout.intensity}
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
                      {text(locale, 'Genomfört', 'Completed')}
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
                    {workout.segments.length} {text(locale, 'segment', 'segments')}
                  </span>
                </div>
              </div>
            )}

            {/* Completion Results */}
            {latestLog && !isEditing && (
              <>
                <Separator className={cn(isGlass && 'bg-white/10')} />
                <LogResultsSection log={latestLog} workout={workout} isGlass={isGlass} locale={locale} />
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
                  {text(locale, 'Instruktioner', 'Instructions')}
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
                  {text(locale, 'Tränarens anteckningar', "Coach's notes")}
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
                        {SECTION_LABELS[section]?.[locale] || section}
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
                            locale={locale}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : !isEditing ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {text(locale, 'Inga segment i detta pass', 'No segments in this workout')}
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
                  {text(locale, 'Logga pass', 'Log workout')}
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
                  {text(locale, 'Visa fullständig logg', 'View full log')}
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
  locale: AppLocale
}

function LogResultsSection({ log, workout, isGlass, locale }: LogResultsSectionProps) {
  const completedDate = log.completedAt
    ? new Date(log.completedAt).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US', {
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
          {text(locale, 'Resultat', 'Results')}
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
            label={text(locale, 'Tid', 'Time')}
            actual={log.duration != null ? `${log.duration} min` : null}
            planned={workout.duration != null && workout.duration > 0 ? `${workout.duration} min` : null}
            isGlass={isGlass}
            locale={locale}
          />
        )}
        {(log.distance != null || (workout.distance != null && workout.distance > 0)) && (
          <MetricCard
            icon={<MapPin className="h-4 w-4" />}
            label={text(locale, 'Distans', 'Distance')}
            actual={log.distance != null ? `${log.distance} km` : null}
            planned={workout.distance != null && workout.distance > 0 ? `${workout.distance} km` : null}
            isGlass={isGlass}
            locale={locale}
          />
        )}
        {log.avgPace && (
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label={text(locale, 'Tempo', 'Pace')}
            actual={log.avgPace}
            isGlass={isGlass}
            locale={locale}
          />
        )}
        {log.avgHR != null && (
          <MetricCard
            icon={<Heart className="h-4 w-4" />}
            label={text(locale, 'Puls', 'Heart rate')}
            actual={`${log.avgHR} bpm`}
            extra={log.maxHR != null ? `Max: ${log.maxHR}` : undefined}
            isGlass={isGlass}
            locale={locale}
          />
        )}
        {log.avgPower != null && (
          <MetricCard
            icon={<Zap className="h-4 w-4" />}
            label={text(locale, 'Effekt', 'Power')}
            actual={`${log.avgPower} W`}
            extra={log.normalizedPower != null ? `NP: ${log.normalizedPower} W` : undefined}
            isGlass={isGlass}
            locale={locale}
          />
        )}
        {log.perceivedEffort != null && (
          <MetricCard
            icon={<Gauge className="h-4 w-4" />}
            label="RPE"
            actual={`${log.perceivedEffort}/10`}
            isGlass={isGlass}
            locale={locale}
          />
        )}
      </div>

      {/* Extra cycling metrics */}
      {(log.avgCadence != null || log.elevation != null || log.tss != null) && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {log.avgCadence != null && <span>{text(locale, 'Kadens', 'Cadence')}: {log.avgCadence} rpm</span>}
          {log.elevation != null && <span>{text(locale, 'Höjdmeter', 'Elevation gain')}: {log.elevation} m</span>}
          {log.tss != null && <span>TSS: {log.tss.toFixed(0)}</span>}
        </div>
      )}

      {/* Feeling */}
      {log.feeling && (
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', FEELING_COLORS[log.feeling] || '')}>
            {FEELING_LABELS[log.feeling]?.[locale] || log.feeling}
          </span>
          {log.difficulty != null && (
            <span className="text-xs text-muted-foreground">
              {text(locale, 'Svårighet', 'Difficulty')}: {log.difficulty}/5
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
            {text(locale, 'Atletens anteckningar', "Athlete's notes")}
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
            {text(locale, 'Tränarens feedback', "Coach's feedback")}
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
  locale: AppLocale
}

function MetricCard({ icon, label, actual, planned, extra, isGlass, locale }: MetricCardProps) {
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
          {text(locale, 'Planerat', 'Planned')}: {planned}
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

function SegmentCard({ segment, isGlass, locale }: { segment: WorkoutSegment; isGlass: boolean; locale: AppLocale }) {
  const isExercise = segment.type === 'exercise' || segment.type === 'work'
  const isInterval = segment.type === 'interval'
  const isRest = segment.type === 'rest' || segment.type === 'recovery'
  const isWarmupCooldown = segment.type === 'warmup' || segment.type === 'cooldown'

  const exerciseName = (
    locale === 'sv'
      ? segment.exercise?.nameSv || segment.exercise?.name
      : segment.exercise?.name
  ) || segment.description || segmentTypeLabel(segment.type, locale)

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
                  <span>{text(locale, 'Tempo', 'Tempo')}: {segment.tempo}</span>
                )}
                {segment.rest != null && segment.rest > 0 && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {text(locale, 'Vila', 'Rest')} {segment.rest}s
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
                {segment.pace && <span>{text(locale, 'Tempo', 'Pace')}: {segment.pace}</span>}
                {segment.zone != null && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {text(locale, 'Zon', 'Zone')} {segment.zone}
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
                {segment.duration} min {text(locale, 'vila', 'rest')}
              </span>
            )}
          </div>
        </div>

        {/* Zone badge on the right */}
        {segment.zone != null && isExercise && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
            {text(locale, 'Zon', 'Zone')} {segment.zone}
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

function segmentTypeLabel(type: string, locale: AppLocale): string {
  const labels: Record<string, Record<AppLocale, string>> = {
    warmup: { sv: 'Uppvärmning', en: 'Warm-up' },
    interval: { sv: 'Intervall', en: 'Interval' },
    cooldown: { sv: 'Nedvarvning', en: 'Cool-down' },
    exercise: { sv: 'Övning', en: 'Exercise' },
    work: { sv: 'Arbete', en: 'Work' },
    rest: { sv: 'Vila', en: 'Rest' },
    recovery: { sv: 'Återhämtning', en: 'Recovery' },
  }
  return labels[type]?.[locale] || type
}
