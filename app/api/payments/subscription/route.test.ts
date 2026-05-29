/**
 * Contract tests for GET /api/payments/subscription.
 *
 * This is the athlete's view of what they're paying for and what they can
 * use. Pin the auth gate, the not-found path, the FREE-tier default (no
 * subscription row), and the active-subscription happy path so a regression
 * can't silently hand out the wrong tier/features.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockResolveAthleteClientId = vi.hoisted(() => vi.fn())
const mockRateLimitJsonResponse = vi.hoisted(() => vi.fn())
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockCheckAIAccess = vi.hoisted(() => vi.fn())
const mockCheckVideoAccess = vi.hoisted(() => vi.fn())
const mockCheckIntegrationAccess = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-utils', () => ({
  resolveAthleteClientId: mockResolveAthleteClientId,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findUnique: mockFindUnique },
  },
}))

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitJsonResponse: mockRateLimitJsonResponse,
}))

vi.mock('@/lib/auth/tier-utils', () => ({
  checkAIAccess: mockCheckAIAccess,
  checkVideoAccess: mockCheckVideoAccess,
  checkIntegrationAccess: mockCheckIntegrationAccess,
  getTierDisplayName: (tier: string) => `${tier}-name`,
  getTierPrice: () => 99,
  getTierYearlyPrice: () => 990,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/payments/subscription/route'

function request() {
  return new NextRequest('http://localhost/api/payments/subscription')
}

describe('GET /api/payments/subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveAthleteClientId.mockResolvedValue({ user: { id: 'user-1' }, clientId: 'client-1' })
    mockRateLimitJsonResponse.mockResolvedValue(null)
    mockCheckAIAccess.mockResolvedValue({ enabled: true, messagesUsed: 1, messagesLimit: 10, remainingMessages: 9 })
    mockCheckVideoAccess.mockResolvedValue(false)
    mockCheckIntegrationAccess.mockResolvedValue(false)
  })

  it('returns 401 when the athlete cannot be resolved', async () => {
    mockResolveAthleteClientId.mockResolvedValue(null)

    const res = await GET(request())

    expect(res.status).toBe(401)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when the client record is missing', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await GET(request())

    expect(res.status).toBe(404)
  })

  it('defaults to the FREE tier when there is no subscription row', async () => {
    mockFindUnique.mockResolvedValue({ id: 'client-1', athleteSubscription: null })

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tier).toBe('FREE')
    expect(body.status).toBe('ACTIVE')
    expect(body.features.aiChat.enabled).toBe(false)
    expect(body.availableUpgrades).toHaveLength(2)
    // No feature checks needed for the no-subscription branch.
    expect(mockCheckAIAccess).not.toHaveBeenCalled()
  })

  it('returns the active subscription with resolved feature access', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'client-1',
      athleteSubscription: {
        tier: 'STANDARD',
        status: 'ACTIVE',
        paymentSource: 'DIRECT',
        business: null,
        workoutLoggingEnabled: true,
        dailyCheckInEnabled: true,
        stripeSubscriptionId: null,
        billingCycle: null,
        trialEndsAt: null,
      },
    })

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tier).toBe('STANDARD')
    expect(body.features.aiChat).toEqual({ enabled: true, messagesUsed: 1, messagesLimit: 10, remainingMessages: 9 })
    expect(body.features.workoutLogging).toBe(true)
    // STANDARD can still upgrade to PRO.
    expect(body.availableUpgrades.map((u: { tier: string }) => u.tier)).toEqual(['PRO'])
    expect(mockCheckAIAccess).toHaveBeenCalledWith('client-1')
  })

  it('short-circuits when rate limited', async () => {
    const limited = NextResponse.json({ error: 'rate limited' }, { status: 429 })
    mockRateLimitJsonResponse.mockResolvedValue(limited)

    const res = await GET(request())

    expect(res.status).toBe(429)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
})
