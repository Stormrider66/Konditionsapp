/**
 * Cost Guardian Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { COST_GUARDIAN_SYSTEM_PROMPT } from '../prompts/cost-guardian'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getAIUsage24h',
    description: 'Get total AI API spend and token usage in the last 24 hours, grouped by provider.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getAIUsageMonthToDate',
    description: 'Get current month running total, days elapsed, and daily average.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getTopSpenders',
    description: 'Get top users by AI API cost over a period.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Lookback period in days (default 7)' },
      },
    },
  },
  {
    name: 'predictMonthEnd',
    description: 'Linear projection of month-end cost based on current daily average. Includes last-month comparison.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'detectCostAnomalies',
    description: 'Find users whose 24h spend jumped >3x their 7-day baseline.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'alertFounder',
    description: 'Send a cost alert email. Use ONLY for CRITICAL issues (projected month-end > $500, or single user >$50/day).',
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
  agentType: 'COST_GUARDIAN',
  systemPrompt: COST_GUARDIAN_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Run the hourly cost check. Analyze current AI usage, project month-end, detect anomalies, and alert the founder only if CRITICAL thresholds are exceeded.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 8)

    const alerts = result.toolsUsed.filter(t => t === 'alertFounder').length

    return {
      agentType: 'COST_GUARDIAN',
      status: 'COMPLETED',
      itemsProcessed: 1, // one check per run
      actionsTaken: alerts,
      escalations: alerts,
      summary: result.finalResponse.slice(0, 500),
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
