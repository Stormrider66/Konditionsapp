import { describe, expect, it, vi } from 'vitest'
import {
  getAthleteAiAllowanceSek,
  getCurrentAllowancePeriod,
  getRemainingAiBalanceSek,
  hasAiAllowanceRemaining,
  previewAiAllowanceDebit,
  resetExpiredAiAllowanceAccounts,
  resolveConfiguredAiAllowanceSek,
  usdToSek,
} from '@/lib/ai/billing/allowance'

describe('AI allowance billing helpers', () => {
  it('uses UTC calendar months for allowance periods', () => {
    const period = getCurrentAllowancePeriod(new Date('2026-05-13T10:30:00.000Z'))

    expect(period.periodStart.toISOString()).toBe('2026-05-01T00:00:00.000Z')
    expect(period.periodEnd.toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })

  it('converts provider USD estimates into SEK credits', () => {
    expect(usdToSek(0.25, 10.5)).toBe(2.63)
    expect(usdToSek(-1, 10.5)).toBe(0)
  })

  it('maps athlete tiers to monthly AI credit budgets', () => {
    expect(getAthleteAiAllowanceSek('FREE')).toBe(3)
    expect(getAthleteAiAllowanceSek('STANDARD')).toBe(30)
    expect(getAthleteAiAllowanceSek('PRO')).toBe(75)
    expect(getAthleteAiAllowanceSek('ELITE')).toBe(150)
    expect(getAthleteAiAllowanceSek(null)).toBe(3)
  })

  it('prioritizes athlete and business custom allowances before tier defaults', () => {
    expect(resolveConfiguredAiAllowanceSek({
      tier: 'ELITE',
      customAiAllowanceSek: 240,
      businessEliteAiAllowanceSek: 180,
    })).toBe(240)

    expect(resolveConfiguredAiAllowanceSek({
      tier: 'ELITE',
      businessEliteAiAllowanceSek: 180,
    })).toBe(180)

    expect(resolveConfiguredAiAllowanceSek({
      tier: 'ELITE',
    })).toBe(150)

    expect(resolveConfiguredAiAllowanceSek({
      tier: 'PRO',
      businessEliteAiAllowanceSek: 180,
    })).toBe(75)
  })

  it('uses a smaller active trial allowance unless an explicit override exists', () => {
    const now = new Date('2026-05-14T08:00:00.000Z')

    expect(resolveConfiguredAiAllowanceSek({
      tier: 'STANDARD',
      status: 'TRIAL',
      trialEndsAt: new Date('2026-05-20T08:00:00.000Z'),
      now,
    })).toBe(15)

    expect(resolveConfiguredAiAllowanceSek({
      tier: 'STANDARD',
      status: 'TRIAL',
      trialEndsAt: new Date('2026-05-20T08:00:00.000Z'),
      customAiAllowanceSek: 45,
      now,
    })).toBe(45)

    expect(resolveConfiguredAiAllowanceSek({
      tier: 'STANDARD',
      status: 'TRIAL',
      trialEndsAt: new Date('2026-05-01T08:00:00.000Z'),
      now,
    })).toBe(30)
  })

  it('spends included credits before top-up balance', () => {
    const result = previewAiAllowanceDebit(
      {
        includedBudgetSek: 30,
        includedUsedSek: 28,
        topUpBalanceSek: 10,
        hardCapSek: 30,
      },
      7,
    )

    expect(result.allowed).toBe(true)
    expect(result.includedDebitSek).toBe(2)
    expect(result.topUpDebitSek).toBe(5)
    expect(result.includedUsedSek).toBe(30)
    expect(result.topUpBalanceSek).toBe(5)
    expect(result.remainingSek).toBe(5)
  })

  it('blocks usage when included and top-up credits are exhausted', () => {
    const balance = {
      includedBudgetSek: 30,
      includedUsedSek: 29,
      topUpBalanceSek: 0.5,
      hardCapSek: 30,
    }
    const result = previewAiAllowanceDebit(balance, 2)

    expect(getRemainingAiBalanceSek(balance)).toBe(1.5)
    expect(result.allowed).toBe(false)
    expect(result.includedUsedSek).toBe(29)
    expect(result.topUpBalanceSek).toBe(0.5)
    expect(result.remainingSek).toBe(1.5)
  })

  it('reports whether a hard-capped account can start another AI call', () => {
    expect(hasAiAllowanceRemaining({
      includedBudgetSek: 30,
      includedUsedSek: 30,
      topUpBalanceSek: 0,
      hardCapSek: 30,
    })).toBe(false)

    expect(hasAiAllowanceRemaining({
      includedBudgetSek: 30,
      includedUsedSek: 30,
      topUpBalanceSek: 1,
      hardCapSek: 30,
    })).toBe(true)
  })

  it('resets expired monthly accounts to their configured allowance while preserving top-ups', async () => {
    const tx = {
      aIAllowanceAccount: {
        findMany: vi.fn().mockResolvedValue([
          {
            clientId: 'client-elite',
            client: {
              athleteSubscription: {
                tier: 'ELITE',
                status: 'ACTIVE',
                trialEndsAt: null,
                customAiAllowanceSek: null,
                business: {
                  eliteAiAllowanceSek: 240,
                },
              },
            },
          },
          {
            clientId: 'client-standard-override',
            client: {
              athleteSubscription: {
                tier: 'STANDARD',
                status: 'ACTIVE',
                trialEndsAt: null,
                customAiAllowanceSek: 55,
                business: null,
              },
            },
          },
        ]),
        update: vi.fn().mockResolvedValue({}),
      },
    }

    const result = await resetExpiredAiAllowanceAccounts(new Date('2026-06-01T00:10:00.000Z'), tx as any)

    expect(result).toMatchObject({
      resetCount: 2,
      periodStart: new Date('2026-06-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-01T00:00:00.000Z'),
    })
    expect(tx.aIAllowanceAccount.update).toHaveBeenCalledWith({
      where: { clientId: 'client-elite' },
      data: expect.objectContaining({
        includedBudgetSek: 240,
        includedUsedSek: 0,
        hardCapSek: 240,
        status: 'ACTIVE',
      }),
    })
    expect(tx.aIAllowanceAccount.update).toHaveBeenCalledWith({
      where: { clientId: 'client-standard-override' },
      data: expect.objectContaining({
        includedBudgetSek: 55,
        includedUsedSek: 0,
        hardCapSek: 55,
        status: 'ACTIVE',
      }),
    })
    expect(tx.aIAllowanceAccount.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ topUpBalanceSek: expect.any(Number) }),
    }))
  })
})
