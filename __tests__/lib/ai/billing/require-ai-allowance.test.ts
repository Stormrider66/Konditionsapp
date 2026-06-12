import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetAiAllowanceStatus = vi.hoisted(() => vi.fn())
const mockAthleteAccountFindUnique = vi.hoisted(() => vi.fn())
const mockBudgetFindUnique = vi.hoisted(() => vi.fn())
const mockBudgetUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ai/billing/allowance', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/billing/allowance')>('@/lib/ai/billing/allowance')
  return {
    ...actual,
    getAiAllowanceStatus: mockGetAiAllowanceStatus,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    athleteAccount: { findUnique: mockAthleteAccountFindUnique },
    aIUsageBudget: { findUnique: mockBudgetFindUnique, update: mockBudgetUpdate },
  },
}))

import {
  AI_ALLOWANCE_MINIMUM_REMAINING_SEK,
  requireAiAllowance,
} from '@/lib/ai/billing/require-ai-allowance'
import { requireCoachAiBudget } from '@/lib/ai/billing/coach-budget'

describe('requireAiAllowance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAiAllowanceStatus.mockResolvedValue({
      account: {
        status: 'ACTIVE',
        includedBudgetSek: 30,
        includedUsedSek: 29.9,
        topUpBalanceSek: 0,
        hardCapSek: 30,
      },
      remainingSek: 0.1,
    })
    // Default: regular athlete — user has no coach budget row.
    mockAthleteAccountFindUnique.mockResolvedValue({ userId: 'user-1' })
    mockBudgetFindUnique.mockResolvedValue(null)
  })

  it('allows light checks when any balance remains', async () => {
    await expect(requireAiAllowance('client-1')).resolves.toBeNull()
  })

  it('blocks expensive checks when remaining balance is below the requested minimum', async () => {
    const response = await requireAiAllowance('client-1', {
      minimumRemainingSek: AI_ALLOWANCE_MINIMUM_REMAINING_SEK.richAnalysis,
    })

    expect(response?.status).toBe(402)
    await expect(response?.json()).resolves.toMatchObject({
      code: 'AI_ALLOWANCE_EXHAUSTED',
      remainingSek: 0.1,
      actionLabel: 'Manage AI credits',
    })
  })

  it('blocks when the owning user has an exhausted coach AI budget', async () => {
    mockBudgetFindUnique.mockResolvedValue({
      userId: 'user-1',
      monthlyBudget: 10,
      periodSpent: 10,
      periodStart: new Date(),
      alertSent: false,
    })

    const response = await requireAiAllowance('client-1')

    expect(response?.status).toBe(402)
    await expect(response?.json()).resolves.toMatchObject({
      code: 'COACH_AI_BUDGET_EXHAUSTED',
    })
  })

  it('allows when the owning user has remaining coach AI budget', async () => {
    mockBudgetFindUnique.mockResolvedValue({
      userId: 'user-1',
      monthlyBudget: 10,
      periodSpent: 4,
      periodStart: new Date(),
      alertSent: false,
    })

    await expect(requireAiAllowance('client-1')).resolves.toBeNull()
  })
})

describe('requireCoachAiBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows users without a budget row (unlimited)', async () => {
    mockBudgetFindUnique.mockResolvedValue(null)
    await expect(requireCoachAiBudget('user-1')).resolves.toBeNull()
  })

  it('allows users with a row but no monthly limit', async () => {
    mockBudgetFindUnique.mockResolvedValue({
      userId: 'user-1',
      monthlyBudget: null,
      periodSpent: 99,
      periodStart: new Date(),
      alertSent: false,
    })
    await expect(requireCoachAiBudget('user-1')).resolves.toBeNull()
  })

  it('blocks with 402 when the monthly limit is spent', async () => {
    mockBudgetFindUnique.mockResolvedValue({
      userId: 'user-1',
      monthlyBudget: 5,
      periodSpent: 5.2,
      periodStart: new Date(),
      alertSent: false,
    })

    const response = await requireCoachAiBudget('user-1')
    expect(response?.status).toBe(402)
    await expect(response?.json()).resolves.toMatchObject({
      code: 'COACH_AI_BUDGET_EXHAUSTED',
      remainingSek: 0,
    })
  })

  it('lazily rolls the period over when periodStart is stale', async () => {
    const lastMonth = new Date()
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1)
    mockBudgetFindUnique.mockResolvedValue({
      userId: 'user-1',
      monthlyBudget: 5,
      periodSpent: 5.2,
      periodStart: lastMonth,
      alertSent: true,
    })
    mockBudgetUpdate.mockResolvedValue({
      userId: 'user-1',
      monthlyBudget: 5,
      periodSpent: 0,
      periodStart: new Date(),
      alertSent: false,
    })

    await expect(requireCoachAiBudget('user-1')).resolves.toBeNull()
    expect(mockBudgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: expect.objectContaining({ periodSpent: 0, alertSent: false }),
      }),
    )
  })

  it('fails open when the budget lookup throws', async () => {
    mockBudgetFindUnique.mockRejectedValue(new Error('db down'))
    await expect(requireCoachAiBudget('user-1')).resolves.toBeNull()
  })
})
