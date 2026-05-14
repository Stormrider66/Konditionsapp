import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockCreateAiTopUpCheckoutSession = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/payments/stripe', () => ({
  createAiTopUpCheckoutSession: mockCreateAiTopUpCheckoutSession,
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

import { POST } from '@/app/api/payments/ai-top-up/route'

describe('athlete AI top-up checkout route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.test'
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
    mockResolveAthleteClientId.mockResolvedValue({
      user: { id: 'user-1' },
      clientId: 'client-1',
    })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockCreateAiTopUpCheckoutSession.mockResolvedValue('https://stripe.example.test/top-up')
  })

  it('returns a clear disabled response when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const request = new NextRequest('http://localhost/api/payments/ai-top-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packId: 'ai_50',
        returnPath: '/athlete/subscription',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      code: 'BILLING_DISABLED',
      error: 'Billing is not enabled yet',
    })
    expect(mockCreateAiTopUpCheckoutSession).not.toHaveBeenCalled()
  })

  it('preserves a business-scoped return path', async () => {
    const request = new NextRequest('http://localhost/api/payments/ai-top-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packId: 'ai_120',
        returnPath: '/demo-business/athlete/subscription',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockCreateAiTopUpCheckoutSession).toHaveBeenCalledWith(
      'client-1',
      'ai_120',
      'https://app.example.test/demo-business/athlete/subscription?aiTopUp=success',
      'https://app.example.test/demo-business/athlete/subscription?aiTopUp=cancelled',
    )
    expect(body).toEqual({
      success: true,
      checkoutUrl: 'https://stripe.example.test/top-up',
      url: 'https://stripe.example.test/top-up',
    })
  })

  it('rejects external return paths', async () => {
    const request = new NextRequest('http://localhost/api/payments/ai-top-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packId: 'ai_50',
        returnPath: '//evil.example/athlete/subscription',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mockCreateAiTopUpCheckoutSession).not.toHaveBeenCalled()
  })
})
