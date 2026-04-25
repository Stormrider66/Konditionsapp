// app/api/webhooks/resend/route.ts
//
// Receives Resend webhooks for `domain.*` events. Important for keeping
// `Business.customEmailVerified` honest after the customer publishes their
// DKIM/SPF records — without this, our DB stays "verified=false" until the
// coach clicks "Uppdatera status" in the UI, OR stays "verified=true" forever
// even if Resend later flips the domain back to unverified (e.g. customer
// deletes a CNAME at their registrar).
//
// Setup:
//   1. In Resend dashboard → Webhooks → Add endpoint
//      https://trainomics.app/api/webhooks/resend
//      Subscribed events: domain.created, domain.updated, domain.deleted
//   2. Copy the signing secret → set RESEND_WEBHOOK_SECRET in Vercel env.
//   3. Resend signs payloads with svix; we verify before trusting anything.
import { NextRequest, NextResponse } from 'next/server'
import { Webhook, WebhookVerificationError } from 'svix'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface ResendDomainEventData {
  id: string
  name?: string
  status?: string
}

interface ResendWebhookEvent {
  type: string
  data: ResendDomainEventData
}

const SIGNATURE_HEADERS = [
  'svix-id',
  'svix-timestamp',
  'svix-signature',
] as const

function readSignatureHeaders(req: NextRequest): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const name of SIGNATURE_HEADERS) {
    const value = req.headers.get(name)
    if (!value) return null
    out[name] = value
  }
  return out
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    logger.error('Resend webhook received but RESEND_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    )
  }

  const headers = readSignatureHeaders(request)
  if (!headers) {
    return NextResponse.json(
      { error: 'Missing svix signature headers' },
      { status: 400 },
    )
  }

  const rawBody = await request.text()

  let event: ResendWebhookEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(rawBody, headers) as ResendWebhookEvent
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      logger.warn('Resend webhook signature verification failed', { error: err.message })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    logger.error('Resend webhook unexpected error during verification', {}, err)
    return NextResponse.json({ error: 'Verification error' }, { status: 500 })
  }

  // Only domain.* events affect us. Everything else is ack'd silently so
  // Resend doesn't keep retrying.
  if (!event.type?.startsWith('domain.')) {
    return NextResponse.json({ received: true })
  }

  const domainId = event.data?.id
  if (!domainId) {
    logger.warn('Resend domain event missing data.id', { type: event.type })
    return NextResponse.json({ received: true })
  }

  const business = await prisma.business.findFirst({
    where: { resendDomainId: domainId },
    select: { id: true, customEmailDomain: true, customEmailVerified: true },
  })

  if (!business) {
    // Domain not bound to any business — could be a stale Resend record from a
    // tenant we've already disconnected. Ack and move on.
    logger.info('Resend domain event for unknown domainId', {
      domainId,
      type: event.type,
    })
    return NextResponse.json({ received: true })
  }

  // Map Resend's domain status → our boolean. We trust Resend's
  // `data.status` over the event type because the type can lag the actual
  // state (e.g. `domain.updated` fires for any change, not just verification).
  const status = event.data.status
  const verified = status === 'verified' || status === 'partially_verified'

  if (event.type === 'domain.deleted') {
    // Tenant or platform admin removed the domain in Resend directly — clear
    // our local state so we stop trying to send From: their domain.
    await prisma.business.update({
      where: { id: business.id },
      data: {
        customEmailDomain: null,
        resendDomainId: null,
        customEmailVerified: false,
        customEmailVerifiedAt: null,
      },
    })
    logger.info('Resend webhook: domain.deleted, cleared business state', {
      businessId: business.id,
      domainId,
    })
    return NextResponse.json({ received: true })
  }

  if (verified !== business.customEmailVerified) {
    await prisma.business.update({
      where: { id: business.id },
      data: {
        customEmailVerified: verified,
        customEmailVerifiedAt: verified ? new Date() : null,
      },
    })
    logger.info('Resend webhook: flipped customEmailVerified', {
      businessId: business.id,
      domainId,
      verified,
      type: event.type,
      status,
    })
  }

  return NextResponse.json({ received: true })
}
