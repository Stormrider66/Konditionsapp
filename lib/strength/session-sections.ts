export type StrengthSessionSectionType = 'WARMUP' | 'MAIN' | 'PREHAB' | 'CORE' | 'COOLDOWN'

export interface StrengthSessionExerciseLike {
  sets?: number | null
  reps?: number | string | null
  weight?: number | null
  followUps?: unknown[] | null
  duration?: number | null
  durationSeconds?: number | null
}

export interface StrengthSessionSectionDataLike {
  exercises?: StrengthSessionExerciseLike[] | null
}

export interface StrengthSessionSectionsInput {
  exercises?: StrengthSessionExerciseLike[] | null
  warmupData?: unknown
  prehabData?: unknown
  coreData?: unknown
  cooldownData?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getSectionExercises(value: unknown): StrengthSessionExerciseLike[] {
  if (!isRecord(value) || !Array.isArray(value.exercises)) return []
  return value.exercises as StrengthSessionExerciseLike[]
}

export function getStrengthSessionSections(input: StrengthSessionSectionsInput) {
  return [
    { type: 'WARMUP' as const, exercises: getSectionExercises(input.warmupData) },
    { type: 'MAIN' as const, exercises: input.exercises ?? [] },
    { type: 'PREHAB' as const, exercises: getSectionExercises(input.prehabData) },
    { type: 'CORE' as const, exercises: getSectionExercises(input.coreData) },
    { type: 'COOLDOWN' as const, exercises: getSectionExercises(input.cooldownData) },
  ]
}

function numericValue(value: unknown): number | undefined {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

export function countStrengthExerciseSets(exercise: StrengthSessionExerciseLike): number {
  const explicitSets = numericValue(exercise.sets)
  const sets = explicitSets && explicitSets > 0
    ? explicitSets
    : exercise.duration || exercise.durationSeconds
      ? 1
      : 0

  return sets * (1 + (Array.isArray(exercise.followUps) ? exercise.followUps.length : 0))
}

export function countStrengthSessionExercises(input: StrengthSessionSectionsInput): number {
  return getStrengthSessionSections(input).reduce(
    (sum, section) => sum + section.exercises.length,
    0
  )
}

export function countStrengthSessionSets(input: StrengthSessionSectionsInput): number {
  return getStrengthSessionSections(input).reduce(
    (sum, section) =>
      sum + section.exercises.reduce(
        (sectionSum, exercise) => sectionSum + countStrengthExerciseSets(exercise),
        0
      ),
    0
  )
}

export function calculateStrengthSessionVolumeLoad(input: StrengthSessionSectionsInput): number {
  return getStrengthSessionSections(input).reduce(
    (sum, section) =>
      sum + section.exercises.reduce((sectionSum, exercise) => {
        const sets = numericValue(exercise.sets) ?? 0
        const reps = numericValue(exercise.reps) ?? 0
        const weight = numericValue(exercise.weight) ?? 0
        return sectionSum + sets * reps * weight
      }, 0),
    0
  )
}
