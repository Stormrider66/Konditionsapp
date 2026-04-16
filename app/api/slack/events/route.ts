/**
 * Slack Events API Handler
 *
 * POST /api/slack/events — Receives all Slack events (messages, reactions, etc.)
 *
 * Uses Next.js `after()` to ensure the message handler runs to completion
 * even after the 200 response is sent to Slack. Without this, Vercel may
 * kill the function before the Claude API call finishes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { verifySlackRequest } from '@/lib/slack/client'
import { handleSlackMessage } from '@/lib/slack/conversation-handler'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    logger.error('[slack/events] SLACK_SIGNING_SECRET not configured')
    return NextResponse.json({ error: 'Security misconfiguration' }, { status: 500 })
  }

  const timestamp = req.headers.get('x-slack-request-timestamp') || ''
  const signature = req.headers.get('x-slack-signature') || ''

  if (!verifySlackRequest(signingSecret, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Reject Slack retries — we already processed or are processing the original
  const retryNum = req.headers.get('x-slack-retry-num')
  if (retryNum && parseInt(retryNum, 10) > 0) {
    return NextResponse.json({ ok: true })
  }

  const body = JSON.parse(rawBody)

  // URL verification (one-time setup)
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  // Event callbacks
  if (body.type === 'event_callback') {
    const event = body.event
    const eventId = body.event_id || `${event?.ts}-${event?.channel}`

    // Extract message details for both message and app_mention events
    let messagePayload: {
      channel: string
      threadTs: string
      userMessage: string
      userId: string
    } | null = null

    if (
      event?.type === 'message' &&
      !event.bot_id &&
      !event.subtype &&
      event.text
    ) {
      const botId = process.env.SLACK_BOT_USER_ID
      const isMention = botId && (event.text as string).includes(`<@${botId}>`)
      const isDM = event.channel_type === 'im'

      if (isMention || isDM) {
        const cleanMessage = (event.text as string).replace(/<@[A-Z0-9]+>/g, '').trim()
        if (cleanMessage) {
          messagePayload = {
            channel: event.channel,
            threadTs: event.thread_ts || event.ts,
            userMessage: cleanMessage,
            userId: event.user,
          }
        }
      }
    }

    if (event?.type === 'app_mention' && event.text) {
      const cleanMessage = (event.text as string).replace(/<@[A-Z0-9]+>/g, '').trim()
      if (cleanMessage) {
        messagePayload = {
          channel: event.channel,
          threadTs: event.thread_ts || event.ts,
          userMessage: cleanMessage,
          userId: event.user,
        }
      }
    }

    // Schedule the heavy work AFTER the response is sent.
    // `after()` guarantees the function stays alive until this completes.
    if (messagePayload) {
      const payload = messagePayload
      after(async () => {
        try {
          logger.info('[slack/events] Processing message', { eventId, channel: payload.channel })
          await handleSlackMessage(payload)
        } catch (error) {
          logger.error('[slack/events] Message handling failed', { eventId }, error)
        }
      })
    }
  }

  return NextResponse.json({ ok: true })
}
