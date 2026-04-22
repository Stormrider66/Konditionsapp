import { describe, expect, it } from 'vitest'
import { buildCorrectionHints, type CorrectionInputRow } from '@/lib/nutrition/build-correction-hints'

const row = (overrides: Partial<CorrectionInputRow>): CorrectionInputRow => ({
  aiItemsJson: [],
  finalItemsJson: [],
  correctionType: 'MULTIPLE',
  wentThroughRefine: false,
  createdAt: new Date(),
  ...overrides,
})

const item = (name: string, estimatedGrams: number) => ({ name, estimatedGrams })

describe('buildCorrectionHints', () => {
  it('returns null on empty input', () => {
    expect(buildCorrectionHints([])).toBeNull()
  })

  it('returns null when no pattern repeats enough', () => {
    const rows = [
      row({ aiItemsJson: [item('Pasta', 200)], finalItemsJson: [item('Risoni', 200)] }),
    ]
    expect(buildCorrectionHints(rows)).toBeNull()
  })

  it('emits a name-swap line after ≥2 repetitions', () => {
    const rows = [
      row({ aiItemsJson: [item('Pasta', 200)], finalItemsJson: [item('Risoni', 200)] }),
      row({ aiItemsJson: [item('Pasta', 150)], finalItemsJson: [item('Risoni', 150)] }),
      row({ aiItemsJson: [item('Pasta', 180)], finalItemsJson: [item('Risoni', 180)] }),
    ]
    const hint = buildCorrectionHints(rows)!
    expect(hint).toContain('"Pasta" korrigeras ofta till "Risoni" (3 ggr)')
  })

  it('emits grams-bias when user consistently adjusts portions in one direction', () => {
    const rows = [
      row({ aiItemsJson: [item('Kyckling', 150)], finalItemsJson: [item('Kyckling', 200)] }),
      row({ aiItemsJson: [item('Kyckling', 130)], finalItemsJson: [item('Kyckling', 180)] }),
      row({ aiItemsJson: [item('Kyckling', 160)], finalItemsJson: [item('Kyckling', 210)] }),
    ]
    const hint = buildCorrectionHints(rows)!
    expect(hint).toMatch(/Kyckling.*underskatta.*\+50g/)
  })

  it('emits overestimate bias when user consistently reduces portions', () => {
    const rows = [
      row({ aiItemsJson: [item('Smör', 30)], finalItemsJson: [item('Smör', 10)] }),
      row({ aiItemsJson: [item('Smör', 25)], finalItemsJson: [item('Smör', 10)] }),
    ]
    const hint = buildCorrectionHints(rows)!
    expect(hint).toMatch(/Smör.*överskatta/)
  })

  it('ignores tiny deltas below 10g average', () => {
    const rows = [
      row({ aiItemsJson: [item('Ris', 80)], finalItemsJson: [item('Ris', 85)] }),
      row({ aiItemsJson: [item('Ris', 80)], finalItemsJson: [item('Ris', 86)] }),
    ]
    // 5g and 6g deltas are past the 5g absolute noise floor but the avg (5.5)
    // is below the 10g emit floor for bias lines.
    expect(buildCorrectionHints(rows)).toBeNull()
  })

  it('emits frequently-added items (not 1↔1 renames)', () => {
    const rows = [
      row({
        aiItemsJson: [item('Pasta', 200)],
        finalItemsJson: [item('Pasta', 200), item('Smör', 10), item('Olja', 5)],
      }),
      row({
        aiItemsJson: [item('Pasta', 180)],
        finalItemsJson: [item('Pasta', 180), item('Smör', 12), item('Olja', 5)],
      }),
    ]
    const hint = buildCorrectionHints(rows)!
    expect(hint).toContain('lägger ofta till: Smör')
    expect(hint).toContain('lägger ofta till: Olja')
  })

  it('emits frequently-removed items when AI hallucinates', () => {
    const rows = [
      row({
        aiItemsJson: [item('Kyckling', 150), item('Sås', 30), item('Dressing', 20)],
        finalItemsJson: [item('Kyckling', 150)],
      }),
      row({
        aiItemsJson: [item('Kyckling', 160), item('Sås', 40), item('Dressing', 25)],
        finalItemsJson: [item('Kyckling', 160)],
      }),
    ]
    const hint = buildCorrectionHints(rows)!
    expect(hint).toContain('tar ofta bort: Sås')
    expect(hint).toContain('tar ofta bort: Dressing')
  })

  it('treats 1↔1 rename as a swap, not add+remove', () => {
    const rows = [
      row({ aiItemsJson: [item('Pasta', 200)], finalItemsJson: [item('Risoni', 200)] }),
      row({ aiItemsJson: [item('Pasta', 150)], finalItemsJson: [item('Risoni', 150)] }),
    ]
    const hint = buildCorrectionHints(rows)!
    expect(hint).toContain('"Pasta" korrigeras ofta till "Risoni"')
    expect(hint).not.toContain('lägger ofta till')
    expect(hint).not.toContain('tar ofta bort')
  })

  it('weights refined corrections double', () => {
    // One refined correction + one unrefined = effective count of 3 → crosses 2-occurrence floor
    const rows = [
      row({
        aiItemsJson: [item('Pasta', 200)],
        finalItemsJson: [item('Risoni', 200)],
        wentThroughRefine: true,
      }),
      row({
        aiItemsJson: [item('Pasta', 180)],
        finalItemsJson: [item('Risoni', 180)],
        wentThroughRefine: false,
      }),
    ]
    const hint = buildCorrectionHints(rows)!
    expect(hint).toContain('"Pasta" korrigeras ofta till "Risoni" (3 ggr)')
  })

  it('tolerates malformed JSON payloads without throwing', () => {
    const rows = [
      row({ aiItemsJson: null, finalItemsJson: null }),
      row({ aiItemsJson: 'not-an-array' as unknown, finalItemsJson: {} }),
      row({ aiItemsJson: [{ name: 'X' /* no grams */ }], finalItemsJson: [{ notAnItem: true }] }),
    ]
    expect(buildCorrectionHints(rows)).toBeNull()
  })

  it('respects custom minOccurrences threshold', () => {
    const rows = [
      row({ aiItemsJson: [item('Pasta', 200)], finalItemsJson: [item('Risoni', 200)] }),
    ]
    expect(buildCorrectionHints(rows, { minOccurrences: 1 })).toContain('"Pasta" korrigeras ofta till "Risoni"')
    expect(buildCorrectionHints(rows, { minOccurrences: 2 })).toBeNull()
  })
})
