import { describe, expect, it } from 'vitest'
import {
  calibratePortions,
  recomputeTotals,
  type CalibratableItem,
  type PortionStats,
} from '@/lib/nutrition/portion-calibration'

const makeItem = (overrides: Partial<CalibratableItem> = {}): CalibratableItem => ({
  name: 'Kyckling',
  estimatedGrams: 150,
  portionDescription: '1 kycklingfilé',
  calories: 248,
  proteinGrams: 46.5,
  carbsGrams: 0,
  fatGrams: 5.4,
  fiberGrams: 0,
  ...overrides,
})

describe('calibratePortions', () => {
  it('does nothing when history count is below threshold', () => {
    const stats = new Map<string, PortionStats>([
      ['kyckling', { count: 2, medianGrams: 120, commonPortionDescription: '1 filé' }],
    ])
    const { items, snaps } = calibratePortions([makeItem()], stats)
    expect(snaps).toHaveLength(0)
    expect(items[0].estimatedGrams).toBe(150)
  })

  it('does nothing when Gemini is inside the ±40% trust band', () => {
    const stats = new Map<string, PortionStats>([
      // median 140 → trust band 84..196, 150 is well inside
      ['kyckling', { count: 10, medianGrams: 140, commonPortionDescription: '1 filé' }],
    ])
    const { items, snaps } = calibratePortions([makeItem()], stats)
    expect(snaps).toHaveLength(0)
    expect(items[0].estimatedGrams).toBe(150)
  })

  it('weight-blends grams and scales macros when Gemini is outside the band', () => {
    const stats = new Map<string, PortionStats>([
      // median 100 → band 60..140; Gemini 200 is far outside
      ['kyckling', { count: 8, medianGrams: 100, commonPortionDescription: '1 filé (liten)' }],
    ])
    const item = makeItem({ estimatedGrams: 200, calories: 330, proteinGrams: 62, fatGrams: 7.2 })
    const { items, snaps } = calibratePortions([item], stats)

    expect(snaps).toHaveLength(1)
    // snapped = round(0.6 * 100 + 0.4 * 200) = round(140) = 140
    expect(items[0].estimatedGrams).toBe(140)
    expect(snaps[0]).toMatchObject({
      itemIndex: 0,
      name: 'Kyckling',
      originalGrams: 200,
      snappedGrams: 140,
      historicalCount: 8,
      historicalMedianGrams: 100,
    })
    // macros scale by 140/200 = 0.7
    expect(items[0].calories).toBeCloseTo(231, 0)
    expect(items[0].proteinGrams).toBeCloseTo(43.4, 1)
    expect(items[0].fatGrams).toBeCloseTo(5.0, 1)
  })

  it('prefers the historical portion description when snapping', () => {
    const stats = new Map<string, PortionStats>([
      ['pasta', { count: 20, medianGrams: 80, commonPortionDescription: '1 dl torr' }],
    ])
    const item = makeItem({
      name: 'Pasta',
      estimatedGrams: 200,
      portionDescription: 'Generös portion',
      calories: 714,
      proteinGrams: 24,
      carbsGrams: 142,
      fatGrams: 2.4,
    })
    const { items, snaps } = calibratePortions([item], stats)
    expect(snaps).toHaveLength(1)
    expect(items[0].portionDescription).toBe('1 dl torr')
  })

  it('uses normalized-name matching (case/whitespace insensitive)', () => {
    const stats = new Map<string, PortionStats>([
      ['pasta', { count: 10, medianGrams: 80, commonPortionDescription: null }],
    ])
    const item = makeItem({
      name: '  PASTA  ',
      estimatedGrams: 200,
      calories: 714,
      proteinGrams: 24,
      carbsGrams: 142,
      fatGrams: 2.4,
    })
    const { snaps } = calibratePortions([item], stats)
    expect(snaps).toHaveLength(1)
  })

  it('scales enhanced macro fields proportionally when present', () => {
    const stats = new Map<string, PortionStats>([
      ['smör', { count: 6, medianGrams: 10, commonPortionDescription: '1 tsk' }],
    ])
    const item = makeItem({
      name: 'Smör',
      estimatedGrams: 20,
      calories: 149,
      proteinGrams: 0.2,
      carbsGrams: 0.1,
      fatGrams: 16.4,
      fiberGrams: 0,
      saturatedFatGrams: 10.4,
      monounsaturatedFatGrams: 4.2,
      polyunsaturatedFatGrams: 0.6,
      sugarGrams: 0.1,
    })
    const { items } = calibratePortions([item], stats)
    // snapped = round(0.6 * 10 + 0.4 * 20) = 14, scale = 0.7
    expect(items[0].estimatedGrams).toBe(14)
    expect(items[0].saturatedFatGrams).toBeCloseTo(7.3, 1)
    expect(items[0].monounsaturatedFatGrams).toBeCloseTo(2.9, 1)
    expect(items[0].polyunsaturatedFatGrams).toBeCloseTo(0.4, 1)
  })

  it('skips items with non-finite or zero grams', () => {
    const stats = new Map<string, PortionStats>([
      ['foo', { count: 10, medianGrams: 50, commonPortionDescription: null }],
    ])
    const items = [
      makeItem({ name: 'Foo', estimatedGrams: 0 }),
      makeItem({ name: 'Foo', estimatedGrams: Number.NaN }),
    ]
    const { snaps, items: out } = calibratePortions(items, stats)
    expect(snaps).toHaveLength(0)
    expect(out[0].estimatedGrams).toBe(0)
  })
})

describe('recomputeTotals', () => {
  it('sums basic macros and rounds', () => {
    const items = [
      makeItem({ calories: 100, proteinGrams: 10.33, carbsGrams: 0, fatGrams: 5, fiberGrams: 0 }),
      makeItem({ calories: 150, proteinGrams: 5.22, carbsGrams: 20, fatGrams: 3, fiberGrams: 2 }),
    ]
    const totals = recomputeTotals(items)
    expect(totals.calories).toBe(250)
    expect(totals.proteinGrams).toBeCloseTo(15.6, 1)
    expect(totals.carbsGrams).toBe(20)
    expect(totals.fiberGrams).toBe(2)
  })

  it('includes enhanced fields only if any item has them', () => {
    const plain = [makeItem({ calories: 100 })]
    const plainTotals = recomputeTotals(plain)
    expect((plainTotals as { saturatedFatGrams?: number }).saturatedFatGrams).toBeUndefined()

    const enhanced = [makeItem({ saturatedFatGrams: 2, monounsaturatedFatGrams: 1 })]
    const enhTotals = recomputeTotals(enhanced) as { saturatedFatGrams: number; monounsaturatedFatGrams: number }
    expect(enhTotals.saturatedFatGrams).toBe(2)
    expect(enhTotals.monounsaturatedFatGrams).toBe(1)
  })
})
