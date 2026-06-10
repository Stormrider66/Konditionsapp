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
import { replyInThread, addReaction, removeReaction } from './client'
import { executeOperatorTool } from '@/lib/operator-agents/tool-executor'
import * as githubCode from './github-code-tools'
import { MODEL_TIERS } from '@/types/ai-models'
import { logAiUsage } from '@/lib/ai/usage-logger'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ============================================================================
// CONVERSATION MEMORY (DB-backed, survives cold starts)
// ============================================================================

const MAX_MESSAGES = 20
const MAX_CONTEXT_AGE_MS = 60 * 60 * 1000 // 1 hour

/**
 * Load thread context from the database.
 * Returns empty array if thread is new or expired.
 */
async function getThreadContext(threadTs: string): Promise<Anthropic.MessageParam[]> {
  try {
    const ctx = await prisma.slackThreadContext.findUnique({
      where: { threadTs },
    })

    if (!ctx) return []

    // Check if context is stale
    if (Date.now() - ctx.lastActivityAt.getTime() > MAX_CONTEXT_AGE_MS) {
      // Expired — delete and return empty
      await prisma.slackThreadContext.delete({ where: { threadTs } }).catch(() => {})
      return []
    }

    return (ctx.messages as unknown as Anthropic.MessageParam[]) || []
  } catch {
    return [] // DB error — start fresh
  }
}

/**
 * Save thread context to the database.
 * Keeps last MAX_MESSAGES messages to prevent unbounded growth.
 */
async function saveThreadContext(
  threadTs: string,
  channelId: string,
  messages: Anthropic.MessageParam[]
): Promise<void> {
  const trimmed = messages.slice(-MAX_MESSAGES)

  try {
    await prisma.slackThreadContext.upsert({
      where: { threadTs },
      update: {
        messages: trimmed as unknown as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
        messageCount: trimmed.length,
      },
      create: {
        threadTs,
        channelId,
        messages: trimmed as unknown as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
        messageCount: trimmed.length,
      },
    })
  } catch (error) {
    logger.warn('[slack] Failed to save thread context', { threadTs, error: String(error) })
  }
}

/**
 * Cleanup expired thread contexts. Called periodically (e.g., from a cron).
 */
export async function cleanupExpiredThreadContexts(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - MAX_CONTEXT_AGE_MS)
    const result = await prisma.slackThreadContext.deleteMany({
      where: { lastActivityAt: { lt: cutoff } },
    })
    return result.count
  } catch {
    return 0
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
  // --- Platform Health & Monitoring ---
  { name: 'getSentryErrors', description: 'Get recent Sentry errors.', input_schema: { type: 'object' as const, properties: { minutes: { type: 'number' } } } },
  { name: 'getCronJobFailures', description: 'Get failed cron jobs.', input_schema: { type: 'object' as const, properties: { hours: { type: 'number' } } } },
  { name: 'getAgentErrorRate', description: 'Get operator agent error rate (last 24h).', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getKeyMetrics', description: 'Get platform metrics: active users, check-ins, workouts.', input_schema: { type: 'object' as const, properties: {} } },

  // --- Cost & Revenue ---
  { name: 'getAIUsage24h', description: 'Get AI API spend in the last 24 hours.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getAIUsageMonthToDate', description: 'Get current month running AI cost total.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'predictMonthEnd', description: 'Project month-end AI cost with last-month comparison.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getTopSpendingUsers', description: 'Top AI spenders with tier and subscription status.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' }, limit: { type: 'number' } } } },
  { name: 'getCostBreakdownByEntity', description: 'Split AI cost by role (athlete/coach/admin).', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'getCostBreakdownByBusiness', description: 'AI cost per business.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'detectCostAnomalies', description: 'Users whose spend jumped >3x baseline.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getUsersNearLimits', description: 'Users at/near AI chat message limits (EXCEEDED/CRITICAL/WARNING).', input_schema: { type: 'object' as const, properties: { thresholdPercent: { type: 'number' } } } },
  { name: 'getRevenueVsCost', description: 'Gross margin per user/tier — PROFITABLE, THIN_MARGIN, LOSS, FREE_LOSS.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'getMarginAtRiskUsers', description: 'Users in LOSS or FREE_LOSS status.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'getMRRSnapshot', description: 'Get MRR and subscriber counts by tier.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getChurnRate', description: 'Get churn rate.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'getNewSubscribersLast7d', description: 'New paying subscribers in the last 7 days.', input_schema: { type: 'object' as const, properties: {} } },

  // --- Support & Feature Requests ---
  { name: 'getOpenSupportTickets', description: 'Get unprocessed support tickets.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getActiveSubscriptions', description: 'Get all paying subscribers.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getOpenFeatureRequests', description: 'Get uncurated feature requests.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getAllFeatureRequests', description: 'Get all open/planned feature requests.', input_schema: { type: 'object' as const, properties: {} } },

  // --- Nutrition ---
  { name: 'getNutritionUsageStats', description: 'Nutrition feature usage: meal logs, goals, active users, top users.', input_schema: { type: 'object' as const, properties: {} } },

  // --- Onboarding & Engagement ---
  { name: 'getNewUsersLast7d', description: 'Users who signed up in the last 7 days.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'findStuckUsers', description: 'Users stuck >2 days on same onboarding step.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getRevenueYesterday', description: 'Yesterday\'s new subs, MRR changes.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getSignupsYesterday', description: 'Yesterday\'s signups by role.', input_schema: { type: 'object' as const, properties: {} } },

  // --- Data Quality & Compliance ---
  { name: 'calculateDataHealthScore', description: 'Overall data quality score (0-100, grade A-F).', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'findOrphanedRecords', description: 'Find records with dangling FK references.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'findDuplicateUsers', description: 'Find users with duplicate emails.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'getConsentWithdrawals', description: 'Users who withdrew consent recently.', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },
  { name: 'getFailedLogins', description: 'Failed login attempts (brute force detection).', input_schema: { type: 'object' as const, properties: { hours: { type: 'number' } } } },
  { name: 'getAuditLogAnomalies', description: 'Unusual admin actions in audit log.', input_schema: { type: 'object' as const, properties: { hours: { type: 'number' } } } },

  // --- Competitor & Marketing ---
  { name: 'getKnownCompetitors', description: 'List of tracked competitors.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'webSearch', description: 'Search the web (via Tavily) for competitor news.', input_schema: { type: 'object' as const, properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'getPlatformMetrics', description: 'Platform-wide metrics for content.', input_schema: { type: 'object' as const, properties: {} } },
  { name: 'findMilestoneEvents', description: 'Platform-wide milestones (1000 users, etc.).', input_schema: { type: 'object' as const, properties: { days: { type: 'number' } } } },

  // --- Actions (approval-gated) ---
  { name: 'alertFounder', description: 'Send an email alert to the founder.', input_schema: { type: 'object' as const, properties: { severity: { type: 'string' }, title: { type: 'string' }, message: { type: 'string' } }, required: ['severity', 'title', 'message'] } },
  { name: 'createGitHubIssue', description: 'Create a GitHub issue from a bug report.', input_schema: { type: 'object' as const, properties: { title: { type: 'string' }, body: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } } }, required: ['title', 'body'] } },

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
// TOOL PRUNING — select relevant tools based on message intent
// ============================================================================

/**
 * Tool categories with keyword triggers.
 * When a message matches keywords in a category, those tools are included.
 * A "core" set is always included regardless of message content.
 */
const TOOL_CATEGORIES: Record<string, { keywords: string[]; toolNames: string[] }> = {
  core: {
    keywords: [], // Always included
    toolNames: ['getKeyMetrics', 'alertFounder'],
  },
  health: {
    keywords: ['error', 'sentry', 'cron', 'down', 'broken', 'crash', 'bug', 'health', 'status', 'failing', 'issue', 'fix', 'wrong'],
    toolNames: ['getSentryErrors', 'getCronJobFailures', 'getAgentErrorRate', 'getOpenSupportTickets', 'createGitHubIssue'],
  },
  cost: {
    keywords: ['cost', 'spend', 'budget', 'expensive', 'price', 'margin', 'revenue', 'money', 'dollar', 'billing', 'mrr', 'churn', 'subscription'],
    toolNames: ['getAIUsage24h', 'getAIUsageMonthToDate', 'predictMonthEnd', 'getTopSpendingUsers', 'getCostBreakdownByEntity', 'getCostBreakdownByBusiness', 'detectCostAnomalies', 'getUsersNearLimits', 'getRevenueVsCost', 'getMarginAtRiskUsers', 'getMRRSnapshot', 'getChurnRate', 'getNewSubscribersLast7d', 'getActiveSubscriptions'],
  },
  users: {
    keywords: ['user', 'signup', 'onboard', 'stuck', 'activation', 'new user', 'growth', 'funnel', 'register', 'athlete', 'coach'],
    toolNames: ['getNewUsersLast7d', 'findStuckUsers', 'getRevenueYesterday', 'getSignupsYesterday', 'getActiveSubscriptions'],
  },
  features: {
    keywords: ['feature', 'request', 'roadmap', 'vote', 'idea', 'feedback', 'want', 'suggest'],
    toolNames: ['getOpenFeatureRequests', 'getAllFeatureRequests'],
  },
  data: {
    keywords: ['data', 'quality', 'orphan', 'duplicate', 'integrity', 'stale', 'health score'],
    toolNames: ['calculateDataHealthScore', 'findOrphanedRecords', 'findDuplicateUsers'],
  },
  security: {
    keywords: ['security', 'login', 'consent', 'gdpr', 'compliance', 'audit', 'suspicious', 'brute', 'hack'],
    toolNames: ['getConsentWithdrawals', 'getFailedLogins', 'getAuditLogAnomalies'],
  },
  competitor: {
    keywords: ['competitor', 'market', 'industry', 'trainingpeaks', 'strava', 'search', 'news'],
    toolNames: ['getKnownCompetitors', 'webSearch', 'getPlatformMetrics', 'findMilestoneEvents'],
  },
  code: {
    keywords: ['code', 'file', 'function', 'fix', 'bug', 'pr', 'pull request', 'merge', 'branch', 'deploy', 'commit', 'github', 'read', 'search code', 'implement'],
    toolNames: ['readFile', 'searchCode', 'createBranchAndPushFix', 'mergePR', 'listOpenPRs'],
  },
  nutrition: {
    keywords: ['nutrition', 'meal', 'food', 'diet', 'calorie', 'macro', 'protein', 'carb', 'fat', 'eating', 'weight'],
    toolNames: ['getNutritionUsageStats'],
  },
}

/**
 * Select tools relevant to the user's message.
 * Always includes core tools + any categories whose keywords match.
 * Falls back to ALL tools if no specific intent is detected.
 */
function pruneToolsByIntent(message: string): Anthropic.Tool[] {
  const lower = message.toLowerCase()
  const matchedToolNames = new Set<string>()

  // Always include core tools
  for (const name of TOOL_CATEGORIES.core.toolNames) {
    matchedToolNames.add(name)
  }

  // Match keyword categories
  let anyMatch = false
  for (const [category, config] of Object.entries(TOOL_CATEGORIES)) {
    if (category === 'core') continue
    if (config.keywords.some(kw => lower.includes(kw))) {
      anyMatch = true
      for (const name of config.toolNames) {
        matchedToolNames.add(name)
      }
    }
  }

  // If no keywords matched, include everything (broad query)
  if (!anyMatch) {
    return SLACK_TOOLS
  }

  // Filter SLACK_TOOLS to only matched names
  const pruned = SLACK_TOOLS.filter(t => matchedToolNames.has(t.name))

  // Ensure we have at least 5 tools (fallback to all if too few)
  if (pruned.length < 5) {
    return SLACK_TOOLS
  }

  return pruned
}

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

  // Show thinking indicator immediately so user knows bot is working
  const messageTs = threadTs
  await addReaction(channel, messageTs, 'eyes')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    await removeReaction(channel, messageTs, 'eyes')
    await replyInThread(channel, threadTs, 'ANTHROPIC_API_KEY not configured.')
    return
  }

  const client = new Anthropic({ apiKey })
  const model = MODEL_TIERS['balanced'].anthropic.modelId

  // Build message history from thread context (DB-backed)
  const previousMessages = await getThreadContext(threadTs)
  const messages: Anthropic.MessageParam[] = [
    ...previousMessages,
    { role: 'user', content: userMessage },
  ]

  try {
    // Run the agentic tool-calling loop
    // Prune tools based on message intent to save ~60% input tokens.
    // Falls back to full tool set if no specific intent is detected.
    const tools = pruneToolsByIntent(userMessage)
    logger.info('[slack] Tool pruning', {
      message: userMessage.slice(0, 100),
      allTools: SLACK_TOOLS.length,
      selectedTools: tools.length,
    })

    let iterations = 0
    const maxIterations = 15

    while (iterations < maxIterations) {
      iterations++

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: SLACK_SYSTEM_PROMPT,
        tools,
        messages,
      })

      // Staff bot on the platform key — log spend for cost visibility
      // (intentionally unattributed; there is no platform user to bill).
      logAiUsage({
        category: 'slack_assistant',
        provider: 'ANTHROPIC',
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
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
        await saveThreadContext(threadTs, channel, messages)
        // Done — swap eyes for checkmark
        await removeReaction(channel, messageTs, 'eyes')
        await addReaction(channel, messageTs, 'white_check_mark')
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

    await removeReaction(channel, messageTs, 'eyes')
    await addReaction(channel, messageTs, 'warning')
    await replyInThread(channel, threadTs, 'Reached max iterations. Please try again with a simpler request.')
  } catch (error) {
    logger.error('[slack] Conversation handler failed', {}, error)
    await removeReaction(channel, messageTs, 'eyes')
    await addReaction(channel, messageTs, 'x')
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
