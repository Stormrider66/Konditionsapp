import { describe, expect, it } from 'vitest'
import { AI_TOP_UP_PACKS, getAiTopUpPack } from '@/lib/ai/billing/top-up-packs'

describe('AI top-up packs', () => {
  it('keeps packs profitable by granting at least as many credits as the paid amount', () => {
    expect(AI_TOP_UP_PACKS).toHaveLength(3)

    for (const pack of AI_TOP_UP_PACKS) {
      expect(pack.amountSek).toBeGreaterThan(0)
      expect(pack.creditsSek).toBeGreaterThanOrEqual(pack.amountSek)
      expect(getAiTopUpPack(pack.id)).toBe(pack)
    }
  })

  it('rejects unknown top-up pack IDs', () => {
    expect(getAiTopUpPack('unknown')).toBeNull()
  })
})
