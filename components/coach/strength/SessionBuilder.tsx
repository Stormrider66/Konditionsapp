'use client'

import React, { useState } from 'react'
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Plus, Trash2, Dumbbell, Timer, RotateCcw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// Types
type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  weight: string
  rest: number
  notes?: string
}

// Mock exercises available to add
const AVAILABLE_EXERCISES = [
  { id: 'ex1', name: 'Barbell Squat', defaultSets: 3, defaultReps: '8-10' },
  { id: 'ex2', name: 'Bench Press', defaultSets: 3, defaultReps: '8-10' },
  { id: 'ex3', name: 'Deadlift', defaultSets: 3, defaultReps: '5' },
  { id: 'ex4', name: 'Pull-ups', defaultSets: 3, defaultReps: 'AMRAP' },
  { id: 'ex5', name: 'Plank', defaultSets: 3, defaultReps: '60s' },
]

export function SessionBuilder() {
  const [sessionName, setSessionName] = useState('New Strength Session')
  const [phase, setPhase] = useState('Base')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    setActiveId(null)
  }

  const addExercise = (templateId: string) => {
    const template = AVAILABLE_EXERCISES.find(e => e.id === templateId)
    if (!template) return

    const newExercise: Exercise = {
      id: Math.random().toString(36).substr(2, 9),
      name: template.name,
      sets: template.defaultSets,
      reps: template.defaultReps,
      weight: '',
      rest: 90
    }

    setExercises([...exercises, newExercise])
  }

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(e => e.id !== id))
  }

  const updateExercise = (id: string, field: keyof Exercise, value: any) => {
    setExercises(exercises.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Builder Area */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Label>Session Name</Label>
                <Input 
                  value={sessionName} 
                  onChange={(e) => setSessionName(e.target.value)}
                  className="text-lg font-semibold"
                />
              </div>
              <div className="space-y-2 w-[150px]">
                <Label>Phase</Label>
                <Select value={phase} onValueChange={setPhase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Base">Base Building</SelectItem>
                    <SelectItem value="Strength">Max Strength</SelectItem>
                    <SelectItem value="Power">Power</SelectItem>
                    <SelectItem value="Taper">Taper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 min-h-[400px] rounded-lg p-4 border-2 border-dashed border-muted-foreground/25">
              {exercises.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <Dumbbell className="h-12 w-12 opacity-50" />
                  <p>Drag exercises here or click "+" to add</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={exercises.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {exercises.map((exercise) => (
                        <SortableExerciseItem
                          key={exercise.id}
                          exercise={exercise}
                          onRemove={() => removeExercise(exercise.id)}
                          onUpdate={updateExercise}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="opacity-50">
                        <SortableExerciseItem 
                          exercise={exercises.find(e => e.id === activeId)!} 
                          onRemove={() => {}}
                          onUpdate={() => {}}
                          isOverlay
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar / Tools */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Add Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {AVAILABLE_EXERCISES.map(ex => (
              <Button
                key={ex.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addExercise(ex.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {ex.name}
              </Button>
            ))}
            <Button variant="ghost" className="w-full text-muted-foreground text-xs mt-2">
              View Full Library...
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Session Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Exercises:</span>
              <span className="font-medium">{exercises.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Sets:</span>
              <span className="font-medium">
                {exercises.reduce((acc, ex) => acc + ex.sets, 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Duration:</span>
              <span className="font-medium">
                {exercises.reduce((acc, ex) => acc + (ex.sets * (2 + ex.rest/60)), 10).toFixed(0)} min
              </span>
            </div>
            <Button className="w-full mt-4">Save Session</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SortableExerciseItem({ 
  exercise, 
  onRemove, 
  onUpdate,
  isOverlay = false 
}: { 
  exercise: Exercise
  onRemove: () => void
  onUpdate: (id: string, field: keyof Exercise, value: any) => void
  isOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: exercise.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-md p-3 flex items-start gap-3 group ${isOverlay ? 'shadow-lg cursor-grabbing' : ''}`}
    >
      <div {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-medium">{exercise.name}</span>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Sets</Label>
            <div className="flex items-center">
              <RotateCcw className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input 
                type="number" 
                value={exercise.sets} 
                onChange={(e) => onUpdate(exercise.id, 'sets', parseInt(e.target.value))}
                className="h-7 text-sm" 
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Reps</Label>
            <div className="flex items-center">
              <Dumbbell className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input 
                value={exercise.reps} 
                onChange={(e) => onUpdate(exercise.id, 'reps', e.target.value)}
                className="h-7 text-sm" 
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rest (s)</Label>
            <div className="flex items-center">
              <Timer className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input 
                type="number" 
                value={exercise.rest} 
                onChange={(e) => onUpdate(exercise.id, 'rest', parseInt(e.target.value))}
                className="h-7 text-sm" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

