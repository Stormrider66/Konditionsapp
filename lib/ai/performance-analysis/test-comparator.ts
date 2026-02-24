/**
 * Test Comparator Service
 *
 * AI-powered comparison between two physiological tests.
 * Uses Google Gemini for AI analysis with user-configured API keys.
 */

import { logger } from '@/lib/logger'
import { buildComparisonContext } from './context-builder'
import { generateTestComparisonPrompt, PERFORMANCE_ANALYSIS_SYSTEM_PROMPT } from './prompts'
import {
  TestComparisonResult,
  DeltaValue,
  KeyFinding,
  PerformancePrediction,
  TrainingRecommendation,
  TestDataForAnalysis,
} from './types'
import {
  createGoogleGenAIClient,
  generateContent,
  createText,
} from '@/lib/ai/google-genai-client'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { getResolvedAiKeys } from '@/lib/user-api-keys'

interface CompareTestsOptions {
  includeTrainingCorrelation?: boolean
  /** User ID to get API keys from settings */
  userId?: string
}

/**
 * Compare two tests using AI
 */
export async function compareTests(
  currentTestId: string,
  previousTestId: string,
  options: CompareTestsOptions = {}
): Promise<TestComparisonResult | null> {
  const { includeTrainingCorrelation = true, userId } = options

  try {
    // Build comparison context
    const context = await buildComparisonContext(currentTestId, previousTestId)

    if (!context) {
      logger.warn('Could not build comparison context', { currentTestId, previousTestId })
      return null
    }

    // Calculate deltas
    const deltas = calculateDeltas(context.current, context.previous)

    // Determine data quality
    const hasTrainingData = context.trainingBetween !== null
    const dataQuality = hasTrainingData ? 'EXCELLENT' : 'GOOD'

    // Generate prompt
    const prompt = generateTestComparisonPrompt(
      context.current,
      context.previous,
      context.trainingBetween,
      context.athlete
    )

    // Get API key from user settings or fall back to environment variable
    let apiKey: string | null = null

    if (userId) {
      const decryptedKeys = await getResolvedAiKeys(userId)
      apiKey = decryptedKeys.googleKey
    }

    // Fall back to environment variable
    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || null
    }

    if (!apiKey) {
      throw new Error('No Google AI API key configured. Please add your API key in Settings.')
    }

    const client = createGoogleGenAIClient(apiKey)
    const model = GEMINI_MODELS.FLASH

    // Call Gemini
    const startTime = Date.now()
    const fullPrompt = `${PERFORMANCE_ANALYSIS_SYSTEM_PROMPT}\n\n${prompt}`
    const response = await generateContent(
      client,
      model,
      [createText(fullPrompt)],
      { maxOutputTokens: 4000, temperature: 0.7 }
    )

    const duration = Date.now() - startTime
    logger.info('Test comparison completed', {
      currentTestId,
      previousTestId,
      duration,
      model,
    })

    // Parse response
    const parsed = parseComparisonResponse(response.text)

    // Calculate days between tests
    const daysBetween = Math.floor(
      (new Date(context.current.date).getTime() - new Date(context.previous.date).getTime()) /
        (1000 * 60 * 60 * 24)
    )

    // Build result
    const result: TestComparisonResult = {
      analysisType: 'TEST_COMPARISON',
      generatedAt: new Date().toISOString(),
      confidence: hasTrainingData ? 'HIGH' : 'MEDIUM',
      dataQuality,
      narrative: parsed.narrative,
      executiveSummary: parsed.executiveSummary,
      keyFindings: parsed.keyFindings,
      strengths: parsed.strengths,
      developmentAreas: parsed.developmentAreas,
      predictions: parsed.predictions,
      recommendations: parsed.recommendations,
      comparison: {
        testDates: {
          previous: context.previous.date,
          current: context.current.date,
          daysBetween,
        },
        deltas,
        trainingBetweenTests: context.trainingBetween
          ? {
              weeks: context.trainingBetween.weekCount,
              totalSessions: context.trainingBetween.totalSessions,
              avgWeeklyVolume: `${context.trainingBetween.avgWeeklyDistance.toFixed(0)} km`,
              dominantTrainingType: getDominantTrainingType(context.trainingBetween),
              zoneDistributionSummary: getZoneDistributionSummary(context.trainingBetween),
            }
          : undefined,
      },
      correlationAnalysis: includeTrainingCorrelation && parsed.correlationAnalysis
        ? parsed.correlationAnalysis
        : undefined,
      tokensUsed: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
      modelUsed: model,
    }

    return result
  } catch (error) {
    logger.error('Failed to compare tests', { currentTestId, previousTestId }, error)
    throw error
  }
}

/**
 * Calculate deltas between two tests
 */
function calculateDeltas(
  current: TestDataForAnalysis,
  previous: TestDataForAnalysis
): TestComparisonResult['comparison']['deltas'] {
  const createDelta = (
    currentVal: number | null | undefined,
    previousVal: number | null | undefined
  ): DeltaValue | null => {
    if (currentVal == null || previousVal == null) return null

    const absoluteChange = currentVal - previousVal
    const percentChange = previousVal !== 0 ? (absoluteChange / previousVal) * 100 : 0

    let trend: 'IMPROVED' | 'DECLINED' | 'STABLE'
    // For most metrics, higher is better
    if (Math.abs(percentChange) < 2) {
      trend = 'STABLE'
    } else if (absoluteChange > 0) {
      trend = 'IMPROVED'
    } else {
      trend = 'DECLINED'
    }

    return {
      previous: previousVal,
      current: currentVal,
      absoluteChange,
      percentChange,
      trend,
    }
  }

  // For economy, lower is better, so invert the trend logic
  const createEconomyDelta = (
    currentVal: number | null | undefined,
    previousVal: number | null | undefined
  ): DeltaValue | null => {
    const delta = createDelta(currentVal, previousVal)
    if (!delta) return null

    // Invert trend for economy (lower is better)
    if (delta.trend === 'IMPROVED') {
      delta.trend = 'DECLINED'
    } else if (delta.trend === 'DECLINED') {
      delta.trend = 'IMPROVED'
    }

    return delta
  }

  // Calculate economy averages
  const currentEconomy =
    current.economyData.length > 0
      ? current.economyData.reduce((sum, e) => sum + e.economy, 0) / current.economyData.length
      : null
  const previousEconomy =
    previous.economyData.length > 0
      ? previous.economyData.reduce((sum, e) => sum + e.economy, 0) / previous.economyData.length
      : null

  return {
    vo2max: createDelta(current.vo2max, previous.vo2max),
    aerobicThresholdHR: createDelta(
      current.aerobicThreshold?.hr,
      previous.aerobicThreshold?.hr
    ),
    aerobicThresholdIntensity: createDelta(
      current.aerobicThreshold?.intensity,
      previous.aerobicThreshold?.intensity
    ),
    anaerobicThresholdHR: createDelta(
      current.anaerobicThreshold?.hr,
      previous.anaerobicThreshold?.hr
    ),
    anaerobicThresholdIntensity: createDelta(
      current.anaerobicThreshold?.intensity,
      previous.anaerobicThreshold?.intensity
    ),
    maxHR: createDelta(current.maxHR, previous.maxHR),
    maxLactate: createDelta(current.maxLactate, previous.maxLactate),
    economy: createEconomyDelta(currentEconomy, previousEconomy),
  }
}

/**
 * Get dominant training type from context
 */
function getDominantTrainingType(trainingContext: {
  trainingTypeDistribution: {
    easyRuns: number
    longRuns: number
    tempoRuns: number
    intervals: number
    recovery: number
  }
}): string {
  const types = trainingContext.trainingTypeDistribution
  const entries = [
    { name: 'Lugna löpningar', count: types.easyRuns },
    { name: 'Långpass', count: types.longRuns },
    { name: 'Tempopass', count: types.tempoRuns },
    { name: 'Intervaller', count: types.intervals },
    { name: 'Återhämtning', count: types.recovery },
  ]

  const dominant = entries.reduce((max, entry) => (entry.count > max.count ? entry : max))
  return dominant.name
}

/**
 * Summarize zone distribution
 */
function getZoneDistributionSummary(trainingContext: {
  zoneDistribution: {
    zone1Percent: number
    zone2Percent: number
    zone3Percent: number
    zone4Percent: number
    zone5Percent: number
  }
}): string {
  const zones = trainingContext.zoneDistribution
  const lowIntensity = zones.zone1Percent + zones.zone2Percent
  const highIntensity = zones.zone4Percent + zones.zone5Percent

  if (lowIntensity >= 75 && highIntensity >= 15) {
    return 'Polariserad (80/20)'
  } else if (zones.zone3Percent >= 30) {
    return 'Terskelbaserad'
  } else if (lowIntensity >= 80) {
    return 'Volymfokuserad'
  } else {
    return 'Blandad fördelning'
  }
}

/**
 * Parse comparison response
 */
function parseComparisonResponse(text: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: PerformancePrediction[]
  recommendations: TrainingRecommendation[]
  correlationAnalysis?: {
    likelyContributors: Array<{
      factor: string
      impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
      confidence: number
      explanation: string
    }>
    unexplainedVariance: string | null
  }
} {
  // Extract JSON from response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!jsonMatch) {
    const rawJsonMatch = text.match(/\{[\s\S]*\}/)
    if (!rawJsonMatch) {
      throw new Error('Could not parse AI response: no JSON found')
    }
    return parseComparisonJson(rawJsonMatch[0])
  }

  return parseComparisonJson(jsonMatch[1])
}

function parseComparisonJson(jsonStr: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: PerformancePrediction[]
  recommendations: TrainingRecommendation[]
  correlationAnalysis?: {
    likelyContributors: Array<{
      factor: string
      impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
      confidence: number
      explanation: string
    }>
    unexplainedVariance: string | null
  }
} {
  try {
    const parsed = JSON.parse(jsonStr)

    // Parse correlation analysis if present
    let correlationAnalysis
    if (parsed.correlationAnalysis) {
      const ca = parsed.correlationAnalysis
      correlationAnalysis = {
        likelyContributors: Array.isArray(ca.likelyContributors)
          ? ca.likelyContributors.map(
              (c: { factor?: string; impact?: string; confidence?: number; explanation?: string }) => ({
                factor: String(c.factor ?? ''),
                impact: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(c.impact ?? '')
                  ? (c.impact as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL')
                  : 'NEUTRAL',
                confidence: typeof c.confidence === 'number' ? c.confidence : 0.5,
                explanation: String(c.explanation ?? ''),
              })
            )
          : [],
        unexplainedVariance: ca.unexplainedVariance ?? null,
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
      correlationAnalysis,
    }
  } catch (e) {
    logger.error('Failed to parse comparison JSON', { jsonStr: jsonStr.substring(0, 200) }, e)
    throw new Error('Failed to parse AI response')
  }
}

// Validation helpers (same as in test-analyzer.ts)
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

function validatePredictions(predictions: unknown[]): PerformancePrediction[] {
  const validTypes = ['RACE_TIME', 'THRESHOLD', 'VO2MAX', 'FITNESS_PEAK']

  return predictions
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => ({
      type: validTypes.includes(p.type as string)
        ? (p.type as PerformancePrediction['type'])
        : 'FITNESS_PEAK',
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
