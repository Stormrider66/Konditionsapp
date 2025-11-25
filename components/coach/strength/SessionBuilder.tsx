'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { GripVertical, Plus, Trash2, Dumbbell, Timer, RotateCcw, Search } from 'lucide-react'
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
  const searchParams = useSearchParams()
  const workoutId = searchParams.get('workoutId')

  const [sessionName, setSessionName] = useState('New Strength Session')
  const [phase, setPhase] = useState('Base')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [availableExercises, setAvailableExercises] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [pillarFilter, setPillarFilter] = useState('ALL')

  useEffect(() => {
    async function fetchExercises() {
      try {
        const res = await fetch('/api/exercises')
        if (res.ok) {
          const data = await res.json()
          // Handle both array (legacy/direct) and object with exercises property
          const exercisesList = Array.isArray(data) ? data : (data.exercises || [])
          
          setAvailableExercises(exercisesList.map((e: any) => ({
            id: e.id,
            name: e.name,
            category: e.category,
            pillar: e.biomechanicalPillar,
            muscleGroup: e.muscleGroup,
            defaultSets: 3,
            defaultReps: e.category === 'STRENGTH' ? '8-10' : '10'
          })))
        }
      } catch (e) {
        console.error("Failed to fetch exercises", e)
      }
    }
    fetchExercises()
  }, [])

  const filteredAvailableExercises = availableExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'ALL' || ex.category === categoryFilter
    const matchesPillar = pillarFilter === 'ALL' || ex.pillar === pillarFilter
    return matchesSearch && matchesCategory && matchesPillar
  })

  useEffect(() => {
    async function loadWorkout() {
      if (!workoutId) return

      try {
        const res = await fetch(`/api/workouts/${workoutId}`)
        if (!res.ok) throw new Error('Failed to load workout')
        
        const data = await res.json()
        setSessionName(data.name)
        
        // Map segments to exercises
        const mappedExercises: Exercise[] = data.segments
          .filter((s: any) => s.exerciseId) // Only include actual exercises
          .map((s: any) => ({
            id: s.id,
            name: s.exercise?.name || 'Unknown Exercise',
            sets: s.sets || 3,
            reps: s.reps || '',
            weight: s.weight || '',
            rest: s.restTime || 90,
            notes: s.notes
          }))
        
        setExercises(mappedExercises)
        
        // Try to match phase if possible (simple mapping)
        if (data.day?.week?.phase) {
           const dbPhase = data.day.week.phase
           if (dbPhase === 'BASE') setPhase('Base')
           else if (dbPhase === 'BUILD') setPhase('Strength') 
           else if (dbPhase === 'PEAK') setPhase('Power')
           else if (dbPhase === 'TAPER') setPhase('Taper')
        }

      } catch (error) {
        console.error('Error loading workout:', error)
        setSessionName('Error loading workout')
      }
    }

    loadWorkout()
  }, [workoutId])

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
    const template = availableExercises.find(e => e.id === templateId)
    if (!template) return

    const newExercise: Exercise = {
      id: Math.random().toString(36).substr(2, 9),
      name: template.name,
      sets: template.defaultSets || 3,
      reps: template.defaultReps || '10',
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
                  <p>Drag exercises here or click &quot;+&quot; to add</p>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Add Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search exercises..." 
                className="pl-8 h-9 text-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    <SelectItem value="STRENGTH">Strength</SelectItem>
                    <SelectItem value="PLYOMETRIC">Plyometric</SelectItem>
                    <SelectItem value="CORE">Core</SelectItem>
                    <SelectItem value="RECOVERY">Recovery</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={pillarFilter} onValueChange={setPillarFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Pillars</SelectItem>
                    <SelectItem value="KNEE_DOMINANCE">Knee Dom</SelectItem>
                    <SelectItem value="POSTERIOR_CHAIN">Post. Chain</SelectItem>
                    <SelectItem value="UNILATERAL">Unilateral</SelectItem>
                    <SelectItem value="ANTI_ROTATION_CORE">Anti-Rot</SelectItem>
                    <SelectItem value="FOOT_ANKLE">Foot/Ankle</SelectItem>
                  </SelectContent>
                </Select>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filteredAvailableExercises.length > 0 ? filteredAvailableExercises.map(ex => (
              <Button
                key={ex.id}
                variant="outline"
                className="w-full justify-start text-left h-auto py-2"
                onClick={() => addExercise(ex.id)}
              >
                <div className="flex flex-col w-full overflow-hidden">
                    <div className="flex items-center">
                        <Plus className="mr-2 h-3 w-3 shrink-0" />
                        <span className="truncate font-medium">{ex.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground ml-5 truncate">
                        {ex.muscleGroup}
                    </div>
                </div>
              </Button>
            )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No exercises found</p>
            )}
            </div>
            
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

