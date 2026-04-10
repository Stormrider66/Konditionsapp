/**
 * Business Intelligence Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { BUSINESS_INTELLIGENCE_SYSTEM_PROMPT } from '../prompts/business-intelligence'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getMRRSnapshot',
    description: 'Get current MRR snapshot with subscribers by tier.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getChurnRate',
    description: 'Get churn rate over the last N days.',
    input_schema: {
      type: 'object' as const,
      properties: { days: { type: 'number' } },
    },
  },
  {
    name: 'getNewSubscribersLast7d',
    description: 'Get new paying subscribers in the last 7 days, grouped by tier.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getKeyMetrics',
    description: 'Get active users, check-ins, workouts for context.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getRevenueYesterday',
    description: 'Get yesterday\'s revenue data for baseline.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'saveBIReport',
    description: 'Save the completed BI report and email it to the founder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Full markdown report content' },
      },
      required: ['content'],
    },
  },
]

registerOperatorAgent({
  agentType: 'BUSINESS_INTELLIGENCE',
  systemPrompt: BUSINESS_INTELLIGENCE_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Generate this week's BI report. Analyze MRR, churn, growth, and retention. Identify 2-3 actionable insights. Save and email the report.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 15)

    const saved = result.toolsUsed.filter(t => t === 'saveBIReport').length

    return {
      agentType: 'BUSINESS_INTELLIGENCE',
      status: 'COMPLETED',
      itemsProcessed: 1,
      actionsTaken: saved,
      escalations: 0,
      summary: result.finalResponse.slice(0, 500),
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
