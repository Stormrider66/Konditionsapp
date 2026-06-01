export type ExerciseDisplayLocale = 'en' | 'sv' | string | null | undefined

export interface ExerciseDisplayName {
  name?: string | null
  nameSv?: string | null
  nameEn?: string | null
}

function isSwedishLocale(locale: ExerciseDisplayLocale): boolean {
  return typeof locale === 'string' && locale.startsWith('sv')
}

export function getOptionalExerciseDisplayName(
  exercise: ExerciseDisplayName | null | undefined,
  locale: ExerciseDisplayLocale
): string | null {
  if (!exercise) return null

  const candidates = isSwedishLocale(locale)
    ? [exercise.nameSv, exercise.name, exercise.nameEn]
    : [exercise.nameEn, exercise.name, exercise.nameSv]

  for (const candidate of candidates) {
    const name = candidate?.trim()
    if (name) return name
  }

  return null
}

export function getExerciseDisplayName(
  exercise: ExerciseDisplayName | null | undefined,
  locale: ExerciseDisplayLocale,
  fallback = 'Exercise'
): string {
  return getOptionalExerciseDisplayName(exercise, locale) ?? fallback
}
