/**
 * Slack Events API Handler
 *
 * POST /api/slack/events — Receives all Slack events (messages, reactions, etc.)
 *
 * Slack sends:
 * 1. URL verification challenge (on first setup)
 * 2. Event callbacks (messages, app_mentions, etc.)
 *
 * We respond immediately with 200 and process messages async
 * to avoid Slack's 3-second timeout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySlackRequest } from '@/lib/slack/client'
import { handleSlackMessage } from '@/lib/slack/conversation-handler'
import { logger } from '@/lib/logger'

// Track recently handled events to avoid duplicates
// (Slack retries if it doesn't get a 200 within 3 seconds)
const handledEvents = new Map<string, number>()
const DEDUPE_WINDOW_MS = 60_000

function isDuplicate(eventId: string): boolean {
  const now = Date.now()
  if (handledEvents.has(eventId)) return true
  handledEvents.set(eventId, now)

  // Cleanup old entries
  if (handledEvents.size > 500) {
    for (const [key, ts] of handledEvents) {
      if (now - ts > DEDUPE_WINDOW_MS) handledEvents.delete(key)
    }
  }

  return false
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Step 1: Verify the request is from Slack (REQUIRED)
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    logger.error('[slack/events] SLACK_SIGNING_SECRET not configured — rejecting all requests')
    return NextResponse.json({ error: 'Security misconfiguration' }, { status: 500 })
  }

  const timestamp = req.headers.get('x-slack-request-timestamp') || ''
  const signature = req.headers.get('x-slack-signature') || ''

  if (!verifySlackRequest(signingSecret, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Step 1b: Reject Slack retries to prevent duplicate processing.
  // On Vercel serverless, in-memory dedup doesn't persist across cold starts,
  // so this header check is the primary deduplication mechanism.
  const retryNum = req.headers.get('x-slack-retry-num')
  if (retryNum && parseInt(retryNum, 10) > 0) {
    // Slack is retrying because we were slow — we already processed it (or are processing)
    return NextResponse.json({ ok: true })
  }

  const body = JSON.parse(rawBody)

  // Step 2: Handle URL verification (one-time setup)
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  // Step 3: Handle event callbacks
  if (body.type === 'event_callback') {
    const event = body.event

    // Deduplicate retried events
    const eventId = body.event_id || `${event?.ts}-${event?.channel}`
    if (isDuplicate(eventId)) {
      return NextResponse.json({ ok: true })
    }

    // Only handle messages (not bot messages, not message_changed, etc.)
    if (
      event?.type === 'message' &&
      !event.bot_id &&
      !event.subtype &&
      event.text
    ) {
      const channel = event.channel as string
      // Use thread_ts if in a thread, otherwise start a new thread from this message
      const threadTs = (event.thread_ts || event.ts) as string
      const userMessage = event.text as string
      const userId = event.user as string

      // Check if the bot was mentioned or the message is in a DM
      const botId = process.env.SLACK_BOT_USER_ID
      const isMention = botId && userMessage.includes(`<@${botId}>`)
      const isDM = event.channel_type === 'im'

      // Only respond if mentioned or in a DM
      if (isMention || isDM) {
        // Strip the mention tag from the message
        const cleanMessage = userMessage.replace(/<@[A-Z0-9]+>/g, '').trim()

        if (cleanMessage) {
          // Process async — respond to Slack immediately, then handle the message
          // This avoids Slack's 3-second timeout
          handleSlackMessage({
            channel,
            threadTs,
            userMessage: cleanMessage,
            userId,
          }).catch(error => {
            logger.error('[slack/events] Message handling failed', { channel, threadTs }, error)
          })
        }
      }
    }

    // Handle app_mention events (when someone @mentions the bot)
    if (event?.type === 'app_mention' && event.text) {
      const channel = event.channel as string
      const threadTs = (event.thread_ts || event.ts) as string
      const userMessage = (event.text as string).replace(/<@[A-Z0-9]+>/g, '').trim()
      const userId = event.user as string

      if (userMessage) {
        handleSlackMessage({
          channel,
          threadTs,
          userMessage,
          userId,
        }).catch(error => {
          logger.error('[slack/events] Mention handling failed', { channel, threadTs }, error)
        })
      }
    }
  }

  // Always return 200 immediately so Slack doesn't retry
  return NextResponse.json({ ok: true })
}
