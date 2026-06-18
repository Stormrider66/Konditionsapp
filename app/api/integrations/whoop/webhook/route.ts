/**
 * WHOOP webhook handler.
 *
 * WHOOP signs webhook requests. The payload is an event notification, not the
 * full data record, so processing fetches the latest API data asynchronously.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getRequestIp } from '@/lib/api/rate-limit'
import {
  logWhoopWebhookReceipt,
  processWhoopWebhookPayloadAsync,
  verifyWhoopWebhookSignature,
  WhoopWebhookPayload,
} from '@/lib/integrations/whoop/webhook-service'
import { logger } from '@/lib/logger'
import { createCustomRateLimiter } from '@/lib/rate-limit-redis'

export const maxDuration = 30

const WHOOP_WEBHOOK_SECRET = process.env.WHOOP_WEBHOOK_SECRET || process.env.WHOOP_CLIENT_SECRET

const whoopWebhookLimiter = createCustomRateLimiter('webhook:whoop', {
  limit: 1000,
  windowSeconds: 60,
})

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-whoop-signature')
    const timestamp = request.headers.get('x-whoop-signature-timestamp')

    if (!verifyWhoopWebhookSignature({ rawBody, signature, timestamp, secret: WHOOP_WEBHOOK_SECRET })) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const ip = getRequestIp(request)
    const rl = await whoopWebhookLimiter.check(ip)
    if (!rl.success) {
      return NextResponse.json({ received: true })
    }

    const payload = JSON.parse(rawBody) as WhoopWebhookPayload
    logWhoopWebhookReceipt(payload)
    processWhoopWebhookPayloadAsync(payload, 'next-route')

    return NextResponse.json({ received: true, queued: true })
  } catch (error) {
    logger.error('WHOOP webhook error', {}, error)
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}
