// Shared types, constants, and label helpers for the section workout builder.

import {
  Dumbbell,
  Flame,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import { PREHAB_STABILITY_FILTER } from '@/lib/strength/exercise-library-filters'

export type SectionType = 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'
export type AppLocale = 'en' | 'sv'

export const SECTION_ORDER: SectionType[] = ['WARMUP', 'MAIN', 'PREHAB', 'CORE', 'COOLDOWN']

export function text(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

export type WeightUnit = 'kg' | 'percent'

export interface FollowUp {
  id: string
  exerciseId: string
  name: string
  reps: string
  weight: string
  weightUnit?: WeightUnit
  restBefore: number
  notes?: string
}

export type ExerciseKind = 'strength' | 'cardio'
export type CardioIntensity = 'EASY' | 'MODERATE' | 'HARD' | 'INTERVAL'

export interface SetRow {
  reps: string
  weight: string
}

export interface Exercise {
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

export const MAX_FOLLOW_UPS = 2

// Categories from the WorkoutType enum that imply duration-based work.
export const CARDIO_CATEGORIES = new Set([
  'RUNNING',
  'CYCLING',
  'SKIING',
  'SWIMMING',
  'TRIATHLON',
])

// Erg / treadmill name patterns. Catches custom or system exercises that
// the coach added without setting category=RUNNING etc — e.g. "Concept2
// Row", "SkiErg", "Assault Bike", "BikeErg", "Löpband".
export const CARDIO_NAME_PATTERN = /\b(rodd|row(er|ing)?|skierg|ski.?erg|ergbike|bike.?erg|wattbike|assault|concept.?2|tr(ead)?mill|löpband|löpning|cykl(a|ing)?|paddl)/i

export interface LibraryExercise {
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
  movementCategory?: string | null
  equipmentTypes?: string[]
  iconCategory?: string
}

export function detectExerciseKind(template: LibraryExercise): ExerciseKind {
  if (template.category && CARDIO_CATEGORIES.has(template.category)) return 'cardio'
  if (template.equipmentTypes?.includes('CARDIO_MACHINE')) return 'cardio'
  if (template.iconCategory === 'cardio') return 'cardio'
  if (CARDIO_NAME_PATTERN.test(template.name)) return 'cardio'
  return 'strength'
}

export const INTENSITY_LABELS: Record<CardioIntensity, Record<AppLocale, string>> = {
  EASY: { sv: 'Lätt', en: 'Easy' },
  MODERATE: { sv: 'Måttligt', en: 'Moderate' },
  HARD: { sv: 'Hårt', en: 'Hard' },
  INTERVAL: { sv: 'Intervall', en: 'Interval' },
}

// Common Prilepin / Westside zone landmarks. Saves typing the same
// numbers every workout.
export const PERCENT_PRESETS = [60, 70, 75, 80, 85, 90, 100] as const

export interface SectionConfig {
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

export const PHASE_MAP: Record<string, string> = {
  'Base': 'ANATOMICAL_ADAPTATION',
  'Strength': 'MAXIMUM_STRENGTH',
  'Power': 'POWER',
  'Maintenance': 'MAINTENANCE',
  'Taper': 'TAPER',
}

export const SECTION_DEFAULTS: Record<SectionType, Omit<SectionConfig, 'exercises' | 'enabled'>> = {
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

export const SECTION_LABELS: Record<SectionType, Record<AppLocale, string>> = {
  WARMUP: { sv: 'Uppvärmning', en: 'Warm-up' },
  MAIN: { sv: 'Huvudpass', en: 'Main work' },
  PREHAB: { sv: 'Stabilitet / Prehab', en: 'Stability / Prehab' },
  CORE: { sv: 'Core', en: 'Core' },
  COOLDOWN: { sv: 'Nedvarvning', en: 'Cooldown' },
}

export const PHASE_LABELS: Record<string, Record<AppLocale, string>> = {
  Base: { sv: 'Anatom. Anpassning', en: 'Anatomical adaptation' },
  Strength: { sv: 'Maxstyrka', en: 'Max strength' },
  Power: { sv: 'Power', en: 'Power' },
  Maintenance: { sv: 'Underhåll', en: 'Maintenance' },
  Taper: { sv: 'Taper', en: 'Taper' },
}

export const CATEGORY_LABELS: Record<string, Record<AppLocale, string>> = {
  ALL: { sv: 'Alla kategorier', en: 'All categories' },
  WARMUP: { sv: 'Uppvärmning', en: 'Warm-up' },
  STRENGTH: { sv: 'Styrka', en: 'Strength' },
  PLYOMETRIC: { sv: 'Plyometri', en: 'Plyometrics' },
  [PREHAB_STABILITY_FILTER]: { sv: 'Stabilitet / Prehab', en: 'Stability / Prehab' },
  CORE: { sv: 'Core', en: 'Core' },
  RECOVERY: { sv: 'Återhämtning', en: 'Recovery' },
}

export const PILLAR_ORDER = [
  'POSTERIOR_CHAIN',
  'KNEE_DOMINANCE',
  'UNILATERAL',
  'FOOT_ANKLE',
  'ANTI_ROTATION_CORE',
  'UPPER_BODY',
] as const

export const KNOWN_PILLAR_VALUES = new Set<string>(PILLAR_ORDER)

export const PILLAR_LABELS: Record<string, Record<AppLocale, string>> = {
  ALL: { sv: 'Alla klasser', en: 'All classes' },
  POSTERIOR_CHAIN: { sv: 'Bakre kedja', en: 'Posterior chain' },
  KNEE_DOMINANCE: { sv: 'Knädominant', en: 'Knee dominance' },
  UNILATERAL: { sv: 'Unilateralt', en: 'Unilateral' },
  FOOT_ANKLE: { sv: 'Fot / fotled', en: 'Foot & ankle' },
  ANTI_ROTATION_CORE: { sv: 'Anti-rotation / core', en: 'Anti-rotation / core' },
  UPPER_BODY: { sv: 'Överkropp', en: 'Upper body' },
}

export function sectionLabel(type: SectionType, locale: AppLocale): string {
  return SECTION_LABELS[type][locale]
}

export function phaseLabel(value: string, locale: AppLocale): string {
  return PHASE_LABELS[value]?.[locale] ?? value
}

export function categoryLabel(value: string, locale: AppLocale): string {
  return CATEGORY_LABELS[value]?.[locale] ?? value
}

export function pillarLabel(value: string, locale: AppLocale): string {
  return PILLAR_LABELS[value]?.[locale] ?? value.replace(/_/g, ' ')
}

export function intensityLabel(value: CardioIntensity, locale: AppLocale): string {
  return INTENSITY_LABELS[value][locale]
}

export function newVersionName(currentName: string, originalName: string | undefined, locale: AppLocale): string {
  const trimmed = currentName.trim()
  const original = originalName?.trim()
  if (trimmed && trimmed !== original) return trimmed

  const base = trimmed || original || text(locale, 'Nytt Styrkepass', 'New Strength Session')
  return `${base} - ${text(locale, 'ny version', 'new version')}`
}
