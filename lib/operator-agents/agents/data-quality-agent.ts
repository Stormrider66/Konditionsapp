/**
 * Data Quality Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { DATA_QUALITY_SYSTEM_PROMPT } from '../prompts/data-quality'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'findOrphanedRecords',
    description: 'Find records with dangling foreign keys (workouts/check-ins pointing to deleted clients).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'findDuplicateUsers',
    description: 'Find users with duplicate email addresses (auth integrity check).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'findInvalidDates',
    description: 'Find records with impossible dates (birth dates in the future, before 1900, etc.).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'findIncompleteProfiles',
    description: 'Find active users with critical fields missing (name, gender, etc.).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'findStaleData',
    description: 'Find clients that haven\'t been updated in 90+ days.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'calculateDataHealthScore',
    description: 'Calculate overall data health score (0-100, grade A-F) based on all issues found.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'alertFounder',
    description: 'Send alert email. Use ONLY for CRITICAL data issues (health score <70, or >10 orphaned records).',
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
  agentType: 'DATA_QUALITY',
  systemPrompt: DATA_QUALITY_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Run the daily data quality check. Scan for orphaned records, duplicate users, invalid dates, incomplete profiles, and stale data. Calculate the overall score and alert the founder only if CRITICAL issues exist.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 10)

    const alerts = result.toolsUsed.filter(t => t === 'alertFounder').length

    return {
      agentType: 'DATA_QUALITY',
      status: 'COMPLETED',
      itemsProcessed: 1,
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
