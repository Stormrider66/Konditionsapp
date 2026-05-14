import { describe, expect, it } from 'vitest'
import { normalizeAthleteCheckoutRequest } from '@/lib/payments/athlete-checkout-request'

describe('normalizeAthleteCheckoutRequest', () => {
  it('accepts the current athlete subscription UI billingCycle field', () => {
    expect(
      normalizeAthleteCheckoutRequest({
        tier: 'STANDARD',
        billingCycle: 'YEARLY',
      }),
    ).toEqual({
      tier: 'STANDARD',
      cycle: 'YEARLY',
      businessId: undefined,
      returnPath: '/athlete/subscription',
    })
  })

  it('keeps supporting the existing API cycle field', () => {
    expect(
      normalizeAthleteCheckoutRequest({
        tier: 'PRO',
        cycle: 'MONTHLY',
      }),
    ).toEqual({
      tier: 'PRO',
      cycle: 'MONTHLY',
      businessId: undefined,
      returnPath: '/athlete/subscription',
    })
  })

  it('defaults to monthly billing', () => {
    expect(normalizeAthleteCheckoutRequest({ tier: 'PRO' }).cycle).toBe('MONTHLY')
  })
})
