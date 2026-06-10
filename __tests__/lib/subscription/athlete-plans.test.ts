import { describe, expect, it } from 'vitest'
import {
  ATHLETE_LEGACY_AI_CHAT_LIMITS,
  ATHLETE_PLAN_COPY,
  ATHLETE_PLAN_PRICING,
} from '@/lib/subscription/athlete-plans'

describe('athlete plan configuration', () => {
  it('keeps launch pricing aligned', () => {
    expect(ATHLETE_PLAN_PRICING.STANDARD.monthlySek).toBe(199)
    expect(ATHLETE_PLAN_PRICING.PRO.monthlySek).toBe(399)
  })

  it('does not expose unlimited AI in self-serve plan copy', () => {
    const selfServeCopy = [
      ...ATHLETE_PLAN_COPY.STANDARD.featuresSv,
      ...ATHLETE_PLAN_COPY.PRO.featuresSv,
    ].join(' ')

    expect(selfServeCopy.toLowerCase()).not.toContain('obegränsad')
    expect(selfServeCopy.toLowerCase()).not.toContain('unlimited')
  })

  it('keeps every retired legacy chat limit at unlimited (-1)', () => {
    // SEK allowance is the only AI chat gate since 2026-06-10; a finite
    // value reappearing here would silently re-enable message counting
    // in provisioning paths.
    expect(Object.values(ATHLETE_LEGACY_AI_CHAT_LIMITS)).toEqual([-1, -1, -1, -1])
  })
})
