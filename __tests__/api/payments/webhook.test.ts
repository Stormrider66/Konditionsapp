/**
 * Contract tests for POST /api/payments/webhook.
 *
 * Pins the behavior that actually moves money:
 *  - Missing / invalid Stripe signature → 400, no handler runs.
 *  - Duplicate event (already processed) → short-circuit, no handler runs.
 *  - Fresh event → coach handler first, athlete handler as fallback,
 *    event recorded for idempotency.
 *  - Missing StripeWebhookEvent table (P2021) must NOT 500 — we fail
 *    open on the idempotency table so Stripe doesn't retry forever
 *    during a failed migration.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/payments/stripe', () => ({
  verifyWebhookSignature: vi.fn(),
  handleStripeWebhook: vi.fn(),
}))

vi.mock('@/lib/payments/coach-stripe', () => ({
  handleCoachStripeWebhook: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeWebhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { verifyWebhookSignature, handleStripeWebhook } from '@/lib/payments/stripe'
import { handleCoachStripeWebhook } from '@/lib/payments/coach-stripe'
import { prisma } from '@/lib/prisma'
import { POST as postWebhook } from '@/app/api/payments/webhook/route'

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers,
    body,
  }) as any
}

function buildEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_test_1',
    type: 'customer.subscription.updated',
    data: { object: { metadata: { foo: 'bar' } } },
    ...overrides,
  }
}

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(handleCoachStripeWebhook).mockResolvedValue({ handled: false, message: '' } as any)
    vi.mocked(handleStripeWebhook).mockResolvedValue({ handled: true, message: 'ok' } as any)
    vi.mocked(prisma.stripeWebhookEvent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.stripeWebhookEvent.create).mockResolvedValue({} as any)
  })

  it('rejects requests with no Stripe signature (400)', async () => {
    const res = await postWebhook(request('{}'))
    expect(res.status).toBe(400)
    expect(verifyWebhookSignature).not.toHaveBeenCalled()
    expect(handleCoachStripeWebhook).not.toHaveBeenCalled()
    expect(handleStripeWebhook).not.toHaveBeenCalled()
  })

  it('rejects requests where signature verification throws (400)', async () => {
    vi.mocked(verifyWebhookSignature).mockImplementation(() => {
      throw new Error('invalid signature')
    })

    const res = await postWebhook(request('payload', { 'stripe-signature': 'bad' }))

    expect(res.status).toBe(400)
    expect(handleCoachStripeWebhook).not.toHaveBeenCalled()
    expect(handleStripeWebhook).not.toHaveBeenCalled()
    expect(prisma.stripeWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('short-circuits duplicate events without running handlers', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(buildEvent() as any)
    vi.mocked(prisma.stripeWebhookEvent.findUnique).mockResolvedValue({ handled: true } as any)

    const res = await postWebhook(request('payload', { 'stripe-signature': 'sig' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      received: true,
      handled: true,
      message: 'Duplicate event - already processed',
    })
    expect(handleCoachStripeWebhook).not.toHaveBeenCalled()
    expect(handleStripeWebhook).not.toHaveBeenCalled()
    expect(prisma.stripeWebhookEvent.create).not.toHaveBeenCalled()
  })

  it('dispatches to the coach handler first when it claims the event', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(buildEvent() as any)
    vi.mocked(handleCoachStripeWebhook).mockResolvedValue({
      handled: true,
      message: 'coach subscription updated',
    } as any)

    const res = await postWebhook(request('payload', { 'stripe-signature': 'sig' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.handled).toBe(true)
    expect(body.message).toBe('coach subscription updated')
    expect(handleCoachStripeWebhook).toHaveBeenCalledTimes(1)
    expect(handleStripeWebhook).not.toHaveBeenCalled()
  })

  it('falls back to the athlete handler when coach declines', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(buildEvent() as any)
    vi.mocked(handleCoachStripeWebhook).mockResolvedValue({ handled: false, message: 'not coach' } as any)
    vi.mocked(handleStripeWebhook).mockResolvedValue({
      handled: true,
      message: 'athlete subscription updated',
    } as any)

    const res = await postWebhook(request('payload', { 'stripe-signature': 'sig' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.handled).toBe(true)
    expect(body.message).toBe('athlete subscription updated')
    expect(handleCoachStripeWebhook).toHaveBeenCalledTimes(1)
    expect(handleStripeWebhook).toHaveBeenCalledTimes(1)
  })

  it('records the processed event for idempotency + audit', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(buildEvent() as any)
    vi.mocked(handleStripeWebhook).mockResolvedValue({ handled: true, message: 'ok' } as any)

    await postWebhook(request('payload', { 'stripe-signature': 'sig' }))

    expect(prisma.stripeWebhookEvent.create).toHaveBeenCalledTimes(1)
    const createArgs = vi.mocked(prisma.stripeWebhookEvent.create).mock.calls[0][0]
    expect(createArgs.data).toMatchObject({
      id: 'evt_test_1',
      type: 'customer.subscription.updated',
      handled: true,
      message: 'ok',
    })
  })

  it('fails open when StripeWebhookEvent table is missing (P2021 on findUnique)', async () => {
    // Simulate the pre-migration state: the table isn't there yet.
    const missingTable: any = Object.assign(new Error('table missing'), {
      code: 'P2021',
      clientVersion: '6.0.0',
      name: 'PrismaClientKnownRequestError',
    })
    // Make it an instance of Prisma.PrismaClientKnownRequestError so the
    // route's `err instanceof` check triggers the fail-open branch.
    const { Prisma } = await import('@prisma/client')
    Object.setPrototypeOf(missingTable, Prisma.PrismaClientKnownRequestError.prototype)

    vi.mocked(verifyWebhookSignature).mockReturnValue(buildEvent() as any)
    vi.mocked(prisma.stripeWebhookEvent.findUnique).mockRejectedValue(missingTable)
    vi.mocked(prisma.stripeWebhookEvent.create).mockRejectedValue(missingTable)

    const res = await postWebhook(request('payload', { 'stripe-signature': 'sig' }))

    // We must NOT 500 — Stripe would retry forever. Audit insert is
    // best-effort; the handler still runs and returns 200.
    expect(res.status).toBe(200)
    expect(handleStripeWebhook).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when the actual handler throws (letting Stripe retry)', async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(buildEvent() as any)
    vi.mocked(handleCoachStripeWebhook).mockRejectedValue(new Error('boom'))

    const res = await postWebhook(request('payload', { 'stripe-signature': 'sig' }))

    expect(res.status).toBe(500)
    expect(prisma.stripeWebhookEvent.create).not.toHaveBeenCalled()
  })
})
