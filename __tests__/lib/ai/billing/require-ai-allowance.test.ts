import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetAiAllowanceStatus = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ai/billing/allowance', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/billing/allowance')>('@/lib/ai/billing/allowance')
  return {
    ...actual,
    getAiAllowanceStatus: mockGetAiAllowanceStatus,
  }
})

import {
  AI_ALLOWANCE_MINIMUM_REMAINING_SEK,
  requireAiAllowance,
} from '@/lib/ai/billing/require-ai-allowance'

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
})
