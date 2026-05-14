import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockCreateCheckoutSession = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/payments/stripe', () => ({
  createCheckoutSession: mockCreateCheckoutSession,
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { POST } from '@/app/api/payments/create-checkout/route'

describe('athlete create checkout route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.test'
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
    mockResolveAthleteClientId.mockResolvedValue({
      user: { id: 'user-1' },
      clientId: 'client-1',
    })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockCreateCheckoutSession.mockResolvedValue('https://stripe.example.test/checkout')
  })

  it('returns a clear disabled response when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const request = new NextRequest('http://localhost/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'STANDARD',
        billingCycle: 'MONTHLY',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      code: 'BILLING_DISABLED',
      error: 'Billing is not enabled yet',
    })
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled()
  })

  it('accepts billingCycle and returns both checkoutUrl and url', async () => {
    const request = new NextRequest('http://localhost/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'STANDARD',
        billingCycle: 'YEARLY',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      'client-1',
      'STANDARD',
      'YEARLY',
      'https://app.example.test/athlete/subscription?success=true',
      'https://app.example.test/athlete/subscription?cancelled=true',
      undefined,
    )
    expect(body).toEqual({
      success: true,
      checkoutUrl: 'https://stripe.example.test/checkout',
      url: 'https://stripe.example.test/checkout',
    })
  })

  it('keeps accepting cycle and forwards Elite business context', async () => {
    const request = new NextRequest('http://localhost/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'ELITE',
        cycle: 'MONTHLY',
        businessId: '11111111-1111-4111-8111-111111111111',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      'client-1',
      'ELITE',
      'MONTHLY',
      expect.any(String),
      expect.any(String),
      '11111111-1111-4111-8111-111111111111',
    )
  })

  it('keeps checkout return URLs inside the current business subscription page', async () => {
    const request = new NextRequest('http://localhost/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'PRO',
        billingCycle: 'MONTHLY',
        returnPath: '/demo-business/athlete/subscription',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      'client-1',
      'PRO',
      'MONTHLY',
      'https://app.example.test/demo-business/athlete/subscription?success=true',
      'https://app.example.test/demo-business/athlete/subscription?cancelled=true',
      undefined,
    )
  })

  it('rejects external checkout return paths', async () => {
    const request = new NextRequest('http://localhost/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'PRO',
        billingCycle: 'MONTHLY',
        returnPath: '//evil.example/athlete/subscription',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled()
  })

  it('rejects invalid checkout requests before calling Stripe', async () => {
    const request = new NextRequest('http://localhost/api/payments/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'FREE',
        billingCycle: 'MONTHLY',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled()
  })
})
