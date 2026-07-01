const AD_HOC_WOD_PROGRAM_NAMES = new Set([
  'personal training',
  'personlig träning',
])

/**
 * WODs scheduled from AI chat may create a technical program container.
 * It should not make the athlete UI claim that a structured program exists.
 */
export function isStructuredTrainingProgram(program: { name: string }): boolean {
  return !AD_HOC_WOD_PROGRAM_NAMES.has(program.name.trim().toLowerCase())
}
