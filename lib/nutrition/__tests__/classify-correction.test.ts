import { describe, expect, it } from 'vitest'
import { classifyCorrection } from '@/lib/nutrition/classify-correction'

const item = (name: string, g: number) => ({ name, estimatedGrams: g })

describe('classifyCorrection', () => {
  it('returns null when ai and final match', () => {
    const ai = [item('Kyckling', 150), item('Ris', 80)]
    const final = [item('Kyckling', 150), item('Ris', 80)]
    expect(classifyCorrection(ai, final)).toBeNull()
  })

  it('ignores pure reordering', () => {
    const ai = [item('Kyckling', 150), item('Ris', 80)]
    const final = [item('Ris', 80), item('Kyckling', 150)]
    expect(classifyCorrection(ai, final)).toBeNull()
  })

  it('ignores tiny gram changes below both thresholds', () => {
    const ai = [item('Kyckling', 150)]
    const final = [item('Kyckling', 152)]
    expect(classifyCorrection(ai, final)).toBeNull()
  })

  it('detects GRAMS when only portion changes', () => {
    const ai = [item('Kyckling', 150), item('Ris', 80)]
    const final = [item('Kyckling', 200), item('Ris', 80)]
    expect(classifyCorrection(ai, final)).toBe('GRAMS')
  })

  it('detects ADDED_ITEM when user adds a food', () => {
    const ai = [item('Kyckling', 150)]
    const final = [item('Kyckling', 150), item('Smör', 10)]
    expect(classifyCorrection(ai, final)).toBe('ADDED_ITEM')
  })

  it('detects REMOVED_ITEM when user removes a food', () => {
    const ai = [item('Kyckling', 150), item('Sås', 30)]
    const final = [item('Kyckling', 150)]
    expect(classifyCorrection(ai, final)).toBe('REMOVED_ITEM')
  })

  it('detects NAME when a single item was renamed (count preserved)', () => {
    const ai = [item('Pasta', 200), item('Kyckling', 150)]
    const final = [item('Risoni', 200), item('Kyckling', 150)]
    expect(classifyCorrection(ai, final)).toBe('NAME')
  })

  it('detects MULTIPLE when name + grams both change', () => {
    const ai = [item('Pasta', 200), item('Kyckling', 150)]
    const final = [item('Risoni', 200), item('Kyckling', 220)]
    expect(classifyCorrection(ai, final)).toBe('MULTIPLE')
  })

  it('detects MULTIPLE when both added and removed items', () => {
    const ai = [item('Pasta', 200), item('Kyckling', 150)]
    const final = [item('Ris', 80), item('Lax', 150)]
    expect(classifyCorrection(ai, final)).toBe('MULTIPLE')
  })

  it('is case/whitespace insensitive on name matching', () => {
    const ai = [item('  Kyckling  ', 150)]
    const final = [item('kyckling', 150)]
    expect(classifyCorrection(ai, final)).toBeNull()
  })

  it('uses the relative threshold for large portions', () => {
    // 500g → 520g is 4% — below 10%, above 5g absolute. 5g absolute also
    // required so this must count as no-change.
    const ai = [item('Havregrynsgröt', 500)]
    const final = [item('Havregrynsgröt', 520)]
    // 520-500 = 20 which is > 5, but 20/500 = 4% < 10% → we require BOTH
    // thresholds to be met? No — current logic requires abs >= 5 AND rel >= 10%.
    expect(classifyCorrection(ai, final)).toBeNull()
  })

  it('respects custom thresholds', () => {
    const ai = [item('Kyckling', 100)]
    const final = [item('Kyckling', 108)]
    expect(classifyCorrection(ai, final)).toBeNull()
    expect(
      classifyCorrection(ai, final, { gramsRelativeThreshold: 0.05, gramsAbsoluteThreshold: 5 }),
    ).toBe('GRAMS')
  })
})
