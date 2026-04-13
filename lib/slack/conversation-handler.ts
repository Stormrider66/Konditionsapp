/**
 * Slack Conversation Handler
 *
 * Receives messages from Slack, passes them to Claude with all operator
 * + GitHub tools, and posts the response back. Maintains thread context
 * so multi-turn conversations work naturally.
 *
 * This is the "Claude as router" — you talk naturally and Claude
 * picks the right tools.
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'
import { replyInThread } from './client'
import { executeOperatorTool } from '@/lib/operator-agents/tool-executor'
import * as githubCode from './github-code-tools'
import { MODEL_TIERS } from '@/types/ai-models'

// ============================================================================
// CONVERSATION MEMORY (per Slack thread)
// ============================================================================

interface ThreadContext {
  messages: Anthropic.MessageParam[]
  lastActivity: number
}

// In-memory thread context (per-server-instance)
// For persistent memory across deploys, use a DB — but for Vercel
// serverless this is fine (each function invocation is stateless anyway,
// and Slack threads provide natural context boundaries)
const threadContexts = new Map<string, ThreadContext>()
const MAX_CONTEXT_AGE_MS = 30 * 60 * 1000 // 30 minutes
const MAX_THREADS = 100

function getThreadContext(threadTs: string): Anthropic.MessageParam[] {
  const ctx = threadContexts.get(threadTs)
  if (ctx && Date.now() - ctx.lastActivity < MAX_CONTEXT_AGE_MS) {
    return ctx.messages
  }
  return []
}

function saveThreadContext(threadTs: string, messages: Anthropic.MessageParam[]): void {
  threadContexts.set(threadTs, {
    messages: messages.slice(-20), // Keep last 20 messages max
    lastActivity: Date.now(),
  })

  // Cleanup old threads
  if (threadContexts.size > MAX_THREADS) {
    const cutoff = Date.now() - MAX_CONTEXT_AGE_MS
    for (const [key, ctx] of threadContexts) {
      if (ctx.lastActivity < cutoff) threadContexts.delete(key)
    }
  }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SLACK_SYSTEM_PROMPT = `You are the Elite Training Platform's AI operations assistant, running in Slack. The founder talks to you to monitor, manage, and fix the platform.

## Your Capabilities

### 1. Platform Operations (via operator tools)
You have access to all operator agent tools — support tickets, churn prediction, cost monitoring, feature requests, BI metrics, data quality, compliance, etc. When the founder asks about the platform, USE these tools to get real data before responding.

### 2. Code Operations (via GitHub tools)
You can read, search, modify, and deploy code:
- Read any file in the repo
- Search the codebase for patterns
- Create branches, push fixes, open PRs
- Merge PRs (only when founder approves)

### 3. Communication
You can draft and send emails (only with founder approval), create GitHub issues from bugs, and generate reports.

## Response Style
- **Be concise** — Slack is a chat, not an email. Short paragraphs, bullets, code snippets.
- **Lead with the answer** — don't explain what you're about to do, just do it.
- **Use Slack markdown** — *bold*, \`code\`, > blockquotes, bullet lists.
- **Show your work** — when you call tools, briefly mention what you found.
- **Ask before destructive actions** — always confirm before merge, deploy, email, or data changes.

## Safety Rules
- NEVER merge a PR without explicit "merge it" / "approve" / "go ahead" from the founder
- NEVER send emails without explicit approval
- NEVER delete data without explicit approval
- NEVER push to main directly — always use a branch + PR
- If unsure about intent, ask for clarification

## What You Can Do Proactively
When an operator agent posts an alert in the channel, you may jump in with context if the founder asks about it. The alerts come from scheduled cron jobs — you're the conversational interface to them.
`

// ============================================================================
// TOOL DEFINITIONS FOR SLACK CLAUDE
// ============================================================================

const SLACK_TOOLS: Anthropic.Tool[] = [
  // --- Operator tools (DB queries) ---
  { name: 'getOpenSupportTickets', description: 'Get unprocessed support tickets.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getAIUsage24h', description: 'Get AI API spend in the last 24 hours.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getAIUsageMonthToDate', description: 'Get current month running AI cost total.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'predictMonthEnd', description: 'Project month-end AI cost.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getActiveSubscriptions', description: 'Get all paying subscribers.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getOpenFeatureRequests', description: 'Get uncurated feature requests.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getAllFeatureRequests', description: 'Get all open/planned feature requests.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getKeyMetrics', description: 'Get platform metrics: active users, check-ins, workouts.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getMRRSnapshot', description: 'Get MRR and subscriber counts by tier.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getChurnRate', description: 'Get churn rate.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'calculateDataHealthScore', description: 'Get overall data quality score (0-100).', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getRevenueVsCost', description: 'Get margin analysis: revenue vs AI cost per user/tier.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'getUsersNearLimits', description: 'Find users at/near AI chat message limits.', input_schema: { type: 'object' as const, properties: { thresholdPercent: { type: 'number' } } } },
  { name: 'getCostBreakdownByEntity', description: 'Split AI cost by role (athlete/coach/admin).', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'getSentryErrors', description: 'Get recent Sentry errors.', input_schema: { type: 'object' as const, properties: { minutes: { type: 'number' } } } },
  { name: 'getCronJobFailures', description: 'Get failed cron jobs.', input_schema: { type: 'object' as const, properties: { hours: { type: 'number' } } } },
  { name: 'alertFounder', description: 'Send an email alert to the founder.', input_schema: { type: 'object' as const, properties: { severity: { type: 'string' }, title: { type: 'string' }, message: { type: 'string' } }, required: ['severity', 'title', 'message'] } },

  // --- GitHub code tools ---
  {
    name: 'readFile',
    description: 'Read a file from the GitHub repo. Returns file content.',
    input_schema: {
      type: 'object' as const,
      properties: { path: { type: 'string', description: 'File path relative to repo root (e.g. "lib/stripe/checkout.ts")' } },
      required: ['path'],
    },
  },
  {
    name: 'searchCode',
    description: 'Search the codebase for a string/pattern. Returns matching files and lines.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
  },
  {
    name: 'createBranchAndPushFix',
    description: 'Create a new branch, push file changes, and open a PR. Returns the PR URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        branchName: { type: 'string', description: 'Branch name (e.g. "fix/checkout-null-check")' },
        prTitle: { type: 'string', description: 'PR title' },
        prBody: { type: 'string', description: 'PR description' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['path', 'content'],
          },
          description: 'Files to create/update with their full content',
        },
      },
      required: ['branchName', 'prTitle', 'prBody', 'files'],
    },
  },
  {
    name: 'mergePR',
    description: 'Merge a pull request. ONLY use when the founder explicitly approves.',
    input_schema: {
      type: 'object' as const,
      properties: { prNumber: { type: 'number', description: 'PR number to merge' } },
      required: ['prNumber'],
    },
  },
  {
    name: 'listOpenPRs',
    description: 'List open pull requests.',
    input_schema: { type: 'object' as const, properties: {} },
  },
]

// ============================================================================
// TOOL EXECUTOR (routes to operator tools or GitHub tools)
// ============================================================================

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  // GitHub code tools
  if (['readFile', 'searchCode', 'createBranchAndPushFix', 'mergePR', 'listOpenPRs'].includes(name)) {
    const result = await githubCode.executeGitHubTool(name, input)
    return JSON.stringify(result)
  }

  // Operator tools
  const result = await executeOperatorTool(name, input)
  return JSON.stringify(result)
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Handle an incoming Slack message and respond in-thread.
 */
export async function handleSlackMessage(options: {
  channel: string
  threadTs: string
  userMessage: string
  userId: string
}): Promise<void> {
  const { channel, threadTs, userMessage, userId } = options

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    await replyInThread(channel, threadTs, 'ANTHROPIC_API_KEY not configured.')
    return
  }

  const client = new Anthropic({ apiKey })
  const model = MODEL_TIERS['balanced'].anthropic.modelId

  // Build message history from thread context
  const previousMessages = getThreadContext(threadTs)
  const messages: Anthropic.MessageParam[] = [
    ...previousMessages,
    { role: 'user', content: userMessage },
  ]

  try {
    // Run the agentic tool-calling loop
    let iterations = 0
    const maxIterations = 15

    while (iterations < maxIterations) {
      iterations++

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: SLACK_SYSTEM_PROMPT,
        tools: SLACK_TOOLS,
        messages,
      })

      if (response.stop_reason === 'end_turn') {
        // Extract text response
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('\n')

        if (text) {
          // Split long messages (Slack has 4000 char limit per message)
          const chunks = splitMessage(text, 3900)
          for (const chunk of chunks) {
            await replyInThread(channel, threadTs, chunk)
          }
        }

        // Save context for future messages in this thread
        messages.push({ role: 'assistant', content: response.content })
        saveThreadContext(threadTs, messages)
        return
      }

      if (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        messages.push({ role: 'assistant', content: response.content })

        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const toolUse of toolUseBlocks) {
          logger.info('[slack] Tool call', { tool: toolUse.name })
          try {
            const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            })
          } catch (error) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: String(error) }),
              is_error: true,
            })
          }
        }

        messages.push({ role: 'user', content: toolResults })
      }
    }

    await replyInThread(channel, threadTs, 'Reached max iterations. Please try again with a simpler request.')
  } catch (error) {
    logger.error('[slack] Conversation handler failed', {}, error)
    await replyInThread(
      channel,
      threadTs,
      `Something went wrong: \`${error instanceof Error ? error.message : String(error)}\``
    )
  }
}

/**
 * Split a long message into chunks under the Slack character limit.
 */
function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }
    // Try to split at a newline near the limit
    let splitAt = remaining.lastIndexOf('\n', maxLength)
    if (splitAt < maxLength * 0.5) splitAt = maxLength // Force split if no good newline
    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt)
  }
  return chunks
}
