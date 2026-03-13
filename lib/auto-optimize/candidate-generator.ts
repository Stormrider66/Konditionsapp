/**
 * Candidate Generator
 *
 * Uses AI to propose improved prompt variants based on evaluation results.
 * Analyzes weakest criteria and generates targeted improvements.
 */

import { generateText } from 'ai'
import { createModelInstance } from '@/lib/ai/create-model'
import { getResolvedAiKeys, getPlatformAiKeyOwnerId } from '@/lib/user-api-keys'
import { resolveModel } from '@/types/ai-models'
import { createVariant } from './prompt-variants'
import type {
  CriterionName,
  EvaluationResult,
  PromptSlot,
  PromptVariant,
} from './types'

// ── Criterion labels (Swedish) ──────────────────────────────────────

const CRITERION_LABELS: Record<CriterionName, string> = {
  structuralCompleteness: 'Strukturell fullständighet',
  progressiveOverload: 'Progressiv belastning',
  zoneDistribution: 'Zonfördelning',
  sportSpecificCorrectness: 'Sportspecifik korrekthet',
  calendarCompliance: 'Kalenderefterlevnad',
  injuryAwareness: 'Skademedvetenhet',
  periodizationQuality: 'Periodiseringskvalitet',
  segmentDetail: 'Segmentdetalj',
}

// ── Main Entry Point ────────────────────────────────────────────────

/**
 * Generate a candidate prompt variant that aims to improve weak areas.
 *
 * @param currentVariant - The current active variant to improve upon
 * @param evaluationResults - Recent evaluation results showing strengths/weaknesses
 * @returns The newly created variant (in DEVELOPMENT status)
 */
export async function generateCandidate(
  currentVariant: PromptVariant,
  evaluationResults: EvaluationResult[]
): Promise<PromptVariant> {
  // Find weakest criteria across all evaluations
  const weakestCriteria = findWeakestCriteria(evaluationResults)

  // Resolve AI model (balanced for meta-prompt reasoning)
  const userId = await getPlatformAiKeyOwnerId()
  if (!userId) throw new Error('No platform AI key owner found')
  const keys = await getResolvedAiKeys(userId)
  const model = resolveModel(keys, 'balanced')
  if (!model) throw new Error('No AI model available')

  // Build meta-prompt
  const metaPrompt = buildMetaPrompt(
    currentVariant.promptTemplate,
    currentVariant.slot,
    weakestCriteria,
    evaluationResults
  )

  // Generate improved prompt
  const result = await generateText({
    model: createModelInstance(model),
    prompt: metaPrompt,
    maxOutputTokens: 8000,
    temperature: 0.4,
  })

  // Extract the revised prompt from AI response
  const revisedPrompt = extractPromptFromResponse(result.text, currentVariant.promptTemplate)

  // Create new variant
  const newVariant = await createVariant(currentVariant.slot, revisedPrompt, {
    parentId: currentVariant.id,
    parameters: {
      slot: currentVariant.slot,
      targetedImprovements: weakestCriteria,
    },
  })

  return newVariant
}

// ── Meta-Prompt Construction ────────────────────────────────────────

function buildMetaPrompt(
  currentPrompt: string,
  slot: PromptSlot,
  weakCriteria: CriterionName[],
  evaluations: EvaluationResult[]
): string {
  const avgScores = computeAverageCriteriaScores(evaluations)
  const overallAvg = evaluations.length > 0
    ? Math.round(evaluations.reduce((s, e) => s + e.overallScore, 0) / evaluations.length)
    : 0

  const weakDescriptions = weakCriteria.map(c => {
    const label = CRITERION_LABELS[c]
    const score = avgScores[c] ?? 0
    return `- ${label}: ${score}/100`
  }).join('\n')

  const allScores = Object.entries(avgScores)
    .sort(([, a], [, b]) => b - a)
    .map(([key, score]) => `- ${CRITERION_LABELS[key as CriterionName]}: ${score}/100`)
    .join('\n')

  // Collect common warnings
  const warningCounts: Record<string, number> = {}
  for (const e of evaluations) {
    for (const w of e.warnings) {
      warningCounts[w] = (warningCounts[w] || 0) + 1
    }
  }
  const topWarnings = Object.entries(warningCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([w, count]) => `- ${w} (${count}x)`)
    .join('\n')

  return `Du är en expert på att optimera AI-prompts för träningsprogramgenerering.

## Uppgift
Förbättra prompten nedan så att den genererar bättre träningsprogram. Fokusera på de svagaste kriterierna.

## Nuvarande prompt (slot: ${slot})
<current_prompt>
${currentPrompt}
</current_prompt>

## Utvärderingsresultat (genomsnitt av ${evaluations.length} scenario)
Totalpoäng: ${overallAvg}/100

### Alla kriterier (sorterade efter styrka)
${allScores}

### Svagaste kriterierna (fokusera här)
${weakDescriptions}

### Vanligaste varningarna
${topWarnings || 'Inga varningar'}

## Regler
1. Behåll allt som fungerar bra (starka kriterier)
2. Förbättra specifikt de svaga kriterierna
3. All output ska vara på SVENSKA
4. Behåll JSON-format-instruktioner oförändrade
5. Gör inte prompten för lång — var koncis men komplett
6. Om strukturell fullständighet är svag: var mer explicit om att alla veckor ska täckas, vilodag per vecka krävs
7. Om progressiv belastning är svag: kräv tydligt bas → bygg → topp → nedtrappning
8. Om zonfördelning är svag: specificera exakta %-fördelningar per metodik
9. Om segmentdetalj är svag: kräv segments-array med warmup/cooldown och specifika mål
10. Om skademedvetenhet är svag: kräv anpassningar och alternativa övningar

## Format
Svara ENBART med den förbättrade prompten. Ingen förklarande text före eller efter.
Inled prompten med "---PROMPT_START---" och avsluta med "---PROMPT_END---".`
}

// ── Response Extraction ─────────────────────────────────────────────

function extractPromptFromResponse(response: string, fallback: string): string {
  // Try to extract between markers
  const startMarker = '---PROMPT_START---'
  const endMarker = '---PROMPT_END---'

  const startIdx = response.indexOf(startMarker)
  const endIdx = response.indexOf(endMarker)

  if (startIdx !== -1 && endIdx !== -1) {
    return response.slice(startIdx + startMarker.length, endIdx).trim()
  }

  // If no markers, try to find the prompt content (skip any preamble)
  const lines = response.split('\n')
  const contentStart = lines.findIndex(l =>
    l.trim().length > 0 && !l.startsWith('Här') && !l.startsWith('Nedan')
  )

  if (contentStart >= 0) {
    return lines.slice(contentStart).join('\n').trim()
  }

  // Last resort: return the full response
  return response.trim() || fallback
}

// ── Analysis Helpers ────────────────────────────────────────────────

function findWeakestCriteria(
  evaluations: EvaluationResult[],
  topN = 3
): CriterionName[] {
  const avgScores = computeAverageCriteriaScores(evaluations)

  return Object.entries(avgScores)
    .sort(([, a], [, b]) => a - b)
    .slice(0, topN)
    .map(([key]) => key as CriterionName)
}

function computeAverageCriteriaScores(
  evaluations: EvaluationResult[]
): Record<CriterionName, number> {
  const result: Record<string, number> = {}
  const counts: Record<string, number> = {}

  for (const evaluation of evaluations) {
    for (const [key, criterion] of Object.entries(evaluation.criteria)) {
      result[key] = (result[key] || 0) + criterion.score
      counts[key] = (counts[key] || 0) + 1
    }
  }

  for (const key of Object.keys(result)) {
    result[key] = Math.round(result[key] / (counts[key] || 1))
  }

  return result as Record<CriterionName, number>
}
