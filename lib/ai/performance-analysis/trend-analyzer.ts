/**
 * Trend Analyzer Service
 *
 * AI-powered long-term trend analysis across multiple tests.
 * Uses Google Gemini for AI analysis with user-configured API keys.
 */

import { logger } from '@/lib/logger'
import { buildTrendContext } from './context-builder'
import { generateTrendAnalysisPrompt, PERFORMANCE_ANALYSIS_SYSTEM_PROMPT } from './prompts'
import {
  TrendAnalysisResult,
  TrendDataPoint,
  TrendStatistics,
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
import { getDecryptedUserApiKeys } from '@/lib/user-api-keys'

interface TrendAnalysisOptions {
  months?: number
  metrics?: ('vo2max' | 'lt1' | 'lt2' | 'economy' | 'maxHR')[]
  /** User ID to get API keys from settings */
  userId?: string
}

/**
 * Analyze long-term trends using AI
 */
export async function analyzeTrends(
  clientId: string,
  options: TrendAnalysisOptions = {}
): Promise<TrendAnalysisResult | null> {
  const { months = 12, userId } = options

  try {
    // Build trend context
    const context = await buildTrendContext(clientId, months)

    if (!context || context.tests.length < 2) {
      logger.warn('Insufficient data for trend analysis', { clientId, testCount: context?.tests.length ?? 0 })
      return null
    }

    // Calculate trends and statistics
    const trends = extractTrends(context.tests)
    const statistics = calculateStatistics(context.tests)

    // Determine data quality
    const dataQuality = context.tests.length >= 4 ? 'EXCELLENT' : context.tests.length >= 3 ? 'GOOD' : 'LIMITED'

    // Generate prompt
    const prompt = generateTrendAnalysisPrompt(
      context.tests,
      context.athlete,
      context.overallTraining
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
    logger.info('Trend analysis completed', {
      clientId,
      testCount: context.tests.length,
      months,
      duration,
      model,
    })

    // Parse response
    const parsed = parseTrendResponse(response.text)

    // Calculate projections
    const projections = calculateProjections(statistics)

    // Build result
    const tokensUsed = (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0)
    const result: TrendAnalysisResult = {
      analysisType: 'TREND_ANALYSIS',
      generatedAt: new Date().toISOString(),
      confidence: context.tests.length >= 4 ? 'HIGH' : 'MEDIUM',
      dataQuality,
      narrative: parsed.narrative,
      executiveSummary: parsed.executiveSummary,
      keyFindings: parsed.keyFindings,
      strengths: parsed.strengths,
      developmentAreas: parsed.developmentAreas,
      predictions: parsed.predictions,
      recommendations: parsed.recommendations,
      trends,
      statistics,
      projections: projections.length > 0 ? projections : (parsed.projections ?? []),
      tokensUsed,
      modelUsed: model,
    }

    return result
  } catch (error) {
    logger.error('Failed to analyze trends', { clientId, months }, error)
    throw error
  }
}

/**
 * Extract trend data points from tests
 */
function extractTrends(tests: TestDataForAnalysis[]): TrendAnalysisResult['trends'] {
  const vo2max: TrendDataPoint[] = []
  const aerobicThreshold: TrendDataPoint[] = []
  const anaerobicThreshold: TrendDataPoint[] = []
  const economy: TrendDataPoint[] = []

  for (const test of tests) {
    if (test.vo2max) {
      vo2max.push({ date: test.date, value: test.vo2max, testId: test.id })
    }

    if (test.aerobicThreshold?.hr) {
      aerobicThreshold.push({
        date: test.date,
        value: test.aerobicThreshold.intensity,
        testId: test.id,
      })
    }

    if (test.anaerobicThreshold?.hr) {
      anaerobicThreshold.push({
        date: test.date,
        value: test.anaerobicThreshold.intensity,
        testId: test.id,
      })
    }

    if (test.economyData.length > 0) {
      const avgEconomy =
        test.economyData.reduce((sum, e) => sum + e.economy, 0) / test.economyData.length
      economy.push({ date: test.date, value: avgEconomy, testId: test.id })
    }
  }

  return {
    vo2max,
    aerobicThreshold,
    anaerobicThreshold,
    economy,
  }
}

/**
 * Calculate statistics for each metric
 */
function calculateStatistics(tests: TestDataForAnalysis[]): TrendAnalysisResult['statistics'] {
  const calcStats = (values: { date: string; value: number }[]): TrendStatistics | null => {
    if (values.length < 2) return null

    const vals = values.map((v) => v.value)
    const n = vals.length
    const mean = vals.reduce((a, b) => a + b, 0) / n
    const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)

    // Calculate months between first and last
    const firstDate = new Date(values[0].date)
    const lastDate = new Date(values[values.length - 1].date)
    const monthsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)

    // Rate of change per month
    const totalChange = vals[vals.length - 1] - vals[0]
    const rateOfChange = monthsDiff > 0 ? totalChange / monthsDiff : 0

    // Linear regression for R²
    const { r2, trend } = linearRegression(values)

    return {
      dataPoints: n,
      firstValue: vals[0],
      lastValue: vals[vals.length - 1],
      minValue: Math.min(...vals),
      maxValue: Math.max(...vals),
      averageValue: mean,
      standardDeviation: stdDev,
      rateOfChange,
      trend,
      r2,
    }
  }

  // Extract values
  const vo2maxValues = tests
    .filter((t) => t.vo2max)
    .map((t) => ({ date: t.date, value: t.vo2max! }))

  const ltValues = tests
    .filter((t) => t.aerobicThreshold?.intensity)
    .map((t) => ({ date: t.date, value: t.aerobicThreshold!.intensity }))

  const lt2Values = tests
    .filter((t) => t.anaerobicThreshold?.intensity)
    .map((t) => ({ date: t.date, value: t.anaerobicThreshold!.intensity }))

  const economyValues = tests
    .filter((t) => t.economyData.length > 0)
    .map((t) => ({
      date: t.date,
      value: t.economyData.reduce((sum, e) => sum + e.economy, 0) / t.economyData.length,
    }))

  return {
    vo2max: calcStats(vo2maxValues),
    aerobicThreshold: calcStats(ltValues),
    anaerobicThreshold: calcStats(lt2Values),
    economy: calcStats(economyValues),
  }
}

/**
 * Simple linear regression to get R² and trend
 */
function linearRegression(values: { date: string; value: number }[]): {
  r2: number
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
} {
  if (values.length < 2) return { r2: 0, trend: 'STABLE' }

  // Convert dates to numeric indices
  const n = values.length
  const x = Array.from({ length: n }, (_, i) => i)
  const y = values.map((v) => v.value)

  // Calculate means
  const xMean = x.reduce((a, b) => a + b, 0) / n
  const yMean = y.reduce((a, b) => a + b, 0) / n

  // Calculate slope and R²
  let ssXY = 0
  let ssXX = 0
  let ssYY = 0

  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - xMean) * (y[i] - yMean)
    ssXX += (x[i] - xMean) ** 2
    ssYY += (y[i] - yMean) ** 2
  }

  const slope = ssXX !== 0 ? ssXY / ssXX : 0
  const r2 = ssXX !== 0 && ssYY !== 0 ? (ssXY ** 2) / (ssXX * ssYY) : 0

  // Determine trend based on slope and statistical significance
  const changePercent = yMean !== 0 ? (slope * n) / yMean * 100 : 0

  let trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  if (Math.abs(changePercent) < 3 || r2 < 0.3) {
    trend = 'STABLE'
  } else if (slope > 0) {
    trend = 'IMPROVING'
  } else {
    trend = 'DECLINING'
  }

  return { r2, trend }
}

/**
 * Calculate future projections based on trends
 */
function calculateProjections(
  statistics: TrendAnalysisResult['statistics']
): TrendAnalysisResult['projections'] {
  const projections: TrendAnalysisResult['projections'] = []

  const addProjection = (
    metric: string,
    stats: TrendStatistics | null,
    monthsAhead: number = 6
  ) => {
    if (!stats || stats.dataPoints < 3 || stats.r2 < 0.5) return

    const projectedValue = stats.lastValue + stats.rateOfChange * monthsAhead
    const projectionDate = new Date()
    projectionDate.setMonth(projectionDate.getMonth() + monthsAhead)

    // Confidence based on R² and data points
    const confidence = Math.min(0.9, stats.r2 * 0.8 + (stats.dataPoints / 10) * 0.2)

    projections.push({
      metric,
      currentValue: stats.lastValue,
      projectedValue,
      projectionDate: projectionDate.toISOString().split('T')[0],
      confidence,
      methodology: `Linjär extrapolering baserad på ${stats.dataPoints} datapunkter (R²=${stats.r2.toFixed(2)})`,
    })
  }

  addProjection('VO2max', statistics.vo2max)
  addProjection('Aerob tröskel', statistics.aerobicThreshold)
  addProjection('Anaerob tröskel', statistics.anaerobicThreshold)
  addProjection('Löpekonomi', statistics.economy)

  return projections
}

/**
 * Parse trend analysis response
 */
function parseTrendResponse(text: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: PerformancePrediction[]
  recommendations: TrainingRecommendation[]
  projections?: TrendAnalysisResult['projections']
} {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!jsonMatch) {
    const rawJsonMatch = text.match(/\{[\s\S]*\}/)
    if (!rawJsonMatch) {
      throw new Error('Could not parse AI response: no JSON found')
    }
    return parseTrendJson(rawJsonMatch[0])
  }

  return parseTrendJson(jsonMatch[1])
}

function parseTrendJson(jsonStr: string): {
  narrative: string
  executiveSummary: string
  keyFindings: KeyFinding[]
  strengths: string[]
  developmentAreas: string[]
  predictions: PerformancePrediction[]
  recommendations: TrainingRecommendation[]
  projections?: TrendAnalysisResult['projections']
} {
  try {
    const parsed = JSON.parse(jsonStr)

    // Parse projections if present from AI
    let projections: TrendAnalysisResult['projections'] | undefined
    if (Array.isArray(parsed.projections)) {
      projections = parsed.projections.map(
        (p: {
          metric?: string
          currentValue?: number
          projectedValue?: number
          projectionDate?: string
          confidence?: number
          methodology?: string
        }) => ({
          metric: String(p.metric ?? ''),
          currentValue: typeof p.currentValue === 'number' ? p.currentValue : 0,
          projectedValue: typeof p.projectedValue === 'number' ? p.projectedValue : 0,
          projectionDate: String(p.projectionDate ?? ''),
          confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
          methodology: String(p.methodology ?? ''),
        })
      )
    }

    return {
      narrative: parsed.narrative ?? '',
      executiveSummary: parsed.executiveSummary ?? '',
      keyFindings: validateKeyFindings(parsed.keyFindings ?? []),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      developmentAreas: Array.isArray(parsed.developmentAreas) ? parsed.developmentAreas : [],
      predictions: validatePredictions(parsed.predictions ?? []),
      recommendations: validateRecommendations(parsed.recommendations ?? []),
      projections,
    }
  } catch (e) {
    logger.error('Failed to parse trend JSON', { jsonStr: jsonStr.substring(0, 200) }, e)
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
