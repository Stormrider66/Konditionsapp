/**
 * Iteration Engine
 *
 * Core iterate-evaluate-compare loop for the AutoOptimize pipeline.
 * Generates programs from candidate and baseline prompts, scores them,
 * and decides whether to KEEP or DISCARD the candidate.
 */

import { generateText } from 'ai'
import { parseAIProgram } from '@/lib/ai/program-parser'
import { generateProgramPrompt } from '@/lib/ai/program-prompts'
import { createModelInstance } from '@/lib/ai/create-model'
import { getResolvedAiKeys } from '@/lib/user-api-keys'
import { getPlatformAiKeyOwnerId } from '@/lib/user-api-keys'
import { resolveModel, type ResolvedModel } from '@/types/ai-models'
import { prisma } from '@/lib/prisma'
import { evaluateProgram } from './program-evaluator'
import { TEST_SCENARIOS, getScenarios } from './test-scenarios'
import {
  getActiveVariant,
  getVariant,
  promoteVariant,
  deprecateVariant,
  updateVariantScores,
  addIterationToHistory,
} from './prompt-variants'
import type {
  IterationRun,
  IterationOptions,
  ScenarioResult,
  TestScenario,
  EvaluationContext,
  PromptSlot,
} from './types'

// ── Main Entry Point ────────────────────────────────────────────────

/**
 * Run a full iteration comparing a candidate variant against the baseline.
 *
 * @param candidateVariantId - The candidate AIModelVersion ID
 * @param options - Optional: subset scenarios, runs per scenario, skip baseline
 * @returns The iteration run result with decision
 */
export async function runIteration(
  candidateVariantId: string,
  options: IterationOptions = {}
): Promise<IterationRun> {
  const { runsPerScenario = 2, skipBaseline = false } = options

  // Load candidate
  const candidate = await getVariant(candidateVariantId)
  if (!candidate) throw new Error(`Candidate variant ${candidateVariantId} not found`)
  if (!candidate.promptTemplate) throw new Error('Candidate has no prompt template')

  // Load baseline (ACTIVE variant for same slot)
  const baseline = await getActiveVariant(candidate.slot)
  if (!baseline && !skipBaseline) {
    throw new Error(`No active baseline for slot ${candidate.slot}`)
  }

  // Select scenarios
  const scenarios = options.scenarios
    ? getScenarios(options.scenarios)
    : TEST_SCENARIOS

  // Resolve AI model for generation
  const userId = await getPlatformAiKeyOwnerId()
  if (!userId) throw new Error('No platform AI key owner found')
  const keys = await getResolvedAiKeys(userId)
  const model = resolveModel(keys, 'fast')
  if (!model) throw new Error('No AI model available')

  // Run evaluations
  const candidateResults: ScenarioResult[] = []
  const baselineResults: ScenarioResult[] = []

  for (const scenario of scenarios) {
    for (let run = 0; run < runsPerScenario; run++) {
      // Generate and evaluate with candidate prompt
      const candidateResult = await generateAndEvaluate(
        scenario,
        candidate.promptTemplate,
        model,
      )
      candidateResults.push(candidateResult)

      // Generate and evaluate with baseline prompt (if not skipped)
      if (baseline && !skipBaseline) {
        // Use existing prompt generator as baseline if no custom template
        const baselineTemplate = baseline.promptTemplate || getDefaultPrompt(scenario)
        const baselineResult = await generateAndEvaluate(
          scenario,
          baselineTemplate,
          model,
        )
        baselineResults.push(baselineResult)
      }
    }
  }

  // Calculate averages
  const candidateAvgScore = average(candidateResults.map(r => r.score))
  const baselineAvgScore = skipBaseline
    ? (baseline?.overallAccuracy ?? 0)
    : average(baselineResults.map(r => r.score))
  const scoreDelta = candidateAvgScore - baselineAvgScore

  // Decision: KEEP if candidate >= baseline
  const decision = candidateAvgScore >= baselineAvgScore ? 'KEEP' : 'DISCARD'

  const runId = `iter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const iterationRun: IterationRun = {
    id: runId,
    timestamp: new Date(),
    candidateVariantId: candidate.id,
    baselineVariantId: baseline?.id || 'none',
    results: {
      candidate: candidateResults,
      baseline: baselineResults,
    },
    candidateAvgScore,
    baselineAvgScore,
    scoreDelta,
    decision,
    slot: candidate.slot,
  }

  // Apply decision
  await applyDecision(iterationRun, candidate.id, baseline?.id)

  // Store accuracy snapshot
  await storeIterationSnapshot(iterationRun)

  return iterationRun
}

// ── Generate and Evaluate ───────────────────────────────────────────

async function generateAndEvaluate(
  scenario: TestScenario,
  promptTemplate: string,
  model: ResolvedModel,
): Promise<ScenarioResult> {
  const startTime = Date.now()
  const context = scenarioToContext(scenario)

  try {
    // Build the full prompt by injecting scenario into template
    const prompt = buildPromptFromTemplate(promptTemplate, scenario)

    const result = await generateText({
      model: createModelInstance(model),
      prompt,
      maxOutputTokens: 16000,
      temperature: 0.7,
    })

    const parseResult = parseAIProgram(result.text)

    if (!parseResult.success || !parseResult.program) {
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        score: 0,
        criteria: createEmptyCriteria(),
        parseSuccess: false,
        warnings: [`Parse failed: ${parseResult.error || 'unknown error'}`],
        generationTimeMs: Date.now() - startTime,
      }
    }

    const evaluation = evaluateProgram(parseResult.program, context)

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      score: evaluation.overallScore,
      criteria: evaluation.criteria,
      parseSuccess: true,
      warnings: evaluation.warnings,
      generationTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      score: 0,
      criteria: createEmptyCriteria(),
      parseSuccess: false,
      warnings: [`Generation error: ${error instanceof Error ? error.message : String(error)}`],
      generationTimeMs: Date.now() - startTime,
    }
  }
}

// ── Prompt Building ─────────────────────────────────────────────────

function buildPromptFromTemplate(template: string, scenario: TestScenario): string {
  // Replace placeholders in template
  let prompt = template
    .replace(/\{\{sport\}\}/g, scenario.sport)
    .replace(/\{\{methodology\}\}/g, scenario.methodology)
    .replace(/\{\{totalWeeks\}\}/g, String(scenario.totalWeeks))
    .replace(/\{\{sessionsPerWeek\}\}/g, String(scenario.sessionsPerWeek))
    .replace(/\{\{experienceLevel\}\}/g, scenario.experienceLevel)
    .replace(/\{\{goal\}\}/g, scenario.goal)

  // If template has no placeholders, prepend scenario context
  if (prompt === template) {
    const scenarioContext = [
      `Sport: ${scenario.sport}`,
      `Metodik: ${scenario.methodology}`,
      `Programlängd: ${scenario.totalWeeks} veckor`,
      `Pass per vecka: ${scenario.sessionsPerWeek}`,
      `Erfarenhetsnivå: ${scenario.experienceLevel}`,
      `Mål: ${scenario.goal}`,
      scenario.injuries?.length
        ? `Skador: ${scenario.injuries.map(i => `${i.bodyPart} (smärta ${i.painLevel})`).join(', ')}`
        : null,
    ].filter(Boolean).join('\n')

    prompt = `${template}\n\n--- SCENARIO ---\n${scenarioContext}`
  }

  return prompt
}

function getDefaultPrompt(scenario: TestScenario): string {
  return generateProgramPrompt(
    scenario.sport,
    scenario.methodology as 'POLARIZED' | 'NORWEGIAN' | 'CANOVA' | 'PYRAMIDAL',
    scenario.totalWeeks,
    scenario.goal,
    scenario.calendarConstraints,
  )
}

// ── Decision Application ────────────────────────────────────────────

async function applyDecision(
  run: IterationRun,
  candidateId: string,
  baselineId: string | undefined
): Promise<void> {
  // Build criteria score averages for the candidate
  const criteriaScores: Record<string, number> = {}
  const scenarioScores: Record<string, number> = {}

  for (const result of run.results.candidate) {
    scenarioScores[result.scenarioId] = result.score
    for (const [key, c] of Object.entries(result.criteria)) {
      criteriaScores[key] = (criteriaScores[key] || 0) + c.score
    }
  }
  const numResults = run.results.candidate.length || 1
  for (const key of Object.keys(criteriaScores)) {
    criteriaScores[key] = Math.round(criteriaScores[key] / numResults)
  }

  // Update candidate scores
  await updateVariantScores(candidateId, run.candidateAvgScore, criteriaScores, scenarioScores)

  // Record iteration in history
  const summary = {
    runId: run.id,
    timestamp: run.timestamp.toISOString(),
    decision: run.decision,
    candidateScore: run.candidateAvgScore,
    baselineScore: run.baselineAvgScore,
    delta: run.scoreDelta,
  }

  await addIterationToHistory(candidateId, summary)

  if (run.decision === 'KEEP') {
    // Promote candidate: DEVELOPMENT → TESTING → ACTIVE
    // If it's still DEVELOPMENT, promote to TESTING first
    const variant = await getVariant(candidateId)
    if (variant?.status === 'DEVELOPMENT') {
      await promoteVariant(candidateId) // → TESTING
    }
    await promoteVariant(candidateId) // → ACTIVE
  } else {
    // Deprecate candidate
    await deprecateVariant(candidateId)
  }
}

// ── Accuracy Snapshot ───────────────────────────────────────────────

async function storeIterationSnapshot(run: IterationRun): Promise<void> {
  const now = new Date()

  await prisma.accuracySnapshot.create({
    data: {
      periodStart: now,
      periodEnd: now,
      snapshotType: 'auto_optimize_iteration',
      programOutcomes: {
        type: 'auto_optimize',
        runId: run.id,
        slot: run.slot,
        candidateId: run.candidateVariantId,
        baselineId: run.baselineVariantId,
        candidateScore: run.candidateAvgScore,
        baselineScore: run.baselineAvgScore,
        delta: run.scoreDelta,
        decision: run.decision,
        scenarioCount: run.results.candidate.length,
        timestamp: now.toISOString(),
      },
      overallSampleSize: run.results.candidate.length + run.results.baseline.length,
      overallAccuracy: run.candidateAvgScore,
      confidenceLevel: Math.min(
        0.95,
        0.5 + (run.results.candidate.length * 0.03)
      ),
    },
  })
}

// ── Helpers ─────────────────────────────────────────────────────────

function scenarioToContext(scenario: TestScenario): EvaluationContext {
  return {
    sport: scenario.sport,
    methodology: scenario.methodology,
    totalWeeks: scenario.totalWeeks,
    sessionsPerWeek: scenario.sessionsPerWeek,
    experienceLevel: scenario.experienceLevel,
    goal: scenario.goal,
    injuries: scenario.injuries,
    calendarConstraints: scenario.calendarConstraints,
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

function createEmptyCriteria() {
  const names = [
    'structuralCompleteness', 'progressiveOverload', 'zoneDistribution',
    'sportSpecificCorrectness', 'calendarCompliance', 'injuryAwareness',
    'periodizationQuality', 'segmentDetail',
  ] as const
  const result: Record<string, { score: number; weight: number; details: string[] }> = {}
  for (const name of names) {
    result[name] = { score: 0, weight: 0, details: ['Not evaluated (parse failed)'] }
  }
  return result as ReturnType<typeof evaluateProgram>['criteria']
}
