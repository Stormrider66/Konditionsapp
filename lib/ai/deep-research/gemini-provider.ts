/**
 * Gemini Deep Research Provider
 *
 * Uses the Google Interactions API with the deep-research-pro-preview agent.
 * Requires @google/genai SDK v1.33.0+
 */

import {
  IDeepResearchProvider,
  ResearchConfig,
  StartResearchResult,
  PollResult,
  CostEstimate,
  PROVIDER_COST_ESTIMATES,
  DEFAULT_RESEARCH_PROMPT,
  ATHLETE_CONTEXT_PROMPT,
  mapGeminiStatus,
} from './index'

// Type definitions for Gemini SDK (will be provided by @google/genai)
interface GoogleGenAI {
  interactions: {
    create(config: {
      input: string
      agent: string
      background: boolean
    }): Promise<{ id: string }>
    get(id: string): Promise<GeminiInteractionResult>
  }
}

interface GeminiInteractionResult {
  id: string
  status: string
  outputs?: Array<{ text?: string }>
  error?: { message: string }
  metadata?: {
    progress?: number
    currentStep?: string
  }
}

export class GeminiDeepResearchProvider implements IDeepResearchProvider {
  private apiKey: string
  private model = 'deep-research-pro-preview-12-2025'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Create the Google GenAI client
   * Uses dynamic import to avoid bundling issues
   *
   * NOTE: The Interactions API is a preview feature and may not be available
   * in all SDK versions. Cast to GoogleGenAI interface for type safety.
   */
  private async getClient(): Promise<GoogleGenAI> {
    try {
      // Dynamic import of the SDK
      const genai = await import('@google/genai')
      // Cast to our interface - interactions API is a preview feature
      const client = new genai.GoogleGenAI({ apiKey: this.apiKey }) as unknown as GoogleGenAI
      if (!client.interactions) {
        throw new Error('Interactions API not available in this SDK version')
      }
      return client
    } catch (error) {
      if (error instanceof Error && error.message.includes('Interactions API')) {
        throw error
      }
      throw new Error(
        'Failed to initialize Google GenAI client. Ensure @google/genai v1.33.0+ is installed with Interactions API support.'
      )
    }
  }

  /**
   * Build the research prompt with optional context
   */
  private buildPrompt(config: ResearchConfig): string {
    let prompt = config.systemPrompt || DEFAULT_RESEARCH_PROMPT

    // Add athlete context if provided
    if (config.athleteContext && Object.keys(config.athleteContext).length > 0) {
      prompt += ATHLETE_CONTEXT_PROMPT
      prompt += JSON.stringify(config.athleteContext, null, 2)
    }

    // Add document context if provided
    if (config.context) {
      prompt += `\n\n## Available Context from Documents\n${config.context}`
    }

    // Add the research query
    prompt += `\n\n## Research Query\n${config.query}`

    return prompt
  }

  /**
   * Start a new deep research session
   */
  async start(config: ResearchConfig): Promise<StartResearchResult> {
    const client = await this.getClient()

    const prompt = this.buildPrompt(config)

    // Create interaction with background=true for async execution
    // This is REQUIRED for deep research as it can take 5-20+ minutes
    const interaction = await client.interactions.create({
      input: prompt,
      agent: this.model,
      background: true,
    })

    return {
      externalJobId: interaction.id,
      estimatedMinutes: PROVIDER_COST_ESTIMATES.GEMINI.estimatedMinutes,
    }
  }

  /**
   * Poll for research status and results
   */
  async poll(externalJobId: string): Promise<PollResult> {
    const client = await this.getClient()

    const result = await client.interactions.get(externalJobId)

    const status = mapGeminiStatus(result.status)

    // Extract the report from the last output
    let report: string | undefined
    if (result.outputs && result.outputs.length > 0) {
      const lastOutput = result.outputs[result.outputs.length - 1]
      report = lastOutput.text
    }

    // Parse sources from the report if available
    const sources = report ? this.extractSources(report) : undefined

    return {
      status,
      progressPercent: result.metadata?.progress,
      currentStep: result.metadata?.currentStep,
      report,
      sources,
      error: result.error?.message,
    }
  }

  /**
   * Extract source URLs from the research report
   */
  private extractSources(report: string): Array<{ url: string; title: string; excerpt?: string }> {
    const sources: Array<{ url: string; title: string; excerpt?: string }> = []

    // Look for markdown links [title](url)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let match

    while ((match = linkRegex.exec(report)) !== null) {
      const title = match[1]
      const url = match[2]

      // Avoid duplicates
      if (!sources.some((s) => s.url === url)) {
        sources.push({ url, title })
      }
    }

    // Also look for plain URLs
    const urlRegex = /(?<!\()https?:\/\/[^\s<>)"']+/g
    let urlMatch

    while ((urlMatch = urlRegex.exec(report)) !== null) {
      const url = urlMatch[0]
      if (!sources.some((s) => s.url === url)) {
        sources.push({ url, title: new URL(url).hostname })
      }
    }

    return sources
  }

  /**
   * Get cost estimate for research
   */
  getCostEstimate(_config: ResearchConfig): CostEstimate {
    // Gemini Deep Research has free search until Jan 5, 2026
    return PROVIDER_COST_ESTIMATES.GEMINI
  }

  /**
   * Cancel is not supported for Gemini interactions
   */
  async cancel(_externalJobId: string): Promise<boolean> {
    // Gemini Interactions API doesn't support cancellation
    return false
  }
}
