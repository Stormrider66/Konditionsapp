'use client'

// Segment types, equipment options, pace/duration conversion helpers,
// and the DurationInput field for the cardio session builder.

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { HockeyCardioPreset } from '@/lib/hockey/hockey-builder-presets'

export type CardioFlatSegment = {
  id: string
  type: 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'
  duration?: number // minutes
  distance?: number // km
  calories?: number // kcal
  zone: string
  pace?: string // "5:30/km"
  heartRate?: string // "145-155 bpm"
  power?: string // watt target, e.g. "250" or "240-260" (power-based equipment)
  cadence?: string // RPM target, e.g. "90"
  // Relative power target: when set, the power target is a % of a reference
  // (the benchmark/opener result, or the athlete's FTP/CP) instead of absolute watts.
  powerRelPercent?: number // e.g. 80
  powerRelTo?: CardioRelativeRef // OPENER | FTP | CP
  isBenchmark?: boolean // marks the all-out opener whose result anchors relative targets
  optional?: boolean // "only if needed" — e.g. an extra recovery in the back half of a session
  notes?: string
  equipment?: string
  repeats?: number // for intervals (the planned/minimum count when repeatsMax is set)
  repeatsMax?: number // optional upper bound, e.g. "8-10x" → repeats=8, repeatsMax=10
  restDuration?: number // min, for interval repeats
  distanceUnit?: 'km' | 'm'
}

// What a relative power/intensity target is expressed as a percentage of.
export type CardioRelativeRef = 'OPENER' | 'FTP' | 'CP'

export type AppLocale = 'en' | 'sv'

export function text(locale: AppLocale, sv: string, en: string): string {
  return locale === 'sv' ? sv : en
}

export type CardioSupplementalExercise = {
  id: string
  exerciseId: string
  name: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
}

export type LibraryExercise = {
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

export type CardioExerciseBlock = {
  id: string
  type: 'CORE' | 'PREHAB' | 'PLYOMETRIC'
  duration?: number // minutes
  notes?: string
  exercises: CardioSupplementalExercise[]
}

export type CardioChildStep = {
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
  targetType?: 'power' | 'pace' | 'cadence' | 'hr' | 'calories' | 'none'
  targetValue?: string // "250", "62", "2:05", "20"
  // Relative target (only meaningful when targetType === 'power'): when set,
  // the watt target is a % of a reference instead of the absolute targetValue.
  targetRelPercent?: number // e.g. 80
  targetRelTo?: CardioRelativeRef // OPENER | FTP | CP
  isBenchmark?: boolean // marks an all-out opener step whose result anchors relative targets
  optional?: boolean // "only if needed" step
}

export const EQUIPMENT_OPTIONS: { value: string; label: string; labelSv?: string }[] = [
  { value: 'RUN', label: 'Running', labelSv: 'Löpning' },
  { value: 'TREADMILL', label: 'Treadmill', labelSv: 'Löpband' },
  { value: 'BIKE', label: 'Bike', labelSv: 'Cykel' },
  { value: 'ASSAULT_BIKE', label: 'Assault Bike' },
  { value: 'ECHO_BIKE', label: 'Echo Bike' },
  { value: 'WATTBIKE', label: 'Wattbike' },
  { value: 'ROW', label: 'Row (Concept2)', labelSv: 'Rodd (Concept2)' },
  { value: 'SKI_ERG', label: 'SkiErg' },
  { value: 'SWIM', label: 'Swimming', labelSv: 'Simning' },
  { value: 'OTHER', label: 'Other', labelSv: 'Annat' },
]

export function equipmentLabel(
  option: { label: string; labelSv?: string },
  locale: AppLocale
): string {
  return locale === 'sv' ? option.labelSv ?? option.label : option.label
}

// Equipment that reports power (watts) + cadence (RPM) rather than running pace.
// For these the editor shows Watt/RPM fields instead of "Tempo (min/km)".
export const POWER_EQUIPMENT = new Set(['BIKE', 'WATTBIKE', 'ASSAULT_BIKE', 'ECHO_BIKE', 'ROW', 'SKI_ERG'])
export function equipmentUsesPower(equipment?: string): boolean {
  return !!equipment && POWER_EQUIPMENT.has(equipment)
}

// Work-effort segment types that can serve as a benchmark/opener anchor.
export function isWorkEffort(type: string): boolean {
  return type === 'INTERVAL' || type === 'STEADY' || type === 'HILL'
}

export type CardioRepeatGroup = {
  id: string
  type: 'REPEAT_GROUP'
  repeats: number // rounds (the planned/minimum count when repeatsMax is set)
  repeatsMax?: number // optional upper bound, e.g. "8-10 rounds"
  restBetweenRounds?: number // minutes
  steps: CardioChildStep[]
}

export type CardioSegment = CardioFlatSegment | CardioRepeatGroup | CardioExerciseBlock

export function isRepeatGroup(seg: CardioSegment): seg is CardioRepeatGroup {
  return seg.type === 'REPEAT_GROUP'
}

export function isExerciseBlock(seg: CardioSegment): seg is CardioExerciseBlock {
  return seg.type === 'CORE' || seg.type === 'PREHAB' || seg.type === 'PLYOMETRIC'
}

export const generateId = () => Math.random().toString(36).substr(2, 9)

// Segments available to add
export const AVAILABLE_SEGMENTS = [
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

export function getSegmentTemplateName(segment: (typeof AVAILABLE_SEGMENTS)[number], locale: AppLocale): string {
  if (locale === 'sv') return segment.name
  if (segment.type === 'PREHAB') return 'Stability / Prehab'
  if (segment.type === 'PLYOMETRIC') return 'Plyometrics'
  return segment.name
}

export function secondsToMinutes(seconds?: number) {
  return seconds ? Number((seconds / 60).toFixed(1)) : undefined
}

export function metersToUiDistance(distance?: number): { distance?: number; distanceUnit: 'km' | 'm' } {
  if (!distance) return { distance: undefined, distanceUnit: 'km' }
  if (distance >= 10) return { distance: distance / 1000, distanceUnit: 'm' }
  return { distance, distanceUnit: 'km' }
}

export function normalizeCardioTargetType(value?: string): CardioChildStep['targetType'] {
  return value === 'power' || value === 'pace' || value === 'cadence' || value === 'hr' || value === 'calories'
    ? value
    : 'none'
}

export function buildCardioSegmentFromHockeyPreset(
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
export const paceToDecimal = (pace: string): number | null => {
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

export const decimalToPace = (decimal: number): string => {
  const min = Math.floor(decimal)
  const sec = Math.round((decimal - min) * 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// Parse a duration typed as "m:ss" (or "mm:ss", or plain minutes) into minutes (float).
// "2:40" -> 2.6667, "0:40" -> 0.6667, "10" -> 10, "10.5" -> 10.5. Empty/invalid -> undefined.
export const durationStringToMinutes = (raw: string): number | undefined => {
  const s = raw.trim()
  if (!s) return undefined
  if (s.includes(':')) {
    const [minPart, secPart = ''] = s.split(':')
    const min = parseInt(minPart || '0', 10)
    const sec = parseInt(secPart || '0', 10)
    if (isNaN(min) && isNaN(sec)) return undefined
    return (isNaN(min) ? 0 : min) + (isNaN(sec) ? 0 : sec) / 60
  }
  const min = parseFloat(s)
  return isNaN(min) ? undefined : min
}

// Format minutes (float) as "m:ss". 10 -> "10:00", 2.6667 -> "2:40", 0.6667 -> "0:40".
export const minutesToDurationString = (minutes?: number): string => {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return ''
  const totalSeconds = Math.round(minutes * 60)
  const min = Math.floor(totalSeconds / 60)
  const sec = totalSeconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/**
 * Time input that accepts "m:ss" (e.g. 2:40, 0:40) or plain minutes (10, 10.5) while
 * emitting the value in minutes (float). Keeps the rest of the builder — and the
 * seconds-based DB conversion (min * 60) — unchanged; only the entry/display widens
 * from whole minutes to min:sec. Mirrors the existing Pace field (5:30) in the form.
 */
export function DurationInput({
  valueMinutes,
  onChangeMinutes,
  onBlur,
  className,
  placeholder = '0:00',
}: {
  valueMinutes?: number
  onChangeMinutes: (minutes: number | undefined) => void
  onBlur?: () => void
  className?: string
  placeholder?: string
}) {
  const [raw, setRaw] = useState(() => minutesToDurationString(valueMinutes))
  const [focused, setFocused] = useState(false)

  // Re-sync from the source of truth when it changes externally (e.g. pace/distance
  // auto-calc), but never clobber what the coach is actively typing.
  useEffect(() => {
    if (!focused) setRaw(minutesToDurationString(valueMinutes))
  }, [valueMinutes, focused])

  return (
    <Input
      type="text"
      inputMode="numeric"
      className={className}
      value={raw}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setRaw(e.target.value)
        onChangeMinutes(durationStringToMinutes(e.target.value))
      }}
      onBlur={() => {
        setFocused(false)
        const minutes = durationStringToMinutes(raw)
        setRaw(minutesToDurationString(minutes))
        onBlur?.()
      }}
    />
  )
}

