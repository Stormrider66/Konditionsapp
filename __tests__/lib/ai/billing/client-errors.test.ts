import { describe, expect, it } from 'vitest'
import {
  AI_ALLOWANCE_ACTION_URL,
  createAiAllowanceExhaustedBody,
  getAiAllowanceUpgradeMessage,
  isAiAllowanceExhaustedError,
  parseAiAllowanceError,
} from '@/lib/ai/billing/client-errors'

describe('AI allowance client errors', () => {
  it('creates a structured exhausted-credit response body', () => {
    expect(createAiAllowanceExhaustedBody(0)).toMatchObject({
      code: 'AI_ALLOWANCE_EXHAUSTED',
      remainingSek: 0,
      actionLabel: 'Manage AI credits',
      actionUrl: AI_ALLOWANCE_ACTION_URL,
    })
  })

  it('parses exhausted-credit responses with the upgrade action intact', () => {
    const parsed = parseAiAllowanceError(createAiAllowanceExhaustedBody(1.25))

    expect(isAiAllowanceExhaustedError(parsed)).toBe(true)
    expect(parsed).toMatchObject({
      remainingSek: 1.25,
      actionLabel: 'Manage AI credits',
      actionUrl: '/athlete/subscription',
    })
    expect(getAiAllowanceUpgradeMessage(parsed ?? undefined)).toBe(
      'Upgrade your plan or top up AI credits to continue.',
    )
  })

  it('ignores unrelated response bodies', () => {
    expect(parseAiAllowanceError({ code: 'OTHER_ERROR' })).toBeNull()
  })
})
