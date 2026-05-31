import { describe, expect, it } from 'vitest'
import { extractSavedFuelingProductPlanNote } from './product-plan-note'

describe('extractSavedFuelingProductPlanNote', () => {
  it('extracts the latest saved product plan block', () => {
    const note = [
      'Tidigare notering',
      '',
      'Produktplan:',
      '4 gel à 25 g',
      'Packat: 100 g kolhydrater mot planmål 180 g.',
      'Skillnad: -80 g.',
      '',
      'Produktplan:',
      '6 gel à 25 g, 1 flaskor sportdryck à 40 g',
      'Packat: 190 g kolhydrater mot planmål 180 g.',
      'Skillnad: +10 g.',
    ].join('\n')

    expect(extractSavedFuelingProductPlanNote(note)).toEqual({
      summary: '6 gel à 25 g, 1 flaskor sportdryck à 40 g',
      packedCarbsG: 190,
      targetCarbsG: 180,
      differenceG: 10,
      lines: [
        '6 gel à 25 g, 1 flaskor sportdryck à 40 g',
        'Packat: 190 g kolhydrater mot planmål 180 g.',
        'Skillnad: +10 g.',
      ],
    })
  })

  it('extracts English product plan blocks', () => {
    const note = [
      'Coach note',
      '',
      'Product plan:',
      '6 gel at 25 g, 1 sports drink bottle at 40 g',
      'Packed: 190 g carbohydrates against plan target 180 g.',
      'Difference: +10 g.',
    ].join('\n')

    expect(extractSavedFuelingProductPlanNote(note)).toEqual({
      summary: '6 gel at 25 g, 1 sports drink bottle at 40 g',
      packedCarbsG: 190,
      targetCarbsG: 180,
      differenceG: 10,
      lines: [
        '6 gel at 25 g, 1 sports drink bottle at 40 g',
        'Packed: 190 g carbohydrates against plan target 180 g.',
        'Difference: +10 g.',
      ],
    })
  })

  it('returns null when no product plan exists', () => {
    expect(extractSavedFuelingProductPlanNote('Vanlig anteckning')).toBeNull()
  })
})
