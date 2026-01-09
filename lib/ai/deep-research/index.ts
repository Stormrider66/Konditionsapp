/**
 * Deep Research System
 *
 * Provides autonomous research capabilities using multiple AI providers:
 * - Gemini Deep Research (default)
 * - OpenAI (Quick, Standard, Deep, Expert tiers)
 * - LangChain (future)
 */

import { DeepResearchProvider, DeepResearchStatus } from '@prisma/client'

// ============================================
// Types and Interfaces
// ============================================

export interface ResearchConfig {
  query: string
  systemPrompt?: string
  context?: string
  athleteContext?: Record<string, unknown>
  documentIds?: string[]
}

export interface StartResearchResult {
  externalJobId: string
  pollingUrl?: string
  estimatedMinutes: number
}

export interface PollResult {
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  progressPercent?: number
  progressMessage?: string
  currentStep?: string
  report?: string
  sources?: ResearchSource[]
  reasoning?: string
  tokensUsed?: number
  error?: string
}

export interface ResearchSource {
  url: string
  title: string
  excerpt?: string
}

export interface CostEstimate {
  minCost: number
  maxCost: number
  estimatedMinutes: number
  currency: 'USD'
}

// ============================================
// Provider Interface
// ============================================

export interface IDeepResearchProvider {
  /**
   * Start a new research session
   */
  start(config: ResearchConfig): Promise<StartResearchResult>

  /**
   * Poll for research status and results
   */
  poll(externalJobId: string): Promise<PollResult>

  /**
   * Cancel an ongoing research session
   */
  cancel?(externalJobId: string): Promise<boolean>

  /**
   * Get cost estimate for a research query
   */
  getCostEstimate(config: ResearchConfig): CostEstimate
}

// ============================================
// Cost Estimates by Provider
// ============================================

export const PROVIDER_COST_ESTIMATES: Record<DeepResearchProvider, CostEstimate> = {
  GEMINI: { minCost: 0.00, maxCost: 0.50, estimatedMinutes: 10, currency: 'USD' },
  OPENAI_QUICK: { minCost: 0.05, maxCost: 0.30, estimatedMinutes: 1, currency: 'USD' },
  OPENAI_STANDARD: { minCost: 0.50, maxCost: 2.00, estimatedMinutes: 3, currency: 'USD' },
  OPENAI_DEEP: { minCost: 0.50, maxCost: 3.00, estimatedMinutes: 10, currency: 'USD' },
  OPENAI_EXPERT: { minCost: 3.00, maxCost: 15.00, estimatedMinutes: 30, currency: 'USD' },
  LANGCHAIN: { minCost: 0.05, maxCost: 0.50, estimatedMinutes: 8, currency: 'USD' },
}

// ============================================
// Provider Model Mapping
// ============================================

export const PROVIDER_MODELS: Record<DeepResearchProvider, string> = {
  GEMINI: 'deep-research-pro-preview-12-2025',
  OPENAI_QUICK: 'gpt-5-mini',
  OPENAI_STANDARD: 'gpt-5.2',
  OPENAI_DEEP: 'o4-mini-deep-research',
  OPENAI_EXPERT: 'o3-deep-research',
  LANGCHAIN: 'custom',
}

// ============================================
// Status Mapping Helpers
// ============================================

export function mapGeminiStatus(status: string): PollResult['status'] {
  switch (status) {
    case 'completed':
      return 'COMPLETED'
    case 'failed':
    case 'cancelled':
      return 'FAILED'
    default:
      return 'RUNNING'
  }
}

export function mapOpenAIStatus(status: string): PollResult['status'] {
  switch (status) {
    case 'completed':
    case 'succeeded':
      return 'COMPLETED'
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'FAILED'
    default:
      return 'RUNNING'
  }
}

export function mapPollStatusToDbStatus(pollStatus: PollResult['status']): DeepResearchStatus {
  switch (pollStatus) {
    case 'COMPLETED':
      return 'COMPLETED'
    case 'FAILED':
      return 'FAILED'
    default:
      return 'RUNNING'
  }
}

// ============================================
// Default System Prompts
// ============================================

export const DEFAULT_RESEARCH_PROMPT = `You are an expert sports science researcher specializing in endurance training, athletic performance, and exercise physiology.

## Your Task
Conduct comprehensive research on the given topic. Synthesize information from multiple authoritative sources to create an evidence-based report.

## Output Format
Structure your report with the following sections:

### Executive Summary
A brief overview of key findings (2-3 paragraphs)

### Key Findings
Numbered list of the most important discoveries, each with citations

### Methodology Analysis
Critical evaluation of the research methodologies used in the sources

### Practical Applications
Specific, actionable recommendations for coaches and athletes

### Limitations & Considerations
Potential caveats, conflicting evidence, or areas needing more research

### Sources
Complete list of sources used with URLs

## Guidelines
- Prioritize peer-reviewed research and established sports science institutions
- Include specific data points, percentages, and measurable outcomes where available
- Note any conflicting findings between sources
- Consider both elite and recreational athlete applications
- Write in a professional but accessible tone`

export const ATHLETE_CONTEXT_PROMPT = `
## Athlete Context
The research should consider the following athlete profile when providing recommendations:
`

// ============================================
// Provider Factory
// ============================================

export async function createProvider(
  provider: DeepResearchProvider,
  apiKey: string
): Promise<IDeepResearchProvider> {
  switch (provider) {
    case 'GEMINI': {
      const { GeminiDeepResearchProvider } = await import('./gemini-provider')
      return new GeminiDeepResearchProvider(apiKey)
    }
    case 'OPENAI_QUICK':
    case 'OPENAI_STANDARD':
    case 'OPENAI_DEEP':
    case 'OPENAI_EXPERT': {
      const { OpenAIDeepResearchProvider } = await import('./openai-provider')
      return new OpenAIDeepResearchProvider(apiKey, provider)
    }
    case 'LANGCHAIN': {
      throw new Error('LangChain provider is not yet implemented')
    }
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// ============================================
// Re-exports
// ============================================

export { GeminiDeepResearchProvider } from './gemini-provider'
export { OpenAIDeepResearchProvider } from './openai-provider'
export { checkBudget, logUsage, getBudgetStatus } from './budget-manager'
