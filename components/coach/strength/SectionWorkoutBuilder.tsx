'use client'

/**
 * SectionWorkoutBuilder
 *
 * Enhanced workout builder with 4 collapsible sections:
 * - Warmup (dynamic stretches, activation, ramp-up sets)
 * - Main (primary strength exercises)
 * - Core (core-specific exercises)
 * - Cooldown (stretching, mobility)
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  GripVertical,
  Plus,
  Trash2,
  Dumbbell,
  Timer,
  Search,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  Flame,
  Target,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

// Types
type SectionType = 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'

interface Exercise {
  id: string
  exerciseId: string
  name: string
  sets: number
  reps: string
  weight: string
  rest: number
  notes?: string
  tempo?: string
}

interface SectionConfig {
  type: SectionType
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  defaultRest: number
  enabled: boolean
  exercises: Exercise[]
  notes?: string
  duration?: number
}

const PHASE_MAP: Record<string, string> = {
  'Base': 'ANATOMICAL_ADAPTATION',
  'Strength': 'MAXIMUM_STRENGTH',
  'Power': 'POWER',
  'Maintenance': 'MAINTENANCE',
  'Taper': 'TAPER',
}

const SECTION_DEFAULTS: Record<SectionType, Omit<SectionConfig, 'exercises' | 'enabled'>> = {
  WARMUP: {
    type: 'WARMUP',
    label: 'Uppvärmning',
    icon: Flame,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    defaultRest: 30,
  },
  MAIN: {
    type: 'MAIN',
    label: 'Huvudpass',
    icon: Dumbbell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    defaultRest: 90,
  },
  CORE: {
    type: 'CORE',
    label: 'Core',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    defaultRest: 45,
  },
  COOLDOWN: {
    type: 'COOLDOWN',
    label: 'Nedvarvning',
    icon: Sparkles,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    defaultRest: 30,
  },
}

interface SectionWorkoutBuilderProps {
  initialData?: {
    id?: string
    name: string
    description?: string
    phase: string
    exercises: Array<{
      exerciseId: string
      exerciseName: string
      sets: number
      reps: number | string
      weight?: number
      restSeconds?: number
      notes?: string
    }>
    warmupData?: {
      notes?: string
      duration?: number
      exercises?: Array<{
        exerciseId: string
        exerciseName: string
        sets: number
        reps: number | string
        notes?: string
      }>
    }
    coreData?: {
      notes?: string
      duration?: number
      exercises?: Array<{
        exerciseId: string
        exerciseName: string
        sets: number
        reps: number | string
        restSeconds?: number
        notes?: string
      }>
    }
    cooldownData?: {
      notes?: string
      duration?: number
      exercises?: Array<{
        exerciseId: string
        exerciseName: string
        duration?: number
        notes?: string
      }>
    }
  } | null
  onSaved?: (sessionId?: string) => void
  onCancel?: () => void
}

export function SectionWorkoutBuilder({
  initialData,
  onSaved,
  onCancel,
}: SectionWorkoutBuilderProps) {
  const [sessionName, setSessionName] = useState('Nytt Styrkepass')
  const [description, setDescription] = useState('')
  const [phase, setPhase] = useState('Base')
  const [saving, setSaving] = useState(false)

  // Section states
  const [sections, setSections] = useState<Record<SectionType, SectionConfig>>({
    WARMUP: { ...SECTION_DEFAULTS.WARMUP, enabled: false, exercises: [] },
    MAIN: { ...SECTION_DEFAULTS.MAIN, enabled: true, exercises: [] },
    CORE: { ...SECTION_DEFAULTS.CORE, enabled: false, exercises: [] },
    COOLDOWN: { ...SECTION_DEFAULTS.COOLDOWN, enabled: false, exercises: [] },
  })

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set(['MAIN'])
  )

  // Exercise library
  const [availableExercises, setAvailableExercises] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [targetSection, setTargetSection] = useState<SectionType>('MAIN')

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeSectionType, setActiveSectionType] = useState<SectionType | null>(null)

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setSessionName(initialData.name)
      setDescription(initialData.description || '')

      // Map phase
      const phaseKey = Object.entries(PHASE_MAP).find(
        ([_, v]) => v === initialData.phase
      )?.[0]
      setPhase(phaseKey || 'Base')

      // Load main exercises
      const mainExercises = initialData.exercises.map((e) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        name: e.exerciseName,
        sets: e.sets,
        reps: String(e.reps),
        weight: e.weight ? String(e.weight) : '',
        rest: e.restSeconds || 90,
        notes: e.notes,
      }))

      // Load warmup
      const warmupExercises = initialData.warmupData?.exercises?.map((e) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        name: e.exerciseName,
        sets: e.sets,
        reps: String(e.reps),
        weight: '',
        rest: 30,
        notes: e.notes,
      })) || []

      // Load core
      const coreExercises = initialData.coreData?.exercises?.map((e) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        name: e.exerciseName,
        sets: e.sets,
        reps: String(e.reps),
        weight: '',
        rest: e.restSeconds || 45,
        notes: e.notes,
      })) || []

      // Load cooldown
      const cooldownExercises = initialData.cooldownData?.exercises?.map((e) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        name: e.exerciseName,
        sets: 1,
        reps: e.duration ? `${e.duration}s` : '30s',
        weight: '',
        rest: 30,
        notes: e.notes,
      })) || []

      setSections({
        WARMUP: {
          ...SECTION_DEFAULTS.WARMUP,
          enabled: warmupExercises.length > 0,
          exercises: warmupExercises,
          notes: initialData.warmupData?.notes,
          duration: initialData.warmupData?.duration,
        },
        MAIN: {
          ...SECTION_DEFAULTS.MAIN,
          enabled: true,
          exercises: mainExercises,
        },
        CORE: {
          ...SECTION_DEFAULTS.CORE,
          enabled: coreExercises.length > 0,
          exercises: coreExercises,
          notes: initialData.coreData?.notes,
          duration: initialData.coreData?.duration,
        },
        COOLDOWN: {
          ...SECTION_DEFAULTS.COOLDOWN,
          enabled: cooldownExercises.length > 0,
          exercises: cooldownExercises,
          notes: initialData.cooldownData?.notes,
          duration: initialData.cooldownData?.duration,
        },
      })

      // Expand sections that have exercises
      const toExpand = new Set<SectionType>(['MAIN'])
      if (warmupExercises.length > 0) toExpand.add('WARMUP')
      if (coreExercises.length > 0) toExpand.add('CORE')
      if (cooldownExercises.length > 0) toExpand.add('COOLDOWN')
      setExpandedSections(toExpand)
    }
  }, [initialData])

  // Fetch exercises
  useEffect(() => {
    async function fetchExercises() {
      try {
        const res = await fetch('/api/exercises')
        if (res.ok) {
          const data = await res.json()
          const exercisesList = Array.isArray(data) ? data : (data.exercises || [])
          setAvailableExercises(
            exercisesList.map((e: any) => ({
              id: e.id,
              name: e.nameSv || e.name,
              category: e.category,
              pillar: e.biomechanicalPillar,
              muscleGroup: e.muscleGroup,
            }))
          )
        }
      } catch (e) {
        console.error('Failed to fetch exercises', e)
      }
    }
    fetchExercises()
  }, [])

  // Filter exercises
  const filteredExercises = availableExercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'ALL' || ex.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Toggle section
  const toggleSection = (type: SectionType) => {
    setSections((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }))
    if (!sections[type].enabled) {
      setExpandedSections((prev) => new Set([...prev, type]))
    }
  }

  // Toggle expand
  const toggleExpand = (type: SectionType) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // Add exercise to section
  const addExercise = (exerciseId: string, section: SectionType) => {
    const template = availableExercises.find((e) => e.id === exerciseId)
    if (!template) return

    const sectionConfig = SECTION_DEFAULTS[section]
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      exerciseId: template.id,
      name: template.name,
      sets: section === 'COOLDOWN' ? 1 : 3,
      reps: section === 'COOLDOWN' ? '30s' : '10',
      weight: '',
      rest: sectionConfig.defaultRest,
    }

    setSections((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        exercises: [...prev[section].exercises, newExercise],
      },
    }))
  }

  // Remove exercise
  const removeExercise = (section: SectionType, exerciseId: string) => {
    setSections((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        exercises: prev[section].exercises.filter((e) => e.id !== exerciseId),
      },
    }))
  }

  // Update exercise
  const updateExercise = (
    section: SectionType,
    exerciseId: string,
    field: keyof Exercise,
    value: any
  ) => {
    setSections((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        exercises: prev[section].exercises.map((e) =>
          e.id === exerciseId ? { ...e, [field]: value } : e
        ),
      },
    }))
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveId(id)

    // Find which section contains this exercise
    for (const [type, section] of Object.entries(sections)) {
      if (section.exercises.some((e) => e.id === id)) {
        setActiveSectionType(type as SectionType)
        break
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && activeSectionType) {
      setSections((prev) => {
        const section = prev[activeSectionType]
        const oldIndex = section.exercises.findIndex((e) => e.id === active.id)
        const newIndex = section.exercises.findIndex((e) => e.id === over.id)

        return {
          ...prev,
          [activeSectionType]: {
            ...section,
            exercises: arrayMove(section.exercises, oldIndex, newIndex),
          },
        }
      })
    }

    setActiveId(null)
    setActiveSectionType(null)
  }

  // Calculate totals
  const totalExercises = Object.values(sections)
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.exercises.length, 0)

  const totalSets = Object.values(sections)
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.exercises.reduce((acc, e) => acc + e.sets, 0), 0)

  const estimatedDuration = Object.values(sections)
    .filter((s) => s.enabled)
    .reduce(
      (sum, s) =>
        sum + s.exercises.reduce((acc, e) => acc + e.sets * (2 + e.rest / 60), 0),
      5 // Base time
    )

  // Save handler
  const handleSave = async () => {
    if (sections.MAIN.exercises.length === 0) {
      toast.error('Lägg till övningar', {
        description: 'Du måste lägga till minst en övning i huvudpasset.',
      })
      return
    }

    setSaving(true)
    try {
      // Build exercise data for main section
      const mainExercises = sections.MAIN.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.name,
        sets: e.sets,
        reps: parseInt(e.reps) || 0,
        weight: e.weight ? parseFloat(e.weight) : undefined,
        restSeconds: e.rest,
        notes: e.notes,
        tempo: e.tempo,
      }))

      // Build warmup data
      const warmupData = sections.WARMUP.enabled && sections.WARMUP.exercises.length > 0
        ? {
            notes: sections.WARMUP.notes,
            duration: sections.WARMUP.duration,
            exercises: sections.WARMUP.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              exerciseName: e.name,
              sets: e.sets,
              reps: parseInt(e.reps) || e.reps,
              notes: e.notes,
            })),
          }
        : undefined

      // Build core data
      const coreData = sections.CORE.enabled && sections.CORE.exercises.length > 0
        ? {
            notes: sections.CORE.notes,
            duration: sections.CORE.duration,
            exercises: sections.CORE.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              exerciseName: e.name,
              sets: e.sets,
              reps: parseInt(e.reps) || e.reps,
              restSeconds: e.rest,
              notes: e.notes,
            })),
          }
        : undefined

      // Build cooldown data
      const cooldownData = sections.COOLDOWN.enabled && sections.COOLDOWN.exercises.length > 0
        ? {
            notes: sections.COOLDOWN.notes,
            duration: sections.COOLDOWN.duration,
            exercises: sections.COOLDOWN.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              exerciseName: e.name,
              duration: parseInt(e.reps) || 30,
              notes: e.notes,
            })),
          }
        : undefined

      const payload = {
        name: sessionName,
        description: description || undefined,
        phase: PHASE_MAP[phase] || 'ANATOMICAL_ADAPTATION',
        exercises: mainExercises,
        warmupData,
        coreData,
        cooldownData,
        estimatedDuration: Math.round(estimatedDuration),
        totalSets,
        totalExercises,
      }

      const isEditing = initialData?.id
      const url = isEditing
        ? `/api/strength-sessions/${initialData.id}`
        : '/api/strength-sessions'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(isEditing ? 'Pass uppdaterat!' : 'Pass sparat!', {
          description: `"${sessionName}" har ${isEditing ? 'uppdaterats' : 'sparats'}.`,
        })
        onSaved?.(result.id || initialData?.id)
      } else {
        const data = await response.json()
        toast.error('Kunde inte spara', {
          description: data.error || 'Ett fel uppstod.',
        })
      }
    } catch (error) {
      console.error('Failed to save session:', error)
      toast.error('Kunde inte spara', {
        description: 'Ett oväntat fel uppstod.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Builder Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Session Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>Passnamn</Label>
                  <Input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="text-lg font-semibold"
                    placeholder="Ge passet ett namn..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Beskrivning (valfritt)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Beskriv passets syfte..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="space-y-2 w-[150px]">
                <Label>Fas</Label>
                <Select value={phase} onValueChange={setPhase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Base">Anatom. Anpassning</SelectItem>
                    <SelectItem value="Strength">Maxstyrka</SelectItem>
                    <SelectItem value="Power">Power</SelectItem>
                    <SelectItem value="Maintenance">Underhåll</SelectItem>
                    <SelectItem value="Taper">Taper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {onCancel && (
              <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                <span>Redigerar: {initialData?.name}</span>
                <Button variant="ghost" size="sm" onClick={onCancel} className="ml-auto">
                  <X className="h-4 w-4 mr-1" />
                  Avbryt
                </Button>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Section Toggles */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              {(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN'] as SectionType[]).map((type) => {
                const config = SECTION_DEFAULTS[type]
                const section = sections[type]
                const Icon = config.icon
                const isMain = type === 'MAIN'

                return (
                  <div key={type} className="flex items-center gap-2">
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={() => toggleSection(type)}
                      disabled={isMain}
                    />
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-sm font-medium">{config.label}</span>
                    {section.exercises.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {section.exercises.length}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN'] as SectionType[]).map((type) => {
            const section = sections[type]
            if (!section.enabled) return null

            const config = SECTION_DEFAULTS[type]
            const Icon = config.icon
            const isExpanded = expandedSections.has(type)

            return (
              <Card key={type} className={`border-2 ${config.bgColor}`}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(type)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className={`h-4 w-4 ${config.color}`} />
                          ) : (
                            <ChevronRight className={`h-4 w-4 ${config.color}`} />
                          )}
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          <CardTitle className="text-base">{config.label}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {section.exercises.length} övningar
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTargetSection(type)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Lägg till
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {section.exercises.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            Lägg till övningar från biblioteket
                          </p>
                        </div>
                      ) : (
                        <SortableContext
                          items={section.exercises.map((e) => e.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {section.exercises.map((exercise) => (
                              <SortableExerciseItem
                                key={exercise.id}
                                exercise={exercise}
                                sectionType={type}
                                onRemove={() => removeExercise(type, exercise.id)}
                                onUpdate={(field, value) =>
                                  updateExercise(type, exercise.id, field, value)
                                }
                              />
                            ))}
                          </div>
                        </SortableContext>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}

          <DragOverlay>
            {activeId && activeSectionType ? (
              <div className="opacity-80">
                <SortableExerciseItem
                  exercise={
                    sections[activeSectionType].exercises.find((e) => e.id === activeId)!
                  }
                  sectionType={activeSectionType}
                  onRemove={() => {}}
                  onUpdate={() => {}}
                  isOverlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Exercise Library */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Övningsbibliotek</CardTitle>
              <Badge variant="outline" className="text-xs">
                → {SECTION_DEFAULTS[targetSection].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök övningar..."
                className="pl-8 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Alla kategorier</SelectItem>
                  <SelectItem value="STRENGTH">Styrka</SelectItem>
                  <SelectItem value="PLYOMETRIC">Plyometri</SelectItem>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="RECOVERY">Återhämtning</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={targetSection}
                onValueChange={(v) => setTargetSection(v as SectionType)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sektion" />
                </SelectTrigger>
                <SelectContent>
                  {(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN'] as SectionType[])
                    .filter((t) => sections[t].enabled)
                    .map((t) => (
                      <SelectItem key={t} value={t}>
                        {SECTION_DEFAULTS[t].label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {filteredExercises.slice(0, 20).map((ex) => (
                <Button
                  key={ex.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => addExercise(ex.id, targetSection)}
                >
                  <div className="flex flex-col w-full overflow-hidden">
                    <div className="flex items-center">
                      <Plus className="mr-2 h-3 w-3 shrink-0" />
                      <span className="truncate font-medium text-sm">{ex.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground ml-5 truncate">
                      {ex.muscleGroup || ex.category}
                    </div>
                  </div>
                </Button>
              ))}
              {filteredExercises.length > 20 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  +{filteredExercises.length - 20} fler övningar
                </p>
              )}
              {filteredExercises.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Inga övningar hittades
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sammanfattning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Övningar:</span>
              <span className="font-medium">{totalExercises}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Totala set:</span>
              <span className="font-medium">{totalSets}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uppskattad tid:</span>
              <span className="font-medium">{Math.round(estimatedDuration)} min</span>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex flex-wrap gap-1">
                {sections.WARMUP.enabled && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    <Flame className="h-3 w-3 mr-1" />
                    Uppvärmning
                  </Badge>
                )}
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  <Dumbbell className="h-3 w-3 mr-1" />
                  Huvudpass
                </Badge>
                {sections.CORE.enabled && (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    Core
                  </Badge>
                )}
                {sections.COOLDOWN.enabled && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Nedvarvning
                  </Badge>
                )}
              </div>
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleSave}
              disabled={saving || sections.MAIN.exercises.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : initialData?.id ? (
                'Uppdatera pass'
              ) : (
                'Spara pass'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Sortable Exercise Item
function SortableExerciseItem({
  exercise,
  sectionType,
  onRemove,
  onUpdate,
  isOverlay = false,
}: {
  exercise: Exercise
  sectionType: SectionType
  onRemove: () => void
  onUpdate: (field: keyof Exercise, value: any) => void
  isOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: exercise.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isCooldown = sectionType === 'COOLDOWN'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-md p-3 flex items-start gap-3 ${
        isOverlay ? 'shadow-lg cursor-grabbing' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-2 cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">{exercise.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Set</Label>
            <Input
              type="number"
              value={exercise.sets}
              onChange={(e) => onUpdate('sets', parseInt(e.target.value) || 1)}
              className="h-7 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              {isCooldown ? 'Tid' : 'Reps'}
            </Label>
            <Input
              value={exercise.reps}
              onChange={(e) => onUpdate('reps', e.target.value)}
              className="h-7 text-sm"
              placeholder={isCooldown ? '30s' : '10'}
            />
          </div>
          {!isCooldown && (
            <div>
              <Label className="text-xs text-muted-foreground">Vikt</Label>
              <Input
                value={exercise.weight}
                onChange={(e) => onUpdate('weight', e.target.value)}
                className="h-7 text-sm"
                placeholder="kg"
              />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Vila (s)</Label>
            <Input
              type="number"
              value={exercise.rest}
              onChange={(e) => onUpdate('rest', parseInt(e.target.value) || 0)}
              className="h-7 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SectionWorkoutBuilder
