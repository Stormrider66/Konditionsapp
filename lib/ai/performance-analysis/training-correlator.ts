/**
 * Training Correlator Service
 *
 * AI-powered analysis of training-performance correlations.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { buildTrendContext, buildTrainingContext } from './context-builder'
import { generateTrainingCorrelationPrompt, PERFORMANCE_ANALYSIS_SYSTEM_PROMPT } from './prompts'
import {
  TrainingCorrelationResult,
  TrainingContextForAnalysis,
  KeyFinding,
  TrainingRecommendation,
} from './types'

const anthropic = new Anthropic()

interface CorrelationOptions {
  lookbackMonths?: number
}

/**
 * Analyze training-performance correlations using AI
 */
export async function analyzeTrainingCorrelation(
  clientId: string,
  options: CorrelationOptions = {}
): Promise<TrainingCorrelationResult | null> {
  const { lookbackMonths = 12 } = options

  try {
    // Build trend context for test data
    const context = await buildTrendContext(clientId, lookbackMonths)

    if (!context || context.tests.length < 3) {
      logger.warn('Insufficient tests for correlation analysis', {
        clientId,
        testCount: context?.tests.length ?? 0,
      })
      return null
    }

    // Build training contexts for each test period
    const trainingPeriods = await buildTrainingPeriodsForTests(clientId, context.tests)

    if (trainingPeriods.length < 2) {
      logger.warn('Insufficient training data for correlation analysis', { clientId })
      return null
    }

    // Calculate actual correlations
    const correlations = calculateCorrelations(context.tests, trainingPeriods)

    // Determine data quality
    const dataQuality =
      context.tests.length >= 4 && trainingPeriods.length >= 4
        ? 'EXCELLENT'
        : context.tests.length >= 3
          ? 'GOOD'
          : 'LIMITED'

    // Generate prompt
    const prompt = generateTrainingCorrelationPrompt(
      context.tests,
      trainingPeriods,
      context.athlete
    )

    // Call Claude
    const startTime = Date.now()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: PERFORMANCE_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const duration = Date.now() - startTime
    logger.info('Training correlation analysis completed', {
      clientId,
      testCount: context.tests.length,
      duration,
      model: 'claude-sonnet-4-20250514',
    })

    // Parse response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const parsed = parseCorrelationResponse(content.text)

    // Merge calculated correlations with AI insights
    const mergedCorrelations = mergeCorrelations(correlations, parsed.correlations)

    // Build result
    const result: TrainingCorrelationResult = {
      analysisType: 'TRAINING_CORRELATION',
      generatedAt: new Date().toISOString(),
      confidence: correlations.length >= 3 ? 'HIGH' : 'MEDIUM',
      dataQuality,
      narrative: parsed.narrative,
      executiveSummary: parsed.executiveSummary,
      keyFindings: parsed.keyFindings,
      strengths: parsed.strengths,
      developmentAreas: parsed.developmentAreas,
      predictions: parsed.predictions,
      recommendations: parsed.recommendations,
      correlations: mergedCorrelations,
      effectivenessInsights: parsed.effectivenessInsights ?? {
        mostEffectiveTraining: [],
        leastEffectiveTraining: [],
        recommendedDistribution: { zone1: 10, zone2: 70, zone3: 5, zone4: 10, zone5: 5 },
        methodology: `Baserat på ${context.tests.length} tester över ${lookbackMonths} månader`,
      },
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      modelUsed: 'claude-sonnet-4-20250514',
    }

    return result
  } catch (error) {
    logger.error('Failed to analyze training correlation', { clientId }, error)
    throw error
  }
}

/**
 * Build training contexts for periods before each test
 */
async function buildTrainingPeriodsForTests(
  clientId: string,
  tests: { id: string; date: string }[]
): Promise<TrainingContextForAnalysis[]> {
  const periods: TrainingContextForAnalysis[] = []

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]
    const testDate = new Date(test.date)

    // Look back 8-12 weeks before each test
    const weeks = i === 0 ? 12 : Math.min(12, Math.ceil(
      (testDate.getTime() - new Date(tests[i - 1].date).getTime()) / (1000 * 60 * 60 * 24 * 7)
    ))

    const context = await buildTrainingContext(clientId, testDate, weeks)
    if (context && context.totalSessions > 0) {
      periods.push(context)
    }
  }

  return periods
}

/**
 * Calculate correlations between training factors and performance
 */
function calculateCorrelations(
  tests: { vo2max: number | null; anaerobicThreshold: { intensity: number } | null }[],
  trainingPeriods: TrainingContextForAnalysis[]
): TrainingCorrelationResult['correlations'] {
  const correlations: TrainingCorrelationResult['correlations'] = []

  // Ensure we have matching pairs
  const n = Math.min(tests.length, trainingPeriods.length)
  if (n < 3) return correlations

  // Extract performance metrics
  const vo2maxValues = tests.slice(0, n).map((t) => t.vo2max ?? 0)
  const lt2Values = tests.slice(0, n).map((t) => t.anaerobicThreshold?.intensity ?? 0)

  // Extract training factors
  const weeklyVolumes = trainingPeriods.slice(0, n).map((t) => t.avgWeeklyDistance)
  const weeklyTSS = trainingPeriods.slice(0, n).map((t) => t.avgWeeklyTSS)
  const strengthSessions = trainingPeriods.slice(0, n).map((t) => t.strengthSessions)
  const avgReadiness = trainingPeriods.slice(0, n).map((t) => t.avgReadiness)
  const avgSleep = trainingPeriods.slice(0, n).map((t) => t.avgSleepHours)
  const completionRates = trainingPeriods.slice(0, n).map((t) => t.completionRate)

  // Helper to add correlation if significant
  const addCorrelation = (
    trainingFactor: string,
    performanceMetric: string,
    trainingValues: number[],
    performanceValues: number[]
  ) => {
    const r = pearsonCorrelation(trainingValues, performanceValues)
    if (Math.abs(r) < 0.2) return // Skip weak correlations

    const significance: 'SIGNIFICANT' | 'MODERATE' | 'WEAK' | 'NONE' =
      Math.abs(r) >= 0.7
        ? 'SIGNIFICANT'
        : Math.abs(r) >= 0.5
          ? 'MODERATE'
          : Math.abs(r) >= 0.3
            ? 'WEAK'
            : 'NONE'

    correlations.push({
      trainingFactor,
      performanceMetric,
      correlationStrength: r,
      significance,
      direction: r > 0 ? 'POSITIVE' : 'NEGATIVE',
      interpretation: generateInterpretation(trainingFactor, performanceMetric, r),
    })
  }

  // Calculate correlations for VO2max
  if (vo2maxValues.some((v) => v > 0)) {
    addCorrelation('Veckovolym (km)', 'VO2max', weeklyVolumes, vo2maxValues)
    addCorrelation('Vecko-TSS', 'VO2max', weeklyTSS, vo2maxValues)
    addCorrelation('Styrkepass', 'VO2max', strengthSessions, vo2maxValues)
    addCorrelation('Genomsnittlig readiness', 'VO2max', avgReadiness, vo2maxValues)
    addCorrelation('Sömntimmar', 'VO2max', avgSleep, vo2maxValues)
    addCorrelation('Genomföringsgrad', 'VO2max', completionRates, vo2maxValues)
  }

  // Calculate correlations for LT2
  if (lt2Values.some((v) => v > 0)) {
    addCorrelation('Veckovolym (km)', 'Anaerob tröskel', weeklyVolumes, lt2Values)
    addCorrelation('Vecko-TSS', 'Anaerob tröskel', weeklyTSS, lt2Values)
    addCorrelation('Styrkepass', 'Anaerob tröskel', strengthSessions, lt2Values)
  }

  return correlations.sort((a, b) => Math.abs(b.correlationStrength) - Math.abs(a.correlationStrength))
}

/**
 * Calculate Pearson correlation coefficient
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n < 3) return 0

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0)
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0)
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  )

  if (denominator === 0) return 0
  return numerator / denominator
}

/**
 * Generate human-readable interpretation
 */
function generateInterpretation(
  trainingFactor: string,
  performanceMetric: string,
  correlation: number
): string {
  const strength =
    Math.abs(correlation) >= 0.7
      ? 'stark'
      : Math.abs(correlation) >= 0.5
        ? 'måttlig'
        : 'svag'

  const direction = correlation > 0 ? 'positiv' : 'negativ'

  if (correlation > 0.5) {
    return `${strength} ${direction} korrelation: Högre ${trainingFactor.toLowerCase()} verkar associerat med högre ${performanceMetric}.`
  } else if (correlation < -0.5) {
    return `${strength} ${direction} korrelation: Högre ${trainingFactor.toLowerCase()} verkar associerat med lägre ${performanceMetric}.`
  } else if (Math.abs(correlation) >= 0.3) {
    return `${strength} ${direction} trend observerad mellan ${trainingFactor.toLowerCase()} och ${performanceMetric}.`
  } else {
    return `Ingen tydlig korrelation mellan ${trainingFactor.toLowerCase()} och ${performanceMetric}.`
  }
}

/**
 * Merge calculated correlations with AI-generated ones
 */
function mergeCorrelations(
  calculated: TrainingCorrelationResult['correlations'],
  aiGenerated: TrainingCorrelationResult['correlations']
): TrainingCorrelationResult['correlations'] {
  const merged = [...calculated]

  // Add AI-generated correlations that weren't calculated
  for (const ai of aiGenerated) {
    const exists = merged.some(
      (c) =>
        c.trainingFactor === ai.trainingFactor &&
        c.performanceMetric === ai.performanceMetric
    )
    if (!exists) {
      merged.push(ai)
    }
  }

  return merged.sort(
    (a, b) => Math.abs(b.correlationStrength) - Math.abs(a.correlationStrength)
  )
}

/**
 * Parse correlation analysis response
 */
function parseCorrelationResponse(text: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: { type: string; title: string; prediction: string; confidence: number; basis: string; timeframe?: string }[]
  recommendations: TrainingRecommendation[]
  correlations: TrainingCorrelationResult['correlations']
  effectivenessInsights?: TrainingCorrelationResult['effectivenessInsights']
} {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!jsonMatch) {
    const rawJsonMatch = text.match(/\{[\s\S]*\}/)
    if (!rawJsonMatch) {
      throw new Error('Could not parse AI response: no JSON found')
    }
    return parseCorrelationJson(rawJsonMatch[0])
  }

  return parseCorrelationJson(jsonMatch[1])
}

function parseCorrelationJson(jsonStr: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: { type: string; title: string; prediction: string; confidence: number; basis: string; timeframe?: string }[]
  recommendations: TrainingRecommendation[]
  correlations: TrainingCorrelationResult['correlations']
  effectivenessInsights?: TrainingCorrelationResult['effectivenessInsights']
} {
  try {
    const parsed = JSON.parse(jsonStr)

    // Parse correlations from AI
    const correlations: TrainingCorrelationResult['correlations'] = []
    if (Array.isArray(parsed.correlations)) {
      for (const c of parsed.correlations) {
        if (typeof c !== 'object' || c === null) continue

        const validSignificance = ['SIGNIFICANT', 'MODERATE', 'WEAK', 'NONE']
        const validDirection = ['POSITIVE', 'NEGATIVE']

        correlations.push({
          trainingFactor: String(c.trainingFactor ?? ''),
          performanceMetric: String(c.performanceMetric ?? ''),
          correlationStrength:
            typeof c.correlationStrength === 'number' ? c.correlationStrength : 0,
          significance: validSignificance.includes(c.significance)
            ? (c.significance as 'SIGNIFICANT' | 'MODERATE' | 'WEAK' | 'NONE')
            : 'WEAK',
          direction: validDirection.includes(c.direction)
            ? (c.direction as 'POSITIVE' | 'NEGATIVE')
            : 'POSITIVE',
          interpretation: String(c.interpretation ?? ''),
        })
      }
    }

    // Parse effectiveness insights
    let effectivenessInsights: TrainingCorrelationResult['effectivenessInsights'] | undefined
    if (parsed.effectivenessInsights) {
      const ei = parsed.effectivenessInsights
      effectivenessInsights = {
        mostEffectiveTraining: Array.isArray(ei.mostEffectiveTraining)
          ? ei.mostEffectiveTraining.map(String)
          : [],
        leastEffectiveTraining: Array.isArray(ei.leastEffectiveTraining)
          ? ei.leastEffectiveTraining.map(String)
          : [],
        recommendedDistribution: {
          zone1: typeof ei.recommendedDistribution?.zone1 === 'number' ? ei.recommendedDistribution.zone1 : 10,
          zone2: typeof ei.recommendedDistribution?.zone2 === 'number' ? ei.recommendedDistribution.zone2 : 70,
          zone3: typeof ei.recommendedDistribution?.zone3 === 'number' ? ei.recommendedDistribution.zone3 : 5,
          zone4: typeof ei.recommendedDistribution?.zone4 === 'number' ? ei.recommendedDistribution.zone4 : 10,
          zone5: typeof ei.recommendedDistribution?.zone5 === 'number' ? ei.recommendedDistribution.zone5 : 5,
        },
        methodology: String(ei.methodology ?? ''),
      }
    }

    return {
      narrative: parsed.narrative ?? '',
      executiveSummary: parsed.executiveSummary ?? '',
      keyFindings: validateKeyFindings(parsed.keyFindings ?? []),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      developmentAreas: Array.isArray(parsed.developmentAreas) ? parsed.developmentAreas : [],
      predictions: validatePredictions(parsed.predictions ?? []),
      recommendations: validateRecommendations(parsed.recommendations ?? []),
      correlations,
      effectivenessInsights,
    }
  } catch (e) {
    logger.error('Failed to parse correlation JSON', { jsonStr: jsonStr.substring(0, 200) }, e)
    throw new Error('Failed to parse AI response')
  }
}

// Validation helpers
function validateKeyFindings(findings: unknown[]): KeyFinding[] {
  const validCategories = ['IMPROVEMENT', 'DECLINE', 'STRENGTH', 'WEAKNESS', 'INSIGHT', 'WARNING']
  const validSignificance = ['HIGH', 'MEDIUM', 'LOW']

  return findings
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f) => ({
      category: validCategories.includes(f.category as string)
        ? (f.category as KeyFinding['category'])
        : 'INSIGHT',
      title: String(f.title ?? ''),
      description: String(f.description ?? ''),
      metric: f.metric as string | undefined,
      value: typeof f.value === 'number' ? f.value : undefined,
      change: typeof f.change === 'number' ? f.change : undefined,
      significance: validSignificance.includes(f.significance as string)
        ? (f.significance as KeyFinding['significance'])
        : 'MEDIUM',
    }))
}

function validatePredictions(predictions: unknown[]): { type: string; title: string; prediction: string; confidence: number; basis: string; timeframe?: string }[] {
  return predictions
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => ({
      type: String(p.type ?? 'FITNESS_PEAK'),
      title: String(p.title ?? ''),
      prediction: String(p.prediction ?? ''),
      confidence: typeof p.confidence === 'number' ? Math.min(1, Math.max(0, p.confidence)) : 0.5,
      basis: String(p.basis ?? ''),
      timeframe: p.timeframe as string | undefined,
    }))
}

function validateRecommendations(recommendations: unknown[]): TrainingRecommendation[] {
  const validCategories = ['VOLUME', 'INTENSITY', 'RECOVERY', 'TECHNIQUE', 'STRENGTH', 'NUTRITION']
  const validPriorities = [1, 2, 3]

  return recommendations
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      priority: validPriorities.includes(r.priority as number) ? (r.priority as 1 | 2 | 3) : 2,
      category: validCategories.includes(r.category as string)
        ? (r.category as TrainingRecommendation['category'])
        : 'VOLUME',
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      rationale: String(r.rationale ?? ''),
      implementation: String(r.implementation ?? ''),
      expectedOutcome: String(r.expectedOutcome ?? ''),
    }))
    .sort((a, b) => a.priority - b.priority)
}
