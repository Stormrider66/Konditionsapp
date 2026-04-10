/**
 * Onboarding Activation Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { ONBOARDING_ACTIVATION_SYSTEM_PROMPT } from '../prompts/onboarding-activation'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getNewUsersLast7d',
    description: 'Get users who signed up in the last 7 days.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getUserActivationProgress',
    description: 'Get onboarding progress for a specific user (profile, check-in, workout milestones).',
    input_schema: {
      type: 'object' as const,
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  },
  {
    name: 'findStuckUsers',
    description: 'Find users stuck >2 days on the same onboarding step.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'draftOnboardingNudge',
    description: 'Save a draft nudge email for the founder to review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string' },
        step: { type: 'string', description: 'The step they are stuck on' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['userId', 'step', 'subject', 'body'],
    },
  },
]

registerOperatorAgent({
  agentType: 'ONBOARDING_ACTIVATION',
  systemPrompt: ONBOARDING_ACTIVATION_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Analyze new users for activation progress. Find stuck users and draft onboarding nudge emails for the founder to review.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 15)

    const drafts = result.toolsUsed.filter(t => t === 'draftOnboardingNudge').length

    return {
      agentType: 'ONBOARDING_ACTIVATION',
      status: 'COMPLETED',
      itemsProcessed: drafts,
      actionsTaken: drafts,
      escalations: 0,
      summary: `Drafted ${drafts} onboarding nudges.`,
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
