import { beforeEach, describe, expect, it, vi } from 'vitest'

const tx = vi.hoisted(() => ({
  client: {
    findUnique: vi.fn(),
  },
  aIAllowanceAccount: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  aITopUpPurchase: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}))

const mockTransaction = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mockTransaction,
    ...tx,
  },
}))

import {
  expireAiTopUpCreditsForClient,
  getAiTopUpExpiresAt,
  recordAiUsageDebit,
} from '@/lib/ai/billing/allowance'

describe('AI top-up lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (callback) => callback(tx))
    tx.client.findUnique.mockResolvedValue({
      id: 'client-1',
      athleteSubscription: {
        tier: 'STANDARD',
        status: 'ACTIVE',
        trialEndsAt: null,
        customAiAllowanceSek: null,
        business: null,
      },
    })
    tx.aIAllowanceAccount.findUnique.mockResolvedValue({
      clientId: 'client-1',
      periodStart: new Date('2026-05-01T00:00:00.000Z'),
      periodEnd: new Date('2026-06-01T00:00:00.000Z'),
      includedBudgetSek: 30,
      includedUsedSek: 28,
      topUpBalanceSek: 12,
      hardCapSek: 30,
      status: 'ACTIVE',
    })
    tx.aIAllowanceAccount.findUniqueOrThrow.mockResolvedValue({
      clientId: 'client-1',
      includedBudgetSek: 30,
      includedUsedSek: 28,
      topUpBalanceSek: 12,
      hardCapSek: 30,
    })
    tx.aIAllowanceAccount.update.mockImplementation(async ({ data }) => {
      const includedUsedSek = typeof data.includedUsedSek === 'object'
        ? 28 + (data.includedUsedSek.increment ?? 0)
        : data.includedUsedSek ?? 28
      const topUpBalanceSek = typeof data.topUpBalanceSek === 'object'
        ? 12 - (data.topUpBalanceSek.decrement ?? 0)
        : typeof data.topUpBalanceSek === 'number' ? data.topUpBalanceSek : 7

      return {
        clientId: 'client-1',
        includedBudgetSek: data.includedBudgetSek ?? 30,
        includedUsedSek,
        topUpBalanceSek,
        hardCapSek: data.hardCapSek ?? 30,
      }
    })
    tx.aITopUpPurchase.findMany.mockResolvedValue([])
    tx.aITopUpPurchase.update.mockResolvedValue({})
  })

  it('sets top-up expiry six months from purchase time', () => {
    expect(getAiTopUpExpiresAt(new Date('2026-05-14T00:00:00.000Z')).toISOString())
      .toBe('2026-11-10T00:00:00.000Z')
  })

  it('expires stale top-up purchase balances and removes them from the account', async () => {
    tx.aITopUpPurchase.findMany.mockResolvedValue([
      { id: 'topup-1', creditsRemainingSek: 4 },
      { id: 'topup-2', creditsRemainingSek: 3 },
    ])

    await expireAiTopUpCreditsForClient(
      'client-1',
      new Date('2026-05-14T00:00:00.000Z'),
      tx as any,
      {
        includedBudgetSek: 30,
        includedUsedSek: 28,
        topUpBalanceSek: 12,
        hardCapSek: 30,
      } as any,
    )

    expect(tx.aITopUpPurchase.update).toHaveBeenCalledWith({
      where: { id: 'topup-1' },
      data: {
        creditsRemainingSek: 0,
        status: 'EXPIRED',
      },
    })
    expect(tx.aITopUpPurchase.update).toHaveBeenCalledWith({
      where: { id: 'topup-2' },
      data: {
        creditsRemainingSek: 0,
        status: 'EXPIRED',
      },
    })
    expect(tx.aIAllowanceAccount.update).toHaveBeenCalledWith({
      where: { clientId: 'client-1' },
      data: {
        topUpBalanceSek: 5,
      },
    })
  })

  it('spends the oldest active top-up purchase balances after included credits', async () => {
    tx.aITopUpPurchase.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'topup-old', creditsRemainingSek: 4 },
        { id: 'topup-new', creditsRemainingSek: 10 },
      ])

    const result = await recordAiUsageDebit({
      clientId: 'client-1',
      costSek: 7,
      now: new Date('2026-05-14T00:00:00.000Z'),
    })

    expect(result.debit).toMatchObject({
      allowed: true,
      includedDebitSek: 2,
      topUpDebitSek: 5,
      includedUsedSek: 30,
      topUpBalanceSek: 7,
    })
    expect(tx.aITopUpPurchase.update).toHaveBeenCalledWith({
      where: { id: 'topup-old' },
      data: {
        creditsRemainingSek: 0,
        status: 'CONSUMED',
      },
    })
    expect(tx.aITopUpPurchase.update).toHaveBeenCalledWith({
      where: { id: 'topup-new' },
      data: {
        creditsRemainingSek: 9,
        status: 'ACTIVE',
      },
    })
    expect(tx.aIAllowanceAccount.update).toHaveBeenLastCalledWith({
      where: { clientId: 'client-1' },
      data: {
        includedUsedSek: { increment: 2 },
        topUpBalanceSek: { decrement: 5 },
      },
    })
    expect(mockTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' },
    )
  })
})
