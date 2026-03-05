import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  athleteSubscription: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { checkAthleteFeatureAccess } from '@/lib/subscription/feature-access'

describe('checkAthleteFeatureAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('repairs legacy free athlete AI chat entitlement on access', async () => {
    mockPrisma.athleteSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      clientId: 'client-1',
      tier: 'FREE',
      status: 'ACTIVE',
      paymentSource: 'DIRECT',
      stripeSubscriptionId: null,
      aiChatEnabled: false,
      aiChatMessagesLimit: 0,
      aiChatMessagesUsed: 0,
    })

    mockPrisma.athleteSubscription.update.mockResolvedValue({
      id: 'sub-1',
      clientId: 'client-1',
      tier: 'FREE',
      status: 'ACTIVE',
      paymentSource: 'DIRECT',
      stripeSubscriptionId: null,
      aiChatEnabled: true,
      aiChatMessagesLimit: 10,
      aiChatMessagesUsed: 0,
    })

    const result = await checkAthleteFeatureAccess('client-1', 'ai_chat')

    expect(mockPrisma.athleteSubscription.update).toHaveBeenCalledWith({
      where: { clientId: 'client-1' },
      data: {
        aiChatEnabled: true,
        aiChatMessagesLimit: 10,
      },
    })
    expect(result).toEqual({
      allowed: true,
      currentUsage: 0,
      limit: 10,
    })
  })

  it('does not inherit athlete-only features from a coach subscription', async () => {
    mockPrisma.athleteSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      clientId: 'client-1',
      tier: 'FREE',
      status: 'ACTIVE',
      paymentSource: 'DIRECT',
      stripeSubscriptionId: null,
      aiChatEnabled: true,
      aiChatMessagesLimit: 10,
      aiChatMessagesUsed: 0,
      videoAnalysisEnabled: false,
      stravaEnabled: false,
      garminEnabled: false,
      workoutLoggingEnabled: false,
      dailyCheckInEnabled: false,
    })

    const result = await checkAthleteFeatureAccess('client-1', 'advanced_intelligence')

    expect(mockPrisma.client.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.subscription.findUnique).not.toHaveBeenCalled()
    expect(result).toEqual({
      allowed: false,
      reason: 'Denna funktion kräver en uppgraderad prenumeration.',
      code: 'FEATURE_DISABLED',
      upgradeUrl: '/athlete/subscription',
    })
  })
})
