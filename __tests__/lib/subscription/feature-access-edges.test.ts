/**
 * Edge cases for feature-access not covered by feature-access.test.ts.
 * Focus: subscription lifecycle states and AI chat limits — the failure
 * modes that silently either give paid features away or lock out
 * paying customers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  athleteSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
  checkAthleteFeatureAccess,
  checkCoachSubscriptionStatus,
} from '@/lib/subscription/feature-access'

const BASE = {
  id: 'sub-1',
  clientId: 'client-a',
  tier: 'STANDARD' as const,
  status: 'ACTIVE' as const,
  paymentSource: 'DIRECT' as const,
  stripeSubscriptionId: null,
  aiChatEnabled: true,
  aiChatMessagesLimit: 50,
  aiChatMessagesUsed: 0,
  videoAnalysisEnabled: false,
  stravaEnabled: true,
  garminEnabled: true,
  workoutLoggingEnabled: true,
  dailyCheckInEnabled: true,
  trialEndsAt: null as Date | null,
}

function stubSub(overrides: Partial<typeof BASE> = {}) {
  mockPrisma.athleteSubscription.findUnique.mockResolvedValue({
    ...BASE,
    ...overrides,
  })
}

describe('checkAthleteFeatureAccess — subscription lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('denies CANCELLED subscriptions with SUBSCRIPTION_EXPIRED code', async () => {
    stubSub({ status: 'CANCELLED' as any })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('SUBSCRIPTION_EXPIRED')
  })

  it('denies expired trial with TRIAL_EXPIRED code', async () => {
    stubSub({
      status: 'TRIAL' as any,
      trialEndsAt: new Date('2020-01-01'),
    })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('TRIAL_EXPIRED')
  })

  it('allows access during an active trial', async () => {
    stubSub({
      status: 'TRIAL' as any,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(true)
  })
})

describe('checkAthleteFeatureAccess — AI chat limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('denies at exactly the monthly limit (LIMIT_REACHED)', async () => {
    stubSub({ aiChatMessagesLimit: 10, aiChatMessagesUsed: 10 })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('LIMIT_REACHED')
    expect(result.currentUsage).toBe(10)
    expect(result.limit).toBe(10)
  })

  it('denies above the monthly limit (LIMIT_REACHED)', async () => {
    stubSub({ aiChatMessagesLimit: 10, aiChatMessagesUsed: 11 })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('LIMIT_REACHED')
  })

  it('allows under the limit and reports progress fields', async () => {
    stubSub({ aiChatMessagesLimit: 50, aiChatMessagesUsed: 25 })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(true)
    expect(result.currentUsage).toBe(25)
    expect(result.limit).toBe(50)
  })

  it('treats limit=-1 as unlimited, omits the limit field', async () => {
    stubSub({ aiChatMessagesLimit: -1, aiChatMessagesUsed: 9999 })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(true)
    expect(result.limit).toBeUndefined()
  })

  it('denies when aiChatEnabled=false regardless of usage', async () => {
    stubSub({ aiChatEnabled: false, aiChatMessagesLimit: 50, aiChatMessagesUsed: 0 })
    const result = await checkAthleteFeatureAccess('client-a', 'ai_chat')
    expect(result.allowed).toBe(false)
    expect(result.code).toBe('FEATURE_DISABLED')
  })
})

describe('checkCoachSubscriptionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a safe NONE-shaped denial when no subscription exists', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null)
    const result = await checkCoachSubscriptionStatus('coach-a')
    expect(result.allowed).toBe(false)
    expect(result.status).toBe('NONE')
    expect(result.tier).toBe('FREE')
    expect(result.trialActive).toBe(false)
  })

  it('allows during an active trial and surfaces days remaining', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      tier: 'PRO',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    })
    const result = await checkCoachSubscriptionStatus('coach-a')
    expect(result.allowed).toBe(true)
    expect(result.trialActive).toBe(true)
    expect(result.trialDaysRemaining).toBeGreaterThan(0)
    expect(result.trialDaysRemaining).toBeLessThanOrEqual(5)
    expect(result.tier).toBe('PRO')
  })

  it('denies when trial window has closed', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      tier: 'PRO',
      status: 'TRIAL',
      trialEndsAt: new Date('2020-01-01'),
    })
    const result = await checkCoachSubscriptionStatus('coach-a')
    expect(result.allowed).toBe(false)
    expect(result.status).toBe('EXPIRED')
    expect(result.trialActive).toBe(false)
  })

  it('denies EXPIRED coach subscriptions', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      tier: 'PRO',
      status: 'EXPIRED',
      trialEndsAt: null,
    })
    const result = await checkCoachSubscriptionStatus('coach-a')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/expired/i)
  })

  it('denies CANCELLED coach subscriptions', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      tier: 'PRO',
      status: 'CANCELLED',
      trialEndsAt: null,
    })
    const result = await checkCoachSubscriptionStatus('coach-a')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/cancelled/i)
  })

  it('allows fully active subscriptions outside trial', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({
      tier: 'PRO',
      status: 'ACTIVE',
      trialEndsAt: null,
    })
    const result = await checkCoachSubscriptionStatus('coach-a')
    expect(result.allowed).toBe(true)
    expect(result.trialActive).toBe(false)
  })
})
