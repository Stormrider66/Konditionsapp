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
  aIProviderBillingImport: {
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
    mockPrisma.aIProviderBillingImport.findMany.mockResolvedValue([])
  })

  it('returns feature mix shares for food scanner and other heavy AI surfaces', async () => {
    mockPrisma.aIUsageLog.findMany.mockResolvedValue([
      usageLog({ category: 'food_scan', estimatedCost: 1, clientId: 'client-1' }),
      usageLog({ category: 'food_scan_memory', estimatedCost: 0.5, clientId: 'client-1' }),
      usageLog({ category: 'food_scan_text', estimatedCost: 0.1, clientId: 'client-1' }),
      usageLog({ category: 'video_analysis_generic', estimatedCost: 0.25, clientId: 'client-2' }),
      usageLog({ category: 'video_pose_analysis', estimatedCost: 0.1, clientId: 'client-2' }),
      usageLog({ category: 'live_voice_coaching', estimatedCost: 0.25, clientId: 'client-2' }),
      usageLog({ category: 'live_voice_summary', estimatedCost: 0.1, clientId: 'client-2' }),
      usageLog({ category: 'audio_journal_process', estimatedCost: 0.1, clientId: 'client-2' }),
      usageLog({ category: 'adhoc_workout_voice_parse', estimatedCost: 0.1, clientId: 'client-2' }),
      usageLog({ category: 'wod_generation', estimatedCost: 0.1, clientId: 'client-2' }),
    ])

    const response = await GET(new NextRequest('http://localhost/api/admin/ai-costs?days=7'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.totals.costSek).toBe(26)
    expect(body.data.featureMix.foodScanner).toMatchObject({
      calls: 3,
      costSek: 16,
      athleteLinkedCalls: 3,
      athleteLinkedCostSek: 16,
      costSharePercent: 62,
      callSharePercent: 30,
    })
    expect(body.data.featureMix.heavyInteractive).toMatchObject({
      calls: 7,
      costSek: 10,
      costSharePercent: 38,
      callSharePercent: 70,
    })
    expect(body.data.featureMix.heavyInteractive.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'video_pose_analysis', label: 'Video pose analysis' }),
        expect.objectContaining({ key: 'audio_journal_process', label: 'Audio journal' }),
        expect.objectContaining({ key: 'adhoc_workout_voice_parse', label: 'Ad-hoc workout voice parse' }),
        expect.objectContaining({ key: 'wod_generation', label: 'WOD generation' }),
      ])
    )
    expect(body.data.featureMix.topCategory).toMatchObject({
      key: 'food_scan',
      label: 'Food scanner',
      costSek: 10,
      costSharePercent: 38,
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

  it('adds billing action recommendations for margin risk users', async () => {
    mockPrisma.aIUsageLog.findMany.mockResolvedValue([
      usageLog({ category: 'food_scan', estimatedCost: 3, clientId: 'client-standard' }),
      usageLog({ category: 'video_analysis', estimatedCost: 2, clientId: 'client-pro' }),
    ])
    mockPrisma.aITopUpPurchase.findMany.mockResolvedValue([
      {
        clientId: 'client-pro',
        amountPaidSek: 119,
        creditsSek: 100,
        creditsRemainingSek: 80,
        status: 'ACTIVE',
        createdAt: new Date('2026-05-14T09:00:00Z'),
      },
    ])
    mockPrisma.client.findMany.mockResolvedValue([
      {
        id: 'client-standard',
        name: 'Standard Heavy',
        email: 'standard@example.com',
        athleteSubscription: {
          tier: 'STANDARD',
          customAiAllowanceSek: null,
          business: null,
        },
      },
      {
        id: 'client-pro',
        name: 'Pro Topup',
        email: 'pro@example.com',
        athleteSubscription: {
          tier: 'PRO',
          customAiAllowanceSek: null,
          business: null,
        },
      },
    ])

    const response = await GET(new NextRequest('http://localhost/api/admin/ai-costs?days=7'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.margin.riskUsers[0]).toMatchObject({
      clientId: 'client-standard',
      tier: 'STANDARD',
      costSek: 30,
      includedAllowanceSek: 30,
      allowanceUsedPercent: 100,
      recommendation: {
        action: 'UPGRADE',
        label: 'Recommend Pro',
        priority: 'HIGH',
      },
    })
    expect(body.data.margin.riskUsers[1]).toMatchObject({
      clientId: 'client-pro',
      hasActiveTopUp: true,
      topUpRevenueSek: 119,
      recommendation: {
        action: 'MONETIZED',
        label: 'Already monetized',
        priority: 'LOW',
      },
    })
  })

  it('reconciles app estimates against imported provider invoices', async () => {
    const now = Date.now()
    const invoicePeriodStart = new Date(now - 31 * 24 * 60 * 60 * 1000)
    const invoicePeriodEnd = new Date(now + 24 * 60 * 60 * 1000)

    mockPrisma.aIUsageLog.findMany.mockResolvedValue([
      usageLog({ category: 'food_scan', estimatedCost: 1, clientId: 'client-1' }),
      usageLog({ category: 'chat', estimatedCost: 0.5, clientId: 'client-1' }),
    ])
    mockPrisma.aIProviderBillingImport.findMany.mockResolvedValue([
      {
        provider: 'GOOGLE',
        serviceDescription: 'Gemini API',
        skuDescription: 'Generate content token count',
        costSek: 60,
        periodStart: invoicePeriodStart,
        periodEnd: invoicePeriodEnd,
      },
      {
        provider: 'OPENAI',
        serviceDescription: 'OpenAI API',
        skuDescription: 'Responses API',
        costSek: 10,
        periodStart: invoicePeriodStart,
        periodEnd: invoicePeriodEnd,
      },
    ])

    const response = await GET(new NextRequest('http://localhost/api/admin/ai-costs?days=30'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.reconciliation).toMatchObject({
      importedRows: 2,
      googleEstimatedSek: 15,
      googleCoveragePercent: expect.any(Number),
    })
    expect(body.data.reconciliation.googleInvoiceSek).toBeGreaterThan(0)
    expect(body.data.reconciliation.googleGapSek).toBeGreaterThanOrEqual(0)
    expect(body.data.reconciliation.byProvider[0]).toMatchObject({
      provider: 'GOOGLE',
      label: 'Google',
      estimatedSek: 15,
      rows: 1,
    })
    expect(body.data.reconciliation.topRows[0]).toMatchObject({
      provider: 'GOOGLE',
      serviceDescription: 'Gemini API',
      skuDescription: 'Generate content token count',
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
