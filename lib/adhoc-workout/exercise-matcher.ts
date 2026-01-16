/**
 * Exercise Matcher
 *
 * Fuzzy matching service to match exercise names from ad-hoc workout input
 * against the exercise library. Uses string similarity algorithms.
 */

import { prisma } from '@/lib/prisma'
import type { Exercise } from '@prisma/client'
import type { ExerciseMatch, ExerciseLibraryEntry, ExerciseMatchSuggestion } from './types'

// ============================================
// CACHE
// ============================================

let exerciseLibraryCache: ExerciseLibraryEntry[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Get the exercise library (cached)
 */
export async function getExerciseLibrary(): Promise<ExerciseLibraryEntry[]> {
  const now = Date.now()

  if (exerciseLibraryCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return exerciseLibraryCache
  }

  const exercises = await prisma.exercise.findMany({
    where: {
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      nameSv: true,
      nameEn: true,
      category: true,
      muscleGroup: true,
      equipment: true,
    },
  })

  exerciseLibraryCache = exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    nameSv: ex.nameSv || undefined,
    nameEn: ex.nameEn || undefined,
    category: ex.category,
    muscleGroup: ex.muscleGroup || undefined,
    equipment: ex.equipment || undefined,
    aliases: generateAliases(ex),
  }))

  cacheTimestamp = now
  return exerciseLibraryCache
}

/**
 * Match an exercise name against the library
 */
export async function matchExercise(
  inputName: string,
  library?: ExerciseLibraryEntry[]
): Promise<ExerciseMatch & { alternatives: ExerciseMatch[] }> {
  const exercises = library || (await getExerciseLibrary())
  const normalizedInput = normalizeExerciseName(inputName)

  // Find all matches with scores
  const matches: Array<ExerciseMatch & { score: number }> = []

  for (const exercise of exercises) {
    const score = calculateMatchScore(normalizedInput, exercise)
    if (score > 0.3) {
      // Minimum threshold
      matches.push({
        id: exercise.id,
        name: exercise.name,
        confidence: score,
        score,
      })
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score)

  // Best match
  const bestMatch = matches[0]

  if (!bestMatch || bestMatch.score < 0.5) {
    // No good match found
    return {
      id: null,
      name: inputName,
      confidence: 0,
      alternatives: matches.slice(0, 3).map(({ score, ...m }) => m),
    }
  }

  return {
    id: bestMatch.id,
    name: bestMatch.name,
    confidence: bestMatch.score,
    alternatives: matches.slice(1, 4).map(({ score, ...m }) => m),
  }
}

/**
 * Match multiple exercises at once (more efficient)
 */
export async function matchExercises(
  inputNames: string[]
): Promise<Map<string, ExerciseMatch & { alternatives: ExerciseMatch[] }>> {
  const library = await getExerciseLibrary()
  const results = new Map<string, ExerciseMatch & { alternatives: ExerciseMatch[] }>()

  for (const name of inputNames) {
    results.set(name, await matchExercise(name, library))
  }

  return results
}

/**
 * Get exercise suggestions for a partial name (autocomplete)
 */
export async function getExerciseSuggestions(
  partialName: string,
  limit: number = 5
): Promise<ExerciseMatchSuggestion[]> {
  const library = await getExerciseLibrary()
  const normalizedInput = normalizeExerciseName(partialName)

  const suggestions: ExerciseMatchSuggestion[] = []

  for (const exercise of library) {
    const score = calculateMatchScore(normalizedInput, exercise)
    if (score > 0.2) {
      suggestions.push({
        exercise,
        confidence: score,
        reason: getMatchReason(normalizedInput, exercise),
      })
    }
  }

  suggestions.sort((a, b) => b.confidence - a.confidence)
  return suggestions.slice(0, limit)
}

// ============================================
// MATCHING ALGORITHMS
// ============================================

/**
 * Calculate match score between input and exercise
 */
function calculateMatchScore(
  normalizedInput: string,
  exercise: ExerciseLibraryEntry
): number {
  const scores: number[] = []

  // Check primary name
  scores.push(stringSimilarity(normalizedInput, normalizeExerciseName(exercise.name)))

  // Check Swedish name
  if (exercise.nameSv) {
    scores.push(stringSimilarity(normalizedInput, normalizeExerciseName(exercise.nameSv)))
  }

  // Check English name
  if (exercise.nameEn) {
    scores.push(stringSimilarity(normalizedInput, normalizeExerciseName(exercise.nameEn)))
  }

  // Check aliases
  if (exercise.aliases) {
    for (const alias of exercise.aliases) {
      scores.push(stringSimilarity(normalizedInput, normalizeExerciseName(alias)))
    }
  }

  // Check for exact word match (higher weight)
  const inputWords = normalizedInput.split(' ')
  const exerciseWords = normalizeExerciseName(exercise.name).split(' ')
  const commonWords = inputWords.filter((w) => exerciseWords.includes(w))
  if (commonWords.length > 0) {
    const wordMatchScore = commonWords.length / Math.max(inputWords.length, exerciseWords.length)
    scores.push(wordMatchScore * 1.2) // Boost word matches
  }

  // Return best score
  return Math.min(Math.max(...scores), 1.0)
}

/**
 * Levenshtein distance-based string similarity
 */
function stringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  if (str1.length === 0 || str2.length === 0) return 0.0

  // Check if one contains the other
  if (str1.includes(str2)) return 0.8 + 0.2 * (str2.length / str1.length)
  if (str2.includes(str1)) return 0.8 + 0.2 * (str1.length / str2.length)

  // Levenshtein distance
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  return 1 - distance / maxLength
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Initialize first column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
  }

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

// ============================================
// NORMALIZATION
// ============================================

/**
 * Normalize exercise name for matching
 */
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove special characters
    .replace(/[^\w\såäöÅÄÖ]/g, ' ')
    // Normalize Swedish characters
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate common aliases for an exercise
 */
function generateAliases(exercise: Pick<Exercise, 'name' | 'nameSv' | 'nameEn'>): string[] {
  const aliases: string[] = []

  // Common abbreviations and variants
  const abbreviationMap: Record<string, string[]> = {
    'back squat': ['bs', 'squat', 'knäböj', 'knaböj'],
    'front squat': ['fs', 'frontsquat'],
    'overhead squat': ['ohs'],
    'deadlift': ['dl', 'marklyft'],
    'romanian deadlift': ['rdl', 'stiff leg deadlift', 'rumänsk marklyft'],
    'bench press': ['bp', 'bänkpress', 'bankpress', 'flat bench'],
    'overhead press': ['ohp', 'military press', 'militärpress', 'shoulder press', 'axelpress'],
    'barbell row': ['bb row', 'bent over row'],
    'pull up': ['pullup', 'chin up', 'chinup', 'chins'],
    'push up': ['pushup', 'armhävning', 'armhävningar'],
    'dumbbell': ['db'],
    'kettlebell': ['kb'],
    'box jump': ['boxhopp'],
    'burpee': ['burpees'],
    'thruster': ['thrusters'],
    'clean': ['power clean', 'squat clean', 'pc', 'sc'],
    'snatch': ['power snatch', 'squat snatch', 'ps', 'ss'],
    'clean and jerk': ['c&j', 'cnj'],
    'wall ball': ['wallball', 'wb'],
    'double under': ['du', 'double unders', 'dus'],
    'toes to bar': ['t2b', 'ttb'],
    'chest to bar': ['c2b', 'ctb'],
    'handstand push up': ['hspu', 'handstand pushup'],
    'muscle up': ['mu', 'muscle ups'],
    'plank': ['plankan', 'planking'],
    'sit up': ['situp', 'situps', 'sit-up'],
    'crunch': ['crunches'],
    'lunge': ['lunges', 'utfall'],
    'step up': ['stepup', 'step ups'],
  }

  const nameLower = exercise.name.toLowerCase()
  for (const [key, values] of Object.entries(abbreviationMap)) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      aliases.push(...values)
    }
  }

  return aliases
}

/**
 * Get human-readable reason for match
 */
function getMatchReason(input: string, exercise: ExerciseLibraryEntry): string {
  const normalizedInput = normalizeExerciseName(input)
  const normalizedName = normalizeExerciseName(exercise.name)

  if (normalizedInput === normalizedName) {
    return 'Exakt matchning'
  }

  if (normalizedName.includes(normalizedInput)) {
    return `Innehåller "${input}"`
  }

  if (exercise.aliases?.some((a) => normalizeExerciseName(a) === normalizedInput)) {
    return 'Matchad via förkortning'
  }

  if (exercise.nameSv && normalizeExerciseName(exercise.nameSv).includes(normalizedInput)) {
    return 'Matchad via svenskt namn'
  }

  return 'Liknar namnet'
}

// ============================================
// CLEAR CACHE (for testing)
// ============================================

export function clearExerciseCache(): void {
  exerciseLibraryCache = null
  cacheTimestamp = 0
}
