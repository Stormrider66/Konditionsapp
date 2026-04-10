/**
 * Support Agent — implementation
 */

import type Anthropic from '@anthropic-ai/sdk'
import { SUPPORT_AGENT_SYSTEM_PROMPT } from '../prompts/support-agent'
import { registerOperatorAgent, runAgentLoop } from '../agent-runner'
import { executeOperatorTool } from '../tool-executor'
import type { OperatorAgentRunResult } from '../types'

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'getOpenSupportTickets',
    description: 'Get all unprocessed support tickets (status=OPEN, agentClassified=false).',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'getTicket',
    description: 'Get full details of a specific support ticket.',
    input_schema: {
      type: 'object' as const,
      properties: { ticketId: { type: 'string' } },
      required: ['ticketId'],
    },
  },
  {
    name: 'searchSimilarTickets',
    description: 'Find similar resolved tickets to learn from past resolutions.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Keywords from the ticket' } },
      required: ['query'],
    },
  },
  {
    name: 'classifyTicket',
    description: 'Set ticket category and priority after analysis.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticketId: { type: 'string' },
        category: { type: 'string', enum: ['bug', 'question', 'feature_request', 'complaint', 'other'] },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
      },
      required: ['ticketId', 'category', 'priority'],
    },
  },
  {
    name: 'draftTicketResponse',
    description: 'Save a draft response for the founder to review and send.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticketId: { type: 'string' },
        body: { type: 'string', description: 'The drafted response text' },
      },
      required: ['ticketId', 'body'],
    },
  },
  {
    name: 'markAsFeatureRequest',
    description: 'Reclassify a ticket as a feature request (creates a FeatureRequest record).',
    input_schema: {
      type: 'object' as const,
      properties: { ticketId: { type: 'string' } },
      required: ['ticketId'],
    },
  },
  {
    name: 'escalateToFounder',
    description: 'Flag a ticket as URGENT and send an immediate alert to the founder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticketId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['ticketId', 'reason'],
    },
  },
  {
    name: 'getUserContext',
    description: 'Get user details (subscription tier, email, etc.) to inform response.',
    input_schema: {
      type: 'object' as const,
      properties: { userId: { type: 'string' } },
      required: ['userId'],
    },
  },
  {
    name: 'createGitHubIssue',
    description: 'Create a GitHub issue for a confirmed bug. Returns the issue URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'linkGitHubIssue',
    description: 'Link a created GitHub issue URL to the support ticket.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticketId: { type: 'string' },
        url: { type: 'string' },
      },
      required: ['ticketId', 'url'],
    },
  },
]

registerOperatorAgent({
  agentType: 'SUPPORT',
  systemPrompt: SUPPORT_AGENT_SYSTEM_PROMPT,
  tools: TOOLS,
  async run(ctx): Promise<OperatorAgentRunResult> {
    const prompt = `Process all open support tickets. For each: classify, search similar tickets, draft a response, create GitHub issues for bugs, and escalate urgent cases.`

    const result = await runAgentLoop(ctx, this, prompt, executeOperatorTool, 20)

    const classifications = result.toolsUsed.filter(t => t === 'classifyTicket').length
    const drafts = result.toolsUsed.filter(t => t === 'draftTicketResponse').length
    const issues = result.toolsUsed.filter(t => t === 'createGitHubIssue').length
    const escalations = result.toolsUsed.filter(t => t === 'escalateToFounder').length

    return {
      agentType: 'SUPPORT',
      status: 'COMPLETED',
      itemsProcessed: classifications,
      actionsTaken: drafts + issues,
      escalations,
      summary: `Processed ${classifications} tickets: ${drafts} drafted, ${issues} GitHub issues, ${escalations} escalated.`,
      details: { toolsUsed: result.toolsUsed, fullResponse: result.finalResponse },
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      modelUsed: ctx.model,
    }
  },
})
