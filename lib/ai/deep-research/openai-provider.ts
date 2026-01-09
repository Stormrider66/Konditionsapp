/**
 * OpenAI Deep Research Provider
 *
 * Supports multiple tiers:
 * - QUICK: GPT-5 Mini + web_search (fast, cheap)
 * - STANDARD: GPT-5.2 Thinking + web_search (balanced)
 * - DEEP: o4-mini-deep-research (thorough)
 * - EXPERT: o3-deep-research (comprehensive)
 */

import { DeepResearchProvider } from '@prisma/client'
import OpenAI from 'openai'
import {
  IDeepResearchProvider,
  ResearchConfig,
  StartResearchResult,
  PollResult,
  CostEstimate,
  ResearchSource,
  PROVIDER_COST_ESTIMATES,
  DEFAULT_RESEARCH_PROMPT,
  ATHLETE_CONTEXT_PROMPT,
  mapOpenAIStatus,
} from './index'

// Tier configuration
interface TierConfig {
  model: string
  useWebSearch: boolean
  reasoning: 'none' | 'medium' | 'high' | 'xhigh' | null
  background: boolean
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  OPENAI_QUICK: {
    model: 'gpt-5-mini',
    useWebSearch: true,
    reasoning: null,
    background: false,
  },
  OPENAI_STANDARD: {
    model: 'gpt-5.2',
    useWebSearch: true,
    reasoning: 'high',
    background: false,
  },
  OPENAI_DEEP: {
    model: 'o4-mini-deep-research',
    useWebSearch: false, // Built into the model
    reasoning: null,
    background: true,
  },
  OPENAI_EXPERT: {
    model: 'o3-deep-research',
    useWebSearch: false, // Built into the model
    reasoning: null,
    background: true,
  },
}

export class OpenAIDeepResearchProvider implements IDeepResearchProvider {
  private client: OpenAI
  private tier: DeepResearchProvider
  private config: TierConfig

  constructor(apiKey: string, tier: DeepResearchProvider) {
    this.client = new OpenAI({ apiKey })
    this.tier = tier
    this.config = TIER_CONFIGS[tier]

    if (!this.config) {
      throw new Error(`Unknown OpenAI tier: ${tier}`)
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
   * Start research using web search tiers (Quick/Standard)
   */
  private async startWithWebSearch(config: ResearchConfig): Promise<StartResearchResult> {
    const prompt = this.buildPrompt(config)

    // Build tools array
    const tools: Array<{ type: string }> = []
    if (this.config.useWebSearch) {
      tools.push({ type: 'web_search_preview' })
    }

    // Build request options
    const requestOptions: Record<string, unknown> = {
      model: this.config.model,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
      tools,
    }

    // Add reasoning for Standard tier
    if (this.config.reasoning) {
      requestOptions.reasoning = { effort: this.config.reasoning }
    }

    // Use the Responses API
    const response = await this.client.responses.create(requestOptions)

    return {
      externalJobId: response.id,
      estimatedMinutes: PROVIDER_COST_ESTIMATES[this.tier].estimatedMinutes,
    }
  }

  /**
   * Start research using dedicated research models (Deep/Expert)
   */
  private async startBackgroundResearch(config: ResearchConfig): Promise<StartResearchResult> {
    const prompt = this.buildPrompt(config)

    // Use the Responses API with background mode
    const response = await this.client.responses.create({
      model: this.config.model,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
      background: true, // Enable async execution for long-running research
    })

    // polling_url may be available on background responses (type not yet defined)
    const responseWithPolling = response as typeof response & { polling_url?: string }

    return {
      externalJobId: response.id,
      pollingUrl: responseWithPolling.polling_url,
      estimatedMinutes: PROVIDER_COST_ESTIMATES[this.tier].estimatedMinutes,
    }
  }

  /**
   * Start a new research session
   */
  async start(config: ResearchConfig): Promise<StartResearchResult> {
    if (this.config.background) {
      return this.startBackgroundResearch(config)
    }
    return this.startWithWebSearch(config)
  }

  /**
   * Poll for research status and results
   */
  async poll(externalJobId: string): Promise<PollResult> {
    // Retrieve the response
    const response = await this.client.responses.retrieve(externalJobId)

    const status = mapOpenAIStatus(response.status || 'in_progress')

    // Extract report and sources
    let report: string | undefined
    let sources: ResearchSource[] | undefined
    let tokensUsed: number | undefined

    if (status === 'COMPLETED') {
      // Get the output text
      if (response.output_text) {
        report = response.output_text
      } else if (response.output && Array.isArray(response.output)) {
        // Find the text output - use type assertion for SDK version compatibility
        const textOutput = (response.output as Array<{ type: string; content?: Array<{ text?: string }> }>).find(
          (item) => item.type === 'message' || item.type === 'text'
        )
        if (textOutput?.content?.[0]?.text) {
          report = textOutput.content[0].text
        }
      }

      // Extract citations from annotations
      if (response.output && Array.isArray(response.output)) {
        type AnnotationType = Array<{ type: string; url?: string; title?: string; start_index?: number; end_index?: number }>
        const outputItems = response.output as Array<{ content?: Array<{ annotations?: AnnotationType }> }>
        const lastOutput = outputItems[outputItems.length - 1]
        if (lastOutput?.content?.[0]?.annotations) {
          sources = this.extractSourcesFromAnnotations(lastOutput.content[0].annotations)
        }
      }

      // Get token usage
      if (response.usage) {
        tokensUsed =
          (response.usage.input_tokens || 0) +
          (response.usage.output_tokens || 0)
      }
    }

    // If no structured sources, extract from report text
    if (!sources && report) {
      sources = this.extractSourcesFromText(report)
    }

    // Handle background response properties that may not be in type definitions
    const responseWithProgress = response as typeof response & {
      progress_percent?: number
      error?: { message: string }
    }

    return {
      status,
      progressPercent: responseWithProgress.progress_percent,
      report,
      sources,
      tokensUsed,
      error: responseWithProgress.error?.message,
    }
  }

  /**
   * Extract sources from OpenAI annotations
   */
  private extractSourcesFromAnnotations(
    annotations: Array<{
      type: string
      url?: string
      title?: string
      start_index?: number
      end_index?: number
    }>
  ): ResearchSource[] {
    const sources: ResearchSource[] = []

    for (const annotation of annotations) {
      if (annotation.type === 'url_citation' && annotation.url) {
        // Avoid duplicates
        if (!sources.some((s) => s.url === annotation.url)) {
          sources.push({
            url: annotation.url,
            title: annotation.title || new URL(annotation.url).hostname,
          })
        }
      }
    }

    return sources
  }

  /**
   * Extract source URLs from report text (fallback)
   */
  private extractSourcesFromText(report: string): ResearchSource[] {
    const sources: ResearchSource[] = []

    // Look for markdown links [title](url)
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
    let match

    while ((match = linkRegex.exec(report)) !== null) {
      const title = match[1]
      const url = match[2]

      if (!sources.some((s) => s.url === url)) {
        sources.push({ url, title })
      }
    }

    return sources
  }

  /**
   * Cancel an ongoing research session
   */
  async cancel(externalJobId: string): Promise<boolean> {
    try {
      await this.client.responses.cancel(externalJobId)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get cost estimate for research
   */
  getCostEstimate(_config: ResearchConfig): CostEstimate {
    return PROVIDER_COST_ESTIMATES[this.tier]
  }
}
