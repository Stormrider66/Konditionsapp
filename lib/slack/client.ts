/**
 * Slack Client
 *
 * Minimal Slack API wrapper using fetch. No SDK needed.
 *
 * Env vars:
 * - SLACK_BOT_TOKEN: Bot User OAuth Token (xoxb-...)
 * - SLACK_OPS_CHANNEL: Channel ID for operator agent alerts (e.g. C07XXXXXX)
 * - SLACK_SIGNING_SECRET: For verifying incoming webhook requests
 */

import { logger } from '@/lib/logger'
import crypto from 'crypto'

const SLACK_API = 'https://slack.com/api'

function getBotToken(): string | null {
  return process.env.SLACK_BOT_TOKEN || null
}

function getOpsChannel(): string | null {
  return process.env.SLACK_OPS_CHANNEL || null
}

export function isSlackConfigured(): boolean {
  return !!(getBotToken() && getOpsChannel())
}

// ============================================================================
// MESSAGE POSTING
// ============================================================================

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  elements?: unknown[]
  accessory?: unknown
  fields?: unknown[]
  block_id?: string
  [key: string]: unknown
}

interface PostMessageOptions {
  channel?: string
  text: string
  threadTs?: string
  blocks?: SlackBlock[]
  unfurlLinks?: boolean
}

/**
 * Post a message to Slack. Returns the message timestamp (for threading).
 */
export async function postMessage(options: PostMessageOptions): Promise<{
  ok: boolean
  ts?: string
  error?: string
}> {
  const token = getBotToken()
  if (!token) {
    logger.warn('[slack] Bot token not configured — message suppressed')
    return { ok: false, error: 'SLACK_BOT_TOKEN not configured' }
  }

  const channel = options.channel || getOpsChannel()
  if (!channel) {
    logger.warn('[slack] No channel specified and SLACK_OPS_CHANNEL not set')
    return { ok: false, error: 'No channel configured' }
  }

  try {
    const response = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text: options.text,
        thread_ts: options.threadTs,
        blocks: options.blocks,
        unfurl_links: options.unfurlLinks ?? false,
      }),
    })

    const data = await response.json() as { ok: boolean; ts?: string; error?: string }

    if (!data.ok) {
      logger.error('[slack] postMessage failed', { error: data.error, channel })
    }

    return data
  } catch (error) {
    logger.error('[slack] postMessage threw', {}, error)
    return { ok: false, error: String(error) }
  }
}

/**
 * Reply in a thread. Shorthand for postMessage with threadTs.
 */
export async function replyInThread(
  channel: string,
  threadTs: string,
  text: string,
  blocks?: SlackBlock[]
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  return postMessage({ channel, text, threadTs, blocks })
}

/**
 * Post a message with interactive buttons (for approval flows).
 */
export async function postApprovalRequest(options: {
  channel?: string
  threadTs?: string
  text: string
  callbackId: string
  context: Record<string, string>
  approveLabel?: string
  rejectLabel?: string
}): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: options.text },
    },
    {
      type: 'actions',
      block_id: options.callbackId,
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: options.approveLabel || 'Approve', emoji: true },
          style: 'primary',
          action_id: 'approve',
          value: JSON.stringify(options.context),
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: options.rejectLabel || 'Skip', emoji: true },
          action_id: 'reject',
          value: JSON.stringify(options.context),
        },
      ],
    },
  ]

  return postMessage({
    channel: options.channel,
    text: options.text, // Fallback for notifications
    threadTs: options.threadTs,
    blocks,
  })
}

/**
 * Add a reaction emoji to a message.
 */
export async function addReaction(
  channel: string,
  timestamp: string,
  emoji: string
): Promise<{ ok: boolean }> {
  const token = getBotToken()
  if (!token) return { ok: false }

  try {
    const response = await fetch(`${SLACK_API}/reactions.add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        timestamp,
        name: emoji.replace(/:/g, ''),
      }),
    })
    return await response.json() as { ok: boolean }
  } catch {
    return { ok: false }
  }
}

/**
 * Remove a reaction emoji from a message.
 */
export async function removeReaction(
  channel: string,
  timestamp: string,
  emoji: string
): Promise<{ ok: boolean }> {
  const token = getBotToken()
  if (!token) return { ok: false }

  try {
    const response = await fetch(`${SLACK_API}/reactions.remove`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        timestamp,
        name: emoji.replace(/:/g, ''),
      }),
    })
    return await response.json() as { ok: boolean }
  } catch {
    return { ok: false }
  }
}

/**
 * Update an existing message (e.g., replace buttons with "Approved ✓").
 */
export async function updateMessage(
  channel: string,
  ts: string,
  text: string,
  blocks?: SlackBlock[]
): Promise<{ ok: boolean }> {
  const token = getBotToken()
  if (!token) return { ok: false }

  try {
    const response = await fetch(`${SLACK_API}/chat.update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, ts, text, blocks }),
    })
    return await response.json() as { ok: boolean }
  } catch {
    return { ok: false }
  }
}

// ============================================================================
// REQUEST VERIFICATION
// ============================================================================

/**
 * Verify that an incoming request is actually from Slack.
 * Uses HMAC-SHA256 with SLACK_SIGNING_SECRET.
 */
export function verifySlackRequest(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  // Reject requests older than 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return false
  }

  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}

// ============================================================================
// PROACTIVE ALERT HELPERS
// ============================================================================

/**
 * Post an operator agent alert to the ops channel.
 * Used by agents to proactively notify the founder.
 */
export async function postAgentAlert(options: {
  agentName: string
  emoji: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  actions?: {
    callbackId: string
    context: Record<string, string>
    approveLabel: string
    rejectLabel?: string
  }
}): Promise<{ ok: boolean; ts?: string }> {
  const severityEmoji = {
    info: '',
    warning: ':warning:',
    critical: ':rotating_light:',
  }

  const headerText = `${options.emoji} *${options.agentName}* ${severityEmoji[options.severity]}\n${options.title}`

  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: headerText },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: options.body },
    },
  ]

  if (options.actions) {
    blocks.push({
      type: 'actions',
      block_id: options.actions.callbackId,
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: options.actions.approveLabel, emoji: true },
          style: 'primary',
          action_id: 'approve',
          value: JSON.stringify(options.actions.context),
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: options.actions.rejectLabel || 'Skip', emoji: true },
          action_id: 'reject',
          value: JSON.stringify(options.actions.context),
        },
      ],
    })
  }

  const fallbackText = `[${options.agentName}] ${options.title}\n${options.body}`
  return postMessage({ text: fallbackText, blocks })
}
