/**
 * Multi-Part Program Generation
 *
 * Automatically splits long training programs into phases and generates each
 * phase sequentially with context from previous phases.
 *
 * Usage:
 * ```typescript
 * import { generateMultiPartProgram, calculatePhases } from '@/lib/ai/program-generator'
 *
 * // Calculate how many phases for a 24-week program
 * const phases = calculatePhases(24) // 4 phases of 6 weeks
 *
 * // Start generation
 * const program = await generateMultiPartProgram({
 *   sessionId: 'uuid',
 *   context: { ... },
 *   apiKey: 'sk-...',
 *   provider: 'ANTHROPIC'
 * })
 * ```
 */

// Types
export type {
  PhaseConfig,
  ProgramOutline,
  GenerationContext,
  GeneratedPhase,
  MergedProgram,
  ProgressEvent,
  ProgressEventType,
  GenerationSessionState,
  StartGenerationRequest,
  StartGenerationResponse,
  WorkoutSegment,
  DayWorkout,
  WeeklyTemplate,
} from './types'

export {
  calculatePhases,
  parseWeekRange,
  estimateGenerationMinutes,
} from './types'

// Orchestrator
export {
  generateMultiPartProgram,
  resumeGeneration,
  type OrchestratorOptions,
} from './orchestrator'

// Prompts
export {
  PROGRAM_GENERATOR_SYSTEM_PROMPT,
  buildOutlinePrompt,
  buildPhasePrompt,
  extractJsonFromResponse,
  parseOutlineResponse,
  parsePhaseResponse,
} from './prompts'

// Merger
export {
  mergePhases,
  expandToWeeks,
  validateMergedProgram,
  type ExpandedWeek,
  type ExpandedDay,
  type ValidationResult,
} from './merger'
