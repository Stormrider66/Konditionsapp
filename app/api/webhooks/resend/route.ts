// app/api/webhooks/resend/route.ts
//
// Receives Resend webhooks for `domain.*` and `email.*` events. Domain events
// keep `Business.customEmailVerified` honest after the customer publishes their
// DKIM/SPF records. Email lifecycle events give us an evidence trail when an
// invite is reported as missing, bounced, delayed, or complained about.
//
// Setup:
//   1. In Resend dashboard → Webhooks → Add endpoint
//      https://trainomics.app/api/webhooks/resend
//      Subscribed events:
//      - domain.created, domain.updated, domain.deleted
//      - email.sent, email.delivered, email.delivery_delayed,
//        email.bounced, email.complained, email.failed, email.suppressed
//   2. Copy the signing secret → set RESEND_WEBHOOK_SECRET in Vercel env.
//   3. Resend signs payloads with svix; we verify before trusting anything.
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { Webhook } from 'svix'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface ResendDomainEventData {
  id: string
  name?: string
  status?: string
}

interface ResendEmailEventData {
  email_id?: string
  created_at?: string
  from?: string
  to?: string[]
  subject?: string
  tags?: Record<string, string>
  bounce?: {
    message?: string
    subType?: string
    type?: string
  }
  failed?: {
    reason?: string
  }
  suppressed?: {
    message?: string
    type?: string
  }
}

interface ResendWebhookEvent {
  type: string
  created_at?: string
  data: ResendDomainEventData | ResendEmailEventData
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

function asEmailData(data: ResendWebhookEvent['data']): ResendEmailEventData {
  return data as ResendEmailEventData
}

function asDomainData(data: ResendWebhookEvent['data']): ResendDomainEventData {
  return data as ResendDomainEventData
}

function eventDate(value: string | undefined): Date {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function failureReason(data: ResendEmailEventData): string | null {
  return (
    data.bounce?.message ||
    data.failed?.reason ||
    data.suppressed?.message ||
    data.bounce?.type ||
    data.suppressed?.type ||
    null
  )
}

function isWebhookVerificationError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'WebhookVerificationError'
}

async function handleEmailEvent(event: ResendWebhookEvent) {
  const data = asEmailData(event.data)
  const emailId = data.email_id

  if (!emailId) {
    logger.warn('Resend email event missing data.email_id', { type: event.type })
    return
  }

  const tags = data.tags || {}
  const eventCreatedAt = eventDate(data.created_at || event.created_at)

  await prisma.emailDeliveryEvent.upsert({
    where: {
      resendEmailId_eventType_eventCreatedAt: {
        resendEmailId: emailId,
        eventType: event.type,
        eventCreatedAt,
      },
    },
    create: {
      resendEmailId: emailId,
      eventType: event.type,
      eventCreatedAt,
      from: data.from,
      to: data.to || [],
      subject: data.subject,
      category: tags.category,
      emailType: tags.email_type,
      businessId: tags.business_id,
      invitationId: tags.invitation_id,
      targetId: tags.target_id,
      reason: failureReason(data),
      payload: event as unknown as Prisma.InputJsonValue,
    },
    update: {
      from: data.from,
      to: data.to || [],
      subject: data.subject,
      category: tags.category,
      emailType: tags.email_type,
      businessId: tags.business_id,
      invitationId: tags.invitation_id,
      targetId: tags.target_id,
      reason: failureReason(data),
      payload: event as unknown as Prisma.InputJsonValue,
    },
  })

  if (
    tags.category === 'invite' &&
    ['email.bounced', 'email.complained', 'email.failed', 'email.suppressed'].includes(event.type)
  ) {
    logger.warn('Invite email deliverability event needs attention', {
      type: event.type,
      emailId,
      emailType: tags.email_type,
      businessId: tags.business_id,
      invitationId: tags.invitation_id,
      targetId: tags.target_id,
      reason: failureReason(data),
    })
  }
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
  } catch (err: unknown) {
    if (isWebhookVerificationError(err)) {
      logger.warn('Resend webhook signature verification failed', { error: err.message })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    logger.error('Resend webhook unexpected error during verification', {}, err)
    return NextResponse.json({ error: 'Verification error' }, { status: 500 })
  }

  if (event.type?.startsWith('email.')) {
    await handleEmailEvent(event)
    return NextResponse.json({ received: true })
  }

  // Only domain.* and email.* events affect us. Everything else is ack'd
  // silently so Resend doesn't keep retrying.
  if (!event.type?.startsWith('domain.')) {
    return NextResponse.json({ received: true })
  }

  const domainData = asDomainData(event.data)
  const domainId = domainData?.id
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
  const status = domainData.status
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
