/**
 * Founder's Daily Brief Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { FOUNDERS_BRIEF_SYSTEM_PROMPT } from '../prompts/founders-brief'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getRevenueYesterday',
    description: 'Get yesterday\'s new subscribers, MRR changes, and active subscriber totals.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getSignupsYesterday',
    description: 'Get yesterday\'s new user signups grouped by role.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getUrgentSupportTickets',
    description: 'Get open support tickets with URGENT or HIGH priority.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getCriticalErrors',
    description: 'Get critical errors and platform health alerts from the last N hours.',
    input_schema: {
      type: 'object' as const,
      properties: { hours: { type: 'number' } },
    },
  },
  {
    name: 'getAtRiskUsers',
    description: 'Get top at-risk users from the latest Churn Predictor run.',
    input_schema: {
      type: 'object' as const,
      properties: { limit: { type: 'number' } },
    },
  },
  {
    name: 'getTopFeatureRequest',
    description: 'Get the highest-scored feature request (only if score >= 60).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getCostToday',
    description: 'Get AI API spend so far today.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getKeyMetrics',
    description: 'Get active users, check-ins, workouts for the last 7 days.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'saveBriefAndEmail',
    description: 'Save the completed brief to the database and email it to the founder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: { type: 'string', description: 'Full markdown brief content' },
      },
      required: ['content'],
    },
  },
]

registerOperatorAgent({
  agentType: 'FOUNDERS_BRIEF',
  systemPrompt: FOUNDERS_BRIEF_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Generate today's daily brief for the founder. Gather all data (revenue, signups, tickets, errors, at-risk users, feature requests, costs, metrics), synthesize into the standard format, and save + email it.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 15)

    const saved = result.toolsUsed.filter(t => t === 'saveBriefAndEmail').length

    return {
      agentType: 'FOUNDERS_BRIEF',
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
