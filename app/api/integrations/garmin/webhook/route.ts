/**
 * Garmin Webhook Handler
 *
 * Garmin requires minimum 10MB payload acceptance (100MB for activity details).
 * Vercel Functions still enforce a hard request body size limit, so this route
 * exists primarily for the smaller Garmin payloads and local compatibility.
 * The processing logic is shared with the dedicated Cloud Run service.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCustomRateLimiter } from '@/lib/rate-limit-redis'
import { getRequestIp } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import {
  GarminWebhookPayload,
  logGarminWebhookReceipt,
  processGarminWebhookPayloadAsync,
  verifyGarminWebhookRequest,
} from '@/lib/integrations/garmin/webhook-service'
import { verifyWebhookUrlToken } from '@/lib/integrations/webhook-url-token'

export const maxDuration = 60

const GARMIN_WEBHOOK_VERIFY_TOKEN = process.env.GARMIN_WEBHOOK_VERIFY_TOKEN

// Garmin does not sign webhook POSTs. When set, require ?token=<secret> in
// the webhook URL registered in the Garmin developer portal so only
// Garmin-originated events are accepted (re-register the URL to enable).
const GARMIN_WEBHOOK_URL_TOKEN = process.env.GARMIN_WEBHOOK_URL_TOKEN

const garminWebhookLimiter = createCustomRateLimiter('webhook:garmin', {
  limit: 1000,
  windowSeconds: 60,
})

export async function GET(request: NextRequest) {
  const result = verifyGarminWebhookRequest({
    verifyToken: request.nextUrl.searchParams.get('verify_token'),
    challenge: request.nextUrl.searchParams.get('challenge'),
    expectedVerifyToken: GARMIN_WEBHOOK_VERIFY_TOKEN,
  })

  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyWebhookUrlToken(request.nextUrl.searchParams.get('token'), GARMIN_WEBHOOK_URL_TOKEN)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = getRequestIp(request)
    const rl = await garminWebhookLimiter.check(ip)
    if (!rl.success) {
      return NextResponse.json({ received: true })
    }

    const payload = (await request.json()) as GarminWebhookPayload
    logGarminWebhookReceipt(payload)
    processGarminWebhookPayloadAsync(payload, 'next-route')

    return NextResponse.json({ received: true, queued: true })
  } catch (error) {
    logger.error('Garmin webhook error', {}, error)
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}
