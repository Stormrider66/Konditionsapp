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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParsedWorkout, ParsedWorkoutSegment } from '@/lib/ai/program-parser'
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

// Workout types
const workoutTypes = [
  { value: 'RUNNING', label: 'Löpning', icon: Heart },
  { value: 'CYCLING', label: 'Cykling', icon: Flame },
  { value: 'SWIMMING', label: 'Simning', icon: Heart },
  { value: 'STRENGTH', label: 'Styrka', icon: Dumbbell },
  { value: 'CROSS_TRAINING', label: 'Cross-training', icon: Flame },
  { value: 'RECOVERY', label: 'Återhämtning', icon: Clock },
  { value: 'REHAB', label: 'Rehab', icon: Heart },
  { value: 'HYROX', label: 'HYROX', icon: Flame },
]

// Intensity levels
const intensityLevels = [
  { value: 'easy', label: 'Lätt', color: 'bg-green-100 text-green-800' },
  { value: 'moderate', label: 'Medel', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: 'Hård', color: 'bg-red-100 text-red-800' },
  { value: 'race_pace', label: 'Tävlingstempo', color: 'bg-purple-100 text-purple-800' },
]

// Segment types for endurance
const segmentTypes = [
  { value: 'warmup', label: 'Uppvärmning' },
  { value: 'work', label: 'Arbete' },
  { value: 'interval', label: 'Intervall' },
  { value: 'recovery', label: 'Återhämtning' },
  { value: 'cooldown', label: 'Nedvarvning' },
]

// Zone options (zone is numeric 1-5)
const zoneOptions = [
  { value: 1, label: 'Zon 1 - Återhämtning' },
  { value: 2, label: 'Zon 2 - Aerob bas' },
  { value: 3, label: 'Zon 3 - Tempo' },
  { value: 4, label: 'Zon 4 - Tröskel' },
  { value: 5, label: 'Zon 5 - VO2max' },
]

// Day name to Swedish label
const dayLabels: Record<string, string> = {
  monday: 'Måndag',
  tuesday: 'Tisdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
  saturday: 'Lördag',
  sunday: 'Söndag',
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

    // Data Moat: Store the original AI-generated workout for comparison
    if (isAIGenerated && !originalWorkoutRef.current) {
      originalWorkoutRef.current = { ...workout }
    }
  }, [workout, isAIGenerated])

  // Check if this is an endurance workout (has segments)
  const isEndurance = ['RUNNING', 'CYCLING', 'SWIMMING', 'CROSS_TRAINING'].includes(type)

  // Calculate total duration from segments if available
  const calculatedDuration = segments.length > 0
    ? segments.reduce((total, seg) => total + (seg.duration || 0), 0)
    : duration

  // Add new segment
  const handleAddSegment = () => {
    const newSegment: ParsedWorkoutSegment = {
      order: segments.length,
      type: 'work',
      duration: 10,
      zone: 2,
      description: '',
    }
    setSegments([...segments, newSegment])
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
  }

  // Move segment up/down
  const handleMoveSegment = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === segments.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...segments]
    const [removed] = updated.splice(index, 1)
    updated.splice(newIndex, 0, removed)
    setSegments(updated)
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
            Redigera pass
          </DialogTitle>
          <DialogDescription>
            {phaseName} - {dayLabels[dayName] || dayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Passnamn</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="T.ex. Långpass, Intervaller, Styrka A..."
              />
            </div>

            {/* Type and Intensity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={type} onValueChange={(v) => setType(v as WorkoutType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workoutTypes.map((wt) => (
                      <SelectItem key={wt.value} value={wt.value}>
                        <span className="flex items-center gap-2">
                          <wt.icon className="h-4 w-4" />
                          {wt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intensitet</Label>
                <Select value={intensity} onValueChange={(v) => setIntensity(v as WorkoutIntensity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {intensityLevels.map((il) => (
                      <SelectItem key={il.value} value={il.value}>
                        <Badge variant="secondary" className={cn('text-xs', il.color)}>
                          {il.label}
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
                <Label htmlFor="duration">Längd (minuter)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={segments.length > 0 ? calculatedDuration : duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  disabled={segments.length > 0}
                />
                {segments.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Beräknat från segment
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="distance">Distans (km)</Label>
                <Input
                  id="distance"
                  type="text"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="T.ex. 10 eller 8-10"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detaljerade instruktioner för passet..."
              />
            </div>
          </div>

          {/* Segments (for endurance workouts) */}
          {isEndurance && (
            <>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Segment</h4>
                    <p className="text-sm text-muted-foreground">
                      Dela upp passet i olika delar
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSegment}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Lägg till
                  </Button>
                </div>

                {segments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                    <p>Inga segment tillagda</p>
                    <p className="text-xs mt-1">
                      Klicka &quot;Lägg till&quot; för att strukturera passet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {segments.map((segment, index) => (
                      <Card key={index} className="relative">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            {/* Drag handle placeholder */}
                            <div className="mt-2 text-muted-foreground cursor-grab">
                              <GripVertical className="h-4 w-4" />
                            </div>

                            <div className="flex-1 grid grid-cols-4 gap-2">
                              {/* Type */}
                              <Select
                                value={segment.type || 'work'}
                                onValueChange={(v) => handleUpdateSegment(index, 'type', v)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {segmentTypes.map((st) => (
                                    <SelectItem key={st.value} value={st.value}>
                                      {st.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Duration */}
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={segment.duration || ''}
                                  onChange={(e) => handleUpdateSegment(index, 'duration', parseInt(e.target.value) || 0)}
                                  className="h-9 pr-10"
                                  placeholder="Min"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  min
                                </span>
                              </div>

                              {/* Zone */}
                              <Select
                                value={String(segment.zone || 2)}
                                onValueChange={(v) => handleUpdateSegment(index, 'zone', parseInt(v))}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {zoneOptions.map((zo) => (
                                    <SelectItem key={zo.value} value={String(zo.value)}>
                                      Z{zo.value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Description */}
                              <Input
                                value={segment.description || ''}
                                onChange={(e) => handleUpdateSegment(index, 'description', e.target.value)}
                                className="h-9"
                                placeholder="Beskrivning"
                              />
                            </div>

                            {/* Remove button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleRemoveSegment(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {segments.length > 0 && (
                  <div className="flex justify-end">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Totalt: {calculatedDuration} min
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Spara ändringar
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
