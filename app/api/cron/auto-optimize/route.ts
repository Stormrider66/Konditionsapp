/**
 * Cron: Auto-Optimize
 *
 * Weekly (Sunday 3 AM): Checks for TESTING variants, runs iterations,
 * promotes/discards based on results, and generates next candidates.
 *
 * Schedule: 0 3 * * 0 (Sundays at 3:00 AM)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runIteration } from '@/lib/auto-optimize/iteration-engine'
import { generateCandidate } from '@/lib/auto-optimize/candidate-generator'
import { listVariants, getActiveVariant } from '@/lib/auto-optimize/prompt-variants'
import { evaluateProgram } from '@/lib/auto-optimize/program-evaluator'
import { parseAIProgram } from '@/lib/ai/program-parser'
import { generateProgramPrompt } from '@/lib/ai/program-prompts'
import { generateText } from 'ai'
import { createModelInstance } from '@/lib/ai/create-model'
import { getResolvedAiKeys, getPlatformAiKeyOwnerId } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { TEST_SCENARIOS } from '@/lib/auto-optimize/test-scenarios'
import type { EvaluationResult, PromptSlot } from '@/lib/auto-optimize/types'

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Array<{
    slot: string
    action: string
    decision?: string
    score?: number
    error?: string
  }> = []

  const slots: PromptSlot[] = ['system', 'outline', 'phase', 'full_program']

  for (const slot of slots) {
    try {
      // Step 1: Check for TESTING variants
      const testingVariants = await listVariants({ slot, status: 'TESTING' })

      if (testingVariants.length > 0) {
        // Run iteration for first TESTING variant
        const candidate = testingVariants[0]
        const run = await runIteration(candidate.id, { runsPerScenario: 2 })

        results.push({
          slot,
          action: 'iterate',
          decision: run.decision,
          score: run.candidateAvgScore,
        })
      } else {
        // Step 2: Check for DEVELOPMENT variants
        const devVariants = await listVariants({ slot, status: 'DEVELOPMENT' })

        if (devVariants.length > 0) {
          // Run iteration for first DEVELOPMENT variant
          const candidate = devVariants[0]
          const run = await runIteration(candidate.id, { runsPerScenario: 2 })

          results.push({
            slot,
            action: 'iterate_dev',
            decision: run.decision,
            score: run.candidateAvgScore,
          })
        } else {
          // Step 3: Generate new candidate from active baseline
          const active = await getActiveVariant(slot)
          if (active) {
            const evaluations = await evaluateActiveVariant(active.promptTemplate, slot)

            if (evaluations.length > 0) {
              const newCandidate = await generateCandidate(active, evaluations)
              results.push({
                slot,
                action: 'generate_candidate',
                score: active.overallAccuracy ?? undefined,
              })
            } else {
              results.push({ slot, action: 'skip', error: 'Could not evaluate active variant' })
            }
          } else {
            results.push({ slot, action: 'skip', error: 'No active variant' })
          }
        }
      }
    } catch (error) {
      results.push({
        slot,
        action: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Run a quick evaluation of the active variant across a few scenarios
 * to gather data for candidate generation.
 */
async function evaluateActiveVariant(
  promptTemplate: string,
  slot: PromptSlot
): Promise<EvaluationResult[]> {
  const userId = await getPlatformAiKeyOwnerId()
  if (!userId) return []

  const keys = await getResolvedAiKeys(userId)
  const model = resolveModel(keys, 'fast')
  if (!model) return []

  const evaluations: EvaluationResult[] = []
  // Use a subset of scenarios for quick evaluation
  const quickScenarios = TEST_SCENARIOS.slice(0, 4)

  for (const scenario of quickScenarios) {
    try {
      const prompt = promptTemplate.includes('{{')
        ? promptTemplate
            .replace(/\{\{sport\}\}/g, scenario.sport)
            .replace(/\{\{methodology\}\}/g, scenario.methodology)
            .replace(/\{\{totalWeeks\}\}/g, String(scenario.totalWeeks))
            .replace(/\{\{sessionsPerWeek\}\}/g, String(scenario.sessionsPerWeek))
            .replace(/\{\{experienceLevel\}\}/g, scenario.experienceLevel)
            .replace(/\{\{goal\}\}/g, scenario.goal)
        : `${promptTemplate}\n\nSport: ${scenario.sport}\nMetodik: ${scenario.methodology}\nVeckor: ${scenario.totalWeeks}\nPass/vecka: ${scenario.sessionsPerWeek}\nMål: ${scenario.goal}`

      const result = await generateText({
        model: createModelInstance(model),
        prompt,
        maxOutputTokens: 16000,
        temperature: 0.7,
      })

      const parseResult = parseAIProgram(result.text)
      if (parseResult.success && parseResult.program) {
        const evaluation = evaluateProgram(parseResult.program, {
          sport: scenario.sport,
          methodology: scenario.methodology,
          totalWeeks: scenario.totalWeeks,
          sessionsPerWeek: scenario.sessionsPerWeek,
          experienceLevel: scenario.experienceLevel,
          goal: scenario.goal,
          injuries: scenario.injuries,
          calendarConstraints: scenario.calendarConstraints,
        })
        evaluations.push(evaluation)
      }
    } catch {
      // Skip failed scenarios
    }
  }

  return evaluations
}

export const maxDuration = 300
export const dynamic = 'force-dynamic'
