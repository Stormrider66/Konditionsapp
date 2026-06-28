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
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Plus, Trash2, Timer, Activity, Footprints, Heart, Gauge, Repeat, Loader2, X, Target, ShieldCheck, Zap, Sparkles } from 'lucide-react'
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
import type { CardioSessionData } from '@/types'
import { PatternBlockDialog, type GeneratedPatternStep } from './PatternBlockDialog'
import { HOCKEY_CARDIO_PRESETS, type HockeyCardioPreset } from '@/lib/hockey/hockey-builder-presets'
import { useLocale } from '@/i18n/client'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'
import {
  getDefaultTrainingYear,
  useWorkoutLibraryAthletes,
  useWorkoutLibraryTeams,
  WorkoutAthleteTagField,
  WorkoutTeamYearFields,
} from '@/components/workouts/WorkoutLibraryMetadataFields'
import {
  getWorkoutAthleteIdFromTags,
  setWorkoutAthleteTag,
} from '@/lib/workouts/business-tags'
import {
  AVAILABLE_SEGMENTS,
  DurationInput,
  EQUIPMENT_OPTIONS,
  buildCardioSegmentFromHockeyPreset,
  decimalToPace,
  equipmentLabel,
  equipmentUsesPower,
  generateId,
  getSegmentTemplateName,
  isExerciseBlock,
  isRepeatGroup,
  isWorkEffort,
  minutesToDurationString,
  paceToDecimal,
  text,
  type AppLocale,
  type CardioChildStep,
  type CardioExerciseBlock,
  type CardioFlatSegment,
  type CardioRelativeRef,
  type CardioRepeatGroup,
  type CardioSegment,
  type CardioSupplementalExercise,
  type LibraryExercise,
} from './cardio-session-model'

interface CardioSessionBuilderProps {
  initialData?: CardioSessionData | null
  onSaved?: (sessionId?: string, sessionName?: string) => void
  onCancel?: () => void
  businessId?: string
}

export function CardioSessionBuilder({ initialData, onSaved, onCancel, businessId }: CardioSessionBuilderProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const localizedEquipmentOptions = React.useMemo(
    () => EQUIPMENT_OPTIONS.map((option) => ({
      value: option.value,
      label: equipmentLabel(option, locale),
    })),
    [locale]
  )
  const localizedEquipmentLabelByValue = React.useMemo(
    () => localizedEquipmentOptions.reduce<Record<string, string>>(
      (acc, option) => ({ ...acc, [option.value]: option.label }),
      {}
    ),
    [localizedEquipmentOptions]
  )
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
  const [teamId, setTeamId] = useState<string | null>(initialData?.teamId ?? null)
  const [trainingYear, setTrainingYear] = useState<number | null>(initialData?.trainingYear ?? getDefaultTrainingYear())
  const [athleteTagClientId, setAthleteTagClientId] = useState<string | null>(
    getWorkoutAthleteIdFromTags(initialData?.tags)
  )
  const [segments, setSegments] = useState<CardioSegment[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionDate, setSessionDate] = useState<Date | null>(null)
  const [repeatCount, setRepeatCount] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [userZones, setUserZones] = useState<any>(null)
  const [patternDialogOpen, setPatternDialogOpen] = useState(false)
  const [availableExercises, setAvailableExercises] = useState<LibraryExercise[]>([])
  const { teams } = useWorkoutLibraryTeams(businessHeaders)
  const { athletes } = useWorkoutLibraryAthletes(businessHeaders, businessId)

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setSessionName(initialData.name)
      setDescription(initialData.description || '')
      setSport(initialData.sport || 'RUNNING')
      setTeamId(initialData.teamId ?? null)
      setTrainingYear(initialData.trainingYear ?? null)
      setAthleteTagClientId(getWorkoutAthleteIdFromTags(initialData.tags))
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
              repeatsMax: s.repeatsMax ?? undefined,
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
                targetRelTo: step.targetRelTo ?? undefined,
                targetRelPercent: step.targetRelPercent ?? (step.targetRelTo ? 80 : undefined),
                isBenchmark: step.isBenchmark ?? undefined,
                optional: step.optional ?? undefined,
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
            power: s.power || '',
            cadence: s.cadence || '',
            powerRelTo: s.powerRelTo ?? undefined,
            powerRelPercent: s.powerRelPercent ?? (s.powerRelTo ? 80 : undefined),
            isBenchmark: s.isBenchmark ?? undefined,
            optional: s.optional ?? undefined,
            notes: s.notes || '',
            equipment: s.equipment || '',
            repeats: s.repeats || undefined,
            repeatsMax: s.repeatsMax ?? undefined,
            restDuration: s.restDuration ? s.restDuration / 60 : undefined,
            distanceUnit: (s.distance && s.distance < 1000) ? 'm' : 'km',
          } as CardioFlatSegment
        })
      )
    } else {
      // Reset form for new session
      setSessionName(text(locale, 'Nytt Konditionspass', 'New Cardio Session'))
      setDescription('')
      setSport('RUNNING')
      setTeamId(null)
      setTrainingYear(getDefaultTrainingYear())
      setSegments([])
    }
  }, [initialData, locale])

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
        setSessionName(text(locale, 'Fel vid laddning', 'Error loading workout'))
        toast.error(text(locale, 'Fel', 'Error'), {
          description: text(locale, 'Kunde inte ladda träningspasset.', 'Could not load the workout.'),
        })
      }
    }

    loadWorkout()
  }, [workoutId, programId, sessionDate, locale])

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
            repeatsMax: s.repeatsMax && s.repeatsMax > s.repeats ? s.repeatsMax : undefined,
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
              targetRelTo: step.targetRelTo || undefined,
              targetRelPercent: step.targetRelTo ? (step.targetRelPercent || 80) : undefined,
              isBenchmark: step.isBenchmark || undefined,
              optional: step.optional || undefined,
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
          power: s.power || undefined,
          cadence: s.cadence || undefined,
          powerRelTo: s.powerRelTo || undefined,
          powerRelPercent: s.powerRelTo ? (s.powerRelPercent || 80) : undefined,
          isBenchmark: s.isBenchmark || undefined,
          optional: s.optional || undefined,
          notes: s.notes || undefined,
          equipment: s.equipment || undefined,
          repeats: s.repeats && s.repeats > 1 ? s.repeats : undefined,
          repeatsMax: s.repeatsMax && s.repeatsMax > (s.repeats || 1) ? s.repeatsMax : undefined,
          restDuration: s.restDuration ? Math.round(s.restDuration * 60) : undefined,
        }
      })

      const payload = {
        name: sessionName,
        description: description || undefined,
        sport,
        teamId,
        trainingYear,
        tags: setWorkoutAthleteTag(initialData?.tags, athleteTagClientId),
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
          ? text(locale, 'Ledkontroll, vävnadskapacitet och riskområden kopplat till konditionspasset.', 'Joint control, tissue capacity, and risk areas connected to the cardio session.')
          : template.type === 'PLYOMETRIC'
            ? text(locale, 'Explosivitet, elastisk styrka och landningskvalitet kopplat till konditionspasset.', 'Explosiveness, elastic strength, and landing quality connected to the cardio session.')
            : text(locale, 'Core-kontroll som stödjer hållning, kraftöverföring och teknikkvalitet.', 'Core control supporting posture, force transfer, and technical quality.'),
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
          notes: text(locale, 'Vila mellan rundor', 'Rest between rounds'),
        })
      }
    }
    setSegments([...segments, ...newSegments])
  }

  // Repeat group helpers
  const updateRepeatGroup = (groupId: string, field: 'repeats' | 'repeatsMax' | 'restBetweenRounds', value: number | undefined) => {
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

  // Switch a child step's power target between absolute watts ('abs') and a
  // relative % of a reference ('OPENER' | 'FTP' | 'CP'). Clears the other fields
  // so the two modes never coexist.
  const setStepPowerMode = (groupId: string, stepId: string, mode: string) => {
    setSegments(segments.map(s => {
      if (s.id !== groupId || !isRepeatGroup(s)) return s
      return {
        ...s,
        steps: s.steps.map(step => {
          if (step.id !== stepId) return step
          if (mode === 'abs') return { ...step, targetRelTo: undefined, targetRelPercent: undefined }
          // Default the % to 80 so a relative target is never saved without a value.
          return { ...step, targetRelTo: mode as CardioRelativeRef, targetValue: '', targetRelPercent: step.targetRelPercent ?? 80 }
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

  // Switch a flat segment's power target between absolute watts ('abs') and a
  // relative % of a reference ('OPENER' | 'FTP' | 'CP'). Clears the other fields.
  const setSegmentPowerMode = (id: string, mode: string) => {
    setSegments(segments.map(s => {
      if (s.id !== id || isRepeatGroup(s) || isExerciseBlock(s)) return s
      if (mode === 'abs') return { ...s, powerRelTo: undefined, powerRelPercent: undefined }
      // Default the % to 80 so a relative target is never saved without a value.
      return { ...s, powerRelTo: mode as CardioRelativeRef, power: undefined, powerRelPercent: s.powerRelPercent ?? 80 }
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
                  <Label>{text(locale, 'Passnamn', 'Session name')}</Label>
                  <Input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="text-lg font-semibold"
                    placeholder={text(locale, 'Ge passet ett namn...', 'Give the session a name...')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{text(locale, 'Beskrivning (valfritt)', 'Description (optional)')}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={text(locale, 'Beskriv passets syfte eller anteckningar...', 'Describe the session purpose or notes...')}
                    rows={2}
                  />
                </div>
                <WorkoutTeamYearFields
                  teams={teams}
                  teamId={teamId}
                  trainingYear={trainingYear}
                  onTeamIdChange={setTeamId}
                  onTrainingYearChange={setTrainingYear}
                />
                <WorkoutAthleteTagField
                  athletes={athletes}
                  athleteId={athleteTagClientId}
                  onAthleteIdChange={setAthleteTagClientId}
                />
              </div>
              <div className="space-y-2 w-[150px]">
                <Label>Sport</Label>
                <Select value={sport} onValueChange={setSport}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUNNING">{text(locale, 'Löpning', 'Running')}</SelectItem>
                    <SelectItem value="CYCLING">{text(locale, 'Cykling', 'Cycling')}</SelectItem>
                    <SelectItem value="SWIMMING">{text(locale, 'Simning', 'Swimming')}</SelectItem>
                    <SelectItem value="SKIING">{text(locale, 'Skidor', 'Skiing')}</SelectItem>
                    <SelectItem value="TRIATHLON">Triathlon</SelectItem>
                    <SelectItem value="HYROX">HYROX</SelectItem>
                    <SelectItem value="TEAM_ICE_HOCKEY">{text(locale, 'Ishockey', 'Ice hockey')}</SelectItem>
                    <SelectItem value="GENERAL_FITNESS">{text(locale, 'Allmän Kondition', 'General Fitness')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {onCancel && (
              <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                <span>{text(locale, 'Redigerar', 'Editing')}: {initialData?.name}</span>
                <Button variant="ghost" size="sm" onClick={onCancel} className="ml-auto">
                  <X className="h-4 w-4 mr-1" />
                  {text(locale, 'Avbryt', 'Cancel')}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 min-h-[400px] rounded-lg p-4 border-2 border-dashed border-muted-foreground/25">
              {segments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <Activity className="h-12 w-12 opacity-50" />
                  <p>{text(locale, 'Dra segment hit eller klicka "+" för att lägga till', 'Drag segments here or click "+" to add')}</p>
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
                            locale={locale}
                            onRemove={() => removeSegment(segment.id)}
                            onUpdateGroup={updateRepeatGroup}
                            onUpdateStep={updateChildStep}
                            onSetStepPowerMode={setStepPowerMode}
                            onAddStep={addChildStep}
                            onRemoveStep={removeChildStep}
                            onAddRestAfter={addRestAfterStep}
                          />
                        ) : isExerciseBlock(segment) ? (
                          <SortableExerciseBlockItem
                            key={segment.id}
                            block={segment}
                            locale={locale}
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
                            locale={locale}
                            onRemove={() => removeSegment(segment.id)}
                            onUpdate={updateSegment}
                            onSetPowerMode={setSegmentPowerMode}
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
                            const label = seg.type === 'PREHAB' ? text(locale, 'Stabilitet / Prehab', 'Stability / Prehab') : seg.type === 'PLYOMETRIC' ? text(locale, 'Plyometri', 'Plyometrics') : 'Core'
                            const borderClass = seg.type === 'PREHAB' ? 'border-teal-400' : seg.type === 'PLYOMETRIC' ? 'border-amber-400' : 'border-purple-400'
                            const badgeClass = seg.type === 'PREHAB' ? 'bg-teal-500' : seg.type === 'PLYOMETRIC' ? 'bg-amber-500' : 'bg-purple-500'
                            return <div className={`bg-card border-2 ${borderClass} rounded-md p-3 shadow-lg`}><Badge className={`${badgeClass} text-white`}>{label}</Badge></div>
                          }
                            return <SortableSegmentItem segment={seg} locale={locale} onRemove={() => {}} onUpdate={() => {}} onSetPowerMode={() => {}} onCalculate={() => {}} isOverlay />
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
              {text(locale, 'Hockeymallar', 'Hockey templates')}
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
            <CardTitle className="text-sm font-medium">{text(locale, 'Lägg till segment', 'Add segment')}</CardTitle>
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
                {getSegmentTemplateName(seg, locale)}
              </Button>
            ))}
            <Button
              variant="default"
              className="w-full justify-start mt-2"
              onClick={() => setPatternDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {text(locale, 'Mönsterblock (stege/triplet/anpassad)', 'Pattern block (ladder/triplet/custom)')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{text(locale, 'Sammanfattning', 'Summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{text(locale, 'Total tid:', 'Total time:')}</span>
              <span className="font-medium">
                {minutesToDurationString(segments.reduce((acc, s) => {
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
                }, 0))} {text(locale, 'min:sek', 'min:sec')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{text(locale, 'Total distans:', 'Total distance:')}</span>
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
              <span className="text-muted-foreground">{text(locale, 'Snittzon:', 'Average zone:')}</span>
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
                    {text(locale, 'Sparar...', 'Saving...')}
                  </>
                ) : (
                  initialData ? text(locale, 'Uppdatera pass', 'Update session') : text(locale, 'Spara pass', 'Save session')
                )}
              </Button>
              {initialData?.id && (
                <PrintWorkoutButton
                  kind="cardio"
                  workoutId={initialData.id}
                  label={text(locale, 'Skriv ut', 'Print')}
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
      equipmentOptions={localizedEquipmentOptions}
      equipmentLabelByValue={localizedEquipmentLabelByValue}
      onAdd={addGeneratedPattern}
    />
    </>
  )
}

function SortableSegmentItem({
  segment,
  locale,
  onRemove,
  onUpdate,
  onSetPowerMode,
  onCalculate,
  isOverlay = false
}: {
  segment: CardioFlatSegment
  locale: AppLocale
  onRemove: () => void
  onUpdate: (id: string, field: keyof CardioFlatSegment, value: any) => void
  onSetPowerMode: (id: string, mode: string) => void
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
                        <Label className="text-xs text-muted-foreground">{text(locale, 'Upprepa:', 'Repeat:')}</Label>
                        <Input
                            type="number"
                            min={1}
                            className="h-6 w-12 text-xs px-1"
                            value={segment.repeats || 1}
                            onChange={(e) => onUpdate(segment.id, 'repeats', parseInt(e.target.value) || 1)}
                        />
                        <span className="text-xs text-muted-foreground">–</span>
                        <Input
                            type="number"
                            min={segment.repeats || 1}
                            className="h-6 w-12 text-xs px-1"
                            value={segment.repeatsMax ?? ''}
                            onChange={(e) => onUpdate(segment.id, 'repeatsMax', parseInt(e.target.value) || undefined)}
                            placeholder={text(locale, 'max', 'max')}
                            title={text(locale, 'Övre gräns (valfritt) – t.ex. 8–10 ggr', 'Upper bound (optional) – e.g. 8–10x')}
                        />
                        <span className="text-xs text-muted-foreground">{text(locale, 'ggr', 'x')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">{text(locale, 'Vila:', 'Rest:')}</Label>
                        <DurationInput
                            valueMinutes={segment.restDuration}
                            onChangeMinutes={(v) => onUpdate(segment.id, 'restDuration', v)}
                            className="h-6 w-14 text-xs px-1"
                        />
                        <span className="text-xs text-muted-foreground">{text(locale, 'min:sek', 'min:sec')}</span>
                    </div>
                 </div>
            )}
            {isWorkEffort(segment.type) && (
              <Button
                type="button"
                variant={segment.isBenchmark ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-xs ml-1"
                onClick={() => onUpdate(segment.id, 'isBenchmark', !segment.isBenchmark)}
                title={text(locale, 'Markera som prolog – resultatet blir referens för %-mål (t.ex. 80% av prolog)', 'Mark as opener – its result anchors % targets (e.g. 80% of opener)')}
              >
                <Target className="h-3 w-3 mr-1" />
                {text(locale, 'Prolog', 'Opener')}
              </Button>
            )}
            <Button
              type="button"
              variant={segment.optional ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onUpdate(segment.id, 'optional', !segment.optional)}
              title={text(locale, 'Valfritt – genomförs bara vid behov', 'Optional – only performed if needed')}
            >
              {text(locale, 'Valfritt', 'Optional')}
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-4">
            <Label className="text-xs text-muted-foreground">{text(locale, 'Utrustning', 'Equipment')}</Label>
            <Select
              value={segment.equipment || ''}
              onValueChange={(v) => onUpdate(segment.id, 'equipment', v)}
            >
              <SelectTrigger className="h-7 text-sm">
                <SelectValue placeholder={text(locale, 'Välj utrustning...', 'Select equipment...')} />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{text(locale, 'Tid (min:sek)', 'Time (min:sec)')}</Label>
            <div className="flex items-center">
              <Timer className="h-3 w-3 mr-1 text-muted-foreground" />
              <DurationInput
                valueMinutes={segment.duration}
                onChangeMinutes={(v) => onUpdate(segment.id, 'duration', v)}
                onBlur={() => onCalculate(segment.id, 'duration')}
                className="h-7 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{text(locale, 'Distans', 'Distance')}</Label>
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
            <Label className="text-xs text-muted-foreground">{text(locale, 'Kalorier', 'Calories')}</Label>
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
          {equipmentUsesPower(segment.equipment) ? (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">{text(locale, 'Effektmål', 'Power target')}</Label>
                <div className="flex flex-wrap items-center gap-1">
                  <Zap className="h-3 w-3 text-muted-foreground" />
                  <Select value={segment.powerRelTo ?? 'abs'} onValueChange={(v) => onSetPowerMode(segment.id, v)}>
                    <SelectTrigger className="h-7 w-[88px] text-xs px-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abs">Watt</SelectItem>
                      <SelectItem value="OPENER">% {text(locale, 'prolog', 'opener')}</SelectItem>
                      <SelectItem value="FTP">% FTP</SelectItem>
                      <SelectItem value="CP">% CP</SelectItem>
                    </SelectContent>
                  </Select>
                  {segment.powerRelTo ? (
                    <div className="flex items-center gap-0.5 flex-1 min-w-[3.5rem]">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={segment.powerRelPercent ?? ''}
                        onChange={(e) => onUpdate(segment.id, 'powerRelPercent', parseInt(e.target.value) || undefined)}
                        className="h-7 text-sm w-full"
                        placeholder="80"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <Input
                      value={segment.power || ''}
                      onChange={(e) => onUpdate(segment.id, 'power', e.target.value)}
                      className="h-7 text-sm flex-1 min-w-[3.5rem]"
                      placeholder="250"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">RPM</Label>
                <div className="flex items-center">
                  <Repeat className="h-3 w-3 mr-1 text-muted-foreground" />
                  <Input
                    value={segment.cadence || ''}
                    onChange={(e) => onUpdate(segment.id, 'cadence', e.target.value)}
                    className="h-7 text-sm"
                    placeholder="90"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <Label className="text-xs text-muted-foreground">{text(locale, 'Tempo (min/km)', 'Pace (min/km)')}</Label>
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
          )}
          <div>
            <Label className="text-xs text-muted-foreground">{text(locale, 'Puls (bpm/zon)', 'Heart rate (bpm/zone)')}</Label>
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
            <Label className="text-xs text-muted-foreground">{text(locale, 'Zon (1-5)', 'Zone (1-5)')}</Label>
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
  locale,
  availableExercises,
  onRemove,
  onUpdateBlock,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
}: {
  block: CardioExerciseBlock
  locale: AppLocale
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
  const label = isPrehab ? text(locale, 'Stabilitet / Prehab', 'Stability / Prehab') : isPlyometric ? text(locale, 'Plyometri', 'Plyometrics') : 'Core'
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
          <Label className="text-xs text-muted-foreground">{text(locale, 'Tid', 'Time')}</Label>
          <DurationInput
            valueMinutes={block.duration}
            onChangeMinutes={(v) => onUpdateBlock(block.id, 'duration', v || 0)}
            className="h-7 w-16 text-sm"
          />
          <span className="text-xs text-muted-foreground">{text(locale, 'min:sek', 'min:sec')}</span>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Textarea
        value={block.notes || ''}
        onChange={(e) => onUpdateBlock(block.id, 'notes', e.target.value)}
        className="min-h-[64px] text-sm"
        placeholder={
          isPrehab
            ? text(locale, 'Syfte, riskområde eller coachnotering...', 'Purpose, risk area, or coach note...')
            : isPlyometric
              ? text(locale, 'Syfte, intensitet eller coachnotering...', 'Purpose, intensity, or coach note...')
              : text(locale, 'Syfte eller coachnotering...', 'Purpose or coach note...')
        }
      />

      <div className="flex gap-2">
        <Select onValueChange={(exerciseId) => onAddExercise(block.id, exerciseId)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={
              isPrehab
                ? text(locale, 'Lägg till prehabövning...', 'Add prehab exercise...')
                : isPlyometric
                  ? text(locale, 'Lägg till plyometrisk övning...', 'Add plyometric exercise...')
                  : text(locale, 'Lägg till coreövning...', 'Add core exercise...')
            } />
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
                  <Label className="text-xs text-muted-foreground">{text(locale, 'Reps/tid', 'Reps/time')}</Label>
                  <Input
                    className="h-7 text-sm"
                    value={exercise.reps}
                    onChange={(e) => onUpdateExercise(block.id, exercise.id, 'reps', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{text(locale, 'Vila (s)', 'Rest (s)')}</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-7 text-sm"
                    value={exercise.restSeconds}
                    onChange={(e) => onUpdateExercise(block.id, exercise.id, 'restSeconds', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{text(locale, 'Notering', 'Note')}</Label>
                  <Input
                    className="h-7 text-sm"
                    value={exercise.notes || ''}
                    onChange={(e) => onUpdateExercise(block.id, exercise.id, 'notes', e.target.value)}
                    placeholder={text(locale, 'valfritt', 'optional')}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          {text(locale, 'Lägg till övningar som hör till konditionspasset.', 'Add exercises that belong to the cardio session.')}
        </div>
      )}
    </div>
  )
}

function SortableRepeatGroupItem({
  group,
  locale,
  onRemove,
  onUpdateGroup,
  onUpdateStep,
  onSetStepPowerMode,
  onAddStep,
  onRemoveStep,
  onAddRestAfter,
}: {
  group: CardioRepeatGroup
  locale: AppLocale
  onRemove: () => void
  onUpdateGroup: (groupId: string, field: 'repeats' | 'repeatsMax' | 'restBetweenRounds', value: number | undefined) => void
  onUpdateStep: (groupId: string, stepId: string, field: string, value: any) => void
  onSetStepPowerMode: (groupId: string, stepId: string, mode: string) => void
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
          {text(locale, 'UPPREPNINGSGRUPP', 'REPEAT GROUP')}
        </Badge>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">{text(locale, 'Rundor:', 'Rounds:')}</Label>
          <Input
            type="number"
            min={1}
            className="h-6 w-14 text-xs px-1"
            value={group.repeats}
            onChange={(e) => onUpdateGroup(group.id, 'repeats', parseInt(e.target.value) || 1)}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
            min={group.repeats}
            className="h-6 w-14 text-xs px-1"
            value={group.repeatsMax ?? ''}
            onChange={(e) => onUpdateGroup(group.id, 'repeatsMax', parseInt(e.target.value) || undefined)}
            placeholder={text(locale, 'max', 'max')}
            title={text(locale, 'Övre gräns (valfritt) – t.ex. 8–10 rundor', 'Upper bound (optional) – e.g. 8–10 rounds')}
          />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">{text(locale, 'Vila mellan rundor:', 'Rest between rounds:')}</Label>
          <DurationInput
            valueMinutes={group.restBetweenRounds}
            onChangeMinutes={(v) => onUpdateGroup(group.id, 'restBetweenRounds', v || 0)}
            className="h-6 w-14 text-xs px-1"
          />
          <span className="text-xs text-muted-foreground">{text(locale, 'min:sek', 'min:sec')}</span>
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
            onSetPowerMode={onSetStepPowerMode}
            onRemove={() => onRemoveStep(group.id, step.id)}
            onAddRestAfter={() => onAddRestAfter(group.id, step.id)}
            canRemove={group.steps.length > 1}
            locale={locale}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => onAddStep(group.id)}
        >
          <Plus className="h-3 w-3 mr-1" />
          {text(locale, 'Lägg till steg', 'Add step')}
        </Button>
      </div>
    </div>
  )
}

function ChildStepRow({
  step,
  stepIndex,
  groupId,
  locale,
  onUpdate,
  onSetPowerMode,
  onRemove,
  onAddRestAfter,
  canRemove,
}: {
  step: CardioChildStep
  stepIndex: number
  groupId: string
  locale: AppLocale
  onUpdate: (groupId: string, stepId: string, field: string, value: any) => void
  onSetPowerMode: (groupId: string, stepId: string, mode: string) => void
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
            <SelectItem value="INTERVAL">{text(locale, 'Intervall', 'Interval')}</SelectItem>
            <SelectItem value="STEADY">Steady</SelectItem>
            <SelectItem value="REST">{text(locale, 'Vila', 'Rest')}</SelectItem>
            <SelectItem value="RECOVERY">Recovery</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Timer className="h-3 w-3 text-muted-foreground" />
          <DurationInput
            valueMinutes={step.duration}
            onChangeMinutes={(v) => onUpdate(groupId, step.id, 'duration', v)}
            className="h-6 w-14 text-xs px-1"
          />
          <span className="text-xs text-muted-foreground">{text(locale, 'min:sek', 'min:sec')}</span>
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
                  <SelectValue placeholder={text(locale, 'Mål...', 'Target...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{text(locale, 'Inget mål', 'No target')}</SelectItem>
                  <SelectItem value="power">Watt</SelectItem>
                  <SelectItem value="cadence">RPM</SelectItem>
                  <SelectItem value="pace">{text(locale, 'Tempo', 'Pace')}</SelectItem>
                  <SelectItem value="hr">{text(locale, 'Puls', 'Heart rate')}</SelectItem>
                  <SelectItem value="calories">{text(locale, 'Kalorier', 'Calories')}</SelectItem>
                </SelectContent>
              </Select>
              {step.targetType === 'power' ? (
                <>
                  <Select value={step.targetRelTo ?? 'abs'} onValueChange={(v) => onSetPowerMode(groupId, step.id, v)}>
                    <SelectTrigger className="h-6 w-[84px] text-xs px-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abs">Watt</SelectItem>
                      <SelectItem value="OPENER">% {text(locale, 'prolog', 'opener')}</SelectItem>
                      <SelectItem value="FTP">% FTP</SelectItem>
                      <SelectItem value="CP">% CP</SelectItem>
                    </SelectContent>
                  </Select>
                  {step.targetRelTo ? (
                    <div className="flex items-center gap-0.5">
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-6 w-14 text-xs px-1"
                        value={step.targetRelPercent ?? ''}
                        onChange={(e) => onUpdate(groupId, step.id, 'targetRelPercent', parseInt(e.target.value) || undefined)}
                        placeholder="80"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <Input
                      className="h-6 w-16 text-xs px-1"
                      value={step.targetValue || ''}
                      onChange={(e) => onUpdate(groupId, step.id, 'targetValue', e.target.value)}
                      placeholder="250"
                    />
                  )}
                </>
              ) : (
                step.targetType && step.targetType !== 'none' && (
                  <Input
                    className="h-6 w-20 text-xs px-1"
                    value={step.targetValue || ''}
                    onChange={(e) => onUpdate(groupId, step.id, 'targetValue', e.target.value)}
                    placeholder={
                      step.targetType === 'cadence'
                        ? '62'
                        : step.targetType === 'pace'
                          ? '2:05'
                          : step.targetType === 'calories'
                            ? '20'
                            : '145-155'
                    }
                  />
                )
              )}
            </div>

            <Select
              value={step.equipment || ''}
              onValueChange={(v) => onUpdate(groupId, step.id, 'equipment', v)}
            >
              <SelectTrigger className="h-6 w-32 text-xs">
                <SelectValue placeholder={text(locale, 'Utrustning...', 'Equipment...')} />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {step.type === 'INTERVAL' && (
              <Button
                type="button"
                variant={step.isBenchmark ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => onUpdate(groupId, step.id, 'isBenchmark', !step.isBenchmark)}
                title={text(locale, 'Markera som prolog – resultatet blir referens för %-mål', 'Mark as opener – its result anchors % targets')}
              >
                <Target className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              variant={step.optional ? 'secondary' : 'outline'}
              size="sm"
              className="h-6 px-1.5 text-xs"
              onClick={() => onUpdate(groupId, step.id, 'optional', !step.optional)}
              title={text(locale, 'Valfritt steg – bara vid behov', 'Optional step – only if needed')}
            >
              {text(locale, 'Valfri', 'Opt')}
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {!isRest && (
            <Button variant="ghost" size="sm" onClick={onAddRestAfter} className="h-5 px-1 text-xs text-muted-foreground" title={text(locale, 'Lägg till vila efter', 'Add rest after')}>
              {text(locale, '+Vila', '+Rest')}
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
