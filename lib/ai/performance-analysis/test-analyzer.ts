/**
 * Test Analyzer Service
 *
 * AI-powered analysis of individual physiological tests.
 * Uses Google Gemini for AI analysis with user-configured API keys.
 */

import { logger } from '@/lib/logger'
import { buildAnalysisContext } from './context-builder'
import { generateTestAnalysisPrompt, PERFORMANCE_ANALYSIS_SYSTEM_PROMPT } from './prompts'
import {
  PerformanceAnalysisResult,
  KeyFinding,
  PerformancePrediction,
  TrainingRecommendation,
} from './types'
import {
  createGoogleGenAIClient,
  generateContent,
  createText,
} from '@/lib/ai/google-genai-client'
import { GEMINI_MODELS } from '@/lib/ai/gemini-config'
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'

interface AnalyzeTestOptions {
  includePredictions?: boolean
  includeRecommendations?: boolean
  trainingLookbackWeeks?: number
  /** User ID to get API keys from settings */
  userId?: string
}

/**
 * Analyze a single test using AI
 */
export async function analyzeTest(
  testId: string,
  options: AnalyzeTestOptions = {}
): Promise<PerformanceAnalysisResult | null> {
  const {
    includePredictions = true,
    includeRecommendations = true,
    trainingLookbackWeeks = 12,
    userId,
  } = options

  try {
    // Build context for analysis
    const context = await buildAnalysisContext(testId, {
      includePreviousTests: 3,
      trainingLookbackWeeks,
    })

    if (!context) {
      logger.warn('Could not build analysis context', { testId })
      return null
    }

    // Determine data quality
    const dataQuality = assessDataQuality(context)

    // Generate prompt
    const prompt = generateTestAnalysisPrompt(
      context.test,
      context.previousTests,
      context.trainingContext,
      context.athlete
    )

    // Get API key from user settings or fall back to environment variable
    let apiKey: string | null = null

    if (userId) {
      const decryptedKeys = await getDecryptedUserApiKeys(userId)
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
    const model = GEMINI_MODELS.FLASH // Use Gemini 3 Flash for fast analysis

    const startTime = Date.now()
    const fullPrompt = `${PERFORMANCE_ANALYSIS_SYSTEM_PROMPT}\n\n${prompt}`
    const response = await generateContent(
      client,
      model,
      [createText(fullPrompt)],
      { maxOutputTokens: 4000, temperature: 0.7 }
    )

    const duration = Date.now() - startTime
    logger.info('Test analysis completed', { testId, duration, model })

    // Parse response
    const parsed = parseAnalysisResponse(response.text)

    // Apply options
    if (!includePredictions) {
      parsed.predictions = []
    }
    if (!includeRecommendations) {
      parsed.recommendations = []
    }

    // Build result
    const tokensUsed = (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0)
    const result: PerformanceAnalysisResult = {
      analysisType: 'TEST_ANALYSIS',
      generatedAt: new Date().toISOString(),
      confidence: calculateConfidence(context, dataQuality),
      dataQuality,
      narrative: parsed.narrative,
      executiveSummary: parsed.executiveSummary,
      keyFindings: parsed.keyFindings,
      strengths: parsed.strengths,
      developmentAreas: parsed.developmentAreas,
      predictions: parsed.predictions,
      recommendations: parsed.recommendations,
      tokensUsed,
      modelUsed: model,
    }

    return result
  } catch (error) {
    logger.error('Failed to analyze test', { testId }, error)
    throw error
  }
}

/**
 * Assess data quality based on available data
 */
function assessDataQuality(context: {
  test: { vo2max: number | null; stages: unknown[]; economyData: unknown[] }
  trainingContext: unknown | null
  previousTests: unknown[]
}): 'EXCELLENT' | 'GOOD' | 'LIMITED' {
  let score = 0

  // Test data completeness
  if (context.test.vo2max) score += 2
  if (context.test.stages.length >= 5) score += 2
  if (context.test.economyData.length > 0) score += 1

  // Training context
  if (context.trainingContext) score += 2

  // Historical context
  if (context.previousTests.length >= 2) score += 2
  else if (context.previousTests.length === 1) score += 1

  if (score >= 7) return 'EXCELLENT'
  if (score >= 4) return 'GOOD'
  return 'LIMITED'
}

/**
 * Calculate confidence level based on data quality and completeness
 */
function calculateConfidence(
  context: {
    test: { vo2max: number | null; stages: unknown[] }
    trainingContext: unknown | null
    previousTests: unknown[]
  },
  dataQuality: 'EXCELLENT' | 'GOOD' | 'LIMITED'
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (dataQuality === 'EXCELLENT' && context.previousTests.length >= 2) {
    return 'HIGH'
  }
  if (dataQuality === 'LIMITED' || context.previousTests.length === 0) {
    return 'LOW'
  }
  return 'MEDIUM'
}

/**
 * Parse AI response into structured format
 */
function parseAnalysisResponse(text: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: PerformancePrediction[]
  recommendations: TrainingRecommendation[]
} {
  // Extract JSON from response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!jsonMatch) {
    // Try to find raw JSON
    const rawJsonMatch = text.match(/\{[\s\S]*\}/)
    if (!rawJsonMatch) {
      throw new Error('Could not parse AI response: no JSON found')
    }
    return parseJson(rawJsonMatch[0])
  }

  return parseJson(jsonMatch[1])
}

function parseJson(jsonStr: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: PerformancePrediction[]
  recommendations: TrainingRecommendation[]
} {
  try {
    const parsed = JSON.parse(jsonStr)

    return {
      narrative: parsed.narrative ?? '',
      executiveSummary: parsed.executiveSummary ?? '',
      keyFindings: validateKeyFindings(parsed.keyFindings ?? []),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      developmentAreas: Array.isArray(parsed.developmentAreas) ? parsed.developmentAreas : [],
      predictions: validatePredictions(parsed.predictions ?? []),
      recommendations: validateRecommendations(parsed.recommendations ?? []),
    }
  } catch (e) {
    logger.error('Failed to parse AI response JSON', { jsonStr: jsonStr.substring(0, 200) }, e)
    throw new Error('Failed to parse AI response')
  }
}

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
      priority: validPriorities.includes(r.priority as number)
        ? (r.priority as 1 | 2 | 3)
        : 2,
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
