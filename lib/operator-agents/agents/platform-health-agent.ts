/**
 * Platform Health Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { PLATFORM_HEALTH_SYSTEM_PROMPT } from '../prompts/platform-health'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getSentryErrors',
    description: 'Get recent errors from Sentry, grouped by issue. Returns count, severity, first/last seen.',
    input_schema: {
      type: 'object' as const,
      properties: {
        minutes: { type: 'number', description: 'Lookback window in minutes (default 15)' },
      },
    },
  },
  {
    name: 'getCronJobFailures',
    description: 'Get cron job failures in the last N hours.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hours: { type: 'number', description: 'Lookback window in hours (default 1)' },
      },
    },
  },
  {
    name: 'getAgentErrorRate',
    description: 'Get the overall operator agent error rate in the last 24 hours.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'logHealthSnapshot',
    description: 'Record a health snapshot for trend analysis.',
    input_schema: {
      type: 'object' as const,
      properties: {
        severity: { type: 'string' },
        data: { type: 'object' },
      },
      required: ['severity'],
    },
  },
  {
    name: 'alertFounder',
    description: 'Send an alert email to the founder. Use ONLY for CRITICAL issues that need immediate attention.',
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
  agentType: 'PLATFORM_HEALTH',
  systemPrompt: PLATFORM_HEALTH_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Run a platform health check. Check for errors, cron failures, and agent health in the last 15 minutes. Alert the founder only if CRITICAL issues exist.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 6)

    return {
      agentType: 'PLATFORM_HEALTH',
      status: 'COMPLETED',
      itemsProcessed: result.toolsUsed.length,
      actionsTaken: result.toolsUsed.filter(t => t === 'alertFounder').length,
      escalations: result.toolsUsed.filter(t => t === 'alertFounder').length,
      summary: result.finalResponse.slice(0, 500),
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
