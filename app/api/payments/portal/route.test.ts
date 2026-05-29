/**
 * Contract tests for POST /api/payments/portal.
 *
 * The billing portal is how athletes manage/cancel a paid subscription. Pin
 * the auth gate, the billing-disabled kill switch, the not-found path, the
 * "no Stripe customer yet" guard, and the happy path — and make sure we never
 * call Stripe on any of the rejection branches.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockCreateBillingPortalSession = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findUnique: mockFindUnique },
  },
}))

vi.mock('@/lib/payments/stripe', () => ({
  createBillingPortalSession: mockCreateBillingPortalSession,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/payments/portal/route'

function request() {
  return new NextRequest('http://localhost/api/payments/portal', { method: 'POST' })
}

describe('POST /api/payments/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.test'
    mockResolveAthleteClientId.mockResolvedValue({ user: { id: 'user-1' }, clientId: 'client-1' })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockFindUnique.mockResolvedValue({
      id: 'client-1',
      athleteSubscription: { stripeCustomerId: 'cus_123' },
    })
    mockCreateBillingPortalSession.mockResolvedValue('https://stripe.example.test/portal')
  })

  it('returns 401 when the athlete cannot be resolved', async () => {
    mockResolveAthleteClientId.mockResolvedValue(null)

    const res = await POST(request())

    expect(res.status).toBe(401)
    expect(mockCreateBillingPortalSession).not.toHaveBeenCalled()
  })

  it('returns 503 BILLING_DISABLED when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY

    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.code).toBe('BILLING_DISABLED')
    expect(mockCreateBillingPortalSession).not.toHaveBeenCalled()
  })

  it('returns 404 when the client record is missing', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await POST(request())

    expect(res.status).toBe(404)
    expect(mockCreateBillingPortalSession).not.toHaveBeenCalled()
  })

  it('returns 400 when there is no Stripe customer to manage', async () => {
    mockFindUnique.mockResolvedValue({ id: 'client-1', athleteSubscription: { stripeCustomerId: null } })

    const res = await POST(request())

    expect(res.status).toBe(400)
    expect(mockCreateBillingPortalSession).not.toHaveBeenCalled()
  })

  it('creates a portal session for a customer with an active subscription', async () => {
    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true, portalUrl: 'https://stripe.example.test/portal' })
    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      'client-1',
      'https://app.example.test/athlete/subscription',
    )
  })
})
