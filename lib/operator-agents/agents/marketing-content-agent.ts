/**
 * Marketing Content Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { MARKETING_CONTENT_SYSTEM_PROMPT } from '../prompts/marketing-content'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'findMilestoneEvents',
    description: 'Find platform-wide milestones (e.g., "1000 users", "10000 workouts") and nearest next milestones.',
    input_schema: {
      type: 'object' as const,
      properties: { days: { type: 'number' } },
    },
  },
  {
    name: 'getPlatformMetrics',
    description: 'Get overall platform metrics: users, clients, workouts this week, coaches.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'draftSocialPost',
    description: 'Draft a social media post for LinkedIn/X/Instagram.',
    input_schema: {
      type: 'object' as const,
      properties: {
        platform: { type: 'string', enum: ['LINKEDIN', 'X', 'INSTAGRAM'] },
        topic: { type: 'string' },
        body: { type: 'string' },
        imagePrompt: { type: 'string', description: 'Optional image generation prompt' },
      },
      required: ['platform', 'topic', 'body'],
    },
  },
  {
    name: 'draftBlogPost',
    description: 'Draft a blog post (800-1500 words).',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        outline: { type: 'string' },
        body: { type: 'string', description: 'Full markdown body' },
      },
      required: ['title', 'outline', 'body'],
    },
  },
  {
    name: 'draftNewsletter',
    description: 'Draft the weekly newsletter for existing users.',
    input_schema: {
      type: 'object' as const,
      properties: {
        week: { type: 'string' },
        highlights: { type: 'array', items: { type: 'string' } },
        body: { type: 'string' },
      },
      required: ['week', 'highlights', 'body'],
    },
  },
  {
    name: 'saveContentQueue',
    description: 'Save all drafted content to the queue for founder review.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
]

registerOperatorAgent({
  agentType: 'MARKETING_CONTENT',
  systemPrompt: MARKETING_CONTENT_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Generate this week's marketing content based on real platform data. Draft: 1 LinkedIn post, 2 X posts, 1 Instagram post (if applicable), 1 newsletter, and 1 blog post outline. Use milestones and real metrics.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 15)

    const drafts = result.toolsUsed.filter(t =>
      t === 'draftSocialPost' || t === 'draftBlogPost' || t === 'draftNewsletter'
    ).length

    return {
      agentType: 'MARKETING_CONTENT',
      status: 'COMPLETED',
      itemsProcessed: drafts,
      actionsTaken: drafts,
      escalations: 0,
      summary: `Drafted ${drafts} content pieces for founder review.`,
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
