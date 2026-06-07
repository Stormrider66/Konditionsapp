export const STAR_EXERCISE_LIBRARY_SLUGS = [
  'star-by-thomson',
  'star-by-th',
  'skelleftea-aik',
] as const

export const STAR_EXERCISE_LIBRARY_LABEL = 'Star network'

export type StarExerciseLibrarySlug = typeof STAR_EXERCISE_LIBRARY_SLUGS[number]

export function isStarExerciseLibrarySlug(slug?: string | null): slug is StarExerciseLibrarySlug {
  return Boolean(slug && STAR_EXERCISE_LIBRARY_SLUGS.includes(slug as StarExerciseLibrarySlug))
}
