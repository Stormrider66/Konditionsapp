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
import type { HybridWorkoutBuilderInitialData } from '@/components/hybrid-studio/HybridWorkoutBuilder'

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

/**
 * Coerce a "reps" field that may be string or number into a number.
 * Returns the original string too, so the caller can decide whether to
 * preserve it elsewhere (e.g. notes) when coercion lost information.
 */
function coerceReps(reps: number | string | undefined): {
  value: number
  /** Original string when coercion was lossy ("AMRAP", "30s", "8-12"); null otherwise. */
  preservedRaw: string | null
} {
  if (typeof reps === 'number') return { value: reps, preservedRaw: null }
  if (typeof reps === 'string') {
    const trimmed = reps.trim()
    const n = parseInt(trimmed, 10)
    if (!isNaN(n) && /^\d+$/.test(trimmed)) {
      // Pure integer — no information lost.
      return { value: n, preservedRaw: null }
    }
    if (!isNaN(n)) {
      // Parsed but not pure ("8-12" → 8, "30s" → 30): keep original around.
      return { value: n, preservedRaw: trimmed }
    }
    // Not numeric at all ("AMRAP", "max"): default the count, keep raw.
    return { value: 10, preservedRaw: trimmed }
  }
  return { value: 10, preservedRaw: null }
}

/**
 * Strength importer rich-text fields (RPE, tempo, weightLabel, non-numeric
 * reps) don't have dedicated columns on StrengthSessionExercise — stash
 * them at the start of `notes` so the data survives into the builder.
 * Coach can move what they want into proper fields after import.
 */
function buildStrengthNotes(
  e: ParsedStrengthWorkout['exercises'][number],
  preservedReps: string | null = null
): string | undefined {
  const tags: string[] = []
  if (preservedReps) tags.push(`Reps ${preservedReps}`)
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
  const reps = coerceReps(e.reps)
  return {
    exerciseId,
    exerciseName: e.exerciseName ?? '',
    sets: e.sets ?? 3,
    reps: reps.value,
    weight: e.weight,
    restSeconds: e.restSeconds,
    notes: buildStrengthNotes(e, reps.preservedRaw),
  }
}

function toSectionExercise(
  e: ParsedStrengthWorkout['exercises'][number],
  mappings: Record<string, string>
): StrengthSessionSectionExercise {
  const exerciseId = e.exerciseName ? mappings[e.exerciseName] ?? '' : ''
  // Section reps accept string ("30s") natively, so prefer the original
  // value verbatim and skip the lossy coercion.
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
  // duration/distance from seconds/meters → minutes/km internally. The
  // builder also accepts REPEAT_GROUP segments at runtime even though
  // CardioSessionData['segments']: CardioSegment[] only types the flat
  // shape — that's a known type-vs-runtime mismatch in the builder, so
  // we cast through unknown here.
  const segments = parsed.segments.map((s) => {
    if (s.type === 'REPEAT_GROUP') {
      return {
        id: generateId(),
        type: 'REPEAT_GROUP' as const,
        repeats: s.repeats,
        restBetweenRounds: s.restBetweenRounds,
        steps: s.steps.map((step) => ({
          id: generateId(),
          type: step.type,
          duration: step.duration,
          distance: step.distance,
          pace: step.pace,
          zone: step.zone,
          notes: step.notes,
        })),
      }
    }
    return {
      id: generateId(),
      type: s.type,
      duration: s.duration,
      distance: s.distance,
      pace: s.pace,
      zone: s.zone,
      notes: s.notes,
    }
  }) as unknown as CardioSegment[]
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
 * Builds `HybridWorkoutBuilderInitialData` (the type the builder exports
 * for its `initialData` prop). The builder needs each movement to carry a
 * real `Exercise` object (id + name + equipment) so it can render the
 * rep-scheme UI without an extra fetch. We only have a name + a candidate
 * id from the resolver, so we fabricate a minimal Exercise stub. Unmapped
 * movements use a synthetic `MISSING:<name>` id — the builder's
 * exercise-picker surfaces them as "needs picking" rather than silently
 * dropping them.
 */
export function toHybridBuilderInitialData(
  parsed: ParsedHybridWorkout,
  mappings: Record<string, string>,
  candidateLookup: Record<string, string> = {} // name → display name from resolver, optional
): HybridWorkoutBuilderInitialData {
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
