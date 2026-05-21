'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Plus, Trash2, Timer, Activity, Footprints, Calendar, Heart, Gauge, Repeat, Download, Loader2, X, Target, ShieldCheck, Zap, Sparkles } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { toast } from 'sonner'
import { SessionExportButton } from '@/components/exports/SessionExportButton'
import { PrintWorkoutButton } from '@/components/workouts/print/PrintWorkoutButton'
import {
  PREHAB_STABILITY_FILTER,
  matchesStrengthLibraryCategoryFilter,
} from '@/lib/strength/exercise-library-filters'
import type { CardioSessionData, CardioSegment as CardioSegmentType } from '@/types'
import { PatternBlockDialog, type GeneratedPatternStep } from './PatternBlockDialog'
import { HOCKEY_CARDIO_PRESETS, type HockeyCardioPreset } from '@/lib/hockey/hockey-builder-presets'
import { useLocale } from '@/i18n/client'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'

// Types
type CardioFlatSegment = {
  id: string
  type: 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'
  duration?: number // minutes
  distance?: number // km
  calories?: number // kcal
  zone: string
  pace?: string // "5:30/km"
  heartRate?: string // "145-155 bpm"
  notes?: string
  equipment?: string
  repeats?: number // for intervals
  restDuration?: number // min, for interval repeats
  distanceUnit?: 'km' | 'm'
}

type AppLocale = 'en' | 'sv'

function text(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

type CardioSupplementalExercise = {
  id: string
  exerciseId: string
  name: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
}

type LibraryExercise = {
  id: string
  name: string
  nameSv?: string | null
  nameEn?: string | null
  category?: string | null
  muscleGroup?: string | null
  description?: string | null
  instructions?: string | null
  pillar?: string | null
  progressionLevel?: string | null
  isRehabExercise?: boolean | null
  rehabPhases?: string[] | null
  targetBodyParts?: string[] | null
  contraindications?: string[] | null
}

type CardioExerciseBlock = {
  id: string
  type: 'CORE' | 'PREHAB' | 'PLYOMETRIC'
  duration?: number // minutes
  notes?: string
  exercises: CardioSupplementalExercise[]
}

type CardioChildStep = {
  id: string
  type: 'INTERVAL' | 'RECOVERY' | 'REST' | 'STEADY'
  duration?: number // minutes
  distance?: number // km
  calories?: number // kcal
  distanceUnit?: 'km' | 'm'
  zone: string
  pace?: string
  heartRate?: string
  notes?: string
  equipment?: string
  targetType?: 'power' | 'pace' | 'cadence' | 'hr' | 'none'
  targetValue?: string // "250", "62", "2:05"
}

const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'RUN', label: 'Löpning' },
  { value: 'TREADMILL', label: 'Löpband' },
  { value: 'BIKE', label: 'Cykel' },
  { value: 'ASSAULT_BIKE', label: 'Assault Bike' },
  { value: 'ECHO_BIKE', label: 'Echo Bike' },
  { value: 'WATTBIKE', label: 'Wattbike' },
  { value: 'ROW', label: 'Rodd (Concept2)' },
  { value: 'SKI_ERG', label: 'SkiErg' },
  { value: 'SWIM', label: 'Simning' },
  { value: 'OTHER', label: 'Annat' },
]

const EQUIPMENT_LABEL_BY_VALUE: Record<string, string> = EQUIPMENT_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {}
)

type CardioRepeatGroup = {
  id: string
  type: 'REPEAT_GROUP'
  repeats: number
  restBetweenRounds?: number // minutes
  steps: CardioChildStep[]
}

type CardioSegment = CardioFlatSegment | CardioRepeatGroup | CardioExerciseBlock

function isRepeatGroup(seg: CardioSegment): seg is CardioRepeatGroup {
  return seg.type === 'REPEAT_GROUP'
}

function isExerciseBlock(seg: CardioSegment): seg is CardioExerciseBlock {
  return seg.type === 'CORE' || seg.type === 'PREHAB' || seg.type === 'PLYOMETRIC'
}

const generateId = () => Math.random().toString(36).substr(2, 9)

// Segments available to add
const AVAILABLE_SEGMENTS = [
  { id: 'seg1', name: 'Warmup (10 min)', type: 'WARMUP', defaultDuration: 10, defaultZone: '1' },
  { id: 'seg2', name: 'Steady Run (30 min)', type: 'STEADY', defaultDuration: 30, defaultZone: '2' },
  { id: 'seg3', name: 'Interval (3 min)', type: 'INTERVAL', defaultDuration: 3, defaultZone: '4' },
  { id: 'seg4', name: 'Recovery (2 min)', type: 'RECOVERY', defaultDuration: 2, defaultZone: '1' },
  { id: 'seg5', name: 'Cooldown (10 min)', type: 'COOLDOWN', defaultDuration: 10, defaultZone: '1' },
  { id: 'seg6', name: 'Hill Sprints', type: 'HILL', defaultDuration: 0, defaultZone: '5', notes: 'Max effort uphill' },
  { id: 'seg7', name: 'Running Drills', type: 'DRILLS', defaultDuration: 10, defaultZone: '1', notes: 'Focus on technique' },
  { id: 'seg8', name: 'Repeat Group', type: 'REPEAT_GROUP', defaultDuration: 0, defaultZone: '1' },
  { id: 'seg9', name: 'Core section', type: 'CORE', defaultDuration: 8, defaultZone: '1' },
  { id: 'seg10', name: 'Stabilitet / Prehab', type: 'PREHAB', defaultDuration: 8, defaultZone: '1' },
  { id: 'seg11', name: 'Plyometri', type: 'PLYOMETRIC', defaultDuration: 8, defaultZone: '1' },
]

function secondsToMinutes(seconds?: number) {
  return seconds ? Number((seconds / 60).toFixed(1)) : undefined
}

function metersToUiDistance(distance?: number): { distance?: number; distanceUnit: 'km' | 'm' } {
  if (!distance) return { distance: undefined, distanceUnit: 'km' }
  if (distance >= 10) return { distance: distance / 1000, distanceUnit: 'm' }
  return { distance, distanceUnit: 'km' }
}

function normalizeCardioTargetType(value?: string): CardioChildStep['targetType'] {
  return value === 'power' || value === 'pace' || value === 'cadence' || value === 'hr'
    ? value
    : 'none'
}

function buildCardioSegmentFromHockeyPreset(
  segment: HockeyCardioPreset['segments'][number]
): CardioSegment {
  if (segment.type === 'REPEAT_GROUP') {
    return {
      id: generateId(),
      type: 'REPEAT_GROUP',
      repeats: segment.repeats || 1,
      restBetweenRounds: secondsToMinutes(segment.restBetweenRounds),
      steps: (segment.steps || []).map((step) => {
        const distanceInfo = metersToUiDistance(step.distance)
        return {
          id: generateId(),
          type: step.type,
          duration: secondsToMinutes(step.duration),
          distance: distanceInfo.distance,
          distanceUnit: distanceInfo.distanceUnit,
          calories: step.calories,
          zone: step.zone ? String(step.zone) : '1',
          notes: step.notes || '',
          equipment: step.equipment || '',
          targetType: normalizeCardioTargetType(step.targetType),
          targetValue: step.targetValue || '',
        }
      }),
    }
  }

  const distanceInfo = metersToUiDistance(segment.distance)
  return {
    id: generateId(),
    type: segment.type,
    duration: secondsToMinutes(segment.duration),
    distance: distanceInfo.distance,
    distanceUnit: distanceInfo.distanceUnit,
    zone: segment.zone ? String(segment.zone) : '1',
    notes: segment.notes || '',
    repeats: segment.repeats,
    restDuration: secondsToMinutes(segment.restDuration),
  }
}

// Helper functions for auto-calculation
const paceToDecimal = (pace: string): number | null => {
  if (!pace) return null
  // Handle 5.30 and 5,30 formats by replacing . and , with :
  const normalized = pace.replace(/[.,]/g, ':')
  const parts = normalized.split(':')
  if (parts.length !== 2) return null
  const min = parseInt(parts[0])
  const sec = parseInt(parts[1])
  if (isNaN(min) || isNaN(sec)) return null
  return min + (sec / 60)
}

const decimalToPace = (decimal: number): string => {
  const min = Math.floor(decimal)
  const sec = Math.round((decimal - min) * 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

interface CardioSessionBuilderProps {
  initialData?: CardioSessionData | null
  onSaved?: (sessionId?: string, sessionName?: string) => void
  onCancel?: () => void
  businessId?: string
}

export function CardioSessionBuilder({ initialData, onSaved, onCancel, businessId }: CardioSessionBuilderProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const businessHeaders = React.useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname])
  const workoutId = searchParams.get('workoutId')
  const programId = searchParams.get('programId')

  const [sessionName, setSessionName] = useState(text(locale, 'Nytt Konditionspass', 'New Cardio Session'))
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState('RUNNING')
  const [segments, setSegments] = useState<CardioSegment[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionDate, setSessionDate] = useState<Date | null>(null)
  const [repeatCount, setRepeatCount] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [userZones, setUserZones] = useState<any>(null)
  const [patternDialogOpen, setPatternDialogOpen] = useState(false)
  const [availableExercises, setAvailableExercises] = useState<LibraryExercise[]>([])

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setSessionName(initialData.name)
      setDescription(initialData.description || '')
      setSport(initialData.sport || 'RUNNING')
      setSegments(
        initialData.segments.map((s: any) => {
          if (s.type === 'CORE' || s.type === 'PREHAB' || s.type === 'PLYOMETRIC') {
            return {
              id: s.id || generateId(),
              type: s.type,
              duration: s.duration ? s.duration / 60 : undefined,
              notes: s.notes || '',
              exercises: (s.exercises || []).map((exercise: any) => ({
                id: exercise.id || generateId(),
                exerciseId: exercise.exerciseId,
                name: exercise.name,
                sets: exercise.sets || 2,
                reps: exercise.reps || '8-12',
                restSeconds: exercise.restSeconds || 30,
                notes: exercise.notes || '',
              })),
            } as CardioExerciseBlock
          }
          if (s.type === 'REPEAT_GROUP') {
            return {
              id: s.id || generateId(),
              type: 'REPEAT_GROUP' as const,
              repeats: s.repeats || 1,
              restBetweenRounds: s.restBetweenRounds ? s.restBetweenRounds / 60 : undefined,
              steps: (s.steps || []).map((step: any) => ({
                id: step.id || generateId(),
                type: step.type as CardioChildStep['type'],
                duration: step.duration ? step.duration / 60 : undefined,
                distance: step.distance ? step.distance / 1000 : undefined,
                calories: step.calories || undefined,
                zone: step.zone ? String(step.zone) : '1',
                pace: step.pace || '',
                heartRate: step.heartRate || '',
                notes: step.notes || '',
                equipment: step.equipment || '',
                targetType: step.targetType || 'none',
                targetValue: step.targetValue || '',
                distanceUnit: (step.distance && step.distance < 1000) ? 'm' : 'km',
              })),
            } as CardioRepeatGroup
          }
          return {
            id: s.id || generateId(),
            type: s.type as CardioFlatSegment['type'],
            duration: s.duration ? s.duration / 60 : undefined,
            distance: s.distance ? s.distance / 1000 : undefined,
            calories: s.calories || undefined,
            zone: s.zone ? String(s.zone) : '1',
            pace: s.pace || '',
            heartRate: s.heartRate || '',
            notes: s.notes || '',
            equipment: s.equipment || '',
            repeats: s.repeats || undefined,
            restDuration: s.restDuration ? s.restDuration / 60 : undefined,
            distanceUnit: (s.distance && s.distance < 1000) ? 'm' : 'km',
          } as CardioFlatSegment
        })
      )
    } else {
      // Reset form for new session
      setSessionName('Nytt Konditionspass')
      setDescription('')
      setSport('RUNNING')
      setSegments([])
    }
  }, [initialData])

  useEffect(() => {
    async function fetchExercises() {
      try {
        const res = await fetch('/api/exercises?limit=500')
        if (!res.ok) return

        const data = await res.json()
        const exercisesList = Array.isArray(data) ? data : (data.exercises || [])
        setAvailableExercises(exercisesList.map((e: any) => ({
          id: e.id,
          name: locale === 'sv' ? e.nameSv || e.name : e.nameEn || e.name,
          nameSv: e.nameSv,
          nameEn: e.nameEn,
          category: e.category,
          muscleGroup: e.muscleGroup,
          description: e.description,
          instructions: e.instructions,
          pillar: e.biomechanicalPillar,
          progressionLevel: e.progressionLevel,
          isRehabExercise: e.isRehabExercise,
          rehabPhases: e.rehabPhases,
          targetBodyParts: e.targetBodyParts,
          contraindications: e.contraindications,
        })))
      } catch (error) {
        console.error('Failed to fetch supplemental exercises', error)
      }
    }
    fetchExercises()
  }, [locale])

  useEffect(() => {
    async function loadWorkout() {
      if (!workoutId) {
        // If new session, default to today if not set
        if (!sessionDate) setSessionDate(new Date())
        
        // Fetch zones if programId is available
        if (programId) {
            try {
                const res = await fetch(`/api/programs/${programId}/zones`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.zones) setUserZones(data.zones)
                }
            } catch (e) {
                console.error("Failed to load zones", e)
            }
        }
        return
      }

      try {
        const res = await fetch(`/api/workouts/${workoutId}`)
        if (!res.ok) throw new Error('Failed to load workout')
        
        const data = await res.json()
        setSessionName(data.name)
        if (data.zones) setUserZones(data.zones)
        
        if (data.day && data.day.date) {
          setSessionDate(new Date(data.day.date))
        }
        
        // Map segments
        const mappedSegments: CardioSegment[] = data.segments.map((s: any) => ({
          id: s.id,
          type: s.type as any,
          duration: s.duration || undefined,
          distance: s.distance || undefined,
          zone: s.zone ? s.zone.toString() : '1',
          pace: s.pace || '',
          heartRate: s.heartRate || '',
          notes: s.notes || '',
          distanceUnit: (s.distance && s.distance < 1) ? 'm' : 'km'
        }))
        
        setSegments(mappedSegments)
      } catch (error) {
        console.error('Error loading workout:', error)
        setSessionName('Error loading workout')
        toast.error(text(locale, 'Fel', 'Error'), {
          description: text(locale, 'Kunde inte ladda träningspasset.', 'Could not load the workout.'),
        })
      }
    }

    loadWorkout()
  }, [workoutId, programId, sessionDate])

  const handleSaveToLibrary = async () => {
    if (segments.length === 0) {
      toast.error(text(locale, 'Lägg till segment', 'Add segments'), {
        description: text(locale, 'Du måste lägga till minst ett segment för att spara passet.', 'You need to add at least one segment before saving the session.'),
      })
      return
    }

    setIsSaving(true)
    try {
      const segmentData = segments.map((s) => {
        if (isRepeatGroup(s)) {
          return {
            id: s.id,
            type: 'REPEAT_GROUP',
            repeats: s.repeats,
            restBetweenRounds: s.restBetweenRounds ? Math.round(s.restBetweenRounds * 60) : undefined,
            steps: s.steps.map((step) => ({
              id: step.id,
              type: step.type,
              duration: step.duration ? Math.round(step.duration * 60) : undefined,
              distance: step.distance ? Math.round(step.distance * 1000) : undefined,
              calories: step.calories || undefined,
              zone: step.zone ? parseInt(step.zone) : undefined,
              pace: step.pace || undefined,
              heartRate: step.heartRate || undefined,
              notes: step.notes || undefined,
              equipment: step.equipment || undefined,
              targetType: step.targetType && step.targetType !== 'none' ? step.targetType : undefined,
              targetValue: step.targetValue || undefined,
            })),
          }
        }
        if (isExerciseBlock(s)) {
          return {
            id: s.id,
            type: s.type,
            duration: s.duration ? Math.round(s.duration * 60) : undefined,
            notes: s.notes || undefined,
            exercises: s.exercises.map((exercise) => ({
              id: exercise.id,
              exerciseId: exercise.exerciseId,
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              restSeconds: exercise.restSeconds,
              notes: exercise.notes || undefined,
            })),
          }
        }
        return {
          id: s.id,
          type: s.type,
          duration: s.duration ? Math.round(s.duration * 60) : undefined,
          distance: s.distance ? Math.round(s.distance * 1000) : undefined,
          calories: s.calories || undefined,
          zone: s.zone ? parseInt(s.zone) : undefined,
          pace: s.pace || undefined,
          heartRate: s.heartRate || undefined,
          notes: s.notes || undefined,
          equipment: s.equipment || undefined,
          repeats: s.repeats && s.repeats > 1 ? s.repeats : undefined,
          restDuration: s.restDuration ? Math.round(s.restDuration * 60) : undefined,
        }
      })

      const payload = {
        name: sessionName,
        description: description || undefined,
        sport,
        segments: segmentData,
      }

      const isEditing = initialData?.id
      const url = isEditing
        ? `/api/cardio-sessions/${initialData.id}`
        : '/api/cardio-sessions'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...businessHeaders },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(
          isEditing
            ? text(locale, 'Pass uppdaterat!', 'Session updated!')
            : text(locale, 'Pass sparat!', 'Session saved!'),
          {
            description: text(
              locale,
              `"${sessionName}" har ${isEditing ? 'uppdaterats' : 'sparats'}.`,
              `"${sessionName}" has been ${isEditing ? 'updated' : 'saved'}.`
            ),
          }
        )
        onSaved?.(result.id || initialData?.id, sessionName)
      } else {
        const data = await response.json()
        toast.error(text(locale, 'Kunde inte spara', 'Could not save'), {
          description: data.error || text(locale, 'Ett fel uppstod.', 'An error occurred.'),
        })
      }
    } catch (error) {
      console.error('Failed to save session:', error)
      toast.error(text(locale, 'Kunde inte spara', 'Could not save'), {
        description: text(locale, 'Ett oväntat fel uppstod.', 'An unexpected error occurred.'),
      })
    } finally {
      setIsSaving(false)
    }
  }

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
      setSegments((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    setActiveId(null)
  }

  const addSegment = (templateId: string) => {
    const template = AVAILABLE_SEGMENTS.find(s => s.id === templateId)
    if (!template) return

    if (template.type === 'REPEAT_GROUP') {
      const newGroup: CardioRepeatGroup = {
        id: generateId(),
        type: 'REPEAT_GROUP',
        repeats: 4,
        steps: [
          { id: generateId(), type: 'INTERVAL', duration: 3, zone: '4', notes: '', targetType: 'none', targetValue: '', distanceUnit: 'km' },
          { id: generateId(), type: 'REST', duration: 1, zone: '1', notes: '', targetType: 'none', targetValue: '', distanceUnit: 'km' },
        ],
      }
      setSegments([...segments, newGroup])
      return
    }

    if (template.type === 'CORE' || template.type === 'PREHAB' || template.type === 'PLYOMETRIC') {
      const newBlock: CardioExerciseBlock = {
        id: generateId(),
        type: template.type,
        duration: template.defaultDuration || undefined,
        notes: template.type === 'PREHAB'
          ? 'Ledkontroll, vävnadskapacitet och riskområden kopplat till konditionspasset.'
          : template.type === 'PLYOMETRIC'
            ? 'Explosivitet, elastisk styrka och landningskvalitet kopplat till konditionspasset.'
            : 'Core-kontroll som stödjer hållning, kraftöverföring och teknikkvalitet.',
        exercises: [],
      }
      setSegments([...segments, newBlock])
      return
    }

    const newSegment: CardioFlatSegment = {
      id: generateId(),
      type: template.type as CardioFlatSegment['type'],
      duration: template.defaultDuration || undefined,
      zone: template.defaultZone,
      notes: template.notes || '',
      distanceUnit: (template.type === 'INTERVAL' || template.type === 'HILL') ? 'm' : 'km'
    }

    setSegments([...segments, newSegment])
  }

  const applyHockeyPreset = (preset: HockeyCardioPreset) => {
    setSessionName(preset.name)
    setDescription(preset.description)
    setSport(preset.sport)
    setSegments(preset.segments.map(buildCardioSegmentFromHockeyPreset))
  }

  const removeSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id))
  }

  const addGeneratedPattern = (steps: GeneratedPatternStep[]) => {
    if (!steps.length) return
    const newSegments: CardioFlatSegment[] = []
    for (const step of steps) {
      newSegments.push({
        id: generateId(),
        type: 'INTERVAL',
        zone: step.zone,
        equipment: step.equipment,
        notes: step.notes,
        distanceUnit: step.distanceUnit,
        calories: step.calories,
        distance: step.distance,
        duration: step.duration,
      })
      if (step.restAfter && step.restAfter > 0) {
        newSegments.push({
          id: generateId(),
          type: 'RECOVERY',
          zone: '1',
          duration: step.restAfter,
          distanceUnit: 'km',
          notes: 'Vila mellan rundor',
        })
      }
    }
    setSegments([...segments, ...newSegments])
  }

  // Repeat group helpers
  const updateRepeatGroup = (groupId: string, field: 'repeats' | 'restBetweenRounds', value: number) => {
    setSegments(segments.map(s => {
      if (s.id !== groupId || !isRepeatGroup(s)) return s
      return { ...s, [field]: value }
    }))
  }

  const updateChildStep = (groupId: string, stepId: string, field: string, value: any) => {
    setSegments(segments.map(s => {
      if (s.id !== groupId || !isRepeatGroup(s)) return s
      return {
        ...s,
        steps: s.steps.map(step => {
          if (step.id !== stepId) return step
          if (field === 'distance') {
            const distValue = typeof value === 'string' ? parseFloat(value) : value
            return { ...step, distance: step.distanceUnit === 'm' ? (distValue ? distValue / 1000 : undefined) : (distValue || undefined) }
          }
          return { ...step, [field]: value }
        }),
      }
    }))
  }

  const addChildStep = (groupId: string) => {
    setSegments(segments.map(s => {
      if (s.id !== groupId || !isRepeatGroup(s)) return s
      // Auto-insert a rest step before the new interval if the last step isn't already rest
      const lastStep = s.steps[s.steps.length - 1]
      const needsRest = lastStep && lastStep.type !== 'REST' && lastStep.type !== 'RECOVERY'
      const newSteps = [...s.steps]
      if (needsRest) {
        newSteps.push({
          id: generateId(),
          type: 'REST' as const,
          duration: 1,
          zone: '1',
          notes: '',
          targetType: 'none' as const,
          targetValue: '',
          distanceUnit: 'km' as const,
        })
      }
      newSteps.push({
        id: generateId(),
        type: 'INTERVAL' as const,
        duration: 3,
        zone: '4',
        notes: '',
        targetType: 'none' as const,
        targetValue: '',
        distanceUnit: 'km' as const,
      })
      return { ...s, steps: newSteps }
    }))
  }

  const removeChildStep = (groupId: string, stepId: string) => {
    setSegments(segments.map(s => {
      if (s.id !== groupId || !isRepeatGroup(s)) return s
      return { ...s, steps: s.steps.filter(step => step.id !== stepId) }
    }))
  }

  const addRestAfterStep = (groupId: string, afterStepId: string) => {
    setSegments(segments.map(s => {
      if (s.id !== groupId || !isRepeatGroup(s)) return s
      const idx = s.steps.findIndex(step => step.id === afterStepId)
      if (idx === -1) return s
      const newSteps = [...s.steps]
      newSteps.splice(idx + 1, 0, {
        id: generateId(),
        type: 'REST' as const,
        duration: 1,
        zone: '1',
        notes: '',
        targetType: 'none' as const,
        targetValue: '',
        distanceUnit: 'km' as const,
      })
      return { ...s, steps: newSteps }
    }))
  }

  const updateSegment = (id: string, field: keyof CardioFlatSegment, value: any) => {
    setSegments(segments.map(s => {
      if (s.id !== id || isRepeatGroup(s) || isExerciseBlock(s)) return s

      const updated = { ...s }

      // Handle distance unit conversion immediately so state is always in KM
      if (field === 'distance') {
        const distValue = typeof value === 'string' ? parseFloat(value) : value
        if (updated.distanceUnit === 'm') {
            updated.distance = distValue ? distValue / 1000 : undefined
        } else {
            updated.distance = distValue || undefined
        }
      } else {
        // Direct update for other fields
        // @ts-ignore
        updated[field] = value

        // Auto-calculate Heart Rate if Zone changes
        if (field === 'zone' && userZones) {
           const zoneVal = parseInt(value as string)
           if (!isNaN(zoneVal)) {
               let zoneData = null
               
               // Try array access (assuming index = zone - 1 if array)
               if (Array.isArray(userZones)) {
                   if (userZones[zoneVal - 1]) zoneData = userZones[zoneVal - 1]
               } else if (typeof userZones === 'object') {
                   // Try keys like "1", "zone1"
                   if (userZones[zoneVal]) zoneData = userZones[zoneVal]
                   else if (userZones[`zone${zoneVal}`]) zoneData = userZones[`zone${zoneVal}`]
                   else if (userZones[zoneVal.toString()]) zoneData = userZones[zoneVal.toString()]
               }
               
               if (zoneData) {
                   // Look for common property names for min/max HR
                   const min = zoneData.min ?? zoneData.from ?? zoneData.hrMin ?? zoneData.lower
                   const max = zoneData.max ?? zoneData.to ?? zoneData.hrMax ?? zoneData.upper
                   
                   if (min !== undefined && max !== undefined) {
                       updated.heartRate = `${min}-${max}`
                   }
               }
           }
        }
      }

      return updated
    }))
  }

  const updateExerciseBlock = (blockId: string, field: 'duration' | 'notes', value: number | string) => {
    setSegments(segments.map((s) => {
      if (s.id !== blockId || !isExerciseBlock(s)) return s
      return { ...s, [field]: value }
    }))
  }

  const addSupplementalExercise = (blockId: string, exerciseId: string) => {
    const template = availableExercises.find((exercise) => exercise.id === exerciseId)
    if (!template) return

    setSegments(segments.map((s) => {
      if (s.id !== blockId || !isExerciseBlock(s)) return s
      const newExercise: CardioSupplementalExercise = {
        id: generateId(),
        exerciseId: template.id,
        name: template.name,
        sets: 2,
        reps: s.type === 'PREHAB' ? '8-12 kontrollerat' : s.type === 'PLYOMETRIC' ? '3-6 explosivt' : '10-15',
        restSeconds: 30,
      }
      return { ...s, exercises: [...s.exercises, newExercise] }
    }))
  }

  const updateSupplementalExercise = (
    blockId: string,
    itemId: string,
    field: keyof Omit<CardioSupplementalExercise, 'id' | 'exerciseId' | 'name'>,
    value: string | number
  ) => {
    setSegments(segments.map((s) => {
      if (s.id !== blockId || !isExerciseBlock(s)) return s
      return {
        ...s,
        exercises: s.exercises.map((exercise) =>
          exercise.id === itemId ? { ...exercise, [field]: value } : exercise
        ),
      }
    }))
  }

  const removeSupplementalExercise = (blockId: string, itemId: string) => {
    setSegments(segments.map((s) => {
      if (s.id !== blockId || !isExerciseBlock(s)) return s
      return { ...s, exercises: s.exercises.filter((exercise) => exercise.id !== itemId) }
    }))
  }

  const calculateSegment = (id: string, triggeredField: keyof CardioFlatSegment) => {
    setSegments(currentSegments => currentSegments.map(s => {
      if (s.id !== id || isRepeatGroup(s) || isExerciseBlock(s)) return s

      const updated = { ...s }
      
      // Auto-calculation logic triggered on blur
      // Relations: T = D * P  <=>  D = T / P  <=>  P = T / D

      if (triggeredField === 'duration') {
        const dur = updated.duration
        if (!dur || dur <= 0) return updated

        const p = updated.pace ? paceToDecimal(updated.pace) : null
        
        // If Pace exists, calculate Distance
        if (p && p > 0) {
           updated.distance = Number((dur / p).toFixed(3)) // High precision for km
        } 
        // Else if Distance exists, calculate Pace
        else if (updated.distance && updated.distance > 0) {
           const newPace = dur / updated.distance
           updated.pace = decimalToPace(newPace)
        }
      } 
      else if (triggeredField === 'distance') {
        const distKm = updated.distance
        if (!distKm || distKm <= 0) return updated
        
        const p = updated.pace ? paceToDecimal(updated.pace) : null

        // If Pace exists, calculate Duration
        if (p && p > 0) {
            updated.duration = Number((distKm * p).toFixed(1))
        } 
        // Else if Duration exists, calculate Pace
        else if (updated.duration && updated.duration > 0) {
            const newPace = updated.duration / distKm
            updated.pace = decimalToPace(newPace)
        }
      }
      else if (triggeredField === 'pace') {
        const pStr = updated.pace
        const p = pStr ? paceToDecimal(pStr) : null
        
        if (p && p > 0) {
             // If Duration exists, calculate Distance
             if (updated.duration && updated.duration > 0) {
                 updated.distance = Number((updated.duration / p).toFixed(3))
             } 
             // Else if Distance exists, calculate Duration
             else if (updated.distance && updated.distance > 0) {
                 updated.duration = Number((updated.distance * p).toFixed(1))
             }
        }
      }

      return updated
    }))
  }

  const getSessionData = () => {
    if (segments.length === 0) return null
    return {
      sessionName,
      sport,
      segments,
      date: sessionDate || new Date(),
    }
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Builder Area */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
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
                    placeholder="Beskriv passets syfte eller anteckningar..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="space-y-2 w-[150px]">
                <Label>Sport</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUNNING">Löpning</SelectItem>
                    <SelectItem value="CYCLING">Cykling</SelectItem>
                    <SelectItem value="SWIMMING">Simning</SelectItem>
                    <SelectItem value="SKIING">Skidor</SelectItem>
                    <SelectItem value="TRIATHLON">Triathlon</SelectItem>
                    <SelectItem value="HYROX">HYROX</SelectItem>
                    <SelectItem value="TEAM_ICE_HOCKEY">Ishockey</SelectItem>
                    <SelectItem value="GENERAL_FITNESS">Allmän Kondition</SelectItem>
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
          <CardContent>
            <div className="bg-muted/30 min-h-[400px] rounded-lg p-4 border-2 border-dashed border-muted-foreground/25">
              {segments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <Activity className="h-12 w-12 opacity-50" />
                  <p>Dra segment hit eller klicka &quot;+&quot; för att lägga till</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={segments.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {segments.map((segment) =>
                        isRepeatGroup(segment) ? (
                          <SortableRepeatGroupItem
                            key={segment.id}
                            group={segment}
                            onRemove={() => removeSegment(segment.id)}
                            onUpdateGroup={updateRepeatGroup}
                            onUpdateStep={updateChildStep}
                            onAddStep={addChildStep}
                            onRemoveStep={removeChildStep}
                            onAddRestAfter={addRestAfterStep}
                          />
                        ) : isExerciseBlock(segment) ? (
                          <SortableExerciseBlockItem
                            key={segment.id}
                            block={segment}
                            availableExercises={availableExercises}
                            onRemove={() => removeSegment(segment.id)}
                            onUpdateBlock={updateExerciseBlock}
                            onAddExercise={addSupplementalExercise}
                            onUpdateExercise={updateSupplementalExercise}
                            onRemoveExercise={removeSupplementalExercise}
                          />
                        ) : (
                          <SortableSegmentItem
                            key={segment.id}
                            segment={segment}
                            onRemove={() => removeSegment(segment.id)}
                            onUpdate={updateSegment}
                            onCalculate={calculateSegment}
                          />
                        )
                      )}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="opacity-50">
                        {(() => {
                          const seg = segments.find(s => s.id === activeId)!
                          if (isRepeatGroup(seg)) {
                            return <div className="bg-card border-2 border-indigo-400 rounded-md p-3 shadow-lg"><Badge className="bg-indigo-500 text-white">Repeat Group x{seg.repeats}</Badge></div>
                          }
                          if (isExerciseBlock(seg)) {
                            const label = seg.type === 'PREHAB' ? 'Stabilitet / Prehab' : seg.type === 'PLYOMETRIC' ? 'Plyometri' : 'Core'
                            const borderClass = seg.type === 'PREHAB' ? 'border-teal-400' : seg.type === 'PLYOMETRIC' ? 'border-amber-400' : 'border-purple-400'
                            const badgeClass = seg.type === 'PREHAB' ? 'bg-teal-500' : seg.type === 'PLYOMETRIC' ? 'bg-amber-500' : 'bg-purple-500'
                            return <div className={`bg-card border-2 ${borderClass} rounded-md p-3 shadow-lg`}><Badge className={`${badgeClass} text-white`}>{label}</Badge></div>
                          }
                          return <SortableSegmentItem segment={seg} onRemove={() => {}} onUpdate={() => {}} onCalculate={() => {}} isOverlay />
                        })()}
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
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Hockeymallar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {HOCKEY_CARDIO_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                className="h-auto w-full justify-start whitespace-normal px-3 py-2 text-left"
                onClick={() => applyHockeyPreset(preset)}
              >
                <span>
                  <span className="block font-medium">{preset.name}</span>
                  <span className="block text-xs text-muted-foreground">{preset.description}</span>
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lägg till segment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {AVAILABLE_SEGMENTS.map(seg => (
              <Button
                key={seg.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addSegment(seg.id)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {seg.name}
              </Button>
            ))}
            <Button
              variant="default"
              className="w-full justify-start mt-2"
              onClick={() => setPatternDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Mönsterblock (stege/triplet/anpassad)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sammanfattning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total tid:</span>
              <span className="font-medium">
                {segments.reduce((acc, s) => {
                  if (isRepeatGroup(s)) {
                    const stepsDur = s.steps.reduce((sum, step) => sum + (step.duration || 0), 0)
                    const roundRest = s.restBetweenRounds || 0
                    return acc + (stepsDur * s.repeats) + (roundRest * Math.max(s.repeats - 1, 0))
                  }
                  if (isExerciseBlock(s)) return acc + (s.duration || 0)
                  const reps = s.repeats && s.repeats > 1 ? s.repeats : 1
                  const dur = (s.duration || 0) * reps
                  const rest = (s.restDuration || 0) * (reps > 1 ? reps - 1 : 0)
                  return acc + dur + rest
                }, 0)} min
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total distans:</span>
              <span className="font-medium">
                {segments.reduce((acc, s) => {
                  if (isRepeatGroup(s)) {
                    const stepsDist = s.steps.reduce((sum, step) => sum + (step.distance || 0), 0)
                    return acc + stepsDist * s.repeats
                  }
                  if (isExerciseBlock(s)) return acc
                  const reps = s.repeats && s.repeats > 1 ? s.repeats : 1
                  return acc + (s.distance || 0) * reps
                }, 0).toFixed(1)} km
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Snittzon:</span>
              <span className="font-medium">
                Z{Math.round(segments.reduce((acc, s) => acc + (!isRepeatGroup(s) && !isExerciseBlock(s) ? parseInt(s.zone || '0') : 0), 0) / (segments.filter(s => !isRepeatGroup(s) && !isExerciseBlock(s)).length || 1))}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                onClick={handleSaveToLibrary}
                disabled={isSaving || segments.length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sparar...
                  </>
                ) : (
                  initialData ? 'Uppdatera pass' : 'Spara pass'
                )}
              </Button>
              {initialData?.id && (
                <PrintWorkoutButton
                  kind="cardio"
                  workoutId={initialData.id}
                  label="Skriv ut"
                  className="shrink-0"
                />
              )}
              <SessionExportButton
                sessionType="cardio"
                getSessionData={getSessionData}
                disabled={segments.length === 0}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    <PatternBlockDialog
      open={patternDialogOpen}
      onOpenChange={setPatternDialogOpen}
      equipmentOptions={EQUIPMENT_OPTIONS}
      equipmentLabelByValue={EQUIPMENT_LABEL_BY_VALUE}
      onAdd={addGeneratedPattern}
    />
    </>
  )
}

function SortableSegmentItem({
  segment,
  onRemove,
  onUpdate,
  onCalculate,
  isOverlay = false
}: {
  segment: CardioFlatSegment
  onRemove: () => void
  onUpdate: (id: string, field: keyof CardioFlatSegment, value: any) => void
  onCalculate: (id: string, field: keyof CardioFlatSegment) => void
  isOverlay?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: segment.id })

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
          <div className="flex items-center gap-2">
            <Badge variant="outline">{segment.type}</Badge>
            {segment.type === 'INTERVAL' && (
                 <div className="flex items-center gap-4 ml-2">
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Upprepa:</Label>
                        <Input 
                            type="number" 
                            min={1}
                            className="h-6 w-12 text-xs px-1" 
                            value={segment.repeats || 1}
                            onChange={(e) => onUpdate(segment.id, 'repeats', parseInt(e.target.value) || 1)}
                        />
                        <span className="text-xs text-muted-foreground">ggr</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Vila:</Label>
                        <Input 
                            type="number"
                            min={0}
                            step={0.5}
                            className="h-6 w-14 text-xs px-1" 
                            value={segment.restDuration || ''}
                            onChange={(e) => onUpdate(segment.id, 'restDuration', parseFloat(e.target.value))}
                            placeholder="min"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                    </div>
                 </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-4">
            <Label className="text-xs text-muted-foreground">Utrustning</Label>
            <Select
              value={segment.equipment || ''}
              onValueChange={(v) => onUpdate(segment.id, 'equipment', v)}
            >
              <SelectTrigger className="h-7 text-sm">
                <SelectValue placeholder="Välj utrustning..." />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tid (min)</Label>
            <div className="flex items-center">
              <Timer className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input
                type="number"
                value={segment.duration || ''}
                onChange={(e) => onUpdate(segment.id, 'duration', parseFloat(e.target.value))}
                onBlur={() => onCalculate(segment.id, 'duration')}
                className="h-7 text-sm"
                placeholder="min"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Distans</Label>
            <div className="flex items-center gap-1">
              <div className="relative flex-1">
                <Footprints className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  type="number"
                  value={segment.distance 
                    ? (segment.distanceUnit === 'm' ? Math.round(segment.distance * 1000) : segment.distance) 
                    : ''} 
                  onChange={(e) => onUpdate(segment.id, 'distance', parseFloat(e.target.value))}
                  onBlur={() => onCalculate(segment.id, 'distance')}
                  className="h-7 pl-7 text-sm" 
                  placeholder={segment.distanceUnit || 'km'}
                />
              </div>
              <Select 
                value={segment.distanceUnit || 'km'} 
                onValueChange={(v) => onUpdate(segment.id, 'distanceUnit', v)}
              >
                <SelectTrigger className="h-7 w-[60px] text-xs px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">km</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Kalorier</Label>
            <div className="flex items-center">
              <Activity className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input
                type="number"
                value={segment.calories || ''}
                onChange={(e) => onUpdate(segment.id, 'calories', parseInt(e.target.value) || undefined)}
                className="h-7 text-sm"
                placeholder="cal"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tempo (min/km)</Label>
            <div className="flex items-center">
              <Gauge className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input
                value={segment.pace || ''}
                onChange={(e) => onUpdate(segment.id, 'pace', e.target.value)}
                onBlur={() => onCalculate(segment.id, 'pace')}
                className="h-7 text-sm"
                placeholder="5:30"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Puls (bpm/zon)</Label>
            <div className="flex items-center">
              <Heart className="h-3 w-3 mr-1 text-muted-foreground" />
              <Input 
                value={segment.heartRate || ''} 
                onChange={(e) => onUpdate(segment.id, 'heartRate', e.target.value)}
                className="h-7 text-sm" 
                placeholder="145-155"
              />
            </div>
          </div>
           <div>
            <Label className="text-xs text-muted-foreground">Zon (1-5)</Label>
            <div className="flex items-center">
              <Activity className="h-3 w-3 mr-1 text-muted-foreground" />
              <Select 
                value={segment.zone} 
                onValueChange={(v) => onUpdate(segment.id, 'zone', v)}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(z => (
                    <SelectItem key={z} value={z.toString()}>{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SortableExerciseBlockItem({
  block,
  availableExercises,
  onRemove,
  onUpdateBlock,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
}: {
  block: CardioExerciseBlock
  availableExercises: LibraryExercise[]
  onRemove: () => void
  onUpdateBlock: (blockId: string, field: 'duration' | 'notes', value: number | string) => void
  onAddExercise: (blockId: string, exerciseId: string) => void
  onUpdateExercise: (
    blockId: string,
    itemId: string,
    field: keyof Omit<CardioSupplementalExercise, 'id' | 'exerciseId' | 'name'>,
    value: string | number
  ) => void
  onRemoveExercise: (blockId: string, itemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const isPrehab = block.type === 'PREHAB'
  const isPlyometric = block.type === 'PLYOMETRIC'
  const Icon = isPrehab ? ShieldCheck : isPlyometric ? Zap : Target
  const label = isPrehab ? 'Stabilitet / Prehab' : isPlyometric ? 'Plyometri' : 'Core'
  const colorClasses = isPrehab
    ? { border: 'border-teal-300', badge: 'bg-teal-500' }
    : isPlyometric
      ? { border: 'border-amber-300', badge: 'bg-amber-500' }
      : { border: 'border-purple-300', badge: 'bg-purple-500' }
  const filteredExercises = availableExercises.filter((exercise) =>
    isPrehab
      ? matchesStrengthLibraryCategoryFilter(exercise, PREHAB_STABILITY_FILTER)
      : matchesStrengthLibraryCategoryFilter(exercise, isPlyometric ? 'PLYOMETRIC' : 'CORE')
  )

  return (
    <div ref={setNodeRef} style={style} className={`bg-card border rounded-md p-3 space-y-3 ${colorClasses.border}`}>
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
        <Badge className={`${colorClasses.badge} text-white`}>
          <Icon className="h-3 w-3 mr-1" />
          {label}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Tid</Label>
          <Input
            type="number"
            min={0}
            className="h-7 w-16 text-sm"
            value={block.duration || ''}
            onChange={(e) => onUpdateBlock(block.id, 'duration', parseFloat(e.target.value) || 0)}
            placeholder="min"
          />
          <span className="text-xs text-muted-foreground">min</span>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Textarea
        value={block.notes || ''}
        onChange={(e) => onUpdateBlock(block.id, 'notes', e.target.value)}
        className="min-h-[64px] text-sm"
        placeholder={isPrehab ? 'Syfte, riskområde eller coachnotering...' : isPlyometric ? 'Syfte, intensitet eller coachnotering...' : 'Syfte eller coachnotering...'}
      />

      <div className="flex gap-2">
        <Select onValueChange={(exerciseId) => onAddExercise(block.id, exerciseId)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={isPrehab ? 'Lägg till prehabövning...' : isPlyometric ? 'Lägg till plyometrisk övning...' : 'Lägg till coreövning...'} />
          </SelectTrigger>
          <SelectContent>
            {filteredExercises.map((exercise) => (
              <SelectItem key={exercise.id} value={exercise.id}>
                {exercise.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {block.exercises.length > 0 ? (
        <div className="space-y-2">
          {block.exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-md border bg-muted/20 p-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{exercise.name}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveExercise(block.id, exercise.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Set</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-7 text-sm"
                    value={exercise.sets}
                    onChange={(e) => onUpdateExercise(block.id, exercise.id, 'sets', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reps/tid</Label>
                  <Input
                    className="h-7 text-sm"
                    value={exercise.reps}
                    onChange={(e) => onUpdateExercise(block.id, exercise.id, 'reps', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vila (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-7 text-sm"
                    value={exercise.restSeconds}
                    onChange={(e) => onUpdateExercise(block.id, exercise.id, 'restSeconds', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Notering</Label>
                  <Input
                    className="h-7 text-sm"
                    value={exercise.notes || ''}
                    onChange={(e) => onUpdateExercise(block.id, exercise.id, 'notes', e.target.value)}
                    placeholder="valfritt"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Lägg till övningar som hör till konditionspasset.
        </div>
      )}
    </div>
  )
}

function SortableRepeatGroupItem({
  group,
  onRemove,
  onUpdateGroup,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
  onAddRestAfter,
}: {
  group: CardioRepeatGroup
  onRemove: () => void
  onUpdateGroup: (groupId: string, field: 'repeats' | 'restBetweenRounds', value: number) => void
  onUpdateStep: (groupId: string, stepId: string, field: string, value: any) => void
  onAddStep: (groupId: string) => void
  onRemoveStep: (groupId: string, stepId: string) => void
  onAddRestAfter: (groupId: string, afterStepId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: group.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="border-2 border-indigo-400/50 rounded-lg bg-indigo-50/30 dark:bg-indigo-950/20">
      {/* Group header */}
      <div className="flex items-center gap-3 p-3 border-b border-indigo-200/50">
        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
        <Badge className="bg-indigo-500 text-white shrink-0">
          <Repeat className="h-3 w-3 mr-1" />
          REPEAT GROUP
        </Badge>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">Rundor:</Label>
          <Input
            type="number"
            min={1}
            className="h-6 w-14 text-xs px-1"
            value={group.repeats}
            onChange={(e) => onUpdateGroup(group.id, 'repeats', parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">Vila mellan rundor:</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            className="h-6 w-14 text-xs px-1"
            value={group.restBetweenRounds || ''}
            onChange={(e) => onUpdateGroup(group.id, 'restBetweenRounds', parseFloat(e.target.value) || 0)}
            placeholder="min"
          />
          <span className="text-xs text-muted-foreground">min</span>
        </div>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Child steps */}
      <div className="p-3 space-y-2">
        {group.steps.map((step, idx) => (
          <ChildStepRow
            key={step.id}
            step={step}
            stepIndex={idx + 1}
            groupId={group.id}
            onUpdate={onUpdateStep}
            onRemove={() => onRemoveStep(group.id, step.id)}
            onAddRestAfter={() => onAddRestAfter(group.id, step.id)}
            canRemove={group.steps.length > 1}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => onAddStep(group.id)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Lägg till steg
        </Button>
      </div>
    </div>
  )
}

function ChildStepRow({
  step,
  stepIndex,
  groupId,
  onUpdate,
  onRemove,
  onAddRestAfter,
  canRemove,
}: {
  step: CardioChildStep
  stepIndex: number
  groupId: string
  onUpdate: (groupId: string, stepId: string, field: string, value: any) => void
  onRemove: () => void
  onAddRestAfter: () => void
  canRemove: boolean
}) {
  const isRest = step.type === 'REST' || step.type === 'RECOVERY'

  return (
    <div className={`rounded-md border p-2 space-y-2 ${isRest ? 'bg-muted/50 border-dashed' : 'bg-card'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono w-4">{stepIndex}.</span>
        <Select value={step.type} onValueChange={(v) => onUpdate(groupId, step.id, 'type', v)}>
          <SelectTrigger className="h-6 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INTERVAL">Intervall</SelectItem>
            <SelectItem value="STEADY">Steady</SelectItem>
            <SelectItem value="REST">Vila</SelectItem>
            <SelectItem value="RECOVERY">Recovery</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Timer className="h-3 w-3 text-muted-foreground" />
          <Input
            type="number"
            className="h-6 w-14 text-xs px-1"
            value={step.duration || ''}
            onChange={(e) => onUpdate(groupId, step.id, 'duration', parseFloat(e.target.value))}
            placeholder="min"
          />
          <span className="text-xs text-muted-foreground">min</span>
        </div>

        {!isRest && (
          <>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                className="h-6 w-14 text-xs px-1"
                value={step.calories || ''}
                onChange={(e) => onUpdate(groupId, step.id, 'calories', parseInt(e.target.value) || undefined)}
                placeholder="cal"
              />
              <span className="text-xs text-muted-foreground">cal</span>
            </div>

            <div className="flex items-center gap-1">
              <Select value={step.targetType || 'none'} onValueChange={(v) => onUpdate(groupId, step.id, 'targetType', v)}>
                <SelectTrigger className="h-6 w-24 text-xs">
                  <SelectValue placeholder="Mål..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Inget mål</SelectItem>
                  <SelectItem value="power">Watt</SelectItem>
                  <SelectItem value="cadence">RPM</SelectItem>
                  <SelectItem value="pace">Tempo</SelectItem>
                  <SelectItem value="hr">Puls</SelectItem>
                </SelectContent>
              </Select>
              {step.targetType && step.targetType !== 'none' && (
                <Input
                  className="h-6 w-20 text-xs px-1"
                  value={step.targetValue || ''}
                  onChange={(e) => onUpdate(groupId, step.id, 'targetValue', e.target.value)}
                  placeholder={step.targetType === 'power' ? '250' : step.targetType === 'cadence' ? '62' : step.targetType === 'pace' ? '2:05' : '145-155'}
                />
              )}
            </div>

            <Select
              value={step.equipment || ''}
              onValueChange={(v) => onUpdate(groupId, step.id, 'equipment', v)}
            >
              <SelectTrigger className="h-6 w-32 text-xs">
                <SelectValue placeholder="Utrustning..." />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {!isRest && (
            <Button variant="ghost" size="sm" onClick={onAddRestAfter} className="h-5 px-1 text-xs text-muted-foreground" title="Lägg till vila efter">
              +Vila
            </Button>
          )}
          {canRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove} className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
