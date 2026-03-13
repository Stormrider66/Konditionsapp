/**
 * AutoOptimize — Public API
 *
 * Autonomous quality improvement pipeline for AI-generated training programs.
 */

// Types
export type {
  EvaluationResult,
  EvaluationContext,
  CriterionName,
  CriterionResult,
  TestScenario,
  PromptSlot,
  PromptVariant,
  VariantParameters,
  IterationRun,
  IterationOptions,
  ScenarioResult,
  InjuryData,
  DashboardData,
} from './types'

// Evaluator
export { evaluateProgram } from './program-evaluator'

// Test Scenarios
export { TEST_SCENARIOS, getScenario, getScenarios } from './test-scenarios'

// Prompt Variants
export {
  getActiveVariant,
  getVariant,
  getVariantHistory,
  listVariants,
  createVariant,
  promoteVariant,
  deprecateVariant,
  updateVariantScores,
} from './prompt-variants'

// Iteration Engine
export { runIteration } from './iteration-engine'

// Candidate Generator
export { generateCandidate } from './candidate-generator'
