/**
 * AutoOptimize Types
 *
 * Shared interfaces for the autonomous quality improvement pipeline.
 */

import type { SportType } from '@prisma/client'
import type { CalendarConstraints } from '@/lib/ai/program-prompts'

// ── Sport Categories ────────────────────────────────────────────────

export type SportCategory = 'ENDURANCE' | 'STRENGTH_GYM' | 'HYBRID' | 'TEAM_SPORT'

const SPORT_CATEGORY_MAP: Record<string, SportCategory> = {
  RUNNING: 'ENDURANCE',
  CYCLING: 'ENDURANCE',
  SKIING: 'ENDURANCE',
  SWIMMING: 'ENDURANCE',
  TRIATHLON: 'ENDURANCE',
  STRENGTH: 'STRENGTH_GYM',
  GENERAL_FITNESS: 'STRENGTH_GYM',
  FUNCTIONAL_FITNESS: 'STRENGTH_GYM',
  HYROX: 'HYBRID',
  TEAM_FOOTBALL: 'TEAM_SPORT',
  TEAM_ICE_HOCKEY: 'TEAM_SPORT',
  TEAM_HANDBALL: 'TEAM_SPORT',
  TEAM_FLOORBALL: 'TEAM_SPORT',
  TEAM_BASKETBALL: 'TEAM_SPORT',
  TEAM_VOLLEYBALL: 'TEAM_SPORT',
  TENNIS: 'TEAM_SPORT',
  PADEL: 'TEAM_SPORT',
}

export function getSportCategory(sport: SportType | string): SportCategory {
  return SPORT_CATEGORY_MAP[sport] || 'ENDURANCE'
}

export function isGymSport(sport: SportType | string): boolean {
  const cat = getSportCategory(sport)
  return cat === 'STRENGTH_GYM' || cat === 'HYBRID'
}

// ── Scoring Criteria ────────────────────────────────────────────────

export type CriterionName =
  | 'structuralCompleteness'
  | 'progressiveOverload'
  | 'zoneDistribution'
  | 'sportSpecificCorrectness'
  | 'calendarCompliance'
  | 'injuryAwareness'
  | 'periodizationQuality'
  | 'segmentDetail'

export interface CriterionResult {
  score: number // 0-100
  weight: number // 0-1
  details: string[]
}

export interface EvaluationResult {
  overallScore: number // 0-100 weighted composite
  criteria: Record<CriterionName, CriterionResult>
  parseSuccess: boolean
  warnings: string[]
}

// ── Evaluation Context ──────────────────────────────────────────────

export interface InjuryData {
  type: string
  painLevel: number
  bodyPart: string
  status: 'active' | 'recovering' | 'resolved'
  notes?: string
}

export interface EvaluationContext {
  sport: SportType
  methodology?: string
  totalWeeks: number
  sessionsPerWeek: number
  experienceLevel?: string
  goal?: string
  injuries?: InjuryData[]
  calendarConstraints?: CalendarConstraints
}

// ── Test Scenarios ──────────────────────────────────────────────────

export interface TestScenario {
  id: string
  name: string
  sport: SportType
  methodology: string
  totalWeeks: number
  sessionsPerWeek: number
  experienceLevel: string
  goal: string
  injuries?: InjuryData[]
  calendarConstraints?: CalendarConstraints
  hasTestData: boolean
}

// ── Prompt Variants ─────────────────────────────────────────────────

export type PromptSlot = 'system' | 'outline' | 'phase' | 'full_program'

export interface PromptVariant {
  id: string
  versionName: string
  versionNumber: number
  promptTemplate: string
  slot: PromptSlot
  status: 'DEVELOPMENT' | 'TESTING' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED'
  overallAccuracy: number | null
  parameters: VariantParameters | null
  previousVersionId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VariantParameters {
  slot: PromptSlot
  targetedImprovements?: CriterionName[]
  evaluationWeights?: Record<CriterionName, number>
  lastEvaluationScores?: Record<CriterionName, number>
  scenarioScores?: Record<string, number>
  iterationHistory?: IterationSummary[]
}

// ── Iteration Engine ────────────────────────────────────────────────

export interface ScenarioResult {
  scenarioId: string
  scenarioName: string
  score: number
  criteria: Record<CriterionName, CriterionResult>
  parseSuccess: boolean
  warnings: string[]
  generationTimeMs: number
}

export interface IterationRun {
  id: string
  timestamp: Date
  candidateVariantId: string
  baselineVariantId: string
  results: {
    candidate: ScenarioResult[]
    baseline: ScenarioResult[]
  }
  candidateAvgScore: number
  baselineAvgScore: number
  scoreDelta: number
  decision: 'KEEP' | 'DISCARD'
  slot: PromptSlot
}

export interface IterationSummary {
  runId: string
  timestamp: string
  decision: 'KEEP' | 'DISCARD'
  candidateScore: number
  baselineScore: number
  delta: number
}

export interface IterationOptions {
  scenarios?: string[] // subset of scenario IDs
  runsPerScenario?: number // default 2
  skipBaseline?: boolean // use cached baseline scores
}

// ── Candidate Generator ─────────────────────────────────────────────

export interface CandidateGenerationInput {
  currentPrompt: string
  slot: PromptSlot
  evaluationResults: EvaluationResult[]
  weakestCriteria: CriterionName[]
}

export interface CandidateGenerationOutput {
  revisedPrompt: string
  reasoning: string
  targetedImprovements: string[]
}

// ── Dashboard ───────────────────────────────────────────────────────

export interface DashboardData {
  activeVariants: Record<PromptSlot, PromptVariant | null>
  recentRuns: IterationRun[]
  scoreTrend: Array<{
    date: string
    score: number
    slot: PromptSlot
    variantId: string
  }>
  criteriaBreakdown: Record<CriterionName, number> | null
}
