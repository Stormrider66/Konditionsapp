export const PREHAB_STABILITY_FILTER = 'PREHAB_STABILITY'

export const STRENGTH_STUDIO_ALLOWED_CATEGORIES = [
  'STRENGTH',
  'PLYOMETRIC',
  'CORE',
  'WARMUP',
  'RECOVERY',
] as const

export const STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES = [
  'MONOSTRUCTURAL',
  'HYROX_STATION',
] as const

export const STRENGTH_STUDIO_CARDIO_EQUIPMENT_TYPES = [
  'MACHINE_ROW',
  'MACHINE_BIKE',
  'MACHINE_SKI',
  'ASSAULT_BIKE',
  'RUNNING',
  'JUMP_ROPE',
  'SWIMMING',
] as const

export const STRENGTH_STUDIO_CARDIO_ICON_CATEGORIES = ['cardio'] as const

export const STRENGTH_STUDIO_EXCLUDED_NAME_TERMS = [
  'assault bike',
  'ski erg',
  'skierg',
  'löp',
  'lop',
  'jogg',
  'intervall',
  'kondition',
  'stegringslopp',
  'prolog',
] as const

export interface StrengthLibraryFilterExercise {
  name?: string | null
  nameSv?: string | null
  nameEn?: string | null
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
  movementCategory?: string | null
  equipmentTypes?: string[] | null
  iconCategory?: string | null
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

function normalizeLibraryText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function upper(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? ''
}

const NON_EXERCISE_NAME_PATTERNS = [
  /^(a|b|c|d|e)\d?$/i,
  /^(pass|workout|block|del|part|section)\s*[a-z0-9]?$/i,
  /^\d+\s*-\s*\d+\s*(varv|rounds)\s*(av)?\s*:?$/i,
  /^(vila|rest|pause|paus)(\s|$)/i,
  /^\d+\s*(s|sec|sek|min)\s+(vila|rest|pause|paus)\b/i,
  /^(notera|note|notes?|kommentar|kommentarer)\b/i,
] as const

const CARDIO_BLOCK_NAME_PATTERNS = [
  /^(run|running|jog|jogging|lopa|lopning|row|rowing|rodd|bike|biking|cycling|cykel|skierg|ski erg|swim|swimming)$/i,
  /\b(row|rodd|bike|cykel|skierg|ski erg)\s*\((meters?|meter|calories|kalorier|cal)\)/i,
  /\b\d+([.,]\d+)?\s*(m|meter|km|cal|kcal)\b.*\b(lop|lopa|lopning|run|running|rodd|row|bike|cykel|assault|skierg|ski erg|burpee|wall ball)\b/i,
  /\b\d+\s*x\s*\d+([.,]\d+)?\s*(m|meter|km|cal|kcal)\b/i,
] as const

export function isNonExerciseLibraryBlockName(name: string | undefined | null): boolean {
  const trimmed = name?.trim()
  if (!trimmed) return true
  const normalized = normalizeLibraryText(trimmed)
  return NON_EXERCISE_NAME_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function isStrengthStudioExerciseNameCandidate(name: string | undefined | null): boolean {
  const trimmed = name?.trim()
  if (!trimmed) return false
  const normalized = normalizeLibraryText(trimmed)

  if (isNonExerciseLibraryBlockName(trimmed)) return false
  if (CARDIO_BLOCK_NAME_PATTERNS.some((pattern) => pattern.test(normalized))) return false

  return !STRENGTH_STUDIO_EXCLUDED_NAME_TERMS.some((term) =>
    normalized.includes(normalizeLibraryText(term))
  )
}

export function isStrengthStudioExercise(exercise: StrengthLibraryFilterExercise): boolean {
  const category = upper(exercise.category)
  if (!STRENGTH_STUDIO_ALLOWED_CATEGORIES.includes(category as typeof STRENGTH_STUDIO_ALLOWED_CATEGORIES[number])) {
    return false
  }

  const iconCategory = normalizeLibraryText(exercise.iconCategory ?? '')
  if (STRENGTH_STUDIO_CARDIO_ICON_CATEGORIES.includes(iconCategory as typeof STRENGTH_STUDIO_CARDIO_ICON_CATEGORIES[number])) {
    return false
  }

  const movementCategory = upper(exercise.movementCategory)
  if (
    movementCategory &&
    STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES.includes(
      movementCategory as typeof STRENGTH_STUDIO_EXCLUDED_MOVEMENT_CATEGORIES[number]
    )
  ) {
    return false
  }

  const equipmentTypes = (exercise.equipmentTypes ?? []).map(upper)
  if (
    equipmentTypes.some((equipmentType) =>
      STRENGTH_STUDIO_CARDIO_EQUIPMENT_TYPES.includes(
        equipmentType as typeof STRENGTH_STUDIO_CARDIO_EQUIPMENT_TYPES[number]
      )
    )
  ) {
    return false
  }

  const muscleGroup = normalizeLibraryText(exercise.muscleGroup ?? '')
  if (muscleGroup === 'cardio' || muscleGroup === 'kondition') return false

  const primaryName = exercise.name ?? exercise.nameSv ?? exercise.nameEn
  return isStrengthStudioExerciseNameCandidate(primaryName)
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
  if (!isStrengthStudioExercise(exercise)) return false
  if (categoryFilter === 'ALL') return true
  if (categoryFilter === PREHAB_STABILITY_FILTER) return isPrehabStabilityExercise(exercise)
  return exercise.category === categoryFilter
}
