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
  processGarminWebhookPayload,
  verifyGarminWebhookRequest,
} from '@/lib/integrations/garmin/webhook-service'

export const maxDuration = 60

const GARMIN_WEBHOOK_VERIFY_TOKEN = process.env.GARMIN_WEBHOOK_VERIFY_TOKEN

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
    const ip = getRequestIp(request)
    const rl = await garminWebhookLimiter.check(ip)
    if (!rl.success) {
      return NextResponse.json({ received: true })
    }

    const payload = (await request.json()) as GarminWebhookPayload
    logGarminWebhookReceipt(payload)
    const results = await processGarminWebhookPayload(payload)

    return NextResponse.json({ received: true, ...results })
  } catch (error) {
    logger.error('Garmin webhook error', {}, error)
    return NextResponse.json({ received: true, error: 'Processing error' })
  }
}
