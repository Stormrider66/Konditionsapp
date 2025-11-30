// lib/video-matching/matcher.ts
/**
 * Video-to-Exercise Matching Algorithm
 *
 * Uses Jaro-Winkler similarity with Swedish text normalization
 * to match YouTube video titles to exercise names.
 */

export interface Exercise {
  id: string
  name: string
  nameSv?: string | null
  nameEn?: string | null
}

export interface MatchResult {
  exerciseId: string
  exerciseName: string
  score: number
  matchMethod: 'EXACT' | 'FUZZY' | 'NONE'
}

export interface MatchCandidate {
  exercise: Exercise
  score: number
  matchedField: 'name' | 'nameSv' | 'nameEn'
}

// Match confidence thresholds
export const MATCH_THRESHOLDS = {
  EXACT: 0.95,      // Near-perfect match
  HIGH: 0.85,       // Very confident
  MEDIUM: 0.70,     // Review recommended
  LOW: 0.50,        // Likely wrong, needs manual
} as const

/**
 * Normalize Swedish text for comparison
 *
 * Handles:
 * - Lowercase conversion
 * - Swedish character variations (ae→ä, oe→ö, aa→å)
 * - Remove special characters and extra whitespace
 * - Common video title noise (numbers, parentheses content)
 */
export function normalizeSwedishText(text: string): string {
  if (!text) return ''

  let normalized = text.toLowerCase().trim()

  // Convert common Swedish character alternatives
  normalized = normalized
    .replace(/ae/g, 'ä')
    .replace(/oe/g, 'ö')
    .replace(/aa/g, 'å')
    // Handle uppercase variants too
    .replace(/Ae/gi, 'ä')
    .replace(/Oe/gi, 'ö')
    .replace(/Aa/gi, 'å')

  // Remove content in parentheses (often variations/notes in video titles)
  // e.g., "Höftbrygga (variant 2)" -> "Höftbrygga"
  normalized = normalized.replace(/\([^)]*\)/g, '')

  // Remove common video title prefixes/suffixes
  normalized = normalized
    .replace(/^övning[:\s-]*/i, '')
    .replace(/^exercise[:\s-]*/i, '')
    .replace(/variant\s*\d*/gi, '')
    .replace(/version\s*\d*/gi, '')

  // Remove special characters except Swedish letters
  normalized = normalized.replace(/[^\wäöåÄÖÅ\s]/g, '')

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Jaro similarity between two strings
 * Returns value between 0 (no match) and 1 (exact match)
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  // Find matching characters
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  // Count transpositions
  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3
  )
}

/**
 * Jaro-Winkler similarity (prefers matches at the start of strings)
 * Better for comparing names/titles
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2)

  // Calculate common prefix length (up to 4 characters)
  let prefixLength = 0
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) {
      prefixLength++
    } else {
      break
    }
  }

  // Winkler modification: boost score for common prefix
  const scalingFactor = 0.1
  return jaro + prefixLength * scalingFactor * (1 - jaro)
}

/**
 * Calculate similarity score between video title and exercise name
 * Uses normalized text comparison
 */
export function calculateSimilarity(videoTitle: string, exerciseName: string): number {
  const normalizedVideo = normalizeSwedishText(videoTitle)
  const normalizedExercise = normalizeSwedishText(exerciseName)

  if (!normalizedVideo || !normalizedExercise) return 0

  // Exact match after normalization
  if (normalizedVideo === normalizedExercise) return 1.0

  // Check if one contains the other (partial match bonus)
  const containsMatch =
    normalizedVideo.includes(normalizedExercise) ||
    normalizedExercise.includes(normalizedVideo)

  let score = jaroWinklerSimilarity(normalizedVideo, normalizedExercise)

  // Boost score if one contains the other
  if (containsMatch && score > 0.5) {
    score = Math.min(1.0, score + 0.1)
  }

  return score
}

/**
 * Find the best matching exercise for a video title
 */
export function findBestMatch(
  videoTitle: string,
  exercises: Exercise[]
): MatchResult | null {
  if (!videoTitle || !exercises.length) return null

  let bestMatch: MatchCandidate | null = null

  for (const exercise of exercises) {
    // Try matching against all name fields
    const candidates: Array<{ field: 'name' | 'nameSv' | 'nameEn'; name: string }> = [
      { field: 'name', name: exercise.name },
    ]

    if (exercise.nameSv) {
      candidates.push({ field: 'nameSv', name: exercise.nameSv })
    }
    if (exercise.nameEn) {
      candidates.push({ field: 'nameEn', name: exercise.nameEn })
    }

    for (const candidate of candidates) {
      const score = calculateSimilarity(videoTitle, candidate.name)

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          exercise,
          score,
          matchedField: candidate.field,
        }
      }
    }
  }

  if (!bestMatch) return null

  // Determine match method based on score
  let matchMethod: 'EXACT' | 'FUZZY' | 'NONE'
  if (bestMatch.score >= MATCH_THRESHOLDS.EXACT) {
    matchMethod = 'EXACT'
  } else if (bestMatch.score >= MATCH_THRESHOLDS.LOW) {
    matchMethod = 'FUZZY'
  } else {
    matchMethod = 'NONE'
  }

  return {
    exerciseId: bestMatch.exercise.id,
    exerciseName: bestMatch.exercise.name,
    score: bestMatch.score,
    matchMethod,
  }
}

/**
 * Find all potential matches above a threshold
 * Useful for showing alternatives when auto-match isn't confident
 */
export function findAllMatches(
  videoTitle: string,
  exercises: Exercise[],
  minScore: number = MATCH_THRESHOLDS.LOW
): MatchCandidate[] {
  const matches: MatchCandidate[] = []

  for (const exercise of exercises) {
    const candidates: Array<{ field: 'name' | 'nameSv' | 'nameEn'; name: string }> = [
      { field: 'name', name: exercise.name },
    ]

    if (exercise.nameSv) {
      candidates.push({ field: 'nameSv', name: exercise.nameSv })
    }
    if (exercise.nameEn) {
      candidates.push({ field: 'nameEn', name: exercise.nameEn })
    }

    // Get best score across all name fields for this exercise
    let bestScore = 0
    let bestField: 'name' | 'nameSv' | 'nameEn' = 'name'

    for (const candidate of candidates) {
      const score = calculateSimilarity(videoTitle, candidate.name)
      if (score > bestScore) {
        bestScore = score
        bestField = candidate.field
      }
    }

    if (bestScore >= minScore) {
      matches.push({
        exercise,
        score: bestScore,
        matchedField: bestField,
      })
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score)
}

/**
 * Batch match multiple videos to exercises
 */
export function matchVideosToExercises(
  videoTitles: string[],
  exercises: Exercise[]
): Map<string, MatchResult | null> {
  const results = new Map<string, MatchResult | null>()

  for (const title of videoTitles) {
    results.set(title, findBestMatch(title, exercises))
  }

  return results
}

/**
 * Get confidence level description for UI
 */
export function getConfidenceLevel(score: number): {
  level: 'high' | 'medium' | 'low' | 'none'
  color: string
  description: string
} {
  if (score >= MATCH_THRESHOLDS.EXACT) {
    return {
      level: 'high',
      color: 'green',
      description: 'Exakt matchning',
    }
  }
  if (score >= MATCH_THRESHOLDS.HIGH) {
    return {
      level: 'high',
      color: 'green',
      description: 'Mycket säker',
    }
  }
  if (score >= MATCH_THRESHOLDS.MEDIUM) {
    return {
      level: 'medium',
      color: 'yellow',
      description: 'Trolig matchning',
    }
  }
  if (score >= MATCH_THRESHOLDS.LOW) {
    return {
      level: 'low',
      color: 'orange',
      description: 'Osäker matchning',
    }
  }
  return {
    level: 'none',
    color: 'red',
    description: 'Ingen matchning hittad',
  }
}
