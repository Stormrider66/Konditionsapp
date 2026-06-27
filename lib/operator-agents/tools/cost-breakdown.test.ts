import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  aIUsageLog: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  business: {
    findMany: vi.fn(),
  },
  businessMember: {
    findMany: vi.fn(),
  },
  client: {
    findMany: vi.fn(),
  },
  platformConfig: {
    findUnique: vi.fn(),
  },
  pricingTier: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import {
  getMarginAtRiskUsers,
  getRevenueVsCost,
  getTopSpendingUsers,
} from './cost-breakdown'

describe('operator cost breakdown tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FX_SEK_TO_USD = '10'
    mockPrisma.platformConfig.findUnique.mockResolvedValue(null)
    mockPrisma.pricingTier.findMany.mockResolvedValue([
      pricingTier('FREE', 0),
      pricingTier('STANDARD', 19900),
      pricingTier('PRO', 39900),
    ])
    mockPrisma.business.findMany.mockResolvedValue([])
    mockPrisma.businessMember.findMany.mockResolvedValue([])
  })

  it('matches revenue by clientId instead of an arbitrary client owned by the same user', async () => {
    mockPrisma.aIUsageLog.groupBy.mockResolvedValue(revenueGroups())
    mockPrisma.client.findMany.mockResolvedValue([
      client({
        id: 'henrik-client',
        name: 'Henrik Lundholm',
        userId: 'admin-user',
        tier: 'PRO',
        status: 'ACTIVE',
      }),
      client({
        id: 'expired-athlete',
        name: 'Expired Standard Athlete',
        userId: 'admin-user',
        tier: 'STANDARD',
        status: 'EXPIRED',
      }),
    ])
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'admin-user', name: 'Henrik Lundholm', role: 'ADMIN', adminRole: 'SUPER_ADMIN' },
    ])

    const result = await getRevenueVsCost(30)

    expect(result.success).toBe(true)
    const data = result.data as {
      counts: Record<string, number>
      worstOffenders: Array<Record<string, unknown>>
    }
    expect(data.counts).toMatchObject({
      losses: 1,
      freeLosses: 0,
      platformOverhead: 1,
      profitable: 1,
    })
    expect(data.worstOffenders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: 'CLIENT',
          clientId: 'henrik-client',
          name: 'Henrik Lundholm',
          tier: 'PRO',
          subscriptionStatus: 'ACTIVE',
          costUsd: 4,
          revenueUsd: 39.9,
          status: 'PROFITABLE',
        }),
        expect.objectContaining({
          entityType: 'CLIENT',
          clientId: 'expired-athlete',
          tier: 'STANDARD',
          subscriptionStatus: 'EXPIRED',
          costUsd: 1,
          revenueUsd: 0,
          status: 'LOSS',
        }),
        expect.objectContaining({
          entityType: 'USER_OVERHEAD',
          clientId: null,
          tier: 'PLATFORM_OVERHEAD',
          costUsd: 2,
          status: 'PLATFORM_OVERHEAD',
        }),
      ]),
    )

    const atRisk = await getMarginAtRiskUsers(30)
    expect(atRisk.success).toBe(true)
    expect((atRisk.data as { atRiskUsers: Array<Record<string, unknown>> }).atRiskUsers).toEqual([
      expect.objectContaining({
        clientId: 'expired-athlete',
        status: 'LOSS',
      }),
    ])
  })

  it('reports the top linked client for top-spending users', async () => {
    mockPrisma.aIUsageLog.groupBy
      .mockResolvedValueOnce([
        {
          userId: 'admin-user',
          _sum: { estimatedCost: 8.861, inputTokens: 1000, outputTokens: 500 },
        },
      ])
      .mockResolvedValueOnce([
        {
          userId: 'admin-user',
          clientId: 'henrik-client',
          _sum: { estimatedCost: 4 },
        },
        {
          userId: 'admin-user',
          clientId: 'other-client',
          _sum: { estimatedCost: 1 },
        },
      ])
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'admin-user',
        name: 'Henrik Lundholm',
        email: 'henrik@example.com',
        role: 'ADMIN',
        adminRole: 'SUPER_ADMIN',
      },
    ])
    mockPrisma.client.findMany.mockResolvedValue([
      client({
        id: 'henrik-client',
        name: 'Henrik Lundholm',
        userId: 'admin-user',
        tier: 'PRO',
        status: 'ACTIVE',
      }),
      client({
        id: 'other-client',
        name: 'Other Athlete',
        userId: 'admin-user',
        tier: 'STANDARD',
        status: 'EXPIRED',
      }),
    ])

    const result = await getTopSpendingUsers(30, 10)

    expect(result.success).toBe(true)
    const topSpender = (result.data as {
      topSpenders: Array<Record<string, unknown>>
    }).topSpenders[0]
    expect(topSpender).toMatchObject({
      userId: 'admin-user',
      name: 'Henrik Lundholm',
      role: 'ADMIN',
      tier: 'PRO',
      subscriptionStatus: 'ACTIVE',
      linkedClientCount: 2,
      athleteLinkedCostUsd: 5,
      platformOrUnlinkedCostUsd: 3.861,
      totalCostUsd: 8.861,
      topClient: expect.objectContaining({
        clientId: 'henrik-client',
        name: 'Henrik Lundholm',
        tier: 'PRO',
        subscriptionStatus: 'ACTIVE',
        costUsd: 4,
      }),
    })
  })
})

function revenueGroups() {
  return [
    {
      userId: 'admin-user',
      clientId: 'henrik-client',
      _sum: { estimatedCost: 4 },
    },
    {
      userId: 'admin-user',
      clientId: 'expired-athlete',
      _sum: { estimatedCost: 1 },
    },
    {
      userId: 'admin-user',
      clientId: null,
      _sum: { estimatedCost: 2 },
    },
  ]
}

function client(params: {
  id: string
  name: string
  userId: string
  tier: string
  status: string
}) {
  return {
    id: params.id,
    name: params.name,
    email: null,
    userId: params.userId,
    business: null,
    user: {
      name: 'Henrik Lundholm',
      role: 'ADMIN',
      adminRole: 'SUPER_ADMIN',
    },
    athleteSubscription: {
      tier: params.tier,
      status: params.status,
    },
  }
}

function pricingTier(tierName: string, monthlyPriceCents: number) {
  return {
    tierName,
    monthlyPriceCents,
    currency: 'SEK',
  }
}
