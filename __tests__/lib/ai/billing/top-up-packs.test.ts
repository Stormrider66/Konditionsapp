import { describe, expect, it } from 'vitest'
import { AI_TOP_UP_PACKS, getAiTopUpPack, getAiTopUpPackDescription } from '@/lib/ai/billing/top-up-packs'

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

  it('defaults exported pack descriptions to English', () => {
    expect(AI_TOP_UP_PACKS[0].description).toBe('For a few extra food scans, reports, or analyses.')
    expect(getAiTopUpPackDescription(AI_TOP_UP_PACKS[0])).toBe(AI_TOP_UP_PACKS[0].description)
  })

  it('keeps Swedish pack descriptions explicit', () => {
    expect(getAiTopUpPackDescription(AI_TOP_UP_PACKS[0], 'sv')).toBe('För några extra mat-skanningar, rapporter eller analyser.')
  })
})
