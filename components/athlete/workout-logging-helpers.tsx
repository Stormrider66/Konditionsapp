'use client'

// Form schema, field configuration, label formatting, and the fueling
// product calculator for the workout logging form.

import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calculator } from 'lucide-react'
import { buildFuelingSessionFeedback } from '@/lib/fueling/session-feedback'
import {
  buildRaceFuelingProductItems,
  type RaceFuelingProductPlanItem,
} from '@/lib/fueling/product-plan'
import { getOptionalExerciseDisplayName } from '@/lib/exercises/display-name'

// Per-interval rep schema
export const intervalRepSchema = z.object({
  repNumber: z.number(),
  pace: z.string().optional(),
  avgHR: z.number().min(0).max(220).optional(),
  maxHR: z.number().min(0).max(220).optional(),
  duration: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  avgPower: z.number().min(0).optional(),
  notes: z.string().optional(),
})

export const intervalSegmentSchema = z.object({
  segmentId: z.string(),
  segmentLabel: z.string(),
  workoutType: z.string(),
  reps: z.array(intervalRepSchema),
})

// Extended schema with cycling fields
export const formSchema = z.object({
  completed: z.boolean().optional(),
  duration: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  avgPace: z.string().optional(),
  avgHR: z.number().min(0).max(220).optional(),
  maxHR: z.number().min(0).max(220).optional(),
  // Cycling-specific
  avgPower: z.number().min(0).optional(),
  normalizedPower: z.number().min(0).optional(),
  maxPower: z.number().min(0).optional(),
  avgCadence: z.number().min(0).optional(),
  elevation: z.number().min(0).optional(),
  tss: z.number().min(0).optional(),
  // Subjective
  perceivedEffort: z.number().min(1).max(10).optional(),
  difficulty: z.number().min(1).max(10).optional(),
  feeling: z.string().optional(),
  notes: z.string().optional(),
  // External
  dataFileUrl: z.string().optional(),
  stravaUrl: z.string().optional(),
  // Per-interval results
  intervalResults: z.array(intervalSegmentSchema).optional(),
  // Race result
  raceFinishTime: z.string().optional(),
  // Fueling feedback
  actualCarbsGPerHour: z.number().min(0).max(200).optional(),
  actualCarbsTotalG: z.number().min(0).max(1000).optional(),
  hydrationMl: z.number().min(0).max(10000).optional(),
  sodiumMg: z.number().min(0).max(10000).optional(),
  stomachRating: z.number().min(1).max(5).optional(),
  energyRating: z.number().min(1).max(5).optional(),
  fuelingNotes: z.string().optional(),
  fuelingProductsUsed: z.array(z.object({
    label: z.string(),
    count: z.number(),
    carbsPerItemG: z.number(),
    totalCarbsG: z.number(),
  })).optional(),
})

export type FormData = z.infer<typeof formSchema>
export type AppLocale = 'en' | 'sv'
// Define which fields are shown for each workout type
export type WorkoutType = 'RUNNING' | 'CYCLING' | 'STRENGTH' | 'CORE' | 'PLYOMETRIC' | 'RECOVERY' | 'HYROX' | 'SWIMMING' | 'SKIING' | 'OTHER'

export interface FieldConfig {
  duration: boolean
  distance: boolean
  pace: boolean
  hr: boolean
  power: boolean
  elevation: boolean
  rpe: boolean
  difficulty: boolean
  feeling: boolean
  strava: boolean
}

export const FIELD_CONFIG: Record<WorkoutType, FieldConfig> = {
  RUNNING: {
    duration: true,
    distance: true,
    pace: true,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  CYCLING: {
    duration: true,
    distance: true,
    pace: false,
    hr: true,
    power: true,
    elevation: true,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  STRENGTH: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  CORE: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  PLYOMETRIC: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  HYROX: {
    duration: true,
    distance: false,
    pace: false,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: false,
  },
  RECOVERY: {
    duration: true,
    distance: false,
    pace: false,
    hr: false,
    power: false,
    elevation: false,
    rpe: false,
    difficulty: false,
    feeling: true,
    strava: false,
  },
  SWIMMING: {
    duration: true,
    distance: true,
    pace: true,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  SKIING: {
    duration: true,
    distance: true,
    pace: false,
    hr: true,
    power: false,
    elevation: true,
    rpe: true,
    difficulty: false,
    feeling: true,
    strava: true,
  },
  OTHER: {
    duration: true,
    distance: true,
    pace: true,
    hr: true,
    power: false,
    elevation: false,
    rpe: true,
    difficulty: true,
    feeling: true,
    strava: true,
  },
}

/**
 * Parse a time string like "39:42" (MM:SS) or "1:45:30" (HH:MM:SS) into total seconds
 */
export function parseFinishTime(timeStr: string): number | null {
  const trimmed = timeStr.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':').map((p) => parseInt(p, 10))
  if (parts.some(isNaN)) return null

  if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return null
}

/**
 * Parse a goal time from program name/description (e.g. "Sub 40 min" -> "40:00")
 */
export function extractGoalTime(programName: string, goalRace?: string | null): string | null {
  // Try patterns like "Sub 40 min", "Under 40 min", "40 min", "sub 1:45"
  const patterns = [
    /sub\s+(\d{1,2}:\d{2}:\d{2})/i,
    /sub\s+(\d{1,2}:\d{2})/i,
    /under\s+(\d{1,2}:\d{2}:\d{2})/i,
    /under\s+(\d{1,2}:\d{2})/i,
    /sub\s+(\d+)\s*min/i,
    /under\s+(\d+)\s*min/i,
  ]

  const searchStr = `${programName} ${goalRace || ''}`

  for (const pattern of patterns) {
    const match = searchStr.match(pattern)
    if (match) {
      // If it's already in time format, return as-is
      if (match[1].includes(':')) return match[1]
      // If it's just a number (minutes), format as MM:00
      return `${match[1]}:00`
    }
  }
  return null
}

/**
 * Assess goal achievement
 */
export function assessGoal(
  finishSeconds: number,
  goalTimeStr: string
): 'EXCEEDED' | 'MET' | 'CLOSE' | 'MISSED' {
  const goalSeconds = parseFinishTime(goalTimeStr)
  if (!goalSeconds) return 'MET'

  const diff = finishSeconds - goalSeconds
  const percentDiff = (diff / goalSeconds) * 100

  if (diff <= 0) return 'EXCEEDED' // Faster than goal
  if (percentDiff <= 1) return 'MET' // Within 1%
  if (percentDiff <= 3) return 'CLOSE' // Within 3%
  return 'MISSED'
}

// Helper functions
export function localText(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}

export function formatWorkoutType(type: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    RUNNING: { sv: 'Löpning', en: 'Running' },
    CYCLING: { sv: 'Cykling', en: 'Cycling' },
    STRENGTH: { sv: 'Styrka', en: 'Strength' },
    CORE: { sv: 'Core', en: 'Core' },
    PLYOMETRIC: { sv: 'Plyometri', en: 'Plyometrics' },
    RECOVERY: { sv: 'Återhämtning', en: 'Recovery' },
    SKIING: { sv: 'Skidåkning', en: 'Skiing' },
    SWIMMING: { sv: 'Simning', en: 'Swimming' },
    HYROX: { sv: 'HYROX', en: 'HYROX' },
    OTHER: { sv: 'Annat', en: 'Other' },
  }
  return labels[type]?.[locale] || type
}

export function formatIntensity(intensity: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    RECOVERY: { sv: 'Återhämtning', en: 'Recovery' },
    EASY: { sv: 'Lätt', en: 'Easy' },
    MODERATE: { sv: 'Måttlig', en: 'Moderate' },
    THRESHOLD: { sv: 'Tröskel', en: 'Threshold' },
    INTERVAL: { sv: 'Intervall', en: 'Interval' },
    MAX: { sv: 'Max', en: 'Max' },
  }
  return labels[intensity]?.[locale] || intensity
}

export function formatSegmentType(type: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string } | string> = {
    warmup: { sv: 'Uppvärmning', en: 'Warm-up' },
    interval: { sv: 'Intervall', en: 'Interval' },
    cooldown: { sv: 'Nedvärmning', en: 'Cool-down' },
    work: { sv: 'Arbete', en: 'Work' },
    rest: { sv: 'Vila', en: 'Rest' },
    exercise: { sv: 'Övning', en: 'Exercise' },
    WARMUP: { sv: 'Uppvärmning', en: 'Warm-up' },
    MAIN: { sv: 'Arbete', en: 'Work' },
    CORE: 'Core',
    COOLDOWN: { sv: 'Nedvärmning', en: 'Cool-down' },
  }
  const label = labels[type]
  return typeof label === 'string' ? label : label?.[locale] || type
}

export function getEffortLabel(effort: number, locale: AppLocale): string {
  if (effort <= 2) return localText(locale, 'Mycket lätt', 'Very easy')
  if (effort <= 4) return localText(locale, 'Lätt', 'Easy')
  if (effort <= 6) return localText(locale, 'Måttlig', 'Moderate')
  if (effort <= 8) return localText(locale, 'Hård', 'Hard')
  return localText(locale, 'Maximal', 'Maximal')
}

export function getDifficultyLabel(difficulty: number, locale: AppLocale): string {
  if (difficulty <= 3) return localText(locale, 'Lättare än förväntat', 'Easier than expected')
  if (difficulty <= 5) return localText(locale, 'Som förväntat', 'As expected')
  if (difficulty <= 7) return localText(locale, 'Svårare än förväntat', 'Harder than expected')
  return localText(locale, 'Mycket svårt', 'Very hard')
}

export function getFeelingOptions(locale: AppLocale): string[] {
  return locale === 'sv'
    ? ['Stark', 'Bra', 'Okej', 'Trött', 'Tung']
    : ['Strong', 'Good', 'Okay', 'Tired', 'Heavy']
}

export function formatGoalType(goalType: string | null | undefined, locale: AppLocale): string {
  const types: Record<string, { sv: string; en: string } | string> = {
    '5k': '5 km',
    '10k': '10 km',
    '5K': '5 km',
    '10K': '10 km',
    'half-marathon': { sv: 'Halvmaraton', en: 'Half marathon' },
    marathon: { sv: 'Maraton', en: 'Marathon' },
    fitness: { sv: 'Fitness', en: 'Fitness' },
    cycling: { sv: 'Cykling', en: 'Cycling' },
    skiing: { sv: 'Skidåkning', en: 'Skiing' },
  }
  const label = types[goalType || '']
  return typeof label === 'string' ? label : label?.[locale] || goalType || ''
}

export function buildSegmentLabel(segment: any, locale: AppLocale): string {
  const reps = segment.sets || segment.reps || segment.repsCount || 2
  const duration = segment.duration ? `${segment.duration} min` : ''
  const desc = getOptionalExerciseDisplayName(segment.exercise, locale) || segment.description || ''
  const pace = segment.pace ? ` ${segment.pace}` : ''
  if (duration && desc) return `${reps}x${duration} ${desc}${pace}`
  if (duration) return `${reps}x${duration}${pace}`
  if (desc) return `${reps}x ${desc}${pace}`
  return `${reps} intervaller`
}

export function FuelingProductCalculator({
  durationMinutes,
  locale,
  onApply,
}: {
  durationMinutes: number | null
  locale: AppLocale
  onApply: (values: { totalCarbs: number; carbsPerHour: number; productsUsed: RaceFuelingProductPlanItem[] }) => void
}) {
  const [gelCount, setGelCount] = useState('')
  const [gelCarbs, setGelCarbs] = useState('25')
  const [bottleCount, setBottleCount] = useState('')
  const [bottleCarbs, setBottleCarbs] = useState('40')
  const [chewCount, setChewCount] = useState('')
  const [chewCarbs, setChewCarbs] = useState('20')

  const totalCarbs =
    parseProductCount(gelCount) * parseProductCount(gelCarbs) +
    parseProductCount(bottleCount) * parseProductCount(bottleCarbs) +
    parseProductCount(chewCount) * parseProductCount(chewCarbs)
  const durationHours = durationMinutes && durationMinutes > 0 ? durationMinutes / 60 : null
  const carbsPerHour = durationHours ? Math.round(totalCarbs / durationHours) : 0
  const canApply = totalCarbs > 0 && carbsPerHour > 0
  const productsUsed = buildRaceFuelingProductItems([
    { label: 'Gel', count: parseProductCount(gelCount), carbsPerItemG: parseProductCount(gelCarbs) },
    { label: locale === 'sv' ? 'Sportdryck' : 'Sports drink', count: parseProductCount(bottleCount), carbsPerItemG: parseProductCount(bottleCarbs) },
    { label: 'Chews/bar', count: parseProductCount(chewCount), carbsPerItemG: parseProductCount(chewCarbs) },
  ])

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-white/70 p-4 dark:border-amber-500/20 dark:bg-slate-950/40">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            {localText(locale, 'Snabbberäkna från produkter', 'Quick calculate from products')}
          </p>
          <p className="text-xs text-muted-foreground">
            {localText(locale, 'Summera det du använde och fyll loggen automatiskt.', 'Add up what you used and fill the log automatically.')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canApply}
          onClick={() => onApply({ totalCarbs, carbsPerHour, productsUsed })}
        >
          {localText(locale, 'Använd', 'Use')} {canApply ? `${totalCarbs} g / ${carbsPerHour} g/h` : localText(locale, 'värden', 'values')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ProductInputRow
          label="Gel"
          count={gelCount}
          carbs={gelCarbs}
          onCountChange={setGelCount}
          onCarbsChange={setGelCarbs}
          locale={locale}
        />
        <ProductInputRow
          label={localText(locale, 'Sportdryck', 'Sports drink')}
          count={bottleCount}
          carbs={bottleCarbs}
          onCountChange={setBottleCount}
          onCarbsChange={setBottleCarbs}
          locale={locale}
        />
        <ProductInputRow
          label="Chews/bar"
          count={chewCount}
          carbs={chewCarbs}
          onCountChange={setChewCount}
          onCarbsChange={setChewCarbs}
          locale={locale}
        />
      </div>
      {!durationHours && (
        <p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-100">
          {localText(locale, 'Fyll i faktisk tid först för att beräkna g/h.', 'Enter actual time first to calculate g/h.')}
        </p>
      )}
    </div>
  )
}

export function ProductInputRow({
  label,
  count,
  carbs,
  onCountChange,
  onCarbsChange,
  locale,
}: {
  label: string
  count: string
  carbs: string
  onCountChange: (value: string) => void
  onCarbsChange: (value: string) => void
  locale: AppLocale
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950/50">
      <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder={localText(locale, 'Antal', 'Count')}
          value={count}
          onChange={(event) => onCountChange(event.target.value)}
        />
        <Input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder="g/st"
          value={carbs}
          onChange={(event) => onCarbsChange(event.target.value)}
        />
      </div>
    </div>
  )
}

export function parseProductCount(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function getFuelingFeedbackCopy(
  feedback: ReturnType<typeof buildFuelingSessionFeedback>,
  locale: AppLocale
): { label: string; message: string } {
  if (locale === 'sv') {
    return { label: feedback.labelSv, message: feedback.messageSv }
  }

  return { label: feedback.labelEn, message: feedback.messageEn }
}

export function getEffortBadgeClass(effort: number): string {
  if (effort <= 3) return 'bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
  if (effort <= 5) return 'bg-yellow-100 border-yellow-200 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400'
  if (effort <= 7) return 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400'
  return 'bg-red-100 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
}
