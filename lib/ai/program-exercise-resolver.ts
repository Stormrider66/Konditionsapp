/**
 * Program Importer — Exercise Resolver Helpers (client-safe)
 *
 * Utilities for walking a ParsedProgram JSON (as emitted by the import-parse
 * route) and:
 *   1. Extracting every exerciseName present on strength-style segments.
 *   2. Applying a { name → exerciseId } mapping back into the JSON so the
 *      downstream publish flow persists Exercise FKs.
 *
 * These helpers operate on the raw JSON string so we don't have to thread a
 * typed ParsedProgram through the import UI — the preview component re-parses
 * the same string and the publish flow does too, keeping one source of truth.
 */

import type { ParsedProgram, ParsedWorkoutSegment } from '@/lib/ai/program-parser'
import { isStrengthStudioExerciseNameCandidate } from '@/lib/strength/exercise-library-filters'

export type ExerciseMappings = Record<string, string>

/**
 * Safely parse aiOutput JSON. Returns null if the string isn't a plain
 * JSON object (e.g. AI added code fences or prose). The caller should fall
 * back to leaving the output unchanged in that case.
 */
function tryParse(aiOutput: string): ParsedProgram | null {
  try {
    const parsed = JSON.parse(aiOutput)
    if (parsed && typeof parsed === 'object' && 'phases' in parsed) {
      return parsed as ParsedProgram
    }
    return null
  } catch {
    return null
  }
}

/**
 * Walk every strength-style segment in a ParsedProgram and collect the unique
 * exercise names the AI emitted. Used to batch-call /api/programs/resolve-exercises.
 */
export function extractExerciseNames(aiOutput: string): string[] {
  const program = tryParse(aiOutput)
  if (!program) return []

  const names = new Set<string>()
  for (const phase of program.phases ?? []) {
    const tpl = phase.weeklyTemplate
    if (!tpl) continue
    for (const day of Object.values(tpl)) {
      if (!day || day.type === 'REST') continue
      const segments = (day as { segments?: ParsedWorkoutSegment[] }).segments
      if (!segments) continue
      for (const seg of segments) {
        if (seg.type !== 'exercise') continue
        if (seg.exerciseName && !seg.exerciseId) {
          const clean = seg.exerciseName.trim()
          if (isStrengthStudioExerciseNameCandidate(clean)) names.add(clean)
        }
      }
    }
  }
  return Array.from(names)
}

/**
 * Rewrite aiOutput so every segment whose exerciseName is present in the
 * mappings gets a matching exerciseId. Segments without a mapping entry are
 * left untouched.
 *
 * Returns the rewritten JSON string. Falls back to the original if the input
 * can't be parsed as an object.
 */
export function applyExerciseMappings(
  aiOutput: string,
  mappings: ExerciseMappings
): string {
  const program = tryParse(aiOutput)
  if (!program) return aiOutput

  const next: ParsedProgram = {
    ...program,
    phases: (program.phases ?? []).map((phase) => {
      if (!phase.weeklyTemplate) return phase
      const nextTpl: Record<string, unknown> = { ...phase.weeklyTemplate }
      for (const [dayName, day] of Object.entries(phase.weeklyTemplate)) {
        if (!day || (day as { type: string }).type === 'REST') continue
        const segments = (day as { segments?: ParsedWorkoutSegment[] }).segments
        if (!segments) continue
        nextTpl[dayName] = {
          ...day,
          segments: segments.map((seg) => {
            const name = seg.exerciseName?.trim()
            if (!name) return seg
            const id = mappings[name]
            if (!id) return seg
            return { ...seg, exerciseId: id }
          }),
        }
      }
      return { ...phase, weeklyTemplate: nextTpl } as typeof phase
    }),
  }

  return JSON.stringify(next)
}
