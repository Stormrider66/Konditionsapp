/**
 * Churn Predictor Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { CHURN_PREDICTOR_SYSTEM_PROMPT } from '../prompts/churn-predictor'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getActiveSubscriptions',
    description: 'Get all paying subscribers (non-FREE, non-CANCELED). Returns up to 200.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getUserEngagement',
    description: "Get a user's engagement metrics (check-ins, workouts) over a period.",
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string' },
        days: { type: 'number', description: 'Lookback period (default 30)' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'getSupportHistory',
    description: "Get a user's recent support tickets (for complaint/cancellation signals).",
    input_schema: {
      type: 'object' as const,
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  },
  {
    name: 'getUsageTrend',
    description: "Compare a user's engagement last 7 days vs previous 7 days. Returns GROWING/STABLE/DECLINING.",
    input_schema: {
      type: 'object' as const,
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  },
  {
    name: 'calculateChurnScore',
    description: 'Calculate a composite churn risk score (0-100) based on all signals. Returns score + band + signals list.',
    input_schema: {
      type: 'object' as const,
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  },
  {
    name: 'draftRetentionEmail',
    description: 'Save a draft retention email for founder review (never sends directly).',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string', description: 'Email body, <120 words, personal tone' },
        reasoning: { type: 'string', description: 'Why this user is at risk' },
      },
      required: ['userId', 'subject', 'body', 'reasoning'],
    },
  },
  {
    name: 'flagForFounderReview',
    description: 'Flag a high-risk, high-value user for immediate founder attention. Sends an alert email.',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['userId', 'reason'],
    },
  },
]

registerOperatorAgent({
  agentType: 'CHURN_PREDICTOR',
  systemPrompt: CHURN_PREDICTOR_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Analyze all active subscribers for churn risk. For each with score >= 60: draft a retention email. For each with score >= 80 OR Enterprise tier: flag for founder review. Return a summary.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 40)

    const scored = result.toolsUsed.filter(t => t === 'calculateChurnScore').length
    const drafts = result.toolsUsed.filter(t => t === 'draftRetentionEmail').length
    const flagged = result.toolsUsed.filter(t => t === 'flagForFounderReview').length

    return {
      agentType: 'CHURN_PREDICTOR',
      status: 'COMPLETED',
      itemsProcessed: scored,
      actionsTaken: drafts,
      escalations: flagged,
      summary: `Analyzed ${scored} subscribers: ${drafts} drafts created, ${flagged} escalated.`,
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
