/**
 * Cost Guardian Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { COST_GUARDIAN_SYSTEM_PROMPT } from '../prompts/cost-guardian'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  // --- Total usage ---
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
    name: 'predictMonthEnd',
    description: 'Linear projection of month-end cost based on current daily average. Includes last-month comparison.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'detectCostAnomalies',
    description: 'Find users whose 24h spend jumped >3x their 7-day baseline.',
    input_schema: { type: 'object' as const, properties: {} },
  },

  // --- Cost breakdown ---
  {
    name: 'getCostBreakdownByEntity',
    description: 'Split AI cost by role (ATHLETE / COACH / PHYSIO / ADMIN / UNKNOWN) over a period. Shows which entity type drives the spend and what portion is platform overhead (admin usage).',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Lookback period in days (default 30)' },
      },
    },
  },
  {
    name: 'getTopSpendingUsers',
    description: 'Get top N users by AI API cost, enriched with their role, subscription tier, and subscription status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Lookback period in days (default 30)' },
        limit: { type: 'number', description: 'Number of users to return (default 10)' },
      },
    },
  },
  {
    name: 'getCostBreakdownByBusiness',
    description: 'Aggregate AI cost by business (via Client.businessId). Returns per-business total cost, user count, and cost per user. Helps identify businesses with inefficient AI usage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Lookback period in days (default 30)' },
      },
    },
  },

  // --- Limit tracking ---
  {
    name: 'getUsersNearLimits',
    description: 'Find users at or approaching their AI chat message limit. Returns status bands: EXCEEDED (>=100%), CRITICAL (>=95%), WARNING (>=80%).',
    input_schema: {
      type: 'object' as const,
      properties: {
        thresholdPercent: { type: 'number', description: 'Minimum percent used to include (default 80)' },
      },
    },
  },

  // --- Revenue optimization ---
  {
    name: 'getRevenueVsCost',
    description: 'Calculate gross margin (revenue - cost) per user and by tier. Returns platform margin %, per-tier breakdown, and worst offenders. Status codes: PROFITABLE, THIN_MARGIN (<30%), LOSS (negative), FREE_LOSS (free user burning AI).',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Lookback period in days (default 30)' },
      },
    },
  },
  {
    name: 'getMarginAtRiskUsers',
    description: 'Shortcut to get just the users in LOSS or FREE_LOSS status. For faster "who is bleeding money" checks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Lookback period in days (default 30)' },
      },
    },
  },

  // --- Alerts ---
  {
    name: 'alertFounder',
    description: 'Send a cost alert email. Use ONLY for CRITICAL issues (projected month-end > $500, single user >$50/day, margin <50%, or 5+ users hitting limits).',
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
    const prompt = `Run the hourly cost + revenue check.

1. Check total usage and projection (getAIUsage24h, getAIUsageMonthToDate, predictMonthEnd)
2. Break down WHERE the cost is going (getCostBreakdownByEntity, getCostBreakdownByBusiness, getTopSpendingUsers)
3. Check who's hitting limits (getUsersNearLimits)
4. Check revenue vs cost margin (getRevenueVsCost, getMarginAtRiskUsers)
5. Alert on CRITICAL thresholds. Include a revenue optimization recommendation if patterns are found.

Return a structured summary with: headline numbers, distribution, top spenders, limit status, margin alert, and ONE recommendation.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 12)

    const alerts = result.toolsUsed.filter(t => t === 'alertFounder').length

    return {
      agentType: 'COST_GUARDIAN',
      status: 'COMPLETED',
      itemsProcessed: 1,
      actionsTaken: alerts,
      escalations: alerts,
      summary: result.finalResponse.slice(0, 800),
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
