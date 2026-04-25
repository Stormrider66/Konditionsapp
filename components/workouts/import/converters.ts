/**
 * Shape-converters: ParsedWorkoutImport → each studio's builder initialData.
 *
 * The importer route returns the workout in a shape that's close to — but
 * not identical to — what each studio's builder expects. These helpers
 * bridge the gap and apply the coach's confirmed library mappings.
 *
 * Strength → StrengthSessionData (consumed by SectionWorkoutBuilder)
 * Cardio   → CardioSessionData    (consumed by CardioSessionBuilder)
 * Hybrid   → HybridWorkoutBuilder.initialData
 * Agility  → AgilityWorkout        (consumed by AgilityWorkoutBuilder.initialWorkout)
 */

import type {
  ParsedStrengthWorkout,
  ParsedCardioWorkout,
  ParsedHybridWorkout,
  ParsedAgilityWorkout,
} from '@/lib/ai/workout-parser'
import type {
  StrengthSessionData,
  StrengthSessionExercise,
  StrengthSessionSectionData,
  StrengthSessionSectionExercise,
  CardioSessionData,
  CardioSegment,
  AgilityWorkout,
  AgilityWorkoutFormat,
} from '@/types'

type AgilitySectionType = 'WARMUP' | 'MAIN' | 'COOLDOWN'

const generateId = () => Math.random().toString(36).substring(2, 11)

/**
 * SectionWorkoutBuilder reverses PHASE_MAP (UI label → enum) to derive its
 * dropdown selection, so `initialData.phase` must be the ENUM string. The
 * AI emits free-form labels in either language — translate the common
 * forms; everything else falls back to MAXIMUM_STRENGTH (the most-likely
 * default for an imported strength workout).
 */
const PHASE_LABEL_TO_ENUM: Record<string, string> = {
  // Base / adaptation
  base: 'ANATOMICAL_ADAPTATION',
  bas: 'ANATOMICAL_ADAPTATION',
  grund: 'ANATOMICAL_ADAPTATION',
  'anatomical adaptation': 'ANATOMICAL_ADAPTATION',
  anatomical_adaptation: 'ANATOMICAL_ADAPTATION',
  // Maximum strength
  strength: 'MAXIMUM_STRENGTH',
  styrka: 'MAXIMUM_STRENGTH',
  maxstyrka: 'MAXIMUM_STRENGTH',
  'maximum strength': 'MAXIMUM_STRENGTH',
  maximum_strength: 'MAXIMUM_STRENGTH',
  // Power
  power: 'POWER',
  effekt: 'POWER',
  // Maintenance
  maintenance: 'MAINTENANCE',
  underhåll: 'MAINTENANCE',
  underhall: 'MAINTENANCE',
  // Taper
  taper: 'TAPER',
  nedtrappning: 'TAPER',
}

function normalizeStrengthPhase(raw: string | undefined): string {
  if (!raw) return 'MAXIMUM_STRENGTH'
  const key = raw.trim().toLowerCase()
  return PHASE_LABEL_TO_ENUM[key] ?? 'MAXIMUM_STRENGTH'
}

/** Coerce a "reps" field that may be string or number into a number. */
function repsToNumber(reps: number | string | undefined): number {
  if (typeof reps === 'number') return reps
  if (typeof reps === 'string') {
    const n = parseInt(reps, 10)
    if (!isNaN(n)) return n
  }
  return 10
}

/**
 * Strength importer rich-text fields (RPE, tempo, weightLabel) don't have
 * dedicated columns on StrengthSessionExercise — stash them at the start
 * of `notes` so the data survives into the builder. Coach can then move
 * what they want into proper fields.
 */
function buildStrengthNotes(e: ParsedStrengthWorkout['exercises'][number]): string | undefined {
  const tags: string[] = []
  if (e.rpe != null && e.rpe !== '') tags.push(`RPE ${e.rpe}`)
  if (e.tempo) tags.push(`Tempo ${e.tempo}`)
  if (e.weightLabel) tags.push(e.weightLabel)
  const tagLine = tags.join(' · ')
  const source = e.notes?.trim() ?? ''
  if (tagLine && source) return `${tagLine} — ${source}`
  return tagLine || source || undefined
}

function toMainExercise(
  e: ParsedStrengthWorkout['exercises'][number],
  mappings: Record<string, string>
): StrengthSessionExercise {
  const exerciseId = e.exerciseName ? mappings[e.exerciseName] ?? '' : ''
  return {
    exerciseId,
    exerciseName: e.exerciseName ?? '',
    sets: e.sets ?? 3,
    reps: repsToNumber(e.reps),
    weight: e.weight,
    restSeconds: e.restSeconds,
    notes: buildStrengthNotes(e),
  }
}

function toSectionExercise(
  e: ParsedStrengthWorkout['exercises'][number],
  mappings: Record<string, string>
): StrengthSessionSectionExercise {
  const exerciseId = e.exerciseName ? mappings[e.exerciseName] ?? '' : ''
  // Section reps accept string ("30s") so we don't force a number here.
  const reps: number | string = e.reps ?? (e.sets ? 10 : '')
  return {
    exerciseId,
    exerciseName: e.exerciseName ?? '',
    sets: e.sets ?? 1,
    reps,
    restSeconds: e.restSeconds,
    notes: buildStrengthNotes(e),
  }
}

function toSectionData(
  section: NonNullable<ParsedStrengthWorkout['warmupData']>,
  mappings: Record<string, string>
): StrengthSessionSectionData {
  return {
    notes: section.notes,
    duration: section.duration,
    exercises: (section.exercises ?? []).map((e) => toSectionExercise(e, mappings)),
  }
}

export function toStrengthSessionData(
  parsed: ParsedStrengthWorkout,
  mappings: Record<string, string>
): StrengthSessionData {
  return {
    name: parsed.name,
    description: parsed.description,
    phase: normalizeStrengthPhase(parsed.phase),
    exercises: parsed.exercises.map((e) => toMainExercise(e, mappings)),
    warmupData: parsed.warmupData ? toSectionData(parsed.warmupData, mappings) : undefined,
    coreData: parsed.coreData ? toSectionData(parsed.coreData, mappings) : undefined,
    cooldownData: parsed.cooldownData
      ? toSectionData(parsed.cooldownData, mappings)
      : undefined,
    estimatedDuration: parsed.estimatedDuration,
    tags: parsed.tags,
  }
}

// ─── Cardio ─────────────────────────────────────────────────────────────────

export function toCardioSessionData(
  parsed: ParsedCardioWorkout
): CardioSessionData {
  // CardioSessionBuilder treats `id: ''` as "new session" and converts
  // duration/distance from seconds/meters → minutes/km internally.
  const segments: CardioSegment[] = parsed.segments.map((s) => ({
    id: generateId(),
    type: s.type,
    duration: s.duration,
    distance: s.distance,
    pace: s.pace,
    zone: s.zone,
    notes: s.notes,
  }))
  return {
    id: '',
    name: parsed.name,
    description: parsed.description,
    sport: parsed.sport,
    segments,
    totalDuration: parsed.totalDuration,
    totalDistance: parsed.totalDistance,
    tags: parsed.tags ?? [],
    coachId: '',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ─── Hybrid ─────────────────────────────────────────────────────────────────

/**
 * Shape consumed by HybridWorkoutBuilder.initialData. The builder needs
 * each movement to carry a real `Exercise` object (id + name + equipment)
 * so it can render the rep-scheme UI without an extra fetch. We only have
 * a name + a candidate id from the resolver, so we fabricate a minimal
 * Exercise stub. Unmapped movements use a synthetic `MISSING:<name>` id —
 * the builder's exercise-picker will surface them as "needs picking"
 * rather than silently dropping them.
 */
type HybridBuilderInitialData = {
  id?: string
  name: string
  description?: string
  format: string
  timeCap?: number
  workTime?: number
  restTime?: number
  totalRounds?: number
  totalMinutes?: number
  repScheme?: string
  scalingLevel?: string
  movements?: Array<{
    id: string
    exerciseId: string
    exercise: {
      id: string
      name: string
      nameSv?: string
      standardAbbreviation?: string
      equipmentTypes: string[]
    }
    order: number
    reps?: number
    calories?: number
    distance?: number
    duration?: number
    weightMale?: number
    weightFemale?: number
    notes?: string
  }>
  tags?: string[]
}

export function toHybridBuilderInitialData(
  parsed: ParsedHybridWorkout,
  mappings: Record<string, string>,
  candidateLookup: Record<string, string> = {} // name → display name from resolver, optional
): HybridBuilderInitialData {
  return {
    name: parsed.name,
    description: parsed.description,
    format: parsed.format,
    timeCap: parsed.timeCap,
    workTime: parsed.workTime,
    restTime: parsed.restTime,
    totalRounds: parsed.totalRounds,
    totalMinutes: parsed.totalMinutes,
    repScheme: parsed.repScheme,
    scalingLevel: parsed.scalingLevel,
    tags: parsed.tags,
    movements: parsed.movements.map((m, idx) => {
      const mappedId = mappings[m.exerciseName]
      const displayName = candidateLookup[m.exerciseName] ?? m.exerciseName
      const exerciseId = mappedId ?? `MISSING:${m.exerciseName}`
      return {
        id: generateId(),
        exerciseId,
        exercise: {
          id: exerciseId,
          name: displayName,
          equipmentTypes: [],
        },
        order: idx,
        reps: m.reps,
        calories: m.calories,
        distance: m.distance,
        duration: m.duration,
        weightMale: m.weightMale,
        weightFemale: m.weightFemale,
        notes: m.notes,
      }
    }),
  }
}

// ─── Agility ────────────────────────────────────────────────────────────────

/**
 * AgilityWorkoutBuilder reads `initialWorkout` for top-level fields but
 * does NOT seed `selectedDrills` from it on its own — the wiring in
 * AgilityStudioClient passes a dedicated `initialDrills` prop (added at
 * the same time as the importer). Returning a partial AgilityWorkout +
 * a parallel SelectedDrill[] keeps both ergonomics simple.
 */
export type ImportedAgilityWorkoutBundle = {
  initialWorkout: Partial<AgilityWorkout> & { name: string }
  initialDrills: Array<{
    drillId: string | null
    drillName: string
    sectionType: AgilitySectionType
    sets?: number
    reps?: number
    duration?: number
    restSeconds?: number
    notes?: string
  }>
}

export function toAgilityWorkoutBundle(
  parsed: ParsedAgilityWorkout,
  mappings: Record<string, string>
): ImportedAgilityWorkoutBundle {
  return {
    initialWorkout: {
      name: parsed.name,
      description: parsed.description,
      format: parsed.format as AgilityWorkoutFormat,
      totalDuration: parsed.totalDuration,
      restBetweenDrills: parsed.restBetweenDrills,
      tags: parsed.tags ?? [],
    },
    initialDrills: parsed.drills.map((d) => ({
      drillId: mappings[d.drillName] ?? null,
      drillName: d.drillName,
      sectionType: d.sectionType as AgilitySectionType,
      sets: d.sets,
      reps: d.reps,
      duration: d.duration,
      restSeconds: d.restSeconds,
      notes: d.notes,
    })),
  }
}
