import { describe, expect, it } from 'vitest'
import {
  getAthleteAiAllowanceSek,
  getCurrentAllowancePeriod,
  getRemainingAiBalanceSek,
  previewAiAllowanceDebit,
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
})
