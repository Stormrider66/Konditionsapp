import { beforeEach, describe, expect, it, vi } from 'vitest'

const tx = vi.hoisted(() => ({
  aITopUpPurchase: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  aIAllowanceAccount: {
    update: vi.fn(),
  },
}))

const mockTransaction = vi.hoisted(() => vi.fn())
const mockGetOrCreateAiAllowanceAccount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mockTransaction,
  },
}))

vi.mock('@/lib/ai/billing/allowance', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/billing/allowance')>('@/lib/ai/billing/allowance')
  return {
    ...actual,
    getOrCreateAiAllowanceAccount: mockGetOrCreateAiAllowanceAccount,
  }
})

vi.mock('@/lib/auth/tier-utils', () => ({
  getTierFeatures: vi.fn(() => ({})),
}))

vi.mock('@/lib/coach/revenue-share', () => ({
  calculateAndRecordRevenueShare: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendPaymentFailedEmail: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { handleStripeWebhook } from '@/lib/payments/stripe'

function topUpEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_topup_1',
        customer: 'cus_1',
        payment_intent: 'pi_1',
        metadata: {
          type: 'ai_top_up',
          clientId: 'client_1',
          packId: 'ai_120',
          amountPaidSek: '99',
          creditsSek: '120',
        },
        ...overrides,
      },
    },
  }
}

describe('Stripe AI top-up webhook handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (callback) => callback(tx))
    mockGetOrCreateAiAllowanceAccount.mockResolvedValue({ id: 'allowance_1' })
    tx.aITopUpPurchase.findUnique.mockResolvedValue({ id: 'purchase_1', status: 'PENDING' })
    tx.aITopUpPurchase.update.mockResolvedValue({})
    tx.aITopUpPurchase.create.mockResolvedValue({})
    tx.aIAllowanceAccount.update.mockResolvedValue({})
  })

  it('activates a pending top-up and increments the AI balance once', async () => {
    const result = await handleStripeWebhook(topUpEvent() as any)

    expect(result).toEqual({
      handled: true,
      message: 'AI top-up activated for client client_1',
    })
    expect(mockGetOrCreateAiAllowanceAccount).toHaveBeenCalledWith('client_1', expect.any(Date), tx)
    expect(tx.aITopUpPurchase.update).toHaveBeenCalledWith({
      where: { id: 'purchase_1' },
      data: {
        stripePaymentIntentId: 'pi_1',
        amountPaidSek: 99,
        creditsSek: 120,
        creditsRemainingSek: 120,
        status: 'ACTIVE',
      },
    })
    expect(tx.aIAllowanceAccount.update).toHaveBeenCalledWith({
      where: { clientId: 'client_1' },
      data: {
        topUpBalanceSek: { increment: 120 },
      },
    })
  })

  it('does not double-credit an already active top-up purchase', async () => {
    tx.aITopUpPurchase.findUnique.mockResolvedValue({ id: 'purchase_1', status: 'ACTIVE' })

    const result = await handleStripeWebhook(topUpEvent() as any)

    expect(result.handled).toBe(true)
    expect(mockGetOrCreateAiAllowanceAccount).not.toHaveBeenCalled()
    expect(tx.aITopUpPurchase.update).not.toHaveBeenCalled()
    expect(tx.aITopUpPurchase.create).not.toHaveBeenCalled()
    expect(tx.aIAllowanceAccount.update).not.toHaveBeenCalled()
  })

  it('rejects malformed AI top-up checkout sessions without mutating credits', async () => {
    const result = await handleStripeWebhook(topUpEvent({ metadata: { type: 'ai_top_up' } }) as any)

    expect(result).toEqual({
      handled: false,
      message: 'Missing AI top-up metadata in checkout session',
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
