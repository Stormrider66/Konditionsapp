/**
 * Competitor Intelligence Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { COMPETITOR_INTEL_SYSTEM_PROMPT } from '../prompts/competitor-intel'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getKnownCompetitors',
    description: 'Get the list of tracked competitors in the Elite Training Platform space.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'webSearch',
    description: 'Search the web for competitor news, features, pricing, or industry trends.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetchUrl',
    description: 'Fetch the content of a specific URL (competitor site, blog post, press release).',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
  },
  {
    name: 'saveCompetitorDigest',
    description: 'Save the completed competitor digest and email it to the founder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Full markdown digest content' },
      },
      required: ['content'],
    },
  },
  {
    name: 'alertFounder',
    description: 'Send alert email for urgent competitive moves (feature parity launches, major funding, price cuts >30%).',
    input_schema: {
      type: 'object' as const,
      properties: {
        severity: { type: 'string', enum: ['CRITICAL', 'HIGH'] },
        title: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['severity', 'title', 'message'],
    },
  },
]

registerOperatorAgent({
  agentType: 'COMPETITOR_INTEL',
  systemPrompt: COMPETITOR_INTEL_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Generate this week's competitor intelligence digest. Research pricing changes, new features, funding news, and user sentiment for the tracked competitors. Identify strategic implications for the Elite Training Platform and save the digest.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 20)

    const searches = result.toolsUsed.filter(t => t === 'webSearch').length
    const alerts = result.toolsUsed.filter(t => t === 'alertFounder').length
    const saved = result.toolsUsed.filter(t => t === 'saveCompetitorDigest').length

    return {
      agentType: 'COMPETITOR_INTEL',
      status: 'COMPLETED',
      itemsProcessed: searches,
      actionsTaken: saved,
      escalations: alerts,
      summary: result.finalResponse.slice(0, 500),
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
