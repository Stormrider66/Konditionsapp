export const PREHAB_STABILITY_FILTER = 'PREHAB_STABILITY'

export interface StrengthLibraryFilterExercise {
  name?: string | null
  nameSv?: string | null
  category?: string | null
  muscleGroup?: string | null
  description?: string | null
  instructions?: string | null
  pillar?: string | null
  biomechanicalPillar?: string | null
  progressionLevel?: string | null
  isRehabExercise?: boolean | null
  rehabPhases?: string[] | null
  targetBodyParts?: string[] | null
  contraindications?: string[] | null
}

const PREHAB_STABILITY_KEYWORDS = [
  'prehab',
  'rehab',
  'stabilitet',
  'stability',
  'kontroll',
  'control',
  'förebygg',
  'injury prevention',
  'skadeförebygg',
  'ledkontroll',
  'rotator cuff',
  'rotatorkuff',
  'copenhagen',
  'köpenhamn',
  'adductor',
  'adduktor',
  'ljumske',
  'groin',
  'balance',
  'balans',
] as const

function includesAnyKeyword(value: string): boolean {
  const haystack = value.toLowerCase()
  return PREHAB_STABILITY_KEYWORDS.some((keyword) => haystack.includes(keyword))
}

export function isPrehabStabilityExercise(exercise: StrengthLibraryFilterExercise): boolean {
  if (exercise.isRehabExercise) return true
  if ((exercise.rehabPhases?.length ?? 0) > 0) return true

  const textFields = [
    exercise.name,
    exercise.nameSv,
    exercise.muscleGroup,
    exercise.description,
    exercise.instructions,
    exercise.pillar,
    exercise.biomechanicalPillar,
    ...(exercise.targetBodyParts ?? []),
    ...(exercise.contraindications ?? []),
  ].filter(Boolean).join(' ')

  if (includesAnyKeyword(textFields)) return true

  return exercise.category === 'CORE' && exercise.progressionLevel === 'LEVEL_1'
}

export function matchesStrengthLibraryCategoryFilter(
  exercise: StrengthLibraryFilterExercise,
  categoryFilter: string
): boolean {
  if (categoryFilter === 'ALL') return true
  if (categoryFilter === PREHAB_STABILITY_FILTER) return isPrehabStabilityExercise(exercise)
  return exercise.category === categoryFilter
}
