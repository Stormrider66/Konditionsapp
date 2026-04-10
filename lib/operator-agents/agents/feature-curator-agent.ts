/**
 * Feature Curator Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { FEATURE_CURATOR_SYSTEM_PROMPT } from '../prompts/feature-curator'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getOpenFeatureRequests',
    description: 'Get feature requests that have not been curated yet (agentImpactScore is null).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getAllFeatureRequests',
    description: 'Get all open and planned feature requests for duplicate detection.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'categorizeFeatureRequest',
    description: 'Set the category on a feature request.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        category: {
          type: 'string',
          enum: ['training', 'ai', 'billing', 'mobile', 'physio', 'nutrition', 'ui', 'integrations', 'analytics', 'other'],
        },
      },
      required: ['id', 'category'],
    },
  },
  {
    name: 'scoreFeatureRequest',
    description: 'Set the impact score (0-100) and include your reasoning.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        score: { type: 'number', description: '0-100' },
        reasoning: { type: 'string', description: 'Brief explanation of the score' },
      },
      required: ['id', 'score', 'reasoning'],
    },
  },
  {
    name: 'markDuplicate',
    description: 'Mark a feature request as a duplicate of another (links to the master request).',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The duplicate request ID' },
        duplicateOfId: { type: 'string', description: 'The master request ID' },
      },
      required: ['id', 'duplicateOfId'],
    },
  },
  {
    name: 'summarizeFeatureRequest',
    description: 'Write a crisp one-line summary of the feature request.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['id', 'summary'],
    },
  },
  {
    name: 'getUserTier',
    description: "Get the submitter's subscription tier (affects vote weight).",
    input_schema: {
      type: 'object' as const,
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  },
]

registerOperatorAgent({
  agentType: 'FEATURE_CURATOR',
  systemPrompt: FEATURE_CURATOR_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Process all uncurated feature requests. For each: check for duplicates, categorize, score for impact, and add a summary. Return a weekly roadmap summary with top scores.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 25)

    const categorized = result.toolsUsed.filter(t => t === 'categorizeFeatureRequest').length
    const scored = result.toolsUsed.filter(t => t === 'scoreFeatureRequest').length
    const dupes = result.toolsUsed.filter(t => t === 'markDuplicate').length

    return {
      agentType: 'FEATURE_CURATOR',
      status: 'COMPLETED',
      itemsProcessed: scored + dupes,
      actionsTaken: categorized + scored + dupes,
      escalations: 0,
      summary: `Processed ${scored + dupes} requests: ${scored} scored, ${dupes} duplicates merged.`,
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
