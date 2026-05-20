'use client'

/**
 * Draft Workout Editor Dialog
 *
 * Allows editing of AI-generated workouts before saving to database.
 * Works with ParsedWorkout data structure from program-parser.
 * Integrates with Data Moat system to capture coach decision feedback.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Dumbbell,
  Heart,
  Flame,
  Plus,
  Trash2,
  GripVertical,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useLocale } from '@/i18n/client'
import type { ParsedWorkout, ParsedWorkoutSegment } from '@/lib/ai/program-parser'
import { ExercisePicker } from '@/components/ai-studio/ExercisePicker'
import {
  CoachDecisionModal,
  useCoachDecision,
  type AthleteContext,
} from '@/components/data-moat/CoachDecisionModal'

interface DraftWorkoutEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workout: ParsedWorkout
  dayName: string
  phaseName: string
  onSave: (workout: ParsedWorkout) => void
  // Data Moat integration props
  athleteId?: string
  athleteName?: string
  athleteContext?: AthleteContext
  isAIGenerated?: boolean
}

type AppLocale = 'en' | 'sv'

// Workout types
const workoutTypes = [
  { value: 'RUNNING', label: { en: 'Running', sv: 'Löpning' }, icon: Heart },
  { value: 'CYCLING', label: { en: 'Cycling', sv: 'Cykling' }, icon: Flame },
  { value: 'SWIMMING', label: { en: 'Swimming', sv: 'Simning' }, icon: Heart },
  { value: 'STRENGTH', label: { en: 'Strength', sv: 'Styrka' }, icon: Dumbbell },
  { value: 'CROSS_TRAINING', label: { en: 'Cross-training', sv: 'Cross-training' }, icon: Flame },
  { value: 'RECOVERY', label: { en: 'Recovery', sv: 'Återhämtning' }, icon: Clock },
  { value: 'REHAB', label: { en: 'Rehab', sv: 'Rehab' }, icon: Heart },
  { value: 'HYROX', label: { en: 'HYROX', sv: 'HYROX' }, icon: Flame },
]

// Intensity levels
const intensityLevels = [
  { value: 'easy', label: { en: 'Easy', sv: 'Lätt' }, color: 'bg-green-100 text-green-800' },
  { value: 'moderate', label: { en: 'Moderate', sv: 'Medel' }, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: { en: 'Hard', sv: 'Hård' }, color: 'bg-red-100 text-red-800' },
  { value: 'race_pace', label: { en: 'Race pace', sv: 'Tävlingstempo' }, color: 'bg-purple-100 text-purple-800' },
]

// Segment types (used for both endurance and strength — "exercise" is the strength-style marker)
const segmentTypes = [
  { value: 'warmup', label: { en: 'Warm-up', sv: 'Uppvärmning' } },
  { value: 'work', label: { en: 'Work', sv: 'Arbete' } },
  { value: 'interval', label: { en: 'Interval', sv: 'Intervall' } },
  { value: 'exercise', label: { en: 'Exercise (strength)', sv: 'Övning (styrka)' } },
  { value: 'recovery', label: { en: 'Recovery', sv: 'Återhämtning' } },
  { value: 'rest', label: { en: 'Rest', sv: 'Vila' } },
  { value: 'cooldown', label: { en: 'Cool-down', sv: 'Nedvarvning' } },
]

// Section grouping (for strength workouts)
const sectionOptions = [
  { value: 'WARMUP', label: { en: 'Warm-up', sv: 'Uppvärmning' } },
  { value: 'MAIN', label: { en: 'Main', sv: 'Huvuddel' } },
  { value: 'CORE', label: { en: 'Core', sv: 'Bål' } },
  { value: 'COOLDOWN', label: { en: 'Cool-down', sv: 'Nedvarvning' } },
]

const STRENGTH_WORKOUT_TYPES = ['STRENGTH', 'CORE', 'PLYOMETRIC', 'REHAB', 'HYROX']

function isStrengthSegmentType(t?: string) {
  return t === 'exercise'
}

/**
 * Generate an opaque id for a draft segment. Used as the dnd-kit sort key so
 * reorders preserve focus / expansion state without tying the id to array
 * index or mutable content.
 */
function makeSegmentKey(): string {
  return `seg-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Thin sortable wrapper for a draft segment. Uses a render prop so we can
 * apply the drag handle listeners only to the GripVertical icon while the
 * rest of the card (inputs, selects) stays fully interactive.
 */
function SortableSegment({
  id,
  children,
}: {
  id: string
  children: (args: {
    handleProps: {
      onPointerDown?: React.PointerEventHandler
      onKeyDown?: React.KeyboardEventHandler
    }
    isDragging: boolean
  }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.9 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ handleProps: listeners ?? {}, isDragging })}
    </div>
  )
}

// Zone options (zone is numeric 1-5)
const zoneOptions = [
  { value: 1, label: { en: 'Zone 1 - Recovery', sv: 'Zon 1 - Återhämtning' } },
  { value: 2, label: { en: 'Zone 2 - Aerobic base', sv: 'Zon 2 - Aerob bas' } },
  { value: 3, label: { en: 'Zone 3 - Tempo', sv: 'Zon 3 - Tempo' } },
  { value: 4, label: { en: 'Zone 4 - Threshold', sv: 'Zon 4 - Tröskel' } },
  { value: 5, label: { en: 'Zone 5 - VO2max', sv: 'Zon 5 - VO2max' } },
]

const dayLabels: Record<string, Record<AppLocale, string>> = {
  monday: { en: 'Monday', sv: 'Måndag' },
  tuesday: { en: 'Tuesday', sv: 'Tisdag' },
  wednesday: { en: 'Wednesday', sv: 'Onsdag' },
  thursday: { en: 'Thursday', sv: 'Torsdag' },
  friday: { en: 'Friday', sv: 'Fredag' },
  saturday: { en: 'Saturday', sv: 'Lördag' },
  sunday: { en: 'Sunday', sv: 'Söndag' },
}

const COPY: Record<AppLocale, {
  editWorkout: string
  workoutName: string
  workoutPlaceholder: string
  type: string
  intensity: string
  durationMinutes: string
  calculatedFromSegments: string
  distanceKm: string
  distancePlaceholder: string
  description: string
  descriptionPlaceholder: string
  segments: string
  strengthSegmentsHint: string
  enduranceSegmentsHint: string
  add: string
  noSegments: string
  addSegmentHint: string
  dragToSort: string
  repsPlaceholder: string
  weightPlaceholder: string
  restPlaceholder: string
  segmentDescriptionPlaceholder: string
  timePlaceholder: string
  distanceShortPlaceholder: string
  zonePlaceholder: string
  hideMoreFields: string
  showMoreFields: string
  muscleGroup: string
  muscleGroupPlaceholder: string
  timeMin: string
  minutesPlaceholder: string
  repsIntervalCount: string
  countPlaceholder: string
  loadPerWeek: string
  loadPerWeekHint: string
  repsIntervals: string
  restSeconds: string
  secondsPlaceholder: string
  notes: string
  notesPlaceholder: string
  total: string
  cancel: string
  saveChanges: string
}> = {
  en: {
    editWorkout: 'Edit workout',
    workoutName: 'Workout name',
    workoutPlaceholder: 'e.g. Long run, intervals, Strength A...',
    type: 'Type',
    intensity: 'Intensity',
    durationMinutes: 'Duration (minutes)',
    calculatedFromSegments: 'Calculated from segments',
    distanceKm: 'Distance (km)',
    distancePlaceholder: 'e.g. 10 or 8-10',
    description: 'Description',
    descriptionPlaceholder: 'Detailed instructions for the workout...',
    segments: 'Segments',
    strengthSegmentsHint: 'Each segment is an exercise with sets, reps, and weight',
    enduranceSegmentsHint: 'Split the workout into warm-up, work, and cool-down',
    add: 'Add',
    noSegments: 'No segments added',
    addSegmentHint: 'Click "Add" to structure the workout',
    dragToSort: 'Drag to sort',
    repsPlaceholder: 'Reps (e.g. 8-10)',
    weightPlaceholder: 'Weight (kg)',
    restPlaceholder: 'Rest',
    segmentDescriptionPlaceholder: 'Description / coach notes',
    timePlaceholder: 'Time',
    distanceShortPlaceholder: 'Dist',
    zonePlaceholder: 'Zone',
    hideMoreFields: 'Hide more fields',
    showMoreFields: 'Show more fields',
    muscleGroup: 'Muscle group',
    muscleGroupPlaceholder: 'Quads, back...',
    timeMin: 'Time (min)',
    minutesPlaceholder: 'Minutes',
    repsIntervalCount: 'Reps (interval count)',
    countPlaceholder: 'Count',
    loadPerWeek: 'Load per week',
    loadPerWeekHint: 'Each week gets its own load when the program is saved.',
    repsIntervals: 'Reps (intervals)',
    restSeconds: 'Rest (s)',
    secondsPlaceholder: 'Seconds',
    notes: 'Notes',
    notesPlaceholder: 'Optional notes for the workout...',
    total: 'Total',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
  },
  sv: {
    editWorkout: 'Redigera pass',
    workoutName: 'Passnamn',
    workoutPlaceholder: 'T.ex. Långpass, Intervaller, Styrka A...',
    type: 'Typ',
    intensity: 'Intensitet',
    durationMinutes: 'Längd (minuter)',
    calculatedFromSegments: 'Beräknat från segment',
    distanceKm: 'Distans (km)',
    distancePlaceholder: 'T.ex. 10 eller 8-10',
    description: 'Beskrivning',
    descriptionPlaceholder: 'Detaljerade instruktioner för passet...',
    segments: 'Segment',
    strengthSegmentsHint: 'Varje segment är en övning med set, reps och vikt',
    enduranceSegmentsHint: 'Dela upp passet i uppvärmning, arbete och nedvarvning',
    add: 'Lägg till',
    noSegments: 'Inga segment tillagda',
    addSegmentHint: 'Klicka "Lägg till" för att strukturera passet',
    dragToSort: 'Dra för att sortera',
    repsPlaceholder: 'Reps (t.ex. 8-10)',
    weightPlaceholder: 'Vikt (kg)',
    restPlaceholder: 'Vila',
    segmentDescriptionPlaceholder: 'Beskrivning / coach notes',
    timePlaceholder: 'Tid',
    distanceShortPlaceholder: 'Dist',
    zonePlaceholder: 'Zon',
    hideMoreFields: 'Dölj fler fält',
    showMoreFields: 'Visa fler fält',
    muscleGroup: 'Muskelgrupp',
    muscleGroupPlaceholder: 'Quads, Rygg...',
    timeMin: 'Tid (min)',
    minutesPlaceholder: 'Minuter',
    repsIntervalCount: 'Reps (interval count)',
    countPlaceholder: 'Antal',
    loadPerWeek: 'Belastning per vecka',
    loadPerWeekHint: 'Varje vecka får sin egen belastning när programmet sparas.',
    repsIntervals: 'Reps (intervaller)',
    restSeconds: 'Vila (s)',
    secondsPlaceholder: 'Sekunder',
    notes: 'Anteckningar',
    notesPlaceholder: 'Valfria anteckningar för passet...',
    total: 'Totalt',
    cancel: 'Avbryt',
    saveChanges: 'Spara ändringar',
  },
}

export function DraftWorkoutEditor({
  open,
  onOpenChange,
  workout,
  dayName,
  phaseName,
  onSave,
  athleteId,
  athleteName,
  athleteContext,
  isAIGenerated = false,
}: DraftWorkoutEditorProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const copy = COPY[locale]
  // Type definitions from schema
  type WorkoutType = ParsedWorkout['type']
  type WorkoutIntensity = NonNullable<ParsedWorkout['intensity']>

  // Local state for editing
  const [name, setName] = useState(workout.name || '')
  const [type, setType] = useState<WorkoutType>(workout.type || 'RUNNING')
  const [intensity, setIntensity] = useState<WorkoutIntensity>(workout.intensity || 'moderate')
  const [duration, setDuration] = useState(workout.duration || 60)
  const [distance, setDistance] = useState(workout.distance || '')
  const [description, setDescription] = useState(workout.description || '')
  const [segments, setSegments] = useState<ParsedWorkoutSegment[]>(workout.segments || [])
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set())

  // Stable keys for the dnd-kit SortableContext. Parallel to `segments`; we
  // never derive these from index or content so reorders don't lose focus.
  const [segmentKeys, setSegmentKeys] = useState<string[]>(() =>
    (workout.segments || []).map(() => makeSegmentKey())
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Data Moat: Store original AI workout for comparison
  const originalWorkoutRef = useRef<ParsedWorkout | null>(null)
  const {
    isOpen: isDecisionModalOpen,
    setIsOpen: setDecisionModalOpen,
    pendingDecision,
    triggerDecisionModal,
    submitDecision,
  } = useCoachDecision()

  // Reset state when workout changes
  useEffect(() => {
    setName(workout.name || '')
    setType(workout.type || 'RUNNING')
    setIntensity(workout.intensity || 'moderate')
    setDuration(workout.duration || 60)
    setDistance(workout.distance || '')
    setDescription(workout.description || '')
    setSegments(workout.segments || [])
    setSegmentKeys((workout.segments || []).map(() => makeSegmentKey()))

    // Data Moat: Store the original AI-generated workout for comparison
    if (isAIGenerated && !originalWorkoutRef.current) {
      originalWorkoutRef.current = { ...workout }
    }
  }, [workout, isAIGenerated])

  // Strength-style workouts default new segments to the exercise type
  const isStrengthWorkout = STRENGTH_WORKOUT_TYPES.includes(type)

  // Calculate total duration from segments if any segment carries a duration.
  // Strength segments typically don't have durations (sets/reps instead), so we
  // let the user set the workout duration manually in that case.
  const segmentDurationTotal = segments.reduce((total, seg) => total + (seg.duration || 0), 0)
  const useSegmentDuration = segments.length > 0 && segmentDurationTotal > 0
  const calculatedDuration = useSegmentDuration ? segmentDurationTotal : duration

  // Add new segment
  const handleAddSegment = () => {
    const newSegment: ParsedWorkoutSegment = isStrengthWorkout
      ? {
          order: segments.length,
          type: 'exercise',
          sets: 3,
          repsCount: '8-10',
          rest: 90,
          section: 'MAIN',
          description: '',
        }
      : {
          order: segments.length,
          type: 'work',
          duration: 10,
          zone: 2,
          description: '',
        }
    setSegments([...segments, newSegment])
    setSegmentKeys([...segmentKeys, makeSegmentKey()])
  }

  // Update segment
  const handleUpdateSegment = (index: number, field: keyof ParsedWorkoutSegment, value: string | number) => {
    const updated = [...segments]
    updated[index] = { ...updated[index], [field]: value }
    setSegments(updated)
  }

  // Remove segment
  const handleRemoveSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index))
    setSegmentKeys(segmentKeys.filter((_, i) => i !== index))
    setExpandedSegments((prev) => {
      const next = new Set<number>()
      prev.forEach((i) => {
        if (i < index) next.add(i)
        else if (i > index) next.add(i - 1)
      })
      return next
    })
  }

  // Drag reorder handler (dnd-kit)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = segmentKeys.indexOf(String(active.id))
    const to = segmentKeys.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    setSegments((prev) => arrayMove(prev, from, to))
    setSegmentKeys((prev) => arrayMove(prev, from, to))
    // Collapse expanded-state remap on reorder — cheaper than translating
    // indices precisely. Users rarely drag while a row is expanded.
    setExpandedSegments(new Set())
  }

  // Data Moat: Check if workout was modified from AI suggestion
  const wasModified = (updatedWorkout: ParsedWorkout): boolean => {
    if (!originalWorkoutRef.current || !isAIGenerated) return false

    const original = originalWorkoutRef.current
    return (
      original.name !== updatedWorkout.name ||
      original.type !== updatedWorkout.type ||
      original.intensity !== updatedWorkout.intensity ||
      original.duration !== updatedWorkout.duration ||
      original.distance !== updatedWorkout.distance ||
      original.description !== updatedWorkout.description ||
      JSON.stringify(original.segments) !== JSON.stringify(updatedWorkout.segments)
    )
  }

  // Data Moat: Generate human-readable summary of changes
  const generateSummaries = (
    original: ParsedWorkout,
    modified: ParsedWorkout
  ): { suggestionSummary: string; modificationSummary: string } => {
    const originalParts: string[] = []
    const modifiedParts: string[] = []

    if (original.name) originalParts.push(original.name)
    if (original.type) originalParts.push(original.type.toLowerCase())
    if (original.duration) originalParts.push(`${original.duration} min`)
    if (original.intensity) originalParts.push(original.intensity)

    if (modified.name) modifiedParts.push(modified.name)
    if (modified.type) modifiedParts.push(modified.type.toLowerCase())
    if (modified.duration) modifiedParts.push(`${modified.duration} min`)
    if (modified.intensity) modifiedParts.push(modified.intensity)

    return {
      suggestionSummary: originalParts.join(', ') || 'AI workout',
      modificationSummary: modifiedParts.join(', ') || 'Modified workout',
    }
  }

  // Handle save
  const handleSave = () => {
    // Parse distance - handle both number and string inputs like "10" or "8-10"
    let parsedDistance: number | undefined = undefined
    if (distance) {
      const numVal = parseFloat(String(distance))
      if (!isNaN(numVal)) {
        parsedDistance = numVal
      }
    }

    const updatedWorkout: ParsedWorkout = {
      ...workout,
      name,
      type,
      intensity,
      duration: calculatedDuration,
      distance: parsedDistance,
      description: description || '',
      segments: segments.length > 0 ? segments : undefined,
    }

    // Data Moat: Check if modifications were made and athlete info is available
    if (isAIGenerated && athleteId && athleteName && wasModified(updatedWorkout)) {
      const original = originalWorkoutRef.current!
      const summaries = generateSummaries(original, updatedWorkout)

      // Save the workout first
      onSave(updatedWorkout)
      onOpenChange(false)

      // Then trigger the decision modal
      triggerDecisionModal({
        athleteId,
        athleteName,
        aiSuggestionType: 'WORKOUT',
        aiSuggestionData: original as unknown as Record<string, unknown>,
        modificationData: updatedWorkout as unknown as Record<string, unknown>,
        aiConfidence: 0.8, // Default AI confidence for workout generation
        athleteContext,
        suggestionSummary: summaries.suggestionSummary,
        modificationSummary: summaries.modificationSummary,
      })

      // Reset original workout ref for next edit
      originalWorkoutRef.current = null
    } else {
      onSave(updatedWorkout)
      onOpenChange(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            {copy.editWorkout}
          </DialogTitle>
          <DialogDescription>
            {phaseName} - {dayLabels[dayName]?.[locale] || dayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{copy.workoutName}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.workoutPlaceholder}
              />
            </div>

            {/* Type and Intensity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{copy.type}</Label>
                <Select value={type} onValueChange={(v) => setType(v as WorkoutType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workoutTypes.map((wt) => (
                      <SelectItem key={wt.value} value={wt.value}>
                        <span className="flex items-center gap-2">
                          <wt.icon className="h-4 w-4" />
                          {wt.label[locale]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{copy.intensity}</Label>
                <Select value={intensity} onValueChange={(v) => setIntensity(v as WorkoutIntensity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intensityLevels.map((il) => (
                      <SelectItem key={il.value} value={il.value}>
                        <Badge variant="secondary" className={cn('text-xs', il.color)}>
                          {il.label[locale]}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration and Distance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">{copy.durationMinutes}</Label>
                <Input
                  id="duration"
                  type="number"
                  value={useSegmentDuration ? calculatedDuration : duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  disabled={useSegmentDuration}
                />
                {useSegmentDuration && (
                  <p className="text-xs text-muted-foreground">
                    {copy.calculatedFromSegments}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="distance">{copy.distanceKm}</Label>
                <Input
                  id="distance"
                  type="text"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder={copy.distancePlaceholder}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{copy.description}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={copy.descriptionPlaceholder}
              />
            </div>
          </div>

          {/* Segments */}
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{copy.segments}</h4>
                <p className="text-sm text-muted-foreground">
                  {isStrengthWorkout
                    ? copy.strengthSegmentsHint
                    : copy.enduranceSegmentsHint}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSegment}
              >
                <Plus className="h-4 w-4 mr-1" />
                {copy.add}
              </Button>
            </div>

            {segments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                <p>{copy.noSegments}</p>
                <p className="text-xs mt-1">
                  {copy.addSegmentHint}
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={segmentKeys}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {segments.map((segment, index) => {
                      const isStrength = isStrengthSegmentType(segment.type)
                      const expanded = expandedSegments.has(index)
                      const segKey = segmentKeys[index]

                      return (
                        <SortableSegment key={segKey} id={segKey}>
                          {({ handleProps, isDragging }) => (
                            <Card
                              className={cn(
                                'relative',
                                isDragging && 'shadow-xl ring-2 ring-blue-400'
                              )}
                            >
                              <CardContent className="p-3 space-y-2">
                                {/* Header: drag handle + type select + remove */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 p-1 -m-1 touch-none"
                                    aria-label={copy.dragToSort}
                                    {...handleProps}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </button>
                                  <Select
                                    value={segment.type || 'work'}
                                    onValueChange={(v) => handleUpdateSegment(index, 'type', v)}
                                  >
                                    <SelectTrigger className="h-9 w-[160px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {segmentTypes.map((st) => (
                                        <SelectItem key={st.value} value={st.value}>
                                          {st.label[locale]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex-1" />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleRemoveSegment(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>

                        {/* Core fields — differ for strength vs endurance */}
                        {isStrength ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-6">
                                <ExercisePicker
                                  value={segment.exerciseId}
                                  valueName={segment.exerciseName}
                                  onChange={(id, name) => {
                                    const updated = [...segments]
                                    updated[index] = {
                                      ...updated[index],
                                      exerciseId: id ?? undefined,
                                      exerciseName: name ?? undefined,
                                    }
                                    setSegments(updated)
                                  }}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  type="number"
                                  value={segment.sets ?? ''}
                                  onChange={(e) =>
                                    handleUpdateSegment(
                                      index,
                                      'sets',
                                      e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-9"
                                  placeholder="Set"
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  value={segment.repsCount || ''}
                                  onChange={(e) => handleUpdateSegment(index, 'repsCount', e.target.value)}
                                  className="h-9"
                                  placeholder={copy.repsPlaceholder}
                                />
                              </div>
                              <div className="col-span-2">
                                <Input
                                  value={segment.weight || ''}
                                  onChange={(e) => handleUpdateSegment(index, 'weight', e.target.value)}
                                  className="h-9"
                                  placeholder={copy.weightPlaceholder}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-3">
                                <div className="relative">
                                  <Input
                                    type="number"
                                    value={segment.rest ?? ''}
                                    onChange={(e) =>
                                      handleUpdateSegment(
                                        index,
                                        'rest',
                                        e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="h-9 pr-10"
                                    placeholder={copy.restPlaceholder}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    s
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-3">
                                <Select
                                  value={segment.section || 'MAIN'}
                                  onValueChange={(v) => handleUpdateSegment(index, 'section', v)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sectionOptions.map((s) => (
                                      <SelectItem key={s.value} value={s.value}>
                                        {s.label[locale]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-6">
                                <Input
                                  value={segment.description || ''}
                                  onChange={(e) => handleUpdateSegment(index, 'description', e.target.value)}
                                  className="h-9"
                                  placeholder={copy.segmentDescriptionPlaceholder}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-2">
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={segment.duration ?? ''}
                                  onChange={(e) =>
                                    handleUpdateSegment(
                                      index,
                                      'duration',
                                      e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-9 pr-8"
                                  placeholder={copy.timePlaceholder}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  min
                                </span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={segment.distance ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value === '' ? undefined : parseFloat(e.target.value)
                                    const updated = [...segments]
                                    updated[index] = { ...updated[index], distance: v }
                                    setSegments(updated)
                                  }}
                                  className="h-9 pr-8"
                                  placeholder={copy.distanceShortPlaceholder}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  km
                                </span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <Select
                                value={segment.zone ? String(segment.zone) : ''}
                                onValueChange={(v) => handleUpdateSegment(index, 'zone', parseInt(v))}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder={copy.zonePlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {zoneOptions.map((zo) => (
                                    <SelectItem key={zo.value} value={String(zo.value)}>
                                      {zo.label[locale]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-3">
                              <Input
                                value={segment.pace || ''}
                                onChange={(e) => handleUpdateSegment(index, 'pace', e.target.value)}
                                className="h-9"
                                placeholder="Pace (5:00/km)"
                              />
                            </div>
                            <div className="col-span-3">
                              <Input
                                value={segment.heartRate || ''}
                                onChange={(e) => handleUpdateSegment(index, 'heartRate', e.target.value)}
                                className="h-9"
                                placeholder="HR (140-150)"
                              />
                            </div>
                          </div>
                        )}

                        {/* Advanced toggle + block */}
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(expandedSegments)
                              if (next.has(index)) next.delete(index)
                              else next.add(index)
                              setExpandedSegments(next)
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            {expanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            {expanded ? copy.hideMoreFields : copy.showMoreFields}
                          </button>
                          {expanded && (
                            <div className="mt-2 grid grid-cols-12 gap-2">
                              {isStrength ? (
                                <>
                                  <div className="col-span-3">
                                    <Label className="text-xs">RPE</Label>
                                    <Input
                                      value={
                                        segment.rpe == null
                                          ? ''
                                          : String(segment.rpe)
                                      }
                                      onChange={(e) =>
                                        handleUpdateSegment(index, 'rpe', e.target.value)
                                      }
                                      className="h-9 mt-1"
                                      placeholder="7 eller 7-8"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-xs">RIR</Label>
                                    <Input
                                      value={
                                        segment.rir == null
                                          ? ''
                                          : String(segment.rir)
                                      }
                                      onChange={(e) =>
                                        handleUpdateSegment(index, 'rir', e.target.value)
                                      }
                                      className="h-9 mt-1"
                                      placeholder="2"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-xs">Tempo</Label>
                                    <Input
                                      value={segment.tempo || ''}
                                      onChange={(e) => handleUpdateSegment(index, 'tempo', e.target.value)}
                                      className="h-9 mt-1"
                                      placeholder="3-1-X"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-xs">{copy.muscleGroup}</Label>
                                    <Input
                                      value={segment.muscleGroup || ''}
                                      onChange={(e) =>
                                        handleUpdateSegment(index, 'muscleGroup', e.target.value)
                                      }
                                      className="h-9 mt-1"
                                      placeholder={copy.muscleGroupPlaceholder}
                                    />
                                  </div>
                                  <div className="col-span-6">
                                    <Label className="text-xs">{copy.timeMin}</Label>
                                    <Input
                                      type="number"
                                      value={segment.duration ?? ''}
                                      onChange={(e) =>
                                        handleUpdateSegment(
                                          index,
                                          'duration',
                                          e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 mt-1"
                                      placeholder={copy.minutesPlaceholder}
                                    />
                                  </div>
                                  <div className="col-span-6">
                                    <Label className="text-xs">{copy.repsIntervalCount}</Label>
                                    <Input
                                      type="number"
                                      value={segment.reps ?? ''}
                                      onChange={(e) =>
                                        handleUpdateSegment(
                                          index,
                                          'reps',
                                          e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 mt-1"
                                      placeholder={copy.countPlaceholder}
                                    />
                                  </div>
                                  {segment.weightByWeek &&
                                    Object.keys(segment.weightByWeek).length > 0 && (
                                      <div className="col-span-12">
                                        <Label className="text-xs">
                                          {copy.loadPerWeek}
                                        </Label>
                                        <div className="mt-1 flex flex-wrap gap-2 rounded border bg-muted/30 p-2">
                                          {Object.entries(segment.weightByWeek)
                                            .sort(
                                              ([a], [b]) =>
                                                parseInt(a, 10) - parseInt(b, 10)
                                            )
                                            .map(([wk, val]) => (
                                              <Badge
                                                key={wk}
                                                variant="outline"
                                                className="text-[10px]"
                                              >
                                                V{wk}: {val}
                                              </Badge>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                          {copy.loadPerWeekHint}
                                        </p>
                                      </div>
                                    )}
                                </>
                              ) : (
                                <>
                                  <div className="col-span-3">
                                    <Label className="text-xs">{copy.repsIntervals}</Label>
                                    <Input
                                      type="number"
                                      value={segment.reps ?? ''}
                                      onChange={(e) =>
                                        handleUpdateSegment(
                                          index,
                                          'reps',
                                          e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 mt-1"
                                      placeholder={copy.countPlaceholder}
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-xs">Power (watt)</Label>
                                    <Input
                                      type="number"
                                      value={segment.power ?? ''}
                                      onChange={(e) =>
                                        handleUpdateSegment(
                                          index,
                                          'power',
                                          e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 mt-1"
                                      placeholder="W"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-xs">{copy.restSeconds}</Label>
                                    <Input
                                      type="number"
                                      value={segment.rest ?? ''}
                                      onChange={(e) =>
                                        handleUpdateSegment(
                                          index,
                                          'rest',
                                          e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="h-9 mt-1"
                                      placeholder={copy.secondsPlaceholder}
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-xs">{copy.description}</Label>
                                    <Input
                                      value={segment.description || ''}
                                      onChange={(e) => handleUpdateSegment(index, 'description', e.target.value)}
                                      className="h-9 mt-1"
                                      placeholder="Notes"
                                    />
                                  </div>
                                </>
                              )}
                              <div className="col-span-12">
                                <Label className="text-xs">{copy.notes}</Label>
                                <Textarea
                                  value={segment.notes || ''}
                                  onChange={(e) => handleUpdateSegment(index, 'notes', e.target.value)}
                                  rows={2}
                                  className="mt-1"
                                  placeholder={copy.notesPlaceholder}
                                />
                              </div>
                            </div>
                          )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        </SortableSegment>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {useSegmentDuration && (
              <div className="flex justify-end">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {copy.total}: {calculatedDuration} min
                </Badge>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.cancel}
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {copy.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Data Moat: Coach Decision Modal */}
    {pendingDecision && (
      <CoachDecisionModal
        open={isDecisionModalOpen}
        onOpenChange={setDecisionModalOpen}
        onSubmit={submitDecision}
        athleteId={pendingDecision.athleteId}
        athleteName={pendingDecision.athleteName}
        aiSuggestionType={pendingDecision.aiSuggestionType}
        aiSuggestionData={pendingDecision.aiSuggestionData}
        modificationData={pendingDecision.modificationData}
        aiConfidence={pendingDecision.aiConfidence}
        athleteContext={pendingDecision.athleteContext}
        suggestionSummary={pendingDecision.suggestionSummary}
        modificationSummary={pendingDecision.modificationSummary}
      />
    )}
    </>
  )
}
