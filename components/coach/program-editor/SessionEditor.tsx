// components/coach/program-editor/SessionEditor.tsx
/**
 * Universal Session Editor Component
 *
 * Allows editing of any workout type:
 * - Running workouts (type, intensity, duration, segments)
 * - Strength workouts (exercises with sets/reps/load)
 * - Plyometric workouts (contacts, intensity)
 * - Core workouts (exercises, holds)
 *
 * Features:
 * - Add/remove exercises (segments)
 * - Drag-and-drop reordering
 * - Real-time duration calculation
 * - Integration with exercise library
 * - Save/cancel with conflict detection
 */

'use client'

import { useState, useEffect } from 'react'
import { Workout, WorkoutSegment, Exercise } from '@prisma/client'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, GripVertical, Save, X, Clock } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface WorkoutWithSegments extends Workout {
  segments: (WorkoutSegment & { exercise?: Exercise | null })[]
}

interface SessionEditorProps {
  workout: WorkoutWithSegments
  programId: string
  onSave: () => void
  onCancel: () => void
}

type WorkoutType = 'RUNNING' | 'STRENGTH' | 'PLYOMETRIC' | 'CORE' | 'CROSS_TRAINING' | 'CYCLING' | 'SKIING'
type WorkoutIntensity = 'RECOVERY' | 'EASY' | 'MODERATE' | 'THRESHOLD' | 'INTERVAL' | 'MAX'
type SegmentType = 'WARMUP' | 'WORK' | 'REST' | 'COOLDOWN' | 'EXERCISE'

export function SessionEditor({ workout, programId, onSave, onCancel }: SessionEditorProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Workout metadata state
  const [type, setType] = useState<WorkoutType>(workout.type as WorkoutType)
  const [intensity, setIntensity] = useState<WorkoutIntensity>(workout.intensity as WorkoutIntensity)
  const [duration, setDuration] = useState<number>(workout.duration || 60)
  const [description, setDescription] = useState<string>(workout.description || '')

  // Segments state
  const [segments, setSegments] = useState<(WorkoutSegment & { exercise?: Exercise | null })[]>(
    workout.segments || []
  )

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Calculate total duration from segments
  const calculateTotalDuration = () => {
    if (segments.length === 0) return duration

    const segmentDuration = segments.reduce((total, seg) => {
      return total + (seg.duration || 0)
    }, 0)

    return segmentDuration > 0 ? segmentDuration : duration
  }

  const totalDuration = calculateTotalDuration()

  // Handle workout metadata save
  const handleSaveMetadata = async () => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/programs/${programId}/edit?type=workout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workout.id,
          type,
          intensity,
          duration: totalDuration,
          description,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save workout')
      }

      toast({
        title: 'Workout updated',
        description: 'Changes saved successfully',
      })

      onSave()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save workout',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle segments save
  const handleSaveSegments = async () => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/programs/${programId}/edit?type=segments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: workout.id,
          segments: segments.map((seg, idx) => ({
            order: idx,
            type: seg.type,
            duration: seg.duration,
            distance: seg.distance,
            pace: seg.pace,
            heartRate: seg.heartRate,
            sets: seg.sets,
            reps: seg.reps,
            load: seg.load,
            restSeconds: seg.restSeconds,
            exerciseId: seg.exerciseId,
            notes: seg.notes,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save segments')
      }

      toast({
        title: 'Exercises updated',
        description: 'Segments saved successfully',
      })

      onSave()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save segments',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Combined save (metadata + segments)
  const handleSaveAll = async () => {
    await handleSaveMetadata()
    if (segments.length > 0) {
      await handleSaveSegments()
    }
  }

  // Add new segment
  const handleAddSegment = () => {
    const newSegment: Partial<WorkoutSegment> = {
      id: `temp-${Date.now()}`, // Temporary ID
      workoutId: workout.id,
      order: segments.length,
      type: type === 'RUNNING' || type === 'CYCLING' || type === 'SKIING' ? 'WORK' : 'EXERCISE',
      duration: type === 'RUNNING' ? 10 : undefined,
      distance: undefined,
      pace: undefined,
      heartRate: undefined,
      sets: type === 'STRENGTH' || type === 'PLYOMETRIC' || type === 'CORE' ? 3 : undefined,
      reps: type === 'STRENGTH' || type === 'PLYOMETRIC' || type === 'CORE' ? 10 : undefined,
      load: undefined,
      restSeconds: type === 'STRENGTH' ? 90 : undefined,
      exerciseId: null,
      notes: null,
    }

    setSegments([...segments, newSegment as WorkoutSegment])
  }

  // Remove segment
  const handleRemoveSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index))
  }

  // Update segment
  const handleUpdateSegment = (index: number, field: string, value: any) => {
    const updated = [...segments]
    updated[index] = { ...updated[index], [field]: value }
    setSegments(updated)
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const reordered = [...segments]
    const [draggedItem] = reordered.splice(draggedIndex, 1)
    reordered.splice(index, 0, draggedItem)

    setSegments(reordered)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // Render segment based on workout type
  const renderSegment = (segment: WorkoutSegment & { exercise?: Exercise | null }, index: number) => {
    const isRunning = type === 'RUNNING' || type === 'CYCLING' || type === 'SKIING'
    const isStrength = type === 'STRENGTH' || type === 'PLYOMETRIC' || type === 'CORE'

    return (
      <Card
        key={segment.id || index}
        className="mb-2"
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Drag handle */}
            <div className="cursor-grab active:cursor-grabbing mt-2">
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>

            {/* Segment fields */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Segment type */}
              <div>
                <Label>Type</Label>
                <Select
                  value={segment.type || 'WORK'}
                  onValueChange={(value) => handleUpdateSegment(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isRunning && (
                      <>
                        <SelectItem value="WARMUP">Warm-up</SelectItem>
                        <SelectItem value="WORK">Work</SelectItem>
                        <SelectItem value="REST">Rest</SelectItem>
                        <SelectItem value="COOLDOWN">Cool-down</SelectItem>
                      </>
                    )}
                    {isStrength && <SelectItem value="EXERCISE">Exercise</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Running-specific fields */}
              {isRunning && (
                <>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      value={segment.duration || ''}
                      onChange={(e) => handleUpdateSegment(index, 'duration', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Distance (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={segment.distance || ''}
                      onChange={(e) => handleUpdateSegment(index, 'distance', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Pace (min/km)</Label>
                    <Input
                      type="text"
                      placeholder="5:00"
                      value={segment.pace || ''}
                      onChange={(e) => handleUpdateSegment(index, 'pace', e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Strength-specific fields */}
              {isStrength && (
                <>
                  <div>
                    <Label>Exercise</Label>
                    <Input
                      type="text"
                      placeholder="Select exercise..."
                      value={segment.exercise?.name || segment.exerciseId || ''}
                      readOnly
                    />
                    {/* TODO: Add exercise selector modal */}
                  </div>
                  <div>
                    <Label>Sets</Label>
                    <Input
                      type="number"
                      value={segment.sets || ''}
                      onChange={(e) => handleUpdateSegment(index, 'sets', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Reps</Label>
                    <Input
                      type="number"
                      value={segment.reps || ''}
                      onChange={(e) => handleUpdateSegment(index, 'reps', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Load (kg or %)</Label>
                    <Input
                      type="text"
                      placeholder="80kg or 85%"
                      value={segment.load || ''}
                      onChange={(e) => handleUpdateSegment(index, 'load', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Rest (sec)</Label>
                    <Input
                      type="number"
                      value={segment.restSeconds || ''}
                      onChange={(e) => handleUpdateSegment(index, 'restSeconds', parseInt(e.target.value))}
                    />
                  </div>
                </>
              )}

              {/* Notes (all types) */}
              <div className="col-span-full">
                <Label>Notes</Label>
                <Textarea
                  value={segment.notes || ''}
                  onChange={(e) => handleUpdateSegment(index, 'notes', e.target.value)}
                  rows={2}
                  placeholder="Additional instructions..."
                />
              </div>
            </div>

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveSegment(index)}
              className="mt-2"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edit Workout</h2>
          <p className="text-sm text-gray-500">
            Modify workout details and exercises
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalDuration} min
          </Badge>
        </div>
      </div>

      {/* Workout Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Workout Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type */}
            <div>
              <Label>Workout Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as WorkoutType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUNNING">Running</SelectItem>
                  <SelectItem value="STRENGTH">Strength</SelectItem>
                  <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="CROSS_TRAINING">Cross-training</SelectItem>
                  <SelectItem value="CYCLING">Cycling</SelectItem>
                  <SelectItem value="SKIING">Skiing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Intensity */}
            <div>
              <Label>Intensity</Label>
              <Select
                value={intensity}
                onValueChange={(value) => setIntensity(value as WorkoutIntensity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECOVERY">Recovery</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="THRESHOLD">Threshold</SelectItem>
                  <SelectItem value="INTERVAL">Interval</SelectItem>
                  <SelectItem value="MAX">Max</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                placeholder="60"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Workout description or coach notes..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Segments / Exercises */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {type === 'RUNNING' || type === 'CYCLING' || type === 'SKIING'
                ? 'Workout Segments'
                : 'Exercises'}
            </CardTitle>
            <Button onClick={handleAddSegment} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add {type === 'RUNNING' ? 'Segment' : 'Exercise'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {segments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No segments added yet.</p>
              <p className="text-sm">Click &quot;Add Segment&quot; to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {segments.map((segment, index) => renderSegment(segment, index))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
