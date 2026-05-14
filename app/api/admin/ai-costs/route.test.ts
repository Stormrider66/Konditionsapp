import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockRequireAdmin = vi.hoisted(() => vi.fn())

const mockPrisma = vi.hoisted(() => ({
  aIUsageLog: {
    findMany: vi.fn(),
  },
  aITopUpPurchase: {
    findMany: vi.fn(),
  },
  client: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET } from '@/app/api/admin/ai-costs/route'

describe('admin AI costs route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AI_BILLING_SEK_PER_USD = '10'
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' })
    mockPrisma.client.findMany.mockResolvedValue([])
    mockPrisma.aITopUpPurchase.findMany.mockResolvedValue([])
  })

  it('returns feature mix shares for food scanner and other heavy AI surfaces', async () => {
    mockPrisma.aIUsageLog.findMany.mockResolvedValue([
      usageLog({ category: 'food_scan', estimatedCost: 1, clientId: 'client-1' }),
      usageLog({ category: 'food_scan_memory', estimatedCost: 0.5, clientId: 'client-1' }),
      usageLog({ category: 'video_analysis', estimatedCost: 0.25, clientId: 'client-2' }),
      usageLog({ category: 'live_voice_coach', estimatedCost: 0.25, clientId: 'client-2' }),
    ])

    const response = await GET(new NextRequest('http://localhost/api/admin/ai-costs?days=7'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.totals.costSek).toBe(20)
    expect(body.data.featureMix.foodScanner).toMatchObject({
      calls: 2,
      costSek: 15,
      athleteLinkedCalls: 2,
      athleteLinkedCostSek: 15,
      costSharePercent: 75,
      callSharePercent: 50,
    })
    expect(body.data.featureMix.heavyInteractive).toMatchObject({
      calls: 2,
      costSek: 5,
      costSharePercent: 25,
      callSharePercent: 50,
    })
    expect(body.data.featureMix.topCategory).toMatchObject({
      key: 'food_scan',
      label: 'Food scanner',
      costSek: 10,
      costSharePercent: 50,
    })
  })

  it('includes recent top-up purchases in the overview', async () => {
    mockPrisma.aIUsageLog.findMany.mockResolvedValue([])
    mockPrisma.aITopUpPurchase.findMany.mockResolvedValue([
      {
        clientId: 'client-1',
        amountPaidSek: 119,
        creditsSek: 100,
        creditsRemainingSek: 40,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-14T09:00:00Z'),
      },
      {
        clientId: 'client-2',
        amountPaidSek: 59,
        creditsSek: 50,
        creditsRemainingSek: 50,
        status: 'PENDING',
        createdAt: new Date('2026-05-14T08:00:00Z'),
      },
    ])

    const response = await GET(new NextRequest('http://localhost/api/admin/ai-costs?days=7'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.topUps).toMatchObject({
      purchases: 2,
      activePurchases: 1,
      pendingPurchases: 1,
      revenueSek: 119,
      creditsSoldSek: 100,
      creditsRemainingSek: 40,
      conversionPercent: 50,
    })
    expect(body.data.topUps.recent[0]).toMatchObject({
      clientId: 'client-1',
      amountPaidSek: 119,
      creditsSek: 100,
      status: 'ACTIVE',
      createdAt: '2026-05-14T09:00:00.000Z',
    })
  })
})

function usageLog(overrides: {
  category: string
  estimatedCost: number
  clientId?: string | null
}) {
  return {
    category: overrides.category,
    provider: 'google',
    model: 'gemini-3-flash',
    inputTokens: 1000,
    outputTokens: 100,
    estimatedCost: overrides.estimatedCost,
    clientId: overrides.clientId ?? null,
    userId: 'user-1',
    createdAt: new Date('2026-05-14T10:00:00Z'),
  }
}
