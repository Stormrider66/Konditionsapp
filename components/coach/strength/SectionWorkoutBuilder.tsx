'use client'

/**
 * SectionWorkoutBuilder
 *
 * Enhanced workout builder with 5 collapsible sections:
 * - Warmup (dynamic stretches, activation, ramp-up sets)
 * - Main (primary strength exercises)
 * - Stability / Prehab (joint control, tissue capacity, injury prevention)
 * - Core (core-specific exercises)
 * - Cooldown (stretching, mobility)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
  Star,
  TrendingUp,
  MessageSquare,
  Link2,
  Heart,
  Layers,
  Percent,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { CustomExerciseCreator } from '@/components/coach/exercise-library/CustomExerciseCreator'
import { PrintWorkoutButton } from '@/components/workouts/print/PrintWorkoutButton'
import {
  PREHAB_STABILITY_FILTER,
  matchesStrengthLibraryCategoryFilter,
} from '@/lib/strength/exercise-library-filters'
import { useLocale } from '@/i18n/client'
import { getBusinessScopeHeaders } from '@/lib/business-scope-client'

// Types
type SectionType = 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'
type AppLocale = 'en' | 'sv'

const SECTION_ORDER: SectionType[] = ['WARMUP', 'MAIN', 'PREHAB', 'CORE', 'COOLDOWN']

function text(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

type WeightUnit = 'kg' | 'percent'

interface FollowUp {
  id: string
  exerciseId: string
  name: string
  reps: string
  weight: string
  weightUnit?: WeightUnit
  restBefore: number
  notes?: string
}

type ExerciseKind = 'strength' | 'cardio'
type CardioIntensity = 'EASY' | 'MODERATE' | 'HARD' | 'INTERVAL'

interface SetRow {
  reps: string
  weight: string
}

interface Exercise {
  id: string
  exerciseId: string
  name: string
  sets: number
  reps: string
  weight: string
  weightUnit?: WeightUnit
  rest: number
  notes?: string
  tempo?: string
  followUps?: FollowUp[]
  // Cardio fields — only meaningful when kind === 'cardio'
  kind: ExerciseKind
  durationSec?: number
  distanceKm?: string // string so empty input doesn't coerce to 0
  intensity?: CardioIntensity
  // Per-set overrides for pyramid / varied loading. When undefined,
  // every set uses the flat `reps` / `weight`.
  setRows?: SetRow[]
}

const MAX_FOLLOW_UPS = 2

// Categories from the WorkoutType enum that imply duration-based work.
const CARDIO_CATEGORIES = new Set([
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
])

// Erg / treadmill name patterns. Catches custom or system exercises that
// the coach added without setting category=RUNNING etc — e.g. "Concept2
// Row", "SkiErg", "Assault Bike", "BikeErg", "Löpband".
const CARDIO_NAME_PATTERN = /\b(rodd|row(er|ing)?|skierg|ski.?erg|ergbike|bike.?erg|wattbike|assault|concept.?2|tr(ead)?mill|löpband|löpning|cykl(a|ing)?|paddl)/i

interface LibraryExercise {
  id: string
  name: string
  nameSv?: string | null
  nameEn?: string | null
  category?: string
  pillar?: string
  muscleGroup?: string
  description?: string
  instructions?: string
  progressionLevel?: string
  isRehabExercise?: boolean
  rehabPhases?: string[]
  targetBodyParts?: string[]
  contraindications?: string[]
  equipmentTypes?: string[]
  iconCategory?: string
}

function detectExerciseKind(template: LibraryExercise): ExerciseKind {
  if (template.category && CARDIO_CATEGORIES.has(template.category)) return 'cardio'
  if (template.equipmentTypes?.includes('CARDIO_MACHINE')) return 'cardio'
  if (template.iconCategory === 'cardio') return 'cardio'
  if (CARDIO_NAME_PATTERN.test(template.name)) return 'cardio'
  return 'strength'
}

const INTENSITY_LABELS: Record<CardioIntensity, string> = {
  EASY: 'Lätt',
  MODERATE: 'Måttligt',
  HARD: 'Hårt',
  INTERVAL: 'Intervall',
}

// Common Prilepin / Westside zone landmarks. Saves typing the same
// numbers every workout.
const PERCENT_PRESETS = [60, 70, 75, 80, 85, 90, 100] as const

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
  PREHAB: {
    type: 'PREHAB',
    label: 'Stabilitet / Prehab',
    icon: ShieldCheck,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
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
      weightUnit?: WeightUnit
      restSeconds?: number
      notes?: string
      kind?: ExerciseKind
      durationSeconds?: number
      distanceMeters?: number
      intensity?: string
      setRows?: Array<{ reps: number | string; weight?: number }>
      followUps?: Array<{
        exerciseId: string
        exerciseName: string
        reps: number | string
        weight?: number
        weightUnit?: WeightUnit
        restBeforeSeconds?: number
        notes?: string
      }>
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
        kind?: ExerciseKind
        durationSeconds?: number
        distanceMeters?: number
        intensity?: string
      }>
    }
    prehabData?: {
      notes?: string
      duration?: number
      exercises?: Array<{
        exerciseId: string
        exerciseName: string
        sets: number
        reps: number | string
        restSeconds?: number
        notes?: string
        kind?: ExerciseKind
        durationSeconds?: number
        distanceMeters?: number
        intensity?: string
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
        kind?: ExerciseKind
        durationSeconds?: number
        distanceMeters?: number
        intensity?: string
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
  onSaved?: (sessionId?: string, sessionName?: string) => void
  onCancel?: () => void
}

export function SectionWorkoutBuilder({
  initialData,
  onSaved,
  onCancel,
}: SectionWorkoutBuilderProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en'
  const pathname = usePathname()
  const businessHeaders = useMemo(() => getBusinessScopeHeaders(pathname), [pathname])
  const [sessionName, setSessionName] = useState(text(locale, 'Nytt Styrkepass', 'New Strength Session'))
  const [description, setDescription] = useState('')
  const [phase, setPhase] = useState('Base')
  const [saving, setSaving] = useState(false)

  // Section states
  const [sections, setSections] = useState<Record<SectionType, SectionConfig>>({
    WARMUP: { ...SECTION_DEFAULTS.WARMUP, enabled: false, exercises: [] },
    MAIN: { ...SECTION_DEFAULTS.MAIN, enabled: true, exercises: [] },
    PREHAB: { ...SECTION_DEFAULTS.PREHAB, enabled: false, exercises: [] },
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
  const [browseMode, setBrowseMode] = useState<'all' | 'favorites' | 'most-used'>('all')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [mostUsedIds, setMostUsedIds] = useState<string[]>([])
  const [targetSection, setTargetSection] = useState<SectionType>('MAIN')
  const [showExerciseCreator, setShowExerciseCreator] = useState(false)

  const mapLibraryExercise = useCallback((e: any): LibraryExercise => ({
    id: e.id,
    name: locale === 'sv' ? e.nameSv || e.name : e.nameEn || e.name,
    nameSv: e.nameSv,
    nameEn: e.nameEn,
    category: e.category,
    pillar: e.biomechanicalPillar,
    muscleGroup: e.muscleGroup,
    description: e.description,
    instructions: e.instructions,
    progressionLevel: e.progressionLevel,
    isRehabExercise: e.isRehabExercise,
    rehabPhases: e.rehabPhases,
    targetBodyParts: e.targetBodyParts,
    contraindications: e.contraindications,
    equipmentTypes: e.equipmentTypes,
    iconCategory: e.iconCategory,
  }), [locale])

  // Sync category filter to match the target section. Coach can override the
  // filter afterwards; next target-section change will realign it again.
  useEffect(() => {
    const sectionToCategory: Record<SectionType, string> = {
      WARMUP: 'WARMUP',
      MAIN: 'ALL',
      PREHAB: PREHAB_STABILITY_FILTER,
      CORE: 'CORE',
      COOLDOWN: 'RECOVERY',
    }
    setCategoryFilter(sectionToCategory[targetSection])
  }, [targetSection])

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

      // Cardio fields are saved as `kind: 'cardio'` + duration/distance/intensity.
      // Older sessions without `kind` default to 'strength'.
      const hydrateCardio = (e: {
        kind?: ExerciseKind
        durationSeconds?: number
        distanceMeters?: number
        intensity?: string
      }): Pick<Exercise, 'kind' | 'durationSec' | 'distanceKm' | 'intensity'> => ({
        kind: e.kind === 'cardio' ? 'cardio' : 'strength',
        durationSec: e.durationSeconds,
        distanceKm: e.distanceMeters != null ? String(e.distanceMeters / 1000) : undefined,
        intensity: e.intensity as CardioIntensity | undefined,
      })

      // Load main exercises
      const mainExercises = initialData.exercises.map((e) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        name: e.exerciseName,
        sets: e.sets,
        reps: String(e.reps),
        weight: e.weight ? String(e.weight) : '',
        weightUnit: e.weightUnit ?? 'kg',
        rest: e.restSeconds || 90,
        notes: e.notes,
        ...hydrateCardio(e),
        setRows: e.setRows?.map((r) => ({
          reps: String(r.reps),
          weight: r.weight != null ? String(r.weight) : '',
        })),
        followUps: e.followUps?.map((f) => ({
          id: crypto.randomUUID(),
          exerciseId: f.exerciseId,
          name: f.exerciseName,
          reps: String(f.reps),
          weight: f.weight ? String(f.weight) : '',
          weightUnit: f.weightUnit ?? 'kg',
          restBefore: f.restBeforeSeconds ?? 0,
          notes: f.notes,
        })),
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
        ...hydrateCardio(e),
      })) || []

      // Load stability / prehab
      const prehabExercises = initialData.prehabData?.exercises?.map((e) => ({
        id: crypto.randomUUID(),
        exerciseId: e.exerciseId,
        name: e.exerciseName,
        sets: e.sets,
        reps: String(e.reps),
        weight: '',
        rest: e.restSeconds || 45,
        notes: e.notes,
        ...hydrateCardio(e),
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
        ...hydrateCardio(e),
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
        kind: 'strength' as ExerciseKind,
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
        PREHAB: {
          ...SECTION_DEFAULTS.PREHAB,
          enabled: prehabExercises.length > 0,
          exercises: prehabExercises,
          notes: initialData.prehabData?.notes,
          duration: initialData.prehabData?.duration,
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
      if (prehabExercises.length > 0) toExpand.add('PREHAB')
      if (coreExercises.length > 0) toExpand.add('CORE')
      if (cooldownExercises.length > 0) toExpand.add('COOLDOWN')
      setExpandedSections(toExpand)
    }
  }, [initialData])

  // Fetch exercises
  const fetchExercises = useCallback(async (search = '') => {
    try {
      const params = new URLSearchParams({ limit: '500' })
      const trimmedSearch = search.trim()
      if (trimmedSearch) params.set('search', trimmedSearch)

      const res = await fetch(`/api/exercises?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const exercisesList = Array.isArray(data) ? data : (data.exercises || [])
        setAvailableExercises(exercisesList.map(mapLibraryExercise))
      }
    } catch (e) {
      console.error('Failed to fetch exercises', e)
    }
  }, [mapLibraryExercise])

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => void fetchExercises(searchTerm),
      searchTerm.trim() ? 200 : 0
    )

    return () => window.clearTimeout(timeoutId)
  }, [fetchExercises, searchTerm])

  // Fetch favorites and most-used on mount
  useEffect(() => {
    async function loadFavorites() {
      try {
        const res = await fetch('/api/exercises/favorites')
        if (res.ok) {
          const data = await res.json()
          if (data.data) setFavoriteIds(new Set(data.data))
        }
      } catch { /* non-critical */ }
    }
    async function loadMostUsed() {
      try {
        const res = await fetch('/api/exercises/most-used')
        if (res.ok) {
          const data = await res.json()
          if (data.data) setMostUsedIds(data.data.map((d: any) => d.exerciseId))
        }
      } catch { /* non-critical */ }
    }
    loadFavorites()
    loadMostUsed()
  }, [])

  // Toggle favorite on/off. Optimistic — flip the Set immediately so the
  // UI reacts instantly, roll back if the POST fails.
  const toggleFavorite = async (exerciseId: string) => {
    const wasFavorite = favoriteIds.has(exerciseId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (wasFavorite) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })

    try {
      const res = await fetch('/api/exercises/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId }),
      })
      if (!res.ok) throw new Error('toggle failed')
    } catch {
      // Revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (wasFavorite) next.add(exerciseId)
        else next.delete(exerciseId)
        return next
      })
      toast.error(text(locale, 'Kunde inte ändra favorit', 'Could not update favorite'))
    }
  }

  // Filter exercises
  const filteredExercises = (() => {
    let list = availableExercises

    // Apply browse mode
    if (browseMode === 'favorites') {
      list = list.filter((ex) => favoriteIds.has(ex.id))
    } else if (browseMode === 'most-used') {
      list = list.filter((ex) => mostUsedIds.includes(ex.id))
      // Sort by usage frequency
      list = [...list].sort((a, b) => mostUsedIds.indexOf(a.id) - mostUsedIds.indexOf(b.id))
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()

    // Apply search and category filters. A typed search should look across
    // the whole library, even if the target section temporarily set a narrow
    // category like Warm-up.
    return list.filter((ex) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        ex.name.toLowerCase().includes(normalizedSearch) ||
        (ex.nameSv && ex.nameSv.toLowerCase().includes(normalizedSearch)) ||
        (ex.nameEn && ex.nameEn.toLowerCase().includes(normalizedSearch)) ||
        (ex.muscleGroup && ex.muscleGroup.toLowerCase().includes(normalizedSearch))
      const matchesCategory = normalizedSearch.length > 0
        ? true
        : matchesStrengthLibraryCategoryFilter(ex, categoryFilter)
      return matchesSearch && matchesCategory
    })
  })()

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
    // Auto-detect: running, cycling, erg machines etc. start in cardio
    // mode. Coach can flip via the kind toggle on the row.
    const detectedKind = detectExerciseKind(template)
    const newExercise: Exercise = detectedKind === 'cardio'
      ? {
          id: crypto.randomUUID(),
          exerciseId: template.id,
          name: template.name,
          sets: 1,
          reps: '',
          weight: '',
          rest: sectionConfig.defaultRest,
          kind: 'cardio',
          // Sensible warmup default: 5 min easy. Coach edits as needed.
          durationSec: section === 'WARMUP' ? 300 : 600,
          intensity: section === 'WARMUP' ? 'EASY' : 'MODERATE',
        }
      : {
          id: crypto.randomUUID(),
          exerciseId: template.id,
          name: template.name,
          sets: section === 'COOLDOWN' ? 1 : 3,
          reps: section === 'COOLDOWN' ? '30s' : '10',
          weight: '',
          rest: sectionConfig.defaultRest,
          kind: 'strength',
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

  // Attach a follow-up exercise (for supersets / French-contrast pairs).
  // Main section only. Max 2 follow-ups per primary exercise.
  const addFollowUp = (
    section: SectionType,
    exerciseId: string,
    followExerciseId: string
  ) => {
    const template = availableExercises.find((e) => e.id === followExerciseId)
    if (!template) return

    setSections((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        exercises: prev[section].exercises.map((e) => {
          if (e.id !== exerciseId) return e
          const existing = e.followUps ?? []
          if (existing.length >= MAX_FOLLOW_UPS) return e
          const newFollowUp: FollowUp = {
            id: crypto.randomUUID(),
            exerciseId: template.id,
            name: template.name,
            reps: '5',
            weight: '',
            // First follow-up defaults to 0s (classic superset). Second
            // defaults to ~15s, matching typical French-contrast spacing.
            restBefore: existing.length === 0 ? 0 : 15,
          }
          return { ...e, followUps: [...existing, newFollowUp] }
        }),
      },
    }))
  }

  const updateFollowUp = (
    section: SectionType,
    exerciseId: string,
    followUpId: string,
    field: keyof FollowUp,
    value: any
  ) => {
    setSections((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        exercises: prev[section].exercises.map((e) => {
          if (e.id !== exerciseId) return e
          return {
            ...e,
            followUps: (e.followUps ?? []).map((f) =>
              f.id === followUpId ? { ...f, [field]: value } : f
            ),
          }
        }),
      },
    }))
  }

  const removeFollowUp = (
    section: SectionType,
    exerciseId: string,
    followUpId: string
  ) => {
    setSections((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        exercises: prev[section].exercises.map((e) =>
          e.id === exerciseId
            ? { ...e, followUps: (e.followUps ?? []).filter((f) => f.id !== followUpId) }
            : e
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

  // Each follow-up runs once per primary set, so a primary with N sets
  // and K follow-ups contributes N * (1 + K) total rounds. Mirrors the
  // calculation in /api/strength-sessions [POST/PUT] so the in-builder
  // summary matches what gets saved.
  const totalSets = Object.values(sections)
    .filter((s) => s.enabled)
    .reduce(
      (sum, s) =>
        sum + s.exercises.reduce(
          (acc, e) => acc + e.sets * (1 + (e.followUps?.length ?? 0)),
          0
        ),
      0
    )

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
      toast.error(text(locale, 'Lägg till övningar', 'Add exercises'), {
        description: text(locale, 'Du måste lägga till minst en övning i huvudpasset.', 'You need to add at least one exercise to the main session.'),
      })
      return
    }

    setSaving(true)
    try {
      // Cardio fields are only emitted when the row is in cardio mode.
      // For strength rows we leave them undefined so the JSON stays lean.
      const cardioPayload = (e: Exercise) =>
        e.kind === 'cardio'
          ? {
              kind: 'cardio' as const,
              durationSeconds: e.durationSec,
              distanceMeters:
                e.distanceKm && e.distanceKm.trim() !== ''
                  ? Math.round(parseFloat(e.distanceKm) * 1000)
                  : undefined,
              intensity: e.intensity,
            }
          : {}

      // Build exercise data for main section. weightUnit is only emitted
      // when it's 'percent' — strength rows default to kg so omitting it
      // keeps the JSON lean and back-compat with older sessions.
      const mainExercises = sections.MAIN.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.name,
        sets: e.sets,
        reps: parseInt(e.reps) || 0,
        weight: e.weight ? parseFloat(e.weight) : undefined,
        weightUnit: e.weightUnit === 'percent' ? 'percent' : undefined,
        restSeconds: e.rest,
        notes: e.notes,
        tempo: e.tempo,
        ...cardioPayload(e),
        setRows: e.setRows && e.setRows.length > 0
          ? e.setRows.map((r) => ({
              reps: parseInt(r.reps) || r.reps,
              weight: r.weight ? parseFloat(r.weight) : undefined,
            }))
          : undefined,
        followUps: e.followUps && e.followUps.length > 0
          ? e.followUps.map((f) => ({
              exerciseId: f.exerciseId,
              exerciseName: f.name,
              reps: parseInt(f.reps) || f.reps,
              weight: f.weight ? parseFloat(f.weight) : undefined,
              weightUnit: f.weightUnit === 'percent' ? 'percent' : undefined,
              restBeforeSeconds: f.restBefore,
              notes: f.notes,
            }))
          : undefined,
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
              ...cardioPayload(e),
            })),
        }
        : undefined

      // Build stability / prehab data
      const prehabData = sections.PREHAB.enabled && sections.PREHAB.exercises.length > 0
        ? {
            notes: sections.PREHAB.notes,
            duration: sections.PREHAB.duration,
            exercises: sections.PREHAB.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              exerciseName: e.name,
              sets: e.sets,
              reps: parseInt(e.reps) || e.reps,
              restSeconds: e.rest,
              notes: e.notes,
              ...cardioPayload(e),
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
              ...cardioPayload(e),
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
        warmupData: warmupData ?? null,
        prehabData: prehabData ?? null,
        coreData: coreData ?? null,
        cooldownData: cooldownData ?? null,
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
        headers: { 'Content-Type': 'application/json', ...(businessHeaders ?? {}) },
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
        const savedId = result.id || result.session?.id || initialData?.id
        onSaved?.(savedId, sessionName)
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
      setSaving(false)
    }
  }

  return (
    <>
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
              {SECTION_ORDER.map((type) => {
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
          {SECTION_ORDER.map((type) => {
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
                                availableExercises={availableExercises}
                                onRemove={() => removeExercise(type, exercise.id)}
                                onUpdate={(field, value) =>
                                  updateExercise(type, exercise.id, field, value)
                                }
                                onAddFollowUp={(followExerciseId) =>
                                  addFollowUp(type, exercise.id, followExerciseId)
                                }
                                onUpdateFollowUp={(followUpId, field, value) =>
                                  updateFollowUp(type, exercise.id, followUpId, field, value)
                                }
                                onRemoveFollowUp={(followUpId) =>
                                  removeFollowUp(type, exercise.id, followUpId)
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
                  availableExercises={availableExercises}
                  onRemove={() => {}}
                  onUpdate={() => {}}
                  onAddFollowUp={() => {}}
                  onUpdateFollowUp={() => {}}
                  onRemoveFollowUp={() => {}}
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
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowExerciseCreator(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ny övning
                </Button>
                <Badge variant="outline" className="text-xs">
                  → {SECTION_DEFAULTS[targetSection].label}
                </Badge>
              </div>
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
                  <SelectItem value="WARMUP">Uppvärmning</SelectItem>
                  <SelectItem value="STRENGTH">Styrka</SelectItem>
                  <SelectItem value="PLYOMETRIC">Plyometri</SelectItem>
                  <SelectItem value={PREHAB_STABILITY_FILTER}>Stabilitet / Prehab</SelectItem>
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
                  {SECTION_ORDER
                    .filter((t) => sections[t].enabled)
                    .map((t) => (
                      <SelectItem key={t} value={t}>
                        {SECTION_DEFAULTS[t].label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-1">
              <Button
                variant={browseMode === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setBrowseMode('all')}
              >
                Alla
              </Button>
              <Button
                variant={browseMode === 'favorites' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setBrowseMode('favorites')}
              >
                <Star className="h-3 w-3 mr-1" />
                Favoriter
              </Button>
              <Button
                variant={browseMode === 'most-used' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setBrowseMode('most-used')}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Mest använda
              </Button>
            </div>

            <div className="scrollbar-visible space-y-1 max-h-[500px] overflow-y-auto overscroll-contain pr-1">
              {filteredExercises.map((ex) => {
                const isFavorite = favoriteIds.has(ex.id)
                return (
                  <div
                    key={ex.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => addExercise(ex.id, targetSection)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        addExercise(ex.id, targetSection)
                      }
                    }}
                    className="flex items-center gap-1 w-full rounded-md border border-input bg-background py-2 pl-3 pr-1 text-left cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center">
                        <Plus className="mr-2 h-3 w-3 shrink-0" />
                        <span className="truncate font-medium text-sm">{ex.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground ml-5 truncate">
                        {ex.muscleGroup || ex.category}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(ex.id)
                      }}
                      aria-label={isFavorite ? 'Ta bort favorit' : 'Markera som favorit'}
                      title={isFavorite ? 'Ta bort favorit' : 'Markera som favorit'}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-yellow-500 hover:bg-muted/50 transition-colors shrink-0"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
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
                {sections.PREHAB.enabled && (
                  <Badge className="bg-teal-100 text-teal-800 text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Prehab
                  </Badge>
                )}
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
            {initialData?.id && (
              <PrintWorkoutButton
                kind="strength"
                workoutId={initialData.id}
                label="Skriv ut pass"
                className="w-full"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>

    <CustomExerciseCreator
      open={showExerciseCreator}
      onClose={() => setShowExerciseCreator(false)}
      onSuccess={(exerciseId, exercise) => {
        setShowExerciseCreator(false)
        let nextSearch = searchTerm
        if (exercise) {
          const mappedExercise = mapLibraryExercise(exercise)
          const preferredSectionByCategory: Record<string, SectionType> = {
            WARMUP: 'WARMUP',
            STRENGTH: 'MAIN',
            PLYOMETRIC: 'MAIN',
            CORE: 'CORE',
            RECOVERY: 'COOLDOWN',
          }
          const preferredSection = preferredSectionByCategory[mappedExercise.category || '']

          setAvailableExercises((prev) => [
            mappedExercise,
            ...prev.filter((item) => item.id !== exerciseId),
          ])
          setBrowseMode('all')
          setCategoryFilter('ALL')
          setSearchTerm(mappedExercise.name)
          nextSearch = mappedExercise.name
          if (preferredSection && sections[preferredSection].enabled) {
            setTargetSection(preferredSection)
          }
        }
        void fetchExercises(nextSearch)
      }}
    />
    </>
  )
}

// Sortable Exercise Item
function SortableExerciseItem({
  exercise,
  sectionType,
  availableExercises,
  onRemove,
  onUpdate,
  onAddFollowUp,
  onUpdateFollowUp,
  onRemoveFollowUp,
  isOverlay = false,
}: {
  exercise: Exercise
  sectionType: SectionType
  availableExercises: Array<{ id: string; name: string; muscleGroup?: string; category?: string }>
  onRemove: () => void
  onUpdate: (field: keyof Exercise, value: any) => void
  onAddFollowUp: (followExerciseId: string) => void
  onUpdateFollowUp: (followUpId: string, field: keyof FollowUp, value: any) => void
  onRemoveFollowUp: (followUpId: string) => void
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
  const isMain = sectionType === 'MAIN'
  const isCardio = exercise.kind === 'cardio'
  const hasSetRows = !isCardio && (exercise.setRows?.length ?? 0) > 0
  const isPercent = exercise.weightUnit === 'percent'

  const togglePercent = () => {
    onUpdate('weightUnit', isPercent ? 'kg' : 'percent')
  }
  const weightLabel = isPercent ? 'Vikt (% av 1RM)' : 'Vikt'
  const weightPlaceholder = isPercent ? '%' : 'kg'

  const [notesOpen, setNotesOpen] = useState(Boolean(exercise.notes))
  const [followUpPickerOpen, setFollowUpPickerOpen] = useState(false)

  const followUps = exercise.followUps ?? []
  // Cardio exercises don't currently support follow-ups (no clear use
  // case — you'd just chain a second cardio block).
  const canAddFollowUp = isMain && !isCardio && followUps.length < MAX_FOLLOW_UPS

  const toggleKind = () => {
    if (isCardio) {
      // Going back to strength — restore sensible defaults if reps/weight
      // were never filled in.
      onUpdate('kind', 'strength')
      if (!exercise.reps) onUpdate('reps', '10')
    } else {
      onUpdate('kind', 'cardio')
      // Pre-seed cardio defaults if they're missing
      if (exercise.durationSec == null) onUpdate('durationSec', 600)
      if (!exercise.intensity) onUpdate('intensity', 'MODERATE')
      // Drop pyramid rows — they don't apply to cardio.
      if (hasSetRows) onUpdate('setRows', undefined)
    }
  }

  // Toggle per-set varied loading. When turning on, expand the flat
  // reps/weight into N rows (one per set) seeded with current values.
  // When turning off, drop setRows so the runner falls back to the flat
  // values.
  const togglePyramid = () => {
    if (hasSetRows) {
      onUpdate('setRows', undefined)
    } else {
      const seedRow: SetRow = { reps: exercise.reps, weight: exercise.weight }
      const rows = Array.from({ length: Math.max(1, exercise.sets) }, () => ({
        ...seedRow,
      }))
      onUpdate('setRows', rows)
    }
  }

  // Keep setRows length in sync with the sets count when pyramid mode is on.
  // Bumping sets up duplicates the last row; bumping down trims the tail.
  const handleSetsChange = (value: string) => {
    const next = parseInt(value) || 1
    onUpdate('sets', next)
    if (hasSetRows) {
      const current = exercise.setRows ?? []
      if (next > current.length) {
        const last = current[current.length - 1] ?? { reps: exercise.reps, weight: exercise.weight }
        const additions = Array.from({ length: next - current.length }, () => ({ ...last }))
        onUpdate('setRows', [...current, ...additions])
      } else if (next < current.length) {
        onUpdate('setRows', current.slice(0, next))
      }
    }
  }

  const updateSetRow = (idx: number, field: keyof SetRow, value: string) => {
    const current = exercise.setRows ?? []
    const next = current.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    onUpdate('setRows', next)
  }

  // Render duration as mm:ss for cleaner editing.
  const durationMinutes = exercise.durationSec
    ? Math.floor(exercise.durationSec / 60)
    : 0
  const durationRemainderSec = exercise.durationSec
    ? exercise.durationSec % 60
    : 0

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
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{exercise.name}</span>
            {isCardio && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                <Heart className="h-3 w-3 mr-1" />
                Kondition
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleKind}
              className={`h-6 w-6 p-0 ${
                isCardio ? 'text-rose-500' : 'text-muted-foreground'
              } hover:text-foreground`}
              title={isCardio ? 'Växla till styrka' : 'Växla till kondition (tid/distans)'}
            >
              {isCardio ? <Heart className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}
            </Button>
            {!isCardio && !isCooldown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePercent}
                className={`h-6 w-6 p-0 ${
                  isPercent ? 'text-primary' : 'text-muted-foreground'
                } hover:text-foreground`}
                title={isPercent ? 'Använd kg' : 'Använd % av 1RM (per atlet)'}
              >
                <Percent className="h-4 w-4" />
              </Button>
            )}
            {!isCardio && (
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePyramid}
                className={`h-6 w-6 p-0 ${
                  hasSetRows ? 'text-primary' : 'text-muted-foreground'
                } hover:text-foreground`}
                title={hasSetRows ? 'Använd samma reps/vikt för alla set' : 'Variera reps/vikt per set (pyramid)'}
              >
                <Layers className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotesOpen((v) => !v)}
              className={`h-6 w-6 p-0 ${
                exercise.notes ? 'text-primary' : 'text-muted-foreground'
              } hover:text-foreground`}
              title="Kommentar"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isCardio ? (
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Tid (mm:ss)</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={durationMinutes}
                  onChange={(e) => {
                    const m = Math.max(0, parseInt(e.target.value) || 0)
                    onUpdate('durationSec', m * 60 + durationRemainderSec)
                  }}
                  className="h-7 text-sm"
                  placeholder="min"
                />
                <span className="text-muted-foreground text-sm">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={durationRemainderSec}
                  onChange={(e) => {
                    const s = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                    onUpdate('durationSec', durationMinutes * 60 + s)
                  }}
                  className="h-7 text-sm"
                  placeholder="sek"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Distans (km)</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={exercise.distanceKm ?? ''}
                onChange={(e) => onUpdate('distanceKm', e.target.value)}
                className="h-7 text-sm"
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Intensitet</Label>
              <Select
                value={exercise.intensity ?? 'MODERATE'}
                onValueChange={(v) => onUpdate('intensity', v as CardioIntensity)}
              >
                <SelectTrigger className="h-7 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTENSITY_LABELS) as CardioIntensity[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {INTENSITY_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : hasSetRows ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Set</Label>
                <Input
                  type="number"
                  min={1}
                  value={exercise.sets}
                  onChange={(e) => handleSetsChange(e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
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

            {isPercent && (
              <p className="text-[11px] text-muted-foreground -mt-1">
                Vikt anges som % av 1RM. Varje atlet får sin egen vikt baserat på sitt PR.
              </p>
            )}
            <div className="rounded-md border bg-muted/20 divide-y">
              {(exercise.setRows ?? []).map((row, idx) => (
                <div key={idx} className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Set {idx + 1}
                  </span>
                  <Input
                    value={row.reps}
                    onChange={(e) => updateSetRow(idx, 'reps', e.target.value)}
                    className="h-7 text-sm"
                    placeholder="reps"
                  />
                  <Input
                    value={row.weight}
                    onChange={(e) => updateSetRow(idx, 'weight', e.target.value)}
                    className="h-7 text-sm"
                    placeholder={weightPlaceholder}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Set</Label>
              <Input
                type="number"
                value={exercise.sets}
                onChange={(e) => handleSetsChange(e.target.value)}
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
                <Label className="text-xs text-muted-foreground">{weightLabel}</Label>
                <Input
                  value={exercise.weight}
                  onChange={(e) => onUpdate('weight', e.target.value)}
                  className="h-7 text-sm"
                  placeholder={weightPlaceholder}
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
            {isPercent && !isCooldown && (
              <div className="col-span-4 flex flex-wrap gap-1">
                {PERCENT_PRESETS.map((pct) => {
                  const active = String(pct) === exercise.weight
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => onUpdate('weight', String(pct))}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                      }`}
                    >
                      {pct}%
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {notesOpen && (
          <Textarea
            value={exercise.notes ?? ''}
            onChange={(e) => onUpdate('notes', e.target.value)}
            placeholder="Kommentar till övningen (valfritt)"
            rows={2}
            className="text-sm"
          />
        )}

        {isMain && (followUps.length > 0 || canAddFollowUp) && (
          <div className="pl-4 border-l-2 border-dashed border-muted-foreground/30 space-y-2 mt-2">
            {followUps.map((fu, idx) => (
              <FollowUpRow
                key={fu.id}
                followUp={fu}
                index={idx}
                onUpdate={(field, value) => onUpdateFollowUp(fu.id, field, value)}
                onRemove={() => onRemoveFollowUp(fu.id)}
              />
            ))}

            {canAddFollowUp && (
              <Popover open={followUpPickerOpen} onOpenChange={setFollowUpPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    {followUps.length === 0
                      ? 'Lägg till följdövning (superset / kontrast)'
                      : 'Lägg till till'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Sök övning..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Inga övningar hittades</CommandEmpty>
                      <CommandGroup>
                        {availableExercises.map((ex) => (
                          <CommandItem
                            key={ex.id}
                            value={`${ex.name} ${ex.muscleGroup ?? ''} ${ex.category ?? ''}`}
                            onSelect={() => {
                              onAddFollowUp(ex.id)
                              setFollowUpPickerOpen(false)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm">{ex.name}</span>
                              {(ex.muscleGroup || ex.category) && (
                                <span className="text-[10px] text-muted-foreground">
                                  {ex.muscleGroup || ex.category}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Row for a follow-up exercise (superset / French-contrast pair member).
// Runs once per set of the primary exercise; `restBefore` is the pause
// between the previous exercise in the pair and this one.
function FollowUpRow({
  followUp,
  index,
  onUpdate,
  onRemove,
}: {
  followUp: FollowUp
  index: number
  onUpdate: (field: keyof FollowUp, value: any) => void
  onRemove: () => void
}) {
  const [notesOpen, setNotesOpen] = useState(Boolean(followUp.notes))
  const isPercent = followUp.weightUnit === 'percent'

  return (
    <div className="bg-muted/30 rounded-md p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-[10px] shrink-0">
            Följd {index + 1}
          </Badge>
          <span className="font-medium text-sm truncate">{followUp.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate('weightUnit', isPercent ? 'kg' : 'percent')}
            className={`h-6 w-6 p-0 ${
              isPercent ? 'text-primary' : 'text-muted-foreground'
            } hover:text-foreground`}
            title={isPercent ? 'Använd kg' : 'Använd % av 1RM (per atlet)'}
          >
            <Percent className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotesOpen((v) => !v)}
            className={`h-6 w-6 p-0 ${
              followUp.notes ? 'text-primary' : 'text-muted-foreground'
            } hover:text-foreground`}
            title="Kommentar"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Reps</Label>
          <Input
            value={followUp.reps}
            onChange={(e) => onUpdate('reps', e.target.value)}
            className="h-7 text-sm"
            placeholder="5"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            {isPercent ? 'Vikt (% av 1RM)' : 'Vikt'}
          </Label>
          <Input
            value={followUp.weight}
            onChange={(e) => onUpdate('weight', e.target.value)}
            className="h-7 text-sm"
            placeholder={isPercent ? '%' : 'kg / kroppsvikt'}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Paus innan (s)</Label>
          <Input
            type="number"
            value={followUp.restBefore}
            onChange={(e) =>
              onUpdate('restBefore', parseInt(e.target.value) || 0)
            }
            className="h-7 text-sm"
            placeholder="0 = superset, 15–30 = kontrast"
          />
        </div>
      </div>

      {notesOpen && (
        <Textarea
          value={followUp.notes ?? ''}
          onChange={(e) => onUpdate('notes', e.target.value)}
          placeholder="Kommentar (valfritt)"
          rows={2}
          className="text-sm"
        />
      )}
    </div>
  )
}

export default SectionWorkoutBuilder
